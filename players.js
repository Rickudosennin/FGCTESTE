// ==================== CONFIG ====================
const GITHUB_ISSUES_TOKEN = ''; // Deixe vazio
const CACHE_MAX_IDADE_HORAS = 24;

// ==================== LISTA LOCAL DE PLAYERS (localStorage) ====================
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';
const PROFILE_CACHE_PREFIX = 'fgchub_profile_';

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
    console.log('🔍 Buscando player ao vivo:', playerId, gamerTag);

    if (!playerId) {
        console.error('❌ playerId está vazio!');
        throw new Error('ID do player não fornecido');
    }

    // Verifica se callStartGG existe
    if (typeof callStartGG !== 'function') {
        console.error('❌ callStartGG não está definida! Verifique se o script.js foi carregado.');
        throw new Error('callStartGG não definida');
    }

    const query = `query PlayerData($id: ID!) {
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

    try {
        console.log('📤 Enviando requisição para API...');
        const json = await callStartGG(query, { id: playerId });
        console.log('📥 Resposta da API:', json);

        const playerData = json.data?.player;
        if (!playerData) {
            console.warn('⚠️ Player não encontrado na API.');
            throw new Error('Player não encontrado');
        }

        const standings = playerData.recentStandings || [];
        const userData = playerData.user || {};

        console.log(`📊 ${standings.length} torneios encontrados.`);

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

        const dados = processarDadosPlayer(standings, setsPorEvento, playerData.gamerTag || gamerTag, userData);
        console.log('✅ Dados processados com sucesso.');
        return dados;

    } catch (e) {
        console.error('❌ Erro em _buscarPlayerAoVivo:', e);
        throw e; // Re-lança para ser capturado no player.html
    }
}

// ==================== PERSISTÊNCIA ====================
async function _persistirNoCache(playerId, dados) {
    // Desabilitado - sem token
    return;
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function obterDadosPlayer(playerId, gamerTag, forceRefresh = false) {
    console.log('⚙️ obterDadosPlayer chamado com:', { playerId, gamerTag, forceRefresh });

    if (!playerId) {
        console.error('❌ playerId é obrigatório');
        throw new Error('ID do player não fornecido');
    }

    if (!forceRefresh) {
        const cacheData = _lerPerfilCache(playerId);
        if (cacheData) {
            console.log('⚡ Usando cache para:', playerId);
            return { dados: cacheData, fonte: 'cache' };
        }
    }

    console.log('🌐 Buscando dados ao vivo...');
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag);
    _salvarPerfilCache(playerId, dados);
    _salvarPlayerLocal(playerId, dados.gamerTag || gamerTag);
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
            mapa.set(id, { playerId: id, gamerTag: p.gamerTag, placement: null });
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