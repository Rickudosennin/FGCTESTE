// Leitura autenticada e somente leitura da coleção players do Firestore.
// Credencial: GitHub Actions secret FIREBASE_SERVICE_ACCOUNT_JSON.
// Nenhum dado pessoal é persistido: somente CFN ID de perfis com SF6 selecionado.
import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const SCOPE = 'https://www.googleapis.com/auth/datastore';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function accessToken(serviceAccount) {
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON sem client_email/private_key');
  }
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  }));
  const unsigned = header + '.' + claim;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + '.' + signer.sign(serviceAccount.private_key, 'base64url');

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  if (!response.ok) throw new Error(`Google OAuth HTTP ${response.status}`);
  const token = await response.json();
  if (!token.access_token) throw new Error('Google OAuth não retornou access_token');
  return token.access_token;
}

function readFields(document) {
  const fields = document?.fields || {};
  const cfn = String(fields.sf6CfnId?.stringValue ?? fields.sf6CfnId?.integerValue ?? '').trim();
  const rawGames = fields.gamesPlayed?.arrayValue?.values || [];
  const games = rawGames.map(value => value.stringValue).filter(Boolean);
  return /^\\d{1,20}$/.test(cfn) && games.includes('sf6') ? cfn : '';
}

export async function getSf6CfnIdsFromFirestore() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) {
    // Compatibilidade com a leitura pública antiga; não é suficiente quando rules bloqueiam.
    const config = await readFile('firebase-config.js', 'utf8');
    const apiKey = config.match(/apiKey:\\s*"([^"]+)"/)?.[1];
    const projectId = config.match(/projectId:\\s*"([^"]+)"/)?.[1];
    if (!apiKey || !projectId) throw new Error('firebase-config.js sem apiKey/projectId');
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/players?key=${apiKey}&pageSize=1`);
    if (!response.ok) throw new Error(`Firestore público HTTP ${response.status}; configure FIREBASE_SERVICE_ACCOUNT_JSON no GitHub Actions`);
    throw new Error('Firestore público acessível, mas leitura autenticada é necessária para enumerar perfis com segurança; configure FIREBASE_SERVICE_ACCOUNT_JSON');
  }

  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido'); }

  const projectId = serviceAccount.project_id;
  if (!projectId) throw new Error('Service account sem project_id');
  const token = await accessToken(serviceAccount);
  const ids = new Set();
  let pageToken = '';

  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`);
    url.searchParams.set('pageSize', '300');
    url.searchParams.append('mask.fieldPaths', 'sf6CfnId');
    url.searchParams.append('mask.fieldPaths', 'gamesPlayed');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Firestore autenticado HTTP ${response.status}`);
    const body = await response.json();
    for (const document of body.documents || []) {
      if (!document.name?.includes('/documents/players/')) continue;
      const id = readFields(document);
      if (id) ids.add(id);
    }
    pageToken = body.nextPageToken || '';
  } while (pageToken);

  return [...ids];
}
