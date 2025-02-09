import { convertNodeTo } from './convert-node-to';

// Rewrite the tag name to div if it's a top level node like body or
// html to avoid later complications with multiple body tags.
export function rewriteTopLevel($: cheerio.Root) {
  // I'm not using context here because
  // it's problematic when converting the
  // top-level/root node - AP
  $ = convertNodeTo($('html'), $, 'div');
  $ = convertNodeTo($('body'), $, 'div');

  return $;
}
