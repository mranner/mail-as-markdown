# Instructions for agents (e.g. Claude Code)

This repo contains a Thunderbird MailExtension (Manifest V2) that copies an
email as Markdown to the clipboard. This file describes how an agent builds
the `.xpi` package and helps with local installation.

## Project structure

- `manifest.json` — extension manifest
- `background.js` — core logic (read message, HTML→Markdown, clipboard)
- `html2md.js` — Turndown wrapper
- `turndown.js`, `turndown-plugin-gfm.js` — bundled third-party libraries (MIT licensed)
- `icon-16.png` / `icon-32.png` / `icon-48.png` / `icon-64.png` — toolbar/menu icon
- `_locales/en/messages.json`, `_locales/de/messages.json` — UI translations (English default, German)
- `LICENSE` — BSD-2-Clause for the own code
- `dist/` — build output, holds the packaged `.xpi` (git-ignored, created by
  the build)

## Localization

All user-facing strings (extension name/description, toolbar tooltip, context
menu entry, Markdown header labels) go through the WebExtension i18n API —
`messenger.i18n.getMessage("key")` in code, `__MSG_key__` placeholders in
`manifest.json`. `default_locale` in `manifest.json` is `en`; Thunderbird
picks the matching `_locales/<lang>/messages.json` automatically based on its
own UI language, falling back to `en` if no match exists.

When adding a new user-facing string:

1. Add the key to `_locales/en/messages.json` (with a `description` field).
2. Add the same key to `_locales/de/messages.json` (and any other locale
   present).
3. Reference it via `messenger.i18n.getMessage("key")` in `background.js`, or
   `__MSG_key__` in `manifest.json`.

Never hardcode a language-specific string directly in `background.js` or
`manifest.json`.

## Building the .xpi

A `.xpi` is a plain ZIP with the extension files at the root (no
subfolder). The build output goes to `dist/` inside the repo — never next to
the repo or into the repo root. `dist/` is git-ignored. From the repo root:

```bash
mkdir -p dist
rm -f dist/mail-as-markdown.xpi
zip -r -X dist/mail-as-markdown.xpi \
  manifest.json background.js html2md.js turndown.js turndown-plugin-gfm.js \
  LICENSE icon-16.png icon-32.png icon-48.png icon-64.png _locales
```

Bump `version` in `manifest.json` on every code change — Thunderbird doesn't
reliably pick up a newly installed `.xpi` otherwise, even if the content
changed (an update is only recognized with a higher version number).

## Local installation (temporary, no signature change needed)

Simplest for testing, no configuration change required, but not permanent
(disappears on Thunderbird restart):

1. Thunderbird → `Ctrl+Shift+A` (Add-ons and Themes)
2. Gear icon → "Debug Add-ons"
3. "Load Temporary Add-on…" → select `manifest.json`

## Local installation (permanent, unsigned .xpi)

Regular Thunderbird releases only install signed add-ons permanently. For a
self-built, unsigned `.xpi`, signature verification must be temporarily
disabled — this only works on **Thunderbird ESR** or the **Developer
Edition**, not on the normal release channel.

Set the pref in Thunderbird itself — do **not** edit `prefs.js` on disk.
Thunderbird rewrites that file on exit and would overwrite a manual change.

1. Settings → General → scroll to the bottom → "Config Editor…"
   (the `about:config` page)
2. Search for `xpinstall.signatures.required` and set it to `false`
3. `Ctrl+Shift+A` → gear icon → "Install Add-on From File…" → select the built
   `dist/mail-as-markdown.xpi`
4. Check in `about:addons` that the expected version number is installed
5. **After installation**: set `xpinstall.signatures.required` back to `true`
   in the Config Editor (security-relevant — don't leave it disabled
   permanently)

This is a user action; an agent cannot click through the Config Editor. Ask
the user to flip the pref rather than trying to patch the profile.

## Debugging

- Add-ons Manager → gear icon → "Debug Add-ons" → click "Inspect" on the
  extension to open a devtools console bound to the background script. In
  practice, console output there was sometimes unreliably visible — a visible
  badge on the toolbar icon (`browser.browserAction.setBadgeText(...)`) has
  proven to be a more robust channel for detecting success/failure without
  devtools.
- `browser.menus.create()` is **synchronous** in Thunderbird and does **not**
  return a Promise (unlike what some documentation examples suggest) — check
  errors only via the optional callback + `browser.runtime.lastError`, don't
  use `.then()`/`.catch()`.
