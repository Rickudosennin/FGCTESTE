// ==================== HEAD TO HEAD ====================
// Reaproveita callStartGG() e STARTGG_KEY já definidos em script.js

// ---------- Resolução do input (ID numérico / slug-hash / gamertag) ----------

function extrairHashPerfil(valor) {
    const porUrl = valor.match(/user\/([a-zA-Z0-9_-]+)/i);
    if (porUrl) return porUrl[1];

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

    const user = json.data?.user;
    const player = user?.player;
    return {
        playerId: player?.id ? String(player.id) : null,
        userId: user?.id ? String(user.id) : null,
        gamerTag: player?.gamerTag || null
    };
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

    if (/^\d+$/.test(valor)) {
        return { playerId: valor };
    }

    const hash = extrairHashPerfil(valor);
    if (hash) {
        try {
            const resolvido = await resolverSlugParaPlayerId(hash);
            if (resolvido) return resolvido;
        } catch (e) { /* cai pro próximo método */ }
        return { erro: `Não encontrei um perfil de jogador associado ao código/slug "${hash}".` };
    }

    try {
        const resolvido = await resolverGamertagLocal(valor);
        if (resolvido) return resolvido;
    } catch (e) { /* segue pro erro abaixo */ }

    return { erro: `Não encontrei "${valor}" nos players conhecidos. Tente o ID numérico do player.` };
}

// ---------- Busca avançada dos sets entre os dois players ----------

