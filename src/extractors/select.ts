import { convertNodeTo, getAttrs, makeLinksAbsolute } from 'utils/dom';
import { DOMCleaners, StringCleaners } from '../cleaners';
import { migrateSelections } from './select-migration';
import {
  ConcatenatedSelectionResult,
  DefaultContentType,
  Extend,
  InnerExtractorOptions,
  SelectedExtractOptions,
  SelectionResult,
  Selection,
  Selector,
  SelectorReturnType,
} from './types';

// Remove elements by an array of selectors
export const cleanBySelectors = (
  $content: cheerio.Cheerio,
  $: cheerio.Root,
  { clean }: { clean?: string[] } = {}
) => {
  if (!clean) {
    return $content;
  }

  $(clean.join(','), $content).remove();

  return $content;
};

// Transform matching elements
export const transformElements = (
  $content: cheerio.Cheerio,
  $: cheerio.Root,
  {
    transforms,
  }: {
    transforms?: Record<
      string,
      string | ((node: cheerio.Cheerio, $: cheerio.Root) => unknown)
    >;
  } = {}
) => {
  if (!transforms) {
    return $content;
  }

  Reflect.ownKeys(transforms).forEach(key => {
    const stringKey = String(key);
    const $matches = $(stringKey, $content);
    const value = transforms[stringKey];

    // If value is a string, convert directly
    if (typeof value === 'string') {
      $matches.each((index, node) => {
        convertNodeTo($(node), $, value);
      });
    } else if (typeof value === 'function') {
      // If value is function, apply function to node
      $matches.each((index, node) => {
        const result = value($(node), $);
        // If function returns a string, convert node to that value
        if (typeof result === 'string') {
          convertNodeTo($(node), $, result);
        }
      });
    }
  });

  return $content;
};

/**
 * Mutates passed node with any transforms and cleans tags and text.
 *
 * **NOTE:** Make sure to `.clone` if mutation will cause problems
 */
const transformAndClean = (
  $: cheerio.Root,
  $node: cheerio.Cheerio,
  url: string,
  extractionOpts?: InnerExtractorOptions
) => {
  makeLinksAbsolute($node, $, url);
  cleanBySelectors($node, $, extractionOpts);
  transformElements($node, $, extractionOpts);
  return $node;
};

const buildSelect = ($: cheerio.Root, relativeToNode?: cheerio.Cheerio) => {
  const select = relativeToNode
    ? (selector: string) => $(selector, relativeToNode)
    : (selector: string) => $(selector);

  return <T extends Selector>(
    selector: T
  ): SelectorReturnType<T> | undefined => {
    if (typeof selector === 'string') {
      return select(selector) as SelectorReturnType<T>;
    }

    switch (selector.type) {
      case 'matchAll': {
        const matches = selector.selectors.map(select);

        if (!matches.reduce((acc, m) => acc && m.length > 0, true)) {
          return undefined;
        }

        return $(matches) as SelectorReturnType<T>;
      }
      case 'matchAttr': {
        const match = select(selector.selector);

        return match.filter((_, element) => {
          const attrs = getAttrs(element);
          const attr = attrs[selector.attr] ?? '';
          return attr.trim() !== '';
        }) as SelectorReturnType<T>;
      }
    }
  };
};

const selectionMatches = <T extends Selection>(
  selection: T,
  selectorTest: <TSelector extends Selector>(
    selector: TSelector
  ) => SelectorReturnType<TSelector> | undefined
): { selection: T; matches: cheerio.Cheerio } | undefined => {
  switch (selection.type) {
    case 'exactlyOne': {
      const matches = selectorTest(selection.selector);

      if (!matches || matches.length !== 1) {
        return undefined;
      }

      return {
        selection,
        matches,
      };
    }
    case 'first': {
      const matches = selectorTest(selection.selector);

      if (!matches) {
        return undefined;
      }

      if (Array.isArray(matches)) {
        return {
          selection,
          matches: matches[0],
        };
      }

      if (matches.length > 0) {
        return {
          selection,
          matches: matches.first(),
        };
      }

      return undefined;
    }
    case 'concatinate':
    case 'multiGrouped':
    case 'multiArray': {
      const matches = selectorTest(selection.selector);

      if (!matches || matches.length < 1) {
        return undefined;
      }

      return {
        selection,
        matches,
      };
    }
  }

  return undefined;
};

