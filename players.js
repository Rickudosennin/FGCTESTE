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

// ==================== PROCESSAMENTO ====================
function processarDadosPlayer(standings, setsPorEvento, gamerTag, prefix = '') {
    const seisMesesAtras = Date.now() - 180 * 24 * 60 * 60 * 1000;

    let totalWins = 0, totalLosses = 0;
    let wins6m = 0, losses6m = 0;
    const torneios = [];
    const colocacoes = [];
    const h2h = {};

    standings.forEach(s => {
        const eventId = s.container?.id;
        const startAt = s.container?.startAt;
        const resultado = setsPorEvento[eventId] || { wins: 0, losses: 0 };

        totalWins += resultado.wins;
        totalLosses += resultado.losses;

        (resultado.sets || []).forEach(set => {
            if (!set.opponentId) return;
            const key = String(set.opponentId);
            if (!h2h[key]) h2h[key] = { opponentId: set.opponentId, opponentTag: set.opponentTag || 'Desconhecido', wins: 0, losses: 0, matches: [] };
            if (set.venceu) h2h[key].wins++; else h2h[key].losses++;
            if (set.opponentTag) h2h[key].opponentTag = set.opponentTag;
            h2h[key].matches.push({
                venceu: set.venceu,
                round: set.round || '',
                myScore: (typeof set.myScore === 'number') ? set.myScore : null,
                oppScore: (typeof set.oppScore === 'number') ? set.oppScore : null,
                tournamentName: s.container?.tournament?.name || '—',
                eventName: s.container?.name || '—',
                date: startAt ? new Date(startAt * 1000).toLocaleDateString('pt-BR') : '—',
                startAt: startAt || 0
            });
        });

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
            isRecent
        });

        if (s.placement) colocacoes.push(s.placement);
    });

    torneios.sort((a, b) => b.startAt - a.startAt);

    const headToHead = Object.values(h2h)
        .map(r => {
            const total = r.wins + r.losses;
            const matches = [...(r.matches || [])].sort((a, b) => b.startAt - a.startAt).slice(0, 15);
            return { ...r, total, winrate: total > 0 ? Math.round((r.wins / total) * 100) : 0, matches };
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const colocacoesOrdenadas = torneios
        .filter(t => t.placement && t.placement !== '?')
        .map(t => ({ placement: t.placement, icon: t.icon }));

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
        recentForm: colocacoesOrdenadas.slice(0, 10),
        highlights,
        headToHead,
        tournaments: torneios,
        updatedAt: new Date().toISOString()
    };
}

// ==================== BUSCA AO VIVO ====================
async function _buscarPlayerAoVivo(playerId, gamerTag, prefix = '') {
    const query1 = `query PlayerHistory($id: ID!) {
        player(id: $id) {
            user {
                id
                slug
                name
                authorizations {
                    type
                    externalUsername
                }
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
    const user = json1.data?.player?.user;
    const standings = json1.data?.player?.recentStandings || [];
    const images = user?.images || [];
    const authorizations = user?.authorizations || [];
    const avatarUrl = images.find(img => (img.type || '').toLowerCase() === 'profile')?.url || null;
    const bannerUrl = images.find(img => (img.type || '').toLowerCase() === 'banner')?.url || null;
    const realName = user?.name || null;
    const userSlug = user?.slug || null;

    const twitchAuth = authorizations.find(a => (a.type || '').toUpperCase() === 'TWITCH');
    const twitterAuth = authorizations.find(a => (a.type || '').toUpperCase() === 'TWITTER' || (a.type || '').toUpperCase() === 'X');
    const discordAuth = authorizations.find(a => (a.type || '').toUpperCase() === 'DISCORD');

    const setsPorEvento = {};
    for (const standing of standings) {
        const eventId = standing.container?.id;
        if (!eventId) continue;
        const resultado = await buscarSetsDoEvento(eventId, playerId);
        setsPorEvento[eventId] = resultado;
    }

    const dados = processarDadosPlayer(standings, setsPorEvento, gamerTag, prefix);
    dados.avatarUrl = avatarUrl;
    dados.bannerUrl = bannerUrl;
    dados.realName = realName;
    dados.userSlug = userSlug;
    dados.social = {
        twitch: twitchAuth ? twitchAuth.externalUsername : null,
        twitter: twitterAuth ? twitterAuth.externalUsername : null,
        discord: discordAuth ? discordAuth.externalUsername : null
    };
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