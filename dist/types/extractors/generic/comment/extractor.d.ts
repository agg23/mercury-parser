import cheerio from 'cheerio';
import { ExtractorOptions } from '../content/types';
export declare const GenericCommentExtractor: {
    defaultOpts: {
        stripUnlikelyCandidates: boolean;
        weightNodes: boolean;
    };
    extract({ $, html }: {
        $: cheerio.Root;
        html: string;
    }, opts?: ExtractorOptions | undefined): import("../../types").Comment[] | undefined;
};
