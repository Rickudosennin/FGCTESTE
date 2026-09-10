// ==================== HEAD TO HEAD ====================
// Reaproveita callStartGG() e STARTGG_KEY já definidos em script.js

// ---------- Resolução do input (ID numérico / slug-hash / gamertag) ----------

function extrairHashPerfil(valor) {
    const porUrl = valor.match(/user\/([a-f0-9]{6,12})/i);
    if (porUrl) return porUrl[1];
    if (/^[a-f0-9]{6,12}$/i.test(valor) && /[a-f]/i.test(valor)) return valor;
    return null;
}

async function resolverSlugParaPlayerId(hash) {
    const query = `query UserBySlug($slug: String) { user(slug: $slug) { player { id gamerTag } } }`;
    const json = await callStartGG(query, { slug: `user/${hash}` });
    if (json.errors) throw new Error(json.errors[0]?.message || 'erro ao resolver perfil');
    const player = json.data?.user?.player;
    return player?.id ? { playerId: player.id, gamerTag: player.gamerTag } : null;
}

async function resolverGamertagLocal(termo) {
    if (typeof carregarPlayersConhecidos !== 'function' || typeof filtrarPlayers !== 'function') return null;
    const lista = await carregarPlayersConhecidos();
    const encontrados = filtrarPlayers(lista, termo);
    if (!encontrados || encontrados.length === 0) return null;
    const exato = encontrados.find(p => p.gamerTag.toLowerCase() === termo.toLowerCase());
    const escolhido = exato || encontrados[0];
    return { playerId: escolhido.playerId, gamerTag: escolhido.gamerTag };
}

async function resolverInputPlayer(valorBruto) {
    const valor = (valorBruto || '').trim();
    if (!valor) return { erro: 'Campo vazio.' };

    if (/^\d+$/.test(valor)) {
        return { playerId: valor };
    }

    const hash = extrairHashPerfil(valor);
    if (hash) {
        try {
            const resolvido = await resolverSlugParaPlayerId(hash);
            if (resolvido) return resolvido;
            return { erro: `O perfil "${hash}" existe, mas não tem um Player vinculado no start.gg (nunca competiu em torneios com check-in por Player).` };
        } catch (e) {
            return { erro: `Falha ao resolver o código "${hash}": ${e.message}` };
        }
    }

    try {
        const resolvido = await resolverGamertagLocal(valor);
        if (resolvido) return resolvido;
    } catch (e) { /* segue pro erro abaixo */ }

    return { erro: `Não encontrei "${valor}" nos players conhecidos. Tente o ID numérico ou o código do perfil.` };
}

// ---------- Busca dos sets entre os dois players ----------

async function buscarHeadToHead(player1Id, player2Id, perPage, page) {
    const query = `query HeadToHead($p1: ID!, $p2: ID!, $perPage: Int!, $page: Int!) {
        player(id: $p1) {
            id
            sets(perPage: $perPage, page: $page, filters: { playerIds: [$p2] }) {
                pageInfo { total }
                nodes {
                    id
                    startAt
                    fullRoundText
                    winnerId
                    displayScore
                    event {
                        name
                        tournament { name }
                    }
                    slots {
                        entrant {
                            id
                            name
                            participants { player { id } }
                        }
                        standing { stats { score { value } } }
                    }
                }
            }
        }
    }`;
    return await callStartGG(query, { p1: player1Id, p2: player2Id, perPage, page });
}

// Testa tamanhos de página decrescentes até a API aceitar a complexidade,
// depois usa pageInfo.total (o total real de confrontos, segundo a própria API)
// pra saber com certeza se precisa buscar mais páginas até chegar em 20.
async function buscarTodosOsSets(p1Id, p2Id) {
    const TENTATIVAS_PERPAGE = [15, 10, 6, 3];
    let perPageOk = null;
    let nodes = [];
    let total = null;
    let ultimoErro = null;

    for (const tentativa of TENTATIVAS_PERPAGE) {
        const json = await buscarHeadToHead(p1Id, p2Id, tentativa, 1);
        if (json.errors) {
            ultimoErro = json.errors[0]?.message || 'Erro desconhecido da API.';
            continue;
        }
        perPageOk = tentativa;
        const setsConn = json.data?.player?.sets;
        nodes = setsConn?.nodes || [];
        total = setsConn?.pageInfo?.total ?? nodes.length;
        break;
    }

    if (perPageOk === null) {
        return { erro: ultimoErro || 'Não foi possível consultar a API.' };
    }

    const alvo = Math.min(total, 20);
    let page = 2;
    while (nodes.length < alvo && page <= 8) {
        const json = await buscarHeadToHead(p1Id, p2Id, perPageOk, page);
        if (json.errors) break;
        const novos = json.data?.player?.sets?.nodes || [];
        if (novos.length === 0) break;
        nodes = nodes.concat(novos);
        page++;
    }

    return { nodes, total };
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
    const nomeEvento = set.event?.name || '';
    const evento = (nomeEvento && nomeEvento !== torneio) ? nomeEvento : '';
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

function montarHtmlH2H(linhas, totalReportadoPelaApi) {
    if (linhas.length === 0) {
        return '<div class="text-slate-500 text-sm text-center py-8">Nenhum confronto encontrado entre esses dois players.</div>';
    }

    const winsP1 = linhas.filter(l => l.venceuP1).length;
    const winsP2 = linhas.filter(l => l.venceuP2).length;
    const nome1 = linhas[0].nome1;
    const nome2 = linhas[0].nome2;
    const avisoTotal = totalReportadoPelaApi > linhas.length
        ? `<p class="text-slate-500 text-[11px] text-center mb-4">Mostrando os ${linhas.length} mais recentes de ${totalReportadoPelaApi} confrontos no total.</p>`
        : '';

    let html = `
        <div class="glass-card p-6 rounded-xl mb-2 h2h-summary">
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
        ${avisoTotal}
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
            const resultado = await buscarTodosOsSets(p1Id, p2Id);

            if (resultado.erro) {
                resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Erro na API do start.gg: ${resultado.erro}</div>`;
                return;
            }

            const linhas = resultado.nodes
                .map(set => montarLinhaSet(set, p1Id, p2Id))
                .filter(Boolean)
                .sort((a, b) => b.startAt - a.startAt)
                .slice(0, 20);

            resultadoDiv.innerHTML = montarHtmlH2H(linhas, resultado.total);
        } catch (e) {
            resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Erro ao buscar confrontos: ${e.message}</div>`;
        }
    });
});