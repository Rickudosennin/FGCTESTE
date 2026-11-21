'use strict';

// GG.deals Prices API oficial: https://gg.deals/api/prices/
// O endpoint retorna menores preços agregados (Retail/Keyshops), não preços por loja.
const API = 'https://api.gg.deals/v1/prices/by-steam-app-id/';

async function fetchPrices(games, options = {}) {
  const key = process.env.GGDEALS_API_KEY;
  if (!key) throw new Error('Falta o secret GGDEALS_API_KEY');
  if (!Array.isArray(games) || games.length === 0) return {};
  if (games.length > 100) throw new Error('GG.deals aceita no máximo 100 Steam App IDs por chamada');

  const region = options.region || 'br';
  const ids = games.map(g => String(g.steamAppId));
  const url = new URL(API);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('key', key);
  url.searchParams.set('region', region);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(options.timeoutMs || 20000)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) {
    const message = body?.data?.message || body?.message || `HTTP ${response.status}`;
    throw new Error(`GG.deals: ${message}`);
  }

  return Object.fromEntries(games.map(game => {
    const id = String(game.steamAppId);
    const record = body?.data?.[id] ?? null;
    if (!record) return [game.slug, {
      provider: 'ggdeals', status: 'not_found', game: game.name, region,
      updatedAt: new Date().toISOString()
    }];

    const prices = record.prices || {};
    return [game.slug, {
      provider: 'ggdeals', status: 'ok', game: record.title || game.name,
      steamAppId: Number(id), region,
      currency: prices.currency || null,
      sourceUrl: record.url || `https://store.steampowered.com/app/${id}/`,
      prices: {
        currentRetail: prices.currentRetail ?? null,
        currentKeyshops: prices.currentKeyshops ?? null,
        historicalRetail: prices.historicalRetail ?? null,
        historicalKeyshops: prices.historicalKeyshops ?? null
      },
      updatedAt: new Date().toISOString()
    }];
  }));
}

module.exports = { fetchPrices };
