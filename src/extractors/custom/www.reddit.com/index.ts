import { CustomExtractor } from 'extractors/types';

export const WwwRedditComExtractor: CustomExtractor = {
  domain: 'www.reddit.com',
  supportedDomains: ['old.reddit.com'],

  title: {
    selectors: [
      {
        type: 'exactlyOne',
        selector: 'div[data-test-id="post-content"] h2',
      },
    ],
  },

  author: {
    selectors: [
      {
        type: 'first',
        selector: 'div[data-test-id="post-content"] a[href*="user/"]',
      },
    ],
  },

  date_published: {
    selectors: [
      {
        type: 'exactlyOne',
        selector:
          'div[data-test-id="post-content"] a[data-click-id="timestamp"]',
      },
    ],
  },

  lead_image_url: {
    selectors: [
      {
        type: 'first',
        selector: {
          type: 'matchAttr',
          selector: 'meta[name="og:image"]',
          attr: 'value',
        },
      },
    ],
  },

  content: {
    selectors: [
      {
        type: 'multiGrouped',
        selector: 'div[data-test-id="post-content"] p', // text post
      },
      {
        type: 'multiGrouped',
        selector: {
          type: 'matchAll',
          selectors: [
            'div[data-test-id="post-content"] a[target="_blank"]:not([data-click-id="timestamp"])', // external link
            'div[data-test-id="post-content"] div[data-click-id="media"]', // embedded media
          ],
        },
      },
      {
        type: 'multiGrouped',
        selector: 'div[data-test-id="post-content"] div[data-click-id="media"]', // Embedded media (Reddit video)
      },
      {
        type: 'multiGrouped',
        selector:
          'div[data-test-id="post-content"] a[target="_blank"]:not([data-click-id="timestamp"])', // external link
      },
      {
        type: 'multiGrouped',
        selector: 'div[data-test-id="post-content"]',
      },
    ],

    // Is there anything in the content you selected that needs transformed
    // before it's consumable content? E.g., unusual lazy loaded images
    transforms: {
      'div[role="img"]': $node => {
        // External link image preview
        const $img = $node.find('img');
        const bgImg = $node.css('background-image');
        if ($img.length === 1 && bgImg) {
          $img.attr(
            'src',
            bgImg.match(/\((.*?)\)/)?.[1].replace(/('|")/g, '') ?? ''
          );
          return $img;
        }
        return $node;
      },
    },

    // Is there anything that is in the result that shouldn't be?
    // The clean selectors will remove anything that matches from
    // the result
    clean: ['.icon'],
  },

  comment: {
    topLevel: {
      selectors: [
        {
          type: 'multiArray',
          selector: '.commentarea > div > .comment',
        },
      ],
    },
    childLevel: {
      selectors: [
        {
          type: 'multiArray',
          selector: '> .child > div > .comment',
        },
      ],
    },
    author: {
      selectors: [
        {
          type: 'first',
          selector: '.author',
          returnHtml: true,
        },
      ],
    },
    score: {
      selectors: [
        {
          type: 'first',
          selector: '.score',
        },
      ],
    },
    date: {
      selectors: [
        {
          type: 'first',
          selector: {
            type: 'matchAttr',
            selector: 'time',
            attr: 'datetime',
          },
        },
      ],
    },
    text: {
      selectors: [
        {
          type: 'first',
          selector: '.usertext-body',
          returnHtml: true,
        },
      ],
    },
  },
};
