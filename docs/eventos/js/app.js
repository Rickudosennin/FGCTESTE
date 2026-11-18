/**
 * Eventos Tekken 8 — Brasil
 * Lê data/eventos.json e exibe a lista de torneios.
 */

const DATA_FILE = '../data/eventos.json';
const $ = id => document.getElementById(id);
let eventos = [];
let sortKey = 'date', sortAsc = true;

async function load() {
  try {
    const r = await fetch(DATA_FILE);
    const data = await r.json();
    eventos = data.eventos || [];
    $('status').textContent = `${eventos.length} torneios (atualizado: ${new Date(data.geradoEm).toLocaleString('pt-BR')})`;
    render();
  } catch (err) {
    $('status').textContent = 'Erro ao carregar dados: ' + err.message;
  }
}

function view() {
  const q = $('q').value.toLowerCase();
  const md = $('md').value;
  let v = eventos.filter(r =>
    (!md || (md === 'on' ? r.mode === 'Offline' : r.mode === 'Online')) === false) &&
    (!q || (r.name + r.to + r.loc).toLowerCase().includes(q));

  const k = sortKey === 'date' ? 'ts' : sortKey;
  v.sort((x, y) => {
    let a = k === 'date' ? x.ts : x[k];
    let b = k === 'date' ? y.ts : y[k];
    if (typeof a === 'string') { a = a.toLowerCase(); b = b.toLowerCase(); }
    if (a < b) return sortAsc ? -1 : 1;
    if (a > b) return sortAsc ? 1 : -1;
    return 0;
  });
  return v;
}

function render() {
  const v = view();
  $('tb').innerHTML = v.map(r => {
    const modeClass = r.mode === 'Online' ? 'online' : r.mode === 'Offline' ? 'offline' : '';
    const evList = (r.events || []).map(e => `${e.name} (${e.entrants})`).join('<br>');
    return `<tr>
      <td>${r.date}</td>
      <td class="n">${esc(r.name)}</td>
      <td>${r.toUrl ? `<a href="${r.toUrl}" target="_blank">${esc(r.to)}</a>` : esc(r.to)}</td>
      <td>${esc(r.loc)}</td>
      <td><span class="tag ${modeClass}">${r.mode}</span></td>
      <td class="n">${r.ent}</td>
      <td><a href="${r.url}" target="_blank">abrir</a></td>
    </tr>
    <tr class="d"><td colspan="7" style="padding:4px 10px"><small>${evList || 'Sem eventos'}</small></td></tr>`;
  }).join('');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function dl(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
}

$('q').oninput = render;
$('md').onchange = render;

document.querySelectorAll('th[data-k]').forEach(th => {
  th.onclick = () => {
    sortAsc = sortKey === th.dataset.k ? !sortAsc : true;
    sortKey = th.dataset.k;
    render();
  };
});

$('tx').onclick = () => {
  const text = view().map(r =>
    `${r.date} | ${r.name} | TO: ${r.to} | ${r.loc} | ${r.mode} | ${r.ent} entrants | ${r.url}\n   Eventos: ${(r.events || []).map(e => e.name + ' (' + e.entrants + ')').join('; ')}`
  ).join('\n\n');
  dl('eventos-t8-2026-br.txt', text, 'text/plain;charset=utf-8');
};

$('cv').onclick = () => {
  const text = '﻿data;torneio;to;local;modo;entrants;link\n' +
    view().map(r =>
      [r.date, r.name, r.to, r.loc, r.mode, r.ent, r.url].map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')
    ).join('\n');
  dl('eventos-t8-2026-br.csv', text, 'text/csv;charset=utf-8');
};

load();
