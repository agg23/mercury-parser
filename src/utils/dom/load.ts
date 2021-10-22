import cheerio from 'cheerio';

export const loadCheerio = (html: string) =>
  cheerio.load(html, {
    scriptingEnabled: false,
  } as cheerio.CheerioParserOptions);
