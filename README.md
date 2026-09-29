# Innehalten – deine Meditations-App

Eine Web-App (PWA) für deine eigenen Meditationsaufnahmen. Kein Login, keine Server-Datenbank:
Dein Fortschritt liegt nur auf deinem iPhone (IndexedDB) und lässt sich als JSON-Backup sichern.

## Ordnerstruktur

```
innehalten/
├── index.html              App-Gerüst
├── styles.css              Aussehen (hell/dunkel)
├── app.js                  App-Logik
├── sw.js                   Service Worker (offline)
├── manifest.webmanifest    Name und Icons für den Home-Bildschirm
├── content.json            ← DEINE ÜBUNGEN (wird mit katalog.html erstellt)
├── katalog.html            Werkzeug, das content.json aus deinem Ordner erzeugt
├── icons/                  App-Icons
└── audio/                  ← DEINE AUDIODATEIEN
    └── demo/klangprobe.mp3 (Beispiel, später löschen)
```

## content.json

```json
{
  "categories": [
    { "id": "schlaf", "title": "Schlaf", "color": "peri", "icon": "moon" }
  ],
  "courses": [
    {
      "id": "grundkurs",
      "title": "Grundkurs Achtsamkeit",
      "category": "schlaf",
      "description": "Zehn Tage, um eine Gewohnheit aufzubauen.",
      "sessions": [
        { "id": "grundkurs-01", "title": "Tag 1: Ankommen", "file": "audio/grundkurs/01-ankommen.m4a", "duration": "10:30" },
        { "id": "grundkurs-02", "title": "Tag 2: Atem", "file": "audio/grundkurs/02-atem.m4a", "duration": "11:05" }
      ]
    }
  ],
  "singles": [
    { "id": "einschlafen", "title": "Sanft einschlafen", "category": "schlaf",
      "file": "audio/schlaf/einschlafen.m4a", "duration": "15:00",
      "description": "Optional, eine Zeile.", "tags": ["abend", "nacht"] }
  ]
}
```

| Feld | Bedeutung |
|---|---|
| `id` | Eindeutig und **nie mehr ändern** – daran hängt dein Fortschritt. Kleinbuchstaben, Bindestriche. |
| `file` | Pfad relativ zur index.html. Dateinamen ohne Leerzeichen und Umlaute. |
| `duration` | `"mm:ss"` oder Zahl in Minuten. Nach dem ersten Abspielen nutzt die App die echte Länge. |
| `color` | `sage`, `peri`, `marigold`, `rose`, `sky`, `sand` |
| `icon` | `leaf`, `moon`, `sun`, `wave`, `drop`, `heart`, `wind`, `stone`, `circle` |
| `tags` | Optional: `morgen`, `tag`, `abend`, `nacht` – steuert den Tagesvorschlag. |

Reihenfolge der Einheiten im Kurs = Reihenfolge in `sessions`.

## Neue Übung hinzufügen

1. Audiodatei (MP3 oder M4A) in einen Unterordner von `audio/` legen, z. B. `audio/schlaf/koerperreise.m4a`.
2. In `content.json` einen Eintrag ergänzen (Komma zwischen Einträgen nicht vergessen).
3. Prüfen, ob die JSON gültig ist, z. B. auf jsonlint.com.
4. Hochladen (siehe unten). Beim nächsten Öffnen der App ist die Übung da.

Tipp: M4A/AAC mit 64–96 kbit/s mono reicht für Sprache völlig und hält die Dateien klein
(ca. 0,5–0,7 MB pro Minute).


## Audios aus Google Drive (empfohlen)

Die Audios bleiben in deinem Google Drive. Die App spielt sie über die offizielle Drive-Schnittstelle ab,
inklusive Spulen, Sperrbildschirm und Offline-Speicher. Du lädst nur die kleine App auf GitHub Pages hoch.

**1. Ordner freigeben**
In Google Drive auf deinen Meditationsordner (den mit „Packs“ und „Singles“) rechtsklicken → Teilen →
Allgemeiner Zugriff: „Jeder mit dem Link“, Rolle „Betrachter“ → Fertig. Den Link kopieren.

