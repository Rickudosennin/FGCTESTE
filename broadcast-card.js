/* FGC HUB - tema Broadcast: monta cada torneio como LINHA (data | banner | info | ações).
   - Só é usado quando <html data-theme="broadcast">; nos outros temas script.js segue o caminho original.
   - NÃO mexe na lógica de timer: o <p id="timerId"> é o mesmo que iniciarTimer() de script.js preenche. */
(function () {
  function ativo() {
    return document.documentElement.getAttribute('data-theme') === 'broadcast';
  }

  function dataParts(ts) {
    var d = new Date(ts * 1000);
    return {
      dia: d.getDate(),
      mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
      sem: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()
    };
  }

  // ctx = { t, typeVal, dataEventoProximo, timerId, dEnc, inscritos, toName, banner, isLiveNow,
  //         bracketBadgeHTML, ligasInfo, paramsMapa, calendarLink }
  function linha(ctx) {
    var t = ctx.t;
    var dp = dataParts(ctx.dataEventoProximo);
    var aberta = !!t.isRegistrationOpen;
    var plural = ctx.inscritos !== 1 ? 's' : '';
    var local = t.venueAddress || (t.owner && t.owner.location && t.owner.location.country) || 'Online';

    var thumbImg = ctx.banner
      ? '<img src="' + ctx.banner + '" alt="Banner do torneio ' + String(t.name).replace(/"/g, '&quot;') + '" onerror="this.style.display=\'none\'">'
      : '';

    // stream: mesma regra do card original (só aparece se o torneio tem streams)
    var streamTag = '';
    if (t.streams && t.streams.length > 0) {
      if (ctx.isLiveNow) {
        streamTag = '<span class="bc-live"><i class="animate-pulse"></i>AO VIVO</span>';
      } else {
        var tw = t.streams.some(function (s) { return s.streamSource === 'TWITCH'; });
        var yt = t.streams.some(function (s) { return s.streamSource === 'YOUTUBE'; });
        streamTag = (tw ? '<span class="bc-st">TWITCH</span>' : '') + (yt ? '<span class="bc-st">YOUTUBE</span>' : '');
      }
    }

    var encerra = '';
    var timer = '';
    if (ctx.dEnc) {
      encerra = ' <span class="bc-enc">encerra ' +
        ctx.dEnc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ', ' +
        ctx.dEnc.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</span>';
      // MESMO id e classe inicial do card original → iniciarTimer() continua funcionando
      timer = '<div class="bc-timer"><p id="' + ctx.timerId + '" class="timer-red">Calculando...</p></div>';
    }

    var ligas = (ctx.ligasInfo || []).map(function (l) { return '<span class="bc-liga">' + l.label + '</span>'; }).join('');

    var eventos = '';
    if (t.events && t.events.length > 1) {
      eventos = '<div class="bc-events"><span>Eventos</span>' + t.events.map(function (ev) {
        return '<a href="https://start.gg/' + ev.slug + '" target="_blank" rel="noopener" onclick="event.stopPropagation();">' + ev.name + '</a>';
      }).join('') + '</div>';
    }

    var ranking = (ctx.ligasInfo || []).map(function (l) {
      return '<button type="button" class="bc-btn" onclick="abrirRanking(\'' + l.slug + '\',\'' + String(l.label).replace(/'/g, "\\'") + '\',\'' + l.rankingUrl + '\')">Ranking' +
        (ctx.ligasInfo.length > 1 ? ': ' + l.label : '') + '</button>';
    }).join('');

    var mapa = ctx.typeVal === 'offline'
      ? '<a class="bc-btn" href="mapa-evento.html?' + ctx.paramsMapa + '" target="_blank" rel="noopener">Mapa</a>'
      : '';

    return '' +
      '<div class="bc-date"><b>' + dp.dia + '</b><span>' + dp.mes + ' · ' + dp.sem + '</span></div>' +
      '<div class="bc-thumb">' + thumbImg + '<span class="bc-tag">' + String(ctx.typeVal).toUpperCase() + '</span></div>' +
      '<div class="bc-info">' +
        ((ligas || ctx.bracketBadgeHTML) ? '<div class="bc-badges">' + ligas + ctx.bracketBadgeHTML + '</div>' : '') +
        '<h3>' + t.name + '</h3>' +
        '<div class="bc-meta">' + ctx.inscritos + ' inscrito' + plural + '<s>/</s>TO ' + ctx.toName + '<s>/</s>' + local + '</div>' +
        '<div class="bc-status"><i class="' + (aberta ? '' : 'off') + '"></i><b class="' + (aberta ? 'ok' : 'off') + '">' +
          (aberta ? 'Inscrição aberta' : 'Inscrição fechada') + '</b>' + encerra + streamTag + '</div>' +
        timer +
        eventos +
      '</div>' +
      '<div class="bc-act">' +
        '<a class="bc-primary" href="https://start.gg' + t.url + '" target="_blank" rel="noopener">Página do torneio</a>' +
        '<div class="bc-sub">' +
          '<button type="button" class="bc-btn" onclick="event.stopPropagation();abrirAttendees(\'' + t.url + '\')">Inscritos</button>' +
          '<button type="button" class="bc-btn" onclick="event.stopPropagation();abrirBracket(\'' + t.url + '\')">Bracket</button>' +
          '<a class="bc-btn" href="' + ctx.calendarLink + '" target="_blank" rel="noopener" title="Adicionar ao Google Calendar" aria-label="Adicionar ao Google Calendar">Agenda</a>' +
          mapa + ranking +
        '</div>' +
      '</div>';
  }

  // título da lista ("2 torneios · 2XKO · Online · América do Sul"); remove quando o tema não é Broadcast
  function titulo(n) {
    var cont = document.getElementById('resultados');
    if (!cont) return;
    var el = document.getElementById('bc_resultados_titulo');
    if (!ativo()) { if (el) el.remove(); return; }
    function txt(id) {
      var s = document.getElementById(id);
      return s && s.options && s.selectedIndex >= 0 ? s.options[s.selectedIndex].text : '';
    }
    if (!el) {
      el = document.createElement('h2');
      el.id = 'bc_resultados_titulo';
      el.className = 'bc-titulo';
      cont.parentNode.insertBefore(el, cont);
    }
    el.innerHTML = n + ' torneio' + (n !== 1 ? 's' : '') + ' <span>' +
      [txt('campo_jogo'), txt('campo_tipo'), txt('campo_local')].filter(Boolean).join(' · ') + '</span>';
  }

  window.FGCBroadcast = { ativo: ativo, linha: linha, titulo: titulo };
})();
