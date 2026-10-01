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

    standings.forEach(s => {
        const eventId = s.container?.id;
        const startAt = s.container?.startAt;
        const resultado = setsPorEvento[eventId] || { wins: 0, losses: 0 };

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
        const resultado = await buscarSetsDoEvento(eventId, playerId);
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
