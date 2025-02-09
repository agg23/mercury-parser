import {
  BAD_TAGS,
  CHILD_CONTENT_TAGS,
  PARAGRAPH_SCORE_TAGS,
} from 'utils/dom/constants';

import { scoreParagraph } from './score-paragraph';

// Score an individual node. Has some smarts for paragraphs, otherwise
// just scores based on tag.
export function scoreNode($node: cheerio.Cheerio) {
  const { tagName } = $node.get(0);

  // TODO: Consider ordering by most likely.
  // E.g., if divs are a more common tag on a page,
  // Could save doing that regex test on every node – AP
  if (PARAGRAPH_SCORE_TAGS.test(tagName)) {
    return scoreParagraph($node);
  }
  if (tagName.toLowerCase() === 'div') {
    return 5;
  }
  if (CHILD_CONTENT_TAGS.test(tagName)) {
    return 3;
  }
  if (BAD_TAGS.test(tagName)) {
    return -3;
  }
  if (tagName.toLowerCase() === 'th') {
    return -5;
  }

  return 0;
}
