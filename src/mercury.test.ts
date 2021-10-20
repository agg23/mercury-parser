import assert from 'assert';

import { record } from 'test-helpers';
import { parse, addExtractor } from './mercury';
import { ErrorResult, Result } from './types';

const fs = require('fs');

describe('Mercury', () => {
  const recorder = record('mercury-test');
  beforeAll(recorder.before);
  afterAll(recorder.after);

  describe('parse(url)', () => {
    it('returns an error if a malformed url is passed', async () => {
      const error = (await parse('foo.com')) as ErrorResult;

      assert.equal(error.type, 'error');
      assert(/does not look like a valid URL/i.test(error.message));
    });

    it('does the whole thing', async () => {
      const result = (await parse(
        'http://deadspin.com/remember-when-donald-trump-got-booed-for-butchering-ta-1788216229'
      )) as Result;

      assert.equal(result.type, 'full');
      assert.equal(result.content.indexOf('score="') === -1, true);
    });

    it('returns an error on non-200 responses', async () => {
      const error = (await parse(
        'https://www.thekitchn.com/instant-pot-chicken-pesto-pasta-eating-instantly-267141'
      )) as ErrorResult;

      assert.equal(error.type, 'error');
      assert(/instructed to reject non-200/i.test(error.message));
    });

    it('returns an error on invalid content types', async () => {
      const error = (await parse(
        'https://upload.wikimedia.org/wikipedia/commons/5/52/Spacer.gif'
      )) as ErrorResult;

      assert.equal(error.type, 'error');
      assert(/content-type for this resource/i.test(error.message));
    });

    it('does wikipedia', async () => {
      const result = await parse(
        'https://en.wikipedia.org/wiki/Brihadeeswarar_Temple_fire'
      );

      assert.equal(result.type, 'full');
    });

    it('does washingtonpost', async () => {
      const result = (await parse(
        'https://www.washingtonpost.com/news/opinions/wp/2018/10/29/enough-platitudes-lets-name-names/'
      )) as Result;

      assert.equal(result.type, 'full');
      assert.equal(result.total_pages, 1);
      assert.equal(
        result.url,
        'https://www.washingtonpost.com/news/opinions/wp/2018/10/29/enough-platitudes-lets-name-names/'
      );
    }, 10000);

    it('does the nyt', async () => {
      const result = (await parse(
        'http://www.nytimes.com/2016/08/16/upshot/the-state-of-the-clinton-trump-race-is-it-over.html?_r=0'
      )) as Result;

      assert.equal(result.type, 'full');
      assert.equal(result.total_pages, 1);
    });

    it('does ars pagination', async () => {
      const url =
        'https://arstechnica.com/gadgets/2016/08/the-connected-renter-how-to-make-your-apartment-smarter/';
      const result = (await parse(url, { fetchAllPages: true })) as Result;

      const { total_pages, pages_rendered, next_page_url } = result;

      assert.equal(total_pages, 3);
      assert.equal(pages_rendered, 3);

      assert.equal(next_page_url, `${url}2`);
    }, 10000);
  });

  it('returns text content if text is passed as contentType', async () => {
    const url =
      'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html';
    const html = fs.readFileSync(
      './src/extractors/custom/nymag.com/fixtures/test.html',
      'utf8'
    );
    const { content } = (await parse(url, {
      html,
      contentType: 'text',
    })) as Result;

    const htmlRe = /<[a-z][\s\S]*>/g;

    assert.ok(content);
    assert.equal(htmlRe.test(content!), false);
  });

  it('returns markdown if markdown is passed as contentType', async () => {
    const url =
      'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html';
    const html = fs.readFileSync(
      './src/extractors/custom/nymag.com/fixtures/test.html',
      'utf8'
    );
    const { content } = (await parse(url, {
      html,
      contentType: 'markdown',
    })) as Result;

    const htmlRe = /<[a-z][\s\S]*>/;
    const markdownRe = /\[[\w\s]+\]\(.*\)/;

    assert.ok(content);
    assert.equal(htmlRe.test(content!), false);
    assert.equal(markdownRe.test(content!), true);
  });

  it('returns custom elements if an extend object is passed', async () => {
    const url =
      'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html';
    const html = fs.readFileSync(
      './src/extractors/custom/nymag.com/fixtures/test.html',
      'utf8'
    );
    const { sites } = (await parse(url, {
      html,
      extend: {
        sites: {
          selectors: ['a.site-name'],
          allowMultiple: true,
        },
      },
    })) as Result & {
      sites: string[];
    };
    assert.ok(sites);
    assert.equal(sites.length, 8);
    assert.equal(sites[0], 'NYMag.com');
  });

  it('returns an array if a single element matches a custom extend', async () => {
    const url =
      'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html';
    const html = fs.readFileSync(
      './src/extractors/custom/nymag.com/fixtures/test.html',
      'utf8'
    );
    const { sites } = (await parse(url, {
      html,
      extend: {
        sites: {
          selectors: [['li:first-child a.site-name', 'href']],
          allowMultiple: true,
        },
      },
    })) as Result & {
      sites: string[];
    };
    assert.ok(sites);
    assert.equal(sites.length, 1);
  });

  it('returns custom attributes if an extend object is passed', async () => {
    const url =
      'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html';
    const html = fs.readFileSync(
      './src/extractors/custom/nymag.com/fixtures/test.html',
      'utf8'
    );
    const { sites } = (await parse(url, {
      html,
      extend: {
        sites: {
          selectors: [['a.site-name', 'href']],
          allowMultiple: true,
        },
      },
    })) as Result & {
      sites: string[];
    };
    assert.ok(sites);
    assert.equal(sites.length, 8);
    assert.equal(sites[1], 'http://nymag.com/daily/intelligencer/');
  });

  it('is able to use custom extractors (with extension) added via api', async () => {
    const url =
      'https://www.sandiegouniontribune.com/business/growth-development/story/2019-08-27/sdsu-mission-valley-stadium-management-firm';
    const html = fs.readFileSync(
      './fixtures/sandiegouniontribune.com/test.html',
      'utf8'
    );

    const customExtractor = {
      domain: 'www.sandiegouniontribune.com',
      title: {
        selectors: ['h1', '.ArticlePage-headline'],
      },
      author: {
        selectors: ['.ArticlePage-authorInfo-bio-name'],
      },
      content: {
        selectors: ['article'],
      },
      extend: {
        testContent: {
          selectors: ['.ArticlePage-breadcrumbs a'],
        },
      },
    };

    addExtractor(customExtractor);

    const result = (await parse(url, { html })) as Result & {
      author: string;
      testContent: string;
    };
    assert.equal(result.type, 'full');
    assert.equal(result.author, 'Jennifer Van Grove');
    assert.equal(result.domain, 'www.sandiegouniontribune.com');
    assert.equal(result.total_pages, 1);
    assert.equal(result.testContent, 'Growth & Development');
  });
});
