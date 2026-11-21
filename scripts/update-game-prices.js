#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { fetchPrices } = require('./providers/ggdeals');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'game-prices');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'game-prices-config.json'), 'utf8'));

async function main() {
  const games = CONFIG.games.filter(g => g.enabled);
  fs.mkdirSync(OUT, { recursive: true });

  if (!process.env.GGDEALS_API_KEY) {
    console.log('GGDEALS_API_KEY ausente; atualização ignorada, sem alterar arquivos.');
    return;
  }

  const results = await fetchPrices(games, { region: CONFIG.region || 'br' });
  const index = {
    provider: 'ggdeals',
    region: CONFIG.region || 'br',
    updatedAt: new Date().toISOString(),
    games: games.map(game => ({ slug: game.slug, name: game.name, steamAppId: game.steamAppId }))
  };

  for (const game of games) {
    const result = results[game.slug] || { provider: 'ggdeals', status: 'not_found', game: game.name };
    const output = {
      slug: game.slug,
      name: game.name,
      platform: 'PC',
      steamAppId: game.steamAppId,
      ...result
    };
    fs.writeFileSync(path.join(OUT, `${game.slug}.json`), JSON.stringify(output, null, 2) + '\n');
    console.log(`[${game.slug}] ${result.status}`);
  }

  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 2) + '\n');
}

main().catch(error => {
  console.error(`Falha ao atualizar preços: ${error.message}`);
  process.exitCode = 1;
});
