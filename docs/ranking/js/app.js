/**
 * Ranking Tekken 8 — Brasil
 * Lê data/ranking.json e exibe o ranking.
 */

const API_BASE = '../data';
const $ = id => document.getElementById(id);
let rankingData = null;
let mode = 'online';
let sortKey = 'pts';
let sortAsc = false;

async function load() {
  try {
    const [r, e] = await Promise.all([
      fetch(API_BASE + '/ranking.json').then(r => r.json()),
      fetch(API_BASE + '/eventos.json').then(r => r.json())
    ]);
    rankingData = r;
    rankingData.eventos = e.eventos || [];
    $('count').textContent = `${r.totalEventos} eventos · ${r.totalPlayers} players pontuando`;
    $('pointsInfo').textContent = r.pontos || '';
    render();
  } catch (err) {
    $('status').textContent = 'Erro ao carregar dados: ' + err.message;
  }
}

function compute(m) {
  if (!rankingData || !rankingData.ranking) return [];
  const list = rankingData.ranking.filter(o => {
    const evs = (o.list || []).filter(x => {
      const ev = rankingData.eventos.find(e => e.name === x.name);
      return ev ? (m === 'online' ? ev.online : !ev.online) : true;
    });
    const pts = evs.reduce((s, x) => s + x.pts, 0);
    const best = evs.length ? Math.min(...evs.map(x => x.p)) : 99;
    return { ...o, pts, best, list: evs };
  }).sort((a, b) => b.pts - a.pts || a.best - b.best || a.tag.localeCompare(b.tag));

  return list;
}

function render() {
  const list = compute(mode);
  const body = $('body');
  body.innerHTML = '';
  let pos = 0, last = null;
  list.forEach((o, i) => {
    if (o.pts !== last) { pos = i + 1; last = o.pts; }
    const tr = document.createElement('tr');
    tr.className = 'p';
    const cls = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : '';
    tr.innerHTML = `<td class="pos ${cls}">${pos}</td><td class="rank-name">${esc(o.tag)}</td><td class="n"><b>${o.pts}</b></td><td class="n">${o.list.length}</td><td class="n">${o.best === 99 ? '-' : o.best + 'º'}</td>`;
    let open = null;
    tr.onclick = () => {
      if (open) { open.remove(); open = null; return; }
      open = document.createElement('tr');
      open.className = 'd';
      const lines = o.list.sort((a, b) => b.date - a.date).map(x => {
        const d = new Date(x.date * 1000).toLocaleDateString('pt-BR');
        return `${d} · ${esc(x.name)} · ${x.p}º de ${x.entrants} · +${x.pts}`;
      }).join('<br>');
      open.innerHTML = `<td></td><td colspan="4"><div class="detail">${lines || 'Sem resultados'}</div></td>`;
      tr.after(open);
    };
    body.appendChild(tr);
  });
  $('count').textContent = `${rankingData.totalEventos} eventos · ${list.length} players pontuando`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

$('toggle').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  mode = b.dataset.m;
  document.querySelectorAll('#toggle button').forEach(x => x.classList.toggle('act', x === b));
  render();
});

document.querySelectorAll('th[data-k]').forEach(th => {
  th.onclick = () => {
    const k = th.dataset.k;
    if (sortKey === k) sortAsc = !sortAsc;
    else { sortKey = k; sortAsc = true; }
    render();
  };
});

load();
