// ==================== HEAD TO HEAD ====================
// Reaproveita callStartGG() e STARTGG_KEY já definidos em script.js

async function buscarHeadToHead(player1Id, player2Id) {
    const query = `query HeadToHead($p1: ID!, $p2: ID!) {
        player(id: $p1) {
            id
            gamerTag
            sets(perPage: 60, page: 1, filters: { playerIds: [$p2] }) {
                nodes {
                    id
                    startAt
                    fullRoundText
                    winnerId
                    displayScore
                    event {
                        id
                        name
                        tournament { id name }
                    }
                    slots {
                        entrant {
                            id
                            name
                            participants { player { id gamerTag } }
                        }
                        standing {
                            stats { score { value } }
                        }
                    }
                }
            }
        }
    }`;
    return await callStartGG(query, { p1: player1Id, p2: player2Id });
}

function encontrarSlot(set, playerId) {
    return (set.slots || []).find(slot =>
        slot.entrant?.participants?.some(p => String(p.player?.id) === String(playerId))
    );
}

function montarLinhaSet(set, p1Id, p2Id) {
    const slot1 = encontrarSlot(set, p1Id);
    const slot2 = encontrarSlot(set, p2Id);
    if (!slot1 || !slot2 || (set.slots || []).length !== 2) return null;

    const score1 = slot1.standing?.stats?.score?.value;
    const score2 = slot2.standing?.stats?.score?.value;
    const venceuP1 = set.winnerId && String(set.winnerId) === String(slot1.entrant.id);
    const venceuP2 = set.winnerId && String(set.winnerId) === String(slot2.entrant.id);

    const data = set.startAt ? new Date(set.startAt * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const torneio = set.event?.tournament?.name || 'Torneio';
    const evento = set.event?.name || '';
    const fase = set.fullRoundText || '';

    return {
        startAt: set.startAt || 0,
        data, torneio, evento, fase,
        nome1: slot1.entrant?.name || '?',
        nome2: slot2.entrant?.name || '?',
        score1: score1 ?? (set.displayScore || '-'),
        score2: score2 ?? '',
        venceuP1, venceuP2,
        usaDisplayScoreCru: (score1 === null || score1 === undefined) && (score2 === null || score2 === undefined)
    };
}

function montarHtmlH2H(linhas, p1Id, p2Id) {
    if (linhas.length === 0) {
        return '<div class="text-slate-500 text-sm text-center py-8">Nenhum confronto encontrado entre esses dois players.</div>';
    }

    const winsP1 = linhas.filter(l => l.venceuP1).length;
    const winsP2 = linhas.filter(l => l.venceuP2).length;
    const nome1 = linhas[0].nome1;
    const nome2 = linhas[0].nome2;

    let html = `
        <div class="glass-card p-6 rounded-xl mb-6 h2h-summary">
            <div class="h2h-summary-player">
                <span class="h2h-name">${nome1}</span>
                <span class="h2h-score h2h-score-${winsP1 >= winsP2 ? 'lead' : 'behind'}">${winsP1}</span>
            </div>
            <div class="h2h-summary-vs">VS</div>
            <div class="h2h-summary-player h2h-summary-player-right">
                <span class="h2h-score h2h-score-${winsP2 >= winsP1 ? 'lead' : 'behind'}">${winsP2}</span>
                <span class="h2h-name">${nome2}</span>
            </div>
        </div>
        <div class="h2h-list">
    `;

    linhas.forEach(l => {
        html += `
            <div class="h2h-set-row">
                <div class="h2h-set-score ${l.venceuP1 ? 'h2h-winner' : (l.venceuP2 ? 'h2h-loser' : '')}">
                    ${l.usaDisplayScoreCru ? '' : l.score1}
                </div>
                <div class="h2h-set-info">
                    <div class="h2h-set-torneio">${l.torneio}${l.evento ? ' — ' + l.evento : ''}</div>
                    <div class="h2h-set-sub">${l.fase}${l.data ? ' · ' + l.data : ''}${l.usaDisplayScoreCru ? ' · ' + l.score1 : ''}</div>
                </div>
                <div class="h2h-set-score ${l.venceuP2 ? 'h2h-winner' : (l.venceuP1 ? 'h2h-loser' : '')}">
                    ${l.usaDisplayScoreCru ? '' : l.score2}
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btn_buscar_h2h');
    const inputP1 = document.getElementById('input_p1');
    const inputP2 = document.getElementById('input_p2');
    const resultadoDiv = document.getElementById('h2h_resultado');

    btn.addEventListener('click', async () => {
        const p1Id = inputP1.value.trim();
        const p2Id = inputP2.value.trim();

        if (!p1Id || !p2Id) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Preencha os dois IDs.</div>';
            return;
        }
        if (p1Id === p2Id) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Os dois IDs precisam ser diferentes.</div>';
            return;
        }

        resultadoDiv.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Buscando confrontos...</p></div>';

        try {
            const json = await buscarHeadToHead(p1Id, p2Id);
            const nodes = json.data?.player?.sets?.nodes || [];

            if (json.errors) {
                resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">ID de player inválido ou não encontrado.</div>';
                return;
            }

            const linhas = nodes
                .map(set => montarLinhaSet(set, p1Id, p2Id))
                .filter(Boolean)
                .sort((a, b) => b.startAt - a.startAt)
                .slice(0, 20);

            resultadoDiv.innerHTML = montarHtmlH2H(linhas, p1Id, p2Id);
        } catch (e) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Erro ao buscar confrontos. Tente novamente.</div>';
        }
    });
});
