import { CustomExtractor, ExtractorOptions, ExtractorResult } from './types';
export declare function collectAllPages({ next_page_url, html, $: $incoming, metaCache, result, extractor, title, url, }: ExtractorOptions & {
    extractor: CustomExtractor;
    result: ExtractorResult;
    next_page_url?: string;
    title: string;
}): Promise<{
    total_pages: number;
    pages_rendered: number;
    word_count: number;
    title: string;
    comments?: import("./types").Comment[] | undefined;
    author?: string | undefined;
    date_published?: string | undefined;
    dek?: undefined;
    lead_image_url?: string | undefined;
    excerpt: string;
    direction: "ltr" | "rtl";
    url: string;
    domain?: string | undefined;
    content?: string | undefined;
    next_page_url?: string | undefined;
}>;
