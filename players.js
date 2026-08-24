// ==================== CONFIG ====================
const GITHUB_ISSUES_TOKEN = ''; // Deixe vazio
const CACHE_MAX_IDADE_HORAS = 24;

// ==================== LISTA LOCAL DE PLAYERS ====================
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';
const PROFILE_CACHE_PREFIX = 'fgchub_profile_v2_';

function _salvarPlayerLocal(playerId, gamerTag, prefix = '') {
    try {
        const lista = JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');

        if (!lista.some(p => p.playerId === playerId)) {
            lista.push({
                playerId,
                gamerTag,
                prefix
            });

            localStorage.setItem(
                LOCAL_PLAYERS_KEY,
                JSON.stringify(lista)
            );

            const contador = document.getElementById('contador_salvos');

            if (contador) {
                contador.textContent = lista.length;
            }
        }
    } catch (e) {}
}

function _carregarPlayersLocal() {
    try {
        return JSON.parse(
            localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]'
        );
    } catch (e) {
        return [];
    }
}

// ==================== CACHE ====================
function _salvarPerfilCache(playerId, dados) {
    try {
        localStorage.setItem(
            PROFILE_CACHE_PREFIX + playerId,
            JSON.stringify({
                dados,
                timestamp: Date.now()
            })
        );
    } catch (e) {}
}

function _lerPerfilCache(playerId) {
    try {
        const raw = localStorage.getItem(
            PROFILE_CACHE_PREFIX + playerId
        );

        if (!raw) return null;

        const cacheData = JSON.parse(raw);

        const idade =
            (Date.now() - cacheData.timestamp) / 3600000;

        return idade < CACHE_MAX_IDADE_HORAS
            ? cacheData.dados
            : null;

    } catch (e) {
        return null;
    }
}

// ==================== HELPERS ====================
function _normalizarUrlStartGG(url) {
    if (!url) return null;

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    if (url.startsWith('/')) {
        return 'https://www.start.gg' + url;
    }

    return 'https://www.start.gg/' + url;
}

function _getProfileImage(images, type) {
    return (images || []).find(
        img =>
            String(img.type || '').toLowerCase() ===
            String(type).toLowerCase()
    )?.url || null;
}

function _safeNumber(value, fallback = 0) {
    const n = Number(value);

    return Number.isFinite(n)
        ? n
        : fallback;
}

function _dedupeById(items) {
    const map = new Map();

    (items || []).forEach(item => {
        if (item && item.id != null) {
            map.set(String(item.id), item);
        }
    });

    return Array.from(map.values());
}

