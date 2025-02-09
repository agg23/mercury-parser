import assert from 'assert';
import URL from 'url';
import cheerio from 'cheerio';

import { parse } from 'mercury';
import { getExtractor } from 'extractors/get-extractor';
import { excerptDomContent } from 'utils/text';

const fs = require('fs');

describe('WwwOpposingviewsComExtractor', () => {
  describe('initial test case', () => {
    let result;
    let url;
    beforeAll(() => {
      url =
        'http://www.opposingviews.com/i/politics/trump-picks-investing-mogul-icahn-advise-him-finance-regulation';
      const html = fs.readFileSync(
        './fixtures/www.opposingviews.com/1482427531189.html'
      );
      result = parse(url, { html, fallback: false });
    });

    it('is selected properly', () => {
      // This test should be passing by default.
      // It sanity checks that the correct parser
      // is being selected for URLs from this domain
      const extractor = getExtractor(url);
      assert.equal(extractor.domain, URL.parse(url).hostname);
    });

    it('returns the title', async () => {
      // To pass this test, fill out the title selector
      // in ./src/extractors/custom/www.opposingviews.com/index.js.
      const { title } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(
        title,
        'Investor Icahn To Advise Trump On Finances, Regulation'
      );
    });

    it('returns the author', async () => {
      // To pass this test, fill out the author selector
      // in ./src/extractors/custom/www.opposingviews.com/index.js.
      const { author } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(author, 'Lauren Briggs');
    });

    it('returns the date_published', async () => {
      // To pass this test, fill out the date_published selector
      // in ./src/extractors/custom/www.opposingviews.com/index.js.
      const { date_published } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(date_published, '2016-12-21T23:49:10.000Z');
    });

    it('returns the lead_image_url', async () => {
      // To pass this test, fill out the lead_image_url selector
      // in ./src/extractors/custom/www.opposingviews.com/index.js.
      const { lead_image_url } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(
        lead_image_url,
        'http://images.opposingviews.com:8080/ovi/catalog/downloads/preview/rndr_670x377//2016/12/icahn-1482373693.jpg/rndr_670x377.jpg'
      );
    });

    it('returns the content', async () => {
      // To pass this test, fill out the content selector
      // in ./src/extractors/custom/www.opposingviews.com/index.js.
      // You may also want to make use of the clean and transform
      // options.
      const { content } = await result;

      const $ = cheerio.load(content || '');

      const first13 = excerptDomContent($, 13);

      // Update these values with the expected values from
      // the article.
      assert.equal(
        first13,
        "President-elect Donald Trump's transition team announced on Dec. 21 that investor Carl Icahn"
      );
    });
  });
});
