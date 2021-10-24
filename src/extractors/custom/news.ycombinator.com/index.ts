import { Comment, CustomExtractor } from 'extractors/types';

const findCommentParent = (comments: Comment[], indentLevel: number) => {
  const stack: Array<{ comment: Comment; depth: number }> = comments.map(
    comment => ({ comment, depth: 0 })
  );

  while (stack.length > 0) {
    const { comment, depth } = stack.pop()!;

    if (depth === indentLevel - 1) {
      return comment;
    }

    if (comment.children) {
      stack.push(
        ...comment.children.map(c => ({ comment: c, depth: depth + 1 }))
      );
    }
  }

  return undefined;
};

export const NewsYcombinatorComExtractor: CustomExtractor = {
  domain: 'news.ycombinator.com',

  title: {
    selectors: [
      {
        type: 'exactlyOne',
        selector: {
          type: 'matchAttr',
          selector: '#pagespace',
          attr: 'title',
        },
      },
    ],
  },

  author: {
    selectors: [{ type: 'exactlyOne', selector: '.fatitem .hnuser' }],
  },

  date_published: {
    selectors: [
      {
        type: 'exactlyOne',
        selector: {
          type: 'matchAttr',
          selector: '.fatitem .age',
          attr: 'title',
        },
      },
    ],
  },

  content: {
    selectors: [
      {
        type: 'exactlyOne',
        selector: '.fatitem tr:nth-of-type(4) td:nth-of-type(2)',
      },
    ],

    // Is there anything in the content you selected that needs transformed
    // before it's consumable content? E.g., unusual lazy loaded images
    transforms: {},

    // Is there anything that is in the result that shouldn't be?
    // The clean selectors will remove anything that matches from
    // the result
    clean: ['.athing', '.subtext'],
  },

  comment: {
    topLevel: {
      selectors: [
        {
          type: 'multiArray',
          selector: '.comment-tree .comtr tr',
        },
      ],
    },
    childLevel: {
      insertTransform: (
        $: cheerio.Root,
        node: cheerio.Element,
        newComment: Comment,
        comments: Comment[]
      ) => {
        const indentNode = $('.ind', node).first();
        if (!indentNode) {
          return;
        }

        const indentLevel = parseInt(indentNode.attr('indent') ?? '0', 10);

        if (indentLevel === 0) {
          // Top level comment
          comments.push(newComment);
          return;
        }

        // Not top level comment. Traverse tree to find where it goes
        const parent = findCommentParent(comments, indentLevel);

        if (!parent) {
          console.error(
            'Could not find parent for comment. Appending as a top level comment'
          );
          comments.push(newComment);

          return;
        }

        (parent.children ??= []).push(newComment);
      },
    },
    author: {
      selectors: [
        {
          type: 'multiGrouped',
          selector: '.hnuser',
        },
      ],
    },
    date: {
      selectors: [
        {
          type: 'first',
          selector: {
            type: 'matchAttr',
            selector: '.age',
            attr: 'title',
          },
        },
      ],
    },
    text: {
      selectors: [
        {
          type: 'multiGrouped',
          selector: '.comment .commtext',
        },
      ],
      clean: ['.reply'],
    },
  },
};
