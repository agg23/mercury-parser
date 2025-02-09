import assert from 'assert';
import cheerio from 'cheerio';

import { normalizeMetaTags } from './normalize-meta-tags';

describe('normalizeMetaTags($)', () => {
  it('replaces "content" attributes with "value"', () => {
    const html = '<html><meta name="foo" content="bar"></html>';
    const test =
      '<html><head><meta name="foo" value="bar"></head><body></body></html>';

    // browser cheerio/jquery will remove/replace html, so result
    // is different
    const testBrowser = '<meta name="foo" value="bar">';

    const $ = cheerio.load(html);

    const result = normalizeMetaTags($).html();

    assert.equal(result, cheerio.browser ? testBrowser : test);
  });

  it('replaces "property" attributes with "name"', () => {
    const html = '<html><meta property="foo" value="bar"></html>';
    const test =
      '<html><head><meta value="bar" name="foo"></head><body></body></html>';
    const testBrowser = '<meta value="bar" name="foo">';

    const $ = cheerio.load(html);

    const result = normalizeMetaTags($).html();

    assert.equal(result, cheerio.browser ? testBrowser : test);
  });
});
