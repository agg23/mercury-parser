import assert from 'assert';
import URL from 'url';
import cheerio from 'cheerio';

import { parse } from 'mercury';
import { getExtractor } from 'extractors/get-extractor';
import { excerptDomContent } from 'utils/text';

const fs = require('fs');

describe('WwwBustleComExtractor', () => {
  describe('initial test case', () => {
    let result;
    let url;
    beforeAll(() => {
      url =
        'https://www.bustle.com/articles/194709-13-ways-to-compliment-women-in-the-most-empowering-transformative-way-possible';
      const html = fs.readFileSync(
        './fixtures/www.bustle.com/1481129185239.html'
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
      // in ./src/extractors/custom/www.bustle.com/index.js.
      const { title } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(
        title,
        '13 Ways To Compliment Women In The Most Empowering, Transformative Way Possible'
      );
    });

    it('returns the author', async () => {
      // To pass this test, fill out the author selector
      // in ./src/extractors/custom/www.bustle.com/index.js.
      const { author } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(author, 'Teresa Newsome');
    });

    it('returns the date_published', async () => {
      // To pass this test, fill out the date_published selector
      // in ./src/extractors/custom/www.bustle.com/index.js.
      const { date_published } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(date_published, '2016-12-02T18:28:24.692Z');
    });

    it('returns the lead_image_url', async () => {
      // To pass this test, fill out the lead_image_url selector
      // in ./src/extractors/custom/www.bustle.com/index.js.
      const { lead_image_url } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(
        lead_image_url,
        'https://typeset-beta.imgix.net/rehost/2016/12/2/2fa248d4-0035-403f-a18d-3aeca6929b98.jpg?w=1200&h=630&fit=crop&crop=faces&auto=format&q=70'
      );
    });

    it('returns the content', async () => {
      // To pass this test, fill out the content selector
      // in ./src/extractors/custom/www.bustle.com/index.js.
      // You may also want to make use of the clean and transform
      // options.
      const { content } = await result;

      const $ = cheerio.load(content || '');

      const first13 = excerptDomContent($, 13);

      // Update these values with the expected values from
      // the article.
      assert.equal(
        first13,
        "When I log into my Facebook these days, I'm pretty much prepared for"
      );
    });
  });
});
