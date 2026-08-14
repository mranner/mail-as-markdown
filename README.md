# Copy Mail as Markdown (Thunderbird extension)

Copies the currently displayed or list-selected email (text or HTML) as
Markdown to the clipboard — handy for pasting a mail straight into Claude
Code.

## Usage

- **Toolbar button**: copies the message currently shown in the reading pane.
- **Right-click a mail in the list** → "Copy as Markdown".

A green checkmark on the icon badge confirms the copy, a red "!" indicates an
error (e.g. no message selected).

The result contains a short header (Subject/From/To/Date) followed by the
mail body as Markdown.

## Localization

The extension UI (name, description, toolbar tooltip, context menu entry,
header labels) is localized via the standard WebExtension `_locales`
mechanism. Thunderbird picks the locale automatically based on its own UI
language — no user setting needed.

- `_locales/en/messages.json` — English (default/fallback)
- `_locales/de/messages.json` — German

To add another language, add `_locales/<lang>/messages.json` with the same
keys.

## Installation (temporary, for testing)

1. Open Thunderbird → menu → "Add-ons and Themes" (`Ctrl+Shift+A`)
2. Gear icon → "Debug Add-ons"
3. "Load Temporary Add-on…" → select the `manifest.json` file in this folder

The extension stays active until Thunderbird is restarted.

## Installation (permanent)

Thunderbird requires a signed `.xpi` for permanent installation. For personal
use it's enough to zip the folder and rename it to `.xpi`:

```bash
cd mail-as-markdown
mkdir -p dist
zip -r -X dist/mail-as-markdown.xpi \
  manifest.json background.js html2md.js turndown.js turndown-plugin-gfm.js \
  LICENSE icon-16.png icon-32.png icon-48.png icon-64.png _locales
```

Drag and drop the resulting `dist/mail-as-markdown.xpi` onto the Add-ons Manager.
Since it isn't signed by Mozilla, this requires either the
`xpinstall.signatures.required = false` setting (about:config) on a normal
Thunderbird release, or using Thunderbird ESR/Developer Edition — or just
stick with the temporary installation, which doesn't require a signature.

## Files

- `manifest.json` — extension manifest (MailExtension, Manifest V2)
- `background.js` — logic: fetch message, convert HTML→Markdown, copy to clipboard
- `html2md.js` — wrapper around Turndown for HTML→Markdown conversion
- `turndown.js`, `turndown-plugin-gfm.js` — bundled libraries (HTML→Markdown incl. tables)
- `_locales/en/`, `_locales/de/` — UI translations (English default, German)
- `dist/` — build output, holds the packaged `.xpi` (not in version control)
- `CHANGELOG.md` — version history

## License

Own code: BSD 2-Clause License, see `LICENSE` (Copyright (c) 2026, Michael
Ranner / azedo.at).

Bundled third-party libraries `turndown.js` and `turndown-plugin-gfm.js` are
under the MIT license of their respective original authors (license text in
each file's header).
