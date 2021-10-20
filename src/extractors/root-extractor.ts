import cheerio from 'cheerio';
import { normalizeSpaces } from 'utils/text';
import { DOMCleaners, StringCleaners } from '../cleaners';
import { convertNodeTo, makeLinksAbsolute, stripNewlines } from '../utils/dom';
import { GenericExtractor } from './generic';
import {
  Comment,
  CustomExtractor,
  DefaultContentType,
  Extend,
  ExtractorOptions,
  InnerExtractorOptions,
  ExtractResultOptions,
  Selector,
  SelectedExtractOptions,
  FullExtractorResult,
  ContentExtractorResult,
  CommentExtractorOptions,
  ChildLevelCommentExtractorOptions,
  SelectionResult,
  ConcatenatedSelectionResult,
} from './types';

// Remove elements by an array of selectors
export function cleanBySelectors(
  $content: cheerio.Cheerio,
  $: cheerio.Root,
  { clean }: { clean?: string[] } = {}
) {
  if (!clean) {
    return $content;
  }

  $(clean.join(','), $content).remove();

  return $content;
}

// Transform matching elements
export function transformElements(
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
) {
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
}

const buildSelect = (
  $: cheerio.Root,
  relativeToNode?: cheerio.Cheerio | cheerio.Element
) =>
  relativeToNode
    ? (selector: string | undefined) =>
        selector ? $(selector, relativeToNode as cheerio.Cheerio) : $(undefined)
    : (selector: string | undefined) => $(selector);

