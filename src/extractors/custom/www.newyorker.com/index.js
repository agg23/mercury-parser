// Rename CustomExtractor
// to fit your publication
// (e.g., NYTimesExtractor)
export const NewYorkerExtractor = {
  domain: 'www.newyorker.com',
  title: {
    selectors: [
      'h1[class^="ArticleHeader__hed"]',
      ['meta[name="og:title"]', 'value'],
    ],
  },

  author: {
    selectors: [
      [
        'article header div[class*="Byline__multipleContributors"] a[rel="author"]',
      ],
      ['div[class^="ArticleContributors"] a[rel="author"]'],
    ],
  },

  content: {
    selectors: ['main[class^="Layout__content"]'],

    // Is there anything in the content you selected that needs transformed
    // before it's consumable content? E.g., unusual lazy loaded images
    transforms: [],

    // Is there anything that is in the result that shouldn't be?
    // The clean selectors will remove anything that matches from
    // the result
    clean: ['footer[class^="ArticleFooter__footer"]'],
  },

  date_published: {
    selectors: [['meta[name="pubdate"]', 'value']],
    format: 'YYYYMMDD',
    timezone: 'America/New_York',
  },

  lead_image_url: {
    selectors: [['meta[name="og:image"]', 'value']],
  },

  dek: {
    selectors: ['h2[class^="ArticleHeader__dek"]'],
  },

  next_page_url: null,

  excerpt: null,
};
