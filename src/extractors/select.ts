import { DOMCleaners, StringCleaners } from 'cleaners';
import { convertNodeTo, makeLinksAbsolute } from 'utils/dom';
import {
  ConcatenatedSelectionResult,
  DefaultContentType,
  Extend,
  InnerExtractorOptions,
  SelectedExtractOptions,
  SelectionResult,
  Selector,
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

const buildSelect = (
  $: cheerio.Root,
  relativeToNode?: cheerio.Cheerio | cheerio.Element
) =>
  relativeToNode
    ? (selector: string | undefined) =>
        selector ? $(selector, relativeToNode as cheerio.Cheerio) : $(undefined)
    : (selector: string | undefined) => $(selector);

export const findMatchingSelector = (
  $: cheerio.Root,
  selectors: Selector[],
  extractHtml: boolean,
  allowMultiple: boolean | undefined,
  relativeToNode?: cheerio.Cheerio | cheerio.Element
) => {
  const selectorTest = buildSelect($, relativeToNode);

  return selectors.find(selector => {
    if (Array.isArray(selector)) {
      if (extractHtml) {
        // Ignore function selectors, if they're present
        return (selector.filter(s => typeof s === 'string') as string[]).reduce(
          (acc, s) => acc && selectorTest(s).length > 0,
          true as boolean
        );
      }

      const [s, attr] = selector;

      const selected = selectorTest(s);

      return (
        selected.length > 0 &&
        (!attr ||
          selected
            .toArray()
            .reduce(
              (acc: boolean, element) => acc && !!$(element).attr(attr)?.trim(),
              true
            ))
      );
    }

    return (
      (allowMultiple || selectorTest(selector).length === 1) &&
      selectorTest(selector).text().trim() !== ''
    );
  });
};

export const select = (
  opts: SelectedExtractOptions,
  root?: cheerio.Cheerio | cheerio.Element
): SelectionResult => {
  const {
    $,
    type,
    extractionOpts,
    extractHtml = false,
    allowConcatination,
  } = opts;
  // Skip if there's not extraction for this type
  if (!extractionOpts) {
    return {
      type: 'error',
    };
  }

  // If a string is hardcoded for a type (e.g., Wikipedia
  // contributors), return the string
  if (typeof extractionOpts === 'string') {
    return {
      type: 'content',
      content: extractionOpts,
    };
  }

  const { selectors, defaultCleaner = true, allowMultiple } = extractionOpts;

  const matchingSelector = findMatchingSelector(
    $,
    selectors ?? [],
    extractHtml,
    allowMultiple,
    root
  );

  if (!matchingSelector) {
    return {
      type: 'error',
    };
  }

  const boundTransformAndClean = ($node: cheerio.Cheerio) =>
    transformAndClean(
      $,
      $node,
      opts.url,
      extractionOpts as InnerExtractorOptions
    );

  const $select = buildSelect($, root);

  const selectHtml = (): SelectionResult => {
    // If the selector type requests html as its return type
    // transform and clean the element with provided selectors
    let $content: cheerio.Cheerio | undefined;

    // If matching selector is an array, we're considering this a
    // multi-match selection, which allows the parser to choose several
    // selectors to include in the result. Note that all selectors in the
    // array must match in order for this selector to trigger
    if (Array.isArray(matchingSelector)) {
      $content = $select(matchingSelector.join(','));
      const $wrapper = $('<div></div>');
      $content.each((_, element) => {
        // TODO: Cheerio doesn't list cheerio.Element as an appendable type
        $wrapper.append($(element));
      });

      $content = $wrapper;
    } else {
      $content = $select(matchingSelector);
      // Wrap in div so transformation can take place on root element
      if ($content.toArray().length > 1) {
        // Limit to first element
        $content = $($content.toArray()[0]);
      }

      $content.wrap($('<div></div>'));
      $content = $content.parent();
    }

    $content = boundTransformAndClean($content);
    if (type in DOMCleaners) {
      $content = DOMCleaners[type as keyof typeof DOMCleaners]($content, {
        ...opts,
        defaultCleaner,
      });
    }

    if (!$content) {
      return {
        type: 'content',
        content: undefined,
      };
    }

    if (allowMultiple) {
      return {
        type: 'content',
        content: $content
          .children()
          .toArray()
          .map(el => $.html($(el))),
      };
    }

    // return $content.children().first().html() ?? undefined;
    const array = $content.children().toArray();

    if (array.length === 1) {
      // Not allowMultiple. Return first element
      return {
        type: 'content',
        content: $.html(array[0]),
      };
    }

    // Return full content node
    return {
      type: 'content',
      content: $.html($content),
    };
  };

  if (extractHtml) {
    return selectHtml();
  }

  let $match: cheerio.Cheerio;
  let result: cheerio.Cheerio;
  // if selector is an array (e.g., ['img', 'src']),
  // extract the attr
  if (Array.isArray(matchingSelector)) {
    const [selector, attr, transform] = matchingSelector;
    $match = $select(selector);
    const $wrapper = $('<div></div>');
    $match.each((_, element) => {
      // TODO: Cheerio doesn't list cheerio.Element as an appendable type
      $wrapper.append($(element));
    });
    $match = $wrapper;

    $match = boundTransformAndClean($match);

    if (attr || transform) {
      result = $match.children().map((_, el) => {
        const item = attr
          ? $(el).attr(attr)?.trim() ?? ''
          : $(el).text().trim();
        return transform ? transform(item) : item;
      });
    } else {
      result = $match.children().map((_, el) => $(el).text().trim());
    }
  } else {
    $match = $select(matchingSelector);
    $match.wrap($('<div></div>'));
    $match = $match.parent();
    $match = boundTransformAndClean($match);
    result = $match.map((_, el) => $(el).text().trim());
  }

  const finalResult =
    Array.isArray(result.toArray()) && allowMultiple
      ? (result.toArray() as unknown as string[])
      : allowConcatination
      ? (result.toArray() as unknown as string[]).join(', ')
      : (result[0] as unknown as string);
  // Allow custom extractor to skip default cleaner
  // for this type; defaults to true
  if (defaultCleaner && type in StringCleaners) {
    const cleanedString = StringCleaners[type as keyof typeof StringCleaners](
      finalResult as any,
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
    content: finalResult,
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
  root?: cheerio.Cheerio | cheerio.Element
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
