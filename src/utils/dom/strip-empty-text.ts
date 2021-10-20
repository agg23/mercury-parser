import { stripNewlines } from './strip-newlines';

export const stripEmptyTextNodes = (
  $content: cheerio.Cheerio,
  $: cheerio.Root
) => {
  $content.contents().each((_, element) => {
    if (element.type === 'text') {
      const text = element.data ?? '';

      element.data = stripNewlines(text.trim());

      if (!element.data) {
        $(element).remove();
      }
    } else if (element.type === 'tag') {
      stripEmptyTextNodes($(element), $);
    }
  });
};
