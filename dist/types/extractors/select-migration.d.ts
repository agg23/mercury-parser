import { DeprecatedSelection, Selection } from './types';
/**
 * Migrates the deprecated selection to the modern format
 */
export declare const migrateSelections: (selections: Selection[] | DeprecatedSelection[] | undefined, allowMultiple?: boolean | undefined, extractHtml?: boolean | undefined) => Selection[];
