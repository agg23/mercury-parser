const newlineRegex = /(\r\n|\n|\r)/gm;

export const stripNewlines = (string: string) =>
  string.replaceAll(newlineRegex, '');
