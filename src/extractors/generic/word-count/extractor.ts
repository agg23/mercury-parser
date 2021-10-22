import { loadCheerio } from 'utils/dom';

import { normalizeSpaces } from '../../../utils/text';

export const GenericWordCountExtractor = {
  extract({ content }: { content: string | undefined }) {
    if (!content) {
      return 0;
    }

    const $ = loadCheerio(content);
    const $content = $('div').first();

    const text = normalizeSpaces($content.text());
    return text.split(/\s/).length;
  },
};
