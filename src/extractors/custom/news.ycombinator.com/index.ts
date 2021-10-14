import { Comment } from 'extractors/types';

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

export const NewsYcombinatorComExtractor = {
  domain: 'news.ycombinator.com',

  title: {
    selectors: [['#pagespace', 'title']],
  },

  author: {
    selectors: ['.fatitem .hnuser'],
  },

  date_published: {
    selectors: [['.fatitem .age', 'title']],
  },

  dek: {
    selectors: [],
  },

  lead_image_url: {
    selectors: [],
  },

  content: {
    selectors: [['.fatitem tr:nth-of-type(4) td:nth-of-type(2)']],

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
      selectors: [['.comment-tree .comtr tr']],
    },
    childLevel: {
      // selectors: [['.ind', 'indent']],
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
      selectors: [['.hnuser']],
    },
    date: {
      selectors: [['.age', 'title']],
    },
    text: {
      selectors: [['.comment .commtext']],
      clean: ['.reply'],
    },
  },
};