export const chooseSelection = (
  $: cheerio.Root,
  selections: Selection[],
  selectionRoot?: cheerio.Cheerio
):
  | { selection: Selection; matches: SelectorReturnType<Selector> }
  | undefined => {
  const selectorTest = buildSelect($, selectionRoot);

  for (const selection of selections) {
    const match = selectionMatches(selection, selectorTest);

    if (match) {
      return match;
    }
  }

  return undefined;
};

export const select = (
  opts: SelectedExtractOptions,
  root?: cheerio.Cheerio
): SelectionResult => {
  const {
    $,
    type,
    extractionOpts,
    extractHtml = false,
    // allowConcatination,
  } = opts;
  // Skip if there's not extraction for this type
  if (!extractionOpts) {
    return {
      type: 'error',
    };
  }

  const {
    selectors,
    defaultCleaner: useDefaultCleaner = true,
    allowMultiple,
  } = extractionOpts;

  const matchedSelection = chooseSelection(
    $,
    migrateSelections(selectors, allowMultiple, extractHtml),
    root
  );

  if (!matchedSelection) {
    return {
      type: 'error',
    };
  }

  const { selection, matches } = matchedSelection;

  // Wrap in div so all transformations can take place on root element
  const $wrapper = $('<div></div>');
  matches.each((_, element) => {
    // TODO: Cheerio doesn't list cheerio.Element as an appendable type
    $wrapper.append($(element).clone());
  });

  let $content: cheerio.Cheerio | undefined = $wrapper;

  $content = transformAndClean(
    $,
    $content,
    opts.url,
    extractionOpts as InnerExtractorOptions
  );

  if (
    selection.type !== 'concatinate' &&
    (selection.type === 'multiGrouped' || selection.returnHtml)
  ) {
    // Process for HTML output
    if (type in DOMCleaners) {
      $content = DOMCleaners[type as keyof typeof DOMCleaners]($content, {
        ...opts,
        defaultCleaner: useDefaultCleaner,
      });
    }

    if (!$content) {
      return {
        type: 'content',
        content: undefined,
      };
    }

    const content = $content;

    const buildResult = () => {
      switch (selection.type) {
        case 'exactlyOne':
          return content.html() ?? undefined;
        case 'first':
          return $.html(content.children().first());
        case 'multiGrouped':
          return $.html(content);
        case 'multiArray':
          return content
            .children()
            .toArray()
            .map(el => $.html($(el)));
      }
    };

    return {
      type: 'content',
      content: buildResult(),
    };
  }

  // Process for string output
  if (
    typeof selection.selector !== 'string' &&
    selection.selector.type === 'matchAttr'
  ) {
    const attr = selection.selector.attr;

    // Return attr results
    $content = $content.children().map((_, el) => {
      const item = attr ? $(el).attr(attr)?.trim() ?? '' : $(el).text().trim();
      // TODO: Readd transform
      return item;
    });
  } else {
    $content = $content.children().map((_, el) => $(el).text().trim());
  }

  const content = $content;

  const buildResult = (): string | string[] => {
    switch (selection.type) {
      case 'exactlyOne':
      case 'first':
        return content.get(0);
      case 'concatinate':
        return (content.toArray() as unknown as string[]).join(
          selection.joinPattern ?? ', '
        );
      case 'multiArray':
        return content.toArray() as unknown as string[];
    }
  };

  const result = buildResult();

  if (
    useDefaultCleaner &&
    type in StringCleaners &&
    typeof result === 'string'
  ) {
    const cleanedString = StringCleaners[type as keyof typeof StringCleaners](
      result,
      {
        ...opts,
        ...extractionOpts,
      }
    );

    return {
      type: 'content',
      content: cleanedString,
    };
  }

  return {
    type: 'content',
    content: result,
  };
};

export const selectExtendedTypes = (
  extend: Extend,
  opts: Omit<SelectedExtractOptions, 'type'>
) => {
  const results: Record<string, string | string[]> = {};
  Reflect.ownKeys(extend).forEach(t => {
    const type = String(t);

    if (!results[type]) {
      // TODO: This cast isn't safe. Maybe add a generic for addition extended types
      const selectedData = select({
        ...opts,
        type: type as DefaultContentType,
        extractionOpts: extend[type],
      });
      if (selectedData.type === 'content' && selectedData.content) {
        results[type] = selectedData.content;
      }
    }
  });

  return results;
};

export const selectConcatinating = (
  opts: SelectedExtractOptions,
  root?: cheerio.Cheerio
): ConcatenatedSelectionResult => {
  const result = select(opts, root);

  if (result.type === 'error') {
    return result;
  }

  const { content } = result;

  return {
    type: 'content',
    content: Array.isArray(content) ? content.join(',') : content,
  };
};
