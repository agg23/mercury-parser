import { GenericExtractor } from './generic';
import { select, selectExtendedTypes } from './select';
import { extractCommentResult } from './comment-extractor';
import {
  CustomExtractor,
  DefaultContentType,
  ExtractorOptions,
  ExtractResultOptions,
  FullExtractorResult,
  ContentExtractorResult,
} from './types';

const extractResult = <T extends Exclude<DefaultContentType, 'comment'>>(
  opts: ExtractResultOptions<T> & { content?: string }
): ReturnType<typeof GenericExtractor[T]> => {
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
