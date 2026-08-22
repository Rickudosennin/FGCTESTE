// ==================== CONFIG ====================
const PLAYERS_CACHE_URL = 'https://raw.githubusercontent.com/Rickudosennin/FGCTESTE/main/data/players-cache.json';
const GITHUB_REPO = 'Rickudosennin/FGCTESTE';
const GITHUB_ISSUES_TOKEN = ''; // Deixe vazio se não quiser usar Issues
const CACHE_MAX_IDADE_HORAS = 24;

// ==================== LISTA LOCAL DE PLAYERS (localStorage) ====================
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';

function _salvarPlayerLocal(playerId, gamerTag) {
    try {
        const lista = JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');
        if (!lista.some(p => p.playerId === playerId)) {
            lista.push({ playerId, gamerTag });
            localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(lista));
            // Atualiza o contador visual se existir
            const contador = document.getElementById('contador_salvos');
            if (contador) contador.textContent = lista.length;
        }
    } catch (e) {}
}

function _carregarPlayersLocal() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');
    } catch (e) { return []; }
}

// ==================== LEITURA DO CACHE DO GITHUB ====================
let _playersCacheData = null;
async function _lerPlayersCache() {
    if (_playersCacheData) return _playersCacheData;
    try {
        const resp = await fetch(PLAYERS_CACHE_URL + '?t=' + Date.now());
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

// ==================== PROCESSAMENTO ====================
function processarDadosPlayer(standings, setsPorEvento, gamerTag) {
    const seisMesesAtras = Date.now() - 180 * 24 * 60 * 60 * 1000;

    let totalWins = 0, totalLosses = 0;
    let wins6m = 0, losses6m = 0;
    const torneios = [];
    const colocacoes = [];

    standings.forEach(s => {
        const eventId = s.container?.id;
        const startAt = s.container?.startAt;
        const resultado = setsPorEvento[eventId] || { wins: 0, losses: 0 };

        totalWins += resultado.wins;
        totalLosses += resultado.losses;

        const isRecent = startAt && (startAt * 1000) > seisMesesAtras;
        if (isRecent) {
            wins6m += resultado.wins;
            losses6m += resultado.losses;
        }

        const winrate = (resultado.wins + resultado.losses) > 0 
            ? Math.round((resultado.wins / (resultado.wins + resultado.losses)) * 100) 
            : 0;

        torneios.push({
            name: s.container?.tournament?.name || '—',
            eventName: s.container?.name || '—',
            placement: s.placement || '?',
            attendees: s.container?.tournament?.numAttendees || '?',
            wins: resultado.wins,
            losses: resultado.losses,
            winrate,
            date: startAt ? new Date(startAt * 1000).toLocaleDateString('pt-BR') : '—',
            isRecent
        });

        if (s.placement) colocacoes.push(s.placement);
    });

    const totalPartidas = totalWins + totalLosses;
    const total6m = wins6m + losses6m;

    const highlights = [...torneios]
        .filter(t => t.placement && t.placement > 0 && t.attendees !== '?')
        .sort((a, b) => a.placement - b.placement)
        .slice(0, 8)
        .map(t => ({
            placement: `${t.placement}º/${t.attendees}`,
            eventName: t.eventName,
            date: t.date
        }));

    return {
        gamerTag,
        totalWins,
        totalLosses,
        winrateAllTime: totalPartidas > 0 ? Math.round((totalWins / totalPartidas) * 100) : 0,
        winrateLast6Months: total6m > 0 ? Math.round((wins6m / total6m) * 100) : 0,
        wins6m,
        losses6m,
        recentForm: colocacoes.slice(0, 10),
        highlights,
        tournaments: torneios,
        updatedAt: new Date().toISOString()
    };
}

// ==================== BUSCA AO VIVO ====================
async function _buscarPlayerAoVivo(playerId, gamerTag) {
    const query1 = `query PlayerHistory($id: ID!) {
        player(id: $id) {
            recentStandings(limit: 15) {
                placement
                container {
                    ... on Event {
                        id
                        name
                        startAt
                        tournament {
                            name
                            numAttendees
                        }
                    }
                }
            }
        }
    }`;
    const json1 = await callStartGG(query1, { id: playerId });
    const standings = json1.data?.player?.recentStandings || [];

    const setsPorEvento = {};
    for (const standing of standings) {
        const eventId = standing.container?.id;
        if (!eventId) continue;
        const resultado = await buscarSetsDoEvento(eventId, playerId);
        setsPorEvento[eventId] = resultado;
    }

    return processarDadosPlayer(standings, setsPorEvento, gamerTag);
}

// ==================== PERSISTÊNCIA NO GITHUB (OPCIONAL) ====================
async function _persistirNoCache(playerId, dados) {
    if (!GITHUB_ISSUES_TOKEN || GITHUB_ISSUES_TOKEN.startsWith('COLOQUE_AQUI')) return;
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
    } catch (e) { /* silencioso */ }
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function obterDadosPlayer(playerId, gamerTag) {
    const cache = await _lerPlayersCache();
    const entry = cache[playerId];
    if (_cacheEstaFresco(entry)) {
        return { dados: entry, fonte: 'cache' };
    }
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag);
    _salvarPlayerLocal(playerId, gamerTag);
    _persistirNoCache(playerId, dados);
    return { dados, fonte: 'live' };
}

// ==================== BUSCA DE PLAYERS (com localStorage) ====================
let _listaPlayersConhecidos = null;
async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) return _listaPlayersConhecidos;

    const mapa = new Map();

    // 1. Players das ligas monitoradas (LIGAS_MONITORADAS é definido no script.js)
    if (typeof LIGAS_MONITORADAS !== 'undefined') {
        const query = `query LeagueStandings($slug: String) {
            league(slug: $slug) {
                standings(query: { page: 1, perPage: 40 }) {
                    nodes {
                        placement
                        entrant {
                            name
                            participants {
                                player { id }
                            }
                        }
                    }
                }
            }
        }`;
        const resultados = await Promise.all(LIGAS_MONITORADAS.map(liga =>
            callStartGG(query, { slug: liga.slug }).then(json => json.data?.league?.standings?.nodes || []).catch(() => [])
        ));
        resultados.flat().forEach(node => {
            const playerId = node.entrant?.participants?.[0]?.player?.id;
            const gamerTag = node.entrant?.name;
            if (playerId && gamerTag && !mapa.has(playerId)) {
                mapa.set(playerId, { playerId, gamerTag, placement: node.placement });
            }
        });
    }

    // 2. Players salvos localmente (localStorage)
    const locais = _carregarPlayersLocal();
    locais.forEach(p => {
        if (!mapa.has(p.playerId)) {
            mapa.set(p.playerId, { playerId: p.playerId, gamerTag: p.gamerTag, placement: null });
        }
    });

    // Converte para array e garante que não haja duplicatas (o Map já garante)
    _listaPlayersConhecidos = Array.from(mapa.values());
    return _listaPlayersConhecidos;
}

function filtrarPlayers(lista, termo) {
    const t = termo.trim().toLowerCase();
    if (!t) return lista.slice(0, 15);
    // Filtra e retorna até 15 resultados
    const filtrados = lista.filter(p => p.gamerTag.toLowerCase().includes(t));
    return filtrados.slice(0, 15);
}