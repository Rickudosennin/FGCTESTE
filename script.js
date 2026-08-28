// ========== BLOQUEIO SIMPLES DE INSPEÇÃO ==========
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'U')) {
        e.preventDefault();
        return false;
    }
});

// ========== CHAVE DA API OFUSCADA ==========
const _0x4a='2f99ad10';
const _0x4b='6ead3e77';
const _0x4c='8a071792';
const _0x4d='a4285dbd';
const STARTGG_KEY = _0x4a + _0x4b + _0x4c + _0x4d;

// ========== CÓDIGO ORIGINAL COMPLETO ==========
const STARTGG_API = 'https://api.start.gg/gql/alpha';

const COUNTRY_MAP = {
    "Brazil":"BR","United States":"US","Argentina":"AR","Chile":"CL","Colombia":"CO",
    "Mexico":"MX","Peru":"PE","Venezuela":"VE","Ecuador":"EC","Bolivia":"BO",
    "Paraguay":"PY","Uruguay":"UY","Portugal":"PT","Spain":"ES","France":"FR",
    "Germany":"DE","Italy":"IT","Japan":"JP","South Korea":"KR","Canada":"CA",
    "United Kingdom":"GB","Australia":"AU","Netherlands":"NL","Sweden":"SE"
};
const games = [
    { "label": "2XKO", "value": "2XKO", "videogameId": 64423 }, { "label": "Avatar Legends: The Fighting Game", "value": "ALFG", "videogameId": 11429 }, { "label": "BlazBlue: Central Fiction", "value": "BBCF", "videogameId": 37 },
    { "label": "Brawlhalla", "value": "Brawlhalla", "videogameId": 15 }, { "label": "DNF Duel", "value": "DNF", "videogameId": 44345 },
    { "label": "Dragon Ball FighterZ", "value": "DBFZ", "videogameId": 287 }, { "label": "Fatal Fury: COTW", "value": "FFCOTW", "videogameId": 73221 },
    { "label": "Granblue Fantasy Versus: Rising", "value": "GBVSR", "videogameId": 48548 }, { "label": "Guilty Gear: Strive", "value": "GGST", "videogameId": 33945 },
    { "label": "Invincible Vs.", "value": "IVS", "videogameId": 108058 }, { "label": "Injustice 2", "value": "INJ2", "videogameId": 35 },
    { "label": "Marvel Tokon: Fighting Souls", "value": "Marvel Tokon: Fighting Souls", "videogameId": 107706 },
    { "label": "Marvel vs. Capcom 2", "value": "MVC2", "videogameId": 125 }, { "label": "Melty Blood: Type Lumina", "value": "MBTL", "videogameId": 35879 }, 
    { 
  "label": "Mystery Game", 
  "value": "Mystery Game", 
  "videogameId": 1386 
},
    { "label": "Mortal Kombat 1", "value": "MK1", "videogameId": 48599 }, { "label": "Mortal Kombat 11", "value": "MK11", "videogameId": 3200 },
    { "label": "Mortal Kombat X", "value": "MKX", "videogameId": 22 }, { "label": "Ultimate Mortal Kombat 3", "value": "UMK3", "videogameId": 55 },
    { "label": "MultiVersus", "value": "MVS", "videogameId": 45044 }, { "label": "Pocket Bravery", "value": "PB", "videogameId": 44108 },
    { "label": "Rivals of Aether", "value": "ROA", "videogameId": 24, "hidden": true }, { "label": "Rocket League", "value": "ROCKET_LEAGUE", "videogameId": 14 },
    { "label": "SAMURAI SHODOWN", "value": "SS", "videogameId": 3568, "hidden": true },
    { "label": "Skullgirls 2nd Encore", "value": "SG", "videogameId": 12 }, { "label": "Street Fighter 6", "value": "SF6", "videogameId": 43868 },
    { "label": "Street Fighter III: 3rd Strike", "value": "SF3", "videogameId": 43 }, { "label": "Super Smash Bros. Melee", "value": "SSBM", "videogameId": 1 },
    { "label": "Super Smash Bros. Ultimate", "value": "SSBU", "videogameId": 1386 }, { "label": "Super Street Fighter II Turbo", "value": "ST", "videogameId": 33 },
    { "label": "Tekken 7", "value": "TEKKEN7", "videogameId": 17, "hidden": true }, { "label": "Tekken 8", "value": "TEKKEN8", "videogameId": 49783 },
    { "label": "The King of Fighters XV", "value": "KOF XV", "videogameId": 36963 }, { "label": "Ultimate Marvel vs. Capcom 3", "value": "UMVC3", "videogameId": 10, "hidden": true },
    { "label": "Under Night In-Birth II Sys:Celes", "value": "UNISC", "videogameId": 50203 }
];
const southAmericanCountries = ["Brazil","Argentina","Chile","Colombia","Peru","Uruguay","Paraguay","Ecuador","Bolivia","Venezuela"];

