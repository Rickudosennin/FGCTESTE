// ==================== CONFIG ====================
const GITHUB_ISSUES_TOKEN = ''; // Deixe vazio
const CACHE_MAX_IDADE_HORAS = 24;

// ==================== LISTA LOCAL DE PLAYERS (localStorage) ====================
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';
const PROFILE_CACHE_PREFIX = 'fgchub_profile_';

function _salvarPlayerLocal(playerId, gamerTag, prefix = '') {
    try {
        const lista = JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');
        if (!lista.some(p => p.playerId === playerId)) {
            lista.push({ playerId, gamerTag, prefix });
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

// ==================== CACHE DE PERFIL NO LOCALSTORAGE ====================
function _salvarPerfilCache(playerId, dados) {
    try {
        const cacheKey = PROFILE_CACHE_PREFIX + playerId;
        const cacheData = {
            dados: dados,
            timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (e) {}
}

function _lerPerfilCache(playerId) {
    try {
        const cacheKey = PROFILE_CACHE_PREFIX + playerId;
        const raw = localStorage.getItem(cacheKey);
        if (!raw) return null;
        const cacheData = JSON.parse(raw);
        const idade = (Date.now() - cacheData.timestamp) / 3600000;
        if (idade < CACHE_MAX_IDADE_HORAS) {
            return cacheData.dados;
        }
        return null;
    } catch (e) { return null; }
}

// ==================== BUSCAR SETS COM PERSONAGENS ====================
async function buscarSetsComPersonagens(eventId, playerId) {
    try {
        const query = `query EventSetsWithChars($eventId: ID!) {
            event(id: $eventId) {
                sets(perPage: 100, filters: {hideEmpty: true}) {
                    nodes {
                        id
                        fullRoundText
                        winnerId
                        slots {
                            entrant {
                                id
                                participants {
                                    player { id }
                                }
                            }
                        }
                        games {
                            selections {
                                characterId
                                entrantId
                            }
                        }
                    }
                }
            }
        }`;
        const json = await callStartGG(query, { eventId });
        const sets = json.data?.event?.sets?.nodes || [];
        const result = [];

        sets.forEach(set => {
            // Encontra o slot do player
            const playerSlot = set.slots?.find(slot => 
                slot.entrant?.participants?.some(p => p.player?.id == playerId)
            );
            if (!playerSlot || !playerSlot.entrant) return;

            const myEntrantId = playerSlot.entrant.id;
            const isWinner = set.winnerId && String(set.winnerId) === String(myEntrantId);

            // Extrai o characterId do player dos games
            let characterId = null;
            if (set.games && set.games.length > 0) {
                // Pega a primeira selection do player no primeiro game
                const game = set.games[0];
                if (game && game.selections) {
                    const mySelection = game.selections.find(sel => String(sel.entrantId) === String(myEntrantId));
                    if (mySelection) {
                        characterId = mySelection.characterId;
                    }
                }
            }

            result.push({
                setId: set.id,
                fullRoundText: set.fullRoundText || '—',
                venceu: isWinner,
                characterId: characterId,
                opponentName: null // podemos buscar depois se quiser
            });
        });

        return result;
    } catch (e) {
        console.warn('Erro ao buscar sets com personagens:', e);
        return [];
    }
}

// ==================== PROCESSAMENTO ====================
function processarDadosPlayer(standings, setsPorEvento, setsComCharsPorEvento, gamerTag, prefix = '') {
    const seisMesesAtras = Date.now() - 180 * 24 * 60 * 60 * 1000;

    let totalWins = 0, totalLosses = 0;
    let wins6m = 0, losses6m = 0;
    const torneios = [];
    const colocacoes = [];
    const todosSets = [];

    standings.forEach(s => {
        const eventId = s.container?.id;
        const startAt = s.container?.startAt;
        const resultado = setsPorEvento[eventId] || { wins: 0, losses: 0 };
        const setsChar = setsComCharsPorEvento[eventId] || [];

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

        const tournamentImages = s.container?.tournament?.images || [];
        const tournamentIcon = tournamentImages.find(img => (img.type || '').toLowerCase() === 'profile')?.url || null;

        torneios.push({
            name: s.container?.tournament?.name || '—',
            eventName: s.container?.name || '—',
            placement: s.placement || '?',
            attendees: s.container?.tournament?.numAttendees || '?',
            wins: resultado.wins,
            losses: resultado.losses,
            winrate,
            date: startAt ? new Date(startAt * 1000).toLocaleDateString('pt-BR') : '—',
            startAt: startAt || 0,
            icon: tournamentIcon,
            isRecent,
            sets: setsChar // adiciona os sets com personagens
        });

        // Adiciona os sets à lista global
        setsChar.forEach(set => {
            todosSets.push({
                ...set,
                eventName: s.container?.name || '—',
                tournamentName: s.container?.tournament?.name || '—',
                date: startAt ? new Date(startAt * 1000).toLocaleDateString('pt-BR') : '—'
            });
        });

        if (s.placement) colocacoes.push(s.placement);
    });

    // Ordena os sets por data (mais recentes primeiro)
    todosSets.sort((a, b) => {
        const dateA = new Date(a.date.split('/').reverse().join('/'));
        const dateB = new Date(b.date.split('/').reverse().join('/'));
        return dateB - dateA;
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
        playerPrefix: prefix || '',
        totalWins,
        totalLosses,
        winrateAllTime: totalPartidas > 0 ? Math.round((totalWins / totalPartidas) * 100) : 0,
        winrateLast6Months: total6m > 0 ? Math.round((wins6m / total6m) * 100) : 0,
        wins6m,
        losses6m,
        recentForm: colocacoes.slice(0, 10),
        highlights,
        tournaments: torneios,
        recentSets: todosSets.slice(0, 20), // últimos 20 sets com personagem
        updatedAt: new Date().toISOString()
    };
}

// ==================== BUSCA AO VIVO ====================
async function _buscarPlayerAoVivo(playerId, gamerTag, prefix = '') {
    const query1 = `query PlayerHistory($id: ID!) {
        player(id: $id) {
            user {
                images {
                    id
                    type
                    url
                }
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
                            images {
                                type
                                url
                            }
                        }
                    }
                }
            }
        }
    }`;
    const json1 = await callStartGG(query1, { id: playerId });
    const standings = json1.data?.player?.recentStandings || [];
    const images = json1.data?.player?.user?.images || [];
    const avatarUrl = images.find(img => (img.type || '').toLowerCase() === 'profile')?.url || null;
    const bannerUrl = images.find(img => (img.type || '').toLowerCase() === 'banner')?.url || null;

    const setsPorEvento = {};
    const setsComCharsPorEvento = {};

    for (const standing of standings) {
        const eventId = standing.container?.id;
        if (!eventId) continue;

        // Busca sets básicos (wins/losses)
        const resultado = await buscarSetsDoEvento(eventId, playerId);
        setsPorEvento[eventId] = resultado;

        // Busca sets com personagens
        const setsChar = await buscarSetsComPersonagens(eventId, playerId);
        setsComCharsPorEvento[eventId] = setsChar;
    }

    const dados = processarDadosPlayer(standings, setsPorEvento, setsComCharsPorEvento, gamerTag, prefix);
    dados.avatarUrl = avatarUrl;
    dados.bannerUrl = bannerUrl;
    return dados;
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function obterDadosPlayer(playerId, gamerTag, forceRefresh = false, prefix = '') {
    if (!forceRefresh) {
        const cacheData = _lerPerfilCache(playerId);
        if (cacheData) {
            if (prefix && !cacheData.playerPrefix) {
                cacheData.playerPrefix = prefix;
            }
            return { dados: cacheData, fonte: 'cache' };
        }
    }
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag, prefix);
    _salvarPerfilCache(playerId, dados);
    _salvarPlayerLocal(playerId, gamerTag, prefix);
    return { dados, fonte: 'live' };
}

// ==================== BUSCA DE PLAYERS (apenas localStorage) ====================
let _listaPlayersConhecidos = null;
async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) return _listaPlayersConhecidos;

    const locais = _carregarPlayersLocal();
    const mapa = new Map();
    locais.forEach(p => {
        const id = String(p.playerId);
        if (!mapa.has(id)) {
            mapa.set(id, { 
                playerId: id, 
                gamerTag: p.gamerTag, 
                prefix: p.prefix || '',
                placement: null 
            });
        }
    });
    _listaPlayersConhecidos = Array.from(mapa.values());
    return _listaPlayersConhecidos;
}

function filtrarPlayers(lista, termo) {
    const t = termo.trim().toLowerCase();
    if (!t) return [];
    const filtrados = lista.filter(p => p.gamerTag.toLowerCase().includes(t));
    return filtrados.slice(0, 15);
}