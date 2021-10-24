import Extractors from './all';
import { detectByHtml } from './detect-by-html';
import { apiExtractors } from './add-extractor';
import { CustomExtractor } from './types';

export function getExtractor(
  url: string,
  parsedUrl?: URL,
  $?: cheerio.Root
): CustomExtractor | undefined {
  parsedUrl = parsedUrl || new URL(url);
  const { hostname } = parsedUrl;
  const baseDomain = hostname?.split('.').slice(-2).join('.') ?? '';

  return (
    (hostname && apiExtractors[hostname]) ||
    apiExtractors[baseDomain] ||
    (hostname && Extractors[hostname]) ||
    Extractors[baseDomain] ||
    ($ && detectByHtml($)) ||
    undefined
  );
}
