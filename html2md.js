// Wandelt HTML-E-Mail-Body in Markdown um (Turndown + GFM-Plugin für Tabellen).
function htmlToMarkdown(html) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  turndownService.use(turndownPluginGfm.gfm);
  return turndownService.turndown(html).trim();
}
