const https = require('https');
const fs = require('fs');
const path = require('path');

// Load settings from config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const settings = config.settings;
const token = config.ebayTokens && config.ebayTokens.access_token;

if (!token) {
  console.error('No access token found in config.json');
  process.exit(1);
}

function getCategories(levelLimit, pageNumber) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <DetailLevel>ReturnAll</DetailLevel>
  <ViewAllNodes>true</ViewAllNodes>
  <LevelLimit>${levelLimit}</LevelLimit>
</GetCategoriesRequest>`;

    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetCategories',
        'X-EBAY-API-APP-NAME': settings.ebayAppId,
        'X-EBAY-API-DEV-NAME': settings.ebayDevId,
        'X-EBAY-API-CERT-NAME': settings.ebayCertId,
        'Content-Type': 'text/xml',
        'Content-Length': body.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('Fetching all categories from eBay.it (SiteID 101)...');

  // Fetch full category tree (no level limit)
  const xml = await getCategories(0);

  // Check for errors
  const ackMatch = xml.match(/<Ack>(.*?)<\/Ack>/);
  if (ackMatch && ackMatch[1] === 'Failure') {
    const errMsg = (xml.match(/<ShortMessage>(.*?)<\/ShortMessage>/) || [])[1] || 'Unknown error';
    const longMsg = (xml.match(/<LongMessage>(.*?)<\/LongMessage>/) || [])[1] || '';
    console.error(`eBay API error: ${errMsg} - ${longMsg}`);
    process.exit(1);
  }

  // Parse all categories
  const catRegex = /<Category>([\s\S]*?)<\/Category>/g;
  const categories = {};
  let match;

  while ((match = catRegex.exec(xml)) !== null) {
    const block = match[1];
    const id = (block.match(/<CategoryID>(\d+)<\/CategoryID>/) || [])[1];
    const name = (block.match(/<CategoryName>(.*?)<\/CategoryName>/) || [])[1];
    const parentId = (block.match(/<CategoryParentID>(\d+)<\/CategoryParentID>/) || [])[1];
    const level = parseInt((block.match(/<CategoryLevel>(\d+)<\/CategoryLevel>/) || [])[1] || '0');
    const leaf = block.includes('<LeafCategory>true</LeafCategory>');

    if (id) {
      categories[id] = { id, name: decodeXml(name || ''), parentId, level, leaf };
    }
  }

  const totalCount = Object.keys(categories).length;
  console.log(`Total categories parsed: ${totalCount}`);

  // Build full paths for leaf categories only
  const leafCategories = [];
  for (const cat of Object.values(categories)) {
    if (!cat.leaf) continue;

    const parts = [];
    let current = cat;
    while (current) {
      parts.unshift(current.name);
      if (current.parentId && current.parentId !== current.id) {
        current = categories[current.parentId];
      } else {
        break;
      }
    }
    leafCategories.push({ id: cat.id, path: parts.join(' > ') });
  }

  console.log(`Leaf categories (valid for listings): ${leafCategories.length}`);

  // Sort by path
  leafCategories.sort((a, b) => a.path.localeCompare(b.path));

  // Write CSV
  const csvLines = ['CategoryID,Category Path'];
  for (const cat of leafCategories) {
    csvLines.push(`${cat.id},"${cat.path.replace(/"/g, '""')}"`);
  }

  const csvPath = path.join(__dirname, 'CategoryIDs.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
  console.log(`Written ${leafCategories.length} categories to CategoryIDs.csv`);

  // Also update .prompt.md if it embeds the category list
  const promptPath = path.join(__dirname, '.prompt.md');
  if (fs.existsSync(promptPath)) {
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    // Find the category list section and replace it
    const headerLine = 'CATEGORY LIST (pick the most appropriate CategoryID from this list):';
    const headerIdx = promptContent.indexOf(headerLine);
    if (headerIdx !== -1) {
      const beforeCategories = promptContent.substring(0, headerIdx + headerLine.length);
      const csvContent = csvLines.join('\n');
      const newPrompt = beforeCategories + '\n' + csvContent + '\n';
      fs.writeFileSync(promptPath, newPrompt, 'utf-8');
      console.log('Updated .prompt.md with new category list');
    }
  }
}

function decodeXml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
