/**
 * fetch-eventos.js
 *
 * Lista torneios Tekken 8 no Brasil e gera data/eventos.json
 * (versão mais simples, só lista sem standings)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GAME = 49783;
const API = 'https://api.start.gg/gql/alpha';
const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTOS_FILE = path.join(DATA_DIR, 'eventos.json');

const TOKEN = process.env.STARTGG_TOKEN;
if (!TOKEN) {
  console.error('Erro: defina STARTGG_TOKEN no ambiente.');
  process.exit(1);
}

const AFTER = Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000);
const BEFORE = Math.floor(new Date('2026-12-31T23:59:59Z').getTime() / 1000);

const Q = `query($page:Int!,$perPage:Int!,$filter:TournamentPageFilter){
  tournaments(query:{page:$page,perPage:$perPage,sortBy:"startAt asc",filter:$filter}){
    pageInfo{totalPages}
    nodes{id name slug startAt countryCode addrState city timezone hasOnlineEvents
     owner{id name slug player{gamerTag} location{country}}
     events(filter:{videogameId:[${GAME}]}){id name slug numEntrants isOnline}}}}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function gql(variables) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: Q, variables });
    const req = https.request(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + TOKEN,
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.errors) return reject(new Error(JSON.stringify(j.errors)));
          resolve(j.data.tournaments);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function isBR(t) {
  return t.countryCode === 'BR' || /^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Manaus|Belem|Cuiaba|Campo_Grande|Porto_Velho|Rio_Branco|Noronha|Araguaina|Maceio|Boa_Vista)$/.test(t.timezone || '') || t.owner?.location?.country === 'Brazil';
}

async function pass(extra, label) {
  const out = [];
  let page = 1, tp = 1;
  do {
    console.log(`${label}: página ${page}/${tp}...`);
    const t = await gql({ page, perPage: 50, filter: { videogameIds: [GAME], afterDate: AFTER, beforeDate: BEFORE, ...extra } });
    tp = t.pageInfo.totalPages;
    out.push(...t.nodes);
    page++;
    await sleep(800);
  } while (page <= tp);
  return out;
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('Buscando eventos...');
  const a = await pass({ countryCode: 'BR' }, 'Pass A (BR)');
  const b = (await pass({ hasOnlineEvents: true }, 'Pass B (online)')).filter(isBR);
  const m = new Map();
  [...a, ...b].forEach(t => m.set(t.id, t));
  const tournaments = [...m.values()].filter(t => t.events && t.events.length > 0);

  const eventos = tournaments.map(t => {
    const evs = t.events || [];
    const on = evs.some(e => e.isOnline), off = evs.some(e => !e.isOnline);
    const o = t.owner || {};
    return {
      id: t.id,
      ts: t.startAt,
      date: new Date(t.startAt * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      name: t.name,
      url: 'https://start.gg/' + t.slug,
      to: o.player?.gamerTag || o.name || '?',
      toUrl: o.slug ? 'https://start.gg/' + o.slug : '',
      loc: [t.city, t.addrState].filter(Boolean).join('/') || (on && !off ? 'Online' : '-'),
      mode: on && off ? 'Misto' : on ? 'Online' : 'Offline',
      ent: evs.reduce((s, e) => s + (e.numEntrants || 0), 0),
      events: evs.map(e => ({ name: e.name, entrants: e.numEntrants || 0, online: e.isOnline }))
    };
  }).sort((a, b) => b.ts - a.ts);

  fs.writeFileSync(EVENTOS_FILE, JSON.stringify({ eventos, geradoEm: new Date().toISOString() }, null, 2));
  console.log(`Eventos salvos: ${eventos.length}`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
