# NOWFROG SHOP

Electron app for creating eBay.it listings using Claude Code to analyze product photos.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm start
   ```

3. On first launch, enter your eBay Developer API credentials (get them at developer.ebay.com)

4. Make sure Claude Code CLI is installed and available in your PATH

## Usage

### Single Listing
1. Drag & drop product photos into the drop zone
2. Click "Generate Listing with Claude" -- Claude Code analyzes the photos and fills in title, description, etc.
3. Edit the suggested price, shipping, condition, and other fields
4. Click "Publish to eBay"

### Batch Mode
1. Switch to "Batch Mode" tab
2. Click "+ Add Item Slot" for each item
3. Drag & drop photos into each slot
4. Click "Generate All" to process all items
5. Review and edit each listing
6. Click "Publish All" or publish individually

## Requirements
- Node.js 18+
- Claude Code CLI installed
- eBay Developer account with API keys (free at developer.ebay.com)

## eBay API Setup
1. Register at developer.ebay.com
2. Create an application to get your keyset (App ID, Dev ID, Cert ID)
3. Set up a RuName (Redirect URI) for OAuth
4. Enter credentials in the app's setup wizard on first launch

## Tech Stack
- Electron + node-pty + xterm.js
- Vanilla HTML/CSS/JS
- eBay Trading API (AddItem, UploadSiteHostedPictures)
- Target marketplace: eBay.it
