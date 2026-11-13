/* FGC HUB - Intro "ROAD TO EVO BRAZIL 2027" (aditivo; só na index)
   - Toca a cada carregamento da index, mas SÓ com o tema Evo ativo.
   - Some junto com o tema (theme.js tira o Evo em 01/04/2027).
   - Não toca em nada da página: cria um bloco novo sobre ela e o remove no fim.
   - Pular: botão "Pular", tecla Esc ou clique em qualquer ponto.
   - Quem usa "reduzir movimento" no sistema não vê a intro.
   - Se a logo falhar ao carregar, a intro fecha na hora e o site abre.
   Carregar logo depois do theme.js, SEM defer (para cobrir a tela antes do site piscar). */
(function () {
  'use strict';
  var root = document.documentElement;

  if (root.getAttribute('data-theme') !== 'evo') return;
  var T = window.FGCTheme && window.FGCTheme.temas;
  var evoAtivo = false;
  if (T) for (var i = 0; i < T.length; i++) if (T[i].id === 'evo') evoAtivo = true;
  if (!evoAtivo) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (document.getElementById('evo-intro')) return;

  var LOGO = 'imagens/logos/logoevobrazil.png';
  var DURACAO_MS = 5500; // 4,25s de cena + 0,75s de cortina (= 5s) + folga

  var css = [
    '#evo-intro{position:fixed;inset:0;z-index:2147483000;background:#05070f;overflow:hidden;clip-path:polygon(0 0,100% 0,100% 100%,0 100%);animation:evoIWipe .75s cubic-bezier(.7,0,.2,1) 4.25s forwards;font-family:Barlow,system-ui,sans-serif;color:#f4f5ff}',
    '#evo-intro.evo-i-out{animation:evoIOut .25s ease-in forwards}',
    '@keyframes evoIWipe{0%{clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}100%{clip-path:polygon(0 0,100% 0,100% 0,0 0)}}',
    '@keyframes evoIOut{to{opacity:0}}',
    '#evo-intro .evo-i-grid{position:absolute;inset:0;opacity:0;animation:evoIFade .95s ease-out .14s forwards;background-image:radial-gradient(900px 420px at 50% 50%,rgba(75,85,255,.30),transparent 65%),repeating-linear-gradient(45deg,rgba(75,85,255,.10) 0 1px,transparent 1px 38px),repeating-linear-gradient(-45deg,rgba(75,85,255,.10) 0 1px,transparent 1px 38px)}',
    '@keyframes evoIFade{to{opacity:1}}',
    '#evo-intro .evo-i-sweep{position:absolute;left:0;top:50%;height:2px;width:0;background:linear-gradient(90deg,transparent,#9fe870,#4b55ff,transparent);box-shadow:0 0 18px #4b55ff;animation:evoISweep 1.2s cubic-bezier(.2,.8,.2,1) .27s forwards,evoIGone .55s ease-in 3.7s forwards}',
    '@keyframes evoISweep{to{width:100%}}',
    '@keyframes evoIGone{to{opacity:0}}',
    '#evo-intro .evo-i-stack{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(14px,3.2vh,26px);padding:0 16px;box-sizing:border-box}',
    '#evo-intro .evo-i-road{display:flex;align-items:center;gap:clamp(8px,2vw,18px);opacity:0;transform:translateX(-60px);animation:evoISlide .95s cubic-bezier(.2,.8,.2,1) .75s forwards}',
    '#evo-intro .evo-i-road b{font:600 clamp(18px,5vw,34px)/1 Oswald,"Roboto Condensed",sans-serif;letter-spacing:.5em;padding-left:.5em;text-transform:uppercase;color:#fff;text-shadow:0 0 22px rgba(75,85,255,.8)}',
    '#evo-intro .evo-i-road i{font-style:normal;color:#9fe870;font-size:clamp(12px,2.6vw,18px)}',
    '@keyframes evoISlide{to{opacity:1;transform:translateX(0)}}',
    '#evo-intro .evo-i-logo{display:block;width:min(240px,56vw);height:auto;opacity:0;transform:scale(.8);filter:brightness(2.4) drop-shadow(0 0 22px rgba(75,85,255,.65));animation:evoILogo 1.1s cubic-bezier(.2,.8,.2,1) 1.4s forwards}',
    '@keyframes evoILogo{60%{filter:brightness(1.4) drop-shadow(0 0 30px rgba(159,232,112,.55))}to{opacity:1;transform:scale(1);filter:brightness(1) drop-shadow(0 0 22px rgba(75,85,255,.65))}}',
    '#evo-intro .evo-i-flash{position:absolute;inset:0;background:#9fe870;opacity:0;mix-blend-mode:screen;animation:evoIFlash .6s ease-out 1.4s}',
    '@keyframes evoIFlash{0%{opacity:0}20%{opacity:.35}100%{opacity:0}}',
    '#evo-intro .evo-i-date{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px clamp(8px,2vw,16px);font:500 clamp(13px,3.6vw,22px)/1.2 Oswald,"Roboto Condensed",sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#fff;opacity:0;transform:translateY(14px);animation:evoIRise .8s ease-out 2.7s forwards}',
    '#evo-intro .evo-i-date i{font-style:normal;font-size:.65em;color:#4b55ff}',
    '#evo-intro .evo-i-date i.g{color:#9fe870}',
    '#evo-intro .evo-i-date span.m{color:#a5accb}',
    '@keyframes evoIRise{to{opacity:1;transform:translateY(0)}}',
    '#evo-intro .evo-i-bar{position:absolute;left:0;bottom:0;height:4px;width:0;background:linear-gradient(90deg,#3035c8,#4b55ff,#9fe870);animation:evoIBar 4.25s linear forwards}',
    '@keyframes evoIBar{to{width:100%}}',
    '#evo-intro .evo-i-skip{position:absolute;right:16px;top:16px;opacity:0;animation:evoIFade .4s ease-out .5s forwards;appearance:none;cursor:pointer;min-height:44px;padding:0 18px;font:600 13px Oswald,"Roboto Condensed",sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:rgba(7,9,20,.7);border:1px solid rgba(111,132,255,.72);border-radius:4px}',
    '#evo-intro .evo-i-skip:hover{border-color:#9fe870;color:#9fe870}',
    '#evo-intro .evo-i-skip:focus-visible{outline:2px solid #a6aaff;outline-offset:2px}'
  ].join('\n');

  var html = [
    '<div class="evo-i-grid" aria-hidden="true"></div>',
    '<div class="evo-i-sweep" aria-hidden="true"></div>',
    '<div class="evo-i-stack">',
    '  <div class="evo-i-road"><i aria-hidden="true">◆</i><b>Road to</b><i aria-hidden="true">◆</i></div>',
    '  <img class="evo-i-logo" src="' + LOGO + '" alt="Evo Brazil" width="320" height="340" decoding="async">',
    '  <div class="evo-i-date"><span>26</span><i aria-hidden="true">◆</i><span>27</span><i aria-hidden="true">◆</i><span>28 Mar 2027</span><i class="g" aria-hidden="true">◆</i><span class="m">São Paulo</span></div>',
    '</div>',
    '<div class="evo-i-flash" aria-hidden="true"></div>',
    '<div class="evo-i-bar" aria-hidden="true"></div>',
    '<button type="button" class="evo-i-skip">Pular ▸</button>'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'evo-intro-style';
  style.textContent = css;
  root.appendChild(style);

  var box = document.createElement('div');
  box.id = 'evo-intro';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Road to Evo Brazil 2027');
  box.innerHTML = html;
  root.appendChild(box);

  var overflowAntes = root.style.overflow;
  root.style.overflow = 'hidden';

  var terminou = false, timer = null, quase = null;

  function travarPagina() { if (document.body) document.body.inert = true; }
  if (document.body) travarPagina();
  else document.addEventListener('DOMContentLoaded', travarPagina);

  function fim() {
    if (terminou) return;
    terminou = true;
    clearTimeout(timer); clearTimeout(quase);
    document.removeEventListener('keydown', aoTeclar);
    document.removeEventListener('DOMContentLoaded', travarPagina);
    root.style.overflow = overflowAntes;
    if (document.body) document.body.inert = false;
    if (box.parentNode) box.parentNode.removeChild(box);
    if (style.parentNode) style.parentNode.removeChild(style);
  }

  function pular() {
    if (terminou) return;
    box.classList.add('evo-i-out');
    quase = setTimeout(fim, 280);
  }

  function aoTeclar(e) { if (e.key === 'Escape' || e.key === 'Esc') pular(); }

  box.addEventListener('click', pular);
  document.addEventListener('keydown', aoTeclar);
  box.addEventListener('animationend', function (e) { if (e.animationName === 'evoIWipe') fim(); });
  box.querySelector('.evo-i-logo').addEventListener('error', fim); // logo quebrada -> abre o site
  timer = setTimeout(fim, DURACAO_MS);                              // rede de segurança

  window.FGCEvoIntro = { pular: pular };
})();