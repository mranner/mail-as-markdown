// Recursively searches the message's MIME tree for text/html and text/plain parts.
function findBodyParts(part, result) {
  if (!part) return;
  const contentType = (part.contentType || "").toLowerCase();
  if (contentType.startsWith("text/html") && part.body && !result.html) {
    result.html = part.body;
  } else if (contentType.startsWith("text/plain") && part.body && !result.text) {
    result.text = part.body;
  }
  if (part.parts) {
    for (const child of part.parts) {
      findBodyParts(child, result);
    }
  }
}

// Collects non-text MIME parts so inline images can be resolved by Content-ID
// and real attachments can be listed. `headers` is not populated on every part
// in every Thunderbird version, hence the defensive reads.
function collectParts(part, out) {
  if (!part) return out;
  const contentId = ((part.headers && part.headers["content-id"]) || [])[0];
  if (contentId && part.name) {
    out.cidNames.set(contentId.trim().replace(/^<|>$/g, "").toLowerCase(), part.name);
  }
  if (contentId && part.partName) {
    out.inlineParts.add(part.partName);
  }
  if (part.parts) {
    for (const child of part.parts) {
      collectParts(child, out);
    }
  }
  return out;
}

function headerLine(label, value) {
  return value ? `**${label}:** ${value}\n` : "";
}

// "office@azedo.at — /INBOX/Projects" — enough for the imap skill to find the
// message again. Messages opened from an .eml file have no folder.
async function folderReference(message) {
  const folder = message.folder;
  if (!folder) return "";
  let account = folder.accountId || "";
  try {
    const details = await messenger.accounts.get(folder.accountId, false);
    if (details && details.name) account = details.name;
  } catch (err) {
    // "accountsRead" missing or account gone — fall back to the raw id.
  }
  return [account, folder.path].filter(Boolean).join(" — ");
}

// Attachments are never copied (the clipboard holds plain text) — the list only
// records that they exist, so they can be fetched separately if needed.
async function buildAttachmentList(messageId, inlineParts) {
  let attachments = [];
  try {
    attachments = (await messenger.messages.listAttachments(messageId)) || [];
  } catch (err) {
    // Not every message supports attachment listing; absence is not an error.
    return "";
  }
  if (attachments.length === 0) return "";

  const inlineLabel = messenger.i18n.getMessage("attachmentInline");
  const lines = attachments.map((attachment) => {
    const details = [attachment.contentType, formatSize(attachment.size)].filter(Boolean).join(", ");
    const suffix = inlineParts.has(attachment.partName) ? ` (${inlineLabel})` : "";
    return `- \`${attachment.name}\`${details ? ` — ${details}` : ""}${suffix}`;
  });

  const heading = messenger.i18n.getMessage("attachmentsHeading");
  return `\n---\n\n**${heading} (${attachments.length}):**\n\n${lines.join("\n")}\n`;
}

async function buildMarkdown(message) {
  const full = await messenger.messages.getFull(message.id);
  const result = { html: null, text: null };
  findBodyParts(full, result);
  const parts = collectParts(full, { cidNames: new Map(), inlineParts: new Set() });

  let body;
  if (result.html) {
    body = htmlToMarkdown(result.html, { cidNames: parts.cidNames });
  } else if (result.text) {
    body = result.text.trim();
  } else {
    body = messenger.i18n.getMessage("noTextContent");
  }

  const meta =
    headerLine(messenger.i18n.getMessage("headerSubject"), message.subject) +
    headerLine(messenger.i18n.getMessage("headerFrom"), message.author) +
    headerLine(messenger.i18n.getMessage("headerTo"), (message.recipients || []).join(", ")) +
    headerLine(
      messenger.i18n.getMessage("headerDate"),
      message.date ? new Date(message.date).toLocaleString(messenger.i18n.getUILanguage()) : ""
    ) +
    headerLine(messenger.i18n.getMessage("headerFolder"), await folderReference(message)) +
    headerLine(
      messenger.i18n.getMessage("headerMessageId"),
      message.headerMessageId ? `<${message.headerMessageId}>` : ""
    );

  const attachments = await buildAttachmentList(message.id, parts.inlineParts);

  return `${meta}\n${body}\n${attachments}`;
}

// document.execCommand("copy") works more reliably in the (background) extension
// window than the async Clipboard API, which requires document focus.
function copyToClipboard(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  return ok;
}

function flashBadge(ok) {
  browser.browserAction.setBadgeText({ text: ok ? "✓" : "!" });
  browser.browserAction.setBadgeBackgroundColor({ color: ok ? "#2e8540" : "#c9302c" });
  setTimeout(() => browser.browserAction.setBadgeText({ text: "" }), 2000);
}

async function copyMessage(message) {
  if (!message) return;
  try {
    const markdown = await buildMarkdown(message);
    const ok = copyToClipboard(markdown);
    flashBadge(ok);
  } catch (err) {
    console.error("Copy Mail as Markdown: error while copying", err);
    flashBadge(false);
  }
}

// Toolbar button: copies the currently displayed message.
browser.browserAction.onClicked.addListener(async (tab) => {
  const message = await messenger.messageDisplay.getDisplayedMessage(tab.id);
  await copyMessage(message);
});

// Context menu in the message list.
// Note: menus.create() is synchronous and only reports errors via the
// optional callback + browser.runtime.lastError, not as a Promise.
browser.menus.create(
  {
    id: "copy-as-markdown",
    title: messenger.i18n.getMessage("menuItemTitle"),
    contexts: ["message_list"],
    icons: { "16": "icon-16.png", "32": "icon-32.png" },
  },
  () => {
    if (browser.runtime.lastError) {
      console.error("Copy Mail as Markdown: error in menus.create", browser.runtime.lastError);
    }
  }
);

browser.menus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "copy-as-markdown") return;
  const messages = info.selectedMessages && info.selectedMessages.messages;
  if (messages && messages.length > 0) {
    await copyMessage(messages[0]);
  }
});
