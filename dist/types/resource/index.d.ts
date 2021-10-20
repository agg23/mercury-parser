/// <reference types="node" />
import cheerio from 'cheerio';
import { ErrorResult, SuccessResult } from './utils/fetch-resource';
declare const Resource: {
    create(url: string, preparedResponse?: Buffer | undefined, parsedUrl?: URL | undefined, headers?: Record<string, string>): Promise<cheerio.Root | ErrorResult>;
    generateDoc({ body, headers }: SuccessResult): cheerio.Root;
    encodeDoc({ content, contentType, }: {
        content: Buffer;
        contentType: string;
    }): cheerio.Root;
};
export default Resource;
