import assert from 'assert';
import URL from 'url';
import cheerio from 'cheerio';

import { parse } from 'mercury';
import { getExtractor } from 'extractors/get-extractor';
import { excerptDomContent } from 'utils/text';

const fs = require('fs');

describe('Hacker News Extractor', () => {
  describe('initial test case', () => {
    let result;
    let url;
    beforeAll(() => {
      url = 'https://news.ycombinator.com/item?id=28838530';
      const html = fs.readFileSync(
        './fixtures/news.ycombinator.com/1634237148182.html'
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

    it('returns the type', async () => {
      // To pass this test, fill out the type selector
      // in ./src/extractors/custom/news.ycombinator.com/index.js.
      const { type } = await result;

      // Update these values with the expected values from
      // the article.
      assert.equal(type, `full`);
    });

    it('returns the title', async () => {
      const { title } = await result;

      assert.equal(
        title,
        `Ask HN: Ever lost your love for coding? How did you get it back?`
      );
    });

    it('returns the comments', async () => {
      const { comments } = await result;

      assert.equal(comments.length, 42);

      const firstComment = comments[0];

      assert.equal(
        firstComment.author,
        '<a href="https://news.ycombinator.com/user?id=mouzogu" class="hnuser">mouzogu</a>'
      );

      assert.equal(firstComment.date, '2021-10-12T19:49:26.000Z');

      const $ = cheerio.load(`<div>${firstComment.text}</div>`);
      const first11 = excerptDomContent($, 11);
      assert.equal(
        first11,
        'I was thinking the same scrolling HN, then saw your post.'
      );

      assert.equal(
        firstComment.text,
        `<span class="commtext c00">I was thinking the same scrolling HN, then saw your post.<p>After 15 years I'm no longer interested. I don't care about the web, css, javascript, react, testing....it's just an increasingly tedious and difficult headache to me.</p><p>I have a creative urge, and a problem solving urge, but i feel maybe it can be better expressed through another medium. I just wish I had some way to unchain myself from this 9-6 5 days a week soul-less grind.</p><p>Even when I did enjoy my job before, the increasingly complexity, the amount of tedious plumbing, spending hours fixing obscure npm bugs on a tool I built only 3 months ago (and worked perfectly). I just hate it all.</p><p>To answer your question, i haven't gotten it back and don't think i ever will.</p></span>`
      );

      assert.equal(firstComment.children.length, 6);
      assert.equal(
        firstComment.children[0].author,
        '<a href="https://news.ycombinator.com/user?id=ChicagoBoy11" class="hnuser">ChicagoBoy11</a>'
      );
      assert.equal(firstComment.children[0].date, '2021-10-12T19:56:15.000Z');
      assert.equal(
        firstComment.children[0].children[0].author,
        '<a href="https://news.ycombinator.com/user?id=billylo" class="hnuser">billylo</a>'
      );
      assert.equal(
        firstComment.children[0].children[0].date,
        '2021-10-12T20:09:42.000Z'
      );
    });

    it('returns the author', async () => {
      const { author } = await result;

      assert.equal(author, 'rlawson');
    });

    it('returns the date_published', async () => {
      const { date_published } = await result;

      assert.equal(date_published, '2021-10-12T18:38:54.000Z');
    });

    it('returns the lead_image_url', async () => {
      const { lead_image_url } = await result;

      assert.equal(lead_image_url, undefined);
    });

    it('returns the dek', async () => {
      const { dek } = await result;

      assert.equal(dek, undefined);
    });

    it('returns the content', async () => {
      const { content } = await result;

      const $ = cheerio.load(`<div>${content}</div>`);

      const first13 = excerptDomContent($, 13);

      assert.equal(
        first13,
        'Have you ever lost the love for coding? I sure did after a'
      );
    });
  });
});
