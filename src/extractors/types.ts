export interface Extractor {
  domain: string;
  supportedDomains: string;
  // TODO: Add more
}

interface InnerExtractorBaseOptions {
  transforms?: Record<
    string,
    string | ((node: cheerio.Cheerio, $: cheerio.Root) => unknown)
  >;
  defaultCleaner?: boolean;
  clean?: string[];
}

/**
 * @deprecated Use modern selection syntax
 */
export type DeprecatedSelection =
  | string
  | [string, string?]
  | [string, string?, ((item: string) => string)?]
  | [string, string, string?]
  | [string, string, string, string?];

/**
 * @deprecated These are deprecated fields
 */
interface DeprecatedInnerExtractorOptions extends InnerExtractorBaseOptions {
  /**
   * @deprecated Use the modern selection syntax
   */
  selectors?: DeprecatedSelection[];

  /**
   * @deprecated Use the modern selection syntax
   */
  allowMultiple?: boolean;
}

interface ModernInnerExtractorOptions extends InnerExtractorBaseOptions {
  // selectors?: Selector[];
  selectors?: Selection[];
  transforms?: Record<
    string,
    string | ((node: cheerio.Cheerio, $: cheerio.Root) => unknown)
  >;
  defaultCleaner?: boolean;
  allowMultiple?: boolean;
  clean?: string[];
}

export type InnerExtractorOptions =
  | ModernInnerExtractorOptions
  | DeprecatedInnerExtractorOptions;

type TypedInnerExtractorOptions<T extends DefaultContentType> =
  T extends 'date_published'
    ? InnerExtractorOptions & {
        format?: string;
        timezone?: string;
      }
    : InnerExtractorOptions;

export type DefaultContentType =
  | 'content'
  | 'comment'
  | 'title'
  | 'date_published'
  | 'author'
  | 'next_page_url'
  | 'lead_image_url'
  | 'excerpt'
  | 'dek'
  | 'word_count'
  | 'direction'
  | 'url_and_domain';

export interface ChildLevelCommentExtractorOptions
  extends Omit<InnerExtractorOptions, 'transforms'> {
  /**
   * Modify the comment node before applying selectors to extract features
   */
  nodeTransform?: (
    $: cheerio.Root,
    node: cheerio.Element,
    allComments: Comment[]
  ) => void;

  /**
   * Modify the comment data object and insert it into the comment tree.
   *
   * **NOTE:** Implementing this method overrides automatic insertion of a new comment into the tree. Comments must be inserted manually
   */
  insertTransform?: (
    $: cheerio.Root,
    node: cheerio.Element,
    newComment: Comment,
    allComments: Comment[]
  ) => void;
}

export interface CommentExtractorOptions {
  topLevel: InnerExtractorOptions;
  childLevel?: ChildLevelCommentExtractorOptions;
  author: InnerExtractorOptions;
  score?: InnerExtractorOptions;
  date?: InnerExtractorOptions;
  text: InnerExtractorOptions;
}

export type CustomExtractor = {
  [Key in Exclude<
    DefaultContentType,
    'comment'
  >]?: TypedInnerExtractorOptions<Key>;
} & {
  domain: string;
  supportedDomains?: string[];
  extend?: Extend;

  comment?: CommentExtractorOptions;
};

export interface ExtractorOptions {
  $: cheerio.Root;
  html: string;
  url: string;

  extractHtml?: boolean;
  fallback?: boolean;
  contentOnly?: boolean;
  extractedTitle?: string;
  defaultCleaner?: boolean;

  parsedUrl?: URL;
  contentType?: string;
  previousUrls?: string[];
  metaCache: string[];
  excerpt?: string;

  // extractionOpts?: InnerExtractorOptions | string;
  extractionOpts?: InnerExtractorOptions;
}

export interface ExtractResultOptions<T extends DefaultContentType>
  extends ExtractorOptions {
  type: T;
  extractor: CustomExtractor;
  title?: string;

  allowConcatination?: boolean;
}

