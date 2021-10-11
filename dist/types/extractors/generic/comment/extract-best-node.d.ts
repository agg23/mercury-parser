/// <reference types="cheerio" />
import { Comment } from 'extractors/types';
import { ExtractorOptions } from '../content/types';
export declare const extractBestNodes: ($: cheerio.Root, opts: ExtractorOptions) => Comment[] | undefined;
