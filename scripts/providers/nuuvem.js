'use strict';

// Nuuvem não tem API pública de preços. Lemos a página do item (HTML) só para identificar se o menor
// preço Retail do GG.deals é o da Nuuvem. Nunca lança erro: em falha retorna [] e o card fica sem logo.
const BASE = 'https://www.nuuvem.com/br-pt/item/';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function parseBRL(text) {
  const n = Number(String(text).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Preços candidatos da página: JSON-LD (offers.price) e, como reserva, os primeiros "R$ x,xx" depois do <h1>.
function extractPrices(html) {
  const found = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = node => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) return node.forEach(walk);
        if (node.price != null) { const p = Number(node.price); if (Number.isFinite(p)) found.push(p); }
        Object.values(node).forEach(walk);
      };
      walk(JSON.parse(m[1]));
    } catch (_) {}
  }
  const h1 = html.search(/<h1[\s>]/i);
  const area = h1 >= 0 ? html.slice(h1, h1 + 6000) : '';
  for (const m of area.matchAll(/R\$\s*([\d.]+,\d{2})/g)) {
    const p = parseBRL(m[1]);
    if (p !== null) found.push(p);
    if (found.length >= 8) break;
  }
  return found;
}

async function fetchNuuvemPrices(games, options = {}) {
  const out = {};
  for (const game of games) {
    try {
      const response = await fetch(BASE + encodeURIComponent(game.nuuvemSlug), {
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; FGCHubBot/1.0; +https://fgchub.com.br)' },
        signal: AbortSignal.timeout(options.timeoutMs || 20000)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      out[game.slug] = extractPrices(await response.text());
    } catch (error) {
      console.log('Nuuvem [' + game.slug + '] ignorada (' + error.message + ')');
    }
    await sleep(1500);
  }
  return out;
}

// 'nuuvem' somente quando algum preço da página é igual ao menor preço Retail do GG.deals.
function detectNuuvemShop(retailPrice, pagePrices) {
  const retail = Number(retailPrice);
  if (!Number.isFinite(retail) || !Array.isArray(pagePrices)) return null;
  return pagePrices.some(p => Math.abs(p - retail) < 0.005) ? 'nuuvem' : null;
}

module.exports = { fetchNuuvemPrices, detectNuuvemShop, extractPrices };
