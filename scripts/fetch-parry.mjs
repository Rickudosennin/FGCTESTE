// Roda dentro do GitHub Actions (Node 20+, fetch nativo).
// Chama a API do parry.gg servidor-a-servidor (sem header Origin de navegador,
// então não sofre o bloqueio 403 que ocorre em chamadas feitas do browser).
// A key vive só como secret do GitHub Actions (PARRY_API_KEY), nunca no repo.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const PARRY_API = 'https://grpcweb.parry.gg';
const API_KEY = process.env.PARRY_API_KEY;

if (!API_KEY) {
    console.error('PARRY_API_KEY não definida nos secrets do repositório. Abortando.');
    process.exit(1);
}

const games = JSON.parse(readFileSync(join(ROOT, 'data', 'parry-games.json'), 'utf-8'));

// O nome exato do campo de paginação não foi confirmado na documentação/testes manuais
// (a API retornou "buffer size exceeded" sem paginação, e ignorou campos não reconhecidos
// sem erro). Por isso tentamos alguns formatos comuns em ordem, até um funcionar.
function buildAttempts(gameId) {
    const base = { filter: { gameIds: [gameId] } };
    return [
        { ...base, pageSize: 12, page: 1 },
        { ...base, query: { page: 1, perPage: 12 } },
        { ...base, pagination: { page: 1, pageSize: 12 } },
        { ...base }
    ];
}

async function callParryGG(service, method, body) {
    const res = await fetch(`${PARRY_API}/parrygg.services.${service}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
        body: JSON.stringify(body)
    });
    const text = await res.text();
    let parsed;
    try {
        parsed = text ? JSON.parse(text) : {};
    } catch {
        throw new Error(`HTTP ${res.status} — corpo não-JSON: ${text.slice(0, 200)}`);
    }
    if (!res.ok || parsed.code) {
        throw new Error(`HTTP ${res.status} — code:${parsed.code} — ${text.slice(0, 200)}`);
    }
    return parsed;
}

async function fetchTournamentsForGame(game) {
    for (const body of buildAttempts(game.gameId)) {
        try {
            const json = await callParryGG('TournamentService', 'GetTournaments', body);
            return json.tournaments || json.data || [];
        } catch (e) {
            console.warn(`[${game.label}] tentativa falhou: ${e.message}`);
        }
    }
    console.warn(`[${game.label}] todas as tentativas de paginação falharam — salvando lista vazia. Ajuste buildAttempts() em scripts/fetch-parry.mjs quando descobrir o formato correto.`);
    return [];
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
    const result = { updatedAt: new Date().toISOString(), games: {} };
    for (const game of games) {
        const tournaments = await fetchTournamentsForGame(game);
        result.games[game.gameId] = { label: game.label, tournaments };
        console.log(`[${game.label}] ${tournaments.length} torneio(s)`);
        await sleep(400); // evita martelar a API
    }
    writeFileSync(join(ROOT, 'data', 'parry-tournaments.json'), JSON.stringify(result, null, 2));
    console.log('data/parry-tournaments.json atualizado.');
}

main().catch(e => {
    console.error('Erro fatal:', e);
    process.exit(1);
});
