import cheerio from 'cheerio';

import { ExtractorOptions } from '../content/types';
import { extractBestNodes } from './extract-best-node';

export const GenericCommentExtractor = {
  defaultOpts: {
    stripUnlikelyCandidates: true,
    weightNodes: true,
  },

  // Extract the content for this resource - initially, pass in our
  // most restrictive opts which will return the highest quality
  // content. On each failure, retry with slightly more lax opts.
  //
  // :param return_type: string. If "node", should return the content
  // as a cheerio node rather than as an HTML string.
  extract(
    { $, html }: { $: cheerio.Root; html: string },
    opts?: ExtractorOptions
  ) {
    const options = { ...this.defaultOpts, ...opts };

    $ = cheerio.load(html);

    // Cascade through our extraction-specific opts in an ordered fashion,
    // turning them off as we try to extract content.
    return extractBestNodes($, options);
    // const node = this.getContentNode($, title, url, options);

    // if (nodeIsSufficient(node)) {
    //   return this.cleanAndReturnNode(node, $);
    // }

    // // We didn't succeed on first pass, one by one disable our
    // // extraction opts and try again.
    // // eslint-disable-next-line no-restricted-syntax
    // for (const key of Reflect.ownKeys(options).filter(
    //   k => options[k as keyof ExtractorOptions] === true
    // )) {
    //   options[key as keyof ExtractorOptions] = false;
    //   $ = cheerio.load(html);

    //   node = this.getContentNode($, title, url, options);

    //   if (nodeIsSufficient(node)) {
    //     break;
    //   }
    // }

    // return this.cleanAndReturnNode(node, $);
  },

  // Get node given current options
  // getContentNode(
  //   $: cheerio.Root,
  //   title: string,
  //   url: string,
  //   opts: ExtractorOptions
  // ) {
  //   return cleanContent(extractBestNodes($, opts), {
  //     $,
  //     title,
  //     url,
  //   });
  // },

  // // Once we got here, either we're at our last-resort node, or
  // // we broke early. Make sure we at least have -something- before we
  // // move forward.
  // cleanAndReturnNode(node: cheerio.Cheerio, $: cheerio.Root) {
  //   if (!node) {
  //     return undefined;
  //   }

  //   return normalizeSpaces($.html(node));
  // },
};
