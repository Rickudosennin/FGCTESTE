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
  const cfn = String(
    fields.sf6CfnId?.stringValue ??
    fields.sf6CfnId?.integerValue ??
    fields.sf6CfnId?.doubleValue ??
    ''
  ).trim();

  const rawGames = fields.gamesPlayed?.arrayValue?.values || [];
  const games = rawGames.map(value => {
    if (typeof value?.stringValue === 'string') return value.stringValue;
    if (typeof value?.mapValue?.fields?.key?.stringValue === 'string') return value.mapValue.fields.key.stringValue;
    if (typeof value?.mapValue?.fields?.id?.stringValue === 'string') return value.mapValue.fields.id.stringValue;
    return '';
  }).map(value => value.trim().toLowerCase());

  const hasSf6 = games.some(game =>
    game === 'sf6' ||
    game === 'street fighter 6' ||
    game === 'street-fighter-6'
  );

  return /^\d{1,20}$/.test(cfn) && hasSf6 ? cfn : '';
}

export async function getSf6CfnIdsFromFirestore() {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!raw) throw new Error('Secret FIREBASE_SERVICE_ACCOUNT_JSON não configurado');

  let serviceAccount;
  try { serviceAccount = JSON.parse(raw); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não contém JSON válido'); }

  const config = await readFile('firebase-config.js', 'utf8');
  const configuredProject = config.match(/projectId:\s*"([^"]+)"/)?.[1];
  const projectId = serviceAccount.project_id;
  if (!projectId || projectId !== configuredProject) {
    throw new Error('A Service Account precisa pertencer ao projeto Firebase configurado no FGC HUB');
  }

  const token = await accessToken(serviceAccount);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'players' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'sf6CfnId' },
          op: 'GREATER_THAN',
          value: { stringValue: '' }
        }
      },
      orderBy: [
        { field: { fieldPath: 'sf6CfnId' }, direction: 'ASCENDING' }
      ],
      select: {
        fields: [{ fieldPath: 'sf6CfnId' }]
      }
    }
  };

  let response;
  for (let attempt = 1; attempt <= 6; attempt++) {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(query)
    });
    if (response.status !== 429 && response.status < 500) break;

    if (attempt === 6) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Firestore query HTTP ${response.status} após ${attempt} tentativas: ${detail.slice(0, 500)}`);
    }

    const retryAfter = Number(response.headers.get('retry-after'));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.min(retryAfter * 1000, 60000)
      : Math.min(5000 * (2 ** (attempt - 1)), 60000);
    console.warn(`Firestore HTTP ${response.status}; nova tentativa ${attempt + 1}/6 em ${Math.ceil(waitMs / 1000)}s.`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Firestore query HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }

  const rows = await response.json();
  const ids = new Set();
  for (const row of rows || []) {
    const id = readFields({ fields: row.document?.fields || {} });
    if (id) ids.add(id);
  }
  return [...ids];
}
