// ==================== CONFIG ====================
// O cache dos perfis não expira automaticamente; é renovado pelo botão Atualizar.

// ==================== FIREBASE ====================
// Requer que firebase-config.js (com o firebase.initializeApp(...)) seja
// carregado ANTES deste arquivo, junto com os SDKs firebase-app-compat.js
// e firebase-firestore-compat.js. Veja o arquivo firebase-config.js.
const _db = firebase.firestore();
const _playersCollection = _db.collection('players');       // cache de perfis
const _knownPlayersCollection = _db.collection('knownPlayers'); // lista p/ busca

// ==================== CACHE DE PERFIL (Firestore, compartilhado) ====================
async function _salvarPerfilCache(playerId, dados) {
    try {
        await _playersCollection.doc(String(playerId)).set({
            dados: dados,
            timestamp: Date.now()
        }, { merge: true });
    } catch (e) {
        console.error('Erro ao salvar cache no Firestore:', e);
    }
}

async function _lerPerfilCache(playerId) {
    try {
        const doc = await _playersCollection.doc(String(playerId)).get();
        if (!doc.exists) return null;
        const cacheData = doc.data();
        return cacheData.dados || null;
    } catch (e) {
        console.error('Erro ao ler cache do Firestore:', e);
        return null;
    }
}

async function _salvarPaisPerfilCache(playerId, countryName, countryChecked = true) {
    try {
        await _playersCollection.doc(String(playerId)).update({
            'dados.countryName': countryName || null,
            'dados.countryChecked': Boolean(countryChecked)
        });
    } catch (e) {
        console.error('Erro ao salvar país no cache do perfil:', e);
    }
}

// ==================== LISTA DE PLAYERS CONHECIDOS (Firestore, compartilhada) ====================
async function _salvarPlayerLocal(playerId, gamerTag, prefix = '') {
    try {
        await _knownPlayersCollection.doc(String(playerId)).set({
            gamerTag,
            prefix: prefix || ''
        }, { merge: true });
    } catch (e) {
        console.error('Erro ao salvar player conhecido no Firestore:', e);
    }
}

// Compatibilidade com registros antigos salvos como "SPONSOR | gamerTag" em um único campo.
function _normalizarPlayerConhecido(playerId, dados = {}) {
    let gamerTag = String(dados.gamerTag || '').trim();
    let prefix = String(dados.prefix || '').trim();
    const partesCombinadas = gamerTag.split('|').map(parte => parte.trim());

    if (partesCombinadas.length >= 2) {
        const prefixosEmbutidos = partesCombinadas.slice(0, -1)
            .flatMap(parte => parte.split(/[|/&]/))
            .map(parte => parte.trim())
            .filter(Boolean);
        const gamerTagEmbutido = partesCombinadas[partesCombinadas.length - 1];
        const dividirPrefixos = valor => String(valor || '')
            .split(/[|/&]/)
            .map(parte => parte.trim())
            .filter(Boolean);
        const normalizarPrefixo = valor => String(valor || '').trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        const prefixosExistentes = dividirPrefixos(prefix);
        const prefixosCorrespondem = prefixosExistentes.length === 0 ||
            (prefixosExistentes.length <= prefixosEmbutidos.length &&
                prefixosExistentes.every((existente, indice) =>
                    normalizarPrefixo(existente) === normalizarPrefixo(prefixosEmbutidos[indice])
                ));

        if (prefixosEmbutidos.length > 0 && gamerTagEmbutido && prefixosCorrespondem) {
            if (prefixosEmbutidos.length > prefixosExistentes.length) {
                prefix = prefixosEmbutidos.join(' | ');
            }
            gamerTag = gamerTagEmbutido;
        }
    }

    return { playerId: String(playerId), gamerTag, prefix };
}

async function _carregarPlayersLocal() {
    try {
        const snap = await _knownPlayersCollection.get();
        return snap.docs.map(d => _normalizarPlayerConhecido(d.id, d.data()));
    } catch (e) {
        console.error('Erro ao carregar players conhecidos do Firestore:', e);
        return [];
    }
}

