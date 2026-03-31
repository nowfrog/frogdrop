<p align="center">
  <img src="logo.png" alt="FROGDROP" width="120" />
</p>

<h1 align="center">FROGDROP</h1>
<p align="center"><strong>Drop your listings everywhere.</strong></p>
<p align="center">
  The all-in-one desktop app for resellers. Manage your eBay, Vinted, Wallapop, and Etsy listings from a single interface, with AI that writes your listings for you.
</p>

<p align="center">
  <a href="https://github.com/nowfrog/frogdrop/releases/latest">
    <img src="https://img.shields.io/github/v/release/nowfrog/frogdrop?style=flat-square" alt="Release" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" />
  <a href="https://paypal.me/nowfrog">
    <img src="https://img.shields.io/badge/Donate-PayPal-blue?style=flat-square&logo=paypal" alt="Donate" />
  </a>
</p>

<p align="center">
  <a href="#download"><strong>Download</strong></a> · <a href="#features"><strong>Features</strong></a> · <a href="#getting-started"><strong>Getting Started</strong></a> · <a href="#support-the-project"><strong>Donate</strong></a>
</p>


## Overview

FROGDROP is a free, open-source desktop application built for resellers who list products on multiple platforms. Instead of switching between browser tabs, copying and pasting titles and descriptions, and uploading the same photos over and over, you do everything from one place.

Drop your photos in, let AI generate professional listings in seconds, then publish to eBay or Etsy with one click, or drag info into Vinted and Wallapop's built-in browsers. That's it.

**Choose your AI engine:** FROGDROP supports both **Claude Code** (Anthropic) and **Gemini CLI** (Google). Pick the one you prefer on first launch, or switch anytime from settings.

<!-- SCREENSHOT: full app overview showing the store selector or a listing being edited -->
<p align="center">
  <img src="docs/screenshots/overview.png" alt="FROGDROP Overview" width="800" />
</p>


## Download

