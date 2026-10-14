// Sincroniza dados públicos do Buckler (CFN) de players com SF6 cadastrado.
// Roda no GitHub Actions com a SUA sessão (secret BUCKLER_COOKIE). Nunca roda no navegador.
// Saída: data/cfn/<cfnId>.json (lido pelo player.html).
// Configuração, secret e solução de problemas: ver CFN-SETUP.md na raiz do repo.
// Uso responsável (doc buckler-api-docs): ritmo lento, sem concorrência, para em 401/403/429, cache.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const BASE = 'https://www.streetfighter.com/6/buckler';
const LOCALE = 'en';
const COOKIE = (process.env.BUCKLER_COOKIE || '').trim();
const FORCE = process.env.FORCE === 'true';
const MAX_IDS = Math.max(1, Number(process.env.MAX_IDS) || 60);
const DELAY_MS = Math.max(2000, Number(process.env.DELAY_MS) || 4000);
const MIN_AGE_MS = 20 * 60 * 60 * 1000;
const OUT_DIR = 'data/cfn';
const ALL_CHARACTERS_ID = 253; // agregado "all" observado na doc

class AuthError extends Error {}
class StopError extends Error {}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

function headers(accept = 'application/json, text/plain, */*') {
  return {
    Accept: accept,
    'Accept-Language': 'en-US,en;q=0.9',
    Referer: `${BASE}/${LOCALE}/`,
    'User-Agent': 'Mozilla/5.0 (compatible; FGCHUB-cfn-sync/1.0)',
    Cookie: COOKIE
  };
}

