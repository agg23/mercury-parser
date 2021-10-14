import { CLEAN_WRAPPING_TAGS } from './constants';

export const cleanWrappingTags = (
  $node: cheerio.Cheerio,
  $: cheerio.Root
): cheerio.Cheerio => {
  const element = $node[0];

  if (element.type === 'tag') {
    if (
      element.children.length < 2 &&
      CLEAN_WRAPPING_TAGS.includes(element.tagName)
    ) {
      const child = element.children[0];

      if (!child) {
        return $node.remove();
      }

      if (child.type === 'text') {
        return $node.replaceWith(`<p>${$node.html()}</p>`);
      }

      return cleanWrappingTags($node.children(), $);
    }
  } else if (element.type === 'text') {
    return $(element).wrap('p');
  }

  return $node;
};
