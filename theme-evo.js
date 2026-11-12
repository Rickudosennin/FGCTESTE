/* FGC HUB - contagem regressiva e layout do tema "Evo 2027" (aditivo)
   - Só aparece com html[data-theme="evo"]; nos outros temas é removida. */
(function () {
  var ALVO = new Date('2027-03-26T10:00:00-03:00').getTime();
  var FIM = new Date('2027-03-28T23:59:59-03:00').getTime();
  var root = document.documentElement;
  var el = null, ref = null, timer = null;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function partes(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }

  function montar() {
    if (el) return;
    var header = document.querySelector('main header');
    if (!header || Date.now() > FIM) return;
    el = document.createElement('section');
    el.id = 'evo-countdown';
    el.setAttribute('aria-label', 'Contagem regressiva para a Evo Brazil 2027');
    el.innerHTML =
      '<p class="evo-cd-kicker">Evo Brazil 2027 <span aria-hidden="true">◆</span> 26–28 Mar <span aria-hidden="true">◆</span> Expo Center Norte</p>' +
      '<p class="evo-cd-title" data-evo="titulo">A batalha começa em</p>' +
      '<div class="evo-cd-grid" data-evo="grid" aria-hidden="true">' +
        '<div class="evo-cd-unit"><span class="evo-cd-num" data-evo="d">00</span><span class="evo-cd-lbl">Dias</span></div>' +
        '<span class="evo-cd-sep">◆</span>' +
        '<div class="evo-cd-unit"><span class="evo-cd-num" data-evo="h">00</span><span class="evo-cd-lbl">Horas</span></div>' +
        '<span class="evo-cd-sep">◆</span>' +
        '<div class="evo-cd-unit"><span class="evo-cd-num" data-evo="m">00</span><span class="evo-cd-lbl">Min</span></div>' +
        '<span class="evo-cd-sep">◆</span>' +
        '<div class="evo-cd-unit"><span class="evo-cd-num" data-evo="s">00</span><span class="evo-cd-lbl">Seg</span></div>' +
      '</div>' +
      '<p class="evo-cd-live" data-evo="live" hidden>Evo Brazil ao vivo</p>' +
      '<a class="evo-cd-link" href="https://evobrazil.gg/" target="_blank" rel="noopener noreferrer">Ingressos e informações →</a>' +
      '<p class="evo-sr">Evo Brazil 2027 começa em 26 de março de 2027, às 10 horas, no Expo Center Norte, em São Paulo.</p>';
    header.insertAdjacentElement('afterend', el);
    ref = {};
    var nos = el.querySelectorAll('[data-evo]');
    for (var i = 0; i < nos.length; i++) ref[nos[i].getAttribute('data-evo')] = nos[i];
    tick();
    timer = setInterval(tick, 1000);
  }

  function desmontar() {
    if (timer) { clearInterval(timer); timer = null; }
    if (el && el.parentNode) el.parentNode.removeChild(el);
    el = null; ref = null;
  }

  function tick() {
    if (!el) return;
    var agora = Date.now();
    if (agora > FIM) { desmontar(); return; }
    if (agora >= ALVO) {
      ref.titulo.hidden = true;
      ref.grid.hidden = true;
      ref.live.hidden = false;
      return;
    }
    var p = partes(ALVO - agora);
    ref.d.textContent = pad(p.d);
    ref.h.textContent = pad(p.h);
    ref.m.textContent = pad(p.m);
    ref.s.textContent = pad(p.s);
  }

  function sync() {
    if (root.getAttribute('data-theme') === 'evo') montar();
    else desmontar();
  }

  // Intercepta o ativo() do Broadcast apenas para forçar o card em linha na Evo
  // Sem precisar alterar o arquivo original broadcast-card.js
  if (window.FGCBroadcast) {
    var originalAtivo = window.FGCBroadcast.ativo;
    window.FGCBroadcast.ativo = function() {
      var tema = document.documentElement.getAttribute('data-theme');
      if (tema === 'evo') return true;
      return originalAtivo ? originalAtivo() : false;
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync);
  else sync();

  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });

  window.FGCEvoCountdown = { partes: partes, alvo: ALVO, fim: FIM };
})();