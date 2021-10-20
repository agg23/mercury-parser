import cheerio from 'cheerio';

import { assertClean, stripCheerioWrapper } from 'test-helpers';

import HTML from './fixtures/html';
import { removeEmpty } from './index';

describe('removeEmpty($)', () => {
  it('removes empty P tags', () => {
    const $ = cheerio.load(HTML.removeEmptyP.before);

    const result = stripCheerioWrapper(removeEmpty($('*').first(), $));
    assertClean(result, HTML.removeEmptyP.after);
  });

  it('removes P tags with only space', () => {
    const html = '<div><p>  </p></div>';
    const $ = cheerio.load(html);

    const result = stripCheerioWrapper(removeEmpty($('*').first(), $));
    assertClean(result, '<div></div>');
  });

  it('does not remove empty DIV tags', () => {
    const $ = cheerio.load(HTML.removeEmptyP.before);

    const result = stripCheerioWrapper(removeEmpty($('*').first(), $));
    assertClean(result, HTML.removeEmptyP.after);
  });

  it('does not remove empty p tags containing an iframe', () => {
    const html = '<div><p><span><iframe src="foo"></iframe></span></p></div>';
    const $ = cheerio.load(html);

    const result = stripCheerioWrapper(removeEmpty($('*').first(), $));
    assertClean(result, html);
  });
});
