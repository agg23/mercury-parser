import { DeprecatedSelection, Selection } from './types';

const isDeprecatedSelection = (
  input: Selection | DeprecatedSelection
): input is DeprecatedSelection =>
  typeof input === 'string' || Array.isArray(input);

/**
 * Migrates the deprecated selection to the modern format
 */
export const migrateSelections = (
  selections: Selection[] | DeprecatedSelection[] | undefined,
  allowMultiple?: boolean,
  extractHtml?: boolean
): Selection[] =>
  selections?.map((selection): Selection => {
    if (isDeprecatedSelection(selection)) {
      if (typeof selection === 'string') {
        if (allowMultiple) {
          return {
            type: 'multiArray',
            selector: selection,
            returnHtml: extractHtml,
          };
        }

        return {
          type: 'exactlyOne',
          selector: selection,
          returnHtml: extractHtml,
        };
      } else if (extractHtml) {
        // In extractHtml mode, selectors are string | string[]
        return {
          type: 'multiGrouped',
          selector: {
            type: 'matchAll',
            selectors: selection as string[],
          },
        };
      } else if (selection.length < 3) {
        const [selector, attr] = selection;

        if (attr) {
          return {
            type: allowMultiple ? 'multiArray' : 'exactlyOne',
            selector: {
              type: 'matchAttr',
              selector,
              attr,
            },
          };
        } else {
          return {
            type: allowMultiple ? 'multiArray' : 'first',
            selector,
          };
        }
      } else {
        // const [selector, attr, transform] = selection;
        // eslint-disable-next-line no-console
        console.error(`Unmigrated transformed selection`, selection);
        throw new Error('Unmigrated transformed selection');
      }
    } else {
      return selection;
    }
  }) ?? [];
