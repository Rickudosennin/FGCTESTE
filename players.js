// ==================== CONFIG ====================
const LOCAL_PLAYERS_KEY = 'fgchub_local_players';

// ==================== LISTA LOCAL DE PLAYERS (localStorage) ====================
function _salvarPlayerLocal(playerId, gamerTag) {
    try {
        const lista = JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');
        if (!lista.some(p => p.playerId === playerId)) {
            lista.push({ playerId, gamerTag });
            localStorage.setItem(LOCAL_PLAYERS_KEY, JSON.stringify(lista));
            // Atualiza o contador visual se existir
            const contador = document.getElementById('contador_salvos');
            if (contador) contador.textContent = lista.length;
            console.log('Player salvo localmente:', playerId, gamerTag);
        }
    } catch (e) {}
}

function _carregarPlayersLocal() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_PLAYERS_KEY) || '[]');
    } catch (e) { return []; }
}

// ==================== LEITURA DO CACHE DO GITHUB (opcional, mantido para compatibilidade) ====================
// Se você quiser manter a leitura do cache do GitHub, pode deixar, mas não é mais usado na busca principal.

// ==================== PROCESSAMENTO (mantido para o perfil) ====================
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

// ==================== FUNÇÃO PRINCIPAL ====================
async function obterDadosPlayer(playerId, gamerTag) {
    // Tenta ler do cache do GitHub (se existir) - opcional
    // Se quiser manter, pode deixar; senão, remova.
    // Como removemos as ligas, a busca não depende mais do cache do GitHub.
    // Mas o perfil pode usar se houver.
    try {
        const resp = await fetch('https://raw.githubusercontent.com/Rickudosennin/FGCTESTE/main/data/players-cache.json?t=' + Date.now());
        const cache = await resp.json();
        const entry = cache.players?.[playerId];
        if (entry && entry.updatedAt && (Date.now() - new Date(entry.updatedAt).getTime()) / 36e5 < 24) {
            return { dados: entry, fonte: 'cache' };
        }
    } catch (e) {}

    // Busca ao vivo
    const dados = await _buscarPlayerAoVivo(playerId, gamerTag);
    _salvarPlayerLocal(playerId, gamerTag);
    return { dados, fonte: 'live' };
}

// A função carregarPlayersConhecidos não é mais usada, pois a busca depende apenas do localStorage.
// Mantemos a função filtrarPlayers para compatibilidade, mas não é usada.
function filtrarPlayers(lista, termo) {
    const t = termo.trim().toLowerCase();
    if (!t) return lista.slice(0, 15);
    return lista.filter(p => p.gamerTag.toLowerCase().includes(t)).slice(0, 15);
}

// Exporta a função de salvamento para ser usada no script.js (abrirAttendees)
window._salvarPlayerLocal = _salvarPlayerLocal;