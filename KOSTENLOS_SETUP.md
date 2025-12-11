# 🆓 KOSTENLOSE OCR-OPTIONEN - Setup Guide

Du hast zwei komplett kostenlose Optionen für OCR:

## Option 1: OCR.space API (Empfohlen) ⭐

**Vorteile:**
- ✅ 25.000 requests pro Monat KOSTENLOS
- ✅ Sehr gute Erkennungsqualität
- ✅ Speziell optimiert für Belege und Rechnungen
- ✅ Keine Kreditkarte nötig

**Setup:**

### Schritt 1: API-Key holen
1. Gehe zu: https://ocr.space/ocrapi
2. Klicke auf "Register for free API key"
3. Gib deine Email ein (keine Bestätigung nötig!)
4. Du bekommst sofort einen API-Key angezeigt

### Schritt 2: In .env.local eintragen
```bash
OCR_API_KEY=dein_api_key_hier
```

### Schritt 3: Fertig! 🎉
Die App nutzt bereits OCR.space - kein Code-Änderungen nötig.

**Limits:**
- Free Tier: 25.000 requests/Monat
- Rate Limit: Keine Beschränkung
- Max Dateigröße: 1MB
- Das reicht locker für normale Nutzung!

---

## Option 2: Tesseract.js (100% kostenlos, für immer)

**Vorteile:**
- ✅ Komplett kostenlos, keine Limits
- ✅ Läuft direkt im Browser/Server
- ✅ Keine API-Keys nötig
- ⚠️ Etwas schlechtere Qualität bei komplexen Belegen

**Setup:**

### Schritt 1: Tesseract.js installieren
```bash
npm install tesseract.js
```

### Schritt 2: OCR-Route aktivieren
```bash
# Benenne die alternative Route um
mv app/api/ocr-receipt-tesseract/route.ts app/api/ocr-receipt/route.ts
```

### Schritt 3: ReceiptUpload.tsx anpassen
In `components/ReceiptUpload.tsx`, Zeile 24:
```typescript
// Ändere diese Zeile:
const ocrResponse = await fetch('/api/ocr-receipt', {
```

### Schritt 4: Keine API-Keys nötig!
Du brauchst keine `.env` Einträge für OCR. Fertig! 🎉

**Performance-Tipp:**
- Tesseract ist etwas langsamer (5-10 Sekunden pro Bild)
- Dafür komplett kostenlos und offline-fähig!

---

## Vergleich: OCR.space vs Tesseract.js

| Feature | OCR.space | Tesseract.js |
|---------|-----------|--------------|
| **Kosten** | Kostenlos (25k/Monat) | Kostenlos (unbegrenzt) |
| **Qualität** | ⭐⭐⭐⭐⭐ Sehr gut | ⭐⭐⭐⭐ Gut |
| **Geschwindigkeit** | ⚡ Schnell (2-3 Sek) | 🐌 Langsamer (5-10 Sek) |
| **Setup** | API-Key nötig | Keine Config |
| **Kassenbon-Erkennung** | ⭐⭐⭐⭐⭐ Excellent | ⭐⭐⭐⭐ Gut |
| **Handschrift** | ⭐⭐⭐ Okay | ⭐⭐ Schwierig |
| **Offline** | ❌ Nein | ✅ Ja |

---

## Meine Empfehlung:

**Starte mit OCR.space** - es ist schneller und besser für Kassenbons.

Wenn du die 25.000 requests/Monat überschreitest (sehr unwahrscheinlich), 
wechsel einfach zu Tesseract.js. Beide Lösungen sind bereits im Code!

---

## Bildgenerierung (Optional)

Für Rezept-Bilder hast du auch kostenlose Optionen:

### Option A: Manuelle Uploads (Empfohlen)
- Lade eigene Fotos hoch
- Kein Setup nötig
- Bereits implementiert in der App

### Option B: Unsplash API (Kostenlos)
- 50 requests/Stunde kostenlos
- Hochwertige Food-Fotos
- API-Key: https://unsplash.com/developers

```bash
# In .env.local
UNSPLASH_ACCESS_KEY=dein_key_hier
```

### Option C: Hugging Face (Kostenlos, aber langsam)
- Stable Diffusion via API
- Kostenlos aber langsam (30-60 Sekunden)
- API-Key: https://huggingface.co/settings/tokens

---

## Troubleshooting

**OCR.space gibt Fehler:**
- Prüfe ob API-Key in `.env.local` ist
- Max Dateigröße: 1MB (Bilder vorher komprimieren)
- Check Limit: https://ocr.space/ocrapi (Dashboard)

**Tesseract.js ist zu langsam:**
- Normal! OCR braucht Zeit
- Zeige Loading-Indicator für 5-10 Sekunden
- Alternative: Nutze OCR.space

**Keine Zutaten erkannt:**
- Kassenbon muss gut lesbar sein
- Vermeide Schatten/Reflexionen beim Fotografieren
- Belege gerade fotografieren, nicht schräg
- Bei schlechter Qualität: Foto nochmal machen

---

## Kosten-Übersicht (alles kostenlos!)

```
✅ InstantDB Free Tier: 5GB Storage, unbegrenzte Requests
✅ Vercel Hosting: Kostenlos (Hobby Plan)
✅ Vercel Blob: 1GB kostenlos pro Monat
✅ OCR.space: 25.000 OCR-Requests/Monat
✅ Oder Tesseract.js: Unbegrenzt kostenlos
```

**Gesamtkosten: 0€/Monat** 🎉

Die App kann von deiner Schwester kostenlos genutzt werden, 
solange sie unter den Free-Tier Limits bleibt (was sehr wahrscheinlich ist).

---

## Nächste Schritte:

1. ✅ Entscheide: OCR.space oder Tesseract.js
2. ✅ Folge der Setup-Anleitung oben
3. ✅ Teste mit einem echten Kassenbon
4. ✅ Fertig!

Bei Fragen: Siehe README.md oder frag einfach! 💬
