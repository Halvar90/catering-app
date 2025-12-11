# Setup-Befehle für Catering-App

## Kopiere diese Befehle nacheinander in dein Terminal:

```bash
# 1. Next.js Projekt initialisieren
npx create-next-app@latest catering-app --typescript --tailwind --app --no-src-dir

# 2. In Projekt-Ordner wechseln
cd catering-app

# 3. Benötigte Packages installieren
npm install @instantdb/react lucide-react date-fns zustand

# 4. Entwicklungs-Dependencies installieren
npm install -D @types/node

# 5. Vercel Blob für Bild-Uploads (für Kassenbons & Fotos)
npm install @vercel/blob

# 6. (OPTIONAL) Tesseract.js für komplett kostenlose OCR
# npm install tesseract.js

# 7. Development Server starten
npm run dev
```

## InstantDB Setup:

1. Gehe zu https://instantdb.com/dash
2. Erstelle eine neue App
3. Kopiere deine APP_ID
4. Erstelle `.env.local` mit:
   ```
   NEXT_PUBLIC_INSTANT_APP_ID=your_app_id_here
   OCR_API_KEY=your_ocr_space_api_key_here
   BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
   ```

## OCR Setup (Kostenlos!):

**Option 1: OCR.space (Empfohlen) - 25.000 requests/Monat kostenlos**
1. Gehe zu https://ocr.space/ocrapi
2. Klicke "Register for free API key"
3. Email eingeben → Key wird sofort angezeigt
4. Kopiere Key in `.env.local` als `OCR_API_KEY`

**Option 2: Tesseract.js (100% kostenlos, unbegrenzt)**
1. Führe aus: `npm install tesseract.js`
2. Benenne um: `app/api/ocr-receipt-tesseract/route.ts` → `app/api/ocr-receipt/route.ts`
3. Kein API-Key nötig!

Siehe `KOSTENLOS_SETUP.md` für Details.

## Vercel Blob Setup:

1. Im Vercel Dashboard: Storage → Create Database → Blob
2. Kopiere den Token in `.env.local`

## InstantDB Schema im Dashboard einfügen:

Gehe zu InstantDB Dashboard → Schema Editor und füge das Schema aus `instantdb-schema.json` ein.
