import assert from 'assert';
import cheerio from 'cheerio';
import { assertClean } from 'test-helpers';
import { select } from './select';
import { migrateSelections } from './select-migration';
import { SelectionSuccessResult, Selection } from './types';

describe('migration', () => {
  describe('Array selector', () => {
    it('extractHtml', () => {
      const selection = migrateSelections([['.foo', '.foo2']], false, true);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'multiGrouped',
          selector: {
            type: 'matchAll',
            selectors: ['.foo', '.foo2'],
          },
        },
      ]);
    });

    it('single', () => {
      const selection = migrateSelections([['.foo']]);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'first',
          selector: '.foo',
        },
      ]);
    });

    it('single + allowMultiple', () => {
      const selection = migrateSelections([['.foo']], true);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'multiArray',
          selector: '.foo',
        },
      ]);
    });

    it('attr', () => {
      const selection = migrateSelections([['.foo', 'title']]);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'exactlyOne',
          selector: {
            type: 'matchAttr',
            attr: 'title',
            selector: '.foo',
            transform: undefined,
          },
        },
      ]);
    });

    it('attr + allowMultiple', () => {
      const selection = migrateSelections([['.foo', 'title']], true);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'multiArray',
          selector: {
            type: 'matchAttr',
            attr: 'title',
            selector: '.foo',
            transform: undefined,
          },
        },
      ]);
    });

    it('attr + transform', () => {
      const func = (input: string) => `${input}foo`;

      const selection = migrateSelections([['.foo', 'title', func]]);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'exactlyOne',
          selector: {
            type: 'matchAttr',
            attr: 'title',
            selector: '.foo',
            transform: func,
          },
        },
      ]);
    });
  });

  describe('String selector', () => {
    it('single', () => {
      const selection = migrateSelections(['.foo']);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'exactlyOne',
          selector: '.foo',
          returnHtml: undefined,
        },
      ]);
    });

    it('allowMultiple', () => {
      const selection = migrateSelections(['.foo'], true);

      assert.deepStrictEqual<Selection[]>(selection, [
        {
          type: 'multiArray',
          selector: '.foo',
          returnHtml: undefined,
        },
      ]);
    });
  });
});

describe('select(opts)', () => {
  it("returns a node's text with a simple selector", () => {
    const html = `
      <div><div class="author">Bob</div></div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'author' as const,
      $,
      extractionOpts: {
        selectors: ['.author'],
      },
      html,
      url: '',
    };

    const result = select(opts) as SelectionSuccessResult;
    assert.equal(result.content, 'Bob');
  });

  it("returns a node's attr with an attr selector", () => {
    const html = `
      <div>
        <time datetime="2016-09-07T05:07:59-04:00">
          September 7, 2016
        </time>
      </div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'date_published' as const,
      $,
      extractionOpts: {
        selectors: [['time', 'datetime']] as [[string, string]],
      },
      html,
      url: '',
    };

    const result = select(opts) as SelectionSuccessResult;
    assert.equal(result.content, '2016-09-07T09:07:59.000Z');
  });

  it("returns a node's transformed attr with an attr + transform selector", () => {
    const html = `
      <div>
        <time datetime="2016-09-07T05:07:59-04:00">
          September 7, 2016
        </time>
      </div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      // Different type to prevent trimming
      type: 'title' as const,
      $,
      extractionOpts: {
        selectors: [
          ['time', 'datetime', (value: string) => `${value} transformed`],
        ] as [[string, string, (value: string) => string]],
      },
      html,
      url: '',
    };

    const result = select(opts) as SelectionSuccessResult;
    assert.equal(result.content, '2016-09-07T05:07:59-04:00 transformed');
  });

  it("returns a node's html when it is a content selector", () => {
    const html = `
      <div><div class="content-is-here"><p>Wow what a piece of content</p></div></div>
    `;
    const output = `<p>Wow what a piece of content</p>`;
    const $ = cheerio.load(html);
    const opts = {
      type: 'content' as const,
      $,
      extractionOpts: {
        selectors: ['.content-is-here'],
      },
      extractHtml: true,
      html,
      url: '',
    };

    const result = select(opts) as SelectionSuccessResult;
    assertClean(result.content, output);
  });

  it('handles multiple matches when the content selector is an array', () => {
    const html = `
      <div><div><img class="lead-image" src="#" /><div class="content-is-here"><p>Wow what a piece of content</p></div></div></div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'content' as const,
      url: 'http://foo.com',
      $,
      extractionOpts: {
        selectors: [['.lead-image', '.content-is-here']] as [[string, string]],
      },
      extractHtml: true,
      html,
    };

    const result = select(opts) as SelectionSuccessResult;
    assert.equal($(result.content).find('img.lead-image').length, 1);
    assert.equal($(result.content).find('.content-is-here').length, 1);
  });

  it('skips multi-match if not all selectors are present', () => {
    const html = `
      <div><div><img class="lead-image" src="#" /><div class="content-is-here"><p>Wow what a piece of content</p></div></div></div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'content' as const,
      $,
      extractionOpts: {
        selectors: [['.lead-image', '.content-is-here', '.foo']] as [
          [string, string, string]
        ],
      },
      extractHtml: true,
      html,
      url: '',
    };

    const result = select(opts) as SelectionSuccessResult;

    assert.ok(!result.content);
  });

  it('returns an array of results if allowMultiple is true', () => {
    const html = `
      <div><div><ul><li class="item">One</li><li class="item">Two</li></ul></div></div>
      `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'title' as const,
      $,
      extractionOpts: {
        selectors: ['.item'],
        allowMultiple: true,
      },
      extractHtml: true,
      html,
      url: '',
    };

    const result = select(opts) as SelectionSuccessResult;

    assert.equal(result.content?.length, 2);
    assert.deepEqual(result.content, [
      '<li class="item">One</li>',
      '<li class="item">Two</li>',
    ]);
  });

  it('makes links absolute in extended types when extracting HTML', () => {
    const html = `
      <div><p><a class="linky" href="/foo">Bar</a></p></div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'title' as const,
      $,
      url: 'http://example.com',
      extractionOpts: {
        selectors: ['.linky'],
      },
      extractHtml: true,
      html,
    };

    const result = select(opts) as SelectionSuccessResult;

    assert.equal(
      result.content,
      '<a class="linky" href="http://example.com/foo">Bar</a>'
    );
  });

  it('makes links absolute in extended types when extracting attrs', () => {
    const html = `
      <div><p><a class="linky" href="/foo">Bar</a><a class="linky" href="/bar">Baz</a></p></div>
    `;
    const $ = cheerio.load(html);
    const opts = {
      type: 'title' as const,
      $,
      url: 'http://example.com',
      extractionOpts: {
        selectors: [['.linky', 'href']] as [[string, string]],
        allowMultiple: true,
      },
      defaultCleaner: false,
      html,
    };

    const result = select(opts) as SelectionSuccessResult;

    assert.deepEqual(result.content, [
      'http://example.com/foo',
      'http://example.com/bar',
    ]);
  });
});
