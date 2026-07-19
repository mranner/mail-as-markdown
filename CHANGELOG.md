# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.0] - 2026-07-19

### Added

- Localization via the standard WebExtension `_locales` mechanism
  (`_locales/en/messages.json`, `_locales/de/messages.json`). Thunderbird
  picks the locale automatically based on its own UI language, falling back
  to English.

### Changed

- Extension name, description, toolbar tooltip, context menu entry, and
  Markdown header labels (Subject/From/To/Date) are now localized instead of
  hardcoded German strings.
- The date in the Markdown header is now formatted using Thunderbird's UI
  language instead of being hardcoded to `de-DE`.
- Project documentation (`README.md`, `AGENTS.md`) translated from German to
  English.

## [0.1.4] - 2026-07-18

### Added

- Initial release: Thunderbird MailExtension (Manifest V2) that copies the
  currently displayed or list-selected email (text or HTML) as Markdown to
  the clipboard.
- Toolbar button and message-list context menu ("Als Markdown kopieren").
- HTML→Markdown conversion via bundled Turndown + GFM table plugin.
- Custom "MD" icon.