async function buscarHeadToHead(player1Id, player2Id) {
    const queryComFiltro = `query HeadToHeadFiltered($p1: ID!, $p2: ID!) {
        player(id: $p1) {
            sets(perPage: 20, page: 1, filters: { playerIds: [$p2] }) {
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
                            participants {
                                id
                                gamerTag
                                user { id }
                                player { id gamerTag }
                            }
                        }
                        standing {
                            stats { score { value } }
                        }
                    }
                }
            }
        }
    }`;

    const querySemFiltro = `query PlayerRecentSets($p: ID!) {
        player(id: $p) {
            sets(perPage: 25, page: 1) {
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
                            participants {
                                id
                                gamerTag
                                user { id }
                                player { id gamerTag }
                            }
                        }
                        standing {
                            stats { score { value } }
                        }
                    }
                }
            }
        }
    }`;

    // Busca combinada em paralelo para cobrir inconsistências na API do start.gg
    const [f1, f2, r1, r2] = await Promise.all([
        callStartGG(queryComFiltro, { p1: String(player1Id), p2: String(player2Id) }).catch(() => ({})),
        callStartGG(queryComFiltro, { p1: String(player2Id), p2: String(player1Id) }).catch(() => ({})),
        callStartGG(querySemFiltro, { p: String(player1Id) }).catch(() => ({})),
        callStartGG(querySemFiltro, { p: String(player2Id) }).catch(() => ({}))
    ]);

    const mapaSets = new Map();
    const extrairNodes = (res) => res?.data?.player?.sets?.nodes || [];

    [...extrairNodes(f1), ...extrairNodes(f2), ...extrairNodes(r1), ...extrairNodes(r2)].forEach(s => {
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
        errors: f1.errors || f2.errors
    };
}

function normalizarTexto(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slotPertenceAPlayer(slot, pInfo) {
    if (!slot || !slot.entrant || !pInfo) return false;

    // 1. Validação por ID de Player ou User
    const participantes = slot.entrant.participants || [];
    for (const part of participantes) {
        if (pInfo.playerId && part.player?.id && String(part.player.id) === String(pInfo.playerId)) return true;
        if (pInfo.userId && part.user?.id && String(part.user.id) === String(pInfo.userId)) return true;
    }

    // 2. Validação resiliente por Gamertag (remove símbolos como . e -)
    const tagTarget = normalizarTexto(pInfo.gamerTag);
    if (!tagTarget) return false;

    for (const part of participantes) {
        const tagPart = normalizarTexto(part.gamerTag || part.player?.gamerTag);
        if (tagPart && (tagPart === tagTarget || (tagTarget.length >= 3 && tagPart.includes(tagTarget)) || (tagPart.length >= 3 && tagTarget.includes(tagPart)))) {
            return true;
        }
    }

    const entrantNorm = normalizarTexto(slot.entrant.name);
    if (entrantNorm && (entrantNorm === tagTarget || (tagTarget.length >= 3 && entrantNorm.includes(tagTarget)))) {
        return true;
    }

    return false;
}

function montarLinhaSet(set, p1Info, p2Info) {
    const slots = set.slots || [];
    if (slots.length < 2) return null;

    let slot1 = null;
    let slot2 = null;

    const isP1_slot0 = slotPertenceAPlayer(slots[0], p1Info);
    const isP1_slot1 = slotPertenceAPlayer(slots[1], p1Info);
    const isP2_slot0 = slotPertenceAPlayer(slots[0], p2Info);
    const isP2_slot1 = slotPertenceAPlayer(slots[1], p2Info);

    if (isP1_slot0 && isP2_slot1) {
        slot1 = slots[0];
        slot2 = slots[1];
    } else if (isP1_slot1 && isP2_slot0) {
        slot1 = slots[1];
        slot2 = slots[0];
    } else if (isP1_slot0 && !isP1_slot1) {
        slot1 = slots[0];
        slot2 = slots[1];
    } else if (isP1_slot1 && !isP1_slot0) {
        slot1 = slots[1];
        slot2 = slots[0];
    } else if (isP2_slot0 && !isP2_slot1) {
        slot1 = slots[1];
        slot2 = slots[0];
    } else if (isP2_slot1 && !isP2_slot0) {
        slot1 = slots[0];
        slot2 = slots[1];
    } else {
        // Fallback para garantir que o set retornado não seja descartado
        slot1 = slots[0];
        slot2 = slots[1];
    }

    if (!slot1 || !slot2) return null;

    const score1 = slot1.standing?.stats?.score?.value;
    const score2 = slot2.standing?.stats?.score?.value;

    if (score1 === -1 || score2 === -1 || (set.displayScore && set.displayScore.toUpperCase().includes('DQ'))) {
        return null;
    }

    const winner = (set.winnerId && String(set.winnerId) === String(slot1.entrant?.id)) ? 0 : 
                   ((set.winnerId && String(set.winnerId) === String(slot2.entrant?.id)) ? 1 : -1);

    const venceuP1 = winner === 0;
    const venceuP2 = winner === 1;

    const timestamp = set.startAt || 0;
    const data = timestamp ? new Date(timestamp * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const torneio = set.event?.tournament?.name || 'Torneio';
    const evento = set.event?.name || '';
    const fase = set.fullRoundText || '';

    return {
        setId: set.id,
        startAt: timestamp,
        data,
        torneio,
        evento,
        fase,
        nome1: slot1.entrant?.name || p1Info.gamerTag || '?',
        nome2: slot2.entrant?.name || p2Info.gamerTag || '?',
        score1: score1 ?? (set.displayScore || '-'),
        score2: score2 ?? '',
        venceuP1,
        venceuP2,
        winner,
        score: [score1, score2],
        usaDisplayScoreCru: (score1 === null || score1 === undefined) && (score2 === null || score2 === undefined)
    };
}

function montarHtmlH2H(linhas, gamerTag1, gamerTag2) {
    if (linhas.length === 0) {
        return '<div class="text-slate-500 text-sm text-center py-8">Nenhum confronto encontrado entre esses dois players.</div>';
    }

    const winsP1 = linhas.filter(l => l.venceuP1).length;
    const winsP2 = linhas.filter(l => l.venceuP2).length;
    const nome1 = gamerTag1 || linhas[0].nome1;
    const nome2 = gamerTag2 || linhas[0].nome2;

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

        if (String(res1.playerId) === String(res2.playerId)) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Os dois players resolveram pro mesmo ID. Confira os dados digitados.</div>';
            return;
        }

        resultadoDiv.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Buscando confrontos...</p></div>';

        try {
            const json = await buscarHeadToHead(res1.playerId, res2.playerId);

            if (json.errors && json.errors.length > 0) {
                const det = json.errors[0]?.message || 'Erro desconhecido na API.';
                resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Erro na API do start.gg: ${det}</div>`;
                return;
            }

            const nodes = json.data?.player?.sets?.nodes || [];

            const linhas = nodes
                .map(set => montarLinhaSet(set, res1, res2))
                .filter(Boolean)
                .sort((a, b) => (b.startAt - a.startAt) || String(b.setId).localeCompare(String(a.setId)))
                .slice(0, 10);

            resultadoDiv.innerHTML = montarHtmlH2H(linhas, res1.gamerTag, res2.gamerTag);
        } catch (e) {
            resultadoDiv.innerHTML = '<div class="text-red-500 text-sm text-center py-8">Erro de conexão ao buscar confrontos. Tente novamente.</div>';
        }
    });
});