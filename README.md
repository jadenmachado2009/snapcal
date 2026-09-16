# SnapCal

A small calorie tracker: photograph a meal and Gemini estimates its calories and macros.

Live: https://snapcal-pi.vercel.app

## Features
- Scan a meal by photo, describe it in words, or scan a barcode
- Daily calories and macros against goals worked out from your stats
- Edit any result, adjust servings, or ask the AI to fix an estimate
- Weight log with chart, target weight, projected date, BMI and a logging streak
- Optional cloud backup and Apple Health burned calories, via a private Vercel Blob

## Why I built this

I track what I eat, but the apps that do it well are subscriptions, and most of what they
charge for is stuff I don't use: social streaks, exercise logging, progress photos, accounts.
Underneath, the part I actually wanted is one call to a vision model.

So I built the version I'd use: photograph a meal, get calories and macros back, correct the
estimate in plain English when it's wrong, scan a barcode for packaged food, and watch my
weight move toward a target. It runs on my own Vercel project with my own Gemini key, stores
meals on my phone, and backs them up to storage I own. The interesting problems weren't the
AI call — they were estimating portions from a photo, keeping the interface to two taps, and
deciding what to leave out.

Built with [Claude Code](https://claude.com/claude-code) (Claude Opus 5) doing the
implementation, with me directing the design, scope and testing.

## Disclaimer

SnapCal is a personal project, provided as is. **It is not medical, nutritional, dietary or
health advice.**

- Calorie and macro figures are **AI estimates** from a photo or description, and barcode
  figures come from a crowd-sourced database. Both are frequently wrong. Do not rely on them
  for anything that matters medically.
- Not suitable for managing diabetes, allergies, eating disorders, or any medical condition.
  Nothing here accounts for allergens or ingredients.
- Goal calories come from a standard formula (Mifflin-St Jeor), not from any assessment of you.
- Talk to a doctor or registered dietitian before changing how you eat, especially if you are
  under 18, pregnant, or have a health condition.
- Use at your own risk. See the warranty and liability disclaimer in [LICENSE](LICENSE).

Not affiliated with, endorsed by, or connected to Cal AI, Hevy, Apple, Google or Vercel.
Product names belong to their owners.

## Privacy

Meals, weights and goals stay in your browser's local storage. Nothing is sent anywhere except:
photos and descriptions you scan, which go to the Google Gemini API for analysis; barcodes,
which go to Open Food Facts; and, if you switch on cloud backup or Apple Health sync, your data,
which goes to your own private Vercel Blob store. There is no analytics or tracking, and the
developer has no access to your data.

## Credits and licences

- Code in this repository: MIT, see [LICENSE](LICENSE).
- Barcode scanning: [ZXing for JS](https://github.com/zxing-js/library), Apache 2.0.
- Barcode nutrition data: [Open Food Facts](https://world.openfoodfacts.org), database licensed
  under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/); individual
  facts under the Database Contents Licence. Attribution required if you reuse the data.
- Meal analysis: Google Gemini API, subject to Google's terms.

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
