# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.0] - 2026-08-18

### Added

- The Markdown header gained a `Delivered to` line, read from the message's
  own `Delivered-To` header (falling back to the last hop of the topmost
  `Received` line). It names the delivering mailbox and host, e.g.
  `user@mail.example.at`, which identifies the IMAP account far more reliably
  than the user-chosen Thunderbird account label — two accounts can share both
  the label style and the identity address, but not the delivering host. If
  neither header is present, the line is omitted.

## [0.3.0] - 2026-08-18

### Added

- Images in the body now carry a hint instead of a bare link: the alt text is
  enriched with the file name (resolved via Content-ID for inline images, or
  taken from the URL for remote ones), e.g.
  `![Image: Company logo — logo.png](cid:…)`.
- Attachments are listed below the mail body (name, content type, size).
  Inline images referenced from the body are marked as such. The files
  themselves are not copied — the clipboard holds plain text.
- The Markdown header gained a source reference (`Folder`, `Message-ID`) so
  the message can be looked up again later, e.g. over IMAP.

### Changed

- Data URI images (`src="data:image/png;base64,…"`) are no longer copied
  verbatim. The base64 payload carries no context but easily hundreds of
  kilobytes, so it is replaced by a plain-text marker with content type and
  estimated size.
- Tracking pixels and spacer images (width/height ≤ 1px, `spacer.gif`-style
  names) are dropped instead of producing a marker line each.
- New manifest permission `accountsRead`, needed to show the account name in
  the folder reference instead of Thunderbird's internal account id.

## [0.2.1] - 2026-08-14

### Changed

- The build now writes the packaged `.xpi` to a `dist/` directory inside the
  repo instead of the parent directory. `dist/` is git-ignored; `README.md`
  and `AGENTS.md` document the new build path.

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
