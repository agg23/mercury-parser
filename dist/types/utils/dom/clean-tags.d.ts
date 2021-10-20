/// <reference types="cheerio" />
/**
 * Given an article, clean it of some superfluous content specified by
 * tags. Things like forms, ads, etc.
 *
 * Tags is an array of tag name's to search through. (like div, form,
 * etc)
 * @returns The modified article
 */
export declare const cleanTags: ($article: cheerio.Cheerio, $: cheerio.Root) => cheerio.Cheerio;
