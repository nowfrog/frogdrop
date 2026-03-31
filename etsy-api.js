const https = require('https');
const fs = require('fs');
const path = require('path');
const { getValidToken } = require('./etsy-auth');
const Store = require('electron-store');

const store = new Store({ cwd: __dirname });

const ETSY_API_BASE = 'api.etsy.com';

// ============ BASE REQUEST HELPER ============

function makeRequest(method, apiPath, body, token, apiKey) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-api-key': apiKey,
      'Accept': 'application/json'
    };
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const options = {
      hostname: ETSY_API_BASE,
      path: apiPath,
      method: method,
      headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const errMsg = parsed.error || parsed.error_msg || JSON.stringify(parsed);
            reject(new Error(`Etsy API ${res.statusCode}: ${errMsg}`));
          }
        } catch (e) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({});
          } else {
            reject(new Error(`Parse error (${res.statusCode}): ${data.substring(0, 500)}`));
          }
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ============ TAXONOMY ============

let taxonomyCache = null;

async function getTaxonomyNodes(apiKey) {
  if (taxonomyCache) return taxonomyCache;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: ETSY_API_BASE,
      path: '/v3/application/seller-taxonomy/nodes',
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          taxonomyCache = parsed.results || [];
          resolve(taxonomyCache);
        } catch (e) {
          reject(new Error('Failed to parse taxonomy'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function getTaxonomyProperties(taxonomyId, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ETSY_API_BASE,
      path: `/v3/application/seller-taxonomy/nodes/${taxonomyId}/properties`,
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.results || []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

// ============ SHIPPING PROFILES & RETURN POLICIES ============

async function getShippingProfiles(shopId, token, apiKey) {
  return makeRequest('GET', `/v3/application/shops/${shopId}/shipping-profiles`, null, token, apiKey);
}

async function getReturnPolicies(shopId, token, apiKey) {
  return makeRequest('GET', `/v3/application/shops/${shopId}/return-policies`, null, token, apiKey);
}

// ============ LISTING CREATION (MULTI-STEP) ============

async function createDraftListing(shopId, listingData, token, apiKey) {
  const body = {
    quantity: listingData.quantity || 1,
    title: listingData.title,
    description: listingData.description,
    price: listingData.price,
    who_made: listingData.who_made || 'i_did',
    when_made: listingData.when_made || 'made_to_order',
    taxonomy_id: listingData.taxonomy_id,
    type: 'physical'
  };

  if (listingData.shipping_profile_id) body.shipping_profile_id = listingData.shipping_profile_id;
  if (listingData.return_policy_id) body.return_policy_id = listingData.return_policy_id;
  if (listingData.tags && listingData.tags.length > 0) body.tags = listingData.tags.slice(0, 13);
  if (listingData.materials && listingData.materials.length > 0) body.materials = listingData.materials;
  if (listingData.is_supply !== undefined) body.is_supply = listingData.is_supply;
  if (listingData.shop_section_id) body.shop_section_id = listingData.shop_section_id;
  if (listingData.item_weight) body.item_weight = listingData.item_weight;
  if (listingData.item_length) body.item_length = listingData.item_length;
  if (listingData.item_width) body.item_width = listingData.item_width;
  if (listingData.item_height) body.item_height = listingData.item_height;

  return makeRequest('POST', `/v3/application/shops/${shopId}/listings`, body, token, apiKey);
}

function uploadListingImage(shopId, listingId, filePath, rank, token, apiKey) {
  return new Promise((resolve, reject) => {
    const imageData = fs.readFileSync(filePath);
    const boundary = 'BOUNDARY_' + Date.now();
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : ext === '.gif' ? 'image/gif' : 'image/jpeg';
    const filename = path.basename(filePath);

    const parts = [];
    parts.push(`--${boundary}\r\n`);
    parts.push(`Content-Disposition: form-data; name="image"; filename="${filename}"\r\n`);
    parts.push(`Content-Type: ${mimeType}\r\n\r\n`);

    const header = Buffer.from(parts.join(''));

    const rankPart = Buffer.from(
      `\r\n--${boundary}\r\n` +
      `Content-Disposition: form-data; name="rank"\r\n\r\n` +
      `${rank}\r\n` +
      `--${boundary}--\r\n`
    );

    const body = Buffer.concat([header, imageData, rankPart]);

    const options = {
      hostname: ETSY_API_BASE,
      path: `/v3/application/shops/${shopId}/listings/${listingId}/images`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`Image upload failed (${res.statusCode}): ${parsed.error || JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error('Image upload parse error: ' + data.substring(0, 500)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function activateListing(listingId, token, apiKey) {
  return makeRequest('PUT', `/v3/application/listings/${listingId}`, { state: 'active' }, token, apiKey);
}

async function createListing(shopId, listing, settings) {
  const token = await getValidToken(settings);
  const apiKey = settings.etsyApiKey;
  const d = listing.data;

  // Step 1: Create draft
  const draft = await createDraftListing(shopId, {
    title: d.title,
    description: d.description,
    price: d.price,
    quantity: d.quantity || 1,
    taxonomy_id: d.taxonomy_id,
    who_made: d.who_made || 'i_did',
    when_made: d.when_made || 'made_to_order',
    shipping_profile_id: d.shipping_profile_id || settings.etsyDefaultShippingProfileId,
    return_policy_id: d.return_policy_id || settings.etsyDefaultReturnPolicyId,
    tags: d.tags || [],
    materials: d.materials || [],
    is_supply: d.is_supply || false,
    item_weight: d.item_weight,
    item_length: d.item_length,
    item_width: d.item_width,
    item_height: d.item_height
  }, token, apiKey);

  const etsyListingId = draft.listing_id;

  // Step 2: Upload images
  const localPhotos = (listing.photos || []).filter(p => p.path && !p.isRemote);
  for (let i = 0; i < localPhotos.length && i < 10; i++) {
    await uploadListingImage(shopId, etsyListingId, localPhotos[i].path, i + 1, token, apiKey);
  }

  // Step 3: Activate
  await activateListing(etsyListingId, token, apiKey);

  return { success: true, listingId: etsyListingId };
}

// ============ LISTING UPDATE / DEACTIVATE / DELETE ============

async function updateListing(listingId, listingData, token, apiKey) {
  const body = {};
  if (listingData.title) body.title = listingData.title;
  if (listingData.description) body.description = listingData.description;
  if (listingData.price) body.price = listingData.price;
  if (listingData.quantity !== undefined) body.quantity = listingData.quantity;
  if (listingData.taxonomy_id) body.taxonomy_id = listingData.taxonomy_id;
  if (listingData.who_made) body.who_made = listingData.who_made;
  if (listingData.when_made) body.when_made = listingData.when_made;
  if (listingData.tags) body.tags = listingData.tags.slice(0, 13);
  if (listingData.materials) body.materials = listingData.materials;
  if (listingData.shipping_profile_id) body.shipping_profile_id = listingData.shipping_profile_id;
  if (listingData.return_policy_id) body.return_policy_id = listingData.return_policy_id;

  return makeRequest('PUT', `/v3/application/listings/${listingId}`, body, token, apiKey);
}

async function deactivateListing(listingId, token, apiKey) {
  return makeRequest('PUT', `/v3/application/listings/${listingId}`, { state: 'inactive' }, token, apiKey);
}

async function deleteListing(listingId, token, apiKey) {
  return makeRequest('DELETE', `/v3/application/listings/${listingId}`, null, token, apiKey);
}

// ============ LISTING RETRIEVAL ============

async function getListing(listingId, token, apiKey) {
  return makeRequest('GET', `/v3/application/listings/${listingId}?includes=images,shop,shipping_profile`, null, token, apiKey);
}

async function getShopListings(shopId, listingState, token, apiKey, limit = 100, offset = 0) {
  return makeRequest('GET', `/v3/application/shops/${shopId}/listings?state=${listingState}&limit=${limit}&offset=${offset}`, null, token, apiKey);
}

async function getAllActiveListings(shopId, token, apiKey) {
  let allListings = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const result = await getShopListings(shopId, 'active', token, apiKey, limit, offset);
    const listings = result.results || [];
    allListings = allListings.concat(listings);
    offset += limit;
    hasMore = listings.length === limit;
  }

  return allListings;
}

async function getListingImages(listingId, token, apiKey) {
  return makeRequest('GET', `/v3/application/listings/${listingId}/images`, null, token, apiKey);
}

// ============ SYNC MAPPING ============

function mapEtsyListingToLocal(etsyListing, images, existingListing) {
  const photos = (images || []).map((img, i) => ({
    url: img.url_570xN || img.url_fullxfull || img.url_75x75,
    path: null,
    relativePath: null,
    name: `etsy-photo-${i + 1}.jpg`,
    isRemote: true,
    etsyImageId: img.listing_image_id
  }));

  return {
    id: existingListing ? existingListing.id : String(Date.now()) + '-etsy-' + etsyListing.listing_id,
    photos,
    data: {
      title: etsyListing.title || '',
      description: etsyListing.description || '',
      price: etsyListing.price ? etsyListing.price.amount / etsyListing.price.divisor : 0,
      quantity: etsyListing.quantity || 1,
      taxonomy_id: etsyListing.taxonomy_id,
      who_made: etsyListing.who_made || 'i_did',
      when_made: etsyListing.when_made || 'made_to_order',
      tags: etsyListing.tags || [],
      materials: etsyListing.materials || [],
      shipping_profile_id: etsyListing.shipping_profile_id,
      return_policy_id: etsyListing.return_policy_id,
      is_supply: etsyListing.is_supply || false,
      shop_section_id: etsyListing.shop_section_id
    },
    status: 'published',
    createdAt: existingListing ? existingListing.createdAt : (etsyListing.created_timestamp ? etsyListing.created_timestamp * 1000 : Date.now()),
    updatedAt: Date.now(),
    syncedAt: Date.now(),
    etsyListingId: etsyListing.listing_id,
    platform: 'etsy'
  };
}

// ============ REVISE LISTING ============

async function reviseListing(etsyListingId, listing, settings) {
  const token = await getValidToken(settings);
  const apiKey = settings.etsyApiKey;
  const shopId = settings.etsyShopId;
  const d = listing.data;

  // Update listing data
  await updateListing(etsyListingId, {
    title: d.title,
    description: d.description,
    price: d.price,
    quantity: d.quantity || 1,
    taxonomy_id: d.taxonomy_id,
    who_made: d.who_made,
    when_made: d.when_made,
    tags: d.tags,
    materials: d.materials,
    shipping_profile_id: d.shipping_profile_id,
    return_policy_id: d.return_policy_id
  }, token, apiKey);

  // Upload any new local photos
  const localPhotos = (listing.photos || []).filter(p => p.path && !p.isRemote);
  for (let i = 0; i < localPhotos.length && i < 10; i++) {
    await uploadListingImage(shopId, etsyListingId, localPhotos[i].path, i + 1, token, apiKey);
  }

  return { success: true, listingId: etsyListingId };
}

module.exports = {
  createListing,
  reviseListing,
  deactivateListing,
  deleteListing,
  getListing,
  getAllActiveListings,
  getListingImages,
  getShippingProfiles,
  getReturnPolicies,
  getTaxonomyNodes,
  getTaxonomyProperties,
  mapEtsyListingToLocal,
  getValidToken
};
