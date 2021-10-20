/// <reference types="cheerio" />
import { Comment } from 'extractors/types';
export declare const NewsYcombinatorComExtractor: {
    domain: string;
    title: {
        selectors: string[][];
    };
    author: {
        selectors: string[];
    };
    date_published: {
        selectors: string[][];
    };
    dek: {
        selectors: never[];
    };
    lead_image_url: {
        selectors: never[];
    };
    content: {
        selectors: string[][];
        transforms: {};
        clean: string[];
    };
    comment: {
        topLevel: {
            selectors: string[][];
        };
        childLevel: {
            insertTransform: ($: cheerio.Root, node: cheerio.Element, newComment: Comment, comments: Comment[]) => void;
        };
        author: {
            selectors: string[][];
        };
        date: {
            selectors: string[][];
        };
        text: {
            selectors: string[][];
            clean: string[];
        };
    };
};