async function callStartGG(query, variables = {}) {
    const res = await fetch(STARTGG_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${STARTGG_KEY}` }, body: JSON.stringify({ query, variables }) });
    return await res.json();
}

function extrairSlugTorneio(url) { if (!url) return null; const match = url.match(/\/tournament\/([^\/]+)/i); return match ? match[1].toLowerCase() : null; }

// ==================== LIGAS MONITORADAS ====================
const LIGAS_MONITORADAS = [
    { slug: 'kombat-ranking-mk1', label: 'Kombat Ranking MK1', rankingUrl: 'https://www.start.gg/league/kombat-ranking-mk1/standings' },
    { slug: 'arena-outworld-edi-o-6-2', label: 'Arena Outworld Edição 6', rankingUrl: 'https://www.start.gg/league/arena-outworld-edi-o-6-2/standings' },
    { slug: 'ranking-brasil-tekken-8-2026', label: 'Ranking Brasil Tekken 8 2026', rankingUrl: 'https://www.start.gg/league/ranking-brasil-tekken-8-2026/standings' },
    { slug: 'kampeonato-brasileiro-de-mortal-kombat-1-temporada-2', label: 'Kampeonato Brasileiro MK1 - T2', rankingUrl: 'https://www.start.gg/league/kampeonato-brasileiro-de-mortal-kombat-1-temporada-2/standings' },
    { slug: 'kampeonato-brasileiro-de-mortal-kombat-1-ranking-anual', label: 'Kampeonato Brasileiro MK1 - Ranking Anual', rankingUrl: 'https://www.start.gg/league/kampeonato-brasileiro-de-mortal-kombat-1-ranking-anual/standings' },
    { slug: 'raven-s-championship', label: "Raven's Championship", rankingUrl: 'https://www.start.gg/league/raven-s-championship/standings' },
    { slug: 'liga-de-kolossos-3-edi-o', label: 'Liga de Kolossos 3ª Edição', rankingUrl: 'https://www.start.gg/league/liga-de-kolossos-3-edi-o/standings' },
    { slug: 'world-warrior-2026-capcom-pro-tour', label: 'World Warrior 2026 - Capcom Pro Tour', rankingUrl: 'https://www.start.gg/league/world-warrior-2026-capcom-pro-tour/standings' },
    { slug: 'rocket-league-championship-series-2026', label: 'Rocket League Championship Series 2026', rankingUrl: 'https://www.start.gg/league/rocket-league-championship-series-2026/standings' },
    { slug: '2xko-community-events-program-mixed-duo', label: '2XKO Community Events - Mixed Duo', rankingUrl: 'https://www.start.gg/league/2xko-community-events-program-mixed-duo/standings' },
    { slug: '2xko', label: '2XKO', rankingUrl: 'https://www.start.gg/league/2xko/standings' }
];

let leagueTournamentMap = {};
function verificarLigaDeTorneio(url) {
    const slug = extrairSlugTorneio(url);
    return slug ? (leagueTournamentMap[slug] || []) : [];
}
async function carregarTorneiosDasLigas() {
    const query = `query LeagueEvents($slug: String) { league(slug: $slug) { events(query: { page: 1, perPage: 100 }) { nodes { tournament { url } } } } }`;
    const fetches = LIGAS_MONITORADAS.map(liga => callStartGG(query, { slug: liga.slug }).then(json => {
        const nodes = json.data?.league?.events?.nodes || [];
        nodes.forEach(node => {
            const slug = extrairSlugTorneio(node.tournament?.url);
            if (!slug) return;
            if (!leagueTournamentMap[slug]) leagueTournamentMap[slug] = [];
            if (!leagueTournamentMap[slug].some(l => l.slug === liga.slug)) {
                leagueTournamentMap[slug].push({ label: liga.label, rankingUrl: liga.rankingUrl, slug: liga.slug });
            }
        });
    }).catch(() => {}));
    await Promise.all(fetches);
}

// ==================== RANKING SIDEBAR ====================
async function abrirRanking(ligaSlug, ligaLabel, rankingUrl) {
    const sidebar = document.getElementById('ranking_sidebar'), overlay = document.getElementById('ranking_overlay'), content = document.getElementById('ranking_content'), leagueEl = document.getElementById('ranking_league_name'), extLink = document.getElementById('ranking_external_link');
    sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; leagueEl.textContent = ligaLabel; extLink.href = rankingUrl;
    content.innerHTML = `<div class="loading-attendees"><div class="spinner-purple"></div><p style="margin-top:15px;color:#aaa;">Carregando ranking...</p></div>`;
    try {
        const query = `query LeagueStandings($slug: String) { league(slug: $slug) { standings(query: { page: 1, perPage: 25 }) { nodes { placement totalPoints entrant { name participants { user { location { country } } } } } } } }`;
        const json = await callStartGG(query, { slug: ligaSlug }); const nodes = json.data?.league?.standings?.nodes || [];
        if (nodes.length === 0) { content.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa;">Nenhum dado de ranking encontrado.</div>`; return; }
        const maxPts = Math.max(...nodes.map(n => n.totalPoints || 0)) || 1; let html = '';
        nodes.forEach(node => {
            const placement = node.placement, name = node.entrant?.name || '—', pts = node.totalPoints ?? 0, country = node.entrant?.participants?.[0]?.user?.location?.country, code = country && COUNTRY_MAP[country] ? COUNTRY_MAP[country].toLowerCase() : null;
            const flagHTML = code ? `<img src="https://flagcdn.com/w40/${code}.png" class="ranking-flag" alt="${country}">` : `<div class="ranking-flag-placeholder"></div>`;
            const rankClass = placement === 1 ? 'rank-1' : placement === 2 ? 'rank-2' : placement === 3 ? 'rank-3' : '', numClass = placement === 1 ? 'rank-1' : placement === 2 ? 'rank-2' : placement === 3 ? 'rank-3' : 'rank-other', barWidth = Math.round((pts / maxPts) * 100), medal = placement === 1 ? '🥇' : placement === 2 ? '🥈' : placement === 3 ? '🥉' : '';
            html += `<div class="ranking-player-card ${rankClass}"><div class="rank-number ${numClass}">${medal || '#' + placement}</div><div class="ranking-player-info"><div class="ranking-player-name">${name}</div><div class="ranking-player-pts">${pts.toLocaleString('pt-BR')} pts</div></div>${flagHTML}<div class="ranking-bar-wrap"><div class="ranking-bar-fill ${rankClass ? '' : 'rank-other-bar'}" style="width:${barWidth}%;${rankClass ? '' : 'background:#7c3aed;'}"></div></div></div>`;
        });
        content.innerHTML = html;
    } catch (e) { content.innerHTML = `<div style="text-align:center;padding:40px;color:#ef4444;">Erro ao carregar ranking.</div>`; }
}
function fecharRanking() { document.getElementById('ranking_sidebar').classList.remove('open'); document.getElementById('ranking_overlay').classList.remove('active'); document.body.style.overflow = ''; }

// ==================== ATTENDEES COM PAGINAÇÃO ====================
let _attendeesState = null;

async function abrirAttendees(tournamentUrl) {
    const sidebar = document.getElementById('attendees_sidebar'), overlay = document.getElementById('attendees_overlay'), content = document.getElementById('attendees_content'), countEl = document.getElementById('attendees_count');
    sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden';
    content.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Carregando inscritos...</p></div>'; countEl.textContent = '';

    _attendeesState = {
        slug: tournamentUrl.replace('/tournament/', '').split('/')[0],
        page: 1,
        perPage: 100,
        totalCount: 0,
        globalOffset: 0
    };
    await _carregarPaginaAttendees();
}

