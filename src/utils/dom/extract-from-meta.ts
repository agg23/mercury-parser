import { stripTags } from './strip-tags';

// Given a node type to search for, and a list of meta tag names to
// search for, find a meta tag associated.
export function extractFromMeta(
  $: cheerio.Root,
  metaNames: string[],
  cachedNames: string[],
  cleanTags = true
): string | undefined {
  const foundNames = metaNames.filter(name => cachedNames.indexOf(name) !== -1);

  // eslint-disable-next-line no-restricted-syntax
  for (const name of foundNames) {
    const type = 'name';
    const value = 'value';

    const nodes = $(`meta[${type}="${name}"]`);

    // Get the unique value of every matching node, in case there
    // are two meta tags with the same name and value.
    // Remove empty values.
    const values = nodes
      .map((index, node) => $(node).attr(value))
      .toArray()
      .filter(text => text.toString() !== '');

    // If we have more than one value for the same name, we have a
    // conflict and can't trust any of them. Skip this name. If we have
    // zero, that means our meta tags had no values. Skip this name
    // also.
    if (values.length === 1) {
      let metaValue: string;
      // Meta values that contain HTML should be stripped, as they
      // weren't subject to cleaning previously.
      if (cleanTags) {
        metaValue = stripTags(values[0].toString(), $);
      } else {
        metaValue = values[0].toString();
      }

      return metaValue;
    }
  }

  // If nothing is found, return null
  return undefined;
}
