export function excerptContent(content: string, words = 10) {
  return content.trim().split(/\s+/).slice(0, words).join(' ');
}

export function excerptDomContent($: cheerio.Root, words?: number) {
  $('*').each((_, element) => {
    const node = $(element);
    node.prepend(' ');
    node.append(' ');
  });

  const string = $('*').first().text();

  return excerptContent(string, words);
}