async function _carregarPaginaAttendees() {
    const content = document.getElementById('attendees_content'), countEl = document.getElementById('attendees_count');
    if (!_attendeesState) return;

    const { slug, page, perPage } = _attendeesState;
    const isFirstPage = page === 1;

    if (!isFirstPage) {
        const old = document.getElementById('_attendees_pagination');
        if (old) old.innerHTML = '<div class="loading-attendees" style="padding:20px 0;"><div class="spinner"></div></div>';
    }

    try {
        const query = `query Attendees($slug:String!,$page:Int!,$perPage:Int!){tournament(slug:$slug){participants(query:{page:$page,perPage:$perPage}){pageInfo{total}nodes{id,gamerTag,prefix,player{id},user{location{country}}}}}}`;
        const json = await callStartGG(query, { slug, page, perPage });
        const pData = json.data?.tournament?.participants || {};
        const participants = pData.nodes || [];
        const total = pData.pageInfo?.total ?? 0;

        _attendeesState.totalCount = total;
        countEl.textContent = `(${total} inscrito${total !== 1 ? 's' : ''})`;

        if (isFirstPage && participants.length === 0) {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Nenhum inscrito encontrado.</div>';
            return;
        }

        let html = '';
        const offset = _attendeesState.globalOffset;
        participants.forEach((p, i) => {
            const idx = offset + i;
            const country = p.user?.location?.country, countryCode = COUNTRY_MAP[country] || null;
            const flagHTML = countryCode
                ? `<img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" class="attendee-flag" alt="${country}">`
                : '<div style="width:28px;height:20px;background:rgba(255,255,255,0.05);border-radius:3px;"></div>';
            const safeGamerTag = (p.gamerTag || 'Sem nome').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const playerId = p.player?.id || '';
            const prefix = p.prefix || '';
            
            // ========== SALVAR PLAYER NO LOCALSTORAGE (COM PREFIXO) ==========
            if (playerId && p.gamerTag) {
                try {
                    if (typeof _salvarPlayerLocal === 'function') {
                        _salvarPlayerLocal(playerId, p.gamerTag, prefix);
                    } else {
                        const lista = JSON.parse(localStorage.getItem('fgchub_local_players') || '[]');
                        if (!lista.some(p => p.playerId === playerId)) {
                            lista.push({ playerId, gamerTag: p.gamerTag, prefix });
                            localStorage.setItem('fgchub_local_players', JSON.stringify(lista));
                        }
                    }
                } catch (e) {}
            }

            const displayName = prefix ? `${prefix} | ${p.gamerTag}` : p.gamerTag;

            // ========== LINK CORRIGIDO COM PREFIXO ==========
            html += `
                <div class="attendee-item">
                    <span class="attendee-number">#${idx + 1}</span>
                    ${flagHTML}
                    <a href="player.html?id=${playerId}&tag=${encodeURIComponent(p.gamerTag)}&prefix=${encodeURIComponent(prefix)}" class="attendee-name">
                        ${displayName}
                    </a>
                    ${p.prefix ? `<span style="color:#aaa;font-size:11px;">${p.prefix}</span>` : ''}
                </div>
                <div id="history-${idx}" style="display:none;"></div>
            `;
        });

        _attendeesState.globalOffset += participants.length;
        const hasMore = _attendeesState.globalOffset < total;

        const pageInfo = `<div style="text-align:center;padding:8px 0 4px;color:#666;font-size:11px;font-weight:bold;letter-spacing:0.5px;">Exibindo ${_attendeesState.globalOffset} de ${total}</div>`;
        const nextBtn = hasMore
            ? `<button onclick="_proximaPaginaAttendees()" style="display:block;width:100%;margin-top:8px;padding:11px;background:linear-gradient(to right,#991b1b,#dc2626);color:white;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:1px;border:none;border-radius:8px;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'"><i class="fa-solid fa-chevron-down" style="margin-right:6px;"></i>CARREGAR MAIS <span style="opacity:0.8;">(${total - _attendeesState.globalOffset} restantes)</span></button>`
            : (total > perPage ? `<div style="text-align:center;padding:10px 0 4px;color:#444;font-size:11px;text-transform:uppercase;letter-spacing:1px;">— Todos os inscritos carregados —</div>` : '');

        if (isFirstPage) {
            content.innerHTML = html + `<div id="_attendees_pagination">${pageInfo}${nextBtn}</div>`;
        } else {
            const paginationEl = document.getElementById('_attendees_pagination');
            if (paginationEl) {
                paginationEl.insertAdjacentHTML('beforebegin', html);
                paginationEl.innerHTML = pageInfo + nextBtn;
            }
        }
    } catch (e) {
        if (page === 1) {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Erro ao carregar inscritos.</div>';
        } else {
            const paginationEl = document.getElementById('_attendees_pagination');
            if (paginationEl) paginationEl.innerHTML = '<div style="text-align:center;padding:10px;color:#ef4444;font-size:12px;">Erro ao carregar mais. Tente novamente.</div>';
        }
    }
}

async function _proximaPaginaAttendees() {
    if (!_attendeesState) return;
    _attendeesState.page++;
    await _carregarPaginaAttendees();
}

function fecharAttendees() { document.getElementById('attendees_sidebar').classList.remove('open'); document.getElementById('attendees_overlay').classList.remove('active'); document.body.style.overflow = ''; }

// ==================== HISTORICO ====================
async function buscarSetsDoEvento(eventId, playerId) {
    const PER_PAGE = 100;
    const MAX_PAGINAS = 8; // trava de segurança: cobre até 800 sets do evento, evita loop infinito em eventos absurdamente grandes
    try {
        const query = `query EventSets($eventId: ID!, $page: Int!, $perPage: Int!) { event(id: $eventId) { sets(page: $page, perPage: $perPage, filters: {hideEmpty: true}) { pageInfo { totalPages } nodes { id winnerId fullRoundText slots { entrant { id name participants { player { id gamerTag } } } standing { stats { score { value } } } } } } } }`;

        let wins = 0, losses = 0;
        const setsDetalhados = [];
        let page = 1, totalPages = 1;

        do {
            const json = await callStartGG(query, { eventId, page, perPage: PER_PAGE });
            const setsNode = json.data?.event?.sets;
            totalPages = setsNode?.pageInfo?.totalPages || 1;
            const sets = setsNode?.nodes || [];

            sets.forEach(set => {
                const playerSlot = set.slots?.find(slot => slot.entrant?.participants?.some(p => p.player?.id == playerId));
                if (!playerSlot || !playerSlot.entrant) return;
                const myEntrantId = playerSlot.entrant.id;
                const oppSlot = set.slots?.find(slot => slot.entrant && String(slot.entrant.id) !== String(myEntrantId));
                const oppEntrant = oppSlot?.entrant || null;
                const opponentId = oppEntrant?.participants?.[0]?.player?.id || null;
                const opponentTag = oppEntrant?.name || oppEntrant?.participants?.[0]?.player?.gamerTag || null;
                const myScore = playerSlot.standing?.stats?.score?.value ?? null;
                const oppScore = oppSlot?.standing?.stats?.score?.value ?? null;
                if (set.winnerId) {
                    const venceu = String(set.winnerId) === String(myEntrantId);
                    if (venceu) wins++; else losses++;
                    setsDetalhados.push({ setId: set.id, venceu, opponentId, opponentTag, round: set.fullRoundText || '', myScore, oppScore });
                }
            });

            page++;
        } while (page <= totalPages && page <= MAX_PAGINAS);

        return { wins, losses, total: wins + losses, sets: setsDetalhados };
    } catch (e) { return { wins: 0, losses: 0, total: 0, error: true, sets: [] }; }
}

// ==================== WINRATE POR PERSONAGEM (reports manuais no Git) ====================
let _charReportsCache = null;
async function buscarReportsChar() {
    if (_charReportsCache) return _charReportsCache;
    try {
        const resp = await fetch('https://raw.githubusercontent.com/Rickudosennin/FGCTESTE/main/data/character-reports.json');
        const json = await resp.json();
        _charReportsCache = json.reports || [];
    } catch (e) { _charReportsCache = []; }
    return _charReportsCache;
}

function montarHtmlWinrateChar(statsChar, setsSemReport) {
    let charHtml = '<div class="history-char-title">🎮 WinRate por Personagem</div>';
    if (Object.keys(statsChar).length === 0) {
        charHtml += '<div class="history-empty">Nenhum personagem reportado ainda.</div>';
        return charHtml;
    }
    Object.entries(statsChar).forEach(([char, s]) => {
        const wr = (s.wins + s.losses) > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0;
        const cls = wr >= 60 ? 'history-winrate-60' : (wr >= 40 ? 'history-winrate-40' : 'history-winrate-0');
        charHtml += `<div class="history-item"><span class="history-name">${char}</span><span class="history-placement ${cls}">${s.wins}W-${s.losses}L (${wr}%)</span></div>`;
    });
    if (setsSemReport > 0) charHtml += `<div class="history-item"><span class="history-name" style="opacity:.6">Sem char reportado</span><span class="history-placement" style="opacity:.6">${setsSemReport} sets</span></div>`;
    return charHtml;
}

