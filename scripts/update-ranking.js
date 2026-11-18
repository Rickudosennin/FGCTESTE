#!/usr/bin/env node
// Atualiza data/ranking/*.json a partir da API do Start.gg.
// Uso: STARTGG_TOKEN=xxx node scripts/update-ranking.js [slug ...]
// Sem argumentos -> atualiza todos os jogos com enabled:true em scripts/ranking-config.json
'use strict';

const fs = require('fs');
const path = require('path');

const API = 'https://api.start.gg/gql/alpha';
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'ranking');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'ranking-config.json'), 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pontuação por colocação (mesma do ranking-t8-br.html)
function points(p) {
  if (p === 1) return 16;
  if (p === 2) return 12;
  if (p === 3) return 10;
  if (p === 4) return 8;
  if (p >= 5 && p <= 7) return 6;
  if (p >= 8 && p <= 12) return 4;
  if (p >= 13 && p <= 16) return 2;
  return 0;
}

async function gql(query, variables) {
  const token = process.env.STARTGG_TOKEN;
  if (!token) throw new Error('Falta STARTGG_TOKEN');
  for (let i = 0; i < 6; i++) {
    let r;
    try {
      r = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ query, variables })
      });
    } catch (e) {
      await sleep(5000 * (i + 1));
      continue;
    }
    if (r.status === 429 || r.status >= 500) { await sleep(5000 * (i + 1)); continue; }
    const j = await r.json();
    if (j.errors) throw new Error(j.errors[0].message);
    await sleep(800);
    return j.data;
  }
  throw new Error('Start.gg: falhou após várias tentativas (rate limit?)');
}

const Q_TOURN = (gameId, withCountry, nome, ownerId) => `query($page:Int!,$after:Timestamp,$before:Timestamp){
  tournaments(query:{page:$page,perPage:40,filter:{${withCountry ? 'countryCode:"BR",' : ''}${nome ? 'name:' + JSON.stringify(nome) + ',' : ''}${ownerId ? 'ownerId:' + JSON.stringify(String(ownerId)) + ',' : ''}videogameIds:[${gameId}],afterDate:$after,beforeDate:$before}}){
    pageInfo{totalPages}
    nodes{ id name isOnline startAt${withCountry ? '' : ' timezone countryCode'}
      events(filter:{videogameId:[${gameId}]}){ id name numEntrants state }
    }
  }
}`;

// Torneio online no Start.gg quase nunca tem countryCode -> a busca com countryCode:"BR"
// não enxerga. Segunda varredura sem país, aceitando só online com fuso horário brasileiro.
const BR_TZ = /^America\/(Sao_Paulo|Bahia|Fortaleza|Manaus|Recife|Belem|Cuiaba|Campo_Grande|Maceio|Araguaina|Porto_Velho|Boa_Vista|Rio_Branco|Noronha|Santarem|Eirunepe)$/;

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

async function collect(game, cache) {
  const after = Math.floor(new Date(game.from + 'T00:00:00-03:00').getTime() / 1000);
  const before = Math.floor(Date.now() / 1000) + 86400; // até o fim de hoje, como no HTML base
  const min = game.minEntrants ?? 8;

  const todo = [];
  const stats = { torneios: 0, eventos: 0, minEntrants: 0, jaNoCache: 0, emAndamento: 0, online: 0, casouNome: 0, recusadoNaoBR: 0 };
  const STALE = 2 * 24 * 3600; // evento não finalizado e recente -> reconsulta na próxima execução
  const seen = new Set();
  async function scan(withCountry, accept, afterTs = after, nome = null, ownerId = null) {
    let page = 1, total = 1;
    while (page <= total) {
      console.log(`[${game.slug}] listando torneios${ownerId ? ' do dono ' + ownerId : nome ? ' "' + nome + '"' : withCountry ? '' : ' (online, sem filtro de país)'} ${page}/${total}`);
      const d = await gql(Q_TOURN(game.gameId, withCountry, nome, ownerId), { page, after: afterTs, before });
      total = d.tournaments.pageInfo.totalPages || 1;
      for (const t of d.tournaments.nodes || []) {
        if (!accept(t)) continue;
        stats.torneios++;
        for (const e of t.events || []) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          stats.eventos++;
          if ((e.numEntrants || 0) < min) { stats.minEntrants++; continue; }
          const c = cache.events[e.id];
          if (c && !c.recheck) { stats.jaNoCache++; continue; }
          const recente = (t.startAt || 0) > before - STALE;
          if (e.state !== 'COMPLETED' && recente) stats.emAndamento++; // entra, mas será reconsultado
          if (t.isOnline === true) stats.online++;
          todo.push({
            id: e.id, name: e.name, entrants: e.numEntrants, tName: t.name,
            online: t.isOnline === true, startAt: t.startAt,
            recheck: e.state !== 'COMPLETED' && recente
          });
        }
      }
      page++;
    }
  }

  const brOk = t => t.countryCode === 'BR' || BR_TZ.test(t.timezone || '');
  const JANELA = 14 * 24 * 3600;
  const incremental = !!cache.onlineScanOk;
  const afterOnline = incremental ? Math.max(after, before - JANELA) : after;
  if (incremental) console.log(`[${game.slug}] varredura online incremental (últimos 14 dias)`);

  if (game.donoSlug || game.donoId) {
    // Torneios de um organizador específico (ex.: quem faz os Fight Nights)
    let ownerId = game.donoId;
    if (!ownerId) {
      const u = await gql('query($s:String){user(slug:$s){id name}}', { s: game.donoSlug });
      if (!u.user) throw new Error(`usuário não encontrado: ${game.donoSlug}`);
      ownerId = u.user.id;
      console.log(`[${game.slug}] dono: ${u.user.name} (id ${ownerId})`);
    }
    const nomes = (game.nomes || []).map(n => n.toLowerCase());
    const soOnline = game.apenasOnline !== false;
    await scan(false, t => {
      const okNome = !nomes.length || nomes.some(n => (t.name || '').toLowerCase().includes(n));
      const okOn = !soOnline || t.isOnline === true;
      console.log(`[${game.slug}] torneio do dono: ${t.name} | online=${t.isOnline} | ${okNome && okOn ? 'ENTRA' : 'recusado'}`);
      return okNome && okOn;
    }, after, null, ownerId);
  } else
  if (game.nomes && game.nomes.length) {
    // Série específica (ex.: Fight Night): só online, só torneios cujo nome contém o termo
    const nomes = game.nomes.map(n => n.toLowerCase());
    const exigirBR = game.exigirBR !== false;
    const accept = t => {
      if (t.isOnline !== true) return false;
      if (!nomes.some(n => (t.name || '').toLowerCase().includes(n))) return false;
      stats.casouNome++;
      if (exigirBR && !brOk(t)) { stats.recusadoNaoBR++; console.log(`[${game.slug}] recusado (fora do BR): ${t.name} | tz=${t.timezone} cc=${t.countryCode}`); return false; }
      return true;
    };
    for (const n of game.nomes) {
      try {
        await scan(false, accept, afterOnline, n);          // filtro de nome no servidor
      } catch (e) {
        console.error(`[${game.slug}] filtro de nome no servidor falhou (${e.message}); varrendo sem ele (mais lento)`);
        await scan(false, accept, afterOnline, null);
        break;
      }
    }
    cache.onlineScanOk = true;
  } else {
    await scan(true, () => true);
    if (game.onlineSemPais !== false) {
      try {
        await scan(false, t => t.isOnline === true && brOk(t), afterOnline);
        cache.onlineScanOk = true;
      } catch (e) {
        console.error(`[${game.slug}] AVISO: varredura online sem país falhou (${e.message}); seguindo só com countryCode BR`);
      }
    }
  }

  console.log(`[${game.slug}] diag:`, JSON.stringify(stats));
  const B = 5;
  for (let i = 0; i < todo.length; i += B) {
    const batch = todo.slice(i, i + B);
    console.log(`[${game.slug}] standings ${Math.min(i + B, todo.length)}/${todo.length}`);
    const q = 'query{' + batch.map((e, k) =>
      `e${k}:event(id:${e.id}){id standings(query:{page:1,perPage:16}){nodes{placement entrant{participants{player{id gamerTag}}}}}}`
    ).join('') + '}';
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
  }
  return todo.length;
}

