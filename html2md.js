// Converts an HTML email body to Markdown (Turndown + GFM plugin for tables).

// Human-readable byte size, e.g. 84123 -> "82 kB".
function formatSize(bytes) {
  if (typeof bytes !== "number" || !isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// MIME part names sometimes carry a directory prefix ("img/logo.JPG"); only the
// file name is of interest.
function baseName(name) {
  return (name || "").replace(/^.*[\\/]/, "");
}

// Mail HTML is full of &nbsp;/zero-width spacer paragraphs. Stripping those
// characters everywhere would glue words together, so they are only removed
// where a line consists of nothing else — and runs of such lines collapse into
// one. Quote markers are kept so blockquote structure survives.
var INVISIBLE = /[\u00A0\u180E\u200B-\u200D\u2060\uFEFF]/g;

function dropInvisibleParagraphs(markdown) {
  var isEmptyish = function (line) {
    return /^[\s>]*$/.test(line);
  };
  var out = [];
  markdown.split("\n").forEach(function (line) {
    var stripped = line.replace(INVISIBLE, "");
    var cleaned = isEmptyish(stripped) ? stripped.replace(/[^>]/g, "") : line;
    if (isEmptyish(cleaned) && out.length && isEmptyish(out[out.length - 1])) return;
    out.push(cleaned);
  });
  return out.join("\n");
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
    return cidNames ? baseName(cidNames.get(src.slice(4).replace(/^<|>$/g, "").toLowerCase())) : "";
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

// "[https://x/](https://x/)" and "[a@b.c](mailto:a@b.c)" say everything twice
// and drag Markdown escaping through the visible half. The autolink form says
// it once — at the cost of any emphasis inside the link text.
function autolinkRule() {
  return {
    filter: function (node) {
      if (node.nodeName !== "A") return false;
      var href = (node.getAttribute("href") || "").trim();
      var text = cleanText(node.textContent);
      if (!href || !text || /[<>\s]/.test(href)) return false;
      return href === text || href.toLowerCase() === "mailto:" + text.toLowerCase();
    },
    replacement: function (content, node) {
      return "<" + cleanText(node.textContent) + ">";
    },
  };
}

// Newsletters build their layout from nested tables. The GFM plugin keeps every
// table without a heading row as raw HTML (turndown-plugin-gfm.js:131 via
// keepReplacement), which buries the actual text in markup and hides the images
// from the rule above. Such tables get unwrapped instead; real data tables (with
// a <th>) still go through the plugin and become Markdown tables.
function isLayoutTable(table) {
  return !!table && !table.querySelector("th");
}

// Mirrors Turndown's defaultRule, i.e. renders the element as if it had no rule.
function unwrapRule(filter) {
  return {
    filter: filter,
    replacement: function (content, node) {
      return node.isBlock ? "\n\n" + content + "\n\n" : content;
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
  // Stylesheets and scripts carry no mail content, but Turndown would keep
  // their text (there is no built-in rule for them).
  turndownService.remove(["style", "script", "head", "meta", "link", "noscript", "title"]);
  // addRule() prepends, so these win over Turndown's built-in and the GFM
  // plugin's rules — and over the plugin's keep() for heading-less tables.
  turndownService.addRule("image", imageRule(options.cidNames));
  turndownService.addRule("autolink", autolinkRule());
  turndownService.addRule("layoutTable", unwrapRule(function (node) {
    return node.nodeName === "TABLE" && isLayoutTable(node);
  }));
  turndownService.addRule("layoutRow", unwrapRule(function (node) {
    return node.nodeName === "TR" && isLayoutTable(node.closest("table"));
  }));
  turndownService.addRule("layoutCell", unwrapRule(function (node) {
    return (node.nodeName === "TD" || node.nodeName === "TH") && isLayoutTable(node.closest("table"));
  }));
  return dropInvisibleParagraphs(turndownService.turndown(html)).trim();
}
