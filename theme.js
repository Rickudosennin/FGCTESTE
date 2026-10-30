/* FGC HUB - seletor de temas (aditivo; não altera código existente) */
(function () {
  var KEY = 'fgchub-theme';
  // Tema fixo no momento. Para liberar a troca: FORCE = null e SHOW_SELECTOR = true.
  var FORCE = 'halloween';
  var SHOW_SELECTOR = false;
  var THEMES = [
    { id: 'original', nome: 'Original' },
    { id: 'cromo', nome: 'Cromo' },
    { id: 'halloween', nome: '🎃 Halloween' }
  ];

  function salvo() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function aplicar(id) {
    var ok = THEMES.some(function (t) { return t.id === id; });
    if (!ok) id = 'original';
    if (id === 'original') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', id);
    try { localStorage.setItem(KEY, id); } catch (e) {}
    var sel = document.getElementById('theme-select');
    if (sel) sel.value = id;
  }

  // aplica já no <head> (evita flash)
  aplicar(FORCE || salvo() || 'original');

  function montarSeletor() {
    if (!SHOW_SELECTOR || document.getElementById('theme-select')) return;
    var sel = document.createElement('select');
    sel.id = 'theme-select';
    sel.setAttribute('aria-label', 'Tema do site');
    THEMES.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t.id;
      o.textContent = t.nome;
      sel.appendChild(o);
    });
    sel.value = salvo() || 'original';
    sel.addEventListener('change', function () { aplicar(sel.value); });

    // destino: <div id="theme-switcher"> se existir; senão canto fixo
    var alvo = document.getElementById('theme-switcher');
    if (alvo) alvo.appendChild(sel);
    else {
      sel.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:9999;';
      document.body.appendChild(sel);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarSeletor);
  else montarSeletor();

  window.FGCTheme = { aplicar: aplicar, temas: THEMES };
})();