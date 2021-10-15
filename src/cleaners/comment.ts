import { cleanWrappingTags } from 'utils/dom';

export const cleanComment = (
  commentDOM: cheerio.Cheerio,
  {
    $,
  }: {
    $: cheerio.Root;
  }
) => cleanWrappingTags(commentDOM, $);
