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

// ---------- Busca dos sets ----------
// IMPORTANTE: o filtro "filters: { playerIds: [...] }" no campo player.sets
// não restringe de fato pelo adversário na API pública do start.gg (retorna
// o histórico inteiro do player, ignorando o filtro). Por isso a estratégia
// aqui é varrer o histórico de sets de UM dos players, página por página, e
// filtrar no navegador quem realmente jogou contra o outro — igual ao que
// o resto do HUB já faz pro histórico por torneio.

const H2H_PERPAGE = 20;
const H2H_MAX_PAGINAS = 30; // até 600 sets revisados

async function buscarPaginaDeSets(playerId, perPage, page) {
    const query = `query PlayerSets($p: ID!, $perPage: Int!, $page: Int!) {
        player(id: $p) {
            id
            sets(perPage: $perPage, page: $page) {
                pageInfo { total }
                nodes {
                    id
                    startAt
                    fullRoundText
                    winnerId
                    displayScore
                    event {
                        name
                        startAt
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
    return await callStartGG(query, { p: playerId, perPage, page });
}

async function buscarTodosOsSets(p1Id, p2Id, onProgress) {
    // Pega a 1ª página de cada um só pra saber quem tem menos sets no total
    // (varrer o histórico do que joga menos garante cobertura completa com menos requisições)
    const [primeiraP1, primeiraP2] = await Promise.all([
        buscarPaginaDeSets(p1Id, H2H_PERPAGE, 1),
        buscarPaginaDeSets(p2Id, H2H_PERPAGE, 1)
    ]);

    if (primeiraP1.errors && primeiraP2.errors) {
        return { erro: primeiraP1.errors[0]?.message || primeiraP2.errors[0]?.message || 'Erro desconhecido da API.' };
    }

    const totalP1 = primeiraP1.errors ? Infinity : (primeiraP1.data?.player?.sets?.pageInfo?.total ?? Infinity);
    const totalP2 = primeiraP2.errors ? Infinity : (primeiraP2.data?.player?.sets?.pageInfo?.total ?? Infinity);

    let baseId, jsonAtual;
    if (totalP1 <= totalP2) { baseId = p1Id; jsonAtual = primeiraP1; }
    else { baseId = p2Id; jsonAtual = primeiraP2; }

    let matches = [];
    let pagina = 1;

    while (pagina <= H2H_MAX_PAGINAS) {
        if (jsonAtual.errors) {
            return { erro: jsonAtual.errors[0]?.message || 'Erro desconhecido da API.', matches };
        }

        const nodes = jsonAtual.data?.player?.sets?.nodes || [];
        nodes.forEach(set => {
            const linha = montarLinhaSet(set, p1Id, p2Id);
            if (linha) matches.push(linha);
        });

        if (onProgress) onProgress(pagina, matches.length);

        if (nodes.length < H2H_PERPAGE) break; // acabou o histórico desse player
        if (matches.length >= 20) break;

        pagina++;
        jsonAtual = await buscarPaginaDeSets(baseId, H2H_PERPAGE, pagina);
    }

    return {
        matches,
        setsRevisados: pagina * H2H_PERPAGE,
        esgotouLimite: pagina > H2H_MAX_PAGINAS
    };
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

    // Ignora sets de equipe (ex: crew battles, squad strikes 5x5) onde cada
    // "lado" é um time inteiro em vez de 1 jogador — não é um confronto real
    // entre os dois players buscados, mesmo que ambos estejam nos times.
    const p1SozinhoNoLado = (slot1.entrant?.participants || []).length === 1;
    const p2SozinhoNoLado = (slot2.entrant?.participants || []).length === 1;
    if (!p1SozinhoNoLado || !p2SozinhoNoLado) return null;

    const score1 = slot1.standing?.stats?.score?.value;
    const score2 = slot2.standing?.stats?.score?.value;
    const venceuP1 = set.winnerId && String(set.winnerId) === String(slot1.entrant.id);
    const venceuP2 = set.winnerId && String(set.winnerId) === String(slot2.entrant.id);

    const startAtReal = set.startAt || set.event?.startAt || 0;
    const data = startAtReal ? new Date(startAtReal * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const torneio = set.event?.tournament?.name || 'Torneio';
    const nomeEvento = set.event?.name || '';
    const evento = (nomeEvento && nomeEvento !== torneio) ? nomeEvento : '';
    const fase = set.fullRoundText || '';

    return {
        startAt: startAtReal,
        data, torneio, evento, fase,
        nome1: slot1.entrant?.name || '?',
        nome2: slot2.entrant?.name || '?',
        score1: score1 ?? (set.displayScore || '-'),
        score2: score2 ?? '',
        venceuP1, venceuP2,
        usaDisplayScoreCru: (score1 === null || score1 === undefined) && (score2 === null || score2 === undefined)
    };
}

function montarHtmlH2H(linhas, esgotouLimite) {
    if (linhas.length === 0) {
        return '<div class="text-slate-500 text-sm text-center py-8">Nenhum confronto encontrado entre esses dois players (revisei o histórico completo de ambos).</div>';
    }

    const winsP1 = linhas.filter(l => l.venceuP1).length;
    const winsP2 = linhas.filter(l => l.venceuP2).length;
    const nome1 = linhas[0].nome1;
    const nome2 = linhas[0].nome2;
    const aviso = esgotouLimite
        ? `<p class="text-slate-500 text-[11px] text-center mb-4">Revisei os sets mais recentes de ambos — pode haver confrontos mais antigos que não foram checados.</p>`
        : `<p class="text-slate-500 text-[11px] text-center mb-4">Histórico completo revisado — esses são todos os confrontos registrados entre os dois no start.gg.</p>`;

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
        ${aviso}
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

        resultadoDiv.innerHTML = '<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Revisando o histórico dos players...</p></div>';

        try {
            const resultado = await buscarTodosOsSets(p1Id, p2Id, (pagina, encontrados) => {
                resultadoDiv.innerHTML = `<div class="loading-attendees"><div class="spinner"></div><p style="margin-top:15px;">Revisando histórico (página ${pagina}) — ${encontrados} confronto(s) encontrado(s)...</p></div>`;
            });

            if (resultado.erro && (!resultado.matches || resultado.matches.length === 0)) {
                resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Erro na API do start.gg: ${resultado.erro}</div>`;
                return;
            }

            const linhas = (resultado.matches || [])
                .sort((a, b) => b.startAt - a.startAt)
                .slice(0, 20);

            resultadoDiv.innerHTML = montarHtmlH2H(linhas, resultado.esgotouLimite);
        } catch (e) {
            resultadoDiv.innerHTML = `<div class="text-red-500 text-sm text-center py-8">Erro ao buscar confrontos: ${e.message}</div>`;
        }
    });
});