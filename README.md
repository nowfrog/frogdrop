<p align="center">
  <img src="logo.png" alt="FROGDROP" width="120" />
</p>

<h1 align="center">FROGDROP</h1>
<p align="center"><strong>Drop your listings everywhere.</strong></p>
<p align="center">
  A multi-platform listing manager for eBay, Vinted, and Wallapop with AI-powered listing generation.
</p>

<p align="center">
  <a href="https://github.com/nowfrog/frogdrop/releases/latest">
    <img src="https://img.shields.io/github/v/release/nowfrog/frogdrop?style=flat-square" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <a href="https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID&business=andrea_morana@hotmail.it">
    <img src="https://img.shields.io/badge/Donate-PayPal-blue?style=flat-square&logo=paypal" alt="Donate" />
  </a>
</p>

---

## Screenshots

<!-- Add your screenshots here -->
| Store Selector | Listing Editor | Upload View |
|:-:|:-:|:-:|
| ![Store Selector](docs/screenshots/store-selector.png) | ![Editor](docs/screenshots/editor.png) | ![Upload](docs/screenshots/upload.png) |

---

## Features

### Multi-Platform Selling
- **eBay** — Full API integration: create, edit, publish, sync, and manage listings directly
- **Vinted** — Built-in browser for uploading with drag & drop photo support
- **Wallapop** — Built-in browser with assisted upload workflow
- **Etsy** — Work in progress

### AI-Powered Listing Generation
- Uses **Claude Code** to automatically generate titles, descriptions, prices, categories, and item specifics from photos
- Batch processing — drop multiple sets of photos and generate listings for all of them at once
- Smart prompts with configurable language per store

### LEGO Part Recognizer
- Automatically identifies LEGO parts from photos
- Fetches part data and 3D renders from BrickLink/Rebrickable
- Bulk LEGO listing workflow optimized for part sellers

### Built-in Tools
- **File Explorer** — Browse and drag photos directly into listings
- **YouTube Player** — Watch videos while you work, with built-in ad blocker and in-panel fullscreen
- **Claude Code Terminal** — Integrated terminal for AI interactions

### Smart Photo Management
- Drag & drop with reordering
- Lazy-loaded thumbnails for fast browsing with large inventories
- Batch photo rendering in incremental chunks

### Modern UI
- 5 themes: Dark, Light, Gray, High Contrast, Televideo
- 11 languages: English, Italian, German, Spanish, French, Japanese, Dutch, Polish, Portuguese, Swedish
- Responsive layout with resizable panels
- Configurable shop name displayed in the store selector

### Data Management
- Full backup & restore (export/import all listings + photos as ZIP)
- Portable — runs from any folder (USB drive, cloud sync, etc.)
- Per-store listing language settings

---

## Download

### Portable (recommended)
Download **[FROGDROP-1.0.0-portable.exe](https://github.com/nowfrog/frogdrop/releases/latest)** — double-click and run. No installation needed.

### Installer
Download **[FROGDROP-1.0.0-setup.exe](https://github.com/nowfrog/frogdrop/releases/latest)** — traditional Windows installer with Start Menu shortcut.

---

## Getting Started

### Option 1: Download the .exe (easiest)
1. Download the portable or installer from [Releases](https://github.com/nowfrog/frogdrop/releases/latest)
2. Run it
3. On the splash screen, install Claude Code if prompted (optional, needed for AI generation)
4. Set your shop name in Settings
5. Start listing!

### Option 2: Run from source
```bash
git clone https://github.com/nowfrog/frogdrop.git
cd frogdrop
npm install
npm start
```

### Requirements
- **Node.js 18+** — required if running from source, bundled in the .exe
- **Claude Code** (optional) — for AI-powered listing generation
  ```bash
  npm install -g @anthropic-ai/claude-code
  ```

### eBay API Setup
To use eBay integration, you need API credentials from [developer.ebay.com](https://developer.ebay.com):
1. Create an application to get your App ID, Cert ID, and Dev ID
2. Enter them in the eBay setup wizard on first launch

---

## Tech Stack
- **Electron** — Desktop application framework
- **Claude Code** — AI listing generation
- **xterm.js** — Integrated terminal
- **node-pty** — Terminal process management

---

## Support the Project

If FROGDROP helps you sell faster, consider buying me a coffee!

<a href="https://paypal.me/andreamorana">
  <img src="https://img.shields.io/badge/Donate-PayPal-blue?style=for-the-badge&logo=paypal" alt="Donate with PayPal" />
</a>

---

## License

[MIT](LICENSE)

---

<p align="center">
  Made with 🐸 by <a href="https://github.com/nowfrog">nowfrog</a>
</p>
