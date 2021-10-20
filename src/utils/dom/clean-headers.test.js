import cheerio from 'cheerio';

import { assertClean, stripCheerioWrapper } from 'test-helpers';

import HTML from './fixtures/html';
import { cleanHeaders } from './index';

describe('cleanHeaders(article, $)', () => {
  it('parses html and returns the article', () => {
    const $ = cheerio.load(HTML.cleanFirstHeds.before);

    const result = stripCheerioWrapper(cleanHeaders($('*').first(), $));
    assertClean(result, HTML.cleanFirstHeds.after);
  });

  it('removes headers when the header text matches the title', () => {
    const $ = cheerio.load(HTML.cleanTitleMatch.before);

    const result = stripCheerioWrapper(
      cleanHeaders($('*').first(), $, 'Title Match')
    );
    assertClean(result, HTML.cleanTitleMatch.after);
  });

  it('removes headers with a negative weight', () => {
    const $ = cheerio.load(HTML.dropWithNegativeWeight.before);

    const result = stripCheerioWrapper(cleanHeaders($('*').first(), $));
    assertClean(result, HTML.dropWithNegativeWeight.after);
  });
});
