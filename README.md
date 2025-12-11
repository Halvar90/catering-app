# Catering Manager App 🍽️

Professionelle Catering-Verwaltung mit automatischer Kassenbonauswertung, Rezeptverwaltung und Preiskalkulation.

## Features ✨

### ✅ Bereits implementiert:
- 📸 **Kassenbon-Scanner** - Fotografiere Belege und extrahiere automatisch alle Zutaten
- 🥘 **Zutatendatenbank** - Alle Lebensmittel mit automatischer Preisumrechnung (pro kg, pro 100g, etc.)
- 📚 **Rezeptverwaltung** - Erstelle Rezepte und berechne automatisch Kosten pro Portion
- 💰 **Profit-Margin Rechner** - Empfohlene und individuelle Margen für Verkaufspreise
- 🛒 **Einkaufsliste** - Intelligente Liste nach Läden gruppiert mit Preisen
- 📦 **Inventar-Verwaltung** - Bestandsübersicht mit MHD-Tracking und Warnungen
- 📱 **Mobile-optimiert** - PWA (Progressive Web App) für mobile Geräte
- ⚡ **Schnell & Echtzeit** - InstantDB für sofortige Updates

### 🚧 Noch zu implementieren:
- AI-Bildgenerierung für Rezepte
- Rezept-Upload via Foto mit automatischer Texterkennung
- Statistiken & Dashboard
- Event-Planung
- PDF-Export

## Tech Stack 🛠️

- **Frontend**: Next.js 14 + React + TypeScript
- **UI**: Tailwind CSS
- **Datenbank**: InstantDB (Echtzeit)
- **Storage**: Vercel Blob (Bilder)
- **OCR**: OCR.space API (25.000 requests/Monat KOSTENLOS) oder Tesseract.js (unbegrenzt kostenlos)
- **Hosting**: Vercel

**💰 Gesamtkosten: 0€/Monat** - Alles kostenlos!

## Setup 🚀

### 1. Projekt erstellen
```bash
# Folge den Anweisungen in SETUP_PROMPTS.md
```

### 2. Umgebungsvariablen
Kopiere `.env.example` zu `.env.local` und fülle aus:
```bash
NEXT_PUBLIC_INSTANT_APP_ID=xxx
OCR_API_KEY=xxx  # OCR.space (kostenlos) oder leer lassen für Tesseract.js
BLOB_READ_WRITE_TOKEN=xxx
```

**OCR Setup - Du hast 2 kostenlose Optionen:**

**Option A: OCR.space (Empfohlen)**
- Gehe zu https://ocr.space/ocrapi
- Registriere kostenlos
- Kopiere API-Key
- 25.000 requests/Monat kostenlos

**Option B: Tesseract.js (100% kostenlos)**
- `npm install tesseract.js`
- Kein API-Key nötig
- Unbegrenzte Nutzung

Siehe `KOSTENLOS_SETUP.md` für detaillierte Anleitung!

### 3. InstantDB Schema
- Gehe zu https://instantdb.com/dash
- Erstelle eine neue App
- Füge das Schema aus `instantdb-schema.json` im Schema Editor ein

### 4. Starten
```bash
npm install
npm run dev
```

Die App läuft auf http://localhost:3000

## Projektstruktur 📁

```
catering-app/
├── app/
│   ├── api/
│   │   ├── upload/route.ts          # Bild-Upload
│   │   └── ocr-receipt/route.ts     # Kassenbon-OCR
│   ├── layout.tsx                    # Root Layout
│   ├── page.tsx                      # Hauptseite mit Navigation
│   └── globals.css                   # Globale Styles
├── components/
│   ├── ReceiptUpload.tsx            # Kassenbon-Scanner
│   ├── IngredientsList.tsx          # Zutatendatenbank
│   ├── RecipesList.tsx              # Rezepte mit Margin-Rechner
│   ├── ShoppingList.tsx             # Einkaufsliste
│   └── Inventory.tsx                # Inventar mit MHD
├── lib/
│   ├── instantdb.ts                 # DB-Konfiguration
│   └── utils.ts                     # Hilfsfunktionen
└── public/
    └── manifest.json                # PWA-Manifest
```

## Features im Detail 🔍

### Kassenbon-Scanner
- Fotografiere oder lade Kassenbons hoch
- Claude OCR extrahiert automatisch:
  - Produktnamen
  - Preise
  - Mengen & Einheiten
  - Geschäft/Laden
- Alle Preise werden automatisch umgerechnet (pro kg, pro 100g, etc.)

### Profit-Margin Rechner
- Automatische Berechnung der Rezeptkosten
- Empfohlene Marge basierend auf Kosten:
  - < 2€: 300% Marge
  - 2-5€: 250% Marge
  - 5-10€: 200% Marge
  - > 10€: 150% Marge
- Individuelle Marge einstellbar mit Slider
- Zeigt Gewinn pro Portion und Gesamt

### Inventar-Management
- Bestandsübersicht mit aktuellen Mengen
- MHD-Tracking mit Warnungen:
  - ⚠️ Läuft in 7 Tagen ab
  - 🚨 Bereits abgelaufen
- Mindestbestand-Warnungen
- Notizen zu Zutaten

## Nächste Schritte für Copilot 🤖

Siehe `COPILOT_PROMPTS.xml` für XML-formatierte Anweisungen.

## Support 💬

Bei Fragen oder Problemen erstelle ein Issue oder melde dich!
