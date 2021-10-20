import cheerio from 'cheerio';

import { assertClean, stripCheerioWrapper } from 'test-helpers';

import HTML from './fixtures/html';
import { cleanHOnes } from './index';

describe('cleanHOnes($)', () => {
  it('removes H1s if there are less than 3 of them', () => {
    const $ = cheerio.load(HTML.removeTwoHOnes.before);

    const result = stripCheerioWrapper(cleanHOnes($('*').first(), $));
    assertClean(result, HTML.removeTwoHOnes.after);
  });

  it('converts H1s to H2s if there are 3 or more of them', () => {
    const $ = cheerio.load(HTML.convertThreeHOnes.before);

    const result = stripCheerioWrapper(cleanHOnes($('*').first(), $));
    assertClean(result, HTML.convertThreeHOnes.after);
  });
});
