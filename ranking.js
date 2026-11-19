/* =========================================================
   RankingBR — ranking.js
   Carrega dados JSON locais e renderiza a tabela.
   ========================================================= */

/* ---------- helpers ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function formatDate(unixTs) {
  const d = new Date(unixTs * 1000);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatUpdatedAt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

/* ---------- state ---------- */
let rawPlayers  = [];   // full player list from JSON
let currentSlug = null; // active game slug
let sortField   = 'pts';
let sortDesc    = true;

/* ---------- load ---------- */
async function loadIndex() {
  const res = await fetch('data/ranking/index.json');
  if (!res.ok) throw new Error('index.json não encontrado');
  return res.json();
}

async function loadGame(slug) {
  const res = await fetch(`data/ranking/${slug}.json`);
  if (!res.ok) throw new Error(`${slug}.json não encontrado`);
  return res.json();
}

/* ---------- nav ---------- */
function buildNav(games, activeSlug) {
  const nav = $('#gameNav');
  nav.innerHTML = '';
  games.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'game-tab' + (g.slug === activeSlug ? ' active' : '');
    btn.textContent = g.name;
    btn.addEventListener('click', () => {
      if (g.slug === currentSlug) return;
      currentSlug = g.slug;
      loadAndRender(g.slug);
      // update active tab
      $$('.game-tab').forEach(b => b.classList.toggle('active', b.textContent === g.name));
    });
    nav.appendChild(btn);
  });
}

/* ---------- render ---------- */
function buildPip(pos, eventName) {
  let cls, label;
  if (pos === 1)      { cls = 'pip-1';   label = '🥇 1º'; }
  else if (pos === 2) { cls = 'pip-2';   label = '🥈 2º'; }
  else if (pos === 3) { cls = 'pip-3';   label = '🥉 3º'; }
  else if (pos <= 5)  { cls = 'pip-top5'; label = `${pos}º`; }
  else if (pos <= 10) { cls = 'pip-top10'; label = `${pos}º`; }
  else                { cls = 'pip-other'; label = `${pos}º`; }

  const span = document.createElement('span');
  span.className = `result-pip ${cls}`;
  span.textContent = pos;
  span.setAttribute('data-tip', `${label} — ${eventName}`);
  return span;
}

function posBadge(pos) {
  if (pos === 1) return '<span class="pos-badge pos-1">1</span>';
  if (pos === 2) return '<span class="pos-badge pos-2">2</span>';
  if (pos === 3) return '<span class="pos-badge pos-3">3</span>';
  return `<span class="pos-badge pos-other">${pos}</span>`;
}

function renderTable(players) {
  const tbody = $('#rankingBody');
  tbody.innerHTML = '';

  if (!players.length) {
    $('#emptyState').style.display = 'block';
    return;
  }
  $('#emptyState').style.display = 'none';

  players.forEach(p => {
    const tr = document.createElement('tr');

    // position
    const tdPos = document.createElement('td');
    tdPos.className = 'col-pos';
    tdPos.innerHTML = posBadge(p.pos);

    // player tag
    const tdPlayer = document.createElement('td');
    tdPlayer.className = 'col-player';
    tdPlayer.innerHTML = `
      <span class="player-tag">${p.tag}</span>
      <span class="player-id">#${p.id}</span>
    `;

    // pts
    const tdPts = document.createElement('td');
    tdPts.className = 'col-pts';
    tdPts.innerHTML = `<span class="pts-val">${p.pts}</span>`;

    // n
    const tdN = document.createElement('td');
    tdN.className = 'col-n';
    tdN.textContent = p.n;

    // best
    const tdBest = document.createElement('td');
    tdBest.className = 'col-best';
    tdBest.innerHTML = posBadge(p.best);

    // results
    const tdRes = document.createElement('td');
    tdRes.className = 'col-results';
    const row = document.createElement('div');
    row.className = 'results-row';
    p.list.forEach(ev => row.appendChild(buildPip(ev.p, ev.n)));
    tdRes.appendChild(row);

    tr.append(tdPos, tdPlayer, tdPts, tdN, tdBest, tdRes);
    tbody.appendChild(tr);
  });
}

/* ---------- filters ---------- */
function applyFilters(allPlayers) {
  const q      = $('#searchInput').value.trim().toLowerCase();
  const active = $('#filterActive').checked;
  const podium = $('#filterPodium').checked;

  let filtered = allPlayers;

  if (q) {
    filtered = filtered.filter(p =>
      p.tag.toLowerCase().includes(q) || String(p.id).includes(q)
    );
  }
  if (active) {
    filtered = filtered.filter(p => p.n > 0);
  }
  if (podium) {
    filtered = filtered.filter(p => p.pos <= 3);
  }

  /* sort */
  filtered.sort((a, b) => {
    let va, vb;
    switch (sortField) {
      case 'pts':   va = a.pts; vb = b.pts; break;
      case 'n':     va = a.n;   vb = b.n;   break;
      case 'best':  va = a.best; vb = b.best; break;
      default:      va = a.pts; vb = b.pts;
    }
    return sortDesc ? vb - va : va - vb;
  });

  renderTable(filtered);
}

/* ---------- main load ---------- */
async function loadAndRender(slug) {
  try {
    const data = await loadGame(slug);
    rawPlayers = data.modes.online.players;

    /* header */
    $('#heroTitle').textContent = data.name;
    $('#updatedAt').textContent = 'Atualizado: ' + formatUpdatedAt(data.updatedAt);
    $('#eventsBadge').textContent = `${data.modes.online.events} eventos`;

    applyFilters(rawPlayers);
  } catch (e) {
    console.error(e);
    $('#heroTitle').textContent = 'Erro ao carregar';
  }
}

/* ---------- init ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const index = await loadIndex();
    if (!index.games.length) {
      $('#heroTitle').textContent = 'Nenhum jogo cadastrado';
      return;
    }
    currentSlug = index.games[0].slug;
    buildNav(index.games, currentSlug);
    await loadAndRender(currentSlug);
  } catch (e) {
    console.error(e);
    $('#heroTitle').textContent = 'Erro ao carregar dados';
  }

  /* search */
  $('#searchInput').addEventListener('input', () => {
    $('#clearSearch').classList.toggle('visible', !!$('#searchInput').value);
    applyFilters(rawPlayers);
  });
  $('#clearSearch').addEventListener('click', () => {
    $('#searchInput').value = '';
    $('#clearSearch').classList.remove('visible');
    applyFilters(rawPlayers);
  });

  /* filter chips */
  ['filterActive', 'filterPodium'].forEach(id => {
    $(`#${id}`).addEventListener('change', () => applyFilters(rawPlayers));
  });

  /* column sort */
  $$('[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const f = th.dataset.sort;
      if (sortField === f) sortDesc = !sortDesc;
      else { sortField = f; sortDesc = true; }
      applyFilters(rawPlayers);
    });
  });
});