**2. API-Schlüssel erstellen (einmalig, ca. 5 Minuten, kostenlos)**
1. console.cloud.google.com öffnen und mit deinem Google-Konto anmelden.
2. Oben „Projekt auswählen“ → „Neues Projekt“, Name z. B. `Innehalten` → Erstellen.
3. Menü → „APIs und Dienste“ → „Bibliothek“ → „Google Drive API“ suchen → „Aktivieren“.
4. Menü → „APIs und Dienste“ → „Anmeldedaten“ → „Anmeldedaten erstellen“ → „API-Schlüssel“.
5. Den neuen Schlüssel bearbeiten:
   - API-Einschränkungen: „Schlüssel einschränken“ → nur „Google Drive API“ anhaken.
   - Anwendungseinschränkungen: „Websites“ → `https://DEINNAME.github.io/*` hinzufügen.
   - Speichern und den Schlüssel (beginnt mit `AIza`) kopieren.

**3. App hochladen**
Die App wie unter „Kostenlos hosten mit GitHub Pages“ beschrieben hochladen. Den Ordner `audio/` brauchst du dabei nicht.

**4. Katalog erstellen**
1. `https://DEINNAME.github.io/innehalten/katalog.html` am Computer öffnen.
2. „Aus Google Drive“ wählen, Ordner-Link und Schlüssel eintragen → „content.json erstellen“.
   Das Werkzeug liest alle Unterordner und misst die Laufzeiten. Bei vielen Dateien dauert das einige Minuten.
3. content.json herunterladen und im GitHub-Repo die alte content.json damit ersetzen („Add file“ → „Upload files“).

**Neue Aufnahme?** In den passenden Drive-Ordner legen, katalog.html erneut ausführen und dabei die bisherige
content.json mit angeben, damit deine eigenen Anpassungen erhalten bleiben. Neue content.json hochladen, fertig.

Gut zu wissen:
- Wer eine Datei-ID und den Schlüssel kennt, kann die Datei abrufen. Nirgends verlinkt, aber nicht geheim.
- Der Schlüssel steht in content.json. Durch die Einschränkungen oben kann er nur öffentliche Drive-Dateien lesen und nur von deiner Seite aus.
- Spielt auf dem iPhone nichts ab, obwohl katalog.html funktioniert hat: testweise die Website-Einschränkung
  des Schlüssels entfernen (die Einschränkung auf die Drive API reicht als Schutz).
- Ordner und Dateien in Drive nicht umbenennen, sonst ändern sich die ids und der Fortschritt dieser Übungen beginnt neu.
  Verschieben innerhalb derselben Kategorie ist unkritisch.

## Alternative: Audios im App-Ordner (mit katalog.html)

1. Lade in Google Drive deinen Hauptordner herunter (den mit „Packs“ und „Singles“) und entpacke ihn.
   Mit „Google Drive für Desktop“ kannst du ihn auch direkt verwenden.
2. Kopiere die Ordner `Packs` und `Singles` in den Ordner `audio/` der App, also z. B.
   `audio/Packs/1 - Foundation/Basics/Meditation - Basics - Day 1.mp3`. Den Ordner `audio/demo` kannst du löschen.
3. Starte am Computer im App-Ordner einen kleinen Webserver, z. B. im Terminal:
   `python3 -m http.server 8000`, und öffne `http://localhost:8000/katalog.html`.
   (Alternativ katalog.html einfach nach dem Hochladen über deine App-Adresse öffnen.)
4. Wähle „Aus Ordner auf dem Computer“, dann den Ordner mit `Packs` und `Singles`, und klicke „content.json erstellen“.
5. Lade die Datei herunter und ersetze damit die `content.json` im App-Ordner.

Das Werkzeug erkennt:
- `Packs/<Nr> - <Kategorie>/<Kurs>/…Day N…` → Kurs, Einheiten nach Tag sortiert
- `Singles/<Nr> - <Kategorie>/<Datei>` → Einzelübung (auch mit Unterordnern)
- Die Nummer vor der Kategorie bestimmt die Reihenfolge und wird im Titel weggelassen.
- Die Dauer wird aus den Dateien gelesen.

Neue Aufnahme: in den passenden Ordner legen, katalog.html erneut ausführen und dabei die bisherige
content.json mit angeben. Deine selbst geänderten Titel, Beschreibungen, Farben und Tags bleiben erhalten.
Ordner- oder Dateinamen später nicht mehr umbenennen, sonst ändert sich die id und der Fortschritt dieser Übung beginnt neu.

## Große Bibliothek hosten

Nur relevant, wenn du nicht den Drive-Weg nutzt. GitHub Pages erlaubt nur etwa 1 GB pro Seite. Zwei Wege:

