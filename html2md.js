// Converts an HTML email body to Markdown (Turndown + GFM plugin for tables).

// Human-readable byte size, e.g. 84123 -> "82 kB".
function formatSize(bytes) {
  if (typeof bytes !== "number" || !isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Collapses whitespace the way Turndown's own cleanAttribute() does.
function cleanText(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

// Turndown escapes these inside link text / destinations; mirror it here since
// its helpers are module-local and not exported.
function escapeLinkText(text) {
  return text.replace(/([[\]])/g, "\\$1");
}

function escapeLinkDestination(destination) {
  const escaped = destination.replace(/([<>()])/g, "\\$1");
  return escaped.indexOf(" ") >= 0 ? `<${escaped}>` : escaped;
}

// Tracking pixels and spacer GIFs carry no information but would produce one
// marker line each in newsletters.
function isTrackingPixel(node, src) {
  for (const attr of ["width", "height"]) {
    const value = parseFloat(node.getAttribute(attr));
    if (!isNaN(value) && value <= 1) return true;
  }
  const style = node.getAttribute("style") || "";
  for (const match of style.matchAll(/(?:^|;)\s*(?:width|height)\s*:\s*([\d.]+)\s*px/gi)) {
    if (parseFloat(match[1]) <= 1) return true;
  }
  return /(?:^|\/)(?:spacer|pixel|blank|clear)(?:[-_.][\w-]*)?\.gif(?:[?#]|$)/i.test(src);
}

// Best-effort file name for the image, so the marker says more than "Image".
function fileNameFromSrc(src, cidNames) {
  if (/^cid:/i.test(src)) {
    return cidNames ? cidNames.get(src.slice(4).replace(/^<|>$/g, "").toLowerCase()) || "" : "";
  }
  if (!/^https?:/i.test(src)) return "";
  let path = src.split(/[?#]/)[0];
  let name = path.slice(path.lastIndexOf("/") + 1);
  try {
    name = decodeURIComponent(name);
  } catch (err) {
    // Malformed percent-escapes — keep the raw segment.
  }
  return /\.(?:png|jpe?g|gif|webp|svg|bmp|tiff?|avif|ico)$/i.test(name) ? name : "";
}

// A data: URI carries no context but plenty of bytes, so the base64 payload is
// dropped and replaced by a plain-text marker with type and estimated size.
function describeDataUri(src) {
  const match = /^data:([^;,]*)[^,]*,(.*)$/is.exec(src);
  if (!match) return messenger.i18n.getMessage("imageEmbedded");
  const mimeType = match[1] || "application/octet-stream";
  const size = formatSize(Math.round((match[2] || "").length * 0.75));
  const embedded = messenger.i18n.getMessage("imageEmbedded");
  return size ? `${embedded} (${mimeType}, ~${size})` : `${embedded} (${mimeType})`;
}

// Replaces Turndown's built-in image rule: keeps valid Markdown image syntax but
// enriches the alt text so a reader (or an LLM) can tell what the image was.
function imageRule(cidNames) {
  return {
    filter: "img",
    replacement: function (content, node) {
      const src = (node.getAttribute("src") || "").trim();
      if (!src) return "";
      if (isTrackingPixel(node, src)) return "";

      const description = cleanText(node.getAttribute("alt")) || cleanText(node.getAttribute("title"));
      const isDataUri = /^data:/i.test(src);
      const detail = isDataUri ? describeDataUri(src) : fileNameFromSrc(src, cidNames);

      const parts = [description, detail].filter(Boolean);
      const label = `${messenger.i18n.getMessage("imageLabel")}: ${
        parts.length ? parts.join(" — ") : messenger.i18n.getMessage("imageNoDescription")
      }`;

      // Without its payload a data: URI is a useless destination, so the marker
      // stays plain text instead of pretending to be a working image link.
      return isDataUri
        ? `[${escapeLinkText(label)}]`
        : `![${escapeLinkText(label)}](${escapeLinkDestination(src)})`;
    },
  };
}

// options.cidNames: Map of lower-cased Content-ID (without <>) to file name.
function htmlToMarkdown(html, options = {}) {
  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  turndownService.use(turndownPluginGfm.gfm);
  // addRule() prepends, so this wins over Turndown's built-in image rule.
  turndownService.addRule("image", imageRule(options.cidNames));
  return turndownService.turndown(html).trim();
}
