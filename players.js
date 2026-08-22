// ==================== CONFIG DA DATABASE DE PLAYERS ====================
const PLAYERS_CACHE_URL = 'https://raw.githubusercontent.com/Rickudosennin/FGCTESTE/main/data/players-cache.json';
const GITHUB_REPO = 'Rickudosennin/FGCTESTE';
// Token de acesso pessoal (fine-grained) com escopo ÚNICO E EXCLUSIVO de "Issues: write" neste repositório.
// NUNCA usar aqui um token com permissão de escrita em Contents/Actions/Admin — este token fica visível
// para qualquer visitante do site (é client-side), então o escopo precisa ser o mínimo possível.
// Como gerar: GitHub > Settings > Developer settings > Fine-grained tokens > New token
//   Repository access: Only select repositories > fgchub
//   Permissions: Issues = Read and write (todas as outras em "No access")
const GITHUB_ISSUES_TOKEN = 'COLOQUE_AQUI_SEU_TOKEN_FINE_GRAINED_ISSUES_WRITE';
const CACHE_MAX_IDADE_HORAS = 24; // acima disso, refaz busca ao vivo mesmo se já estiver em cache

// ==================== LEITURA DO CACHE ====================
let _playersCacheData = null;
async function _lerPlayersCache() {
    if (_playersCacheData) return _playersCacheData;
    try {
        const resp = await fetch(PLAYERS_CACHE_URL + '?t=' + Date.now()); // evita cache do CDN do raw.githubusercontent
        const json = await resp.json();
        _playersCacheData = json.players || {};
    } catch (e) { _playersCacheData = {}; }
    return _playersCacheData;
}

function _cacheEstaFresco(entry) {
    if (!entry || !entry.updatedAt) return false;
    const idadeHoras = (Date.now() - new Date(entry.updatedAt).getTime()) / 36e5;
    return idadeHoras < CACHE_MAX_IDADE_HORAS;
}

// ==================== BUSCA AO VIVO (fallback quando não está em cache) ====================
async function _buscarPlayerAoVivo(playerId, gamerTag) {
    const query1 = `query PlayerHistory($id: ID!) { player(id: $id) { recentStandings(limit: 10) { placement container { ... on Event { id name tournament { name numAttendees } } } } } }`;
    const json1 = await callStartGG(query1, { id: playerId });
    const standings = json1.data?.player?.recentStandings || [];

    let totalWins = 0, totalLosses = 0; const torneiosData = [];
    for (const standing of standings) {
        const eventId = standing.container?.id;
        const tournamentName = standing.container?.tournament?.name || 'Torneio';
        if (!eventId) continue;
        const resultado = await buscarSetsDoEvento(eventId, playerId);
        if (resultado.total > 0 && !resultado.error) { totalWins += resultado.wins; totalLosses += resultado.losses; }
        torneiosData.push({ name: tournamentName, wins: resultado.wins, losses: resultado.losses, placement: standing.placement, attendees: standing.container?.tournament?.numAttendees || '?', sets: resultado.sets || [] });
    }

    const todosSets = torneiosData.flatMap(t => t.sets || []);
    const reports = await buscarReportsChar();
    const statsChar = {};
    todosSets.forEach(s => {
        const rep = reports.find(r => String(r.setId) === String(s.setId) && String(r.playerId) === String(playerId));
        if (!rep) return;
        if (!statsChar[rep.character]) statsChar[rep.character] = { wins: 0, losses: 0 };
        s.venceu ? statsChar[rep.character].wins++ : statsChar[rep.character].losses++;
    });

    const totalPartidas = totalWins + totalLosses;
    return {
        gamerTag,
        wins: totalWins,
        losses: totalLosses,
        winrate: totalPartidas > 0 ? Math.round((totalWins / totalPartidas) * 100) : 0,
        tournaments: torneiosData.map(t => ({ name: t.name, wins: t.wins, losses: t.losses, placement: t.placement, attendees: t.attendees })),
        characters: statsChar,
        updatedAt: new Date().toISOString()
    };
}

// ==================== PERSISTÊNCIA (abre Issue, GitHub Action commita depois) ====================
async function _persistirNoCache(playerId, dados) {
    if (!GITHUB_ISSUES_TOKEN || GITHUB_ISSUES_TOKEN.startsWith('COLOQUE_AQUI')) return; // token não configurado ainda, não tenta
    try {
        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GITHUB_ISSUES_TOKEN}`, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: `[cache] player ${playerId}`,
                body: '```json\n' + JSON.stringify({ playerId, dados }) + '\n```',
                labels: ['player-cache-update']
            })
        });
    } catch (e) { /* falha silenciosa: pior caso, só não persiste dessa vez */ }
}

// ==================== FUNÇÃO PRINCIPAL: cache primeiro, senão busca ao vivo e salva ====================
async function obterDadosPlayer(playerId, gamerTag) {
    const cache = await _lerPlayersCache();
    const entry = cache[playerId];
    if (_cacheEstaFresco(entry)) {
        return { dados: entry, fonte: 'cache' };
    }
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag);
    _persistirNoCache(playerId, dados); // não bloqueia a renderização, roda em paralelo
    return { dados, fonte: 'live' };
}

// ==================== BUSCA DE PLAYERS (para a tela de busca) ====================
// Como o Start.gg não tem uma busca global por gamertag, a lista de sugestões vem
// dos rankings das ligas que o FGC HUB já monitora (LIGAS_MONITORADAS em script.js).
let _listaPlayersConhecidos = null;
async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) return _listaPlayersConhecidos;
    const query = `query LeagueStandings($slug: String) { league(slug: $slug) { standings(query: { page: 1, perPage: 40 }) { nodes { placement entrant { name participants { player { id } } } } } } }`;
    const resultados = await Promise.all(LIGAS_MONITORADAS.map(liga =>
        callStartGG(query, { slug: liga.slug }).then(json => json.data?.league?.standings?.nodes || []).catch(() => [])
    ));
    const mapa = new Map();
    resultados.flat().forEach(node => {
        const playerId = node.entrant?.participants?.[0]?.player?.id;
        const gamerTag = node.entrant?.name;
        if (playerId && gamerTag && !mapa.has(playerId)) mapa.set(playerId, { playerId, gamerTag, placement: node.placement });
    });
    _listaPlayersConhecidos = Array.from(mapa.values());
    return _listaPlayersConhecidos;
}

function filtrarPlayers(lista, termo) {
    const t = termo.trim().toLowerCase();
    if (!t) return lista.slice(0, 15);
    return lista.filter(p => p.gamerTag.toLowerCase().includes(t)).slice(0, 15);
}
