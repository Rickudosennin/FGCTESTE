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


  var CAT_SVG =
    '<svg viewBox="0 0 100 64" width="100%" height="100%" aria-hidden="true">' +
    '<g class="hw-cat-tail"><path d="M22 38 C4 38 2 20 12 9" fill="none" stroke="#0a0a0c" stroke-width="7" stroke-linecap="round"/></g>' +
    '<g class="hw-leg hw-leg-b"><line x1="32" y1="44" x2="32" y2="60" stroke="#0a0a0c" stroke-width="7" stroke-linecap="round"/></g>' +
    '<g class="hw-leg hw-leg-a"><line x1="62" y1="44" x2="62" y2="60" stroke="#0a0a0c" stroke-width="7" stroke-linecap="round"/></g>' +
    '<ellipse cx="46" cy="36" rx="27" ry="13" fill="#0a0a0c"/>' +
    '<g class="hw-leg hw-leg-a"><line x1="42" y1="44" x2="42" y2="61" stroke="#0a0a0c" stroke-width="7" stroke-linecap="round"/></g>' +
    '<g class="hw-leg hw-leg-b"><line x1="72" y1="44" x2="72" y2="61" stroke="#0a0a0c" stroke-width="7" stroke-linecap="round"/></g>' +
    '<circle cx="79" cy="26" r="11.5" fill="#0a0a0c"/>' +
    '<polygon points="69,20 71,6 80,16" fill="#0a0a0c"/><polygon points="79,16 87,6 89,21" fill="#0a0a0c"/>' +
    '<g class="hw-cat-eyes"><ellipse cx="76" cy="25" rx="2.6" ry="3.2" fill="#c8ff3d"/><ellipse cx="85" cy="25" rx="2.6" ry="3.2" fill="#c8ff3d"/>' +
    '<rect x="75.3" y="22.5" width="1.4" height="5" rx=".7" fill="#0a0a0c"/><rect x="84.3" y="22.5" width="1.4" height="5" rx=".7" fill="#0a0a0c"/></g>' +
    '</svg>';

  function addCat() {
    var campo = document.getElementById('campo_jogo');
    var host = campo && campo.closest('.glass-card');
    if (!host || host.querySelector('.hw-cat')) return;
    host.classList.add('hw-cat-host');
    var cat = el('div', 'hw-cat');
    var flip = el('div', 'hw-cat-flip', CAT_SVG);
    var bubble = el('div', 'hw-meow', 'miau! 🐾');
    cat.appendChild(bubble);
    cat.appendChild(flip);
    cat.addEventListener('click', function () {
      bubble.classList.remove('hw-say');
      void bubble.offsetWidth;
      bubble.classList.add('hw-say');
    });
    host.appendChild(cat);
  }

  function removeCat() {
    var c = document.querySelector('.hw-cat');
    if (c) c.remove();
    var h = document.querySelector('.hw-cat-host');
    if (h) h.classList.remove('hw-cat-host');
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
    addCat();

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
    removeCat();
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