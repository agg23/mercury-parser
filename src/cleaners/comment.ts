export const cleanComment = (
  commentDOM: cheerio.Cheerio,
  {
    $,
    url = '',
    defaultCleaner = true,
  }: {
    $: cheerio.Root;
    url: string;
    defaultCleaner?: boolean;
  }
) => {
  // console.log(url);
};
