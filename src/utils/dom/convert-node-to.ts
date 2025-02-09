import { getAttrs } from './get-attrs';

export function convertNodeTo(
  $node: cheerio.Cheerio,
  $: cheerio.Root,
  tag = 'p'
) {
  const node = $node.get(0);
  if (!node) {
    return $;
  }
  const attrs = getAttrs(node) || {};

  const attribString = Reflect.ownKeys(attrs)
    .map(key => {
      const stringKey = String(key);

      return `${stringKey}=${attrs[stringKey]}`;
    })
    .join(' ');
  let html;

  if (($ as any).browser) {
    // In the browser, the contents of noscript tags aren't rendered, therefore
    // transforms on the noscript tag (commonly used for lazy-loading) don't work
    // as expected. This test case handles that
    html =
      node.tagName.toLowerCase() === 'noscript' ? $node.text() : $node.html();
  } else {
    html = $node.contents();
  }
  $node.replaceWith(`<${tag} ${attribString}>${html}</${tag}>`);
  return $;
}