**A) Dateien verkleinern.** Für Sprache reicht AAC mono mit 64 kbit/s, das spart meist zwei Drittel.
Mit ffmpeg (Mac: `brew install ffmpeg`) im Ordner `audio`:
```
find . -iname "*.mp3" -exec sh -c 'ffmpeg -n -i "$1" -ac 1 -c:a aac -b:a 64k "${1%.*}.m4a" && rm "$1"' _ {} \;
```
Danach katalog.html erneut ausführen. Achtung: Die Dateinamen enden dann auf .m4a, die ids bleiben aber gleich.

**B) Audios in Cloudflare R2 speichern** (derzeit 10 GB kostenlos, keine Kosten für Abrufe – aktuelle Konditionen auf cloudflare.com prüfen).
1. Cloudflare-Konto anlegen → R2 → Bucket erstellen, z. B. `meditation`.
2. Bucket → Settings → „Public Development URL“ (r2.dev) aktivieren. Du bekommst eine Adresse wie `https://pub-xxxx.r2.dev`.
3. Settings → CORS Policy, damit die App Übungen offline speichern kann:
   ```
   [{ "AllowedOrigins": ["https://DEINNAME.github.io"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"] }]
   ```
4. Die Ordner `Packs` und `Singles` hochladen. Für viele Dateien geht das bequem mit dem kostenlosen Programm Cyberduck (Verbindung „Amazon S3“ mit den R2-Zugangsdaten).
5. In katalog.html bei „Wo liegen die Audios später?“ die Adresse `https://pub-xxxx.r2.dev/` eintragen.
6. Die App selbst (ohne `audio`-Ordner) wie unten auf GitHub Pages hochladen.

Gut zu wissen: Die Adressen sind öffentlich erreichbar, aber nirgends verlinkt.

## Kostenlos hosten mit GitHub Pages

1. Konto auf github.com anlegen.
2. „New repository“, Name z. B. `innehalten`, **Public** (kostenloses Pages braucht ein öffentliches Repo).
3. „uploading an existing file“ → den **Inhalt** des Ordners `innehalten` hineinziehen (index.html muss oben liegen, nicht in einem Unterordner) → „Commit changes“.
4. Settings → Pages → Source: „Deploy from a branch“, Branch `main`, Ordner `/ (root)` → Save.
5. Nach 1–2 Minuten ist die App unter `https://DEINNAME.github.io/innehalten/` erreichbar.

Grenzen: max. 100 MB pro Datei (per Web-Upload 25 MB), Repo möglichst unter 1 GB.
Hinweis zur Privatsphäre: Ein öffentliches Repo ist für jeden einsehbar, der es findet – also auch deine Aufnahmen.

### Alternative: Netlify (Repo bleibt privat)
Konto auf netlify.com → „Add new site“ → „Deploy manually“ → den Ordner `innehalten` ins Fenster ziehen.
Für Updates unter „Deploys“ den Ordner erneut hineinziehen. Die Seite ist öffentlich erreichbar, aber
niemand kann den Quellordner durchsuchen.

### Alternative: Cloudflare Pages
Workers & Pages → Create → Pages → „Upload assets“ → Ordner hochladen. Achtung: max. 25 MB pro Datei.

## Auf dem iPhone installieren

1. Die Adresse in **Safari** öffnen (nicht in Chrome oder in einer anderen App).
2. Teilen-Symbol (Quadrat mit Pfeil) → „Zum Home-Bildschirm“ → „Hinzufügen“.
3. App über das neue Icon starten. Sie läuft jetzt im Vollbild ohne Safari-Leisten.
4. Eine Übung einmal abspielen – danach ist sie offline verfügbar (Wolken-Symbol in der Liste).

## Backup

Fortschritt → „Backup sichern“ → „In Dateien sichern“ (z. B. iCloud Drive).
Wiederherstellen: „Backup laden“ und die Datei wählen. Vorhandene Einträge bleiben erhalten.
Wichtig: Wenn du die App vom Home-Bildschirm löschst, löscht iOS auch ihre Daten.

## App-Dateien aktualisieren

Änderst du `app.js`, `styles.css` oder `index.html`, erhöhe in `sw.js` die Zeile `const VERSION = 'v3'`
(z. B. auf `'v4'`). Die App lädt bei Internetverbindung ohnehin immer die neueste Version;
`content.json` wird bei jedem Start frisch geholt.

## Wenn eine Übung nicht abspielt

- Stimmt der Pfad? Groß-/Kleinschreibung zählt auf Webservern (`Day 1.MP3` ist nicht `Day 1.mp3`).
  Einfach katalog.html erneut laufen lassen, es übernimmt die Namen exakt.
- Spielt eine Datei mit Endung `.MP3` (groß) nicht, benenne sie in `.mp3` um und erstelle den Katalog neu.
