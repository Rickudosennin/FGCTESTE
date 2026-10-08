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

    function loadImage(url, timeoutMs = 4500) {
        if (!url || typeof url !== 'string') return Promise.resolve(null);
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
        fitText(ctx, 'PLAYER PERFORMANCE', 108, 122, 390, 16, COLORS.muted, 700, 14);
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
        fitText(ctx, tag, 218, 218, 400, 41, COLORS.text, 900, 26);
        fitText(ctx, data.realName || 'Competidor FGC', 220, 248, 385, 18, COLORS.muted, 500, 15);

        let meta = data.countryCode ? String(data.countryCode).toUpperCase() : 'FGC HUB';
        if (data.countryName) meta += `  ·  ${data.countryName}`;
        fitText(ctx, meta, 220, 275, 395, 13, COLORS.dim, 600, 12);
    }

    function drawMainCharacter(ctx, data, images) {
        const x = 80, y = 315, width = 560, height = 370;
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
        fitText(ctx, value, x + 40, y + 59, width - 60, 38, accent, 900, 25);
        fitText(ctx, label.toUpperCase(), x + 40, y + 88, width - 60, 13, COLORS.muted, 800, 11);
    }

    function drawRecentForm(ctx, placements) {
        fitText(ctx, 'FORMA RECENTE', 82, 980, 260, 13, COLORS.muted, 800, 12);
        const values = (Array.isArray(placements) ? placements : []).slice(0, 6);
        if (!values.length) {
            fitText(ctx, 'Sem resultados recentes disponíveis', 82, 1020, 450, 15, COLORS.dim, 500, 14);
            return;
        }
        values.forEach((item, index) => {
            const value = String(item?.placement ?? '—');
            const x = 82 + index * 88;
            panel(ctx, x, 994, 74, 43, 12, '#121b2b');
            centeredText(ctx, value, x + 37, 1023, 62, 19, COLORS.text, 800);
        });
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
        const x = 680, y = 295, width = 1160, height = 690;
        panel(ctx, x, y, width, height, 22, '#0e1625');
        fitText(ctx, 'PERSONAGENS MAIS USADOS', x + 24, y + 38, 520, 18, COLORS.text, 900, 15);

        const metaText = data.historyComplete
            ? `Histórico completo · ${data.eventCount || 0} eventos · ${data.setCount || 0} sets`
            : 'Até 15 eventos recentes';
        ctx.textAlign = 'right';
        ctx.font = '600 13px Arial, sans-serif';
        ctx.fillStyle = COLORS.dim;
        ctx.fillText(metaText, x + width - 24, y + 38);
        ctx.textAlign = 'left';

        const games = Array.isArray(data.characterUsage) ? data.characterUsage : [];
        const cardsTop = y + 62;
        const cardsBottom = y + height - 42;
        if (!games.length) {
            centeredText(ctx, 'Ainda não há personagens reportados nos sets analisados.', x + width / 2, y + 360, width - 100, 24, COLORS.muted, 600);
            fitText(ctx, 'Os percentuais consideram somente characters reportados no Start.gg.', x + 24, y + height - 17, width - 48, 12, COLORS.dim, 500, 11);
            return;
        }

        const columns = 2;
        const rows = Math.ceil(games.length / columns);
        const gapX = 16;
        const gapY = 12;
        const cardWidth = (width - 44 - gapX) / columns;
        const cardHeight = Math.min(178, (cardsBottom - cardsTop - gapY * (rows - 1)) / rows);

        games.forEach((game, index) => {
            const column = index % columns;
            const row = Math.floor(index / columns);
            const cardX = x + 22 + column * (cardWidth + gapX);
            const cardY = cardsTop + row * (cardHeight + gapY);
            panel(ctx, cardX, cardY, cardWidth, cardHeight, 14, '#111b2b');
            fitText(ctx, game.gameName || 'Jogo', cardX + 16, cardY + 26, cardWidth - 140, 15, COLORS.text, 800, 12);
            const total = Math.max(0, Number(game.reportedSelections) || 0);
            ctx.textAlign = 'right';
            ctx.font = '600 11px Arial, sans-serif';
            ctx.fillStyle = COLORS.dim;
            ctx.fillText(`${total} reports`, cardX + cardWidth - 16, cardY + 26);
            ctx.textAlign = 'left';

            const characters = (Array.isArray(game.topCharacters) ? game.topCharacters : []).slice(0, 3);
            if (!characters.length) {
                fitText(ctx, 'Sem personagem reportado', cardX + 16, cardY + 66, cardWidth - 32, 13, COLORS.dim, 500, 12);
                return;
            }

            const innerWidth = cardWidth - 32;
            const rowStart = cardY + 54;
            const rowStep = Math.min(35, Math.max(28, (cardHeight - 62) / 3));
            characters.forEach((character, characterIndex) => {
                const rowY = rowStart + characterIndex * rowStep;
                const name = character.name || 'Desconhecido';
                const percentage = Math.max(0, Math.min(100, Number(character.percentage) || 0));
                const count = Math.max(0, Number(character.count) || 0);
                fitText(ctx, `${characterIndex + 1}. ${name}`, cardX + 16, rowY, innerWidth - 112, 13, '#e2e8f0', 700, 10);
                ctx.textAlign = 'right';
                ctx.font = '700 12px Arial, sans-serif';
                ctx.fillStyle = COLORS.text;
                ctx.fillText(`${percentage}%  (${count}/${total})`, cardX + cardWidth - 16, rowY);
                ctx.textAlign = 'left';

                const barX = cardX + 16;
                const barY = rowY + 8;
                const barWidth = innerWidth;
                roundedRect(ctx, barX, barY, barWidth, 6, 3);
                ctx.fillStyle = '#293548';
                ctx.fill();
                if (percentage > 0) {
                    roundedRect(ctx, barX, barY, Math.max(5, barWidth * percentage / 100), 6, 3);
                    ctx.fillStyle = index === 0 && characterIndex === 0 ? COLORS.redLight : '#d93a42';
                    ctx.fill();
                }
            });
        });

        const partialText = data.partial ? ' · contagem parcial' : '';
        fitText(ctx, `Percentuais somente entre personagens reportados no Start.gg${partialText}.`, x + 24, y + height - 17, width - 48, 12, data.partial ? COLORS.yellow : COLORS.dim, 500, 11);
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
        drawMainCharacter(ctx, data, images);
        drawStat(ctx, 80, 710, 270, 112, 'Vitórias', `${data.wins} W`, COLORS.green);
        drawStat(ctx, 370, 710, 270, 112, 'Derrotas', `${data.losses} L`, '#f87171');
        const rateColor = data.winRate >= 60 ? COLORS.green : (data.winRate >= 40 ? COLORS.yellow : '#f87171');
        drawStat(ctx, 80, 835, 270, 112, 'Win rate', `${data.winRate}%`, rateColor);
        drawStat(ctx, 370, 835, 270, 112, 'Torneios', String(data.tournamentCount), COLORS.text);
        drawRecentForm(ctx, data.recentForm);
        drawSelectedGames(ctx, data.games, images);
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
        const urls = [
            data.avatarUrl,
            data.mainCharacterImage,
            data.sponsorLogoUrl,
            data.flagUrl,
            ...games.map(game => game.logo)
        ];
        const loaded = await Promise.all(urls.map(url => loadImage(url)));
        const images = {
            avatar: loaded[0],
            mainCharacter: loaded[1],
            sponsor: loaded[2],
            flag: loaded[3],
            games: loaded.slice(4)
        };
        const normalized = {
            ...data,
            games,
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
