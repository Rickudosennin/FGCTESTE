// ==================== HEAD TO HEAD ====================
// Reaproveita callStartGG() e STARTGG_KEY já definidos em script.js

// ---------- Resolução do input (ID numérico / slug-hash / gamertag) ----------

function extrairHashPerfil(valor) {
    // Captura o slug quando informado no formato user/SLUG, URL (ex: start.gg/user/c8cc13b9) ou caminho relativo
    const porUrl = valor.match(/user\/([a-zA-Z0-9_-]+)/i);
    if (porUrl) return porUrl[1];

    // Hash/slug puro colado direto (ex: c8cc13b9)
    if (/^[a-f0-9]{6,12}$/i.test(valor) && /[a-f]/i.test(valor)) return valor;

    return null;
}

async function resolverSlugParaPlayerId(hash) {
    const slugFormatado = hash.startsWith('user/') ? hash : `user/${hash}`;
    const query = `query UserBySlug($slug: String) { user(slug: $slug) { id player { id gamerTag } } }`;
    const json = await callStartGG(query, { slug: slugFormatado });

    if (json.errors && json.errors.length > 0) {
        console.error('Erro na API start.gg (UserBySlug):', json.errors);
        return null;
    }

    const player = json.data?.user?.player;
    return player?.id ? { playerId: String(player.id), gamerTag: player.gamerTag } : null;
}

async function resolverGamertagLocal(termo) {
    if (typeof carregarPlayersConhecidos !== 'function' || typeof filtrarPlayers !== 'function') return null;
    const lista = await carregarPlayersConhecidos();
    const encontrados = filtrarPlayers(lista, termo);
    if (!encontrados || encontrados.length === 0) return null;
    const exato = encontrados.find(p => p.gamerTag.toLowerCase() === termo.toLowerCase());
    const escolhido = exato || encontrados[0];
    return { playerId: String(escolhido.playerId), gamerTag: escolhido.gamerTag };
}

async function resolverInputPlayer(valorBruto) {
    const valor = (valorBruto || '').trim();
    if (!valor) return { erro: 'Campo vazio.' };

    // 1. ID numérico puro -> usa direto, sem chamada extra
    if (/^\d+$/.test(valor)) {
        return { playerId: valor };
    }

    // 2. Código/slug/hash do perfil ou URL do start.gg (aceita user/c8cc13b9, c8cc13b9, etc.)
    const hash = extrairHashPerfil(valor);
    if (hash) {
        try {
            const resolvido = await resolverSlugParaPlayerId(hash);
            if (resolvido) return resolvido;
        } catch (e) { /* cai pro próximo método */ }
        return { erro: `Não encontrei um perfil de jogador associado ao código/slug "${hash}".` };
    }

    // 3. Gamertag: busca na lista de players já conhecidos/cacheados pelo HUB
    try {
        const resolvido = await resolverGamertagLocal(valor);
        if (resolvido) return resolvido;
    } catch (e) { /* segue pro erro abaixo */ }

    return { erro: `Não encontrei "${valor}" nos players conhecidos. Tente o ID numérico do player.` };
}

// ---------- Busca dos sets entre os dois players ----------

async function buscarHeadToHead(player1Id, player2Id) {
    const query = `query HeadToHead($p1: ID!, $p2: ID!) {
        player(id: $p1) {
            id
            gamerTag
            sets(perPage: 25, page: 1, filters: { playerIds: [$p2] }) {
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

    // Executa a busca em ambos os sentidos para garantir todos os confrontos indexados na API
    const [res1, res2] = await Promise.all([
        callStartGG(query, { p1: String(player1Id), p2: String(player2Id) }),
        callStartGG(query, { p1: String(player2Id), p2: String(player1Id) })
    ]);

    const nodes1 = res1.data?.player?.sets?.nodes || [];
    const nodes2 = res2.data?.player?.sets?.nodes || [];

    // Mescla e remove duplicados pelo ID do set
    const mapaSets = new Map();
    [...nodes1, ...nodes2].forEach(s => {
        if (s && s.id) mapaSets.set(s.id, s);
    });

    return {
        data: {
            player: {
                sets: {
                    nodes: Array.from(mapaSets.values())
                }
            }
        },
        errors: res1.errors || res2.errors
    };
}

function encontrarSlot(set, playerId) {
    return (set.slots || []).find(slot =>
        slot.entrant?.participants?.some(p => String(p.player?.id) === String(playerId))
    );
}

function montarLinhaSet(set, p1Id, p2Id) {
    let slot1 = encontrarSlot(set, p1Id);
    let slot2 = encontrarSlot(set, p2Id);

    // Se o player.id não veio preenchido no participante do set antigo, deduce pelo slot restante
    if (set.slots && set.slots.length === 2) {
        if (slot1 && !slot2) slot2 = set.slots.find(s => s !== slot1);
        if (slot2 && !slot1) slot1 = set.slots.find(s => s !== slot2);
    }

    if (!slot1 || !slot2) return null;

    const score1 = slot1.standing?.stats?.score?.value;
    const score2 = slot2.standing?.stats?.score?.value;

    // Ignora partidas com desqualificação (DQ / score -1)
    if (score1 === -1 || score2 === -1 || (set.displayScore && set.displayScore.toUpperCase().includes('DQ'))) {
        return null;
    }

    const venceuP1 = set.winnerId && String(set.winnerId) === String(slot1.entrant?.id);
    const venceuP2 = set.winnerId && String(set.winnerId) === String(slot2.entrant?.id);

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

function montarHtmlH2H(linhas) {
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
        const bruto1 = inputP1.value.trim();
        const bruto2 = inputP2.value.trim();

        if (!bruto1 || !bruto2) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Preencha os dois players.</div>';
            return;
        }

        resultadoDiv.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Identificando players...</p></div>';

        const [res1, res2] = await Promise.all([resolverInputPlayer(bruto1), resolverInputPlayer(bruto2)]);

        if (res1.erro) { resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Player 1: ${res1.erro}</div>`; return; }
        if (res2.erro) { resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Player 2: ${res2.erro}</div>`; return; }

        const p1Id = res1.playerId;
        const p2Id = res2.playerId;

        if (String(p1Id) === String(p2Id)) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Os dois players resolveram pro mesmo ID. Confira os dados digitados.</div>';
            return;
        }

        resultadoDiv.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Buscando confrontos...</p></div>';

        try {
            const json = await buscarHeadToHead(p1Id, p2Id);

            if (json.errors && json.errors.length > 0) {
                const det = json.errors[0]?.message || 'Erro desconhecido na API.';
                resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Erro na API do start.gg: ${det}</div>`;
                return;
            }

            const nodes = json.data?.player?.sets?.nodes || [];

            const linhas = nodes
                .map(set => montarLinhaSet(set, p1Id, p2Id))
                .filter(Boolean)
                .sort((a, b) => b.startAt - a.startAt)
                .slice(0, 20);

            resultadoDiv.innerHTML = montarHtmlH2H(linhas);
        } catch (e) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Erro de conexão ao buscar confrontos. Tente novamente.</div>';
        }
    });
});