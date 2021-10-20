/// <reference types="cheerio" />
import { cleanAuthor } from './author';
import { cleanImage } from './lead-image-url';
import { cleanDek } from './dek';
import { cleanDatePublished } from './date-published';
import { cleanContent } from './content';
import { cleanTitle } from './title';
import { CleanerOptions } from '../extractors/types';
declare const InternalStringCleaners: {
    author: typeof cleanAuthor;
    lead_image_url: typeof cleanImage;
    date_published: typeof cleanDatePublished;
    title: typeof cleanTitle;
    dek: typeof cleanDek;
};
declare const InternalDOMCleaners: {
    comment: (commentDOM: cheerio.Cheerio, { $, }: {
        $: cheerio.Root;
    }) => cheerio.Cheerio;
    content: typeof cleanContent;
};
declare type StringCleanersMap = {
    [Key in keyof typeof InternalStringCleaners]: (input: string, opts: CleanerOptions) => string | undefined;
};
declare type DOMCleanersMap = {
    [Key in keyof typeof InternalDOMCleaners]: (input: cheerio.Cheerio, opts: CleanerOptions) => cheerio.Cheerio | undefined;
};
export declare const StringCleaners: StringCleanersMap;
export declare const DOMCleaners: DOMCleanersMap;
export { cleanAuthor };
export { cleanImage };
export { cleanDek };
export { cleanDatePublished };
export { cleanContent };
export { cleanTitle };
export { resolveSplitTitle } from './resolve-split-title';
