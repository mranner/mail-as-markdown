# WebExtension API review: Thunderbird 141–153 ESR

Reviewed 2026-10-16 against Thunderbird 153.5.0esr and extension version 0.5.2.

**Result:** nothing worth a change of its own. Two small items can ride along
with the next code change.

## Take along with the next change

- **Attachment type** (`messages.listAttachments`, TB 153): `MessageAttachment`
  now has `type` (`normal`, `cloudFile`, `linked`, `detached`, `deleted`) plus
  `cloudFileUrl` / `linkUrl`. In `buildAttachmentList`, print the URL for
  cloud and linked attachments and mark deleted and detached ones — today they
  are listed like normal attachments although they can no longer be fetched
  from the message. Older Thunderbird versions simply omit the fields, so
  `strict_min_version` can stay.
- **Priority** (`MessageHeader.priority`, TB 148): optional header line, only
  when the value is not `normal` or `none`.

## Checked and dropped

- `messages.getHeaders` (TB 147): headers only, faster — but `getFull` is
  needed for the body anyway and already carries the headers.
- `messages.sendMessage` / `saveMessage` (TB 153), sorting options for
  `messages.list` (TB 148): unrelated to copying a message.
- `messageDisplay` has no changes after TB 114, `menus` none after TB 137.
- "Copy Message Link" in the header pane (TB 153) is a UI feature with no new
  extension API.

## Open

The version markers come from the Manifest V3 docs
(<https://webextension-api.thunderbird.net/en/latest/messages.html>). The
extension uses Manifest V2. Whether the TB 153 attachment fields arrive the
same way under MV2 is unverified — check with a test message that has a cloud
attachment before relying on them.

A later review can start at TB 154.
