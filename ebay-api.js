const https = require('https');
const fs = require('fs');
const path = require('path');
const { getValidToken } = require('./ebay-auth');
const Store = require('electron-store');

const store = new Store({ cwd: __dirname });

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
        'Authorization': `Bearer ${token}`,
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
    <eBayAuthToken>${token}</eBayAuthToken>
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

function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
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

function getCategorySpecifics(categoryId, token, settings) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetCategorySpecificsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <CategorySpecific>
    <CategoryID>${categoryId}</CategoryID>
  </CategorySpecific>
  <MaxValuesPerName>30</MaxValuesPerName>
  <MaxNames>30</MaxNames>
</GetCategorySpecificsRequest>`;

    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetCategorySpecifics',
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
        const specifics = [];
        const nameRegex = /<NameRecommendation>([\s\S]*?)<\/NameRecommendation>/g;
        let match;
        while ((match = nameRegex.exec(data)) !== null) {
          const block = match[1];
          const name = (block.match(/<Name>(.*?)<\/Name>/) || [])[1];
          if (!name) continue;

          const minValues = (block.match(/<MinValues>(\d+)<\/MinValues>/) || [])[1];
          const required = minValues === '1';

          const values = [];
          const valRegex = /<Value>(.*?)<\/Value>/g;
          let valMatch;
          while ((valMatch = valRegex.exec(block)) !== null) {
            values.push(valMatch[1]);
          }

          specifics.push({ name, required, values });
        }
        resolve(specifics);
      });
    });

    req.on('error', () => resolve([]));
    req.write(body);
    req.end();
  });
}

function getAllProfiles(token, settings) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetUserPreferencesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ShowSellerProfilePreferences>true</ShowSellerProfilePreferences>
</GetUserPreferencesRequest>`;

    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetUserPreferences',
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
        const all = { shipping: [], returnPolicy: [], payment: [] };
        const profileRegex = /<SupportedSellerProfile>([\s\S]*?)<\/SupportedSellerProfile>/g;
        let match;
        while ((match = profileRegex.exec(data)) !== null) {
          const block = match[1];
          const id = (block.match(/<ProfileID>(\d+)<\/ProfileID>/) || [])[1];
          const name = (block.match(/<ProfileName>(.*?)<\/ProfileName>/) || [])[1] || `Profile ${id}`;
          const type = (block.match(/<ProfileType>(\w+)<\/ProfileType>/) || [])[1];
          const isDefault = block.includes('<IsDefault>true</IsDefault>');
          const entry = { id, name, isDefault };
          if (type === 'SHIPPING') all.shipping.push(entry);
          else if (type === 'RETURN_POLICY') all.returnPolicy.push(entry);
          else if (type === 'PAYMENT') all.payment.push(entry);
        }
        resolve(all);
      });
    });

    req.on('error', (e) => {
      console.error('Failed to get profiles:', e.message);
      resolve({ shipping: [], returnPolicy: [], payment: [] });
    });
    req.write(body);
    req.end();
  });
}

