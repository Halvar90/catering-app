# 🚀 QUICK START - In 10 Minuten live!

Diese Anleitung bringt dich **ohne Kosten** in unter 10 Minuten zur funktionierenden App.

## ⚡ Schritt 1: Projekt aufsetzen (2 Min)

```bash
# Projekt entpacken
tar -xzf catering-app.tar.gz
cd catering-app

# Dependencies installieren
npm install

# .env.local erstellen
cp .env.example .env.local
```

## 🔑 Schritt 2: Kostenlose Accounts einrichten (5 Min)

### InstantDB (Datenbank - 1 Min)
1. Öffne: https://instantdb.com/dash
2. "Sign up" → Mit GitHub oder Email
3. "Create App" → Name: "Catering App"
4. Kopiere die **APP_ID**
5. Füge in `.env.local` ein:
   ```
   NEXT_PUBLIC_INSTANT_APP_ID=paste_hier
   ```

### OCR.space (Kassenbon-Scanner - 1 Min)
1. Öffne: https://ocr.space/ocrapi
2. "Register for free API key"
3. Email eingeben → **API-Key erscheint sofort**
4. Füge in `.env.local` ein:
   ```
   OCR_API_KEY=paste_hier
   ```

### Vercel (Hosting + Storage - 3 Min)
1. Öffne: https://vercel.com
2. "Sign up" → Mit GitHub
3. **Blob Storage erstellen:**
   - Dashboard → Storage → Create Database
   - Wähle "Blob"
   - Name: "catering-images"
   - Kopiere **BLOB_READ_WRITE_TOKEN**
4. Füge in `.env.local` ein:
   ```
   BLOB_READ_WRITE_TOKEN=paste_hier
   ```

## 📊 Schritt 3: Datenbank-Schema hochladen (1 Min)

1. Zurück zu InstantDB Dashboard
2. Klicke auf deine App
3. Menü: "Schema"
4. Öffne `instantdb-schema.json` in einem Editor
5. **Kopiere den kompletten Inhalt**
6. Füge in InstantDB Schema Editor ein
7. "Save Schema"

## ▶️ Schritt 4: App starten (1 Min)

```bash
# Development Server starten
npm run dev
```

🎉 **Fertig!** Öffne: http://localhost:3000

## ✅ Testen:

1. **Kassenbon scannen:**
   - Klicke "Kassenbon scannen"
   - Lade ein Foto hoch
   - Warte ~3 Sekunden
   - Zutaten erscheinen automatisch in der Datenbank!

2. **Zutatendatenbank:**
   - Klicke "Zutaten"
   - Alle gescannten Produkte mit Preisen
   - Gruppiert nach Laden

3. **Einkaufsliste:**
   - Klicke "Liste"
   - (Aktuell leer - später: Aus Rezepten befüllen)

## 📱 Als Mobile App installieren:

**iPhone/iPad:**
1. Öffne Safari → http://localhost:3000
2. Teilen-Button → "Zum Home-Bildschirm"
3. App erscheint wie native App!

**Android:**
1. Chrome → http://localhost:3000
2. Menü → "Zum Startbildschirm hinzufügen"

## 🌍 Online deployen (Optional - 2 Min):

```bash
# In Vercel deployen (kostenlos)
npx vercel

# Folge den Prompts:
# - Link to existing project? → No
# - Project name? → catering-app
# - Deploy? → Yes
```

Nach Deployment:
1. Vercel gibt dir eine URL: `catering-app.vercel.app`
2. Füge in Vercel Dashboard die Env-Variablen hinzu:
   - Settings → Environment Variables
   - Füge alle 3 Variablen aus `.env.local` hinzu

## ⚙️ Troubleshooting:

**"npm install" schlägt fehl:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**"Module not found" Fehler:**
```bash
npm install @instantdb/react @vercel/blob lucide-react
```

**OCR funktioniert nicht:**
- Prüfe `OCR_API_KEY` in `.env.local`
- Kassenbon muss gut lesbar sein
- Internet-Verbindung aktiv?

**InstantDB Fehler:**
- Prüfe `NEXT_PUBLIC_INSTANT_APP_ID`
- Schema im Dashboard gespeichert?
- Browser-Console für Details öffnen (F12)

## 💡 Nächste Schritte:

1. ✅ Teste mit echten Kassenbons
2. ✅ Schaue dir alle Features an
3. ✅ Lies `COPILOT_PROMPTS.xml` für neue Features
4. ✅ Baue Custom-Features mit Copilot

## 🆘 Hilfe benötigt?

- `README.md` → Vollständige Dokumentation
- `KOSTENLOS_SETUP.md` → Details zu kostenlosen Alternativen
- `SYSTEM_DOCUMENTATION.xml` → Technische Architektur
- `COPILOT_PROMPTS.xml` → Code-Anweisungen für neue Features

**Viel Spaß! 🎉**
