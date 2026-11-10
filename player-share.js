(function() {
    'use strict';

    const WIDTH = 1920;
    const HEIGHT = 1080;
    const COLORS = {
        background: '#070b17',
        panel: '#101827',
        panelLight: '#151f31',
        border: '#263347',
        red: '#dc2626',
        redLight: '#ef4444',
        text: '#f8fafc',
        muted: '#94a3b8',
        dim: '#64748b',
        green: '#22c55e',
        yellow: '#facc15'
    };

    function roundedRect(ctx, x, y, width, height, radius) {
        const r = Math.max(0, Math.min(radius, width / 2, height / 2));
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, width, height, r);
            return;
        }
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function panel(ctx, x, y, width, height, radius = 22, fill = COLORS.panel) {
        roundedRect(ctx, x, y, width, height, radius);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    function fitText(ctx, value, x, y, maxWidth, fontSize, color = COLORS.text, weight = 700, minFontSize = 14) {
        const text = String(value ?? '');
        let size = fontSize;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        while (size > minFontSize) {
            ctx.font = `${weight} ${size}px Arial, sans-serif`;
            if (ctx.measureText(text).width <= maxWidth) break;
            size -= 1;
        }
        ctx.font = `${weight} ${size}px Arial, sans-serif`;
        ctx.fillStyle = color;
        if (ctx.measureText(text).width <= maxWidth) {
            ctx.fillText(text, x, y);
            return;
        }
        let clipped = text;
        while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
            clipped = clipped.slice(0, -1);
        }
        ctx.fillText(`${clipped}…`, x, y);
    }

    function centeredText(ctx, value, x, y, maxWidth, fontSize, color = COLORS.text, weight = 700) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `${weight} ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = color;
        const text = String(value ?? '');
        if (ctx.measureText(text).width <= maxWidth) {
            ctx.fillText(text, x, y);
            return;
        }
        fitText(ctx, text, x - maxWidth / 2, y, maxWidth, fontSize, color, weight, Math.max(13, fontSize - 12));
        ctx.textAlign = 'left';
    }

    function imageCandidates(url) {
        const source = String(url || '').trim();
        if (!source) return [];
        if (/^(data:|blob:)/i.test(source)) return [source];

        try {
            const parsed = new URL(source, window.location.href);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return [];
            if (parsed.origin === window.location.origin) return [parsed.href];

            const proxy = new URL('https://images.weserv.nl/');
            proxy.searchParams.set('url', parsed.href);
            return [proxy.href, parsed.href];
        } catch (_) {
            return [];
        }
    }

    function loadImageSource(url, timeoutMs) {
        return new Promise(resolve => {
            const image = new Image();
            let finished = false;
            const finish = value => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                resolve(value);
            };
            const timer = setTimeout(() => finish(null), timeoutMs);
            if (!/^(data:|blob:)/i.test(url)) image.crossOrigin = 'anonymous';
            image.onload = () => finish(image);
            image.onerror = () => finish(null);
            image.src = url;
            if (image.complete && image.naturalWidth > 0) finish(image);
        });
    }

    async function loadImage(url, timeoutMs = 8000) {
        for (const candidate of imageCandidates(url)) {
            const image = await loadImageSource(candidate, timeoutMs);
            if (image) return image;
        }
        return null;
    }

    function drawImageCover(ctx, image, x, y, width, height, radius = 18) {
        if (!image?.naturalWidth) return false;
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const sourceWidth = width / scale;
        const sourceHeight = height / scale;
        const sourceX = (image.naturalWidth - sourceWidth) / 2;
        const sourceY = (image.naturalHeight - sourceHeight) / 2;
        ctx.save();
        roundedRect(ctx, x, y, width, height, radius);
        ctx.clip();
        ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
        ctx.restore();
        return true;
    }

    function drawImageContain(ctx, image, x, y, width, height, alpha = 1) {
        if (!image?.naturalWidth) return false;
        const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
        ctx.restore();
        return true;
    }

    function initials(name) {
        const value = String(name || 'FGC').trim();
        return (value.split(/\s+/).slice(0, 2).map(part => part[0] || '').join('') || 'FG').toUpperCase();
    }

    function drawBackground(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
        gradient.addColorStop(0, '#060916');
        gradient.addColorStop(0.55, '#0a1020');
        gradient.addColorStop(1, '#111a2a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        const glow = ctx.createRadialGradient(1520, 130, 20, 1520, 130, 650);
        glow.addColorStop(0, 'rgba(220,38,38,0.19)');
        glow.addColorStop(1, 'rgba(220,38,38,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(900, 0, 1020, 650);

        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = COLORS.red;
        ctx.beginPath();
        ctx.moveTo(1740, 0);
        ctx.lineTo(1920, 0);
        ctx.lineTo(1920, 380);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = COLORS.red;
        ctx.fillRect(80, 62, 7, 46);
        fitText(ctx, 'FGC HUB', 106, 91, 280, 30, COLORS.text, 900, 25);
        fitText(ctx, 'PLAYER COMPETITIVE PERFORMANCE', 108, 122, 390, 16, COLORS.muted, 700, 14);
        ctx.strokeStyle = 'rgba(148,163,184,0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 139);
        ctx.lineTo(1840, 139);
        ctx.stroke();
    }

    function drawIdentity(ctx, data, images) {
        panel(ctx, 80, 160, 560, 132, 20, '#101827');
        ctx.fillStyle = '#1c293b';
        roundedRect(ctx, 98, 178, 96, 96, 18);
        ctx.fill();
        const hasAvatar = drawImageCover(ctx, images.avatar, 98, 178, 96, 96, 18);
        if (!hasAvatar) {
            centeredText(ctx, initials(data.displayName), 146, 239, 82, 34, '#cbd5e1', 800);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 2;
        roundedRect(ctx, 98, 178, 96, 96, 18);
        ctx.stroke();

        const tag = data.displayName || data.gamerTag || 'Player';
        fitText(ctx, tag, 218, 218, 400, 41, COLORS.text, 900, 16);
        fitText(ctx, data.realName || 'Competidor FGC', 220, 248, 385, 18, COLORS.muted, 500, 15);

        let meta = data.countryCode ? String(data.countryCode).toUpperCase() : 'FGC HUB';
        if (data.countryName) meta += `  ·  ${data.countryName}`;
        fitText(ctx, meta, 220, 275, 395, 13, COLORS.dim, 600, 12);
    }

    function drawMainCharacter(ctx, data, images, x = 80, y = 315, width = 560, height = 370) {
        panel(ctx, x, y, width, height, 22, '#0c1321');
        const artX = x + 16, artY = y + 14, artW = width - 32, artH = height - 28;
        if (images.mainCharacter) {
            drawImageContain(ctx, images.mainCharacter, artX + 20, artY + 5, artW - 40, artH - 18, 0.94);
        } else {
            const placeholder = ctx.createLinearGradient(artX, artY, artX + artW, artY + artH);
            placeholder.addColorStop(0, '#18263a');
            placeholder.addColorStop(1, '#111827');
            roundedRect(ctx, artX, artY, artW, artH, 16);
            ctx.fillStyle = placeholder;
            ctx.fill();
            centeredText(ctx, 'FGC', x + width / 2, y + 205, 260, 72, '#344256', 900);
        }

        const fade = ctx.createLinearGradient(0, y + height - 150, 0, y + height - 10);
        fade.addColorStop(0, 'rgba(7,11,23,0)');
        fade.addColorStop(1, 'rgba(7,11,23,0.96)');
        ctx.fillStyle = fade;
        roundedRect(ctx, x + 2, y + height - 165, width - 4, 163, 20);
        ctx.fill();

        const characterHeading = data.mainCharacterSource === 'usage'
            ? `MAIS USADO · ${data.mainCharacterGame || 'NO JOGO REPORTADO'}`
            : 'PERSONAGEM PRINCIPAL';
        fitText(ctx, characterHeading, x + 28, y + height - 80, width - 56, 13, '#fca5a5', 800, 12);
        fitText(ctx, data.mainCharacterName || 'Nenhum personagem selecionado', x + 28, y + height - 42, width - 56, 31, COLORS.text, 900, 20);
    }

    function drawStat(ctx, x, y, width, height, label, value, accent = COLORS.text) {
        panel(ctx, x, y, width, height, 18, COLORS.panel);
        ctx.fillStyle = COLORS.red;
        roundedRect(ctx, x + 18, y + 18, 5, height - 36, 3);
        ctx.fill();
        fitText(ctx, value, x + 40, y + height * 0.56, width - 60, 34, accent, 900, 23);
        fitText(ctx, label.toUpperCase(), x + 40, y + height - 10, width - 60, 12, COLORS.muted, 800, 10);
    }

    function parseTournamentPlacement(event) {
        const value = Number.parseInt(String(event?.placement ?? '').replace(/[^\d]/g, ''), 10);
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    function shortDateLabel(value, fallbackIndex) {
        const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})/);
        return match ? `${match[1]}/${match[2]}` : `#${fallbackIndex + 1}`;
    }

    function drawTournamentHistory(ctx, data, images) {
        const x = 680, y = 295, width = 1160, height = 745;
        panel(ctx, x, y, width, height, 22, '#0e1625');
        fitText(ctx, 'HISTÓRICO DE TORNEIOS', x + 24, y + 34, 520, 18, COLORS.text, 900, 15);

        const events = (Array.isArray(data.tournaments) ? data.tournaments : []).slice(0, 15);
        ctx.textAlign = 'right';
        ctx.font = '600 13px Arial, sans-serif';
        ctx.fillStyle = COLORS.dim;
        ctx.fillText(`Até 15 eventos recentes · ${events.length} carregados`, x + width - 24, y + 34);
        ctx.textAlign = 'left';

        const chartX = x + 22, chartY = y + 50, chartWidth = width - 44, chartHeight = 246;
        panel(ctx, chartX, chartY, chartWidth, chartHeight, 15, '#111b2b');
        fitText(ctx, 'EVOLUÇÃO DE COLOCAÇÃO', chartX + 18, chartY + 27, 360, 13, COLORS.muted, 800, 11);
        fitText(ctx, '1º lugar no topo', chartX + chartWidth - 165, chartY + 27, 145, 11, COLORS.dim, 600, 10);

        const chronological = [...events].reverse();
        const plotX = chartX + 68, plotY = chartY + 54;
        const plotWidth = chartWidth - 94, plotHeight = 120;
        const ranked = chronological.map((event, index) => ({ event, index, place: parseTournamentPlacement(event) }))
            .filter(item => item.place !== null);
        const maxPlace = Math.max(5, ...ranked.map(item => item.place));

        for (let line = 0; line < 3; line++) {
            const ratio = line / 2;
            const gridY = plotY + plotHeight * ratio;
            const placeLabel = Math.round(1 + (maxPlace - 1) * ratio);
            ctx.beginPath();
            ctx.moveTo(plotX, gridY);
            ctx.lineTo(plotX + plotWidth, gridY);
            ctx.strokeStyle = 'rgba(148,163,184,0.18)';
            ctx.lineWidth = 1;
            ctx.stroke();
            fitText(ctx, `${placeLabel}º`, chartX + 17, gridY + 4, 38, 10, COLORS.dim, 600, 9);
        }

        if (ranked.length) {
            const slotCount = Math.max(1, chronological.length);
            const points = ranked.map(item => ({
                ...item,
                x: plotX + (slotCount === 1 ? plotWidth / 2 : item.index / (slotCount - 1) * plotWidth),
                y: plotY + ((item.place - 1) / Math.max(1, maxPlace - 1)) * plotHeight
            }));
            if (points.length > 1) {
                ctx.beginPath();
                ctx.moveTo(points[0].x, plotY + plotHeight);
                points.forEach(point => ctx.lineTo(point.x, point.y));
                ctx.lineTo(points[points.length - 1].x, plotY + plotHeight);
                ctx.closePath();
                const fill = ctx.createLinearGradient(0, plotY, 0, plotY + plotHeight);
                fill.addColorStop(0, 'rgba(239,68,68,0.22)');
                fill.addColorStop(1, 'rgba(239,68,68,0.01)');
                ctx.fillStyle = fill;
                ctx.fill();
            }
            ctx.beginPath();
            points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
            ctx.strokeStyle = COLORS.redLight;
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.stroke();
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
                ctx.fillStyle = COLORS.redLight;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            });
        } else {
            centeredText(ctx, 'Sem colocações disponíveis para montar o gráfico.', plotX + plotWidth / 2, plotY + 66, plotWidth - 40, 15, COLORS.dim, 600);
        }

        const slotWidth = plotWidth / Math.max(1, chronological.length);
        chronological.forEach((event, index) => {
            if (chronological.length > 11 && index % 2 !== 0 && index !== chronological.length - 1) return;
            const label = shortDateLabel(event.date, index);
            centeredText(ctx, label, plotX + (chronological.length === 1 ? plotWidth / 2 : index * plotWidth / (chronological.length - 1)), chartY + 198, Math.min(58, slotWidth + 4), 9, COLORS.dim, 600);
        });
        fitText(ctx, 'MAIS ANTIGO', chartX + 18, chartY + 224, 100, 9, COLORS.dim, 600, 8);
        ctx.textAlign = 'right';
        ctx.font = '600 9px Arial, sans-serif';
        ctx.fillStyle = COLORS.dim;
        ctx.fillText('MAIS RECENTE', chartX + chartWidth - 18, chartY + 224);
        ctx.textAlign = 'left';

        fitText(ctx, 'ÚLTIMOS RESULTADOS', x + 24, y + 326, 330, 13, COLORS.muted, 800, 11);
        ctx.textAlign = 'right';
        ctx.font = '600 11px Arial, sans-serif';
        ctx.fillStyle = COLORS.dim;
        ctx.fillText('6 resultados mais recentes', x + width - 24, y + 326);
        ctx.textAlign = 'left';

        const recent = events.slice(0, 6);
        if (!recent.length) {
            centeredText(ctx, 'Nenhum resultado de torneio retornado pelo Start.gg.', x + width / 2, y + 520, width - 100, 18, COLORS.dim, 600);
        }
        const gapX = 14, gapY = 10;
        const cardWidth = (width - 44 - gapX) / 2;
        const cardHeight = 116;
        recent.forEach((event, index) => {
            const column = index % 2, row = Math.floor(index / 2);
            const cardX = x + 22 + column * (cardWidth + gapX);
            const cardY = y + 340 + row * (cardHeight + gapY);
            panel(ctx, cardX, cardY, cardWidth, cardHeight, 14, '#111b2b');

            const thumbX = cardX + 12, thumbY = cardY + 12, thumbSize = 88;
            roundedRect(ctx, thumbX, thumbY, thumbSize, thumbSize, 12);
            ctx.fillStyle = '#1b283a';
            ctx.fill();
            if (!drawImageContain(ctx, images.events[index], thumbX + 4, thumbY + 4, thumbSize - 8, thumbSize - 8)) {
                centeredText(ctx, 'FGC', thumbX + thumbSize / 2, thumbY + 51, thumbSize - 12, 20, '#607086', 800);
            }

            const badgeX = cardX + cardWidth - 98, badgeY = cardY + 14;
            panel(ctx, badgeX, badgeY, 84, 86, 12, '#192539');
            const place = parseTournamentPlacement(event);
            centeredText(ctx, place ? `${place}º` : String(event.placement || '—'), badgeX + 42, badgeY + 39, 74, 25, place === 1 ? COLORS.yellow : COLORS.text, 900);
            centeredText(ctx, event.attendees && event.attendees !== '?' ? `/${event.attendees}` : 'colocação', badgeX + 42, badgeY + 64, 74, 11, COLORS.dim, 600);

            const textX = cardX + 114;
            const textWidth = cardWidth - 224;
            const tournamentName = event.name && event.name !== '—' ? event.name : (event.eventName || 'Torneio');
            const eventName = event.eventName && event.eventName !== tournamentName ? event.eventName : 'Evento Start.gg';
            fitText(ctx, tournamentName, textX, cardY + 32, textWidth, 16, COLORS.text, 800, 12);
            fitText(ctx, eventName, textX, cardY + 56, textWidth, 12, COLORS.muted, 600, 10);
            fitText(ctx, `${event.date || 'Data não informada'} · ${Number(event.wins) || 0}V–${Number(event.losses) || 0}D · ${Number(event.winrate) || 0}% WR`, textX, cardY + 86, textWidth, 11, COLORS.dim, 600, 9);
        });
        fitText(ctx, 'Histórico e colocações conforme os eventos retornados pelo Start.gg.', x + 24, y + height - 15, width - 48, 10, COLORS.dim, 500, 9);
    }

    function drawSelectedGames(ctx, games, images) {
        const x = 680, y = 160, width = 1160, height = 112;
        panel(ctx, x, y, width, height, 20, COLORS.panel);
        fitText(ctx, 'JOGOS DO PLAYER', x + 22, y + 28, 320, 14, COLORS.muted, 800, 12);
        if (!games.length) {
            fitText(ctx, 'Nenhum jogo selecionado no perfil', x + 22, y + 76, width - 44, 18, COLORS.dim, 500, 15);
            return;
        }
        const gap = 10;
        const chipWidth = Math.min(145, Math.floor((width - 44 - gap * (games.length - 1)) / games.length));
        const startX = x + 22;
        games.forEach((game, index) => {
            const chipX = startX + index * (chipWidth + gap);
            const chipY = y + 39;
            roundedRect(ctx, chipX, chipY, chipWidth, 58, 10);
            ctx.fillStyle = '#172235';
            ctx.fill();
            const image = images.games[index];
            if (image) drawImageContain(ctx, image, chipX + 7, chipY + 5, chipWidth - 14, 32, 1);
            fitText(ctx, game.label || game.name || 'Jogo', chipX + 8, chipY + 50, chipWidth - 16, 11, '#cbd5e1', 700, 9);
        });
    }

    function drawCharacterUsage(ctx, data) {
        const x = 80, y = 710, width = 560, height = 330;
        panel(ctx, x, y, width, height, 20, '#0e1625');
        fitText(ctx, 'HISTÓRICO DE PERSONAGENS', x + 20, y + 31, 330, 15, COLORS.text, 900, 12);

        const games = Array.isArray(data.characterUsage) ? data.characterUsage : [];
        const shown = [...games]
            .sort((a, b) => (Number(b.reportedSelections) || 0) - (Number(a.reportedSelections) || 0) || String(a.gameName || '').localeCompare(String(b.gameName || '')))
            .slice(0, 4);
        const scope = data.historyComplete
            ? `Histórico completo · ${data.eventCount || 0} eventos`
            : 'Até 15 eventos recentes';
        ctx.textAlign = 'right';
        ctx.font = '600 10px Arial, sans-serif';
        ctx.fillStyle = COLORS.dim;
        ctx.fillText(games.length ? `${games.length} jogos · ${scope}` : scope, x + width - 20, y + 31);
        ctx.textAlign = 'left';

        if (!shown.length) {
            centeredText(ctx, 'Ainda não há personagens reportados nos sets analisados.', x + width / 2, y + 176, width - 60, 16, COLORS.muted, 600);
            fitText(ctx, 'Só entram seleções reportadas no Start.gg.', x + 20, y + height - 15, width - 40, 10, COLORS.dim, 500, 9);
            return;
        }

        const columns = shown.length <= 2 ? 1 : 2;
        const rows = Math.ceil(shown.length / columns);
        const gapX = 10, gapY = 9;
        const cardsTop = y + 47, cardsBottom = y + height - 34;
        const cardWidth = (width - 40 - gapX * (columns - 1)) / columns;
        const cardHeight = (cardsBottom - cardsTop - gapY * (rows - 1)) / rows;

        shown.forEach((game, index) => {
            const column = index % columns, row = Math.floor(index / columns);
            const cardX = x + 20 + column * (cardWidth + gapX);
            const cardY = cardsTop + row * (cardHeight + gapY);
            panel(ctx, cardX, cardY, cardWidth, cardHeight, 12, '#111b2b');
            fitText(ctx, game.gameName || 'Jogo', cardX + 10, cardY + 19, cardWidth - 88, 11, COLORS.text, 800, 9);
            const total = Math.max(0, Number(game.reportedSelections) || 0);
            ctx.textAlign = 'right';
            ctx.font = '600 9px Arial, sans-serif';
            ctx.fillStyle = COLORS.dim;
            ctx.fillText(`${total} reports`, cardX + cardWidth - 10, cardY + 19);
            ctx.textAlign = 'left';

            const characters = (Array.isArray(game.topCharacters) ? game.topCharacters : []).slice(0, 3);
            if (!characters.length) {
                fitText(ctx, 'Sem personagens reportados', cardX + 10, cardY + 48, cardWidth - 20, 10, COLORS.dim, 500, 9);
                return;
            }

            const innerWidth = cardWidth - 20;
            const rowStep = Math.min(58, (cardHeight - 48) / 3);
            characters.forEach((character, characterIndex) => {
                const rowY = cardY + 37 + characterIndex * rowStep;
                const count = Math.max(0, Number(character.count) || 0);
                const percentage = Math.max(0, Math.min(100, Number(character.percentage) || (total ? Math.round(count / total * 100) : 0)));
                fitText(ctx, `${characterIndex + 1}. ${character.name || 'Desconhecido'}`, cardX + 10, rowY, innerWidth - 88, 10, '#e2e8f0', 700, 8);
                ctx.textAlign = 'right';
                ctx.font = '700 10px Arial, sans-serif';
                ctx.fillStyle = COLORS.text;
                ctx.fillText(`${percentage}% (${count}/${total})`, cardX + cardWidth - 10, rowY);
                ctx.textAlign = 'left';

                const barX = cardX + 10, barY = rowY + 4, barWidth = innerWidth;
                roundedRect(ctx, barX, barY, barWidth, 3, 2);
                ctx.fillStyle = '#293548';
                ctx.fill();
                if (percentage > 0) {
                    roundedRect(ctx, barX, barY, Math.max(3, barWidth * percentage / 100), 3, 2);
                    ctx.fillStyle = characterIndex === 0 ? COLORS.redLight : '#d93a42';
                    ctx.fill();
                }
            });
        });

        const extra = Math.max(0, games.length - shown.length);
        const partialText = data.partial ? ' · contagem parcial' : '';
        fitText(ctx, `Percentuais entre characters reportados${extra ? ` · +${extra} jogos` : ''}${partialText}.`, x + 20, y + height - 14, width - 40, 10, data.partial ? COLORS.yellow : COLORS.dim, 500, 9);
    }

    function drawFlagPill(ctx, data, images) {
        if (images.flag) {
            drawImageContain(ctx, images.flag, 1600, 70, 48, 32);
        } else if (data.countryCode) {
            panel(ctx, 1600, 70, 64, 34, 9, '#172235');
            centeredText(ctx, String(data.countryCode).toUpperCase(), 1632, 93, 56, 12, COLORS.text, 800);
        }
    }

    function drawCard(data, images) {
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Não foi possível inicializar o canvas.');

        drawBackground(ctx);
        drawIdentity(ctx, data, images);
        drawMainCharacter(ctx, data, images, 80, 295, 560, 218);
        drawStat(ctx, 80, 525, 270, 82, 'Vitórias', `${data.wins} W`, COLORS.green);
        drawStat(ctx, 370, 525, 270, 82, 'Derrotas', `${data.losses} L`, '#f87171');
        const rateColor = data.winRate >= 60 ? COLORS.green : (data.winRate >= 40 ? COLORS.yellow : '#f87171');
        drawStat(ctx, 80, 617, 270, 82, 'Win rate', `${data.winRate}%`, rateColor);
        drawStat(ctx, 370, 617, 270, 82, 'Torneios', String(data.tournamentCount), COLORS.text);
        drawSelectedGames(ctx, data.games, images);
        drawTournamentHistory(ctx, data, images);
        drawCharacterUsage(ctx, data);
        drawFlagPill(ctx, data, images);

        if (images.sponsor) {
            drawImageContain(ctx, images.sponsor, 1680, 64, 145, 58, 1);
        } else if (data.sponsor) {
            ctx.textAlign = 'right';
            ctx.font = '800 16px Arial, sans-serif';
            ctx.fillStyle = '#fca5a5';
            ctx.fillText(data.sponsor, 1824, 103);
            ctx.textAlign = 'left';
        }

        ctx.textAlign = 'right';
        ctx.font = '600 12px Arial, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('fgchub.com.br  ·  desempenho Start.gg', 1838, 1050);
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.red;
        ctx.fillRect(80, 1051, 54, 4);

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) resolve(blob);
                else reject(new Error('O navegador não conseguiu exportar o PNG.'));
            }, 'image/png');
        });
    }

    async function render(data) {
        if (!document.createElement('canvas').getContext) {
            throw new Error('Este navegador não oferece suporte à geração do PNG.');
        }
        await document.fonts?.ready;
        const games = Array.isArray(data.games) ? data.games : [];
        const tournaments = Array.isArray(data.tournaments) ? data.tournaments : [];
        const eventImageUrls = tournaments.slice(0, 6).map(event => event.icon || event.image || event.eventImage || event.tournamentImage || '');
        const urls = [
            data.avatarUrl,
            data.mainCharacterImage,
            data.sponsorLogoUrl,
            data.flagUrl,
            ...games.map(game => game.logo),
            ...eventImageUrls
        ];
        const imagePromises = new Map();
        const loaded = await Promise.all(urls.map(url => {
            const key = typeof url === 'string' ? url.trim() : '';
            if (!imagePromises.has(key)) imagePromises.set(key, loadImage(url));
            return imagePromises.get(key);
        }));
        const images = {
            avatar: loaded[0],
            mainCharacter: loaded[1],
            sponsor: loaded[2],
            flag: loaded[3],
            games: loaded.slice(4, 4 + games.length),
            events: loaded.slice(4 + games.length)
        };
        const normalized = {
            ...data,
            games,
            tournaments,
            characterUsage: Array.isArray(data.characterUsage) ? data.characterUsage : [],
            recentForm: Array.isArray(data.recentForm) ? data.recentForm : [],
            wins: Math.max(0, Number(data.wins) || 0),
            losses: Math.max(0, Number(data.losses) || 0),
            winRate: Math.max(0, Math.min(100, Number(data.winRate) || 0)),
            tournamentCount: Math.max(0, Number(data.tournamentCount) || 0)
        };
        return drawCard(normalized, images);
    }

    window.FGCPlayerShareCard = { render, width: WIDTH, height: HEIGHT };
})();