// ==================== PROCESSAMENTO DE RESULTADOS ====================
function processarDadosPlayer(
    standings,
    setsPorEvento,
    gamerTag,
    prefix = ''
) {
    const seisMesesAtras =
        Date.now() -
        180 * 24 * 60 * 60 * 1000;

    let totalWins = 0;
    let totalLosses = 0;

    let wins6m = 0;
    let losses6m = 0;

    const torneios = [];

    (standings || []).forEach(s => {
        const eventId =
            s.container?.id;

        const startAt =
            s.container?.startAt || 0;

        const resultado =
            setsPorEvento[eventId] || {
                wins: 0,
                losses: 0
            };

        totalWins += resultado.wins;
        totalLosses += resultado.losses;

        const isRecent =
            startAt &&
            (startAt * 1000) >
            seisMesesAtras;

        if (isRecent) {
            wins6m += resultado.wins;
            losses6m += resultado.losses;
        }

        const total =
            resultado.wins +
            resultado.losses;

        const winrate =
            total > 0
                ? Math.round(
                    (resultado.wins / total) * 100
                )
                : 0;

        const tournament =
            s.container?.tournament || {};

        const tournamentImages =
            tournament.images || [];

        /*
         * IMPORTANTE:
         * Mantém o logo/banner atual do evento.
         */
        const tournamentIcon =
            _getProfileImage(
                tournamentImages,
                'profile'
            );

        torneios.push({
            id: eventId,

            tournamentId:
                tournament.id || null,

            name:
                tournament.name || '—',

            eventName:
                s.container?.name || '—',

            placement:
                s.placement || '?',

            attendees:
                tournament.numAttendees || '?',

            wins:
                resultado.wins,

            losses:
                resultado.losses,

            winrate,

            date:
                startAt
                    ? new Date(
                        startAt * 1000
                    ).toLocaleDateString(
                        'pt-BR'
                    )
                    : '—',

            startAt,

            /*
             * Mantém o logo do evento.
             */
            icon:
                tournamentIcon,

            url:
                tournament.url
                    ? _normalizarUrlStartGG(
                        tournament.url
                    )
                    : null,

            isRecent
        });
    });

    /*
     * Mais recente primeiro.
     */
    torneios.sort(
        (a, b) =>
            b.startAt - a.startAt
    );

    /*
     * RECENT FORM
     *
     * Os logos dos eventos continuam
     * sendo preservados.
     */
    const colocacoesOrdenadas =
        torneios
            .filter(
                t =>
                    t.placement &&
                    t.placement !== '?'
            )
            .map(t => ({
                placement:
                    t.placement,

                icon:
                    t.icon,

                tooltip:
                    `${t.placement}º/${t.attendees} · ${t.eventName}`,

                date:
                    t.date,

                eventName:
                    t.eventName,

                attendees:
                    t.attendees,

                tournamentName:
                    t.name,

                url:
                    t.url
            }));

    const totalPartidas =
        totalWins + totalLosses;

    const total6m =
        wins6m + losses6m;

    /*
     * HIGHLIGHTS
     *
     * Não altera o logo dos eventos.
     *
     * Apenas melhora a relevância:
     *
     * posição + tamanho do torneio.
     */
    const highlights =
        [...torneios]
            .filter(
                t =>
                    t.placement &&
                    Number(t.placement) > 0 &&
                    t.attendees !== '?'
            )
            .sort((a, b) => {

                const score = t => {

                    const placement =
                        Number(t.placement);

                    const attendees =
                        Math.max(
                            1,
                            Number(t.attendees) || 1
                        );

                    return (
                        (1 / placement) *
                        Math.log2(
                            attendees + 1
                        )
                    );
                };

                return (
                    score(b) -
                    score(a)
                ) ||
                (
                    b.startAt -
                    a.startAt
                );
            })
            .slice(0, 8)
            .map(t => ({
                placement:
                    `${t.placement}º/${t.attendees}`,

                rawPlacement:
                    t.placement,

                eventName:
                    t.eventName,

                tournamentName:
                    t.name,

                attendees:
                    t.attendees,

                date:
                    t.date,

                icon:
                    t.icon,

                url:
                    t.url
            }));

    /*
     * Estatísticas adicionais.
     */
    const top8 =
        torneios.filter(
            t =>
                Number(t.placement) >= 1 &&
                Number(t.placement) <= 8
        ).length;

    const top3 =
        torneios.filter(
            t =>
                Number(t.placement) >= 1 &&
                Number(t.placement) <= 3
        ).length;

    const primeiroLugar =
        torneios.filter(
            t =>
                Number(t.placement) === 1
        ).length;

    const melhorColocacao =
        torneios.length
            ? Math.min(
                ...torneios
                    .map(
                        t =>
                            Number(t.placement)
                    )
                    .filter(
                        n =>
                            Number.isFinite(n) &&
                            n > 0
                    )
            )
            : null;

    return {
        gamerTag,

        playerPrefix:
            prefix || '',

        totalWins,

        totalLosses,

        totalSets:
            totalPartidas,

        winrateAllTime:
            totalPartidas > 0
                ? Math.round(
                    (totalWins /
                        totalPartidas) *
                    100
                )
                : 0,

        winrateLast6Months:
            total6m > 0
                ? Math.round(
                    (wins6m /
                        total6m) *
                    100
                )
                : 0,

        wins6m,

        losses6m,

        /*
         * Mantém os dados necessários
         * para a apresentação visual atual.
         */
        recentForm:
            colocacoesOrdenadas.slice(
                0,
                10
            ),

        highlights,

        tournaments:
            torneios,

        tournamentCount:
            torneios.length,

        top8,

        top3,

        firstPlaces:
            primeiroLugar,

        bestPlacement:
            Number.isFinite(
                melhorColocacao
            )
                ? melhorColocacao
                : null,

        updatedAt:
            new Date().toISOString()
    };
}

// ==================== PERFIL DO USUÁRIO ====================
async function _buscarPerfilUsuario(playerId) {

    const query = `
        query PlayerProfile($id: ID!) {
            player(id: $id) {
                id
                gamerTag
                prefix

                user {
                    id
                    slug
                    name
                    createdAt

                    location {
                        city
                        state
                        country
                    }

                    images {
                        id
                        type
                        url
                    }
                }
            }
        }
    `;

    try {

        const json =
            await callStartGG(
                query,
                {
                    id: playerId
                }
            );

        if (json.errors?.length) {

            console.warn(
                'Perfil Start.gg retornou erros:',
                json.errors
            );

            return null;
        }

        return (
            json.data?.player ||
            null
        );

    } catch (e) {

        console.warn(
            'Falha ao buscar dados do usuário:',
            e
        );

        return null;
    }
}