function compute(events, mode, min) {
  const map = new Map();
  let evCount = 0;
  const evs = events
    .filter(e => !e.team && (e.entrants || 0) >= min &&
      (mode === 'online' ? e.online : mode === 'offline' ? !e.online : true))
    .sort((a, b) => a.startAt - b.startAt);
  for (const e of evs) {
    evCount++;
    for (const r of e.rows) {
      const pts = points(r.p);
      if (!pts) continue;
      let o = map.get(r.id);
      if (!o) { o = { id: r.id, tag: r.tag, pts: 0, best: 99, list: [] }; map.set(r.id, o); }
      o.tag = r.tag; // tag mais recente
      o.pts += pts;
      o.best = Math.min(o.best, r.p);
      o.list.push({ n: e.tName + ' — ' + e.name, p: r.p, pts, e: e.entrants, d: e.startAt });
    }
  }
  const arr = [...map.values()].sort((a, b) => b.pts - a.pts || a.best - b.best || a.tag.localeCompare(b.tag));
  let pos = 0, last = null;
  const players = arr.map((o, i) => {
    if (o.pts !== last) { pos = i + 1; last = o.pts; }
    o.list.sort((a, b) => b.d - a.d);
    return { pos, id: o.id, tag: o.tag, pts: o.pts, n: o.list.length, best: o.best, list: o.list };
  });
  return { events: evCount, players };
}

async function updateGame(game) {
  const cacheFile = path.join(OUT_DIR, `cache-${game.slug}.json`);
  const cache = readJson(cacheFile, { events: {} });
  const added = await collect(game, cache);
  fs.writeFileSync(cacheFile, JSON.stringify(cache));

  const min = game.minEntrants ?? 8;
  const events = Object.values(cache.events);
  const out = {
    slug: game.slug,
    name: game.name,
    updatedAt: new Date().toISOString(),
    from: game.from,
    minEntrants: min,
    modes: Object.fromEntries((game.modos || ['online', 'offline', 'ambos']).map(m => [m, compute(events, m, min)]))
  };
  fs.writeFileSync(path.join(OUT_DIR, `${game.slug}.json`), JSON.stringify(out));
  console.log(`[${game.slug}] OK: +${added} eventos novos, ${events.length} no cache`);
}

function writeIndex() {
  const games = CONFIG.games
    .filter(g => g.enabled)
    .filter(g => fs.existsSync(path.join(OUT_DIR, `${g.slug}.json`)))
    .map(g => ({ slug: g.slug, name: g.name }));
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify({ games }, null, 2));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const games = CONFIG.games.filter(g => g.enabled && (!only.length || only.includes(g.slug)));
  let failed = 0;
  for (const g of games) {
    try { await updateGame(g); }
    catch (e) { failed++; console.error(`[${g.slug}] ERRO: ${e.message}`); }
  }
  writeIndex();
  if (failed) process.exit(1);
}

if (require.main === module) main();
module.exports = { points, compute, collect };
