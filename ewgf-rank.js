(() => {
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const CACHE_PREFIX = 'fgchub:ewgf:rank:v2:';
    const RANKS_BY_CODE = Object.freeze({
        0: { name: 'Beginner', asset: 'nyumonsei' },
        1: { name: '1st Dan', asset: 'shodan' },
        2: { name: '2nd Dan', asset: '2dan' },
        3: { name: 'Fighter', asset: 'yushi' },
        4: { name: 'Strategist', asset: 'sakushi' },
        5: { name: 'Combatant', asset: 'toushi' },
        6: { name: 'Brawler', asset: 'garou' },
        7: { name: 'Ranger', asset: 'arawashi' },
        8: { name: 'Cavalry', asset: 'mouzou' },
        9: { name: 'Warrior', asset: 'gouken' },
        10: { name: 'Assailant', asset: 'jaken' },
        11: { name: 'Dominator', asset: 'kaiken' },
        12: { name: 'Vanquisher', asset: 'shura' },
        13: { name: 'Destroyer', asset: 'rasetsu' },
        14: { name: 'Eliminator', asset: 'raketsu' },
        15: { name: 'Garyu', asset: 'garyu' },
        16: { name: 'Shinryu', asset: 'shinryu' },
        17: { name: 'Tenryu', asset: 'tenryu' },
        18: { name: 'Mighty Ruler', asset: 'kentei' },
        19: { name: 'Flame Ruler', asset: 'entei' },
        20: { name: 'Battle Ruler', asset: 'sentei' },
        21: { name: 'Fujin', asset: 'fujin' },
        22: { name: 'Raijin', asset: 'raijin' },
        23: { name: 'Kishin', asset: 'kijin' },
        24: { name: 'Bushin', asset: 'bushin' },
        25: { name: 'Tekken King', asset: 'tekkenou' },
        26: { name: 'Tekken Emperor', asset: 'tekkenhaou' },
        27: { name: 'Tekken God', asset: 'tekkenshin' },
        28: { name: 'Tekken God Supreme', asset: 'tekkenshingoku' },
        29: { name: 'God of Destruction', asset: 'hakaishin' },
        30: { name: 'God of Destruction I', asset: 'hakaishin01' },
        31: { name: 'God of Destruction II', asset: 'hakaishin02' },
        32: { name: 'God of Destruction III', asset: 'hakaishin03' },
        33: { name: 'God of Destruction IV', asset: 'hakaishin04' },
        34: { name: 'God of Destruction V', asset: 'hakaishin05' },
        35: { name: 'God of Destruction VI', asset: 'hakaishin06' },
        36: { name: 'God of Destruction VII', asset: 'hakaishin07' },
        37: { name: 'God of Destruction Infinity', asset: 'hakaishin08' },
        100: { name: 'God of Destruction', asset: 'hakaishin' },
        101: { name: 'God of Destruction I', asset: 'hakaishin01' },
        102: { name: 'God of Destruction II', asset: 'hakaishin02' },
        103: { name: 'God of Destruction III', asset: 'hakaishin03' },
        104: { name: 'God of Destruction IV', asset: 'hakaishin04' },
        105: { name: 'God of Destruction V', asset: 'hakaishin05' },
        106: { name: 'God of Destruction VI', asset: 'hakaishin06' },
        107: { name: 'God of Destruction VII', asset: 'hakaishin07' },
        765: { name: 'God of Destruction Infinity', asset: 'hakaishin08' }
    });

    function normalizeTekkenId(value) {
        const id = String(value ?? '').trim();
        return /^[A-Za-z0-9]{1,20}$/.test(id) ? id : '';
    }

    function normalizeComparableId(value) {
        return String(value ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    }

    function rankInfo(value) {
        if (value && typeof value === 'object') {
            value = value.rankCode ?? value.danRank ?? value.code ?? value.id ?? value.name ?? value.label;
        }
        if (typeof value === 'string' && (/∞/.test(value) || /infinity/i.test(value))) {
            return RANKS_BY_CODE[37];
        }
        if (typeof value === 'number' || /^\d+$/.test(String(value ?? '').trim())) {
            return RANKS_BY_CODE[Number(value)] || null;
        }
        const normalized = String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');
        if (!normalized) return null;
        return Object.values(RANKS_BY_CODE).find(rank =>
            rank.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '') === normalized
        ) || null;
    }

    function hasBattleShape(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
        return [
            'p1_dan_rank', 'p2_dan_rank', 'p1_tekken_id', 'p2_tekken_id',
            'player1DanRank', 'player2DanRank', 'player1PolarisId', 'player2PolarisId',
            'player1TekkenId', 'player2TekkenId', 'player1', 'player2'
        ].some(key => Object.prototype.hasOwnProperty.call(value, key));
    }

    function collectBattleArrays(payload) {
        const arrays = [];
        const seen = new Set();
        const visit = (value, depth = 0) => {
            if (!value || depth > 6 || typeof value !== 'object' || seen.has(value)) return;
            seen.add(value);
            if (Array.isArray(value)) {
                if (value.some(hasBattleShape)) arrays.push(value);
                else value.forEach(item => visit(item, depth + 1));
                return;
            }
            for (const [key, child] of Object.entries(value)) {
                if (['battles', 'matches', 'results', 'items', 'data'].includes(key.toLowerCase())) {
                    visit(child, depth + 1);
                }
            }
        };
        visit(payload?.data ?? payload);
        if (!arrays.length) visit(payload);
        return arrays;
    }

    function sideData(battle, side) {
        const apiSide = `p${side}_`;
        const nested = battle[`player${side}`] && typeof battle[`player${side}`] === 'object'
            ? battle[`player${side}`]
            : {};
        return {
            id: battle[`${apiSide}tekken_id`] ?? battle[`${apiSide}polaris_id`] ??
                battle[`player${side}PolarisId`] ?? battle[`player${side}PolarisID`] ??
                battle[`player${side}TekkenId`] ?? battle[`player${side}TekkenID`] ??
                nested.polarisId ?? nested.tekkenId ?? nested.id,
            rank: battle[`${apiSide}dan_rank`] ?? battle[`${apiSide}rank`] ??
                battle[`player${side}DanRank`] ?? battle[`player${side}Rank`] ??
                nested.danRank ?? nested.rank
        };
    }

    function parseBattleTime(value) {
        if (typeof value === 'number' && Number.isFinite(value)) return value < 1e12 ? value * 1000 : value;
        const parsed = Date.parse(String(value ?? ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function extractLatestRank(payload, tekkenId) {
        const targetId = normalizeComparableId(tekkenId);
        if (!targetId) return null;
        const candidates = [];
        for (const battles of collectBattleArrays(payload)) {
            battles.forEach((battle, index) => {
                if (!hasBattleShape(battle)) return;
                const sides = [sideData(battle, 1), sideData(battle, 2)];
                const sideIdsPresent = sides.some(side => side.id != null && String(side.id).trim() !== '');
                let selectedSide = sides.find(side => normalizeComparableId(side.id) === targetId);
                if (!selectedSide) {
                    const recordId = battle.playerPolarisId ?? battle.playerTekkenId ?? battle.polarisId;
                    if (normalizeComparableId(recordId) === targetId) {
                        selectedSide = { rank: battle.danRank ?? battle.rank ?? battle.rankCode };
                    }
                }
                if (!selectedSide && !sideIdsPresent) {
                    const directRank = battle.playerDanRank ?? battle.danRank ?? battle.rankCode;
                    if (directRank != null) selectedSide = { rank: directRank };
                }
                if (!selectedSide) return;
                const rank = rankInfo(selectedSide.rank);
                if (!rank) return;
                candidates.push({
                    rank,
                    timestamp: parseBattleTime(battle.battle_at ?? battle.date ?? battle.timestamp ?? battle.createdAt),
                    date: battle.battle_at ?? battle.date ?? battle.timestamp ?? battle.createdAt ?? null,
                    index
                });
            });
        }
        if (!candidates.length) {
            const data = payload?.data ?? payload;
            const rank = rankInfo(data?.mainCharacterAndRank?.danRank ?? data?.danRankName ?? data?.currentRank ?? data?.rankName ?? data?.rank);
            return rank ? { rankCode: null, ...rank, latestBattleAt: null } : null;
        }
        candidates.sort((a, b) => {
            if (a.timestamp && b.timestamp && a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
            return a.index - b.index;
        });
        const latest = candidates[0];
        const code = Object.keys(RANKS_BY_CODE).find(key =>
            RANKS_BY_CODE[key].asset === latest.rank.asset && Number(key) < 100
        ) ?? null;
        return {
            rankCode: code == null ? null : Number(code),
            ...latest.rank,
            latestBattleAt: latest.date == null ? null : String(latest.date)
        };
    }

    function getCachedRank(id) {
        try {
            const item = JSON.parse(localStorage.getItem(CACHE_PREFIX + id) || 'null');
            const age = Date.now() - Number(item?.cachedAt || 0);
            if (item?.data && age >= 0 && age < CACHE_TTL_MS) return { ...item.data, cached: true };
        } catch (_) {
            // localStorage pode estar indisponível em navegação privada; segue sem cache.
        }
        return null;
    }

    async function fetchRank(tekkenId) {
        const id = normalizeTekkenId(tekkenId);
        if (!id) throw Object.assign(new Error('invalid_tekken_id'), { code: 'invalid_tekken_id' });
        const cached = getCachedRank(id);
        if (cached) return cached;

        const token = String(window.FGC_EWGF_CONFIG?.apiToken || '').trim();
        const baseUrl = String(window.FGC_EWGF_CONFIG?.apiBaseUrl || 'https://api.ewgf.gg').replace(/\/$/, '');
        if (!token) throw Object.assign(new Error('token_not_configured'), { code: 'token_not_configured' });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        let response;
        try {
            response = await fetch(`${baseUrl}/external/battles/${encodeURIComponent(id)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });
        } catch (error) {
            const code = error?.name === 'AbortError' ? 'request_timeout' : 'network_or_cors_error';
            throw Object.assign(new Error(code), { code });
        } finally {
            clearTimeout(timeout);
        }

        let payload;
        try {
            payload = await response.json();
        } catch (_) {
            throw Object.assign(new Error('invalid_api_response'), { code: 'invalid_api_response' });
        }
        if (!response.ok) {
            const code = typeof payload?.error?.code === 'string' ? payload.error.code : `http_${response.status}`;
            throw Object.assign(new Error(code), { code, status: response.status });
        }

        const rank = extractLatestRank(payload, id);
        const result = rank
            ? { rankCode: rank.rankCode, rankName: rank.name, rankAsset: rank.asset, latestBattleAt: rank.latestBattleAt, tier: payload?._metadata?.tier ?? null }
            : { rankCode: null, rankName: null, rankAsset: null, latestBattleAt: null, tier: payload?._metadata?.tier ?? null };
        try {
            localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ cachedAt: Date.now(), data: result }));
        } catch (_) {
            // A consulta funciona mesmo quando o navegador não permite armazenamento local.
        }
        return result;
    }

    window.FGCEWGF = Object.freeze({ fetchRank });
})();
