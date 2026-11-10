/* FGC HUB - seletor de temas (aditivo; não altera código existente)
   - Escolha salva só no aparelho do usuário (localStorage); nada vai pro servidor.
   - Aplicado no <head> → sem flash ao carregar.
   - Para reativar um tema sazonal: adicionar em THEMES + carregar o .js dele. */
(function () {
  var KEY = 'fgchub-theme';
  var THEMES = [
    { id: 'original', nome: 'Padrão' },
    { id: 'cromo', nome: 'Cromo' },
    { id: 'broadcast', nome: 'Broadcast' }
  ];
  var root = document.documentElement;

  function valido(id) {
    return THEMES.some(function (t) { return t.id === id; });
  }

  function ler() {
    try {
      var v = localStorage.getItem(KEY);
      if (v && !valido(v)) { localStorage.removeItem(KEY); return null; } // ex.: 'halloween' antigo
      return v;
    } catch (e) { return null; }
  }

  function gravar(id) {
    try { localStorage.setItem(KEY, id); } catch (e) {}
  }

  // fontes do tema Broadcast: só baixam quando ele está ativo
  function carregarFontes(id) {
    if (id !== 'broadcast' || document.getElementById('fgc-theme-fonts')) return;
    var l = document.createElement('link');
    l.id = 'fgc-theme-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Oswald:wght@500;600;700&display=swap';
    document.head.appendChild(l);
  }

  function pintar(id) {
    if (!valido(id)) id = 'original';
    if (id === 'original') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', id);
    carregarFontes(id);
    var btns = document.querySelectorAll('.fgc-theme-toggle button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-theme-id') === id ? 'true' : 'false');
    }
    return id;
  }

  // escolha do usuário → aplica e salva
  function escolher(id) {
    id = pintar(id);
    gravar(id);
  }

  // aplica já no <head> (evita flash)
  var atual = pintar(ler() || 'original');

  function montar() {
    if (document.querySelector('.fgc-theme-toggle')) return;

    var wrap = document.createElement('div');
    wrap.className = 'fgc-theme-toggle';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Tema do site');
    wrap.innerHTML =
      '<svg class="fgc-theme-ico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">' +
      '<circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg>';

    THEMES.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('data-theme-id', t.id);
      b.setAttribute('aria-pressed', t.id === atual ? 'true' : 'false');
      b.textContent = t.nome;
      b.addEventListener('click', function () { escolher(t.id); });
      wrap.appendChild(b);
    });

    // destino: <span id="theme-switcher"> da página; sem ele, canto fixo
    var alvo = document.getElementById('theme-switcher');
    if (alvo) alvo.appendChild(wrap);
    else {
      wrap.classList.add('fgc-theme-fixed');
      document.body.appendChild(wrap);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();

  // mantém outras abas abertas em sincronia
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) pintar(e.newValue || 'original');
  });

  window.FGCTheme = { escolher: escolher, temas: THEMES };
})();