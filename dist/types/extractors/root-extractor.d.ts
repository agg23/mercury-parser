/// <reference types="cheerio" />
import { CustomExtractor, Extend, ExtractorOptions, SelectedExtractOptions, FullExtractorResult, ContentExtractorResult, SelectionResult } from './types';
export declare function cleanBySelectors($content: cheerio.Cheerio, $: cheerio.Root, { clean }?: {
    clean?: string[];
}): cheerio.Cheerio;
export declare function transformElements($content: cheerio.Cheerio, $: cheerio.Root, { transforms, }?: {
    transforms?: Record<string, string | ((node: cheerio.Cheerio, $: cheerio.Root) => unknown)>;
}): cheerio.Cheerio;
export declare const select: (opts: SelectedExtractOptions, root?: cheerio.Cheerio | cheerio.Element | undefined) => SelectionResult;
export declare function selectExtendedTypes(extend: Extend, opts: Omit<SelectedExtractOptions, 'type'>): Record<string, string | string[]>;
export declare const RootExtractor: {
    extract(extractor: CustomExtractor | undefined, opts: ExtractorOptions): FullExtractorResult | ContentExtractorResult;
};
