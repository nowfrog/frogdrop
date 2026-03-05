const https = require('https');
const fs = require('fs');
const path = require('path');
const { getValidToken } = require('./ebay-auth');
const Store = require('electron-store');

const store = new Store();

const CONDITION_MAP = {
  'NEW': 1000,
  'USED_EXCELLENT': 3000,
  'USED_GOOD': 4000,
  'USED_ACCEPTABLE': 5000,
  'FOR_PARTS': 7000
};

function makeRequest(method, apiPath, body, token) {
  return new Promise((resolve, reject) => {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const options = {
      hostname: 'api.ebay.com',
      path: apiPath,
      method: method,
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': body ? 'application/json' : undefined,
        'Accept': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_IT',
        'Content-Language': 'it-IT'
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`eBay API ${res.statusCode}: ${JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(bodyStr);
    req.end();
  });
}

async function uploadPhoto(filePath, token) {
  const imageData = fs.readFileSync(filePath);
  const boundary = 'BOUNDARY_' + Date.now();
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token.access_token}</eBayAuthToken>
  </RequesterCredentials>
  <PictureName>${path.basename(filePath)}</PictureName>
</UploadSiteHostedPicturesRequest>`;

  const parts = [];
  parts.push(`--${boundary}\r\n`);
  parts.push('Content-Disposition: form-data; name="XML Payload"\r\n');
  parts.push('Content-Type: text/xml\r\n\r\n');
  parts.push(xmlRequest + '\r\n');
  parts.push(`--${boundary}\r\n`);
  parts.push(`Content-Disposition: form-data; name="image"; filename="${path.basename(filePath)}"\r\n`);
  parts.push(`Content-Type: ${mimeType}\r\n\r\n`);

  const header = Buffer.from(parts.join(''));
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([header, imageData, footer]);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'UploadSiteHostedPictures',
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const urlMatch = data.match(/<FullURL>(.*?)<\/FullURL>/);
        if (urlMatch) {
          resolve(urlMatch[1]);
        } else {
          reject(new Error('Photo upload failed: ' + data.substring(0, 500)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function createListing(listing, photoUrls, settings) {
  const token = await getValidToken(settings);
  const d = listing.data;
  const conditionId = CONDITION_MAP[d.condition] || 3000;

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token.access_token}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>it_IT</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${escapeXml(d.title)}</Title>
    <Description><![CDATA[${d.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${d.category_id || '99'}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="EUR">${d.suggested_price || '9.99'}</StartPrice>
    <ConditionID>${conditionId}</ConditionID>
    <ConditionDescription>${escapeXml(d.condition_description || '')}</ConditionDescription>
    <Country>IT</Country>
    <Currency>EUR</Currency>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <Quantity>${d.quantity || 1}</Quantity>
    <Site>Italy</Site>
    <PictureDetails>
      ${photoUrls.map(url => `<PictureURL>${url}</PictureURL>`).join('\n      ')}
    </PictureDetails>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>IT_Spedizione</ShippingService>
        <ShippingServiceCost currencyID="EUR">${d.suggested_shipping || '5.00'}</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ItemSpecifics>
      ${Object.entries(d.item_specifics || {}).map(([k, v]) => `
      <NameValueList>
        <Name>${escapeXml(k)}</Name>
        <Value>${escapeXml(v)}</Value>
      </NameValueList>`).join('')}
    </ItemSpecifics>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <RefundOption>MoneyBack</RefundOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
  </Item>
</AddItemRequest>`;

  return new Promise((resolve, reject) => {
    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'AddItem',
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
      res.on('end', () => {
        const itemIdMatch = data.match(/<ItemID>(.*?)<\/ItemID>/);
        const errorMatch = data.match(/<ShortMessage>(.*?)<\/ShortMessage>/);
        if (itemIdMatch) {
          resolve({ success: true, itemId: itemIdMatch[1] });
        } else {
          reject(new Error(errorMatch ? errorMatch[1] : 'Listing creation failed'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { createListing, uploadPhoto };
