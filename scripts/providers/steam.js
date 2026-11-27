'use strict';

// Preço oficial da Steam, usado só para identificar se a loja do menor preço "Retail" é a Steam.
// Nunca lança erro: em qualquer falha retorna mapa vazio e o card segue sem logo.
const API = 'https://store.steampowered.com/api/appdetails';
const CHUNK = 25;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchSteamPrices(games, options = {}) {
  const cc = (options.region || 'br').toUpperCase();
  const out = {};
  for (let i = 0; i < games.length; i += CHUNK) {
    const chunk = games.slice(i, i + CHUNK);
    const url = new URL(API);
    url.searchParams.set('appids', chunk.map(g => g.steamAppId).join(','));
    url.searchParams.set('cc', cc);
    url.searchParams.set('filters', 'price_overview');
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(options.timeoutMs || 20000)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const body = await response.json();
      for (const game of chunk) {
        const entry = body?.[String(game.steamAppId)];
        const cents = entry?.success ? entry.data?.price_overview?.final : null;
        if (Number.isFinite(cents)) out[game.slug] = cents / 100;
      }
    } catch (error) {
      console.log('Steam: consulta ignorada (' + error.message + ')');
    }
    if (i + CHUNK < games.length) await sleep(1500);
  }
  return out;
}

// Retorna 'steam' somente quando o menor preço Retail do GG.deals é igual ao preço da Steam.
function detectRetailShop(retailPrice, steamPrice) {
  const retail = Number(retailPrice);
  if (!Number.isFinite(retail) || !Number.isFinite(steamPrice)) return null;
  return Math.abs(retail - steamPrice) < 0.005 ? 'steam' : null;
}

module.exports = { fetchSteamPrices, detectRetailShop };
