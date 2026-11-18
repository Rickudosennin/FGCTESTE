/**
 * fetch-ranking.js
 *
 * Busca torneios e standings do start.gg, calcula o ranking
 * e gera data/ranking.json + data/eventos.json.
 *
 * Uso:
 *   STARTGG_TOKEN=seu_token node scripts/fetch-ranking.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GAME = 49783;
const API = 'https://api.start.gg/gql/alpha';
const DATA_DIR = path.join(__dirname, '..', 'data');
const RANKING_FILE = path.join(DATA_DIR, 'ranking.json');
const EVENTOS_FILE = path.join(DATA_DIR, 'eventos.json');
const LS_FILE = path.join(DATA_DIR, 'cache.json');

const TOKEN = process.env.STARTGG_TOKEN;
if (!TOKEN) {
  console.error('Erro: defina STARTGG_TOKEN no ambiente.');
  process.exit(1);
}

const AFTER = Math.floor(new Date('2026-01-01T00:00:00Z').getTime() / 1000);
const BEFORE = Math.floor(new Date('2026-12-31T23:59:59Z').getTime() / 1000);

const Q_TOURN = `query($page:Int!,$after:Timestamp,$before:Timestamp){
  tournaments(query:{page:$page,perPage:50,filter:{countryCode:"BR",videogameIds:[${GAME}],afterDate:$after,beforeDate:$before}}){
    pageInfo{totalPages}
    nodes{ id name isOnline startAt
      events(filter:{videogameId:[${GAME}]}){ id name numEntrants }
    }
  }
}`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function gql(query, variables) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
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
          if (j.errors) return reject(new Error(j.errors[0].message));
          resolve(j.data);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  let cache = {};
  if (fs.existsSync(LS_FILE)) {
    try { cache = JSON.parse(fs.readFileSync(LS_FILE, 'utf8')); } catch (e) {}
  }
  if (!cache.events) cache.events = {};

  const from = new Date('2026-01-01T00:00:00Z').toISOString().slice(0, 10);
  const to = new Date().toISOString().slice(0, 10);
  const after = Math.floor(new Date(from + 'T00:00:00Z').getTime() / 1000);
  const before = Math.floor(new Date(to + 'T23:59:59Z').getTime() / 1000);

  // 1) Buscar torneios
  const todo = [];
  let page = 1, total = 1;
  while (page <= total) {
    console.log(`Listando torneios... pág ${page}/${total}`);
    const d = await gql(Q_TOURN, { page, after, before });
    total = d.tournaments.pageInfo.totalPages || 1;
    for (const t of d.tournaments.nodes || []) {
      for (const e of t.events || []) {
        if (cache.events[e.id]) continue;
        todo.push({
          id: e.id,
          name: e.name,
          entrants: e.numEntrants || 0,
          tName: t.name,
          online: t.isOnline === true,
          startAt: t.startAt
        });
      }
    }
    page++;
    await sleep(800);
  }

  // 2) Buscar standings em lotes de 5
  const BATCH = 5;
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH);
    console.log(`Standings... ${Math.min(i + BATCH, todo.length)}/${todo.length}`);
    const q = 'query{' + batch.map((e, k) =>
      `e${k}:event(id:${e.id}){id standings(query:{page:1,perPage:16}){nodes{placement entrant{participants{player{id gamerTag}}}}}}`
    ).join('') + '}';
    try {
      const d = await gql(q, {});
      batch.forEach((e, k) => {
        const nodes = (d['e' + k] && d['e' + k].standings && d['e' + k].standings.nodes) || [];
        const rows = [];
        let team = false;
        for (const n of nodes) {
          const ps = (n.entrant && n.entrant.participants) || [];
          if (ps.length !== 1) { team = true; break; }
          const pl = ps[0].player;
          if (!pl || !pl.id) continue;
          rows.push({ p: n.placement, id: pl.id, tag: pl.gamerTag });
        }
        e.rows = team ? [] : rows;
        e.team = team;
        cache.events[e.id] = e;
      });
    } catch (err) {
      console.error('Erro ao buscar standings:', err.message);
    }
    fs.writeFileSync(LS_FILE, JSON.stringify(cache));
    await sleep(1000);
  }

  fs.writeFileSync(LS_FILE, JSON.stringify(cache));
  console.log(`Cache salvo: ${Object.keys(cache.events).length} eventos.`);

  // 3) Gerar eventos.json
  const eventos = Object.values(cache.events)
    .filter(e => e.rows && e.rows.length > 0)
    .map(e => ({
      id: e.id,
      name: e.tName + ' — ' + e.name,
      date: e.startAt,
      online: e.online,
      entrants: e.entrants,
      results: e.rows
    }))
    .sort((a, b) => b.date - a.date);

  fs.writeFileSync(EVENTOS_FILE, JSON.stringify({ eventos, geradoEm: new Date().toISOString() }, null, 2));
  console.log(`Eventos salvos: ${eventos.length}`);

  // 4) Gerar ranking.json
  const points = p => {
    if (p === 1) return 16;
    if (p === 2) return 12;
    if (p === 3) return 10;
    if (p === 4) return 8;
    if (p >= 5 && p <= 7) return 6;
    if (p >= 8 && p <= 12) return 4;
    if (p >= 13 && p <= 16) return 2;
    return 0;
  };

  const map = new Map();
  let evCount = 0;
  const evs = Object.values(cache.events)
    .filter(e => !e.team && e.rows && e.rows.length > 0)
    .sort((a, b) => a.startAt - b.startAt);

  for (const e of evs) {
    evCount++;
    for (const r of e.rows) {
      const pts = points(r.p);
      if (!pts) continue;
      let o = map.get(r.id);
      if (!o) {
        o = { id: r.id, tag: r.tag, pts: 0, best: 99, list: [] };
        map.set(r.id, o);
      }
      o.tag = r.tag;
      o.pts += pts;
      o.best = Math.min(o.best, r.p);
      o.list.push({
        name: e.tName + ' — ' + e.name,
        p: r.p,
        pts,
        entrants: e.entrants,
        date: e.startAt
      });
    }
  }

  const arr = [...map.values()].sort((a, b) => b.pts - a.pts || a.best - b.best || a.tag.localeCompare(b.tag));
  const ranking = arr.map((o, i) => {
    const pos = i > 0 && o.pts === arr[i - 1].pts ? arr[i - 1].pos : i + 1;
    o.pos = pos;
    return o;
  });

  const result = {
    geradoEm: new Date().toISOString(),
    totalEventos: evCount,
    totalPlayers: ranking.length,
    pontos: '1º 16 · 2º 12 · 3º 10 · 4º 8 · 5-7 6 · 8-12 4 · 13-16 2',
    ranking
  };

  fs.writeFileSync(RANKING_FILE, JSON.stringify(result, null, 2));
  console.log(`Ranking salvo: ${ranking.length} players, ${evCount} eventos.`);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
