# Mail als Markdown kopieren (Thunderbird-Extension)

Kopiert die aktuell angezeigte oder in der Liste ausgewählte E-Mail (Text oder HTML)
als Markdown ins Clipboard — praktisch, um eine Mail direkt in Claude Code einzufügen.

## Nutzung

- **Toolbar-Button**: kopiert die gerade im Lesefenster angezeigte Nachricht.
- **Rechtsklick auf eine Mail in der Liste** → „Als Markdown kopieren".

Ein grüner Haken im Icon-Badge bestätigt den Kopiervorgang, ein rotes „!" zeigt einen
Fehler an (z. B. wenn keine Nachricht ausgewählt ist).

Das Ergebnis enthält einen kurzen Kopf (Betreff/Von/An/Datum) gefolgt vom Mailtext
als Markdown.

## Installation (temporär, zum Testen)

1. Thunderbird öffnen → Menü → „Add-ons und Themes" (`Strg+Shift+A`)
2. Zahnrad-Icon → „Add-on debuggen"
3. „Temporäres Add-on laden…" → die Datei `manifest.json` aus diesem Ordner auswählen

Die Extension bleibt bis zum Neustart von Thunderbird aktiv.

## Installation (dauerhaft)

Thunderbird verlangt für dauerhafte Installation eine signierte `.xpi`. Für den reinen
Eigengebrauch reicht es, den Ordner als ZIP zu packen und in `.xpi` umzubenennen:

```bash
cd thunderbird-md-copy
zip -r -x .git/\* -x README.md -X ../mail-as-markdown.xpi manifest.json background.js html2md.js turndown.js turndown-plugin-gfm.js
```

Die entstandene `mail-as-markdown.xpi` per Drag & Drop in den Add-ons-Manager ziehen.
Da sie nicht von Mozilla signiert ist, ist dafür in normalen Thunderbird-Releases die
Einstellung `xpinstall.signatures.required = false` (about:config) oder die Nutzung von
Thunderbird ESR/Developer-Edition nötig — alternativ bei der temporären Installation
bleiben, die keine Signatur verlangt.

## Dateien

- `manifest.json` — Extension-Manifest (MailExtension, Manifest V2)
- `background.js` — Logik: Nachricht holen, HTML→Markdown wandeln, ins Clipboard kopieren
- `html2md.js` — Wrapper um Turndown zur HTML→Markdown-Konvertierung
- `turndown.js`, `turndown-plugin-gfm.js` — gebündelte Bibliotheken (HTML→Markdown inkl. Tabellen)

## Lizenz

Eigener Code: BSD 2-Clause License, siehe `LICENSE` (Copyright (c) 2026, Michael Ranner / azedo.at).

Gebündelte Drittbibliotheken `turndown.js` und `turndown-plugin-gfm.js` stehen unter
der MIT-Lizenz der jeweiligen Original-Autoren (Lizenztext jeweils im Dateikopf).
