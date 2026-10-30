/* FGC HUB - decoração animada do tema Halloween (aditivo)
   Só existe no DOM enquanto <html data-theme="halloween">.
   Estilos dos elementos ficam em themes.css (#hw-back / #hw-front). */
(function () {
  var THEME = 'halloween';
  var rnd = function (a, b) { return a + Math.random() * (b - a); };

  var BAT_SVG =
    '<svg viewBox="0 0 64 32" width="100%" height="100%" aria-hidden="true">' +
    '<path fill="currentColor" d="M32 9 L30 5 L29 11 C24 7 14 6 4 10 C8 12 9 15 8 19 C12 16 16 16 19 19 ' +
    'C21 16 25 15 28 17 C29 20 30 22 32 26 C34 22 35 20 36 17 C39 15 43 16 45 19 C48 16 52 16 56 19 ' +
    'C55 15 56 12 60 10 C50 6 40 7 35 11 L34 5 Z"/>' +
    '<circle cx="30" cy="12" r="1" fill="#ffb347"/><circle cx="34" cy="12" r="1" fill="#ffb347"/></svg>';

  var WEB_SVG =
    '<svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden="true" fill="none" ' +
    'stroke="currentColor" stroke-width="1">' +
    '<path d="M0 0 L120 0 M0 0 L0 120 M0 0 L110 60 M0 0 L60 110 M0 0 L95 95"/>' +
    '<path d="M0 22 Q22 22 22 0 M0 44 Q44 44 44 0 M0 68 Q68 68 68 0 M0 92 Q92 92 92 0 M0 116 Q116 116 116 0"/></svg>';

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html) e.innerHTML = html;
    return e;
  }

  function addBat(front, delayOverride) {
    var wrap = el('div', 'hw-bat');
    var size = rnd(26, 54);
    wrap.style.setProperty('--sz', size + 'px');
    wrap.style.setProperty('--top', rnd(3, 70) + 'vh');
    wrap.style.setProperty('--dur', rnd(9, 20) + 's');
    wrap.style.setProperty('--dy', rnd(-9, 9) + 'vh');
    wrap.style.setProperty('--flap', rnd(0.16, 0.3) + 's');
    wrap.style.animationDelay = (delayOverride != null ? delayOverride : rnd(0, 14)) + 's';
    wrap.style.animationDirection = Math.random() < 0.5 ? 'normal' : 'reverse';
    wrap.appendChild(el('div', 'hw-bat-in', BAT_SVG));
    front.appendChild(wrap);
    return wrap;
  }

  function mount() {
    if (document.getElementById('hw-back')) return;
    if (!document.body) return;

    /* ---- atrás do conteúdo ---- */
    var back = el('div', '');
    back.id = 'hw-back';
    back.setAttribute('aria-hidden', 'true');
    back.appendChild(el('div', 'hw-moon'));
    back.appendChild(el('div', 'hw-web hw-web-l', WEB_SVG));
    back.appendChild(el('div', 'hw-web hw-web-r', WEB_SVG));
    back.appendChild(el('div', 'hw-fog hw-fog-1'));
    back.appendChild(el('div', 'hw-fog hw-fog-2'));
    var flash = el('div', 'hw-flash');
    back.appendChild(flash);
    document.body.appendChild(back);

    /* ---- na frente (pointer-events: none, exceto abóboras) ---- */
    var front = el('div', '');
    front.id = 'hw-front';
    front.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < 8; i++) addBat(front);

    var ghost = el('div', 'hw-ghost', '👻');
    ghost.style.setProperty('--gx', rnd(8, 40) + 'vw');
    front.appendChild(ghost);
    var ghost2 = el('div', 'hw-ghost hw-ghost-b', '👻');
    ghost2.style.setProperty('--gx', rnd(55, 85) + 'vw');
    front.appendChild(ghost2);

    var spider = el('div', 'hw-spider', '<i></i><span>🕷️</span>');
    spider.style.setProperty('--sx', rnd(62, 78) + 'vw');
    front.appendChild(spider);
    var spider2 = el('div', 'hw-spider hw-spider-b', '<i></i><span>🕷️</span>');
    spider2.style.setProperty('--sx', rnd(8, 18) + 'vw');
    front.appendChild(spider2);

    var row = el('div', 'hw-pumpkins');
    var faces = ['🎃', '🎃', '🎃', '🎃', '🎃'];
    faces.forEach(function (f, idx) {
      var p = el('button', 'hw-pumpkin', f);
      p.type = 'button';
      p.tabIndex = -1;
      p.style.setProperty('--d', (idx * 0.45) + 's');
      p.style.setProperty('--s', rnd(30, 52) + 'px');
      p.addEventListener('click', function () {
        p.classList.remove('hw-pop');
        void p.offsetWidth;
        p.classList.add('hw-pop');
        var r = p.getBoundingClientRect();
        for (var k = 0; k < 4; k++) {
          var b = addBat(front, 0);
          b.classList.add('hw-burst');
          b.style.setProperty('--top', (r.top / window.innerHeight * 100) + 'vh');
          b.style.setProperty('--dur', rnd(4, 7) + 's');
          b.addEventListener('animationend', function (ev) { ev.currentTarget.remove(); }, { once: true });
        }
      });
      row.appendChild(p);
    });
    front.appendChild(row);

    document.body.appendChild(front);

    /* relâmpago aleatório */
    (function storm() {
      if (!document.getElementById('hw-back')) return;
      setTimeout(function () {
        var f = document.querySelector('#hw-back .hw-flash');
        if (f) {
          f.classList.remove('hw-go');
          void f.offsetWidth;
          f.classList.add('hw-go');
        }
        storm();
      }, rnd(9000, 20000));
    })();
  }

  function unmount() {
    ['hw-back', 'hw-front'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.remove();
    });
  }

  function sync() {
    if (document.documentElement.getAttribute('data-theme') === THEME) mount();
    else unmount();
  }

  function start() {
    sync();
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme']
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
