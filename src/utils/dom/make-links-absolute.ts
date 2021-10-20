import { getAttrs } from './get-attrs';
import { setAttr } from './set-attr';

function absolutize(
  $: cheerio.Root,
  $content: cheerio.Cheerio,
  rootUrl: string,
  attr: string
) {
  let baseUrl = $('base').attr('href');

  if (baseUrl?.startsWith('//')) {
    baseUrl = undefined;
  }

  $(`[${attr}]`, $content).each((_, node) => {
    const attrs = getAttrs(node);
    const url = attrs[attr];
    if (!url) return;
    const absoluteUrl = new URL(url, baseUrl || rootUrl);

    setAttr(node, attr, absoluteUrl.toString());
  });
}

function absolutizeSet(
  $: cheerio.Root,
  rootUrl: string,
  $content: cheerio.Cheerio
) {
  $('[srcset]', $content).each((_, node) => {
    const attrs = getAttrs(node);
    const urlSet = attrs.srcset;

    if (urlSet) {
      // a comma should be considered part of the candidate URL unless preceded by a descriptor
      // descriptors can only contain positive numbers followed immediately by either 'w' or 'x'
      // space characters inside the URL should be encoded (%20 or +)
      const candidates = urlSet.match(
        /(?:\s*)(\S+(?:\s*[\d.]+[wx])?)(?:\s*,\s*)?/g
      );
      if (!candidates) return;
      const absoluteCandidates = candidates.map(candidate => {
        // a candidate URL cannot start or end with a comma
        // descriptors are separated from the URLs by unescaped whitespace
        const parts = candidate.trim().replace(/,$/, '').split(/\s+/);
        parts[0] = new URL(parts[0], rootUrl).toString();
        return parts.join(' ');
      });
      const absoluteUrlSet = [...new Set(absoluteCandidates)].join(', ');
      setAttr(
        node,
        'srcset',
        absoluteUrlSet.length > 0 ? absoluteUrlSet : undefined
      );
    }
  });
}

export function makeLinksAbsolute(
  $content: cheerio.Cheerio,
  $: cheerio.Root,
  url: string
) {
  ['href', 'src'].forEach(attr => absolutize($, $content, url, attr));
  absolutizeSet($, url, $content);

  return $content;
}