const findMatchingSelector = (
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

// Exported for tests only
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

const selectConcatinating = (
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

export function selectExtendedTypes(
  extend: Extend,
  opts: Omit<SelectedExtractOptions, 'type'>
) {
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
}

function extractResult<T extends Exclude<DefaultContentType, 'comment'>>(
  opts: ExtractResultOptions<T> & { content?: string }
): ReturnType<typeof GenericExtractor[T]> {
  type Result = ReturnType<typeof GenericExtractor[T]>;
  const { type, extractor, fallback = true } = opts;

  const result = select({ ...opts, extractionOpts: extractor[type] });

  // If custom parser succeeds, return the result
  // A return value of undefined means that the parser successfully selected nothing
  // TODO: Maybe indicate better than using undefined
  if (result.type === 'content') {
    return result.content as Result;
  }

  // If nothing matches the selector, and fallback is enabled,
  // run the Generic extraction
  if (fallback) {
    return GenericExtractor[type](opts) as Result;
  }

  return undefined as Result;
}

const selectionResultString = (
  result: ConcatenatedSelectionResult
): string | undefined =>
  result.type === 'content' && result.content
    ? stripNewlines(normalizeSpaces(result.content))
    : undefined;

const selectNestedComments = (
  opts: Omit<SelectedExtractOptions<CommentExtractorOptions>, 'type'>
): Comment[] | undefined => {
  const { html, extractionOpts } = opts;
  // Skip if there's not extraction for this type
  if (!extractionOpts) {
    return undefined;
  }

  const { selectors, allowMultiple } = extractionOpts.topLevel;
  const $ = cheerio.load(html);

  const matchingSelector = findMatchingSelector(
    $,
    selectors ?? [],
    true,
    allowMultiple
  );

  if (!matchingSelector) {
    return undefined;
  }

  const comments: Comment[] = [];

  // Always extractHtml
  const getComment = (
    node: cheerio.Element
  ): { comment: Comment; append: boolean } | undefined => {
    const nodeTransformer = extractionOpts.childLevel?.nodeTransform;

    if (nodeTransformer) {
      nodeTransformer($, node, comments);
    }

    const text = selectConcatinating(
      {
        ...opts,
        type: 'content',
        extractionOpts: extractionOpts.text,
      },
      node
    );

    if (!text) {
      return undefined;
    }

    const author = selectConcatinating(
      {
        ...opts,
        // TODO: Add proper type for cleaning
        type: 'comment',
        extractionOpts: extractionOpts.author,
      },
      node
    );

    const score = selectConcatinating(
      {
        ...opts,
        // TODO: Add proper type for cleaning
        type: 'comment',
        extractionOpts: extractionOpts.score,
      },
      node
    );

    const comment: Comment = {
      author: selectionResultString(author),
      score: selectionResultString(score),
      text: selectionResultString(text) ?? '',
    };

    const insertTransformer = extractionOpts.childLevel?.insertTransform;

    if (insertTransformer) {
      insertTransformer($, node, comment, comments);
    }

    return {
      comment,
      append: !insertTransformer,
    };
  };

  const createCommentBuilder =
    (
      commentGroup: Comment[],
      childExtractionOpts: ChildLevelCommentExtractorOptions | undefined
    ) =>
    (element: cheerio.Element) => {
      const commentWrapper = getComment(element);

      if (!commentWrapper) {
        return;
      }

      const { comment: newComment, append } = commentWrapper;

      if (append) {
        commentGroup.push(newComment);
      }

      // Process children
      if (childExtractionOpts) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        processCommentChildren(element, newComment, childExtractionOpts);
      }
    };

  const processCommentChildren = (
    node: cheerio.Element,
    comment: Comment,
    childExtractionOpts: ChildLevelCommentExtractorOptions
  ) => {
    const childMatchingSelector = findMatchingSelector(
      $,
      childExtractionOpts?.selectors ?? [],
      true,
      childExtractionOpts?.allowMultiple,
      node
    );

    const childSelector = Array.isArray(childMatchingSelector)
      ? childMatchingSelector.join(',')
      : childMatchingSelector;

    if (!childSelector) {
      return;
    }

    const commentBuilder = createCommentBuilder(
      (comment.children ??= []),
      childExtractionOpts
    );

    $(childSelector, node).each((_, element) => commentBuilder(element));
  };

  const commentBuilder = createCommentBuilder(
    comments,
    extractionOpts.childLevel
  );

  const $content = $(
    Array.isArray(matchingSelector)
      ? matchingSelector.join(',')
      : matchingSelector
  );
  $content.each((_, element) => commentBuilder(element));

  // TODO: Run cleaners?
  return comments;
};

const extractCommentResult = (
  opts: Omit<ExtractResultOptions<'comment'>, 'type'>
): ReturnType<typeof GenericExtractor['comment']> => {
  const { extractor } = opts;

  const commentOptions = extractor.comment;

  if (!commentOptions) {
    // TODO: Fallback to generic extractor?
    return undefined;
  }

  const result = selectNestedComments({
    ...opts,
    extractionOpts: commentOptions,
  });

  return result;
};

export const RootExtractor = {
  extract(
    extractor: CustomExtractor | undefined,
    opts: ExtractorOptions
  ): FullExtractorResult | ContentExtractorResult {
    const { contentOnly, extractedTitle } = opts;
    // This is the generic extractor. Run its extract method
    if (!extractor) {
      return {
        type: 'full',
        ...GenericExtractor.extract(opts),
      };
    }

    const selectionOptions: Omit<
      ExtractResultOptions<DefaultContentType>,
      'type'
    > = {
      ...opts,
      extractor,
    };

    const { url, domain } = extractResult<'url_and_domain'>({
      ...selectionOptions,
      type: 'url_and_domain',
    }) ?? { url: undefined, domain: undefined };

    if (contentOnly) {
      const content = extractResult<'content'>({
        ...selectionOptions,
        type: 'content',
        extractHtml: true,
        title: extractedTitle,
      });
      const next_page_url = extractResult<'next_page_url'>({
        ...selectionOptions,
        type: 'next_page_url',
      });

      return {
        type: 'contentOnly',
        url,
        domain,
        content,
        next_page_url,
      };
    }
    const title = extractResult<'title'>({
      ...selectionOptions,
      type: 'title',
    });
    const date_published = extractResult<'date_published'>({
      ...selectionOptions,
      type: 'date_published',
    });
    const author = extractResult<'author'>({
      ...selectionOptions,
      type: 'author',
      allowConcatination: true,
    });
    const next_page_url = extractResult<'next_page_url'>({
      ...selectionOptions,
      type: 'next_page_url',
    });
    const content = extractResult<'content'>({
      ...selectionOptions,
      type: 'content',
      extractHtml: true,
      title,
    });
    const comments = extractCommentResult({
      ...selectionOptions,
      extractHtml: true,
    });
    const lead_image_url = extractResult<'lead_image_url'>({
      ...selectionOptions,
      type: 'lead_image_url',
      content,
    });
    const excerpt = extractResult<'excerpt'>({
      ...selectionOptions,
      type: 'excerpt',
      content,
    });
    const dek = extractResult<'dek'>({
      ...selectionOptions,
      type: 'dek',
      content,
      excerpt,
    });
    const word_count = extractResult<'word_count'>({
      ...selectionOptions,
      type: 'word_count',
      content,
    });
    const direction = extractResult<'direction'>({
      ...selectionOptions,
      type: 'direction',
      title,
    });

    let extendedResults: Record<string, string | string[]> = {};
    if (extractor.extend) {
      extendedResults = selectExtendedTypes(extractor.extend, selectionOptions);
    }

    return {
      type: 'full',
      title,
      content,
      comments,
      author,
      date_published,
      lead_image_url,
      dek,
      next_page_url,
      url,
      domain,
      excerpt,
      word_count,
      direction,
      ...extendedResults,
    };
  },
};
