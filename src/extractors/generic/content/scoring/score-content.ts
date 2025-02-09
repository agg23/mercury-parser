import { HNEWS_CONTENT_SELECTORS } from 'utils/dom/constants';
import { convertNodeTo } from '../../../../utils/dom/convert-node-to';
import { addScore, getOrInitScore } from './add-score';

import { scoreNode } from './score-node';
import { setScore } from './set-score';

function convertSpans($node: cheerio.Cheerio, $: cheerio.Root) {
  if ($node.get(0)) {
    const { tagName } = $node.get(0);

    if (tagName === 'span') {
      // convert spans to divs
      convertNodeTo($node, $, 'div');
    }
  }
}

function addScoreTo($node: cheerio.Cheerio, $: cheerio.Root, score: number) {
  if ($node) {
    convertSpans($node, $);
    addScore($node, $, score);
  }
}

function scorePs($: cheerio.Root, weightNodes: boolean) {
  $('p, pre')
    .not('[score]')
    .each((index, node) => {
      // The raw score for this paragraph, before we add any parent/child
      // scores.
      let $node = $(node);
      $node = setScore($node, getOrInitScore($node, $, weightNodes));

      const $parent = $node.parent();
      const rawScore = scoreNode($node);

      addScoreTo($parent, $, rawScore);
      if ($parent) {
        // Add half of the individual content score to the
        // grandparent
        addScoreTo($parent.parent(), $, rawScore / 2);
      }
    });

  return $;
}

// score content. Parents get the full value of their children's
// content score, grandparents half
export function scoreContent($: cheerio.Root, weightNodes = true) {
  // First, look for special hNews based selectors and give them a big
  // boost, if they exist
  HNEWS_CONTENT_SELECTORS.forEach(([parentSelector, childSelector]) => {
    $(`${parentSelector} ${childSelector}`).each((index, node) => {
      addScore($(node).parent(parentSelector), $, 80);
    });
  });

  // Doubling this again
  // Previous solution caused a bug
  // in which parents weren't retaining
  // scores. This is not ideal, and
  // should be fixed.
  scorePs($, weightNodes);
  scorePs($, weightNodes);

  return $;
}
