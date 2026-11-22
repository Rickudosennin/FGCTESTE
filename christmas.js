/* FGC HUB — efeito natalino discreto. Não altera data-theme nem tokens dos temas. */
(function () {
  'use strict';
  var now = new Date();
  var start = new Date(now.getFullYear(), 10, 20);
  var end = new Date(now.getFullYear(), 11, 27);
  if (now < start || now >= end || !document.body) return;
  if (document.getElementById('fgc-xmas-layer')) return;

  var layer = document.createElement('div');
  layer.id = 'fgc-xmas-layer';
  layer.setAttribute('aria-hidden', 'true');

  var branch = '<svg viewBox="0 0 240 150" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M-8 8 Q70 34 145 102" fill="none" stroke="#72543b" stroke-width="5" stroke-linecap="round"/>' +
    '<g fill="none" stroke="#176b3a" stroke-width="5" stroke-linecap="round">' +
    '<path d="M18 18 L5 2 M28 24 L31 4 M40 31 L22 10 M53 39 L57 16 M66 48 L47 27 M80 58 L88 34 M94 68 L72 49 M108 78 L119 54 M122 88 L100 71 M136 98 L151 76 M150 108 L129 91 M164 118 L181 99"/>' +
    '<path d="M19 22 L2 27 M37 32 L20 43 M57 43 L39 56 M77 56 L61 69 M98 70 L81 83 M119 84 L103 97 M140 98 L125 112"/>' +
    '</g><g fill="#24864b" opacity=".9">' +
    '<circle cx="29" cy="18" r="3"/><circle cx="62" cy="44" r="3"/><circle cx="96" cy="68" r="3"/><circle cx="131" cy="94" r="3"/>' +
    '</g></svg>';
  ['xmas-left', 'xmas-right'].forEach(function (cls) {
    var corner = document.createElement('div');
    corner.className = 'xmas-corner ' + cls;
    corner.innerHTML = branch;
    layer.appendChild(corner);
  });

  var colors = ['#c83b3b', '#d5b45b', '#e8e8e8'];
  [
    { left: '8%', top: '68px', color: colors[0] },
    { left: '15%', top: '92px', color: colors[1] },
    { left: '86%', top: '76px', color: colors[1] },
    { left: '92%', top: '45px', color: colors[0] }
  ].forEach(function (item) {
    var bauble = document.createElement('i');
    bauble.className = 'xmas-bauble';
    bauble.style.setProperty('--left', item.left);
    bauble.style.setProperty('--top', item.top);
    bauble.style.setProperty('--bauble', item.color);
    layer.appendChild(bauble);
  });

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var count = reduced ? 12 : (window.innerWidth <= 640 ? 24 : 42);
  for (var i = 0; i < count; i++) {
    var flake = document.createElement('i');
    flake.className = 'xmas-flake';
    flake.style.setProperty('--x', (Math.random() * 100) + 'vw');
    flake.style.setProperty('--s', (Math.random() * 3 + 2) + 'px');
    flake.style.setProperty('--o', (Math.random() * .45 + .35).toFixed(2));
    flake.style.setProperty('--d', (Math.random() * 9 + 9) + 's');
    flake.style.setProperty('--delay', (-Math.random() * 18) + 's');
    flake.style.setProperty('--drift', (Math.random() * 70 - 35) + 'px');
    layer.appendChild(flake);
  }
  document.body.appendChild(layer);
})();