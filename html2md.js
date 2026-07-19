// Converts an HTML email body to Markdown (Turndown + GFM plugin for tables).
function htmlToMarkdown(html) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  turndownService.use(turndownPluginGfm.gfm);
  return turndownService.turndown(html).trim();
}
