(() => {
    'use strict';
    // Dashboard EWGF (plano Free: últimas 50 batalhas). Módulo isolado: não altera ewgf-rank.js.
    const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
    const CACHE_PREFIX = 'fgchub:ewgf:dash:v1:';
    const ROOT_ID = 'ewgf-dashboard';
    const DAYS = 90;
    const DAY_MS = 86400000;
    let seq = 0;

    const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const normId = v => String(v ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const pct = (w, t) => (t ? Math.round((w / t) * 1000) / 10 : 0);
    const fmtPct = v => `${String(v).replace('.', ',')}%`;
    const fmtInt = n => Number(n || 0).toLocaleString('pt-BR');
    const pretty = s => String(s ?? '').trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—';

    function parseTime(v) {
        if (typeof v === 'number' && Number.isFinite(v)) return v < 1e12 ? v * 1000 : v;
        const t = Date.parse(String(v ?? ''));
        return Number.isFinite(t) ? t : 0;
    }
    function dayKey(ts) {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    // ---------- API ----------
    function readCache(id) {
        try {
            const item = JSON.parse(localStorage.getItem(CACHE_PREFIX + id) || 'null');
            const age = Date.now() - Number(item?.cachedAt || 0);
            if (item?.payload && age >= 0 && age < CACHE_TTL_MS) return item;
        } catch (_) { /* sem cache */ }
        return null;
    }
    async function fetchBattles(id, force) {
        if (!force) {
            const c = readCache(id);
            if (c) return { payload: c.payload, cachedAt: c.cachedAt, cached: true };
        }
        const token = String(window.FGC_EWGF_CONFIG?.apiToken || '').trim();
        const base = String(window.FGC_EWGF_CONFIG?.apiBaseUrl || 'https://api.ewgf.gg').replace(/\/$/, '');
        if (!token) throw Object.assign(new Error('token_not_configured'), { code: 'token_not_configured' });
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        let res;
        try {
            res = await fetch(`${base}/external/battles/${encodeURIComponent(id)}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
                signal: ctrl.signal
            });
        } catch (e) {
            const code = e?.name === 'AbortError' ? 'request_timeout' : 'network_or_cors_error';
            throw Object.assign(new Error(code), { code });
        } finally { clearTimeout(timer); }
        let payload;
        try { payload = await res.json(); } catch (_) { throw Object.assign(new Error('invalid_api_response'), { code: 'invalid_api_response' }); }
        if (!res.ok) {
            const code = typeof payload?.error?.code === 'string' ? payload.error.code : `http_${res.status}`;
            throw Object.assign(new Error(code), { code });
        }
        const cachedAt = Date.now();
        try { localStorage.setItem(CACHE_PREFIX + id, JSON.stringify({ cachedAt, payload })); } catch (_) { /* quota */ }
        return { payload, cachedAt, cached: false };
    }

    // ---------- Processamento ----------
    function findBattles(payload) {
        const seen = new Set();
        let found = null;
        const visit = (v, d = 0) => {
            if (found || !v || typeof v !== 'object' || d > 6 || seen.has(v)) return;
            seen.add(v);
            if (Array.isArray(v)) {
                if (v.some(x => x && typeof x === 'object' && ('p1_name' in x || 'p1_tekken_id' in x || 'p1_char' in x))) { found = v; return; }
                v.forEach(x => visit(x, d + 1));
                return;
            }
            Object.values(v).forEach(x => visit(x, d + 1));
        };
        visit(payload?.data ?? payload);
        return found || [];
    }

    function modeName(t) {
        const u = String(t ?? '').toUpperCase();
        if (u.includes('RANK')) return 'Ranked';
        if (u.includes('QUICK')) return 'Quick';
        if (u.includes('GROUP')) return 'Group';
        if (u.includes('PLAYER')) return 'Player';
        return pretty(t || 'Outro');
    }

    function side(b, n) {
        const p = `p${n}_`;
        return {
            id: b[`${p}tekken_id`] ?? b[`${p}polaris_id`] ?? null,
            name: b[`${p}name`] ?? '',
            char: b[`${p}char`] ?? b[`${p}character`] ?? '',
            power: Number(b[`${p}tekken_power`]) || 0,
            rounds: Number(b[`${p}rounds_won`]),
            region: b[`${p}region`] ?? ''
        };
    }

    // retorna 1, 2 ou 0 (empate/indefinido)
    function winnerSide(b, s1, s2) {
        const w = b.winner;
        const ws = String(w ?? '').trim().toLowerCase();
        if (ws === '1' || ws === 'p1' || ws === 'player1' || ws === 'player 1') return 1;
        if (ws === '2' || ws === 'p2' || ws === 'player2' || ws === 'player 2') return 2;
        if (ws && s1.id && normId(ws) === normId(s1.id)) return 1;
        if (ws && s2.id && normId(ws) === normId(s2.id)) return 2;
        if (Number.isFinite(s1.rounds) && Number.isFinite(s2.rounds) && s1.rounds !== s2.rounds) return s1.rounds > s2.rounds ? 1 : 2;
        return 0;
    }

    function analyze(payload, tekkenId) {
        const target = normId(tekkenId);
        const raw = findBattles(payload);
        const dedupe = new Set();
        const list = [];
        raw.forEach(b => {
            if (!b || typeof b !== 'object') return;
            const s1 = side(b, 1), s2 = side(b, 2);
            let me = 0;
            if (s1.id && normId(s1.id) === target) me = 1;
            else if (s2.id && normId(s2.id) === target) me = 2;
            if (!me) return;
            const ts = parseTime(b.battle_at ?? b.date ?? b.timestamp);
            const key = `${ts}|${normId(s1.id)}|${normId(s2.id)}`;
            if (dedupe.has(key)) return;
            dedupe.add(key);
            const w = winnerSide(b, s1, s2);
            const mine = me === 1 ? s1 : s2, opp = me === 1 ? s2 : s1;
            list.push({
                ts,
                type: modeName(b.battle_type),
                result: w === 0 ? 'D' : (w === me ? 'W' : 'L'),
                mine, opp,
                stage: b.stage ?? ''
            });
        });
        list.sort((a, b) => b.ts - a.ts);
        if (!list.length) return null;

        const total = list.length;
        const wins = list.filter(x => x.result === 'W').length;
        const losses = list.filter(x => x.result === 'L').length;
        const draws = total - wins - losses;
        const decided = wins + losses;

        const group = (keyFn) => {
            const m = new Map();
            list.forEach(x => {
                const k = keyFn(x);
                const g = m.get(k) || { key: k, total: 0, wins: 0, losses: 0, draws: 0 };
                g.total++;
                if (x.result === 'W') g.wins++; else if (x.result === 'L') g.losses++; else g.draws++;
                m.set(k, g);
            });
            return [...m.values()].map(g => ({ ...g, wr: pct(g.wins, g.wins + g.losses) }))
                .sort((a, b) => b.total - a.total || b.wr - a.wr);
        };
        const chars = group(x => pretty(x.mine.char));
        const modes = group(x => x.type);

        // atividade (últimos 90 dias a partir da batalha mais recente / hoje)
        const days = new Map();
        list.forEach(x => {
            if (!x.ts) return;
            const k = dayKey(x.ts);
            const d = days.get(k) || { total: 0, wins: 0, losses: 0 };
            d.total++;
            if (x.result === 'W') d.wins++; else if (x.result === 'L') d.losses++;
            days.set(k, d);
        });
        const activeDays = days.size;
        let topDay = null;
        days.forEach((v, k) => { if (!topDay || v.total > topDay.total) topDay = { key: k, ...v }; });

        const withTs = list.filter(x => x.ts);
        const span = withTs.length ? Math.max(1, Math.ceil((withTs[0].ts - withTs[withTs.length - 1].ts) / DAY_MS) + 1) : 0;
        const power = withTs.slice().reverse().map(x => x.mine.power).filter(p => p > 0);

        return {
            total, wins, losses, draws, wr: pct(wins, decided),
            power: power.length ? power[power.length - 1] : 0,
            powerSeries: power,
            chars, modes, days, activeDays, topDay,
            avgPerActiveDay: activeDays ? Math.round((withTs.length / activeDays) * 10) / 10 : 0,
            span,
            streak: streak(list),
            latestTs: list[0].ts,
            battles: list
        };
    }

    function streak(list) {
        if (!list.length) return null;
        const first = list[0].result;
        if (first === 'D') return null;
        let n = 0;
        for (const x of list) { if (x.result === first) n++; else break; }
        return { type: first, n };
    }

    // ---------- Renderização ----------
    const MODES = ['Ranked', 'Quick', 'Player', 'Group'];
    const MODE_ICON = { Ranked: 'fa-trophy', Quick: 'fa-bolt', Player: 'fa-user', Group: 'fa-users', All: 'fa-chart-line' };
    let ctx = { id: '', stats: null, meta: {}, filter: 'ALL', charIcon: null, picked: null };

    const icon = (name, cls = '') => `<i class="fa-solid ${name} ${cls}" aria-hidden="true"></i>`;
    const wrOf = g => pct(g.wins, g.wins + g.losses);
    const cardHead = (ic, title, sub) => `<div class="ewgfd-chead"><span class="ewgfd-cicon">${icon(ic)}</span>
        <div class="min-w-0"><h4 class="ewgfd-ctitle">${esc(title)}</h4>${sub ? `<p class="ewgfd-csub">${sub}</p>` : ''}</div></div>`;

    function tally(list) {
        const t = { total: list.length, wins: 0, losses: 0, draws: 0 };
        list.forEach(x => { if (x.result === 'W') t.wins++; else if (x.result === 'L') t.losses++; else t.draws++; });
        return t;
    }
    const wrClass = wr => wr < 30 ? 'ewgfd-c1' : wr < 40 ? 'ewgfd-c2' : wr < 50 ? 'ewgfd-c3' : wr < 60 ? 'ewgfd-c4' : 'ewgfd-c5';

    function heatmap(list) {
        const byDay = new Map();
        list.forEach(x => { if (!x.ts) return; const k = dayKey(x.ts); (byDay.get(k) || byDay.set(k, []).get(k)).push(x); });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const start = new Date(today.getTime() - (DAYS - 1) * DAY_MS);
        const lead = (start.getDay() + 6) % 7; // semana começa na segunda
        const cols = Math.ceil((lead + DAYS) / 7);
        const months = [];
        let lastMonth = -1;
        for (let c = 0; c < cols; c++) {
            const first = new Date(start.getTime() + (Math.max(c * 7, lead) - lead) * DAY_MS);
            if (first.getMonth() !== lastMonth) {
                months.push({ col: c, label: first.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
                lastMonth = first.getMonth();
            }
        }
        const cells = [];
        for (let i = 0; i < lead + DAYS; i++) {
            if (i < lead) { cells.push('<span class="ewgfd-cell ewgfd-pad" aria-hidden="true"></span>'); continue; }
            const d = new Date(start.getTime() + (i - lead) * DAY_MS);
            const k = dayKey(d.getTime());
            const day = byDay.get(k);
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!day) { cells.push(`<span class="ewgfd-cell" title="${label}: sem partidas"></span>`); continue; }
            const t = tally(day), wr = pct(t.wins, t.wins + t.losses);
            cells.push(`<button type="button" class="ewgfd-cell ewgfd-hit ${wrClass(wr)}" data-day="${k}" title="${label}: ${t.wins}V ${t.losses}D (${fmtPct(wr)})" aria-label="${label}: ${t.wins} vitórias, ${t.losses} derrotas"></button>`);
        }
        const monthRow = months.map(m => `<span style="grid-column:${m.col + 1}">${esc(m.label)}</span>`).join('');
        return `<div class="ewgfd-heatwrap">
            <div class="ewgfd-wdays" aria-hidden="true"><span>Seg</span><span></span><span>Qua</span><span></span><span>Sex</span><span></span><span></span></div>
            <div class="min-w-0 overflow-x-auto">
                <div class="ewgfd-months" style="grid-template-columns:repeat(${cols},14px)">${monthRow}</div>
                <div class="ewgfd-heat" style="grid-template-columns:repeat(${cols},14px)" role="group" aria-label="Calendário de atividade dos últimos ${DAYS} dias">${cells.join('')}</div>
            </div></div>`;
    }

    function dayBoxHtml(list, key) {
        if (!key) return 'Toque ou clique em um dia para ver as partidas';
        const day = list.filter(x => x.ts && dayKey(x.ts) === key);
        if (!day.length) return 'Sem partidas neste dia';
        const t = tally(day);
        const label = new Date(key + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
        return `<b>${esc(label)}</b> · ${t.total} ${t.total === 1 ? 'partida' : 'partidas'} · <span class="ewgfd-w">${t.wins}V</span> <span class="ewgfd-l">${t.losses}D</span> · ${fmtPct(pct(t.wins, t.wins + t.losses))}`;
    }

    function activityInner() {
        const all = ctx.stats.battles;
        const f = ctx.filter;
        const list = f === 'ALL' ? all : all.filter(x => x.type.toUpperCase() === f);
        const t = tally(list);
        const days = new Map();
        list.forEach(x => { if (x.ts) { const k = dayKey(x.ts); days.set(k, (days.get(k) || 0) + 1); } });
        let top = null; days.forEach((n, k) => { if (!top || n > top.n) top = { k, n }; });
        const dated = list.filter(x => x.ts);
        const perDay = days.size ? (dated.length / days.size).toFixed(1).replace('.', ',') : '—';
        const pills = ['ALL', ...MODES.map(m => m.toUpperCase())].map(p => {
            const n = p === 'ALL' ? all.length : all.filter(x => x.type.toUpperCase() === p).length;
            return `<button type="button" class="ewgfd-pill${p === f ? ' is-on' : ''}" data-filter="${p}" aria-pressed="${p === f}"${n ? '' : ' disabled'}>${p === 'ALL' ? 'Todos' : p}</button>`;
        }).join('');
        return `${cardHead('fa-calendar-days', 'Recent Activity', `Últimos ${DAYS} dias · toque em um dia`)}
            <div class="ewgfd-pills">${pills}</div>
            <div class="ewgfd-legend"><span>Winrate</span>
                <i class="ewgfd-dot ewgfd-c1"></i>&lt;30% <i class="ewgfd-dot ewgfd-c2"></i>30–40% <i class="ewgfd-dot ewgfd-c3"></i>40–50% <i class="ewgfd-dot ewgfd-c4"></i>50–60% <i class="ewgfd-dot ewgfd-c5"></i>60%+ <i class="ewgfd-dot ewgfd-none"></i>sem jogos</div>
            ${heatmap(list)}
            <div class="ewgfd-daybox" id="ewgfd-daybox" role="status" aria-live="polite">${dayBoxHtml(list, ctx.picked)}</div>
            <div class="ewgfd-foot">
                <div><b class="${t.total ? (pct(t.wins, t.wins + t.losses) >= 50 ? 'ewgfd-w' : 'ewgfd-l') : ''}">${t.total ? fmtPct(pct(t.wins, t.wins + t.losses)) : '—'}</b><span>Winrate</span></div>
                <div><b>${fmtInt(t.total)}</b><span>Partidas</span></div>
                <div><b>${days.size}</b><span>Dias ativos</span></div>
                <div><b>${perDay}</b><span>Por dia</span></div>
            </div>
            <p class="ewgfd-note">${t.wins}V – ${t.losses}D${top ? ` · dia mais movimentado: ${top.n} partidas` : ''}</p>`;
    }

    function pentagonCard() {
        const pts = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${(60 + 46 * Math.cos(a)).toFixed(1)},${(60 + 46 * Math.sin(a)).toFixed(1)}`; });
        const inner = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${(60 + 23 * Math.cos(a)).toFixed(1)},${(60 + 23 * Math.sin(a)).toFixed(1)}`; });
        return `${cardHead('fa-star', 'Stat Pentagon', 'Attack · Defense · Technique · Spirit · Appeal')}
            <div class="ewgfd-penta">
                <svg viewBox="0 0 120 120" role="img" aria-label="Stat Pentagon indisponível no plano Free"><polygon points="${pts.join(' ')}" class="ewgfd-pg"/><polygon points="${inner.join(' ')}" class="ewgfd-pg"/></svg>
            </div>
            <p class="ewgfd-lock">${icon('fa-lock')} Em breve dados da EWGF</p>
            <p class="ewgfd-note">Os cinco atributos só vêm no endpoint de perfil. Nenhum valor é estimado.</p>`;
    }

    function globalCard() {
        const all = ctx.stats.battles;
        const row = (name, list) => {
            const t = tally(list), wr = pct(t.wins, t.wins + t.losses);
            return `<div class="ewgfd-grow"><span class="ewgfd-gicon">${icon(MODE_ICON[name] || 'fa-chart-line')}</span>
                <div class="min-w-0 flex-1"><p class="ewgfd-gname">${name === 'All' ? 'All Matches' : esc(name)}</p><p class="ewgfd-gsub">${fmtInt(t.total)} ${t.total === 1 ? 'partida' : 'partidas'}</p></div>
                <div class="text-right"><p class="ewgfd-gwr ${t.total ? (wr >= 50 ? 'ewgfd-w' : 'ewgfd-l') : ''}">${t.total ? fmtPct(wr) : '—'}</p><p class="ewgfd-gsub">${t.wins}V-${t.losses}D-${t.draws}E</p></div></div>`;
        };
        return `${cardHead('fa-chart-line', 'Global Statistics', 'Desempenho nas partidas recebidas')}
            <div class="ewgfd-glist">${MODES.map(m => row(m, all.filter(x => x.type === m))).join('')}${row('All', all)}</div>`;
    }

    function charImg(name, cls) {
        const src = ctx.charIcon ? ctx.charIcon(name) : '';
        return src ? `<img src="${esc(src)}" alt="" loading="lazy" decoding="async" class="${cls}">` : `<span class="${cls} ewgfd-noimg" aria-hidden="true">${esc(String(name || '?').charAt(0).toUpperCase())}</span>`;
    }

    function charsCard() {
        const rows = ctx.stats.chars.slice(0, 8).map(g => {
            const wr = wrOf(g);
            return `<li class="ewgfd-char">${charImg(g.key, 'ewgfd-cimg')}
                <div class="min-w-0 flex-1"><div class="flex items-center justify-between gap-2"><span class="ewgfd-gname truncate">${esc(g.key)}</span><span class="ewgfd-gwr ${wr >= 50 ? 'ewgfd-w' : 'ewgfd-l'}">${fmtPct(wr)}</span></div>
                <div class="ewgfd-bar" role="img" aria-label="${esc(g.key)}: ${fmtPct(wr)}"><span class="${wr >= 50 ? 'ewgfd-bar-win' : 'ewgfd-bar-loss'}" style="width:${Math.max(2, wr)}%"></span></div>
                <p class="ewgfd-gsub">${g.total} ${g.total === 1 ? 'partida' : 'partidas'} · ${g.wins}V-${g.losses}D</p></div></li>`;
        }).join('');
        return `${cardHead('fa-users', 'Characters', `${ctx.stats.chars.length} usados na amostra`)}<ul class="ewgfd-clist">${rows}</ul>`;
    }

    function battlesCard() {
        const rows = ctx.stats.battles.slice(0, 12).map(b => {
            const date = b.ts ? new Date(b.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
            const cls = b.result === 'W' ? 'ewgfd-badge-win' : b.result === 'L' ? 'ewgfd-badge-loss' : 'ewgfd-badge-even';
            const txt = b.result === 'W' ? 'V' : b.result === 'L' ? 'D' : 'E';
            const score = Number.isFinite(b.mine.rounds) && Number.isFinite(b.opp.rounds) ? `${b.mine.rounds}–${b.opp.rounds}` : '—';
            return `<li class="ewgfd-battle"><span class="ewgfd-badge ${cls}" aria-label="${b.result === 'W' ? 'Vitória' : b.result === 'L' ? 'Derrota' : 'Empate'}">${txt}</span>
                ${charImg(b.mine.char, 'ewgfd-bimg')}
                <div class="min-w-0 flex-1"><p class="ewgfd-gname truncate">vs ${esc(b.opp.name || 'Oponente')}</p>
                <p class="ewgfd-gsub truncate">${esc(pretty(b.mine.char))} × ${esc(pretty(b.opp.char))}${b.stage ? ` · ${esc(b.stage)}` : ''}</p></div>
                <div class="text-right shrink-0"><p class="ewgfd-gwr">${score}</p><p class="ewgfd-gsub">${esc(b.type)} · ${date}</p></div></li>`;
        }).join('');
        return `${cardHead('fa-clock-rotate-left', 'Match History', 'Últimas partidas recebidas')}<ul class="ewgfd-blist">${rows}</ul>`;
    }

    function render(el) {
        const d = ctx.stats;
        const age = ctx.meta.cachedAt ? new Date(ctx.meta.cachedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
        el.innerHTML = `
            <div class="ewgfd-head">
                <h3 class="${SECTION_TITLE}">Tekken 8 · EWGF</h3>
                <div class="ewgfd-meta"><span>${d.total} batalhas${age ? ` · atualizado ${age}` : ''}</span>
                    <a href="https://ewgf.gg/player/${encodeURIComponent(ctx.id)}" target="_blank" rel="noopener noreferrer" class="ewgfd-link">Ver na EWGF</a>
                    <button type="button" class="ewgfd-refresh" data-act="refresh">Atualizar</button></div>
            </div>
            <div class="ewgfd-grid3">
                <section class="ewgfd-card" id="ewgfd-activity" aria-label="Atividade recente">${activityInner()}</section>
                <section class="ewgfd-card" aria-label="Stat Pentagon">${pentagonCard()}</section>
                <section class="ewgfd-card" aria-label="Estatísticas globais">${globalCard()}</section>
            </div>
            <div class="ewgfd-grid2">
                <section class="ewgfd-card" aria-label="Personagens">${charsCard()}</section>
                <section class="ewgfd-card" aria-label="Histórico de partidas">${battlesCard()}</section>
            </div>
            <p class="ewgfd-note">Plano gratuito da EWGF: até 50 batalhas, com atraso de até 24 h. As estatísticas refletem apenas essa amostra.</p>`;
    }

    function bind(el) {
        if (el.dataset.bound) return;
        el.dataset.bound = '1';
        el.addEventListener('click', e => {
            const t = e.target.closest('[data-filter],[data-day],[data-act]');
            if (!t || !ctx.stats) return;
            if (t.dataset.act === 'refresh') { mount(ctx.id, { force: true }); return; }
            const act = document.getElementById('ewgfd-activity');
            if (!act) return;
            if (t.dataset.filter) { ctx.filter = t.dataset.filter; ctx.picked = null; act.innerHTML = activityInner(); return; }
            if (t.dataset.day) {
                ctx.picked = t.dataset.day;
                const f = ctx.filter, all = ctx.stats.battles;
                const list = f === 'ALL' ? all : all.filter(x => x.type.toUpperCase() === f);
                act.querySelectorAll('.ewgfd-hit.is-picked').forEach(n => n.classList.remove('is-picked'));
                t.classList.add('is-picked');
                const box = document.getElementById('ewgfd-daybox');
                if (box) box.innerHTML = dayBoxHtml(list, ctx.picked);
            }
        });
    }

    const SECTION_TITLE = 'text-xs font-bold text-slate-400 uppercase tracking-wider border-l-2 border-red-500 pl-2';

    function message(el, text, isError) {
        el.innerHTML = `<h3 class="${SECTION_TITLE}">Tekken 8 · EWGF</h3>
            <p class="text-sm ${isError ? 'text-amber-400' : 'text-slate-500'}" role="status">${esc(text)}</p>`;
    }

    const ERRORS = {
        rate_limit_exceeded: 'Limite de consultas da EWGF atingido. Tente novamente mais tarde.',
        player_not_found: 'Esse Tekken ID não foi encontrado na EWGF.',
        invalid_api_key: 'A chave EWGF é inválida.',
        api_key_revoked: 'A chave EWGF foi revogada.',
        token_not_configured: 'Chave EWGF não configurada.',
        request_timeout: 'A consulta à EWGF excedeu o tempo limite.',
        network_or_cors_error: 'Não foi possível acessar a API EWGF.'
    };

    function ensureRoot() {
        let el = document.getElementById(ROOT_ID);
        if (el) return el;
        const host = document.getElementById('perfil_conteudo');
        if (!host) return null;
        el = document.createElement('div');
        el.id = ROOT_ID;
        el.className = 'ewgfd space-y-4 w-full min-w-0';
        const rank = document.getElementById('rank_t8_box');
        const usage = document.getElementById('character-usage-panel');
        if (rank?.parentNode) rank.parentNode.insertBefore(el, rank.nextSibling);
        else if (usage?.parentNode) usage.parentNode.insertBefore(el, usage);
        else host.appendChild(el);
        return el;
    }

    async function mount(tekkenId, opts = {}) {
        const id = String(tekkenId ?? '').replace(/[^A-Za-z0-9]/g, '');
        if (!id) { unmount(); return false; }
        const el = ensureRoot();
        if (!el) return false;
        if (typeof opts.charIcon === 'function') ctx.charIcon = opts.charIcon;
        const mySeq = ++seq;
        bind(el);
        message(el, 'Carregando estatísticas EWGF…', false);
        try {
            const { payload, cachedAt, cached } = await fetchBattles(id, Boolean(opts.force));
            if (mySeq !== seq) return false;
            const stats = analyze(payload, id);
            if (!stats) { message(el, 'A EWGF ainda não retornou batalhas para esse ID.', false); return false; }
            ctx = { ...ctx, id, stats, meta: { cachedAt, cached }, filter: 'ALL', picked: null };
            render(el);
            return true;
        } catch (e) {
            if (mySeq !== seq) return false;
            console.error('Dashboard EWGF:', e);
            message(el, ERRORS[e?.code] || 'Não foi possível carregar as estatísticas da EWGF.', true);
            return false;
        }
    }

    function unmount() {
        seq++;
        document.getElementById(ROOT_ID)?.remove();
    }

    window.FGCEwgfDashboard = Object.freeze({ mount, unmount, _analyze: analyze });
})();
