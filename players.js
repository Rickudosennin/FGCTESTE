// ==================== CONFIG ====================
const PLAYERS_CACHE_URL = 'https://raw.githubusercontent.com/Rickudosennin/FGCTESTE/main/data/players-cache.json';
const GITHUB_REPO = 'Rickudosennin/FGCTESTE';
const GITHUB_ISSUES_TOKEN = '';
const CACHE_MAX_IDADE_HORAS = 24;

// ==================== LISTA LOCAL DE PLAYERS (localStorage) ====================
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';

function _salvarPlayerLocal(playerId, gamerTag) {
    try {
        const lista = JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');
        if (!lista.some(p => p.playerId === playerId)) {
            lista.push({ playerId, gamerTag });
            localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(lista));
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
function processarDadosPlayer(standings, setsPorEvento, gamerTag, userData) {
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
        user: {
            name: userData?.name || '',
            bio: userData?.bio || '',
            location: userData?.location || {},
            avatarUrl: userData?.avatarUrl || '',
            genderPronoun: userData?.genderPronoun || '',
        },
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
    console.log('🔍 Buscando player:', playerId, gamerTag);
    
    const query1 = `query PlayerHistory($id: ID!) {
        player(id: $id) {
            gamerTag
            user {
                id
                name
                bio
                avatarUrl
                location {
                    country
                    city
                    state
                }
                genderPronoun
            }
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
    
    let json1, standings = [], userData = {};
    let playerData = null;
    
    try {
        json1 = await callStartGG(query1, { id: playerId });
        console.log('📦 Resposta da API:', json1);
        
        playerData = json1.data?.player;
        standings = playerData?.recentStandings || [];
        userData = playerData?.user || {};
        
        if (!playerData) {
            console.warn('⚠️ Player não encontrado na API.');
            // Retorna dados vazios com indicação de erro
            return {
                gamerTag: gamerTag || 'Player',
                user: { name: '', bio: '', location: {}, avatarUrl: '' },
                totalWins: 0,
                totalLosses: 0,
                winrateAllTime: 0,
                winrateLast6Months: 0,
                wins6m: 0,
                losses6m: 0,
                recentForm: [],
                highlights: [],
                tournaments: [],
                updatedAt: new Date().toISOString(),
                _error: 'player_not_found'
            };
        }
    } catch (e) {
        console.error('❌ Erro na requisição:', e);
        return {
            gamerTag: gamerTag || 'Player',
            user: { name: '', bio: '', location: {}, avatarUrl: '' },
            totalWins: 0,
            totalLosses: 0,
            winrateAllTime: 0,
            winrateLast6Months: 0,
            wins6m: 0,
            losses6m: 0,
            recentForm: [],
            highlights: [],
            tournaments: [],
            updatedAt: new Date().toISOString(),
            _error: 'api_error'
        };
    }

    console.log('📊 Standings encontrados:', standings.length);

    const setsPorEvento = {};
    for (const standing of standings) {
        const eventId = standing.container?.id;
        if (!eventId) continue;
        try {
            const resultado = await buscarSetsDoEvento(eventId, playerId);
            setsPorEvento[eventId] = resultado;
        } catch (e) {
            console.warn('⚠️ Erro ao buscar sets do evento', eventId, e);
            setsPorEvento[eventId] = { wins: 0, losses: 0, sets: [] };
        }
    }

    const dados = processarDadosPlayer(standings, setsPorEvento, playerData?.gamerTag || gamerTag, userData);
    console.log('✅ Dados processados:', dados);
    return dados;
}

// ==================== PERSISTÊNCIA ====================
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
    // Tenta cache
    try {
        const cache = await _lerPlayersCache();
        const entry = cache[playerId];
        if (_cacheEstaFresco(entry)) {
            console.log('⚡ Usando cache para:', playerId);
            return { dados: entry, fonte: 'cache' };
        }
    } catch (e) {}

    // Busca ao vivo
    console.log('🌐 Buscando ao vivo:', playerId);
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag);
    
    // Se o player foi encontrado, salva no cache local
    if (dados && !dados._error) {
        _salvarPlayerLocal(playerId, gamerTag);
        _persistirNoCache(playerId, dados);
    }
    
    return { dados, fonte: 'live' };
}

// ==================== BUSCA DE PLAYERS (COM TIMEOUT E FALLBACK) ====================
let _listaPlayersConhecidos = null;

async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) return _listaPlayersConhecidos;

    const mapa = new Map();

    // 1. Tenta carregar das ligas, mas com timeout de 5 segundos
    if (typeof LIGAS_MONITORADAS !== 'undefined' && LIGAS_MONITORADAS.length > 0) {
        try {
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
            
            const fetchPromise = Promise.all(LIGAS_MONITORADAS.map(liga =>
                callStartGG(query, { slug: liga.slug }).then(json => json.data?.league?.standings?.nodes || []).catch(() => [])
            ));
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout ao buscar ligas')), 5000)
            );
            
            const resultados = await Promise.race([fetchPromise, timeoutPromise]);
            
            resultados.flat().forEach(node => {
                const playerId = node.entrant?.participants?.[0]?.player?.id;
                const gamerTag = node.entrant?.name;
                if (playerId && gamerTag && !mapa.has(playerId)) {
                    mapa.set(playerId, { playerId, gamerTag, placement: node.placement });
                }
            });
        } catch (e) {
            console.warn('Erro/timeout ao buscar ligas, usando apenas localStorage:', e);
        }
    }

    // 2. SEMPRE adiciona os players do localStorage (fallback principal)
    const locais = _carregarPlayersLocal();
    locais.forEach(p => {
        if (!mapa.has(p.playerId)) {
            mapa.set(p.playerId, { playerId: p.playerId, gamerTag: p.gamerTag, placement: null });
        }
    });

    _listaPlayersConhecidos = Array.from(mapa.values());
    return _listaPlayersConhecidos;
}

function filtrarPlayers(lista, termo) {
    const t = termo.trim().toLowerCase();
    if (!t) return lista.slice(0, 15);
    const filtrados = lista.filter(p => p.gamerTag.toLowerCase().includes(t));
    return filtrados.slice(0, 15);
}