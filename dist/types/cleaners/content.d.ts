/// <reference types="cheerio" />
export declare function cleanContent(content: cheerio.Cheerio, { $, title, url, defaultCleaner, }: {
    $: cheerio.Root;
    title?: string;
    url: string;
    defaultCleaner?: boolean;
}): cheerio.Cheerio | undefined;
