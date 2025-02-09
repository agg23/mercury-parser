import { removeAnchor } from '../utils/text';
import { RootExtractor } from './root-extractor';
import { GenericExtractor } from './generic';
import Resource from '../resource';
import { CustomExtractor, ExtractorOptions, ExtractorResult } from './types';

export async function collectAllPages({
  next_page_url,
  html,
  $: $incoming,
  metaCache,
  result,
  extractor,
  title,
  url,
}: ExtractorOptions & {
  extractor: CustomExtractor | undefined;
  result: ExtractorResult;
  next_page_url?: string;
  title: string;
}) {
  // At this point, we've fetched just the first page
  let $ = $incoming;
  let pages = 1;
  const previousUrls = [removeAnchor(url)];

  // If we've gone over 26 pages, something has
  // likely gone wrong.
  while (next_page_url && pages < 26) {
    pages += 1;
    // eslint-disable-next-line no-await-in-loop
    const root = await Resource.create(next_page_url);

    if ('type' in root) {
      break;
    }

    $ = root;

    html = $.html();

    const extractorOpts = {
      url: next_page_url,
      html,
      $,
      metaCache,
      contentOnly: true,
      extractedTitle: title,
      previousUrls,
    };

    const nextPageResult = RootExtractor.extract(extractor, extractorOpts);

    previousUrls.push(next_page_url);
    result = {
      ...result,
      content: `${result.content}<hr><h4>Page ${pages}</h4>${nextPageResult.content}`,
    };

    // eslint-disable-next-line prefer-destructuring
    next_page_url = nextPageResult.next_page_url;
  }

  const word_count = GenericExtractor.word_count({
    content: `<div>${result.content}</div>`,
  });
  return {
    ...result,
    total_pages: pages,
    pages_rendered: pages,
    word_count,
  };
}