export interface SelectedExtractOptions<T = InnerExtractorOptions> {
  $: cheerio.Root;
  html: string;
  url: string;
  type: DefaultContentType;
  extractionOpts?: T;
  allowConcatination?: boolean;

  extractHtml?: boolean;
}

export type CleanerOptions = SelectedExtractOptions & InnerExtractorOptions;

export interface Extend {
  [Key: string]: InnerExtractorOptions;
}

export interface Comment {
  author?: string;
  score?: string;
  date?: string;
  text: string;
  children?: Comment[];
}

export interface SelectionSuccessResult {
  type: 'content';
  content: string | string[] | undefined;
}

export type SelectionResult =
  | SelectionSuccessResult
  | {
      type: 'error';
    };

export type ConcatenatedSelectionResult =
  | {
      type: 'content';
      content: string | undefined;
    }
  | {
      type: 'error';
    };

interface BaseExtractorResult {
  url: string;
  domain?: string;

  content?: string;

  next_page_url?: string;
}

export interface ExtractorResult extends BaseExtractorResult {
  title: string;
  comments?: Comment[];
  author?: string;
  date_published?: string;
  // This doesn't need to be in this type
  dek?: undefined;
  lead_image_url?: string;
  excerpt: string;
  word_count: number;
  direction: 'ltr' | 'rtl';
}

export interface FullExtractorResult extends ExtractorResult {
  type: 'full';
}

export interface ContentExtractorResult extends BaseExtractorResult {
  type: 'contentOnly';
}

/// Selectors ///

/**
 * Select multiple disjoint nodes `$(selector0, selector1, ...)`. Each individual
 * selector must match at least one node for this selector to match
 */
export interface SelectorMatchAll {
  type: 'matchAll';
  selectors: string[];
}

/**
 * Select nodes containing a given attribute and return the attribute's value
 */
export interface SelectorMatchAttr {
  type: 'matchAttr';
  selector: string;
  attr: string;
  transform?: (value: string) => string;
}

export type Selector = string | SelectorMatchAll | SelectorMatchAttr;

export type SelectorReturnType<T extends Selector> = T extends string
  ? cheerio.Cheerio
  : T extends SelectorMatchAll
  ? cheerio.Cheerio
  : T extends SelectorMatchAttr
  ? cheerio.Cheerio
  : never;

interface BaseSelection<T extends Selector = Selector> {
  selector: T;
}

/**
 * Select exactly one node. If multiple nodes are matched, fail
 */
export interface SelectionExactlyOne
  extends BaseSelection<Exclude<Selector, SelectorMatchAll>> {
  type: 'exactlyOne';
  /**
   * If true, return a DOM node, otherwise, return the node's inner text
   */
  returnHtml?: boolean;
}

/**
 * Select matching nodes, clean them, and concatinate their inner text. Concatination
 * pattern is specified by `joinPattern`
 */
export interface SelectionConcatinate extends BaseSelection {
  type: 'concatinate';
  /**
   * Defaults to `', '`
   */
  joinPattern?: string;
}

/**
 * Selects the first matching node
 */
export interface SelectionFirstMatch extends BaseSelection {
  type: 'first';
  /**
   * If true, return a DOM node, otherwise, return the node's inner text
   */
  returnHtml?: boolean;
}

/**
 * Selects all matching nodes and combines them under a parent `div`
 */
export interface SelectionMulitpleGrouped extends BaseSelection {
  type: 'multiGrouped';
}

/**
 * Selects all matching nodes and returns them as an array
 */
export interface SelectionMultipleArray extends BaseSelection {
  type: 'multiArray';
  /**
   * If true, return DOM nodes, otherwise, return the nodes' inner text
   */
  returnHtml?: boolean;
}

type SelectionReturnMap = {
  exactlyOne: string;
  concatinate: string;
  first: string;
  multiGrouped: cheerio.Cheerio;
  multiArray: string[];
};

export type SelectionReturnType<T extends Selection> =
  SelectionReturnMap[T['type']];

export type Selection =
  | SelectionExactlyOne
  | SelectionConcatinate
  | SelectionFirstMatch
  | SelectionMulitpleGrouped
  | SelectionMultipleArray;
