// ==================== PROCESSAMENTO HEAD TO HEAD ====================
function processarHeadToHead(historicoSets, playerIdAtual) {
    const rivaisMap = new Map();

    historicoSets.forEach(set => {
        // Identifica quem é o oponente no set
        const slots = set.slots || [];
        const oponenteSlot = slots.find(s => String(s.entrant?.id) !== String(playerIdAtual));
        const jogadorSlot = slots.find(s => String(s.entrant?.id) === String(playerIdAtual));

        if (!oponenteSlot || !oponenteSlot.entrant) return;

        const oponenteId = oponenteSlot.entrant.id;
        const oponenteTag = oponenteSlot.entrant.name || 'Oponente Desconhecido';
        const venceu = set.winnerId === jogadorSlot?.entrant?.id;

        if (!rivaisMap.has(oponenteId)) {
            rivaisMap.set(oponenteId, {
                oponenteId,
                gamerTag: oponenteTag,
                wins: 0,
                losses: 0,
                totalSets: 0,
                matches: []
            });
        }

        const rival = rivaisMap.get(oponenteId);
        rival.totalSets += 1;
        if (venceu) {
            rival.wins += 1;
        } else {
            rival.losses += 1;
        }

        rival.matches.push({
            tournamentName: set.event?.tournament?.name || 'Torneio',
            eventName: set.event?.name || 'Evento',
            fullScore: set.displayScore || '—',
            result: venceu ? 'W' : 'L',
            round: set.fullRoundText || '—',
            date: set.completedAt ? new Date(set.completedAt * 1000).toLocaleDateString('pt-BR') : '—'
        });
    });

    // Converte para array e ordena pelos mais enfrentados
    const listaRivais = Array.from(rivaisMap.values()).map(r => ({
        ...r,
        winrate: Math.round((r.wins / r.totalSets) * 100)
    }));

    return listaRivais.sort((a, b) => b.totalSets - a.totalSets);
}

// ==================== RENDERIZAÇÃO DA INTERFACE (Estilo Supermajor) ====================
function renderizarH2H(listaRivais, containerId = 'tab_vs_content') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!listaRivais || listaRivais.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">Nenhum histórico de confronto encontrado.</div>';
        return;
    }

    let html = `
        <div class="mb-4">
            <input type="text" id="h2h_search" placeholder="Buscar oponente..." 
                   class="w-full bg-gray-800 text-white rounded px-4 py-2 border border-gray-700 focus:outline-none focus:border-red-500"
                   onkeyup="filtrarRivaisH2H()">
        </div>
        <div class="space-y-3" id="h2h_list">
    `;

    listaRivais.forEach(r => {
        const isDominating = r.wins > r.losses;
        const isTied = r.wins === r.losses;
        const scoreColor = isDominating ? 'text-green-400' : (isTied ? 'text-yellow-400' : 'text-red-400');

        html += `
            <div class="rival-card bg-gray-900 border border-gray-800 rounded-lg p-4 transition-all hover:border-gray-700" data-tag="${r.gamerTag.toLowerCase()}">
                <div class="flex items-center justify-between cursor-pointer" onclick="toggleRivalDetails('${r.oponenteId}')">
                    <div class="flex items-center space-x-3">
                        <div class="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-300">
                            ${r.gamerTag.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h4 class="font-bold text-white text-lg">${r.gamerTag}</h4>
                            <p class="text-xs text-gray-400">${r.totalSets} ${r.totalSets === 1 ? 'set disputado' : 'sets disputados'}</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center space-x-6">
                        <div class="text-right">
                            <span class="text-2xl font-black ${scoreColor}">${r.wins} - ${r.losses}</span>
                            <div class="text-xs text-gray-400">${r.winrate}% taxa de vitória</div>
                        </div>
                        <span class="text-gray-500 transform transition-transform" id="arrow_${r.oponenteId}">▼</span>
                    </div>
                </div>

                <!-- Lista de Lutas Expandível -->
                <div id="details_${r.oponenteId}" class="hidden mt-4 pt-3 border-t border-gray-800 space-y-2">
                    ${r.matches.map(m => `
                        <div class="flex items-center justify-between text-sm bg-gray-800/50 p-2 rounded">
                            <div>
                                <span class="font-semibold text-gray-200">${m.tournamentName}</span>
                                <span class="text-xs text-gray-400 ml-2">(${m.round})</span>
                            </div>
                            <div class="flex items-center space-x-3">
                                <span class="text-xs text-gray-400">${m.date}</span>
                                <span class="font-mono ${m.result === 'W' ? 'text-green-400' : 'text-red-400'} font-bold">
                                    ${m.fullScore}
                                </span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

// ==================== AUXILIARES DE INTERAÇÃO ====================
function toggleRivalDetails(oponenteId) {
    const details = document.getElementById(`details_${oponenteId}`);
    const arrow = document.getElementById(`arrow_${oponenteId}`);
    if (details) {
        details.classList.toggle('hidden');
        if (arrow) arrow.classList.toggle('rotate-180');
    }
}

function filtrarRivaisH2H() {
    const termo = document.getElementById('h2h_search').value.toLowerCase();
    const cards = document.querySelectorAll('.rival-card');
    cards.forEach(card => {
        const tag = card.getAttribute('data-tag');
        card.style.display = tag.includes(termo) ? 'block' : 'none';
    });
}