async function toggleHistorico(playerId, gamerTag, index) {
    const historyDiv = document.getElementById(`history-${index}`); if (!historyDiv) return;
    if (historyDiv.style.display === 'block') { historyDiv.style.display = 'none'; return; }
    historyDiv.style.display = 'block'; historyDiv.innerHTML = '<div class="history-search">🔍 Buscando torneios...</div>';
    try {
        const query1 = `query PlayerHistory($id: ID!) { player(id: $id) { recentStandings(limit: 10) { placement container { ... on Event { id name tournament { name numAttendees } } } } } }`;
        const json1 = await callStartGG(query1, { id: playerId }); const standings = json1.data?.player?.recentStandings || [];
        if (standings.length === 0) { historyDiv.innerHTML = `<div class="player-history"><div class="history-title">🔍 ${gamerTag}</div><div class="history-empty">⚠️ Nenhum torneio encontrado.</div></div>`; return; }
        let totalWins = 0, totalLosses = 0, torneiosProcessados = 0; const torneiosData = [];
        for (let i = 0; i < standings.length; i++) {
            const standing = standings[i]; const eventId = standing.container?.id; const tournamentName = standing.container?.tournament?.name || 'Torneio';
            historyDiv.innerHTML = `<div class="history-search">🔍 Analisando ${i + 1}/${standings.length} torneios...</div>`;
            if (!eventId) continue;
            const resultado = await buscarSetsDoEvento(eventId, playerId);
            if (resultado.total > 0 && !resultado.error) { totalWins += resultado.wins; totalLosses += resultado.losses; torneiosProcessados++; }
            torneiosData.push({ name: tournamentName, wins: resultado.wins, losses: resultado.losses, placement: standing.placement, attendees: standing.container?.tournament?.numAttendees || '?', sets: resultado.sets || [] });
        }
        const totalPartidas = totalWins + totalLosses; const winRateGeral = totalPartidas > 0 ? Math.round((totalWins / totalPartidas) * 100) : 0;
        let wrClass = winRateGeral >= 60 ? 'history-winrate-60' : (winRateGeral >= 40 ? 'history-winrate-40' : 'history-winrate-0');
        let html = `<div class="player-history"><div class="history-title">🔍 ${gamerTag}</div><div class="legend-bar"><div class="legend-item"><span class="legend-dot green"></span> 60%+</div><div class="legend-item"><span class="legend-dot yellow"></span> 40-59%</div><div class="legend-item"><span class="legend-dot red"></span> &lt;40%</div></div><div class="history-winrate ${wrClass}">📊 WinRate: ${winRateGeral}%</div><div class="history-winrate-detail">${totalWins}W / ${totalLosses}L em ${torneiosProcessados} torneios</div>`;
        torneiosData.forEach(t => { const wr = t.wins + t.losses > 0 ? Math.round((t.wins / (t.wins + t.losses)) * 100) : 0; let itemWrClass = wr >= 60 ? 'history-winrate-60' : (wr >= 40 ? 'history-winrate-40' : 'history-winrate-0'); html += `<div class="history-item"><span class="history-name">${t.name}</span><span class="history-placement ${itemWrClass}">${t.wins}W-${t.losses}L (${wr}%) — ${t.placement}º/${t.attendees}</span></div>`; });

        const todosSetsDoPlayer = torneiosData.flatMap(t => t.sets || []);
        const reports = await buscarReportsChar();
        const statsChar = {};
        todosSetsDoPlayer.forEach(s => {
            const rep = reports.find(r => String(r.setId) === String(s.setId) && String(r.playerId) === String(playerId));
            if (!rep) return;
            if (!statsChar[rep.character]) statsChar[rep.character] = { wins: 0, losses: 0 };
            s.venceu ? statsChar[rep.character].wins++ : statsChar[rep.character].losses++;
        });
        const setsComReport = Object.values(statsChar).reduce((acc, c) => acc + c.wins + c.losses, 0);
        const setsSemReport = todosSetsDoPlayer.length - setsComReport;
        html += montarHtmlWinrateChar(statsChar, setsSemReport);

        historyDiv.innerHTML = html + `</div>`;
    } catch (e) { historyDiv.innerHTML = `<div class="player-history"><div class="history-empty">❌ Erro ao buscar histórico.</div></div>`; }
}

// ==================== BRACKET SIDEBAR (COM POOLS) ====================
function getFlagHTMLBracket(entrant) {
    const c = entrant?.participants?.[0]?.user?.location?.country;
    if (!c || !COUNTRY_MAP[c]) return '<div style="width:35px;height:20px;margin-right:12px;background:rgba(255,255,255,0.05);border-radius:3px;"></div>';
    return `<img src="https://flagcdn.com/w40/${COUNTRY_MAP[c].toLowerCase()}.png" class="brk-flag-img">`;
}

let poolBracketTypeMap = {};

