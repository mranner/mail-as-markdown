# Anleitung für Agents (z. B. Claude Code)

Dieses Repo enthält eine Thunderbird-MailExtension (Manifest V2), die eine E-Mail
als Markdown ins Clipboard kopiert. Diese Datei beschreibt, wie ein Agent das
`.xpi`-Paket baut und bei der lokalen Installation unterstützt.

## Projektstruktur

- `manifest.json` — Extension-Manifest
- `background.js` — Kernlogik (Nachricht lesen, HTML→Markdown, Clipboard)
- `html2md.js` — Turndown-Wrapper
- `turndown.js`, `turndown-plugin-gfm.js` — gebündelte Drittbibliotheken (MIT-lizenziert)
- `icon-16.png` / `icon-32.png` / `icon-48.png` / `icon-64.png` — Toolbar-/Menü-Icon
- `LICENSE` — BSD-2-Clause für den eigenen Code

## .xpi bauen

Ein `.xpi` ist ein einfaches ZIP mit den Extension-Dateien im Root (kein
Unterordner). Aus dem Repo-Root:

```bash
cd thunderbird-md-copy
rm -f ../mail-as-markdown.xpi
zip -r -X ../mail-as-markdown.xpi \
  manifest.json background.js html2md.js turndown.js turndown-plugin-gfm.js \
  LICENSE icon-16.png icon-32.png icon-48.png icon-64.png
```

Bei jeder Code-Änderung die `version` in `manifest.json` erhöhen — Thunderbird
übernimmt ein neu installiertes `.xpi` sonst nicht zuverlässig, selbst wenn der
Inhalt sich geändert hat (Update wird nur bei höherer Versionsnummer erkannt).

## Lokale Installation (temporär, ohne Signatur-Anpassung)

Am einfachsten für Tests, keine Konfigurationsänderung nötig, aber nicht
dauerhaft (verschwindet beim Thunderbird-Neustart):

1. Thunderbird → `Strg+Shift+A` (Add-ons und Themes)
2. Zahnrad-Icon → „Add-on debuggen“
3. „Temporäres Add-on laden…“ → `manifest.json` auswählen

## Lokale Installation (dauerhaft, unsigniertes .xpi)

Reguläre Thunderbird-Releases installieren nur signierte Add-ons dauerhaft.
Für ein selbstgebautes, unsigniertes `.xpi` muss die Signaturprüfung temporär
deaktiviert werden — funktioniert nur auf **Thunderbird ESR** oder der
**Developer Edition**, nicht auf dem normalen Release-Kanal.

1. Thunderbird **vollständig schließen** (Prozess darf nicht mehr laufen —
   `prefs.js` wird beim Beenden neu geschrieben und überschreibt sonst jede
   manuelle Änderung)
2. In der `prefs.js` des aktiven Profils folgende Zeile ergänzen:
   ```
   user_pref("xpinstall.signatures.required", false);
   ```
   Profilpfad macOS: `~/Library/Thunderbird/Profiles/<profil>.default/prefs.js`
   (Profilnamen vorher prüfen, z. B. via `find ~/Library/Thunderbird/Profiles -maxdepth 1 -type d`)
3. Vor dem Ändern ein Backup der `prefs.js` anlegen (`cp prefs.js prefs.js.bak`)
4. Thunderbird starten → `Strg+Shift+A` → Zahnrad → „Add-on aus Datei
   installieren…“ → das gebaute `.xpi` auswählen
5. In `about:addons` prüfen, ob die erwartete Versionsnummer installiert ist
6. **Nach der Installation**: Thunderbird wieder schließen und die Zeile aus
   Schritt 2 entfernen bzw. auf `true` setzen, um die Signaturprüfung wieder
   zu aktivieren (Sicherheitsrelevant — nicht dauerhaft deaktiviert lassen)

## Debugging

- Add-ons-Manager → Zahnrad → „Add-on debuggen“ → bei der Extension auf
  „Untersuchen“ klicken öffnet eine an das Background-Script gebundene
  Devtools-Konsole. In der Praxis war die Konsolenausgabe dort teils
  unzuverlässig sichtbar — als robusterer Kanal hat sich ein sichtbares
  Badge auf dem Toolbar-Icon (`browser.browserAction.setBadgeText(...)`)
  bewährt, um Erfolg/Fehler ohne Devtools zu erkennen.
- `browser.menus.create()` ist in Thunderbird **synchron** und gibt **kein
  Promise** zurück (anders als in manchen Doku-Beispielen suggeriert) —
  Fehler nur über den optionalen Callback + `browser.runtime.lastError`
  abfragen, kein `.then()`/`.catch()` verwenden.
