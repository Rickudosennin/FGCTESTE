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
    } catch (e) {
        return [];
    }
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
    } catch (e) {
        return null;
    }
}

// ==================== PROCESSAMENTO ====================
function processarDadosPlayer(standings, setsPorEvento, gamerTag, prefix = '') {
    const seisMesesAtras = Date.now() - 180 * 24 * 60 * 60 * 1000;

    let totalWins = 0;
    let totalLosses = 0;

    let wins6m = 0;
    let losses6m = 0;

    const torneios = [];
    const colocacoes = [];

    standings.forEach(s => {
        const eventId = s.container?.id;
        const startAt = s.container?.startAt;

        const resultado = setsPorEvento[eventId] || {
            wins: 0,
            losses: 0
        };

        totalWins += resultado.wins;
        totalLosses += resultado.losses;

        const isRecent =
            startAt &&
            (startAt * 1000) > seisMesesAtras;

        if (isRecent) {
            wins6m += resultado.wins;
            losses6m += resultado.losses;
        }

        const totalEvento =
            resultado.wins + resultado.losses;

        const winrate =
            totalEvento > 0
                ? Math.round(
                    (resultado.wins / totalEvento) * 100
                )
                : 0;

        /*
         * IMPORTANTE:
         * Esta parte permanece exatamente baseada
         * nos dados originais do Start.gg.
         *
         * O logo/profile image do evento continua
         * sendo utilizado pelo Recent Form.
         */
        const tournamentImages =
            s.container?.tournament?.images || [];

        const tournamentIcon =
            tournamentImages.find(
                img =>
                    (img.type || '').toLowerCase() === 'profile'
            )?.url || null;

        torneios.push({
            name:
                s.container?.tournament?.name || '—',

            eventName:
                s.container?.name || '—',

            placement:
                s.placement || '?',

            attendees:
                s.container?.tournament?.numAttendees || '?',

            wins:
                resultado.wins,

            losses:
                resultado.losses,

            winrate,

            date:
                startAt
                    ? new Date(
                        startAt * 1000
                    ).toLocaleDateString('pt-BR')
                    : '—',

            startAt:
                startAt || 0,

            icon:
                tournamentIcon,

            isRecent
        });

        if (s.placement) {
            colocacoes.push(s.placement);
        }
    });

    // ==================== ORDENAÇÃO ====================
    torneios.sort(
        (a, b) =>
            b.startAt - a.startAt
    );

    /*
     * RECENT FORM
     *
     * Mantido exatamente com o sistema atual:
     * cada resultado continua carregando o
     * logo/banner profile do torneio.
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
                    t.icon
            }));

    // ==================== ESTATÍSTICAS ====================
    const totalPartidas =
        totalWins + totalLosses;

    const total6m =
        wins6m + losses6m;

    /*
     * Quantidade de eventos em que o jogador
     * terminou no Top 8.
     */
    const totalTop8 =
        torneios.filter(
            t =>
                Number(t.placement) >= 1 &&
                Number(t.placement) <= 8
        ).length;

    /*
     * Quantidade de eventos em que o jogador
     * terminou no Top 3.
     */
    const totalTop3 =
        torneios.filter(
            t =>
                Number(t.placement) >= 1 &&
                Number(t.placement) <= 3
        ).length;

    /*
     * Quantidade de primeiros lugares.
     */
    const totalPrimeiros =
        torneios.filter(
            t =>
                Number(t.placement) === 1
        ).length;

    /*
     * Melhor colocação encontrada
     * no histórico carregado.
     */
    const colocacoesNumericas =
        torneios
            .map(
                t =>
                    Number(t.placement)
            )
            .filter(
                n =>
                    Number.isFinite(n) &&
                    n > 0
            );

    const melhorColocacao =
        colocacoesNumericas.length > 0
            ? Math.min(
                ...colocacoesNumericas
            )
            : null;

    /*
     * ====================
     * HIGHLIGHTS
     * ====================
     *
     * Mantemos o sistema original:
     * prioridade pela colocação.
     *
     * Não alteramos o Recent Form.
     */
    const highlights =
        [...torneios]
            .filter(
                t =>
                    t.placement &&
                    t.placement > 0 &&
                    t.attendees !== '?'
            )
            .sort(
                (a, b) =>
                    a.placement - b.placement
            )
            .slice(0, 8)
            .map(t => ({
                placement:
                    `${t.placement}º/${t.attendees}`,

                eventName:
                    t.eventName,

                date:
                    t.date
            }));

    // ==================== RETORNO ====================
    return {
        gamerTag,

        playerPrefix:
            prefix || '',

        totalWins,

        totalLosses,

        /*
         * Total de sets contabilizados.
         */
        totalSets:
            totalPartidas,

        /*
         * Winrate geral.
         */
        winrateAllTime:
            totalPartidas > 0
                ? Math.round(
                    (totalWins / totalPartidas) * 100
                )
                : 0,

        /*
         * Estatísticas dos últimos 6 meses.
         */
        winrateLast6Months:
            total6m > 0
                ? Math.round(
                    (wins6m / total6m) * 100
                )
                : 0,

        wins6m,

        losses6m,

        /*
         * Estatísticas de colocação.
         */
        totalTop8,

        totalTop3,

        totalPrimeiros,

        melhorColocacao,

        /*
         * Recent Form:
         * mantém os logos dos eventos.
         */
        recentForm:
            colocacoesOrdenadas.slice(0, 10),

        /*
         * Highlights:
         * mantido conforme lógica original.
         */
        highlights,

        /*
         * Histórico completo carregado.
         */
        tournaments:
            torneios,

        /*
         * Quantidade de torneios/eventos
         * carregados nesta consulta.
         */
        totalTournaments:
            torneios.length,

        updatedAt:
            new Date().toISOString()
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

    const json1 =
        await callStartGG(
            query1,
            { id: playerId }
        );

    const standings =
        json1.data?.player?.recentStandings || [];

    const images =
        json1.data?.player?.user?.images || [];

    const avatarUrl =
        images.find(
            img =>
                (img.type || '').toLowerCase() === 'profile'
        )?.url || null;

    const bannerUrl =
        images.find(
            img =>
                (img.type || '').toLowerCase() === 'banner'
        )?.url || null;

    const setsPorEvento = {};

    for (const standing of standings) {
        const eventId =
            standing.container?.id;

        if (!eventId) continue;

        /*
         * Mantemos exatamente a função
         * original utilizada pelo projeto.
         */
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
            gamerTag,
            prefix
        );

    dados.avatarUrl =
        avatarUrl;

    dados.bannerUrl =
        bannerUrl;

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
            _lerPerfilCache(playerId);

        if (cacheData) {
            if (
                prefix &&
                !cacheData.playerPrefix
            ) {
                cacheData.playerPrefix =
                    prefix;
            }

            return {
                dados: cacheData,
                fonte: 'cache'
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
        fonte: 'live'
    };
}

// ==================== BUSCA DE PLAYERS (apenas localStorage) ====================
let _listaPlayersConhecidos = null;

async function carregarPlayersConhecidos() {
    if (_listaPlayersConhecidos) {
        return _listaPlayersConhecidos;
    }

    const locais =
        _carregarPlayersLocal();

    const mapa =
        new Map();

    locais.forEach(p => {
        const id =
            String(p.playerId);

        if (!mapa.has(id)) {
            mapa.set(id, {
                playerId: id,
                gamerTag: p.gamerTag,
                prefix: p.prefix || '',
                placement: null
            });
        }
    });

    _listaPlayersConhecidos =
        Array.from(
            mapa.values()
        );

    return _listaPlayersConhecidos;
}

function filtrarPlayers(lista, termo) {
    const t =
        termo
            .trim()
            .toLowerCase();

    if (!t) return [];

    const filtrados =
        lista.filter(
            p =>
                p.gamerTag
                    .toLowerCase()
                    .includes(t)
        );

    return filtrados.slice(0, 15);
}