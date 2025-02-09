// import {
//   getScore,
//   setScore,
//   getOrInitScore,
//   scoreCommas,
// } from '../../extractors/generic/content/scoring';
import { getScore } from 'extractors/generic/content/scoring/get-score';
import { getOrInitScore } from 'extractors/generic/content/scoring/add-score';
import { setScore } from 'extractors/generic/content/scoring/set-score';
import { scoreCommas } from 'extractors/generic/content/scoring/score-commas';

import { CLEAN_CONDITIONALLY_TAGS_SELECTOR, KEEP_CLASS } from './constants';
import { normalizeSpaces } from '../text';
import { linkDensity } from './link-density';

const doesContainContent = (
  $node: cheerio.Cheerio,
  $: cheerio.Root,
  weight: number
): boolean => {
  // Explicitly save entry-content-asset tags, which are
  // noted as valuable in the Publisher guidelines. For now
  // this works everywhere. We may want to consider making
  // this less of a sure-thing later.
  if ($node.hasClass('entry-content-asset')) {
    return true;
  }

  const content = normalizeSpaces($node.text());

  if (scoreCommas(content) < 10) {
    const pCount = $('p', $node).length;
    const inputCount = $('input', $node).length;

    // Looks like a form, too many inputs.
    if (inputCount > pCount / 3) {
      return false;
    }

    const contentLength = content.length;
    const imgCount = $('img', $node).length;

    // Content is too short, and there are no images, so
    // this is probably junk content.
    if (contentLength < 25 && imgCount === 0) {
      return false;
    }

    const density = linkDensity($node);

    // Too high of link density, is probably a menu or
    // something similar.
    // console.log(weight, density, contentLength)
    if (weight < 25 && density > 0.2 && contentLength > 75) {
      return false;
    }

    // Too high of a link density, despite the score being
    // high.
    if (weight >= 25 && density > 0.5) {
      // Don't remove the node if it's a list and the
      // previous sibling starts with a colon though. That
      // means it's probably content.
      const tagName = $node.get(0).tagName.toLowerCase();
      const nodeIsList = tagName === 'ol' || tagName === 'ul';
      if (nodeIsList) {
        const previousNode = $node.prev();
        if (
          previousNode &&
          normalizeSpaces(previousNode.text()).slice(-1) === ':'
        ) {
          return true;
        }
      }

      return false;
    }

    const scriptCount = $('script', $node).length;

    // Too many script tags, not enough content.
    if (scriptCount > 0 && contentLength < 150) {
      return false;
    }
  }

  return true;
};

/**
 * Given an article, clean it of some superfluous content specified by
 * tags. Things like forms, ads, etc.
 *
 * Tags is an array of tag name's to search through. (like div, form,
 * etc)
 * @returns The modified article
 */
export const cleanTags = ($article: cheerio.Cheerio, $: cheerio.Root) => {
  const checkIsContentNode = (node: cheerio.Element) => {
    const $node = $(node);
    // If marked to keep, skip it
    if ($node.hasClass(KEEP_CLASS) || $node.find(`.${KEEP_CLASS}`).length > 0) {
      return true;
    }

    let weight = getScore($node);
    if (!weight) {
      weight = getOrInitScore($node, $);
      setScore($node, weight);
    }

    // drop node if its weight is < 0
    if (weight < 0) {
      $node.remove();
      return false;
    }

    // deteremine if node seems like content
    if (!doesContainContent($node, $, weight)) {
      $node.remove();
      return false;
    }

    return true;
  };

  $(CLEAN_CONDITIONALLY_TAGS_SELECTOR, $article).each((_, node) => {
    checkIsContentNode(node);
    // Returning falsy prematurely halts the each
    return true;
  });

  return $article;
};
