(() => {
  'use strict';

  const CONFIG = {
    TEKKEN8: { slug: 'tekken-8', name: 'TEKKEN 8' },
    SF6: { slug: 'street-fighter-6', name: 'Street Fighter 6' }
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
    catch { return `${amount.toFixed(2)} ${currency || ''}`.trim(); }
  }

  function priceCard(title, value, historical, currency, kind) {
    const current = value == null ? 'Indisponível' : money(value, currency);
    const low = historical == null ? '—' : money(historical, currency);
    return `<article class="game-price-card ${kind}">
      <span class="game-price-label">${title}</span>
      <strong class="game-price-value">${current}</strong>
      <span class="game-price-history">Menor preço histórico: ${low}</span>
    </article>`;
  }

  async function render() {
    const selected = CONFIG[gameSelect.value];
    if (!selected) {
      panel.hidden = true;
      return;
    }

    panel.hidden = false;
    panel.dataset.game = selected.slug;
    content.innerHTML = '<p class="game-prices-message">Carregando preços...</p>';
    try {
      const response = await fetch(`data/game-prices/${selected.slug}.json`, { cache: 'no-cache' });
      if (!response.ok) throw new Error('Dados ainda não publicados');
      const data = await response.json();
      if (panel.dataset.game !== selected.slug) return;

      if (data.status !== 'ok') {
        const message = data.status === 'not_configured' ? 'API GG.deals pendente: configure o secret GGDEALS_API_KEY no GitHub.' : data.status === 'not_found' ? 'Jogo ainda não encontrado na base GG.deals.' : 'Preços indisponíveis no momento.';
        content.innerHTML = `<p class="game-prices-message">${message}</p>`;
        return;
      }

      const p = data.prices || {};
      const hasCurrent = p.currentRetail != null || p.currentKeyshops != null;
      const updated = data.updatedAt ? new Date(data.updatedAt).toLocaleString('pt-BR') : '—';
      let source = `https://store.steampowered.com/app/${data.steamAppId}/`;
      try { const candidate = new URL(data.sourceUrl || source); if (candidate.protocol === 'https:' && (candidate.hostname === 'gg.deals' || candidate.hostname.endsWith('.gg.deals') || candidate.hostname === 'store.steampowered.com')) source = candidate.href; } catch { /* mantém link seguro da Steam */ }
      content.innerHTML = `${hasCurrent ? `<div class="game-prices-grid">
        ${priceCard('Lojas oficiais (menor preço)', p.currentRetail, p.historicalRetail, data.currency, 'retail')}
        ${priceCard('Keyshops (menor preço)', p.currentKeyshops, p.historicalKeyshops, data.currency, 'keyshop')}
      </div>` : '<p class="game-prices-message">Sem ofertas atuais para esta região.</p>'}
      <div class="game-prices-footer"><span>PC · Região BR · Atualizado: ${escapeHTML(updated)}</span><a href="${escapeHTML(source)}" target="_blank" rel="noopener noreferrer">Ver ofertas no GG.deals ↗</a></div>
      <p class="game-prices-disclaimer">Valores agregados pelo GG.deals. Não representam preços de cada loja individualmente.</p>`;
    } catch (error) {
      if (panel.dataset.game !== selected.slug) return;
      content.innerHTML = `<p class="game-prices-message">Preços ainda não disponíveis. ${escapeHTML(error.message)}</p>`;
    }
  }

  gameSelect.addEventListener('change', render);
  render();
})();
