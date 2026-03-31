const { BrowserWindow } = require('electron');
const https = require('https');
const querystring = require('querystring');
const Store = require('electron-store');

const store = new Store({ cwd: __dirname });

const EBAY_AUTH_URL = 'https://auth.ebay.com/oauth2/authorize';
const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token';
const REDIRECT_URI_NAME = 'Andrea_Morana-AndreaMo-nowfro-hmsqeljd';
const SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.marketing',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
].join(' ');

function getAuthUrl(settings) {
  const params = querystring.stringify({
    client_id: settings.ebayAppId,
    redirect_uri: settings.redirectUriName || REDIRECT_URI_NAME,
    response_type: 'code',
    scope: SCOPES
  });
  return `${EBAY_AUTH_URL}?${params}`;
}

function exchangeCodeForToken(code, settings) {
  return new Promise((resolve, reject) => {
    const credentials = Buffer.from(`${settings.ebayAppId}:${settings.ebayCertId}`).toString('base64');
    const postData = querystring.stringify({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: settings.redirectUriName || REDIRECT_URI_NAME
    });

    const url = new URL(EBAY_TOKEN_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const tokenData = JSON.parse(body);
          if (tokenData.error) {
            return reject(new Error(tokenData.error_description || tokenData.error));
          }
          tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
          store.set('ebayTokens', tokenData);
          resolve(tokenData);
        } catch (e) {
          reject(new Error('Failed to parse token response'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function refreshToken(settings) {
  return new Promise((resolve, reject) => {
    const tokens = store.get('ebayTokens');
    if (!tokens || !tokens.refresh_token) {
      return reject(new Error('No refresh token available'));
    }

    const credentials = Buffer.from(`${settings.ebayAppId}:${settings.ebayCertId}`).toString('base64');
    const postData = querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      scope: SCOPES
    });

    const url = new URL(EBAY_TOKEN_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const tokenData = JSON.parse(body);
          if (tokenData.error) {
            return reject(new Error(tokenData.error_description || tokenData.error));
          }
          tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
          // Preserve the refresh token if not returned
          if (!tokenData.refresh_token && tokens.refresh_token) {
            tokenData.refresh_token = tokens.refresh_token;
          }
          store.set('ebayTokens', tokenData);
          resolve(tokenData);
        } catch (e) {
          reject(new Error('Failed to parse token response'));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function getValidToken(settings) {
  const tokens = store.get('ebayTokens');
  if (!tokens) {
    throw new Error('No tokens stored. Please authenticate first.');
  }

  // 60 second buffer before expiration
  if (tokens.expires_at && Date.now() < tokens.expires_at - 60000) {
    return tokens.access_token;
  }

  const refreshed = await refreshToken(settings);
  return refreshed.access_token;
}

function startOAuthFlow(settings) {
  return new Promise((resolve, reject) => {
    const authUrl = getAuthUrl(settings);
    let resolved = false;

    const authWindow = new BrowserWindow({
      width: 800,
      height: 700,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    authWindow.loadURL(authUrl);

    function handleUrl(url) {
      if (resolved) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        if (code) {
          resolved = true;
          authWindow.close();
          exchangeCodeForToken(code, settings).then(resolve).catch(reject);
        }
      } catch (e) {
        // ignore URL parse errors
      }
    }

    // Catch all possible navigation types
    authWindow.webContents.on('will-redirect', (event, url) => {
      handleUrl(url);
    });

    authWindow.webContents.on('will-navigate', (event, url) => {
      handleUrl(url);
    });

    authWindow.webContents.on('did-navigate', (event, url) => {
      handleUrl(url);
    });

    authWindow.webContents.on('did-redirect-navigation', (event, url) => {
      handleUrl(url);
    });

    // Also intercept URL changes via did-navigate-in-page (SPA-style)
    authWindow.webContents.on('did-navigate-in-page', (event, url) => {
      handleUrl(url);
    });

    authWindow.on('closed', () => {
      if (!resolved) {
        reject(new Error('Authentication window was closed'));
      }
    });
  });
}

module.exports = { startOAuthFlow, getValidToken, refreshToken };
