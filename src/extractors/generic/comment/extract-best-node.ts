import { Comment } from 'extractors/types';
import { convertToParagraphs } from 'utils/dom';
import {
  COMMENT_CANDIDATES_WHITELIST,
  CONTENT_CANDIDATES_BLACKLIST,
} from 'utils/dom/constants';
import { normalizeSpaces } from 'utils/text';
import { ExtractorOptions } from '../content/types';

const stripUnlikelyCandidates = ($: cheerio.Root) => {
  $('*')
    .not('a')
    .each((index, node) => {
      const $node = $(node);
      const classes = $node.attr('class');
      const id = $node.attr('id');
      if (!id && !classes) {
        return;
      }

      const classAndId = `${classes || ''} ${id || ''}`;
      if (COMMENT_CANDIDATES_WHITELIST.test(classAndId)) {
        return;
      }
      if (CONTENT_CANDIDATES_BLACKLIST.test(classAndId)) {
        $node.remove();
      }
    });

  return $;
};

const cleanAndReturnNode = (node: cheerio.Cheerio, $: cheerio.Root) => {
  if (!node) {
    return undefined;
  }

  return normalizeSpaces($.html(node));
};

const nodeIsSufficient = ($node: cheerio.Cheerio) =>
  $node.text().trim().length > 1;

const findComments = ($: cheerio.Root) => {
  const commentCandidates: cheerio.Cheerio[] = [];

  $('*')
    .not('a')
    .each((index, node) => {
      const $node = $(node);
      const classes = $node.attr('class');
      const id = $node.attr('id');
      if (!id && !classes) {
        return;
      }

      const classAndId = `${classes || ''} ${id || ''}`;
      if (
        COMMENT_CANDIDATES_WHITELIST.test(classAndId) &&
        nodeIsSufficient($node)
      ) {
        commentCandidates.push($node);
      }
    });

  console.log(commentCandidates.map(node => cleanAndReturnNode(node, $)));
};

export const extractBestNodes = (
  $: cheerio.Root,
  opts: ExtractorOptions
): Comment[] | undefined => {
  if (opts.stripUnlikelyCandidates) {
    // $ = stripUnlikelyCandidates($);
  }

  // $ = convertToParagraphs($);

  // findComments($);
  // Reddit comments
  const getComment = (_index: number, node: cheerio.Element): Comment => {
    const author = $('.author', node).first().text();
    const score = $('.score.unvoted', node).first().text();
    const text = $('.usertext-body', node).first().text();

    return {
      author,
      score,
      text: normalizeSpaces(text),
      children: $('> .child > div > .comment', node).map(getComment).get(),
    };
  };

  try {
    const comments = $('.commentarea > div > .comment').map(getComment).get();

    return comments.length > 0 ? comments : undefined;
  } catch {
    return undefined;
  }
};
