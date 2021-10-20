import assert from 'assert';
import cheerio from 'cheerio';

import { stripCheerioWrapper } from 'test-helpers';
import { clean } from './clean';

describe('clean($)', () => {
  it('removes script elements', () => {
    const html = "<div><script>alert('hi')</script></div>";
    const $ = cheerio.load(html);

    assert.equal(stripCheerioWrapper(clean($)), '<div></div>');
  });

  it('removes style elements', () => {
    const html = '<div><style>foo: {color: red;}</style></div>';
    const $ = cheerio.load(html);

    assert.equal(stripCheerioWrapper(clean($)), '<div></div>');
  });

  it('removes comments', () => {
    const html = '<div>HI <!-- This is a comment --></div>';
    const $ = cheerio.load(html);

    assert.equal(stripCheerioWrapper(clean($)), '<div>HI </div>');
  });
});
