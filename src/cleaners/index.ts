import { cleanAuthor } from './author';
import { cleanImage } from './lead-image-url';
import { cleanDek } from './dek';
import { cleanDatePublished } from './date-published';
import { cleanContent } from './content';
import { cleanTitle } from './title';
import { CleanerOptions } from '../extractors/types';
import { cleanComment } from './comment';

const InternalStringCleaners = {
  author: cleanAuthor,
  lead_image_url: cleanImage,
  date_published: cleanDatePublished,
  title: cleanTitle,
  dek: cleanDek,
};

const InternalDOMCleaners = {
  comment: cleanComment,
  content: cleanContent,
};

type StringCleanersMap = {
  [Key in keyof typeof InternalStringCleaners]: (
    input: string,
    opts: CleanerOptions
  ) => string | undefined;
};

type DOMCleanersMap = {
  [Key in keyof typeof InternalDOMCleaners]: (
    input: cheerio.Cheerio,
    opts: CleanerOptions
  ) => cheerio.Cheerio | undefined;
};

export const StringCleaners = InternalStringCleaners as StringCleanersMap;

export const DOMCleaners = InternalDOMCleaners as DOMCleanersMap;

export { cleanAuthor };
export { cleanImage };
export { cleanDek };
export { cleanDatePublished };
export { cleanContent };
export { cleanTitle };
export { resolveSplitTitle } from './resolve-split-title';