async function discoverBuildId() {
  const res = await fetch(`${BASE}/${LOCALE}`, { headers: headers('text/html'), redirect: 'follow' });
  if (res.status === 401 || res.status === 403) throw new AuthError(`HTTP ${res.status} ao abrir o Buckler`);
  if (res.status === 429 || res.status >= 500) throw new StopError(`HTTP ${res.status} ao abrir o Buckler`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new AuthError('__NEXT_DATA__ ausente (sessão inválida ou página mudou)');
  const buildId = JSON.parse(m[1]).buildId;
  if (!buildId) throw new Error('buildId não encontrado');
  return buildId;
}

let buildId = null;

async function fetchPlay(sid, retried = false) {
  const url = `${BASE}/_next/data/${buildId}/${LOCALE}/profile/${sid}/play.json`;
  const res = await fetch(url, { headers: headers(), redirect: 'manual' });
  if (res.status === 401 || res.status === 403) throw new AuthError(`HTTP ${res.status}`);
  if (res.status >= 300 && res.status < 400) throw new AuthError(`redirecionamento (${res.status}) — provável sessão expirada`);
  if (res.status === 429 || res.status >= 500) throw new StopError(`HTTP ${res.status}`);
  if (res.status === 404) {
    if (!retried) { buildId = await discoverBuildId(); return fetchPlay(sid, true); }
    return null;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('json')) throw new AuthError('resposta não-JSON (provável página de login)');
  const json = await res.json();
  const pp = json?.pageProps || {};
  const embedded = pp.common?.statusCode;
  if (embedded === 401 || embedded === 403) throw new AuthError(`statusCode embutido ${embedded}`);
  if (pp.__N_REDIRECT) {
    if (/login|auth|sign/i.test(String(pp.__N_REDIRECT))) throw new AuthError('redirecionado para login');
    return null;
  }
  return json;
}

// Só campos necessários (minimização de dados). Sem nome, clube, comentário ou status online.
export function mapProfile(sid, json) {
  const pp = json?.pageProps || {};
  const banner = pp.fighter_banner_info || {};
  const play = pp.play || {};
  const li = banner.favorite_character_league_info || {};

  const modes = (play.base_info?.content_play_time_list || [])
    .map(x => ({ type: num(x.content_type), name: String(x.content_type_name || ''), seconds: num(x.play_time) }))
    .filter(x => x.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);

  const rates = Array.isArray(play.character_win_rates) ? play.character_win_rates : [];
  const all = rates.find(x => num(x.character_id) === ALL_CHARACTERS_ID);
  const perChar = rates.filter(x => num(x.character_id) !== ALL_CHARACTERS_ID && num(x.battle_count) > 0);
  const battles = all ? num(all.battle_count) : perChar.reduce((s, x) => s + num(x.battle_count), 0);
  const wins = all ? num(all.win_count) : perChar.reduce((s, x) => s + num(x.win_count), 0);

  return {
    cfnId: String(sid),
    updatedAt: new Date().toISOString(),
    main: {
      id: num(banner.favorite_character_id),
      name: String(banner.favorite_character_name || ''),
      toolName: String(banner.favorite_character_tool_name || '')
    },
    league: {
      points: num(li.league_point),
      rank: num(li.league_rank),
      masterRating: num(li.master_rating),
      masterLeague: num(li.master_league),
      masterRatingRanking: num(li.master_rating_ranking)
    },
    playTimeSeconds: modes.reduce((s, x) => s + x.seconds, 0),
    playTimeByMode: modes,
    season: { id: num(play.current_season_id), battles, wins },
    topCharacters: perChar
      .sort((a, b) => num(b.battle_count) - num(a.battle_count))
      .slice(0, 3)
      .map(x => ({ id: num(x.character_id), name: String(x.character_name || ''), battles: num(x.battle_count), wins: num(x.win_count) }))
  };
}

async function idsFromFirestore() {
  try {
    const cfg = await readFile('firebase-config.js', 'utf8');
    const apiKey = cfg.match(/apiKey:\s*"([^"]+)"/)?.[1];
    const projectId = cfg.match(/projectId:\s*"([^"]+)"/)?.[1];
    if (!apiKey || !projectId) throw new Error('firebase-config.js sem apiKey/projectId');
    const ids = [];
    let pageToken = '';
    do {
      const qs = new URLSearchParams({ pageSize: '300', key: apiKey });
      qs.append('mask.fieldPaths', 'sf6CfnId');
      qs.append('mask.fieldPaths', 'gamesPlayed');
      if (pageToken) qs.set('pageToken', pageToken);
      const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/players?${qs}`);
      if (!res.ok) throw new Error(`Firestore HTTP ${res.status} (regras podem bloquear leitura pública)`);
      const body = await res.json();
      for (const doc of body.documents || []) {
        const f = doc.fields || {};
        const id = String(f.sf6CfnId?.stringValue ?? f.sf6CfnId?.integerValue ?? '').trim();
        const games = (f.gamesPlayed?.arrayValue?.values || []).map(v => v.stringValue);
        if (/^\d{1,20}$/.test(id) && games.includes('sf6')) ids.push(id);
      }
      pageToken = body.nextPageToken || '';
    } while (pageToken);
    console.log(`Firestore: ${ids.length} CFN ID(s) com SF6.`);
    return ids;
  } catch (e) {
    console.warn(`Aviso: não foi possível ler IDs do Firestore: ${e.message}`);
    return [];
  }
}

async function idsFromFile() {
  try {
    const list = JSON.parse(await readFile('data/cfn-ids.json', 'utf8'));
    return (Array.isArray(list) ? list : []).map(String).filter(id => /^\d{1,20}$/.test(id));
  } catch { return []; }
}

async function lastUpdated(id) {
  try {
    const t = Date.parse(JSON.parse(await readFile(`${OUT_DIR}/${id}.json`, 'utf8')).updatedAt);
    return Number.isFinite(t) ? t : 0;
  } catch { return 0; }
}

async function main() {
  if (!COOKIE) {
    console.error('BUCKLER_COOKIE vazio. Configure o secret (Settings > Secrets and variables > Actions).');
    process.exit(1);
  }
  const ids = [...new Set([...(await idsFromFirestore()), ...(await idsFromFile())])];
  if (!ids.length) { console.log('Nenhum CFN ID para sincronizar.'); return; }

  const withAge = await Promise.all(ids.map(async id => ({ id, at: await lastUpdated(id) })));
  const queue = withAge
    .filter(x => FORCE || Date.now() - x.at > MIN_AGE_MS)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_IDS)
    .map(x => x.id);
  console.log(`${queue.length}/${ids.length} ID(s) a atualizar.`);
  if (!queue.length) return;

  await mkdir(OUT_DIR, { recursive: true });
  try {
    buildId = await discoverBuildId();
    let ok = 0, missing = 0;
    for (const [i, id] of queue.entries()) {
      if (i > 0) await sleep(DELAY_MS);
      try {
        const json = await fetchPlay(id);
        if (!json) { missing++; console.log(`- ${id}: perfil indisponível`); continue; }
        await writeFile(`${OUT_DIR}/${id}.json`, JSON.stringify(mapProfile(id, json), null, 2) + '\n');
        ok++;
        console.log(`- ${id}: ok`);
      } catch (e) {
        if (e instanceof AuthError || e instanceof StopError) throw e;
        console.warn(`- ${id}: falhou (${e.message})`);
      }
    }
    console.log(`Concluído: ${ok} atualizado(s), ${missing} indisponível(is).`);
  } catch (e) {
    if (e instanceof AuthError) {
      console.error(`Sessão do Buckler recusada (${e.message}). Faça login de novo e atualize o secret BUCKLER_COOKIE.`);
    } else {
      console.error(`Interrompido: ${e.message}`);
    }
    process.exitCode = 1; // arquivos já gravados nesta rodada continuam válidos
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
