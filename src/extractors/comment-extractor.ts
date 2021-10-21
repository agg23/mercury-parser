import cheerio from 'cheerio';
import { stripNewlines } from 'utils/dom';
import { normalizeSpaces } from 'utils/text';
import { GenericExtractor } from './generic';
import { chooseSelection, selectConcatinating } from './select';
import { migrateSelections } from './select-migration';

import {
  CommentExtractorOptions,
  ExtractResultOptions,
  SelectedExtractOptions,
  Comment,
  ConcatenatedSelectionResult,
  ChildLevelCommentExtractorOptions,
} from './types';

const selectionResultString = (
  result: ConcatenatedSelectionResult
): string | undefined =>
  result.type === 'content' && result.content
    ? stripNewlines(normalizeSpaces(result.content))
    : undefined;

const selectNestedComments = (
  opts: Omit<SelectedExtractOptions<CommentExtractorOptions>, 'type'>
): Comment[] | undefined => {
  const { html, extractionOpts } = opts;
  // Skip if there's not extraction for this type
  if (!extractionOpts) {
    return undefined;
  }

  const { selectors } = extractionOpts.topLevel;
  const $ = cheerio.load(html);

  const matchedSelection = chooseSelection($, migrateSelections(selectors));

  if (!matchedSelection) {
    return undefined;
  }

  const comments: Comment[] = [];

  // Always extractHtml
  const getComment = (
    node: cheerio.Element
  ): { comment: Comment; append: boolean } | undefined => {
    const nodeTransformer = extractionOpts.childLevel?.nodeTransform;

    if (nodeTransformer) {
      nodeTransformer($, node, comments);
    }

    const $node = $(node);

    const text = selectConcatinating(
      {
        ...opts,
        type: 'content',
        extractionOpts: extractionOpts.text,
      },
      $node
    );

    if (!text) {
      return undefined;
    }

    const author = selectConcatinating(
      {
        ...opts,
        // TODO: Add proper type for cleaning
        type: 'comment',
        extractionOpts: extractionOpts.author,
      },
      $node
    );

    const score = selectConcatinating(
      {
        ...opts,
        // TODO: Add proper type for cleaning
        type: 'comment',
        extractionOpts: extractionOpts.score,
      },
      $node
    );

    const comment: Comment = {
      author: selectionResultString(author),
      score: selectionResultString(score),
      text: selectionResultString(text) ?? '',
    };

    const insertTransformer = extractionOpts.childLevel?.insertTransform;

    if (insertTransformer) {
      insertTransformer($, node, comment, comments);
    }

    return {
      comment,
      append: !insertTransformer,
    };
  };

  const createCommentBuilder =
    (
      commentGroup: Comment[],
      childExtractionOpts: ChildLevelCommentExtractorOptions | undefined
    ) =>
    (element: cheerio.Element) => {
      const commentWrapper = getComment(element);

      if (!commentWrapper) {
        return;
      }

      const { comment: newComment, append } = commentWrapper;

      if (append) {
        commentGroup.push(newComment);
      }

      // Process children
      if (childExtractionOpts) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        processCommentChildren(element, newComment, childExtractionOpts);
      }
    };

  const processCommentChildren = (
    node: cheerio.Element,
    comment: Comment,
    childExtractionOpts: ChildLevelCommentExtractorOptions
  ) => {
    const childMatchedSelection = chooseSelection(
      $,
      migrateSelections(childExtractionOpts?.selectors),
      $(node)
    );

    if (!childMatchedSelection) {
      return;
    }

    const commentBuilder = createCommentBuilder(
      (comment.children ??= []),
      childExtractionOpts
    );

    const { matches: childMatches } = childMatchedSelection;

    childMatches.each((_, element) => commentBuilder(element));
  };

  const commentBuilder = createCommentBuilder(
    comments,
    extractionOpts.childLevel
  );

  const { matches: $content } = matchedSelection;
  $content.each((_, element) => commentBuilder(element));

  // TODO: Run cleaners?
  return comments;
};

export const extractCommentResult = (
  opts: Omit<ExtractResultOptions<'comment'>, 'type'>
): ReturnType<typeof GenericExtractor['comment']> => {
  const { extractor } = opts;

  const commentOptions = extractor.comment;

  if (!commentOptions) {
    // TODO: Fallback to generic extractor?
    return undefined;
  }

  const result = selectNestedComments({
    ...opts,
    extractionOpts: commentOptions,
  });

  return result;
};