| Version | Description | Link |
|---------|-------------|------|
| **Portable** (recommended) | Single .exe file. No installation. Double-click and run. | [**Download**](https://github.com/nowfrog/frogdrop/releases/latest) |
| **Installer** | Traditional Windows setup with Start Menu shortcut. | [**Download**](https://github.com/nowfrog/frogdrop/releases/latest) |
| **Source** | Run from source code with Node.js. | See [Getting Started](#run-from-source) |

> **Note:** Windows may show a SmartScreen warning since the app isn't code-signed. Click "More info" then "Run anyway". This is normal for open-source apps.


## Features

###  🏪 Multi-Platform Selling

Sell on all the major second-hand platforms from one app:

- **eBay** has full API integration. Create listings, upload photos, set prices, categories, item specifics, and shipping options, then publish directly without opening a browser. You can also edit and sync existing listings, and track published/draft status.
- **Etsy** has full API integration. Create listings with taxonomy-based categories, structured properties, tags, materials, shipping profiles, and return policies. Publish, edit, and sync directly from the app.
- **Vinted** uses a built-in browser with your listing data on the left panel. Copy title, description, and price with one click, and drag photos directly into Vinted's upload form.
- **Wallapop** works the same way as Vinted, with a built-in browser, assisted upload, and photo drag & drop.

<!-- SCREENSHOT: store selector page showing all platforms -->
<p align="center">
  <img src="docs/screenshots/store-selector.png" alt="Store Selector" width="600" />
</p>

###  🤖 AI-Powered Listing Generation

Stop writing titles and descriptions manually. Drop your photos and let AI do the work:

1. **Drop photos** of your item into the app
2. **Click "Generate"** and the AI analyzes the photos and creates a complete listing
3. **Review and publish** the result: title, description, price suggestion, condition, category, and item specifics are all generated automatically

**Choose your AI engine:** On first launch, FROGDROP asks you to pick between **Claude Code** (Anthropic) and **Gemini CLI** (Google). Both are fully supported with engine-specific tool instructions for maximum accuracy. You can switch anytime from General Settings.

The AI can make mistakes, but that's the point: everything is in one screen. The generated listing, the editor, the photos, and the terminal are all right there. You can review, tweak the wording, adjust the price, fix any detail, and refine the style before publishing. No switching tabs, no copy-pasting between apps.

Works in **any language**. You can generate listings in English, Italian, French, German, or any of the 11 supported languages. Each store can have its own listing language.

<!-- SCREENSHOT: the batch listing view with photos on left, generate button, and preview on right -->
<p align="center">
  <img src="docs/screenshots/ai-generation.png" alt="AI Listing Generation" width="700" />
</p>

**Batch processing:** Drop multiple sets of photos at once. Each set becomes a separate listing. Generate all of them in one go.

<!-- SCREENSHOT: batch articles grid with multiple listings being generated -->
<p align="center">
  <img src="docs/screenshots/batch-listing.png" alt="Batch Listing" width="700" />
</p>

###  🧱 LEGO Part Recognizer

Built specifically for LEGO resellers:

- Drop a photo of a LEGO part and the AI identifies the **part number, color, and name**
- The app automatically fetches **3D renders** from BrickLink/Rebrickable and adds them to your listing photos
- Generate dozens of LEGO part listings at once with accurate part data using the bulk workflow
- Filter your listings by LEGO parts and refresh all renders in one click

<!-- SCREENSHOT: a LEGO listing showing the part recognition and 3D render -->
<p align="center">
  <img src="docs/screenshots/lego-recognizer.png" alt="LEGO Recognizer" width="600" />
</p>

###  📝 Full Listing Editor

Every listing field you need, in one clean form:

- Title with live character count
- Description with HTML preview
- Category search and selection (eBay category tree)
- Condition and condition description
- Price and quantity
- Item specifics, auto-loaded from eBay based on the selected category
- Shipping options including service, cost, and free shipping toggle
- Photo management with drag-to-reorder

<!-- SCREENSHOT: the listing edit form with all fields visible -->
<p align="center">
  <img src="docs/screenshots/editor.png" alt="Listing Editor" width="700" />
</p>

###  📸 Smart Photo Management

- **Drag & drop** photos from your file system or from the built-in file explorer
- **Reorder** photos by dragging them within the listing
- **Set main photo** with one click
- **Lazy-loaded thumbnails** keep the app fast even with hundreds of listings
- **Auto-resize** ensures photos are automatically optimized for upload

###  🔄 Vinted & Wallapop Upload

A split-view workflow designed for speed:

- **Left panel** shows your ready listings with all data: title, description, price, and photos
- **Right panel** shows the platform's website in a built-in browser
- Copy title, description, or price to clipboard with **one click**
- **Drag photos** directly from the listing card into the upload form
- **Mark as published** when done to keep track of what you've already uploaded

<!-- SCREENSHOT: Vinted upload split view with listings on left and browser on right -->
<p align="center">
  <img src="docs/screenshots/upload-vinted.png" alt="Vinted Upload" width="700" />
</p>

###  📂 Built-in File Explorer

Browse your photo folders without leaving the app:

- Navigate directories with a breadcrumb path
- See image thumbnails as you browse
- Select multiple photos and drag them into listings
- Resizable panel so you can adjust how much space it takes

<!-- SCREENSHOT: the file explorer panel showing photo thumbnails -->
<p align="center">
  <img src="docs/screenshots/file-explorer.png" alt="File Explorer" width="400" />
</p>

###  🎬 YouTube Player

Watch videos while you work:

- Built-in YouTube browser in a resizable panel
- Search YouTube or paste a URL directly in the search bar
- **Ad blocker** included, so no interruptions
- **In-panel fullscreen** fills only the YouTube panel, not the whole app
- Persistent session so you stay logged in

###  🎨 Themes & Languages

Make it yours:

| Dark (default) | Light | Gray | High Contrast | Televideo |
|:-:|:-:|:-:|:-:|:-:|
| ![Dark](docs/screenshots/theme-dark.png) | ![Light](docs/screenshots/theme-light.png) | ![Gray](docs/screenshots/theme-gray.png) | ![HC](docs/screenshots/theme-hc.png) | ![TV](docs/screenshots/theme-tv.png) |

**11 languages supported:** English, Italian, German, Spanish, French, Japanese, Dutch, Polish, Portuguese, and Swedish. Each store can generate listings in a different language.

###  💾 Backup & Restore

Never lose your work:

- **Export** all your listings and photos as a single ZIP file
- **Import** a backup to restore everything, including listings, photos, and settings
- Works across machines: export from one PC, import on another

###  📋 Bulk Operations

Manage large inventories efficiently:

- **Bulk select** listings with checkboxes
- **Bulk edit** to change shipping, price, or other fields across multiple listings at once
- **Bulk publish** multiple eBay listings in one go
- **Bulk delete** to clean up published or unwanted listings
- Switch between **grid or list view** depending on your preference



## Getting Started

###  Download and Run (easiest)

1. Download **FROGDROP-portable.exe** from [Releases](https://github.com/nowfrog/frogdrop/releases/latest)
2. Double-click to run (no installation needed)
3. The **splash screen** checks your system:
   - ✅ **Node.js** is detected automatically
   - ⚠️ **Claude Code**: if not installed, click **"Install Claude Code"** to install it
   - ⚠️ **Gemini CLI**: if not installed, click **"Install Gemini CLI"** to install it
   - You need at least one AI engine installed for AI features to work
4. **Choose your AI engine**: if both Claude Code and Gemini CLI are installed, the app asks you to pick one on first launch
5. Click **Enter** to open the app
6. Go to **Settings** (gear icon) and set your **shop name**
7. Choose a platform and start listing!

<!-- SCREENSHOT: splash screen showing dependency checks -->
<p align="center">
  <img src="docs/screenshots/splash-screen.png" alt="Splash Screen" width="400" />
</p>

###  Run from Source

```bash
# Clone the repository
git clone https://github.com/nowfrog/frogdrop.git
cd frogdrop

# Install dependencies
npm install

# Launch the app
npm start
```

###  Requirements

| Requirement | For .exe | For source |
|------------|----------|------------|
| **Windows 10/11** | ✅ Required | ✅ Required |
| **Node.js 18+** | ❌ Bundled | ✅ [Download](https://nodejs.org) |
| **Claude Code** | ⚡ Optional | ⚡ Optional |
| **Gemini CLI** | ⚡ Optional | ⚡ Optional |

You need **at least one AI engine** (Claude Code or Gemini CLI) for AI-powered listing generation. Without either, you can still create and manage listings manually.

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# OR install Gemini CLI globally
npm install -g @google/gemini-cli
```

###  eBay API Setup

To publish listings directly to eBay, you need free API credentials:

1. Go to [developer.ebay.com](https://developer.ebay.com) and create an account
2. Create a new application (choose "Production" environment)
3. Note your **App ID (Client ID)**, **Dev ID**, and **Cert ID (Client Secret)**
4. Set up a **RuName (Redirect URI)** in your application settings
5. In FROGDROP, click on **eBay** and enter your credentials in the setup wizard
6. Click **"Save & Connect"** to authorize the app with your eBay account

###  Etsy API Setup

To publish listings directly to Etsy:

1. Go to [etsy.com/developers](https://www.etsy.com/developers) and create an app
2. Note your **API Key (Keystring)**
3. In FROGDROP, click on **Etsy** and enter your API key and Shop ID
4. Click **"Connect"** to authorize with OAuth2 (PKCE flow, no client secret needed)

> Vinted and Wallapop don't require API keys. They use the built-in browser for uploading.


## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Drop Photos │ ──→ │  AI Engine    │ ──→ │  Complete Listing│
│  into app    │     │  Claude Code  │     │  title, desc,   │
│              │     │  or Gemini CLI│     │  price, specs   │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                    ┌──────────────────────────────┼──────────────────────────────┐
                    ▼                              ▼                              ▼
             ┌─────────────┐          ┌──────────────────┐          ┌──────────────┐
             │  eBay / Etsy │          │      Vinted      │          │   Wallapop   │
             │  API publish │          │   drag & drop    │          │  drag & drop │
             │  one-click   │          │   in browser     │          │  in browser  │
             └─────────────┘          └──────────────────┘          └──────────────┘
```


## Data Storage

| Mode | Data location |
|------|--------------|
| **Portable .exe** | `%APPDATA%\FROGDROP\` |
| **Installer** | `%APPDATA%\FROGDROP\` |
| **From source** | `./appdata/` in the project folder |

Data includes the listings database, photos, platform sessions (Vinted/Wallapop/YouTube cookies), and app settings.


## Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Electron](https://www.electronjs.org/) | Desktop application framework |
| [Claude Code](https://claude.com/product/claude-code) | AI-powered listing generation (Anthropic) |
| [Gemini CLI](https://geminicli.com/) | AI-powered listing generation (Google) |
| [xterm.js](https://xtermjs.org/) | Integrated terminal emulator |
| [node-pty](https://github.com/microsoft/node-pty) | Terminal process management |
| [electron-store](https://github.com/sindresorhus/electron-store) | Persistent JSON storage |


## Contributing

Contributions are welcome! Feel free to:

- 🐛 [Report bugs](https://github.com/nowfrog/frogdrop/issues)
- 💡 [Request features](https://github.com/nowfrog/frogdrop/issues)
- 🔧 Submit pull requests


## Who Is This For?

FROGDROP is designed for **casual and semi-professional resellers** who want to speed up the process of listing items across multiple platforms. If you're selling clothes, electronics, collectibles, LEGO parts, or anything else on eBay, Etsy, Vinted, or Wallapop, this tool will save you a lot of time.

**What FROGDROP is great at right now:**
- Quickly creating listings with AI-generated titles, descriptions, and prices
- Publishing directly to eBay and Etsy via API
- Managing photos and uploading to Vinted and Wallapop from one place
- Keeping track of what you've listed and where
- Choosing between Claude Code and Gemini CLI as your AI engine

**What FROGDROP does not include yet:**
- Tax management or invoicing
- Inventory tracking with stock levels
- Order management or shipping label generation
- Sales analytics and revenue reports
- Multi-user or team support

These features are planned for future versions. See the roadmap below.


## Roadmap

FROGDROP is actively developed. Here's what's planned to evolve it into a complete tool for professional resellers:

### v1.x (near term)
- [x] Etsy full integration
- [x] Dual AI engine support (Claude Code + Gemini CLI)
- [ ] Improved responsive layout for smaller screens
- [ ] Auto-updater (check for new versions from within the app)
- [ ] macOS and Linux builds

### v2.x (mid term)
- [ ] **Inventory management** with stock tracking across platforms
- [ ] **Order management** to view and manage sales from all platforms in one place
- [ ] **Sales dashboard** with revenue, fees, and profit analytics
- [ ] **Shipping integration** with label generation (GLS, Poste Italiane, DHL, etc.)
- [ ] **Template system** for reusable listing templates
- [ ] Cross-listing: publish the same item to multiple platforms simultaneously

### v3.x (long term)
- [ ] **Tax management** with invoicing and fiscal reports
- [ ] **Multi-user support** for teams and shops with multiple operators
- [ ] **Accounting integration** (export to CSV/Excel, connect to accounting software)
- [ ] **Mobile companion app** to manage listings on the go
- [ ] Plugin system for custom platform integrations

Have a feature request? [Open an issue](https://github.com/nowfrog/frogdrop/issues) and let us know what you need.


## Support the Project

FROGDROP is free and open-source. If it helps you sell faster and earn more, consider supporting its development:

<p align="center">
  <a href="https://paypal.me/nowfrog">
    <img src="https://img.shields.io/badge/Donate_via_PayPal-00457C?style=for-the-badge&logo=paypal&logoColor=white" alt="Donate with PayPal" />
  </a>
</p>


## License

[MIT](LICENSE). Free to use, modify, and distribute.

<p align="center">
  Made with 🐸 by <a href="https://github.com/nowfrog">nowfrog</a>
</p>
