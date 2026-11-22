/* FGC HUB — Efeitos de Natal (aditivo; não altera nenhum tema nem código existente)
   - Ativo de 20/11 a 06/01 (horário de Brasília). Fora disso não faz nada.
   - Testes: ?natal=1 força ligado · ?natal=0 força desligado
     ?natal=neve,luzes,bolas,gorro,cobertura,papai,treno → liga só os efeitos listados. */
(function () {
  var TODOS = ['neve', 'luzes', 'bolas', 'gorro', 'cobertura', 'papai', 'treno'];

  function naJanela() {
    var p = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    var m = p.getMonth() + 1, d = p.getDate();
    return (m === 11 && d >= 20) || m === 12 || (m === 1 && d <= 6);
  }

  var qs = new URLSearchParams(location.search).get('natal');
  var efeitos = TODOS.filter(function (e) { return e !== 'papai'; }); // padrão: trenó (o Papai a pé é opcional)
  var forcar = false;
  if (qs === '0') return;
  if (qs === '1') forcar = true;
  else if (qs) { forcar = true; efeitos = qs.split(',').filter(function (e) { return TODOS.indexOf(e) > -1; }); }
  if (!forcar && !naJanela()) return;

  var root = document.documentElement;
  var fx = null;

  function tem(e) { return efeitos.indexOf(e) > -1; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function neve(box) {
    var n = window.innerWidth < 768 ? 22 : 50, d = [-40, -25, 25, 40, 60];
    for (var i = 0; i < n; i++) {
      var s = [3, 4, 4, 5, 6, 8][Math.floor(Math.random() * 6)], f = document.createElement('i');
      f.className = 'natal-f';
      f.style.cssText = 'left:' + rnd(0, 100).toFixed(1) + '%;width:' + s + 'px;height:' + s + 'px;opacity:' + rnd(.55, .95).toFixed(2) +
        ';animation-duration:' + (rnd(9, 18) * (s < 5 ? 1.3 : 1)).toFixed(1) + 's;animation-delay:-' + rnd(0, 18).toFixed(1) + 's;--d:' +
        d[Math.floor(Math.random() * d.length)] + 'px' + (s >= 6 ? ';filter:blur(1px)' : '');
      box.appendChild(f);
    }
  }

  function luzes(box) {
    var cols = ['#ff3b3b', '#ffd23f', '#3bd16f', '#4aa8ff'], w = window.innerWidth;
    var n = Math.max(12, Math.round(w / 38)), el = document.createElement('div');
    el.className = 'natal-lights';
    el.innerHTML = '<div class="natal-wire"></div>';
    for (var i = 0; i < n; i++) {
      var seg = i % 8, y = 6 + 16 * (1 - Math.pow((seg - 3.5) / 3.5, 2)), c = cols[i % 4], b = document.createElement('span');
      b.className = 'natal-b';
      b.style.cssText = 'left:' + (16 + i * (w - 32) / (n - 1)).toFixed(0) + 'px;top:' + y.toFixed(0) + 'px;background:' + c + ';color:' + c + ';animation-delay:' + ((i % 4) * .35).toFixed(2) + 's';
      el.appendChild(b);
    }
    box.appendChild(el);
  }

  function bolas(box) {
    var itens = [[.03, 22, '#d4202e'], [.12, 12, '#f2c14e'], [.30, 18, '#d4202e'], [.52, 12, '#f2c14e'], [.74, 20, '#d4202e'], [.88, 12, '#f2c14e'], [.97, 24, '#d4202e']];
    itens.forEach(function (it, i) {
      var o = document.createElement('div');
      o.className = 'natal-orn';
      o.style.cssText = 'left:' + (it[0] * 100) + '%;animation-delay:' + (i * .4).toFixed(1) + 's';
      o.innerHTML = '<u style="height:' + it[1] + 'px"></u><em style="background:radial-gradient(circle at 32% 30%,#fff9 0 8%,' + it[2] + ' 30%,' + it[2] + ' 70%,#0006 100%)"></em>';
      box.appendChild(o);
    });
  }

  function gorro() {
    var h1 = document.querySelector('header h1');
    if (!h1 || h1.querySelector('.natal-hat-anchor')) return;
    var a = document.createElement('span');
    a.className = 'natal-hat-anchor'; a.setAttribute('aria-hidden', 'true');
    a.innerHTML = '<svg class="natal-hat" width="46" height="40" viewBox="0 0 46 40"><path d="M6 32C8 14 20 4 34 8C30 12 30 20 36 30Z" fill="#d4202e"/><rect x="2" y="28" width="38" height="9" rx="4.5" fill="#fff"/><circle cx="35" cy="8" r="5" fill="#fff"/></svg>';
    h1.insertBefore(a, h1.firstChild);
  }

  function papai(box) {
    var p = document.createElement('div');
    p.className = 'natal-santa';
    p.innerHTML = '<svg viewBox="0 0 64 84" width="64" height="84"><circle cx="14" cy="44" r="12" fill="#7a4a21"/><path d="M8 34q6-6 12 0" fill="none" stroke="#4d2c10" stroke-width="2"/><g class="natal-leg b"><rect x="26" y="58" width="8" height="16" rx="3" fill="#c81d2a"/><rect x="25" y="72" width="13" height="7" rx="3" fill="#161616"/></g><rect x="19" y="30" width="28" height="31" rx="9" fill="#d4202e"/><rect x="19" y="49" width="28" height="5" fill="#161616"/><rect x="29" y="48" width="8" height="7" rx="1" fill="#f2c14e"/><rect x="19" y="58" width="28" height="4" rx="2" fill="#fff"/><g class="natal-leg"><rect x="34" y="58" width="8" height="16" rx="3" fill="#b8171f"/><rect x="33" y="72" width="13" height="7" rx="3" fill="#161616"/></g><g class="natal-arm"><rect x="36" y="32" width="8" height="18" rx="4" fill="#b8171f"/><circle cx="40" cy="51" r="4.5" fill="#fff"/></g><circle cx="35" cy="22" r="9" fill="#f1c9a5"/><path d="M26 22q9 20 20 0q-2 8-10 12q-8-4-10-12z" fill="#fff"/><circle cx="41" cy="22" r="2" fill="#e08a7a"/><circle cx="39" cy="19" r="1.2" fill="#222"/><path d="M26 17C27 6 38 2 46 9L47 17z" fill="#d4202e"/><rect x="25" y="14" width="23" height="6" rx="3" fill="#fff"/><circle cx="47" cy="8" r="4.5" fill="#fff"/></svg>';
    box.appendChild(p);
  }

  function treno(box) {
    var t = document.createElement('div');
    t.className = 'natal-sleigh';
    t.innerHTML = '<svg viewBox="0 0 230 120" width="230" height="120"><g class="natal-spark"><circle cx="8" cy="70" r="2.5" fill="#fff"/><circle cx="-6" cy="84" r="2" fill="#ffe28a" style="animation-delay:.3s"/><circle cx="-18" cy="66" r="1.8" fill="#fff" style="animation-delay:.6s"/><circle cx="-4" cy="98" r="2.2" fill="#ffe28a" style="animation-delay:.9s"/></g><path d="M112 76Q130 74 158 76" fill="none" stroke="#5a3a1a" stroke-width="2"/><path d="M16 104H112Q124 104 121 92" fill="none" stroke="#f2c14e" stroke-width="5" stroke-linecap="round"/><path d="M42 94V104M92 94V104" stroke="#f2c14e" stroke-width="4"/><path d="M22 64H110Q114 64 112 74Q106 94 86 96H42Q24 94 22 74Z" fill="#d4202e"/><path d="M24 72H110" stroke="#f2c14e" stroke-width="3"/><ellipse cx="44" cy="64" rx="19" ry="15" fill="#2e9e5b"/><path d="M38 52q6 6 12 0" fill="none" stroke="#1d6b3b" stroke-width="2.5"/><rect x="24" y="44" width="15" height="15" rx="2" fill="#4a8be0"/><path d="M31.5 44V59M24 51.5H39" stroke="#f2c14e" stroke-width="2.5"/><circle cx="82" cy="62" r="17" fill="#d4202e"/><rect x="66" y="64" width="32" height="5" fill="#161616"/><rect x="77" y="63" width="9" height="7" rx="1" fill="#f2c14e"/><circle cx="84" cy="40" r="13" fill="#f6d2b0"/><ellipse cx="85" cy="49" rx="15" ry="11" fill="#fff"/><path d="M72 46q12 6 26 0" fill="none" stroke="#e9eef7" stroke-width="2"/><circle cx="85" cy="43" r="3.5" fill="#f08a8a"/><circle cx="79" cy="38" r="1.8" fill="#222"/><circle cx="91" cy="38" r="1.8" fill="#222"/><circle cx="75" cy="42" r="2.6" fill="#f7a8a8" opacity=".7"/><circle cx="95" cy="42" r="2.6" fill="#f7a8a8" opacity=".7"/><path d="M70 36C70 18 90 12 98 26L99 36Z" fill="#d4202e"/><rect x="69" y="31" width="32" height="8" rx="4" fill="#fff"/><path d="M72 24Q60 20 58 34" fill="none" stroke="#d4202e" stroke-width="9" stroke-linecap="round"/><circle cx="57" cy="36" r="5" fill="#fff"/><circle cx="104" cy="70" r="5.5" fill="#fff"/><g class="natal-gal"><g class="natal-leg b"><rect x="150" y="76" width="6" height="22" rx="3" fill="#a9632a"/><rect x="176" y="76" width="6" height="22" rx="3" fill="#a9632a"/></g><ellipse cx="166" cy="72" rx="24" ry="13" fill="#c98038"/><circle cx="143" cy="68" r="4.5" fill="#fff"/><g class="natal-leg"><rect x="156" y="76" width="6" height="22" rx="3" fill="#c98038"/><rect x="170" y="76" width="6" height="22" rx="3" fill="#c98038"/></g><path d="M178 60Q190 66 194 58" fill="none" stroke="#d4202e" stroke-width="6" stroke-linecap="round"/><path d="M196 36L190 20M190 20L184 16M190 20L196 14M206 36L212 20M212 20L218 15M212 20L206 14" stroke="#7a4a21" stroke-width="3" stroke-linecap="round" fill="none"/><ellipse cx="190" cy="40" rx="5" ry="8" fill="#a9632a" transform="rotate(-25 190 40)"/><circle cx="200" cy="50" r="15" fill="#d78a3a"/><ellipse cx="209" cy="56" rx="9" ry="7" fill="#f8e4c8"/><circle cx="215" cy="52" r="4.5" fill="#e0242e"/><circle cx="214" cy="50.5" r="1.3" fill="#fff" opacity=".8"/><circle cx="203" cy="46" r="2.6" fill="#222"/><circle cx="204" cy="45" r=".9" fill="#fff"/></g></svg>';
    box.appendChild(t);
  }

  function ligar() {
    root.classList.add('natal-on');
    if (tem('cobertura')) root.classList.add('natal-caps');
    if (tem('gorro')) gorro();
    if (fx) return;
    fx = document.createElement('div');
    fx.id = 'natal-fx'; fx.setAttribute('aria-hidden', 'true');
    if (tem('luzes')) luzes(fx);
    if (tem('bolas')) bolas(fx);
    if (tem('neve')) neve(fx);
    if (tem('papai')) papai(fx);
    if (tem('treno')) treno(fx);
    if (tem('cobertura')) { var g = document.createElement('div'); g.className = 'natal-ground'; fx.appendChild(g); }
    document.body.appendChild(fx);
  }

  function desligar() { // (sem uso na UI; mantido p/ testes via console)
    root.classList.remove('natal-on', 'natal-caps');
    if (fx) { fx.remove(); fx = null; }
    var a = document.querySelector('.natal-hat-anchor'); if (a) a.remove();
  }

  function iniciar() { ligar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