// ==================== SETS / HEAD-TO-HEAD ====================
async function _buscarSetsDoPlayer(playerId) {

    const query = `
        query PlayerSets($id: ID!) {

            player(id: $id) {

                sets(
                    perPage: 100
                    page: 1
                ) {

                    pageInfo {
                        total
                    }

                    nodes {

                        id

                        displayScore

                        winnerId

                        state

                        slots {

                            entrant {
                                id
                                name

                                participants {
                                    player {
                                        id
                                    }
                                }
                            }
                        }

                        event {
                            id
                            name

                            tournament {
                                id
                                name
                                url
                            }
                        }
                    }
                }
            }
        }
    `;

    try {

        const json =
            await callStartGG(
                query,
                {
                    id: playerId
                }
            );

        if (json.errors?.length) {

            console.warn(
                'Sets do player retornaram erros:',
                json.errors
            );

            return [];
        }

        return (
            json.data?.player?.sets?.nodes ||
            []
        );

    } catch (e) {

        console.warn(
            'Falha ao buscar sets do player:',
            e
        );

        return [];
    }
}

function _processarHeadToHead(
    sets,
    playerId
) {

    const opponents =
        new Map();

    let totalWins = 0;
    let totalLosses = 0;

    (sets || []).forEach(
        set => {

            const mySlot =
                (set.slots || [])
                    .find(
                        slot =>
                            slot.entrant?.participants?.some(
                                p =>
                                    String(
                                        p.player?.id
                                    ) ===
                                    String(
                                        playerId
                                    )
                            )
                    );

            if (!mySlot?.entrant) {
                return;
            }

            const opponentSlot =
                (set.slots || [])
                    .find(
                        slot =>
                            slot !== mySlot &&
                            slot.entrant
                    );

            if (!opponentSlot?.entrant) {
                return;
            }

            const opponentName =
                opponentSlot.entrant.name ||
                'Adversário';

            const opponentId =
                opponentSlot.entrant.id ||
                opponentName;

            const key =
                String(opponentId);

            if (!opponents.has(key)) {

                opponents.set(
                    key,
                    {
                        id:
                            opponentId,

                        name:
                            opponentName,

                        wins:
                            0,

                        losses:
                            0,

                        total:
                            0,

                        lastSetId:
                            null,

                        lastEvent:
                            null
                    }
                );
            }

            const item =
                opponents.get(key);

            item.total++;

            item.lastSetId =
                set.id;

            item.lastEvent =
                set.event?.tournament?.name ||
                set.event?.name ||
                null;

            if (set.winnerId) {

                if (
                    String(
                        set.winnerId
                    ) ===
                    String(
                        mySlot.entrant.id
                    )
                ) {

                    item.wins++;

                    totalWins++;

                } else {

                    item.losses++;

                    totalLosses++;
                }
            }
        }
    );

    const opponentList =
        Array.from(
            opponents.values()
        )
            .sort(
                (a, b) =>
                    b.total - a.total ||
                    b.wins - a.wins
            )
            .slice(0, 15);

    /*
     * Winrate de cada adversário.
     */
    opponentList.forEach(
        opponent => {

            opponent.winrate =
                opponent.total > 0
                    ? Math.round(
                        (
                            opponent.wins /
                            opponent.total
                        ) * 100
                    )
                    : 0;
        }
    );

    return {

        totalSets:
            totalWins +
            totalLosses,

        totalWins,

        totalLosses,

        winrate:
            (
                totalWins +
                totalLosses
            ) > 0
                ? Math.round(
                    (
                        totalWins /
                        (
                            totalWins +
                            totalLosses
                        )
                    ) * 100
                )
                : 0,

        opponents:
            opponentList
    };
}

// ==================== VODS ====================
function _extrairVods(sets) {

    return (sets || [])

        .filter(
            s =>
                s.stream?.streamSource &&
                s.stream?.streamName
        )

        .map(
            s => ({

                title:
                    s.displayScore ||
                    'Set',

                eventName:
                    s.event?.tournament?.name ||
                    s.event?.name ||
                    '',

                source:
                    s.stream.streamSource,

                streamName:
                    s.stream.streamName,

                url:
                    s.stream.streamSource ===
                    'TWITCH'
                        ? `https://www.twitch.tv/${s.stream.streamName}`
                        : null
            })
        )

        .filter(
            v =>
                v.url
        );
}

