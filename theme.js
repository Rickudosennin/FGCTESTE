/* FGC HUB - seletor de temas (aditivo; não altera código existente)
   - Escolha salva só no aparelho do usuário (localStorage); nada vai pro servidor.
   - Aplicado no <head> → sem flash ao carregar.
   - Para reativar um tema sazonal: adicionar em THEMES + carregar o .js dele. */
(function () {
  var KEY = 'fgchub-theme';
  var PADRAO = 'broadcast'; // tema de quem ainda não escolheu nada
  var SO_SESSAO = false;    // true enquanto o Evo existir: escolha vale só na sessão (aba)
  var THEMES = [
    { id: 'original', nome: 'Red Edition' },
    { id: 'cromo', nome: 'Cromo' },
    { id: 'broadcast', nome: 'Broadcast' }
  ];
  
  // Tema sazonal Evo Brazil 2027
  if (Date.now() < new Date('2027-04-01T00:00:00-03:00').getTime()) {
    THEMES.push({ id: 'evo', nome: 'Evo 2027' });
    PADRAO = 'evo'; // padrão; após a data, volta ao Broadcast
    SO_SESSAO = true; // toda visita nova abre em Evo (escolha antiga é ignorada); trocar vale até fechar a aba
  }
  
  var root = document.documentElement;

  function valido(id) {
    return THEMES.some(function (t) { return t.id === id; });
  }

  function ler() {
    try {
      if (SO_SESSAO) {
        var s = sessionStorage.getItem(KEY);
        return s && valido(s) ? s : null;
      }
      var v = localStorage.getItem(KEY);
      if (v && !valido(v)) { localStorage.removeItem(KEY); return null; } 
      return v;
    } catch (e) { return null; }
  }

  function gravar(id) {
    try { (SO_SESSAO ? sessionStorage : localStorage).setItem(KEY, id); } catch (e) {}
  }

  // fontes do layout em linha: baixam para Broadcast e Evo
  function carregarFontes(id) {
    if ((id !== 'broadcast' && id !== 'evo') || document.getElementById('fgc-theme-fonts')) return;
    var l = document.createElement('link');
    l.id = 'fgc-theme-fonts';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Oswald:wght@500;600;700&display=swap';
    document.head.appendChild(l);
  }

  function subtitulo(id) {
    var p = document.querySelector('header > p');
    if (!p) return;
    if (!p.hasAttribute('data-orig')) p.setAttribute('data-orig', p.textContent);
    var txt = p.getAttribute('data-orig');
    if (id === 'broadcast') txt = 'Torneios de Fighting Games · Global';
    else if (id === 'evo') txt = 'Rumo à Evo Brazil 2027 · São Paulo';
    p.textContent = txt;
  }

  function pintar(id) {
    if (!valido(id)) id = 'original';
    if (id === 'original') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', id);
    carregarFontes(id);
    subtitulo(id);
    var btns = document.querySelectorAll('.fgc-theme-toggle button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', btns[i].getAttribute('data-theme-id') === id ? 'true' : 'false');
    }
    return id;
  }

  function escolher(id) {
    id = pintar(id);
    gravar(id);
  }

  var atual = pintar(ler() || PADRAO);

  function montar() {
    subtitulo(atual);
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

    var alvo = document.getElementById('theme-switcher');
    if (alvo) alvo.appendChild(wrap);
    else {
      wrap.classList.add('fgc-theme-fixed');
      document.body.appendChild(wrap);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();

  window.addEventListener('storage', function (e) {
    if (e.key === KEY) pintar(e.newValue || PADRAO);
  });

  window.FGCTheme = { escolher: escolher, temas: THEMES };
})();