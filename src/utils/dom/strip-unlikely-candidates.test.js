import assert from 'assert';
import cheerio from 'cheerio';

import { assertClean, stripCheerioWrapper } from 'test-helpers';
import HTML from './fixtures/html';
import { stripUnlikelyCandidates } from './strip-unlikely-candidates';

function assertBeforeAndAfter(key, fn) {
  const $ = cheerio.load(HTML[key].before);
  assertClean(stripCheerioWrapper(fn($)), HTML[key].after);
}

describe('Generic Extractor Utils', () => {
  describe('stripUnlikelyCandidates(node)', () => {
    it('returns original doc if no matches found', () => {
      const $ = cheerio.load(HTML.noMatches);
      const stripped = stripCheerioWrapper(stripUnlikelyCandidates($));
      assert.equal(stripped, HTML.noMatches);
    });

    it('strips unlikely matches from the doc', () => {
      assertBeforeAndAfter('whitelistMatch', stripUnlikelyCandidates);
    });

    it('keeps likely matches even when they also match the blacklist', () => {
      assertBeforeAndAfter('whiteAndBlack', stripUnlikelyCandidates);
    });

    it('removed likely matches when inside blacklist node', () => {
      assertBeforeAndAfter('whiteInsideBlack', stripUnlikelyCandidates);
    });
  });
});
