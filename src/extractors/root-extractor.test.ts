import assert from 'assert';
import cheerio from 'cheerio';

import { assertClean } from 'test-helpers';
import { RootExtractor } from './root-extractor';

import { NYMagExtractor } from './custom/nymag.com';
import { cleanBySelectors, transformElements } from './select';
import { CustomExtractor } from './types';

const fs = require('fs');

describe('RootExtractor', () => {
  it('only returns what the custom parser gives it if fallback is disabled', () => {
    const fullUrl =
      'http://nymag.com/daily/intelligencer/2016/09/trump-discussed-usd25k-donation-with-florida-ag-not-fraud.html';
    const html = fs.readFileSync(
      './src/extractors/custom/nymag.com/fixtures/test.html',
      'utf8'
    );
    const $ = cheerio.load(html);

    const { url } = RootExtractor.extract(NYMagExtractor as CustomExtractor, {
      url: fullUrl,
      html,
      $,
      metaCache: [],
      fallback: false,
    });

    assert.equal(url, null);
  });
});

describe('cleanBySelectors($content, $, { clean })', () => {
  it('removes provided selectors from the content', () => {
    const opts = { clean: ['.ad', '.share'] };
    const html = `
      <div>
        <div class="body">
          <div class="share">Share this on twitter plz</div>
          <p>This is some good content</p>
          <div class="ad">Advertisement!</div>
        </div>
    </div>`;
    const $ = cheerio.load(html);

    let $content = $('.body');
    $content = cleanBySelectors($content, $, opts);

    assert.equal($content.find('.ad').length, 0);
    assert.equal($content.find('.share').length, 0);
  });
});

describe('transformElements($content, $, { transforms })', () => {
  it('performs a simple transformation on matched elements', () => {
    const html = `
    <div>
      <div class="body">
        <h1>WOW BIG TITLE</h1>
        <p>Here are some words</p>
        <h1>WOW BIG TITLE</h1>
      </div>
    </div>
    `;
    const opts = {
      transforms: { h1: 'h2' },
    };
    const $ = cheerio.load(html);
    let $content = $('.body');

    const after = `
      <div class="body">
        <h2>WOW BIG TITLE</h2>
        <p>Here are some words</p>
        <h2>WOW BIG TITLE</h2>
      </div>
    `;

    $content = transformElements($content, $, opts);
    assertClean($.html($content), after);
  });

  it('performs a complex transformation on matched elements', () => {
    const html = `
    <div>
      <div class="body">
        <noscript>
          <img src="/img.jpg" />
        </noscript>
        <noscript>
          Something else
        </noscript>
        <p>Here are some words</p>
      </div>
    </div>
    `;
    const opts = {
      transforms: {
        noscript: ($node: cheerio.Cheerio, $: cheerio.Root) => {
          const $children = $($node.text().trim());
          if (
            $children.length === 1 &&
            $children.get(0) !== undefined &&
            $children.get(0).tagName.toLowerCase() === 'img'
          ) {
            return 'figure';
          }

          return null;
        },
      },
    };
    const $ = cheerio.load(html);
    let $content = $('.body');

    const after = `
      <div class="body">
        <figure>
          <img src="/img.jpg">
        </figure>
        <noscript>
          Something else
        </noscript>
        <p>Here are some words</p>
      </div>
    `;

    $content = transformElements($content, $, opts);
    assertClean($.html($content), after);
  });
});
