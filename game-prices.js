(() => {
  'use strict';

  const CONFIG = {
    "2XKO": { name: "2XKO", slug: "2xko", status: "not_available_pc" },
    "ALFG": { name: "Avatar Legends: The Fighting Game", slug: "alfg", status: "mapping_pending" },
    "BBCF": { name: "BlazBlue: Central Fiction", slug: "bbcf" },
    "Brawlhalla": { name: "Brawlhalla", slug: "brawlhalla" },
    "DNF": { name: "DNF Duel", slug: "dnf" },
    "DBFZ": { name: "Dragon Ball FighterZ", slug: "dbfz" },
    "FFCOTW": { name: "Fatal Fury: COTW", slug: "ffcotw" },
    "GBVSR": { name: "Granblue Fantasy Versus: Rising", slug: "gbvsr" },
    "GGST": { name: "Guilty Gear: Strive", slug: "ggst" },
    "IVS": { name: "Invincible Vs.", slug: "ivs", status: "mapping_pending" },
    "INJ2": { name: "Injustice 2", slug: "inj2" },
    "Marvel Tokon: Fighting Souls": { name: "Marvel Tokon: Fighting Souls", slug: "marvel-tokon-fighting-souls", status: "mapping_pending" },
    "MVC2": { name: "Marvel vs. Capcom 2", slug: "mvc2", status: "mapping_pending" },
    "MBTL": { name: "Melty Blood: Type Lumina", slug: "mbtl" },
    "Mystery Game": { name: "Mystery Game", slug: "mystery-game", status: "mapping_pending" },
    "MK1": { name: "Mortal Kombat 1", slug: "mk1" },
    "MK11": { name: "Mortal Kombat 11", slug: "mk11" },
    "MKX": { name: "Mortal Kombat X", slug: "mkx" },
    "UMK3": { name: "Ultimate Mortal Kombat 3", slug: "umk3", status: "not_available_pc" },
    "MVS": { name: "MultiVersus", slug: "mvs" },
    "PB": { name: "Pocket Bravery", slug: "pb" },
    "ROA": { name: "Rivals of Aether", slug: "roa" },
    "ROCKET_LEAGUE": { name: "Rocket League", slug: "rocket-league" },
    "SS": { name: "Samurai Shodown", slug: "ss" },
    "SG": { name: "Skullgirls 2nd Encore", slug: "sg" },
    "SF6": { name: "Street Fighter 6", slug: "sf6" },
    "SF3": { name: "Street Fighter III: 3rd Strike", slug: "sf3", note: "collection" },
    "SSBM": { name: "Super Smash Bros. Melee", slug: "ssbm", status: "not_available_pc" },
    "SSBU": { name: "Super Smash Bros. Ultimate", slug: "ssbu", status: "not_available_pc" },
    "ST": { name: "Super Street Fighter II Turbo", slug: "st", status: "not_available_pc" },
    "TEKKEN7": { name: "Tekken 7", slug: "tekken7" },
    "TEKKEN8": { name: "TEKKEN 8", slug: "tekken8" },
    "KOF XV": { name: "The King of Fighters XV", slug: "kof-xv" },
    "UMVC3": { name: "Ultimate Marvel vs. Capcom 3", slug: "umvc3" },
    "UNISC": { name: "Under Night In-Birth II Sys:Celes", slug: "unisc" }
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

  const SHOPS = { steam: 'Steam' };
  function shopLogo(shop) {
    if (!Object.prototype.hasOwnProperty.call(SHOPS, shop)) return '';
    return '<img class="game-price-shop" src="imagens/shops/' + shop + '.svg" alt="' + SHOPS[shop] + '" title="' + SHOPS[shop] + '" height="18" style="height:18px;width:auto;display:block;margin:2px 0" onerror="this.remove()">';
  }

  function priceCard(title, value, historical, currency, kind, shop) {
    const current = value == null ? 'Indisponível' : money(value, currency);
    const low = historical == null ? '—' : money(historical, currency);
    return '<article class="game-price-card ' + kind + '">' +
      '<span class="game-price-label">' + title + '</span>' + shopLogo(shop) +
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
          : 'Servidor de preços não retornou ofertas para esta região.';
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
          priceCard('Lojas oficiais (menor preço)', p.currentRetail, p.historicalRetail, data.currency, 'retail', p.shopRetail) +
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
