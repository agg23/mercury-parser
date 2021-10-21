/// <reference types="cheerio" />
import { ConcatenatedSelectionResult, Extend, SelectedExtractOptions, SelectionResult, Selection, Selector, SelectorReturnType } from './types';
export declare const cleanBySelectors: ($content: cheerio.Cheerio, $: cheerio.Root, { clean }?: {
    clean?: string[] | undefined;
}) => cheerio.Cheerio;
export declare const transformElements: ($content: cheerio.Cheerio, $: cheerio.Root, { transforms, }?: {
    transforms?: Record<string, string | ((node: cheerio.Cheerio, $: cheerio.Root) => unknown)> | undefined;
}) => cheerio.Cheerio;
export declare const chooseSelection: ($: cheerio.Root, selections: Selection[], selectionRoot?: cheerio.Cheerio | undefined) => {
    selection: Selection;
    matches: SelectorReturnType<Selector>;
} | undefined;
export declare const select: (opts: SelectedExtractOptions, root?: cheerio.Cheerio | undefined) => SelectionResult;
export declare const selectExtendedTypes: (extend: Extend, opts: Omit<SelectedExtractOptions, 'type'>) => Record<string, string | string[]>;
export declare const selectConcatinating: (opts: SelectedExtractOptions, root?: cheerio.Cheerio | undefined) => ConcatenatedSelectionResult;
