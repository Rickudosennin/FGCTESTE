/* FGC HUB — decoração natalina sazonal. Overlay isolado: não altera os temas. */
(function () {
  'use strict';
  var now = new Date();
  var start = new Date(now.getFullYear(), 10, 20);
  var end = new Date(now.getFullYear(), 11, 27);
  if (now < start || now >= end || !document.body || document.getElementById('fgc-xmas-layer')) return;

  var layer = document.createElement('div');
  layer.id = 'fgc-xmas-layer';
  layer.setAttribute('aria-hidden', 'true');

  /* Ramo de pinheiro em SVG: camadas de agulhas, galhos e pinhas. */
  var branch = '<svg viewBox="0 0 320 205" xmlns="http://www.w3.org/2000/svg" role="presentation">' +
    '<defs><linearGradient id="xmas-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b28a5b"/><stop offset="1" stop-color="#493b2b"/></linearGradient>' +
    '<linearGradient id="xmas-needle" x1="0" y1="0" x2="0.8" y2="1"><stop stop-color="#3b9a62"/><stop offset=".55" stop-color="#17633d"/><stop offset="1" stop-color="#0c3928"/></linearGradient>' +
    '<radialGradient id="xmas-cone"><stop stop-color="#9c7045"/><stop offset="1" stop-color="#4b3023"/></radialGradient></defs>' +
    '<path d="M-12 8 Q90 38 190 133 T330 202" fill="none" stroke="url(#xmas-wood)" stroke-width="7" stroke-linecap="round"/>' +
    '<g fill="none" stroke="url(#xmas-needle)" stroke-linecap="round" stroke-width="5">' +
    '<path d="M15 17L2 0 M24 21L31 1 M38 27L18 5 M52 34L61 12 M67 43L43 20 M82 51L95 27 M98 61L72 39 M114 72L130 47 M130 83L104 62 M147 95L165 69 M164 108L137 85 M181 121L203 94 M198 135L170 112 M216 149L239 122 M234 164L207 141 M253 179L278 153 M270 192L246 171"/>' +
    '<path d="M19 21L0 29 M43 29L22 45 M68 43L45 60 M94 58L72 77 M120 75L97 94 M147 93L123 112 M174 112L151 131 M202 132L180 150 M230 153L209 169"/>' +
    '<path d="M33 26L16 48 M59 39L42 63 M87 55L68 79 M116 74L97 98 M145 94L126 118 M175 116L156 139 M205 139L188 160"/></g>' +
    '<g fill="#55a66c" opacity=".85"><path d="M20 13l-13 -11 5 17zM54 32l-12 -12 4 18zM91 57l-13 -11 5 18zM132 84l-12 -12 4 18zM174 113l-13 -11 4 18zM218 146l-12 -10 4 17z"/></g>' +
    '<g fill="url(#xmas-cone)" stroke="#c49a69" stroke-width="1.2"><path d="M72 63q-11 13 0 28q11 -15 0 -28z"/><path d="M72 68l-7 7 7 4 7 -4zM72 78l-6 7 6 4 6 -4z"/>' +
    '<path d="M220 130q-12 14 0 30q12 -16 0 -30z"/><path d="M220 135l-7 7 7 4 7 -4zM220 145l-6 8 6 4 6 -4z"/></g>' +
    '<g fill="#f4f0df" opacity=".85"><circle cx="11" cy="8" r="2"/><circle cx="45" cy="26" r="1.7"/><circle cx="108" cy="65" r="1.8"/><circle cx="158" cy="101" r="2"/><circle cx="250" cy="166" r="1.7"/></g></svg>';

  ['xmas-left', 'xmas-right'].forEach(function (cls) {
    var corner = document.createElement('div');
    corner.className = 'xmas-corner ' + cls;
    corner.innerHTML = branch;
    layer.appendChild(corner);
  });

  var ornaments = [
    { left: '7.5%', top: '78px', color: '#b92332', hi: '#ffe0d4', shade: '#5d0915', glow: 'transparent', size: '13px', delay: '-1s' },
    { left: '16%', top: '112px', color: '#c6a34e', hi: '#fff4bd', shade: '#6c4c16', glow: 'transparent', size: '10px', delay: '-2.2s' },
    { left: '85%', top: '91px', color: '#c6a34e', hi: '#fff4bd', shade: '#6c4c16', glow: 'transparent', size: '12px', delay: '-.8s' },
    { left: '93%', top: '55px', color: '#b92332', hi: '#ffe0d4', shade: '#5d0915', glow: 'transparent', size: '10px', delay: '-1.7s' }
  ];
  ornaments.forEach(function (item) {
    var el = document.createElement('i');
    el.className = 'xmas-bauble';
    Object.keys(item).forEach(function (key) {
      var cssKey = key === 'delay' ? '--delay' : '--' + key;
      el.style.setProperty(cssKey, item[key]);
    });
    layer.appendChild(el);
  });

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.innerWidth <= 640;
  var count = reduced ? 10 : (mobile ? 20 : 38);
  for (var i = 0; i < count; i++) {
    var flake = document.createElement('i');
    flake.className = 'xmas-flake' + (i % 9 === 0 ? ' xmas-large' : '');
    flake.style.setProperty('--x', (Math.random() * 100) + 'vw');
    flake.style.setProperty('--s', (Math.random() * 3.2 + (i % 9 === 0 ? 3.2 : 1.5)) + 'px');
    flake.style.setProperty('--o', (Math.random() * .48 + .28).toFixed(2));
    flake.style.setProperty('--d', (Math.random() * 10 + 10) + 's');
    flake.style.setProperty('--delay', (-Math.random() * 20) + 's');
    flake.style.setProperty('--drift', (Math.random() * 90 - 45) + 'px');
    layer.appendChild(flake);
  }

  /* Trenó SVG vetorial: transparência real, sem fundo quadriculado. */
  var sleighFlight = document.createElement('div');
  sleighFlight.className = 'xmas-sleigh-flight';
  sleighFlight.setAttribute('aria-hidden', 'true');
  var sleigh = document.createElement('img');
  sleigh.src = 'images/santa-sleigh.svg';
  sleigh.alt = '';
  sleigh.decoding = 'async';
  sleigh.className = 'xmas-sleigh-art';
  sleighFlight.appendChild(sleigh);
  layer.appendChild(sleighFlight);

  document.body.appendChild(layer);

  /* Enfeita também os cards carregados dinamicamente pelo Start.gg. */
  function decorateEventCards(root) {
    if (!layer.isConnected) return;
    var scope = root && root.querySelectorAll ? root : document;
    var cards = [];
    if (scope.matches && scope.matches('.glass-card, .bc-row')) cards.push(scope);
    cards = cards.concat(Array.prototype.slice.call(scope.querySelectorAll('.glass-card, .bc-row')));
    cards.forEach(function (card) {
      if (card.classList.contains('xmas-event-card')) return;
      card.classList.add('xmas-event-card');
      var snow = document.createElement('div');
      snow.className = 'xmas-card-snow';
      snow.setAttribute('aria-hidden', 'true');
      var leftFrost = document.createElement('i');
      leftFrost.className = 'xmas-card-frost left';
      var rightFrost = document.createElement('i');
      rightFrost.className = 'xmas-card-frost right';
      snow.appendChild(leftFrost);
      snow.appendChild(rightFrost);
      var flakes = window.innerWidth <= 640 ? 4 : 8;
      for (var n = 0; n < flakes; n++) {
        var dot = document.createElement('i');
        dot.className = 'xmas-card-flake' + (n % 2 ? ' xmas-card-drift-2' : '');
        dot.style.setProperty('--x', (Math.random() * 96 + 2) + '%');
        dot.style.setProperty('--s', (Math.random() * 2.2 + 1.4) + 'px');
        dot.style.setProperty('--duration', (Math.random() * 5 + 5) + 's');
        dot.style.setProperty('--delay', (-Math.random() * 8) + 's');
        dot.style.setProperty('--drift', (Math.random() * 22 - 11) + 'px');
        snow.appendChild(dot);
      }
      card.appendChild(snow);
    });
  }

  var resultsRoot = document.getElementById('resultados') || document.body;
  decorateEventCards(resultsRoot);
  if (window.MutationObserver) {
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) decorateEventCards(node);
        });
      });
    });
    observer.observe(resultsRoot, { childList: true, subtree: true });
  }
})();