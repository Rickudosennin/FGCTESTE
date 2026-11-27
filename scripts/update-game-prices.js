#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { fetchPrices } = require('./providers/ggdeals');
const { fetchSteamPrices, detectRetailShop } = require('./providers/steam');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'game-prices');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'game-prices-config.json'), 'utf8'));

async function main() {
  const allGames = CONFIG.games || [];
  const supported = allGames.filter(g => g.enabled && Number.isInteger(g.steamAppId));
  fs.mkdirSync(OUT, { recursive: true });

  if (!process.env.GGDEALS_API_KEY) {
    console.log('GGDEALS_API_KEY ausente; atualização ignorada, sem alterar arquivos.');
    return;
  }

  const results = await fetchPrices(supported, { region: CONFIG.region || 'br' });
  // Identifica a loja do menor preço Retail (apenas Steam, por comparação de preço). Falha aqui nunca quebra a atualização.
  let steamPrices = {};
  try { steamPrices = await fetchSteamPrices(supported.filter(g => results[g.slug]?.status === 'ok'), { region: CONFIG.region || 'br' }); }
  catch (error) { console.log('Steam ignorada: ' + error.message); }
  for (const game of supported) {
    const r = results[game.slug];
    if (r && r.status === 'ok' && r.prices) r.prices.shopRetail = detectRetailShop(r.prices.currentRetail, steamPrices[game.slug]);
  }

  const index = {
    provider: 'ggdeals',
    region: CONFIG.region || 'br',
    updatedAt: new Date().toISOString(),
    games: allGames.map(g => ({ slug: g.slug, name: g.name, steamAppId: g.steamAppId || null, status: g.enabled ? 'enabled' : (g.status || 'mapping_pending') }))
  };

  for (const game of allGames) {
    let result;
    if (game.enabled && game.steamAppId) {
      result = results[game.slug] || { provider: 'ggdeals', status: 'not_found', game: game.name };
    } else {
      result = {
        provider: 'ggdeals',
        status: game.status || 'mapping_pending',
        game: game.name,
        message: game.status === 'not_available_pc'
          ? 'Este jogo não possui versão PC/Steam compatível com a consulta.'
          : 'Identificação Steam ainda precisa ser confirmada.',
        updatedAt: new Date().toISOString()
      };
    }
    const output = {
      slug: game.slug,
      name: game.name,
      platform: 'PC',
      ...(game.steamAppId ? { steamAppId: game.steamAppId } : {}),
      ...result
    };
    fs.writeFileSync(path.join(OUT, game.slug + '.json'), JSON.stringify(output, null, 2) + '\n');
    console.log('[' + game.slug + '] ' + result.status);
  }

  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
}

main().catch(error => {
  console.error('Falha ao atualizar preços: ' + error.message);
  process.exitCode = 1;
});
