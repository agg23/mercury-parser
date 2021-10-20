/// <reference types="cheerio" />
export declare function cleanDek(dek: string, { $, excerpt }: {
    $: cheerio.Root;
    excerpt?: string;
}): string | undefined;
