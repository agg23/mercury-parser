import cheerio from 'cheerio';
import { assert } from 'console';
import { normalizeSpaces } from 'utils/text';
import { Cleaners } from '../cleaners';
import { convertNodeTo, makeLinksAbsolute } from '../utils/dom';
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
      return (
        (allowMultiple || (!allowMultiple && selectorTest(s).length === 1)) &&
        selectorTest(s).attr(attr) &&
        selectorTest(s).attr(attr)?.trim() !== ''
      );
    }

    return (
      (allowMultiple ||
        (!allowMultiple && selectorTest(selector).length === 1)) &&
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
) => {
  const { $, type, extractionOpts, extractHtml = false } = opts;
  // Skip if there's not extraction for this type
  if (!extractionOpts) {
    return undefined;
  }

  // If a string is hardcoded for a type (e.g., Wikipedia
  // contributors), return the string
  if (typeof extractionOpts === 'string') {
    return extractionOpts;
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
    return undefined;
  }

  const boundTransformAndClean = ($node: cheerio.Cheerio) =>
    transformAndClean(
      $,
      $node,
      opts.url,
      extractionOpts as InnerExtractorOptions
    );

  const $select = buildSelect($, root);

  function selectHtml() {
    // If the selector type requests html as its return type
    // transform and clean the element with provided selectors
    let $content: cheerio.Cheerio;

    // If matching selector is an array, we're considering this a
    // multi-match selection, which allows the parser to choose several
    // selectors to include in the result. Note that all selectors in the
    // array must match in order for this selector to trigger
    if (Array.isArray(matchingSelector)) {
      $content = $select(matchingSelector.join(',')).clone();
      const $wrapper = $('<div></div>');
      $content.each((_, element) => {
        // TODO: Cheerio doesn't list cheerio.Element as an appendable type
        $wrapper.append($(element));
      });

      $content = $wrapper;
    } else {
      $content = $select(matchingSelector).clone();
      // Wrap in div so transformation can take place on root element
      $content.wrap($('<div></div>'));
      $content = $content.parent();
    }

    $content = boundTransformAndClean($content);
    if (type in Cleaners) {
      Cleaners[type as keyof typeof Cleaners]($content, {
        ...opts,
        defaultCleaner,
      });
    }

    if (allowMultiple) {
      return $content
        .children()
        .toArray()
        .map(el => $.html($(el)));
    }

    return $content.children().first().html() ?? undefined;
  }

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
    $match = boundTransformAndClean($match);
    result = $match.map((_, el) => {
      const item = $(el).attr(attr)?.trim() ?? '';
      return transform ? transform(item) : item;
    });
  } else {
    $match = $select(matchingSelector);
    $match = boundTransformAndClean($match);
    result = $match.map((_, el) => $(el).text().trim());
  }

  const finalResult =
    Array.isArray(result.toArray()) && allowMultiple
      ? (result.toArray() as unknown as string[])
      : (result[0] as unknown as string);
  // Allow custom extractor to skip default cleaner
  // for this type; defaults to true
  if (defaultCleaner && type in Cleaners) {
    return Cleaners[type as keyof typeof Cleaners](finalResult as any, {
      ...opts,
      ...extractionOpts,
    });
  }

  return finalResult;
};

const selectConcatinating = (
  opts: SelectedExtractOptions,
  root?: cheerio.Cheerio | cheerio.Element
) => {
  const result = select(opts, root);

  return Array.isArray(result) ? result.join(',') : result;
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
      if (selectedData) {
        results[type] = selectedData;
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
  if (result) {
    return result as Result;
  }

  // If nothing matches the selector, and fallback is enabled,
  // run the Generic extraction
  if (fallback) {
    return GenericExtractor[type](opts) as Result;
  }

  return undefined as Result;
}

const selectNestedComments = (
  opts: Omit<SelectedExtractOptions<CommentExtractorOptions>, 'type'>
): Comment[] | undefined => {
  const { $, extractionOpts } = opts;
  // Skip if there's not extraction for this type
  if (!extractionOpts) {
    return undefined;
  }

  const { selectors, allowMultiple } = extractionOpts.topLevel;

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
        // TODO: Add proper type for cleaning
        type: 'comment',
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
      author,
      score,
      text: normalizeSpaces(text),
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

  // If matching selector is an array, we're considering this a
  // multi-match selection, which allows the parser to choose several
  // selectors to include in the result. Note that all selectors in the
  // array must match in order for this selector to trigger
  if (!Array.isArray(matchingSelector)) {
    assert(false, 'Comment matching selector is not an array');
    return undefined;
  }

  const commentBuilder = createCommentBuilder(
    comments,
    extractionOpts.childLevel
  );

  const $content = $(matchingSelector.join(','));
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
    const { url, domain } = extractResult<'url_and_domain'>({
      ...selectionOptions,
      type: 'url_and_domain',
    }) || { url: null, domain: null };

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
