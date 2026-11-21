(() => {
  'use strict';

  const CONFIG = {
    "2XKO": { name: "2XKO", slug: "2xko", status: "not_available_pc" },
    "ALFG": { name: "Avatar Legends: The Fighting Game", slug: "avatar-legends-the-fighting-game", status: "mapping_pending" },
    "BBCF": { name: "BlazBlue: Central Fiction", slug: "blazblue-central-fiction" },
    "Brawlhalla": { name: "Brawlhalla", slug: "brawlhalla" },
    "DNF": { name: "DNF Duel", slug: "dnf-duel" },
    "DBFZ": { name: "Dragon Ball FighterZ", slug: "dragon-ball-fighterz" },
    "FFCOTW": { name: "Fatal Fury: COTW", slug: "fatal-fury-cotw" },
    "GBVSR": { name: "Granblue Fantasy Versus: Rising", slug: "granblue-fantasy-versus-rising" },
    "GGST": { name: "Guilty Gear: Strive", slug: "guilty-gear-strive" },
    "IVS": { name: "Invincible Vs.", slug: "invincible-vs", status: "mapping_pending" },
    "INJ2": { name: "Injustice 2", slug: "injustice-2" },
    "Marvel Tokon: Fighting Souls": { name: "Marvel Tokon: Fighting Souls", slug: "marvel-tokon-fighting-souls", status: "mapping_pending" },
    "MVC2": { name: "Marvel vs. Capcom 2", slug: "marvel-vs-capcom-2", status: "mapping_pending" },
    "MBTL": { name: "Melty Blood: Type Lumina", slug: "melty-blood-type-lumina" },
    "Mystery Game": { name: "Mystery Game", slug: "mystery-game", status: "mapping_pending" },
    "MK1": { name: "Mortal Kombat 1", slug: "mortal-kombat-1" },
    "MK11": { name: "Mortal Kombat 11", slug: "mortal-kombat-11" },
    "MKX": { name: "Mortal Kombat X", slug: "mortal-kombat-x" },
    "UMK3": { name: "Ultimate Mortal Kombat 3", slug: "ultimate-mortal-kombat-3", status: "not_available_pc" },
    "MVS": { name: "MultiVersus", slug: "multiversus" },
    "PB": { name: "Pocket Bravery", slug: "pocket-bravery" },
    "ROA": { name: "Rivals of Aether", slug: "rivals-of-aether" },
    "ROCKET_LEAGUE": { name: "Rocket League", slug: "rocket-league" },
    "SS": { name: "Samurai Shodown", slug: "samurai-shodown" },
    "SG": { name: "Skullgirls 2nd Encore", slug: "skullgirls-2nd-encore" },
    "SF6": { name: "Street Fighter 6", slug: "street-fighter-6" },
    "SF3": { name: "Street Fighter III: 3rd Strike", slug: "street-fighter-iii-3rd-strike", note: "collection" },
    "SSBM": { name: "Super Smash Bros. Melee", slug: "super-smash-bros-melee", status: "not_available_pc" },
    "SSBU": { name: "Super Smash Bros. Ultimate", slug: "super-smash-bros-ultimate", status: "not_available_pc" },
    "ST": { name: "Super Street Fighter II Turbo", slug: "super-street-fighter-ii-turbo", status: "not_available_pc" },
    "TEKKEN7": { name: "Tekken 7", slug: "tekken-7" },
    "TEKKEN8": { name: "TEKKEN 8", slug: "tekken-8" },
    "KOF XV": { name: "The King of Fighters XV", slug: "the-king-of-fighters-xv" },
    "UMVC3": { name: "Ultimate Marvel vs. Capcom 3", slug: "ultimate-marvel-vs-capcom-3" },
    "UNISC": { name: "Under Night In-Birth II Sys:Celes", slug: "under-night-in-birth-ii-sys-celes" }
  };

  const panel = document.getElementById('game_prices_panel');
  const content = document.getElementById('game_prices_content');
  const gameSelect = document.getElementById('campo_jogo');
  if (!panel || !content || !gameSelect) return;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));

  function money(value, currency) {
    if (value === null || value === undefined || value === '') return 'Indisponível';
    const amount = Number(value);
    if (!Number.isFinite(amount)) return escapeHTML(value);
    try { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: currency || 'BRL' }).format(amount); }
    catch { return (amount.toFixed(2) + ' ' + (currency || '')).trim(); }
  }

  function priceCard(title, value, historical, currency, kind) {
    const current = value == null ? 'Indisponível' : money(value, currency);
    const low = historical == null ? '—' : money(historical, currency);
    return '<article class="game-price-card ' + kind + '">' +
      '<span class="game-price-label">' + title + '</span>' +
      '<strong class="game-price-value">' + current + '</strong>' +
      '<span class="game-price-history">Menor preço histórico: ' + low + '</span></article>';
  }

  async function render() {
    const selected = CONFIG[gameSelect.value] || {
      name: gameSelect.options[gameSelect.selectedIndex]?.textContent || gameSelect.value,
      slug: '', status: 'mapping_pending'
    };
    panel.hidden = false;
    panel.dataset.game = selected.slug || gameSelect.value;
    if (selected.status) {
      const message = selected.status === 'not_available_pc'
        ? 'Preço Steam indisponível: este jogo não possui uma versão Steam consultável pelo GG.deals.'
        : 'Preço em preparação: falta confirmar a correspondência correta deste jogo na Steam.';
      content.innerHTML = '<p class="game-prices-message">' + message + '</p><div class="game-prices-footer"><span>Servidor de preços · PC · Região BR</span></div>';
      return;
    }

    content.innerHTML = '<p class="game-prices-message">Carregando preços...</p>';
    try {
      const response = await fetch('data/game-prices/' + selected.slug + '.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('Dados ainda não publicados');
      const data = await response.json();
      if (panel.dataset.game !== selected.slug) return;

      if (data.status !== 'ok') {
        const message = data.status === 'not_found'
          ? 'Jogo ainda não encontrado na base GG.deals.'
          : 'Preços indisponíveis no momento.';
        content.innerHTML = '<p class="game-prices-message">' + message + '</p>';
        return;
      }

      const p = data.prices || {};
      const hasCurrent = p.currentRetail != null || p.currentKeyshops != null;
      const updated = data.updatedAt ? new Date(data.updatedAt).toLocaleString('pt-BR') : '—';
      let source = 'https://store.steampowered.com/app/' + data.steamAppId + '/';
      try {
        const candidate = new URL(data.sourceUrl || source);
        if (candidate.protocol === 'https:' && (candidate.hostname === 'gg.deals' || candidate.hostname.endsWith('.gg.deals') || candidate.hostname === 'store.steampowered.com')) source = candidate.href;
      } catch (_) {}
      content.innerHTML = (hasCurrent
        ? '<div class="game-prices-grid">' +
          priceCard('Lojas oficiais (menor preço)', p.currentRetail, p.historicalRetail, data.currency, 'retail') +
          priceCard('Keyshops (menor preço)', p.currentKeyshops, p.historicalKeyshops, data.currency, 'keyshop') +
          '</div>'
        : '<p class="game-prices-message">Sem ofertas atuais para esta região.</p>') +
        '<div class="game-prices-footer"><span>Servidor de preços · PC · Região BR · Atualizado: ' + escapeHTML(updated) + '</span><a href="' + escapeHTML(source) + '" target="_blank" rel="noopener noreferrer">Ver ofertas no GG.deals ↗</a></div>' +
        '<p class="game-prices-disclaimer">Valores agregados pelo GG.deals. Não representam preços de cada loja individualmente.</p>';
    } catch (error) {
      if (panel.dataset.game !== selected.slug) return;
      content.innerHTML = '<p class="game-prices-message">Servidor de preços ainda não recebeu a primeira atualização deste jogo. ' + escapeHTML(error.message) + '</p><div class="game-prices-footer"><span>Servidor de preços · PC · Região BR</span></div>';
    }
  }

  gameSelect.addEventListener('change', render);
  render();
})();
