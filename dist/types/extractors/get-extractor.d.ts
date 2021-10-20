/// <reference types="cheerio" />
import { CustomExtractor } from './types';
export declare function getExtractor(url: string, parsedUrl: URL, $: cheerio.Root): CustomExtractor | undefined;
