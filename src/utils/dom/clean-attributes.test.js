import cheerio from 'cheerio';

import { assertClean, stripCheerioWrapper } from 'test-helpers';

import HTML from './fixtures/html';
import { cleanAttributes } from './index';

describe('cleanAttributes($)', () => {
  it('removes style attributes from nodes', () => {
    const $ = cheerio.load(HTML.removeStyle.before);

    const result = stripCheerioWrapper($, cleanAttributes($('*').first(), $));
    assertClean(result, HTML.removeStyle.after);
  });

  it('removes align attributes from nodes', () => {
    const $ = cheerio.load(HTML.removeAlign.before);

    const result = stripCheerioWrapper($, cleanAttributes($('*').first(), $));
    assertClean(result, HTML.removeAlign.after);
  });
});
