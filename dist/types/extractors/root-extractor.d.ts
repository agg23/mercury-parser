import { CustomExtractor, ExtractorOptions, FullExtractorResult, ContentExtractorResult } from './types';
export declare const RootExtractor: {
    extract(extractor: CustomExtractor | undefined, opts: ExtractorOptions): FullExtractorResult | ContentExtractorResult;
};
