const { BrowserWindow } = require('electron');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const querystring = require('querystring');
const Store = require('electron-store');

const store = new Store({ cwd: __dirname });

const ETSY_AUTH_URL = 'https://www.etsy.com/oauth/connect';
const ETSY_TOKEN_URL = 'https://api.etsy.com/v3/public/oauth/token';
const REDIRECT_URI = 'http://localhost:3847/callback';
const SCOPES = 'listings_r listings_w listings_d shops_r shops_w';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function exchangeCodeForToken(code, codeVerifier, settings) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify({
      grant_type: 'authorization_code',
      client_id: settings.etsyApiKey,
      redirect_uri: REDIRECT_URI,
      code: code,
      code_verifier: codeVerifier
    });

    const url = new URL(ETSY_TOKEN_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
          store.set('etsyTokens', tokenData);
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
    const tokens = store.get('etsyTokens');
    if (!tokens || !tokens.refresh_token) {
      return reject(new Error('No refresh token available'));
    }

    const postData = querystring.stringify({
      grant_type: 'refresh_token',
      client_id: settings.etsyApiKey,
      refresh_token: tokens.refresh_token
    });

    const url = new URL(ETSY_TOKEN_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
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
          if (!tokenData.refresh_token && tokens.refresh_token) {
            tokenData.refresh_token = tokens.refresh_token;
          }
          store.set('etsyTokens', tokenData);
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
  const tokens = store.get('etsyTokens');
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
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const oauthState = crypto.randomBytes(16).toString('hex');

    const params = querystring.stringify({
      response_type: 'code',
      client_id: settings.etsyApiKey,
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      state: oauthState,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const authUrl = `${ETSY_AUTH_URL}?${params}`;
    let resolved = false;
    let authWindow = null;

    // Start a local HTTP server to catch the redirect
    const server = http.createServer((req, res) => {
      if (resolved) return;
      try {
        const url = new URL(req.url, 'http://localhost:3847');
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (code && returnedState === oauthState) {
          resolved = true;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Authentication successful!</h2><p>You can close this window.</p><script>window.close()</script></body></html>');
          server.close();
          if (authWindow && !authWindow.isDestroyed()) authWindow.close();
          exchangeCodeForToken(code, codeVerifier, settings).then(resolve).catch(reject);
        } else if (url.searchParams.get('error')) {
          resolved = true;
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h2>Authentication failed</h2></body></html>');
          server.close();
          if (authWindow && !authWindow.isDestroyed()) authWindow.close();
          reject(new Error(url.searchParams.get('error_description') || 'Authentication failed'));
        }
      } catch (e) {
        // ignore URL parse errors
      }
    });

    server.listen(3847, () => {
      authWindow = new BrowserWindow({
        width: 800,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      authWindow.loadURL(authUrl);

      authWindow.on('closed', () => {
        if (!resolved) {
          server.close();
          reject(new Error('Authentication window was closed'));
        }
      });
    });

    server.on('error', (e) => {
      if (!resolved) {
        reject(new Error('Failed to start auth server: ' + e.message));
      }
    });
  });
}

module.exports = { startOAuthFlow, getValidToken, refreshToken };
