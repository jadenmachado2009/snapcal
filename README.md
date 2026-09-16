# SnapCal

A small calorie tracker: photograph a meal and Gemini estimates its calories and macros.

Live: https://snapcal-pi.vercel.app

## Features
- Scan a meal by photo, describe it in words, or scan a barcode
- Daily calories and macros against goals worked out from your stats
- Edit any result, adjust servings, or ask the AI to fix an estimate
- Weight log with chart, target weight, projected date, BMI and a logging streak
- Optional cloud backup and Apple Health burned calories, via a private Vercel Blob

## Stack
Static HTML/CSS/JS (no build step) plus Vercel serverless functions.

| Endpoint | Does |
| --- | --- |
| `api/analyze.js` | Photo/text meal analysis with Gemini |
| `api/barcode.js` | Barcode lookup via Open Food Facts |
| `api/health.js` | Stores burned calories sent by an iOS Shortcut |
| `api/data.js` | Cloud backup of app state |

## Environment variables
- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional, pins a model)
- `ACCESS_CODE` (optional, locks the analyze endpoint)
- `BLOB_READ_WRITE_TOKEN` (added automatically by the Vercel Blob store)

Meals and weights are stored in the browser unless cloud backup is switched on.