// Importa players novos e sincroniza o prefixo dos já cadastrados.
// O ID do documento é o playerId do Start.gg, então a deduplicação é estável.
async function importarPlayersConhecidos(players) {
    const porId = new Map();
    let semId = 0;
    (players || []).forEach(player => {
        const playerId = player?.playerId;
        const gamerTag = String(player?.gamerTag || '').trim();
        const prefix = String(player?.prefix || '').trim();
        if (!playerId || !gamerTag) {
            semId++;
            return;
        }
        const id = String(playerId);
        if (!porId.has(id)) {
            porId.set(id, { playerId: id, gamerTag, prefix });
        } else if (!porId.get(id).prefix && prefix) {
            porId.get(id).prefix = prefix;
        }
    });

    const snapshot = await _knownPlayersCollection.get();
    const existentes = new Map(snapshot.docs.map(doc => [String(doc.id), doc.data()]));
    const novos = [];
    const prefixosAtualizados = [];
    for (const player of porId.values()) {
        const existente = existentes.get(player.playerId);
        if (!existente) {
            novos.push(player);
        } else if (String(existente.prefix || '').trim() !== player.prefix) {
            prefixosAtualizados.push(player);
        }
    }

    const operacoes = [
        ...novos.map(player => ({ player, novo: true })),
        ...prefixosAtualizados.map(player => ({ player, novo: false }))
    ];
    const loteMaximo = 450;

    for (let inicio = 0; inicio < operacoes.length; inicio += loteMaximo) {
        const batch = _db.batch();
        operacoes.slice(inicio, inicio + loteMaximo).forEach(({ player, novo }) => {
            batch.set(_knownPlayersCollection.doc(player.playerId), novo
                ? { gamerTag: player.gamerTag, prefix: player.prefix }
                : { prefix: player.prefix }, { merge: true });
        });
        await batch.commit();
    }

    if (_listaPlayersConhecidos) {
        const locaisPorId = new Map(_listaPlayersConhecidos.map(player => [String(player.playerId), player]));
        prefixosAtualizados.forEach(player => {
            const local = locaisPorId.get(player.playerId);
            if (local) local.prefix = player.prefix;
        });
        _listaPlayersConhecidos.push(...novos);
    }

    return {
        encontrados: porId.size,
        adicionados: novos.length,
        jaExistiam: porId.size - novos.length,
        prefixosAtualizados: prefixosAtualizados.length,
        semId
    };
}

