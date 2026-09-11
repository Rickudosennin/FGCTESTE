// ==================== CONFIG ====================
// Token fine-grained do GitHub, com permissão APENAS "Issues: Read and write"
// restrita a este repositório. Fica exposto no client — é um risco aceito
// (alguém pode spammar issues), mas não dá acesso a mais nada do repo.
const GITHUB_ISSUES_TOKEN = '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'; // preencher com o token fine-grained
const GITHUB_REPO = 'Rickudosennin/fgchub';
const CACHE_JSON_PATH = 'players-cache.json'; // servido estático, mesmo domínio

// ==================== LISTA LOCAL DE PLAYERS (localStorage) ====================
// Continua local apenas para a lista de "players conhecidos" da busca por
// gamertag (buscar.html) — não guarda mais os dados do perfil em si.
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';

// ==================== CACHE COMPARTILHADO (players-cache.json via Git) ====================
let _cacheCompartilhadoPromise = null;

function _carregarCacheCompartilhado() {
    if (!_cacheCompartilhadoPromise) {
        _cacheCompartilhadoPromise = fetch(CACHE_JSON_PATH, { cache: 'no-store' })
            .then(r => r.ok ? r.json() : { players: {} })
            .then(json => json && json.players ? json : { players: {} })
            .catch(() => ({ players: {} }));
    }
    return _cacheCompartilhadoPromise;
}

async function _lerPerfilCacheCompartilhado(playerId) {
    const cache = await _carregarCacheCompartilhado();
    return cache.players[String(playerId)] || null;
}

// Atualiza o cache em memória na hora (pra quem está navegando não esperar
// a Action rodar) e dispara a Issue que vai gerar o commit de verdade.
async function _salvarPerfilCacheCompartilhado(playerId, dados) {
    const cache = await _carregarCacheCompartilhado();
    cache.players[String(playerId)] = dados;

    if (!GITHUB_ISSUES_TOKEN) return; // sem token configurado, só fica em memória

    try {
        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_ISSUES_TOKEN}`,
                'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify({
                title: `[cache] atualizar player ${playerId}`,
                labels: ['player-cache-update'],
                body: '```json\n' + JSON.stringify({ playerId: String(playerId), dados }, null, 2) + '\n```'
            })
        });
    } catch (e) {
        // Falhou em abrir a issue (rate limit, offline, etc.) — não trava a
        // navegação, o dado só não fica persistido pra outros visitantes ainda.
    }
}

function _salvarPlayerLocal(playerId, gamerTag, prefix = '') {
    // Não faz mais nada: a lista de players conhecidos agora vem do
    // players-cache.json compartilhado (ver carregarPlayersConhecidos).
    // Mantida como no-op só pra não quebrar chamadas existentes.
}

// ==================== PROCESSAMENTO ====================
function processarDadosPlayer(standings, setsPorEvento, gamerTag, prefix = '') {
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
        const cacheData = await _lerPerfilCacheCompartilhado(playerId);
        if (cacheData) {
            if (prefix && !cacheData.playerPrefix) {
                cacheData.playerPrefix = prefix;
            }
            _salvarPlayerLocal(playerId, gamerTag, prefix);
            return { dados: cacheData, fonte: 'cache' };
        }
    }
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag, prefix);
    await _salvarPerfilCacheCompartilhado(playerId, dados);
    _salvarPlayerLocal(playerId, gamerTag, prefix);
    return { dados, fonte: 'live' };
}

// ==================== BUSCA DE PLAYERS (cache compartilhado via Git) ====================
let _listaPlayersConhecidos = null;
async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) return _listaPlayersConhecidos;

    const cache = await _carregarCacheCompartilhado();
    const mapa = new Map();

    Object.entries(cache.players || {}).forEach(([id, dados]) => {
        if (!dados || !dados.gamerTag) return;
        if (!mapa.has(id)) {
            mapa.set(id, {
                playerId: id,
                gamerTag: dados.gamerTag,
                prefix: dados.playerPrefix || '',
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