async function createListing(listing, photoUrls, settings) {
  const token = await getValidToken(settings);
  const d = listing.data;
  const conditionId = CONDITION_MAP[d.condition] || 3000;

  const categoryId = d.category_id || '99';

  // Use selected profiles from listing data, or null
  const profiles = {
    shippingId: d.shipping_profile_id || null,
    returnId: d.return_profile_id || null,
    paymentId: d.payment_profile_id || null
  };

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<AddItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>it_IT</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${escapeXml(d.title)}</Title>
    <Description><![CDATA[${d.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${categoryId}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="EUR">${d.suggested_price || '9.99'}</StartPrice>
    <ConditionID>${conditionId}</ConditionID>
    <ConditionDescription>${escapeXml(d.condition_description || '')}</ConditionDescription>
    <Country>IT</Country>
    <Location>${escapeXml(settings.location || 'Italia')}</Location>
    <Currency>EUR</Currency>
    <DispatchTimeMax>3</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <Quantity>${d.quantity || 1}</Quantity>
    <Site>Italy</Site>
    <PictureDetails>
      ${photoUrls.map(url => `<PictureURL>${url}</PictureURL>`).join('\n      ')}
    </PictureDetails>
    ${profiles.shippingId || profiles.returnId || profiles.paymentId ? `<SellerProfiles>
      ${profiles.shippingId ? `<SellerShippingProfile><ShippingProfileID>${profiles.shippingId}</ShippingProfileID></SellerShippingProfile>` : ''}
      ${profiles.returnId ? `<SellerReturnProfile><ReturnProfileID>${profiles.returnId}</ReturnProfileID></SellerReturnProfile>` : ''}
      ${profiles.paymentId ? `<SellerPaymentProfile><PaymentProfileID>${profiles.paymentId}</PaymentProfileID></SellerPaymentProfile>` : ''}
    </SellerProfiles>` : ''}
    ${!profiles.shippingId ? `<ShippingDetails>
      <ShippingType>${d.free_shipping ? 'Flat' : (d.shipping_type || 'Flat')}</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>${d.shipping_service || 'IT_QuickPackage3'}</ShippingService>
        <ShippingServiceCost currencyID="EUR">${d.free_shipping ? '0.00' : (d.suggested_shipping || '5.49')}</ShippingServiceCost>
        <FreeShipping>${d.free_shipping ? 'true' : 'false'}</FreeShipping>
      </ShippingServiceOptions>
    </ShippingDetails>` : ''}
    ${!profiles.returnId ? `<ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>` : ''}
    <ItemSpecifics>
      ${Object.entries(d.item_specifics || {}).map(([k, v]) => `
      <NameValueList>
        <Name>${escapeXml(k)}</Name>
        <Value>${escapeXml(v)}</Value>
      </NameValueList>`).join('')}
    </ItemSpecifics>
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
        if (itemIdMatch) {
          resolve({ success: true, itemId: itemIdMatch[1] });
        } else {
          // Extract all errors with details
          const errors = [];
          const errorRegex = /<Errors>([\s\S]*?)<\/Errors>/g;
          let match;
          while ((match = errorRegex.exec(data)) !== null) {
            const block = match[1];
            const code = (block.match(/<ErrorCode>(.*?)<\/ErrorCode>/) || [])[1] || '';
            const short = (block.match(/<ShortMessage>(.*?)<\/ShortMessage>/) || [])[1] || '';
            const long = (block.match(/<LongMessage>(.*?)<\/LongMessage>/) || [])[1] || '';
            const severity = (block.match(/<SeverityCode>(.*?)<\/SeverityCode>/) || [])[1] || '';
            if (severity === 'Error') {
              errors.push(`[${code}] ${long || short}`);
            }
          }
          const msg = errors.length > 0 ? errors.join(' | ') : 'Listing creation failed: ' + data.substring(0, 500);
          reject(new Error(msg));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getSellerList(token, settings, pageNumber = 1) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetMyeBaySellingRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ActiveList>
    <Sort>TimeLeft</Sort>
    <Pagination>
      <EntriesPerPage>200</EntriesPerPage>
      <PageNumber>${pageNumber}</PageNumber>
    </Pagination>
  </ActiveList>
</GetMyeBaySellingRequest>`;

    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetMyeBaySelling',
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
        const totalMatch = data.match(/<TotalNumberOfEntries>(\d+)<\/TotalNumberOfEntries>/);
        const total = totalMatch ? parseInt(totalMatch[1]) : 0;
        const totalPages = (data.match(/<TotalNumberOfPages>(\d+)<\/TotalNumberOfPages>/) || [])[1];

        const items = [];
        const itemRegex = /<Item>([\s\S]*?)<\/Item>/g;
        let match;
        while ((match = itemRegex.exec(data)) !== null) {
          const block = match[1];
          const itemId = (block.match(/<ItemID>(\d+)<\/ItemID>/) || [])[1];
          const title = decodeEntities((block.match(/<Title>(.*?)<\/Title>/) || [])[1] || '');
          const price = (block.match(/<CurrentPrice[^>]*>([\d.]+)<\/CurrentPrice>/) || [])[1];
          const pictureUrl = (block.match(/<GalleryURL>(.*?)<\/GalleryURL>/) || [])[1];
          const quantityAvailable = (block.match(/<QuantityAvailable>(\d+)<\/QuantityAvailable>/) || [])[1];
          if (itemId && title) {
            items.push({ itemId, title, price, pictureUrl, quantityAvailable });
          }
        }
        resolve({ total, totalPages: parseInt(totalPages || '1'), items });
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getItem(itemId, token, settings) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <DetailLevel>ReturnAll</DetailLevel>
  <OutputSelector>ItemID,Title,Description,PrimaryCategory,ConditionDisplayName,ConditionID,Quantity,StartPrice,PictureDetails,ItemSpecifics,ShippingDetails,ListingDetails</OutputSelector>
</GetItemRequest>`;

    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetItem',
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
        const title = decodeEntities((data.match(/<Title>(.*?)<\/Title>/) || [])[1] || '');
        let description = (data.match(/<Description>([\s\S]*?)<\/Description>/) || [])[1] || '';
        // Strip CDATA wrapper if present
        description = description.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
        description = decodeEntities(description);
        const categoryId = (data.match(/<PrimaryCategory>[\s\S]*?<CategoryID>(\d+)<\/CategoryID>/) || [])[1];
        const categoryName = decodeEntities((data.match(/<PrimaryCategory>[\s\S]*?<CategoryName>(.*?)<\/CategoryName>/) || [])[1] || '');
        const price = (data.match(/<StartPrice[^>]*>([\d.]+)<\/StartPrice>/) || [])[1];
        const condition = decodeEntities((data.match(/<ConditionDisplayName>(.*?)<\/ConditionDisplayName>/) || [])[1] || '');

        // Extract photo URLs
        const photoUrls = [];
        const picUrlRegex = /<PictureURL>(.*?)<\/PictureURL>/g;
        let picMatch;
        while ((picMatch = picUrlRegex.exec(data)) !== null) {
          photoUrls.push(picMatch[1]);
        }

        // Extract condition ID and quantity
        const conditionId = (data.match(/<ConditionID>(\d+)<\/ConditionID>/) || [])[1];
        const quantity = (data.match(/<Quantity>(\d+)<\/Quantity>/) || [])[1];

        const specifics = {};
        const itemSpecBlock = (data.match(/<ItemSpecifics>([\s\S]*?)<\/ItemSpecifics>/) || [])[1] || '';
        const specRegex = /<NameValueList>([\s\S]*?)<\/NameValueList>/g;
        let specMatch;
        while ((specMatch = specRegex.exec(itemSpecBlock)) !== null) {
          const block = specMatch[1];
          const name = decodeEntities((block.match(/<Name>(.*?)<\/Name>/) || [])[1]);
          const values = [];
          const valRegex = /<Value>(.*?)<\/Value>/g;
          let valMatch;
          while ((valMatch = valRegex.exec(block)) !== null) {
            values.push(decodeEntities(valMatch[1]));
          }
          if (name) specifics[name] = values.join(', ') || '';
        }

        // Extract shipping details
        const shippingType = (data.match(/<ShippingType>(.*?)<\/ShippingType>/) || [])[1] || '';
        const shippingCost = (data.match(/<ShippingServiceCost[^>]*>([\d.]+)<\/ShippingServiceCost>/) || [])[1] || '0';
        const shippingService = (data.match(/<ShippingService>(.*?)<\/ShippingService>/) || [])[1] || '';
        const freeShipping = shippingType === 'FreeShipping' || shippingCost === '0' || shippingCost === '0.0' || shippingCost === '0.00';

        // Extract listing dates
        const startTime = (data.match(/<StartTime>(.*?)<\/StartTime>/) || [])[1] || null;
        const endTime = (data.match(/<EndTime>(.*?)<\/EndTime>/) || [])[1] || null;

        if (title) {
          resolve({ itemId, title, description, categoryId, categoryName, price, condition, specifics, photoUrls, conditionId: conditionId ? parseInt(conditionId) : null, quantity: quantity ? parseInt(quantity) : 1, shippingType, shippingCost, shippingService, freeShipping, startTime, endTime });
        } else {
          reject(new Error('Item not found'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getAllSellerListings(token, settings) {
  let allItems = [];
  let page = 1;
  let totalPages = 1;
  do {
    const result = await getSellerList(token, settings, page);
    allItems = allItems.concat(result.items);
    totalPages = result.totalPages;
    page++;
  } while (page <= totalPages);
  return allItems;
}

async function reviseListing(itemId, listing, photoUrls, settings) {
  const token = await getValidToken(settings);
  const d = listing.data;
  const conditionId = CONDITION_MAP[d.condition] || 3000;

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<ReviseItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>it_IT</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <ItemID>${itemId}</ItemID>
    <Title>${escapeXml(d.title)}</Title>
    <Description><![CDATA[${d.description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${d.category_id || '99'}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="EUR">${d.suggested_price || '9.99'}</StartPrice>
    <ConditionID>${conditionId}</ConditionID>
    <ConditionDescription>${escapeXml(d.condition_description || '')}</ConditionDescription>
    <Quantity>${d.quantity || 1}</Quantity>
    <PictureDetails>
      ${photoUrls.map(url => `<PictureURL>${url}</PictureURL>`).join('\n      ')}
    </PictureDetails>
    <ShippingDetails>
      <ShippingType>${d.free_shipping ? 'Flat' : (d.shipping_type || 'Flat')}</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>${d.shipping_service || 'IT_QuickPackage3'}</ShippingService>
        <ShippingServiceCost currencyID="EUR">${d.free_shipping ? '0.00' : (d.suggested_shipping || '5.49')}</ShippingServiceCost>
        <FreeShipping>${d.free_shipping ? 'true' : 'false'}</FreeShipping>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ItemSpecifics>
      ${Object.entries(d.item_specifics || {}).map(([k, v]) => `
      <NameValueList>
        <Name>${escapeXml(k)}</Name>
        <Value>${escapeXml(v)}</Value>
      </NameValueList>`).join('')}
    </ItemSpecifics>
  </Item>
</ReviseItemRequest>`;

  return new Promise((resolve, reject) => {
    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'ReviseItem',
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
        if (itemIdMatch) {
          resolve({ success: true, itemId: itemIdMatch[1] });
        } else {
          const errors = [];
          const errorRegex = /<Errors>([\s\S]*?)<\/Errors>/g;
          let match;
          while ((match = errorRegex.exec(data)) !== null) {
            const block = match[1];
            const code = (block.match(/<ErrorCode>(.*?)<\/ErrorCode>/) || [])[1] || '';
            const short = (block.match(/<ShortMessage>(.*?)<\/ShortMessage>/) || [])[1] || '';
            const long = (block.match(/<LongMessage>(.*?)<\/LongMessage>/) || [])[1] || '';
            const severity = (block.match(/<SeverityCode>(.*?)<\/SeverityCode>/) || [])[1] || '';
            if (severity === 'Error') {
              errors.push(`[${code}] ${long || short}`);
            }
          }
          const msg = errors.length > 0 ? errors.join(' | ') : 'Revise failed: ' + data.substring(0, 500);
          reject(new Error(msg));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function endItem(itemId, token, settings) {
  return new Promise((resolve, reject) => {
    const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<EndItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${token}</eBayAuthToken>
  </RequesterCredentials>
  <ItemID>${itemId}</ItemID>
  <EndingReason>NotAvailable</EndingReason>
</EndItemRequest>`;

    const body = Buffer.from(xmlRequest, 'utf-8');
    const options = {
      hostname: 'api.ebay.com',
      path: '/ws/api.dll',
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '101',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'EndItem',
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
        const ack = (data.match(/<Ack>(.*?)<\/Ack>/) || [])[1];
        if (ack === 'Success' || ack === 'Warning') {
          resolve({ success: true });
        } else {
          const errMsg = (data.match(/<LongMessage>(.*?)<\/LongMessage>/) || [])[1] || 'EndItem failed';
          reject(new Error(errMsg));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { createListing, uploadPhoto, getCategorySpecifics, getSellerList, getItem, getAllSellerListings, reviseListing, endItem, getAllProfiles };