// ==================== PROCESSAMENTO ====================
function processarDadosPlayer(standings, setsPorEvento, gamerTag, prefix = '') {
    const seisMesesAtras = Date.now() - 180 * 24 * 60 * 60 * 1000;

    let totalWins = 0, totalLosses = 0;
    let wins6m = 0, losses6m = 0;
    const torneios = [];
    const colocacoes = [];
    const h2h = {};
    const characterUsageByGame = new Map();
    let characterUsageUnavailable = false;
    let characterUsagePartial = false;

    standings.forEach(s => {
        const eventId = s.container?.id;
        const startAt = s.container?.startAt;
        const resultado = setsPorEvento[eventId] || { wins: 0, losses: 0 };

        if (resultado.characterUsageUnavailable) characterUsageUnavailable = true;
        const usage = resultado.characterUsage;
        if (usage?.partial) characterUsagePartial = true;
        if (usage?.gameName && Array.isArray(usage.picks)) {
            let gameStats = characterUsageByGame.get(usage.gameName);
            if (!gameStats) {
                gameStats = { gameName: usage.gameName, reportedSelections: 0, characters: new Map() };
                characterUsageByGame.set(usage.gameName, gameStats);
            }
            gameStats.reportedSelections += Number(usage.reportedSelections) || 0;
            usage.picks.forEach(pick => {
                const key = String(pick.characterId || pick.name || '').trim();
                const name = String(pick.name || '').trim();
                const count = Number(pick.count) || 0;
                if (!key || !name || count <= 0) return;
                const current = gameStats.characters.get(key) || { name, count: 0 };
                current.count += count;
                gameStats.characters.set(key, current);
            });
        }

        totalWins += resultado.wins;
        totalLosses += resultado.losses;

        (resultado.sets || []).forEach(set => {
            if (!set.opponentId) return;
            const key = String(set.opponentId);
            if (!h2h[key]) h2h[key] = { opponentId: set.opponentId, opponentTag: set.opponentTag || 'Desconhecido', wins: 0, losses: 0 };
            if (set.venceu) h2h[key].wins++; else h2h[key].losses++;
            if (set.opponentTag) h2h[key].opponentTag = set.opponentTag;
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
            eventId: eventId || null,
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
            return { ...r, total, winrate: total > 0 ? Math.round((r.wins / total) * 100) : 0 };
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

    const characterUsage = [...characterUsageByGame.values()]
        .filter(game => game.reportedSelections > 0)
        .map(game => ({
            gameName: game.gameName,
            reportedSelections: game.reportedSelections,
            topCharacters: [...game.characters.values()]
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
                .slice(0, 3)
                .map(character => ({
                    name: character.name,
                    count: character.count,
                    percentage: Math.round((character.count / game.reportedSelections) * 100)
                }))
        }))
        .sort((a, b) => a.gameName.localeCompare(b.gameName));

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
        characterUsage,
        characterUsageUnavailable,
        characterUsagePartial,
        tournaments: torneios,
        updatedAt: new Date().toISOString()
    };
}

// ==================== BUSCA AO VIVO ====================
async function _buscarPlayerAoVivo(playerId, gamerTag, prefix = '') {
    const query1 = `query PlayerHistory($id: ID!) {
        player(id: $id) {
            gamerTag
            prefix
            user {
                id
                slug
                name
                location {
                    country
                }
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
    const jogador = json1.data?.player;
    if (!jogador || !Object.prototype.hasOwnProperty.call(jogador, 'prefix')) {
        throw new Error('O Start.gg não retornou o sponsor atual deste player.');
    }
    const gamerTagAtual = jogador.gamerTag || gamerTag;
    const prefixAtual = typeof jogador.prefix === 'string' ? jogador.prefix.trim() : '';
    const user = jogador.user;
    const countryName = typeof user?.location?.country === 'string' && user.location.country.trim()
        ? user.location.country.trim()
        : null;
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
        const resultado = await buscarSetsDoEvento(eventId, playerId, true);
        setsPorEvento[eventId] = resultado;
    }

    const dados = processarDadosPlayer(standings, setsPorEvento, gamerTagAtual, prefixAtual);
    dados.avatarUrl = avatarUrl;
    dados.bannerUrl = bannerUrl;
    dados.realName = realName;
    dados.userSlug = userSlug;
    dados.countryName = countryName;
    dados.countryChecked = true;
    dados.social = {
        twitch: twitchAuth ? twitchAuth.externalUsername : null,
        twitter: twitterAuth ? twitterAuth.externalUsername : null,
        discord: discordAuth ? discordAuth.externalUsername : null
    };
    return dados;
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function obterDadosPlayer(playerId, gamerTag, forceRefresh = false, prefix = '', prefixProvided = false) {
    if (!forceRefresh) {
        const cacheData = await _lerPerfilCache(playerId);
        if (cacheData) {
            if ((prefixProvided || prefix) && cacheData.playerPrefix !== prefix) {
                cacheData.playerPrefix = prefix;
            }
            return { dados: cacheData, fonte: 'cache' };
        }
    }
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag, prefix);
    await _salvarPerfilCache(playerId, dados);
    await _salvarPlayerLocal(playerId, dados.gamerTag || gamerTag, dados.playerPrefix || '');
    return { dados, fonte: 'live' };
}

// ==================== ARTE DE PERSONAGEM ESCOLHIDA (Firestore, campo separado) ====================
// Campo isolado de `dados`/timestamp via merge:true, então nunca é apagado
// quando o cache de stats é sobrescrito (_salvarPerfilCache faz .set() sem merge).
async function _salvarCharArt(playerId, charKey) {
    try {
        await _playersCollection.doc(String(playerId)).set({
            characterArt: charKey
        }, { merge: true });
    } catch (e) {
        console.error('Erro ao salvar char art:', e);
    }
}

async function _lerCharArt(playerId) {
    try {
        const doc = await _playersCollection.doc(String(playerId)).get();
        if (!doc.exists) return null;
        return doc.data().characterArt || null;
    } catch (e) {
        console.error('Erro ao ler char art:', e);
        return null;
    }
}

// ==================== JOGOS DO PLAYER (Firestore, campo separado) ====================
async function _salvarGamesPlayed(playerId, gameKeys) {
    try {
        const playerKey = playerId == null ? '' : String(playerId).trim();
        if (!playerKey) return false;
        const validKeys = Array.isArray(gameKeys)
            ? [...new Set(gameKeys.filter(key => typeof key === 'string' && key.trim()))].slice(0, 20)
            : [];
        await _playersCollection.doc(playerKey).set({
            gamesPlayed: validKeys
        }, { merge: true });
        return true;
    } catch (e) {
        console.error('Erro ao salvar jogos do player:', e);
        return false;
    }
}

async function _lerGamesPlayed(playerId) {
    try {
        const playerKey = playerId == null ? '' : String(playerId).trim();
        if (!playerKey) return [];
        const doc = await _playersCollection.doc(playerKey).get();
        if (!doc.exists) return [];
        const gamesPlayed = doc.data().gamesPlayed;
        return Array.isArray(gamesPlayed) ? gamesPlayed : [];
    } catch (e) {
        console.error('Erro ao ler jogos do player:', e);
        return [];
    }
}

// ==================== HISTÓRICO COMPLETO DE PERSONAGENS (Start.gg) ====================
const _CHAR_HISTORY_INDEX_PAGE_SIZE = 100;
const _CHAR_HISTORY_EVENT_PAGE_SIZE = 25;

const MAX_EVENTOS_VARREDURA_PERSONAGENS = 15;

function criarEstadoHistoricoPersonagens(playerId, tournaments = []) {
    const eventosRecentes = (Array.isArray(tournaments) ? tournaments : [])
        .filter(t => t.eventId)
        .slice(0, MAX_EVENTOS_VARREDURA_PERSONAGENS)
        .map(t => ({
            eventId: String(t.eventId),
            eventName: t.eventName || 'Evento',
            gameName: '',
            page: 1,
            totalPages: null,
            status: 'pending',
            reportedSelections: 0
        }));

    return {
        version: 2,
        playerId: String(playerId),
        status: 'running',
        phase: 'scan',
        indexPage: 1,
        indexTotalPages: 1,
        totalSets: 0,
        events: eventosRecentes,
        eventIndex: 0,
        completedEvents: 0,
        scannedSets: 0,
        totalSelections: 0,
        countsByGame: [],
        updatedAt: new Date().toISOString()
    };
}

function _adicionarSelecoesReportadasAoEstado(state, gameName, selections) {
    if (!gameName || !selections.length) return;
    let gameStats = state.countsByGame.find(item => item.gameName === gameName);
    if (!gameStats) {
        gameStats = { gameName, reportedSelections: 0, characters: [] };
        state.countsByGame.push(gameStats);
    }
    selections.forEach(character => {
        gameStats.reportedSelections++;
        state.totalSelections++;
        let current = gameStats.characters.find(item => item.characterId === character.characterId);
        if (!current) {
            current = { characterId: character.characterId, name: character.name, count: 0 };
            gameStats.characters.push(current);
        }
        current.count++;
    });
}

function _montarResumoHistoricoPersonagens(state) {
    return state.countsByGame
        .filter(game => game.reportedSelections > 0)
        .map(game => ({
            gameName: game.gameName,
            reportedSelections: game.reportedSelections,
            topCharacters: [...game.characters]
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
                .slice(0, 3)
                .map(character => ({
                    name: character.name,
                    count: character.count,
                    percentage: Math.round((character.count / game.reportedSelections) * 100)
                }))
        }))
        .sort((a, b) => a.gameName.localeCompare(b.gameName));
}

function _erroStartGGHistorico(json) {
    if (json?.errors?.length) {
        throw new Error('A API Start.gg não concluiu esta etapa. O progresso foi salvo; aguarde e tente continuar.');
    }
}

async function _chamarStartGGHistorico(query, variables, callbacks = {}) {
    const options = {
        minIntervalMs: 1500,
        maxCallsPerMinute: 65,
        waitIfPaused: callbacks.waitIfPaused,
        onWait: callbacks.onWait
    };
    const json = typeof callStartGGComLimite === 'function'
        ? await callStartGGComLimite(query, variables, options)
        : await callStartGG(query, variables);
    _erroStartGGHistorico(json);
    return json;
}

function _contarSelecoesDoPlayer(set, playerId) {
    const slot = set.slots?.find(item =>
        item.entrant?.participants?.some(participant => String(participant.player?.id) === String(playerId))
    );
    if (!slot?.entrant) return [];

    const entrantId = String(slot.entrant.id);
    const participantIds = new Set((slot.entrant.participants || [])
        .filter(participant => String(participant.player?.id) === String(playerId))
        .map(participant => String(participant.id)));
    const reported = [];

    (set.games || []).forEach(game => {
        const picksForGame = new Map();
        (game.selections || []).forEach(selection => {
            const participantId = selection.participant?.id;
            const belongsToPlayer = participantId != null && participantIds.size
                ? participantIds.has(String(participantId))
                : String(selection.entrant?.id) === entrantId;
            const character = selection.character;
            const name = String(character?.name || '').trim();
            if (!belongsToPlayer || !name) return;
            const characterId = character.id == null ? name.toLocaleLowerCase() : String(character.id);
            picksForGame.set(characterId, { characterId, name });
        });
        picksForGame.forEach(character => reported.push(character));
    });
    return reported;
}

async function varrerHistoricoCompletoPersonagens(playerId, state, callbacks = {}) {
    const playerKey = playerId == null ? '' : String(playerId).trim();
    if (!playerKey) throw new Error('ID de jogador ausente.');
    if (!state || state.version !== 2 || String(state.playerId) !== playerKey) {
        throw new Error('O progresso salvo não corresponde a este perfil.');
    }

    const save = async () => {
        state.updatedAt = new Date().toISOString();
        if (callbacks.saveState) await callbacks.saveState(state);
        if (callbacks.onProgress) callbacks.onProgress(state);
    };
    const waitIfPaused = callbacks.waitIfPaused || (() => Promise.resolve());

    state.status = 'running';
    await save();

    try {
        while (state.phase === 'index') {
            await waitIfPaused();
            const page = Math.max(1, Number(state.indexPage) || 1);
            const query = `query PlayerEventIndex($id: ID!, $page: Int!) {
                player(id: $id) {
                    sets(perPage: 100, page: $page) {
                        pageInfo { total totalPages page perPage }
                        nodes { event { id name videogame { name } } }
                    }
                }
            }`;
            const json = await _chamarStartGGHistorico(query, { id: playerKey, page }, callbacks);
            const connection = json.data?.player?.sets;
            if (!connection) throw new Error('Não foi possível listar os eventos deste perfil.');

            const pageInfo = connection.pageInfo || {};
            state.totalSets = Number(pageInfo.total) || state.totalSets;
            state.indexTotalPages = Math.max(1, Number(pageInfo.totalPages) || 1);
            (connection.nodes || []).forEach(node => {
                const event = node.event;
                if (event?.id == null) return;
                const eventId = String(event.id);
                let record = state.events.find(item => item.eventId === eventId);
                if (!record) {
                    record = {
                        eventId,
                        eventName: String(event.name || 'Evento'),
                        gameName: String(event.videogame?.name || ''),
                        page: 1,
                        totalPages: null,
                        status: 'pending',
                        reportedSelections: 0
                    };
                    state.events.push(record);
                } else {
                    if (!record.eventName && event.name) record.eventName = String(event.name);
                    if (!record.gameName && event.videogame?.name) record.gameName = String(event.videogame.name);
                }
            });

            state.indexPage = page + 1;
            if (page >= state.indexTotalPages || !(connection.nodes || []).length) {
                state.phase = 'scan';
                state.indexPage = state.indexTotalPages;
                state.eventIndex = Math.min(Number(state.eventIndex) || 0, state.events.length);
                if (callbacks.onPhaseChange) callbacks.onPhaseChange('scan', state);
            }
            await save();
        }

        while (state.phase === 'scan' && state.eventIndex < state.events.length) {
            await waitIfPaused();
            const event = state.events[state.eventIndex];
            const page = Math.max(1, Number(event.page) || 1);
            const query = `query EventPlayerSets($eventId: ID!, $playerId: ID!, $page: Int!) {
                event(id: $eventId) {
                    name
                    videogame { name }
                    sets(perPage: 25, page: $page, filters: { playerIds: [$playerId], hideEmpty: true }) {
                        pageInfo { total totalPages page perPage }
                        nodes {
                            id
                            slots { entrant { id participants { id player { id } } } }
                            games { selections { entrant { id } participant { id } character { id name } } }
                        }
                    }
                }
            }`;
            const json = await _chamarStartGGHistorico(query, { eventId: event.eventId, playerId: playerKey, page }, callbacks);
            const eventData = json.data?.event;
            const connection = eventData?.sets;
            if (!connection) throw new Error(`Não foi possível ler o evento ${event.eventName}.`);

            event.eventName = String(eventData.name || event.eventName || 'Evento');
            event.gameName = String(eventData.videogame?.name || event.gameName || 'Jogo desconhecido');
            event.totalPages = Math.max(1, Number(connection.pageInfo?.totalPages) || 1);
            event.status = 'scanning';

            (connection.nodes || []).forEach(set => {
                state.scannedSets++;
                const picks = _contarSelecoesDoPlayer(set, playerKey);
                event.reportedSelections += picks.length;
                _adicionarSelecoesReportadasAoEstado(state, event.gameName, picks);
            });

            if (page >= event.totalPages || !(connection.nodes || []).length) {
                event.status = 'complete';
                event.page = event.totalPages;
                state.completedEvents = state.eventIndex + 1;
                state.eventIndex++;
            } else {
                event.page = page + 1;
            }
            await save();
        }

        if (state.phase === 'scan' && state.eventIndex >= state.events.length) {
            state.phase = 'complete';
            state.status = 'complete';
            state.completedEvents = state.events.length;
            state.characterUsage = _montarResumoHistoricoPersonagens(state);
            state.completedAt = new Date().toISOString();
            await save();
        }
        return state;
    } catch (error) {
        state.status = 'error';
        state.errorMessage = error?.message || 'Falha ao consultar o histórico.';
        await save();
        throw error;
    }
}

async function _salvarHistoricoPersonagensCache(playerId, history) {
    try {
        const playerKey = playerId == null ? '' : String(playerId).trim();
        if (!playerKey || !history?.complete || !Array.isArray(history.usage)) return false;
        await _playersCollection.doc(playerKey).set({
            characterUsageHistory: {
                complete: true,
                eventCount: Math.max(0, Number(history.eventCount) || 0),
                setCount: Math.max(0, Number(history.setCount) || 0),
                reportedSelections: Math.max(0, Number(history.reportedSelections) || 0),
                usage: history.usage,
                completedAt: history.completedAt || new Date().toISOString()
            }
        }, { merge: true });
        return true;
    } catch (e) {
        console.error('Erro ao salvar o histórico completo de personagens:', e);
        return false;
    }
}

async function _lerHistoricoPersonagensCache(playerId) {
    try {
        const playerKey = playerId == null ? '' : String(playerId).trim();
        if (!playerKey) return null;
        const doc = await _playersCollection.doc(playerKey).get();
        if (!doc.exists) return null;
        const history = doc.data().characterUsageHistory;
        return history?.complete && Array.isArray(history.usage) ? history : null;
    } catch (e) {
        console.error('Erro ao ler o histórico completo de personagens:', e);
        return null;
    }
}

// ==================== BUSCA DE PLAYERS (Firestore) ====================
let _listaPlayersConhecidos = null;
async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) return _listaPlayersConhecidos;
    _listaPlayersConhecidos = await _carregarPlayersLocal();
    return _listaPlayersConhecidos;
}

function filtrarPlayers(lista, termo) {
    const t = termo.trim().toLowerCase();
    if (!t) return [];
    const filtrados = lista.filter(p => p.gamerTag.toLowerCase().includes(t));
    return filtrados.slice(0, 15);
}