async function abrirBracket(tournamentUrl) {
    const sidebar = document.getElementById('bracket_sidebar'), overlay = document.getElementById('bracket_overlay'), content = document.getElementById('bracket_content');
    const eventSelect = document.getElementById('bracketEventSelect'), poolSelect = document.getElementById('bracketPoolSelect');
    
    sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden';
    content.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Buscando eventos...</p></div>';
    eventSelect.style.display = 'none'; poolSelect.style.display = 'none';
    
    try {
        const slug = tournamentUrl.replace('/tournament/', '').split('/')[0];
        const eventQuery = `query($slug: String!) { tournament(slug: $slug) { events { id name slug } } }`;
        const eventJson = await callStartGG(eventQuery, { slug });
        const events = eventJson.data?.tournament?.events || [];
        if (events.length === 0) { content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Nenhum evento encontrado.</div>'; return; }
        
        if (events.length > 1) {
            eventSelect.innerHTML = events.map(e => `<option value="${e.slug}">${e.name}</option>`).join('');
            eventSelect.style.display = 'block'; eventSelect.value = events[0].slug;
        }
        
        await carregarFasesEPools(events[0].slug);
    } catch (e) { content.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Erro ao carregar eventos da bracket.</div>'; }
}

async function onBracketEventChange() {
    const select = document.getElementById('bracketEventSelect');
    if (!select.value) return;
    await carregarFasesEPools(select.value);
}

async function carregarFasesEPools(eventSlug) {
    const poolSelect = document.getElementById('bracketPoolSelect');
    const content = document.getElementById('bracket_content');
    content.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Buscando chaves...</p></div>';
    
    try {
        const queryPhases = `query($slug: String!) { 
            event(slug: $slug) { 
                phases { 
                    id name bracketType
                    phaseGroups(query: {perPage: 50}) { 
                        nodes { id displayIdentifier } 
                    } 
                } 
            } 
        }`;
        const phasesJson = await callStartGG(queryPhases, { slug: eventSlug });
        const phasesList = phasesJson.data?.event?.phases || [];
        
        if (phasesList.length === 0) { 
            content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Nenhuma fase encontrada.</div>'; 
            poolSelect.style.display = 'none'; 
            return; 
        }

        let optionsHtml = '';
        let firstPoolId = null;
        poolBracketTypeMap = {};
        
        phasesList.forEach(phase => {
            const groups = phase.phaseGroups?.nodes || [];
            if (groups.length === 1) {
                poolBracketTypeMap[groups[0].id] = phase.bracketType;
                if (!firstPoolId) firstPoolId = groups[0].id;
                optionsHtml += `<option value="${groups[0].id}">${phase.name}</option>`;
            } else if (groups.length > 1) {
                groups.forEach(g => {
                    poolBracketTypeMap[g.id] = phase.bracketType;
                    if (!firstPoolId) firstPoolId = g.id;
                    optionsHtml += `<option value="${g.id}">${phase.name} - Grupo ${g.displayIdentifier}</option>`;
                });
            }
        });

        if (optionsHtml !== '') {
            poolSelect.innerHTML = optionsHtml;
            poolSelect.style.display = 'block'; 
            poolSelect.value = firstPoolId;
            await carregarChave(firstPoolId, content);
        } else {
            content.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Nenhuma bracket encontrada.</div>'; 
            poolSelect.style.display = 'none';
        }
    } catch (e) { 
        content.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Erro ao buscar chaves.</div>'; 
    }
}

async function onBracketPoolChange() {
    const select = document.getElementById('bracketPoolSelect');
    const content = document.getElementById('bracket_content');
    if (!select.value) return;
    content.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Carregando partidas...</p></div>';
    await carregarChave(select.value, content);
}

async function carregarChave(phaseGroupId, container) {
    const tipo = poolBracketTypeMap[phaseGroupId];
    if (tipo === 'ROUND_ROBIN') { await carregarGrupoRR(phaseGroupId, container); } else { await carregarBracketPool(phaseGroupId, container); }
}

async function carregarGrupoRR(phaseGroupId, container) {
    try {
        const query = `query($id: ID!) { 
            phaseGroup(id: $id) { 
                standings(query: {perPage: 64}) { nodes { placement entrant { id name participants { user { location { country } } } } } }
                sets(page:1,perPage:100) { nodes { id state slots { entrant { id } standing { stats { score { value } } } } } }
            } 
        }`;
        const json = await callStartGG(query, { id: phaseGroupId });
        const standings = json.data?.phaseGroup?.standings?.nodes || [];
        const sets = json.data?.phaseGroup?.sets?.nodes || [];

        if (standings.length === 0) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Nenhum participante encontrado neste grupo.</div>'; return; }

        const record = {};
        standings.forEach(s => { record[s.entrant.id] = { w: 0, l: 0 }; });
        sets.forEach(set => {
            if (set.state !== 3) return;
            const p1 = set.slots[0], p2 = set.slots[1];
            if (!p1?.entrant || !p2?.entrant) return;
            const s1 = p1.standing?.stats?.score?.value ?? 0, s2 = p2.standing?.stats?.score?.value ?? 0;
            if (s1 === s2) return;
            const winnerId = s1 > s2 ? p1.entrant.id : p2.entrant.id, loserId = s1 > s2 ? p2.entrant.id : p1.entrant.id;
            if (record[winnerId]) record[winnerId].w++;
            if (record[loserId]) record[loserId].l++;
        });

        const rows = standings.slice().sort((a,b) => (a.placement??999)-(b.placement??999)).map(s => ({ ...s, w: record[s.entrant.id]?.w??0, l: record[s.entrant.id]?.l??0 }));

        let html = `<div class="brk-container"><div class="brk-label">Fase de Grupos</div><div class="rr-table-wrap"><table class="rr-table"><thead><tr><th>#</th><th>Jogador</th><th>V</th><th>D</th></tr></thead><tbody>`;
        rows.forEach(r => {
            const qualified = r.placement && r.placement <= 2 ? 'rr-qualified' : '';
            html += `<tr class="${qualified}"><td class="rr-pos">${r.placement??'-'}</td><td class="rr-name-cell">${getFlagHTMLBracket(r.entrant)}<span>${r.entrant?.name||'TBD'}</span></td><td class="rr-w">${r.w}</td><td class="rr-l">${r.l}</td></tr>`;
        });
        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
    } catch (e) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Erro ao carregar grupo.</div>'; }
}

async function carregarBracketPool(phaseGroupId, container) {
    try {
        const querySets = `query($id: ID!) { 
            phaseGroup(id: $id) { 
                sets(page:1,perPage:100) { 
                    nodes { 
                        id fullRoundText round state 
                        stream { id } 
                        slots { 
                            entrant { name id participants { user { location { country } } } } 
                            standing { stats { score { value } } } 
                        } 
                    } 
                } 
            } 
        }`;
        const setsJson = await callStartGG(querySets, { id: phaseGroupId });
        const sets = setsJson.data?.phaseGroup?.sets?.nodes || [];
        
        if (sets.length === 0) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#aaa;">Nenhuma partida encontrada nesta chave ou torneio ainda não iniciou.</div>'; return; }
        
        const rounds = {};
        sets.forEach(set => {
            const key = `${set.round}_${set.fullRoundText}`;
            if (!rounds[key]) rounds[key] = { round: set.round, title: set.fullRoundText, sets: [] };
            rounds[key].sets.push(set);
        });

        const sortedKeys = Object.keys(rounds).sort((a,b) => {
            const rA = rounds[a], rB = rounds[b];
            const isResetA = rA.title.toLowerCase().includes("reset"), isResetB = rB.title.toLowerCase().includes("reset");
            if (isResetA && !isResetB) return 1; if (!isResetA && isResetB) return -1;
            if (rA.round > 0 && rB.round > 0) return rA.round - rB.round;
            if (rA.round < 0 && rB.round < 0) return rB.round - rA.round;
            return rA.round - rB.round;
        });
        
        let html = `<div class="brk-container"><div id="winners-area"><div class="brk-label">Winners Bracket</div><div id="winners-root" class="brk-row"></div></div><div id="losers-area" style="margin-top:40px;"><div class="brk-label">Losers Bracket</div><div id="losers-root" class="brk-row"></div></div><div id="connectors-container" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div></div>`;
        container.innerHTML = html;

        const wRoot = document.getElementById('winners-root'), lRoot = document.getElementById('losers-root');
        const setMap = new Map();
        let hasWinners = false, hasLosers = false;

        sortedKeys.forEach(key => {
            const rData = rounds[key];
            const col = document.createElement('div'); col.className = 'brk-column'; col.innerHTML = `<div class="brk-round-title">${rData.title}</div>`;
            rData.sets.sort((a,b) => a.id - b.id);
            rData.sets.forEach(set => {
                const p1=set.slots[0], p2=set.slots[1], s1=p1?.standing?.stats?.score?.value??0, s2=p2?.standing?.stats?.score?.value??0, done=set.state===3, onStream=set.state===2 && set.stream!==null;
                const card = document.createElement('div'); card.id=`set-${set.id}`; card.className=`brk-match-card ${onStream?'on-stream':''}`;
                card.innerHTML = `
                    <div class="brk-player ${done&&s1>s2?'brk-winner':(done&&s2>s1?'brk-loser':'')}"><div class="brk-name-container">${getFlagHTMLBracket(p1?.entrant)}<div class="brk-name">${p1?.entrant?.name||'TBD'}</div></div><div class="brk-score">${done?(s1<0?'DQ':s1):'-'}</div></div>
                    <div class="brk-player ${done&&s2>s1?'brk-winner':(done&&s1>s2?'brk-loser':'')}"><div class="brk-name-container">${getFlagHTMLBracket(p2?.entrant)}<div class="brk-name">${p2?.entrant?.name||'TBD'}</div></div><div class="brk-score">${done?(s2<0?'DQ':s2):'-'}</div></div>
                `;
                col.appendChild(card); setMap.set(set.id, card);
            });
            if (rData.round > 0) { wRoot.appendChild(col); hasWinners = true; } else { lRoot.appendChild(col); hasLosers = true; }
        });
        document.getElementById('winners-area').classList.toggle('brk-empty-area', !hasWinners);
        document.getElementById('losers-area').classList.toggle('brk-empty-area', !hasLosers);
        
        setTimeout(() => drawConnectorsLayout(sets, setMap), 250);
    } catch (e) { container.innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">Erro ao renderizar bracket.</div>'; }
}

function drawConnectorsLayout(sets, setMap) {
    const container = document.getElementById('connectors-container'); if(!container) return; container.innerHTML = '';
    const handledConnections = new Set();
    sets.forEach(set => {
        if (set.state !== 3) return;
        const p1Score = set.slots[0]?.standing?.stats?.score?.value ?? 0, p2Score = set.slots[1]?.standing?.stats?.score?.value ?? 0;
        const winnerEntrant = p1Score > p2Score ? set.slots[0]?.entrant : set.slots[1]?.entrant; if (!winnerEntrant) return;
        const targetSet = sets.find(s => s.round === (set.round > 0 ? set.round + 1 : set.round - 1) && s.slots.some(slot => slot.entrant?.id === winnerEntrant.id));
        if (targetSet && setMap.has(set.id) && setMap.has(targetSet.id)) {
            const connectionKey = `${set.id}_${targetSet.id}`;
            if (handledConnections.has(connectionKey)) return;
            createLedConnectorLayout(setMap.get(set.id), setMap.get(targetSet.id), container);
            handledConnections.add(connectionKey);
        }
    });
}

function createLedConnectorLayout(startNode, endNode, container) {
    const startRect = startNode.getBoundingClientRect(), endRect = endNode.getBoundingClientRect(), containerRect = container.getBoundingClientRect();
    const startX = startRect.right - containerRect.left, startY = startRect.top - containerRect.top + (startRect.height / 2), endX = endRect.left - containerRect.left, endY = endRect.top - containerRect.top + (endRect.height / 2);
    const midX = startX + (endX - startX) / 2;
    createSegmentLayout(startX, startY, midX - startX, 4, container, 'none');
    if (Math.abs(endY - startY) > 5) {
        const vHeight = Math.abs(endY - startY), vTop = Math.min(startY, endY), direction = endY > startY ? 'down' : 'up';
        createSegmentLayout(midX - 2, vTop, 4, vHeight, container, direction);
    }
    createSegmentLayout(midX, endY, endX - midX, 4, container, 'none');
}

function createSegmentLayout(x, y, w, h, container, direction) {
    const segment = document.createElement('div'); segment.className = 'brk-connector'; segment.style.left = `${x}px`; segment.style.top = `${y - (direction !== 'none' ? 0 : 2)}px`; segment.style.width = `${w}px`; segment.style.height = `${h}px`;
    const led = document.createElement('div'); led.className = 'brk-led-flow'; led.style.width = '100%'; led.style.height = '100%';
    if (direction === 'down') led.style.animationName = 'brk-led-animation-v-down'; else if (direction === 'up') led.style.animationName = 'brk-led-animation-v-up'; else led.style.animationName = 'brk-led-animation';
    segment.appendChild(led); container.appendChild(segment);
}

function fecharBracket() { document.getElementById('bracket_sidebar').classList.remove('open'); document.getElementById('bracket_overlay').classList.remove('active'); document.body.style.overflow = ''; }

// ==================== PESQUISA & MAIN ====================
async function checkAPIStatus() { const dot = document.getElementById('api_status_dot'), text = document.getElementById('api_status_text'); try { const query = `query HealthCheck { tournaments(query: { perPage: 1, filter: { upcoming: true } }) { nodes { id } } }`; const start = performance.now(); const json = await callStartGG(query); const end = performance.now(); if (json.data?.tournaments?.nodes) { dot.className = 'status-dot status-online'; text.textContent = `API: Online (${Math.round(end-start)}ms)`; } else { throw new Error(); } } catch (e) { dot.className = 'status-dot status-offline'; text.textContent = 'API: Offline'; } }
setInterval(checkAPIStatus, 45000); checkAPIStatus();
function toggleChangelog() { document.getElementById('changelog_modal').classList.toggle('hidden'); }
function carregarJogos() { document.getElementById("campo_jogo").innerHTML = games.filter(g => !g.hidden).map(g => `<option value="${g.value}">${g.label}</option>`).join(''); }
function atualizarPainelDisponibilidade(nodes) { const painel = document.getElementById("painel_disponibilidade"), grid = document.getElementById("grid_dias"); painel.classList.remove("hidden"); grid.innerHTML = ""; const datasOcupadas = nodes.flatMap(t => { const datas = (t.events && t.events.length > 0) ? t.events.map(ev => ev.startAt || t.startAt) : [t.startAt]; return datas.map(ts => { const d = new Date(ts*1000); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }); }); for (let i=0;i<14;i++){ const dia=new Date();dia.setDate(dia.getDate()+i);const isoDia=`${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,'0')}-${String(dia.getDate()).padStart(2,'0')}`;const isOcupado=datasOcupadas.includes(isoDia);grid.innerHTML+=`<div class="day-slot ${isOcupado?'day-busy':'day-available'} p-3 rounded-lg text-center border"><span class="text-[9px] uppercase font-bold opacity-70">${dia.toLocaleDateString('pt-BR',{weekday:'short'})}</span><span class="text-xs font-black block">${dia.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span><span class="text-[10px] font-bold mt-1 uppercase"><i class="fa-solid ${isOcupado?'fa-calendar-xmark':'fa-calendar-plus'}"></i> ${isOcupado?'Ocupado':'Livre'}</span></div>`; } }
function iniciarTimer(id, registrationClosesAt, checkInData, eventStartAt, eventState) {
    const el = document.getElementById(id);
    if (!el) return;

    const now = () => new Date().getTime();
    const regClose = registrationClosesAt ? registrationClosesAt * 1000 : null;
    const startAt = eventStartAt ? eventStartAt * 1000 : null;
    const state = eventState || 'CREATED';

    let checkIn = null;
    if (checkInData && checkInData.checkInEnabled && typeof checkInData.checkInDuration === 'number' && typeof checkInData.checkInBuffer === 'number' && startAt) {
        const durationMs = checkInData.checkInDuration * 1000;
        const bufferMs = checkInData.checkInBuffer * 1000;
        if (durationMs >= 0 && bufferMs >= 0) {
            checkIn = {
                enabled: true,
                start: startAt - durationMs - bufferMs,
                end: startAt - bufferMs
            };
        }
    }

    const interval = setInterval(() => {
        if (!document.getElementById(id)) { clearInterval(interval); return; }
        const t = now();

        if (checkIn && t >= checkIn.start && t < checkIn.end) {
            const diff = checkIn.end - t;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.innerHTML = `✅ CHECK-IN ABERTO – FECHA EM: ${h}h ${m}m ${s}s`;
            el.className = 'timer-checkin';
            return;
        }

        if (regClose && t < regClose) {
            const diff = regClose - t;
            const D = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.innerHTML = `⏳ INSCRIÇÕES FECHAM EM: ${D}d ${h}h ${m}m ${s}s`;
            el.className = 'timer-red';
            return;
        }

        const afterReg = regClose ? t >= regClose : true;
        const afterCheckIn = checkIn ? t >= checkIn.end : true;

        if (afterReg && afterCheckIn) {
            if (state === 'READY' || state === 'CALLED') {
                el.innerHTML = '🎮 BRACKET INICIANDO EM BREVE';
                el.className = 'timer-ready';
            } else if (state === 'ACTIVE') {
                el.innerHTML = '🔴 BRACKET EM ANDAMENTO';
                el.className = 'timer-active';
            } else if (state === 'COMPLETED') {
                el.innerHTML = '🏁 EVENTO FINALIZADO';
                el.className = 'timer-completed';
            } else {
                el.innerHTML = 'INSCRIÇÕES ENCERRADAS';
                el.className = 'timer-end';
            }
            clearInterval(interval);
            return;
        }

        if (checkIn && t < checkIn.start && regClose && t >= regClose) {
            const diff = checkIn.start - t;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            el.innerHTML = `⏰ CHECK-IN INICIA EM: ${h}h ${m}m ${s}s`;
            el.className = 'timer-checkin-pending';
            return;
        }

        el.innerHTML = '';
    }, 1000);
}
function formatarDataGoogle(ts){return new Date(ts*1000).toISOString().replace(/-|:|\.\d+/g,"");}
function gerarLinkGoogleCalendar(t){const i=formatarDataGoogle(t.startAt),f=formatarDataGoogle(t.startAt+7200),d=encodeURIComponent(`Inscrição: https://start.gg${t.url}`);return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.name)}&dates=${i}/${f}&details=${d}`;}

async function pesquisar() {
    const gameObj = games.find(g => g.value === document.getElementById("campo_jogo").value), typeVal = document.getElementById("campo_tipo").value, localVal = document.getElementById("campo_local").value;
    const container = document.getElementById("resultados"), status = document.getElementById("status"); container.innerHTML = ""; status.classList.remove("hidden");
    const camposNode = `
          id,name,url,startAt,endAt,registrationClosesAt,isRegistrationOpen,addrState,numAttendees,
          images{url,type},streams{streamName,streamSource},
          streamQueue{
            stream{streamName},
            sets{
              state
              fullRoundText
              phaseGroup{
                displayIdentifier
                phase{
                  name
                }
              }
            }
          },
          owner{name,slug,player{gamerTag},location{country}},
          events(filter:{videogameId:$vId}){
            id
            name
            slug
            startAt
            numEntrants
            checkInEnabled
            checkInDuration
            checkInBuffer
            state
          }`;
    const queryUpcoming = `query TournamentsUpcoming($vId:[ID], $isOnline:Boolean, $country:String){
      tournaments(query:{perPage:40, sortBy:"startAt asc", filter:{upcoming:true, videogameIds:$vId, hasOnlineEvents:$isOnline, countryCode:$country}}){
        nodes{${camposNode}}
      }
    }`;
    const queryLongRunning = `query TournamentsLongRunning($vId:[ID], $isOnline:Boolean, $country:String, $afterDate:Timestamp){
      tournaments(query:{perPage:40, sortBy:"startAt desc", filter:{afterDate:$afterDate, videogameIds:$vId, hasOnlineEvents:$isOnline, countryCode:$country}}){
        nodes{${camposNode}}
      }
    }`;
    try {
        const baseVars = { vId: [gameObj.videogameId], isOnline: typeVal === "online" };
        if (typeVal === "offline") baseVars.country = localVal;
        
        const varsUpcoming = { ...baseVars };
        const varsLongRunning = { ...baseVars, afterDate: Math.floor(Date.now()/1000) - (400*24*60*60) };
        
        const [jsonUpcoming, jsonLongRunning] = await Promise.all([
            callStartGG(queryUpcoming, varsUpcoming),
            callStartGG(queryLongRunning, varsLongRunning)
        ]);
        const nodesA = jsonUpcoming.data?.tournaments?.nodes || [];
        const nodesB = jsonLongRunning.data?.tournaments?.nodes || [];
        
        const vistos = new Set();
        let nodes = [...nodesA, ...nodesB].filter(t => {
            if (vistos.has(t.id)) return false;
            vistos.add(t.id);
            return true;
        });
        
        const agora = Math.floor(Date.now()/1000);
        nodes = nodes.filter(t => (t.endAt || t.startAt) >= agora);
        
        if (typeVal === "online" && localVal === "south-america") {
            nodes = nodes.filter(t => southAmericanCountries.includes(t.owner?.location?.country));
        }
        
        const proximaDataEvento = t => {
            const datas = (t.events && t.events.length > 0) ? t.events.map(ev => ev.startAt || t.startAt) : [t.startAt];
            const futuras = datas.filter(d => d >= agora);
            return futuras.length > 0 ? Math.min(...futuras) : Math.min(...datas);
        };
        nodes.sort((a, b) => proximaDataEvento(a) - proximaDataEvento(b));
        
        status.classList.add("hidden"); atualizarPainelDisponibilidade(nodes);
        
        nodes.forEach((t, i) => {
            const dataEventoProximo = proximaDataEvento(t);
            const eventoAtual = (t.events && t.events.length > 0) ? t.events.reduce((a, b) => Math.abs((a.startAt||t.startAt) - dataEventoProximo) <= Math.abs((b.startAt||t.startAt) - dataEventoProximo) ? a : b) : null;
            const regCloseEfetivo = (eventoAtual && eventoAtual.startAt && t.registrationClosesAt) ? Math.min(t.registrationClosesAt, eventoAtual.startAt) : t.registrationClosesAt;
            const timerId = `timer_${i}_${Date.now()}`, dEnc = regCloseEfetivo ? new Date(regCloseEfetivo*1000) : null, inscritos = t.numAttendees ?? 0;
            const rawSlug = (t.owner?.slug||'').replace('user/',''), toName = t.owner?.player?.gamerTag || (!/^[0-9A-F]{6,}$/i.test(rawSlug) && rawSlug ? rawSlug : (t.owner?.name || 'Desconhecido'));
            const banner = t.images?.find(img => img.type==='banner')?.url || t.images?.[0]?.url || '';
            let streamHTML = ""; const isLiveNow = t.streamQueue && t.streamQueue.some(q => q.sets && q.sets.some(s => s.state===2 || s.state==='ACTIVE'));
            if (t.streams && t.streams.length > 0) { const hasTwitch = t.streams.some(s => s.streamSource==='TWITCH'), hasYT = t.streams.some(s => s.streamSource==='YOUTUBE'); streamHTML = `<div style="position:absolute;bottom:8px;right:10px;display:flex;align-items:center;gap:6px;background:rgba(0,0,0,0.7);padding:3px 8px;border-radius:4px;border:1px solid ${isLiveNow?'#dc2626':'rgba(255,255,255,0.1)'}">${isLiveNow?'<span class="animate-pulse flex h-2 w-2 rounded-full bg-red-500 mr-1"></span><span class="text-[9px] font-black text-red-500 uppercase mr-2 tracking-tighter">LIVE</span>':'<span class="text-[9px] font-black text-white uppercase tracking-tighter">Stream:</span>'}${hasTwitch?'<i class="fa-brands fa-twitch text-[#a970ff] text-xs"></i>':''}${hasYT?'<i class="fa-brands fa-youtube text-[#ff0000] text-xs"></i>':''}</div>`; }
            
            let bracketBadgeHTML = '';
            const firstSet = t.streamQueue?.[0]?.sets?.[0];
            if (firstSet && firstSet.fullRoundText) {
                const phaseName = firstSet.phaseGroup?.phase?.name || '';
                const roundText = firstSet.fullRoundText;
                const displayText = phaseName ? `${phaseName} — ${roundText}` : roundText;
                const setState = firstSet.state;
                if (setState === 'ACTIVE' || setState === 2) {
                    bracketBadgeHTML = `<div class="bracket-live-badge">🔴 ${displayText}</div>`;
                } else if (setState === 'CALLED') {
                    bracketBadgeHTML = `<div class="bracket-upcoming-badge">⏳ EM BREVE: ${displayText}</div>`;
                }
            }

            const ligasInfo = verificarLigaDeTorneio(t.url);
            const ligaBadgeHTML = ligasInfo.map(liga =>
                `<div class="league-badge"><i class="fa-solid fa-trophy" style="font-size:8px;color:#a855f7;"></i>&nbsp;${liga.label}</div>`
            ).join('');
            const rankingBtnHTML = ligasInfo.map(liga =>
                `<button onclick="abrirRanking('${liga.slug}','${liga.label.replace(/'/g,"\\'")}','${liga.rankingUrl}')" class="btn-ranking w-full">
                    <i class="fa-solid fa-ranking-star"></i> RANKING${ligasInfo.length > 1 ? `: ${liga.label}` : ''}
                </button>`
            ).join('');

            let eventsListHTML = '';
            if (t.events && t.events.length > 1) {
                const eventLinks = t.events.map(ev => `<a href="https://start.gg/${ev.slug}" target="_blank" onclick="event.stopPropagation();" class="block text-[11px] font-bold text-slate-300 hover:text-red-400 transition py-1 border-b border-white/5 last:border-0">${ev.name}</a>`).join('');
                eventsListHTML = `<div class="mt-2 pt-2 border-t border-white/10"><p class="text-[10px] font-black text-slate-500 uppercase mb-1">Eventos</p>${eventLinks}</div>`;
            }

            const card = document.createElement("div"); card.className = "glass-card rounded-xl flex flex-col justify-between overflow-hidden";
            let encHTML = dEnc ? `<div class="mt-1"><p class="text-[10px] text-slate-400 font-bold uppercase italic">Inscrições encerram em: ${dEnc.toLocaleDateString('pt-BR')} às ${dEnc.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</p><p id="${timerId}" class="text-[10px] timer-red uppercase italic">Calculando...</p></div>` : "";
            card.innerHTML = `<div style="position:relative;height:130px;overflow:hidden;background:#111;">${banner?`<img src="${banner}" alt="Banner do torneio ${t.name.replace(/"/g,'&quot;')}" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'">`:''}<div style="position:absolute;inset:0;background:linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(20,20,24,0.9) 100%);"></div><div style="position:absolute;top:10px;left:10px;right:10px;display:flex;justify-content:space-between;align-items:center;"><span class="text-[10px] bg-red-900 text-red-100 px-2 py-1 rounded font-bold uppercase tracking-wider">${typeVal}</span><span class="text-xs text-white font-bold" style="text-shadow:0 1px 4px rgba(0,0,0,0.8)">${new Date(dataEventoProximo*1000).toLocaleDateString('pt-BR')}</span></div><button type="button" class="attendees-icon-left" onclick="event.stopPropagation();abrirAttendees('${t.url}')" aria-label="Ver inscritos deste torneio"><i class="fa-solid fa-users text-xs" aria-hidden="true"></i></button>${streamHTML}</div><div class="p-5 flex flex-col flex-1">${bracketBadgeHTML}${ligaBadgeHTML}<h3 class="font-bold text-lg text-white mb-2 leading-tight">${t.name}</h3><p class="text-[11px] font-black uppercase ${t.isRegistrationOpen?'text-green-500':'text-red-500'}">${t.isRegistrationOpen?'Inscrição Aberta':'Inscrição Fechada'}</p><div class="flex flex-col gap-1 mt-2"><p class="text-[11px] font-bold text-slate-400 uppercase"><i class="fas fa-users"></i> ${inscritos} inscrito${inscritos!==1?'s':''}</p><p class="text-[11px] font-bold text-slate-400 uppercase"><i class="fas fa-crown"></i> TO: ${toName}</p></div>${encHTML}${eventsListHTML}<p class="text-sm text-slate-400 mt-3 italic">${t.addrState?`<i class="fas fa-map-marker-alt"></i> ${t.addrState}`:`<i class="fas fa-globe"></i> ${t.owner?.location?.country||'Online'}`}</p><div class="mt-4 space-y-2">${rankingBtnHTML}<a href="https://start.gg${t.url}" target="_blank" class="block text-center bg-red-700 hover:bg-red-600 text-white font-black py-3 rounded-lg uppercase text-sm tracking-tighter transition shadow-sm">Página do Torneio</a><a href="${gerarLinkGoogleCalendar(t)}" target="_blank" class="block text-center btn-calendar text-slate-300 font-bold py-2 rounded-lg transition uppercase text-[10px] tracking-wider"><i class="fa-solid fa-calendar-plus mr-1"></i> Add ao Google Calendar</a><a href="javascript:void(0)" onclick="event.stopPropagation();abrirBracket('${t.url}')" class="btn-bracket"><i class="fa-solid fa-sitemap mr-1"></i> BRACKET</a></div></div>`;
            container.appendChild(card);
            const checkInData = eventoAtual ? { checkInEnabled: eventoAtual.checkInEnabled, checkInDuration: eventoAtual.checkInDuration, checkInBuffer: eventoAtual.checkInBuffer } : null;
            const eventState = eventoAtual?.state || null;
            if (regCloseEfetivo || (checkInData && checkInData.checkInEnabled)) {
                iniciarTimer(timerId, regCloseEfetivo, checkInData, eventoAtual?.startAt || t.startAt, eventState);
            }
        });
    } catch (e) { status.classList.add("hidden"); }
}

document.getElementById('campo_tipo').addEventListener('change', function(e) { document.getElementById('campo_local').innerHTML = e.target.value === 'offline' ? `<option value="BR">Brasil</option><option value="US">Estados Unidos</option>` : `<option value="south-america">América do Sul</option><option value="worldwide">Mundo Inteiro</option>`; });

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { fecharAttendees(); fecharRanking(); fecharBracket(); } });
carregarJogos(); carregarTorneiosDasLigas();