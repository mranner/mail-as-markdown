// Sucht rekursiv nach text/html- und text/plain-Teilen im MIME-Baum einer Nachricht.
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

function headerLine(label, value) {
  return value ? `**${label}:** ${value}\n` : "";
}

async function buildMarkdown(message) {
  const full = await messenger.messages.getFull(message.id);
  const result = { html: null, text: null };
  findBodyParts(full, result);

  let body;
  if (result.html) {
    body = htmlToMarkdown(result.html);
  } else if (result.text) {
    body = result.text.trim();
  } else {
    body = "*(kein Textinhalt gefunden)*";
  }

  const meta =
    headerLine("Betreff", message.subject) +
    headerLine("Von", message.author) +
    headerLine("An", (message.recipients || []).join(", ")) +
    headerLine("Datum", message.date ? new Date(message.date).toLocaleString("de-DE") : "");

  return `${meta}\n${body}\n`;
}

// document.execCommand("copy") funktioniert im (Hintergrund-)Extension-Fenster
// zuverlässiger als die async Clipboard API, da Letztere Dokument-Fokus verlangt.
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
    console.error("Mail als Markdown: Fehler beim Kopieren", err);
    flashBadge(false);
  }
}

// Toolbar-Button: kopiert die aktuell angezeigte Nachricht.
browser.browserAction.onClicked.addListener(async (tab) => {
  const message = await messenger.messageDisplay.getDisplayedMessage(tab.id);
  await copyMessage(message);
});

// Kontextmenü in der Nachrichtenliste.
// Hinweis: menus.create() ist synchron und meldet Fehler nur über den
// optionalen Callback + browser.runtime.lastError, nicht als Promise.
browser.menus.create(
  {
    id: "copy-as-markdown",
    title: "Als Markdown kopieren",
    contexts: ["message_list"],
    icons: { "16": "icon-16.png", "32": "icon-32.png" },
  },
  () => {
    if (browser.runtime.lastError) {
      console.error("Mail als Markdown: Fehler bei menus.create", browser.runtime.lastError);
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