// ==================== BUSCA AO VIVO ====================
async function _buscarPlayerAoVivo(
    playerId,
    gamerTag,
    prefix = ''
) {

    const query1 = `
        query PlayerHistory($id: ID!) {

            player(id: $id) {

                id

                gamerTag

                prefix

                user {

                    id

                    slug

                    name

                    createdAt

                    location {
                        city
                        state
                        country
                    }

                    images {
                        id
                        type
                        url
                    }
                }

                recentStandings(
                    limit: 15
                ) {

                    placement

                    container {

                        ... on Event {

                            id

                            name

                            startAt

                            tournament {

                                id

                                name

                                url

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
        }
    `;

    const json1 =
        await callStartGG(
            query1,
            {
                id: playerId
            }
        );

    if (json1.errors?.length) {

        console.warn(
            'Histórico do player retornou erros:',
            json1.errors
        );
    }

    const player =
        json1.data?.player ||
        {};

    const standings =
        player.recentStandings ||
        [];

    const images =
        player.user?.images ||
        [];

    /*
     * AVATAR
     */
    const avatarUrl =
        _getProfileImage(
            images,
            'profile'
        );

    /*
     * BANNER
     */
    const bannerUrl =
        _getProfileImage(
            images,
            'banner'
        );

    const setsPorEvento = {};

    /*
     * Mantemos a lógica atual
     * de resultados por evento.
     *
     * Isso preserva o cálculo
     * atual do WinRate.
     */
    for (
        const standing of standings
    ) {

        const eventId =
            standing.container?.id;

        if (!eventId) {
            continue;
        }

        const resultado =
            await buscarSetsDoEvento(
                eventId,
                playerId
            );

        setsPorEvento[eventId] =
            resultado;
    }

    const dados =
        processarDadosPlayer(
            standings,
            setsPorEvento,
            player.gamerTag ||
                gamerTag,
            player.prefix ??
                prefix
        );

    dados.avatarUrl =
        avatarUrl;

    dados.bannerUrl =
        bannerUrl;

    /*
     * ==========================
     * PERFIL START.GG
     * ==========================
     */

    const profileData =
        await _buscarPerfilUsuario(
            playerId
        );

    const profileUser =
        profileData?.user ||
        player.user ||
        {};

    dados.profile = {

        id:
            profileUser.id ||
            null,

        name:
            profileUser.name ||
            '',

        createdAt:
            profileUser.createdAt ||
            null,

        location: {

            city:
                profileUser.location?.city ||
                '',

            state:
                profileUser.location?.state ||
                '',

            country:
                profileUser.location?.country ||
                ''
        },

        slug:
            profileUser.slug ||
            '',

        startggUrl:
            profileUser.slug
                ? _normalizarUrlStartGG(
                    profileUser.slug
                )
                : `https://www.start.gg/user/${playerId}`
    };

    /*
     * ==========================
     * HEAD-TO-HEAD
     * ==========================
     */

    const sets =
        await _buscarSetsDoPlayer(
            playerId
        );

    dados.headToHead =
        _processarHeadToHead(
            sets,
            playerId
        );

    /*
     * ==========================
     * VODS
     * ==========================
     */

    dados.vods =
        _extrairVods(
            sets
        );

    /*
     * ==========================
     * UPCOMING EVENTS
     * ==========================
     *
     * Não inventamos eventos.
     *
     * Esta estrutura fica pronta
     * para a próxima consulta
     * específica do Start.gg.
     */

    dados.upcomingEvents = [];

    return dados;
}

// ==================== FUNÇÃO PRINCIPAL ====================
async function obterDadosPlayer(
    playerId,
    gamerTag,
    forceRefresh = false,
    prefix = ''
) {

    if (!forceRefresh) {

        const cacheData =
            _lerPerfilCache(
                playerId
            );

        if (cacheData) {

            if (
                prefix &&
                !cacheData.playerPrefix
            ) {

                cacheData.playerPrefix =
                    prefix;
            }

            return {
                dados:
                    cacheData,

                fonte:
                    'cache'
            };
        }
    }

    const dados =
        await _buscarPlayerAoVivo(
            playerId,
            gamerTag,
            prefix
        );

    _salvarPerfilCache(
        playerId,
        dados
    );

    _salvarPlayerLocal(
        playerId,
        gamerTag,
        prefix
    );

    return {

        dados,

        fonte:
            'live'
    };
}

// ==================== BUSCA DE PLAYERS ====================
let _listaPlayersConhecidos =
    null;

async function carregarPlayersConhecidos() {

    if (_listaPlayersConhecidos) {
        return _listaPlayersConhecidos;
    }

    const locais =
        _carregarPlayersLocal();

    const mapa =
        new Map();

    locais.forEach(
        p => {

            const id =
                String(
                    p.playerId
                );

            if (!mapa.has(id)) {

                mapa.set(
                    id,
                    {
                        playerId:
                            id,

                        gamerTag:
                            p.gamerTag,

                        prefix:
                            p.prefix || '',

                        placement:
                            null
                    }
                );
            }
        }
    );

    _listaPlayersConhecidos =
        Array.from(
            mapa.values()
        );

    return _listaPlayersConhecidos;
}

function filtrarPlayers(
    lista,
    termo
) {

    const t =
        termo
            .trim()
            .toLowerCase();

    if (!t) {
        return [];
    }

    const filtrados =
        lista.filter(
            p =>
                String(
                    p.gamerTag || ''
                )
                    .toLowerCase()
                    .includes(t)
        );

    return filtrados.slice(
        0,
        15
    );
}