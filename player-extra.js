// ============================================================
// FGC HUB - INFORMAÇÕES EXTRAS DO PERFIL START.GG
// ============================================================
//
// Este arquivo NÃO altera:
// - players.js
// - script.js
// - style.css
// - chave da API
// - cálculo de Win/Loss
// - Recent Form
//
// Ele apenas acrescenta informações ao perfil já renderizado.
// ============================================================

(function () {
    'use strict';

    const EXTRA_ID = 'fgchub-startgg-extra';
    const EXTRA_STYLE_ID = 'fgchub-startgg-extra-style';

    // ------------------------------------------------------------
    // Escapa texto antes de inserir no HTML.
    // ------------------------------------------------------------
    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ------------------------------------------------------------
    // Formata localização.
    // ------------------------------------------------------------
    function formatLocation(location) {
        if (!location) return '';

        const parts = [
            location.city,
            location.state,
            location.country
        ]
            .filter(Boolean)
            .map(value => String(value).trim())
            .filter(Boolean);

        return parts.join(', ');
    }

    // ------------------------------------------------------------
    // Formata data.
    // ------------------------------------------------------------
    function formatMemberSince(value) {
        if (!value) return '';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
        });
    }

    // ------------------------------------------------------------
    // Injeta apenas o CSS necessário.
    // Não altera style.css.
    // ------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById(EXTRA_STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');

        style.id = EXTRA_STYLE_ID;

        style.textContent = `
            #${EXTRA_ID} {
                margin-top: 18px;
                margin-bottom: 4px;
                padding: 18px 20px;
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 10px;
                background: rgba(255,255,255,0.025);
            }

            #${EXTRA_ID} .fgc-extra-title {
                margin: 0 0 14px 0;
                padding-left: 11px;
                border-left: 3px solid #ef4444;
                color: #cbd5e1;
                font-size: 12px;
                font-weight: 800;
                letter-spacing: 1.5px;
                text-transform: uppercase;
            }

            #${EXTRA_ID} .fgc-extra-main {
                display: flex;
                flex-wrap: wrap;
                gap: 10px 22px;
                align-items: center;
            }

            #${EXTRA_ID} .fgc-extra-item {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                color: #94a3b8;
                font-size: 13px;
                line-height: 1.4;
            }

            #${EXTRA_ID} .fgc-extra-label {
                color: #64748b;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: .5px;
            }

            #${EXTRA_ID} .fgc-extra-value {
                color: #e2e8f0;
                font-weight: 600;
            }

            #${EXTRA_ID} .fgc-extra-link {
                color: #f87171;
                text-decoration: none;
                font-weight: 700;
                transition: color .2s ease;
            }

            #${EXTRA_ID} .fgc-extra-link:hover {
                color: #fca5a5;
                text-decoration: underline;
            }

            @media (max-width: 640px) {
                #${EXTRA_ID} {
                    padding: 15px;
                }

                #${EXTRA_ID} .fgc-extra-main {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 9px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    // ------------------------------------------------------------
    // Consulta principal.
    //
    // Usa apenas campos básicos do User que são compatíveis com
    // o modelo atual já utilizado pelo próprio projeto:
    // slug e location.
    //
    // "name" é tratado como opcional.
    // ------------------------------------------------------------
    async function buscarPerfilBasico(playerId) {
        const query = `
            query FGCPlayerExtra($id: ID!) {
                player(id: $id) {
                    user {
                        name
                        slug
                        location {
                            city
                            state
                            country
                        }
                    }
                }
            }
        `;

        try {
            const json = await callStartGG(
                query,
                { id: playerId }
            );

            if (json?.errors?.length) {
                console.warn(
                    '[FGC HUB] Dados extras do perfil:',
                    json.errors
                );

                return null;
            }

            return json?.data?.player?.user || null;

        } catch (error) {
            console.warn(
                '[FGC HUB] Não foi possível carregar informações extras:',
                error
            );

            return null;
        }
    }

    // ------------------------------------------------------------
    // Consulta opcional da data de criação.
    //
    // Esta consulta é separada de propósito.
    // Se o schema/API atual não expuser createdAt, o restante
    // do perfil continua funcionando normalmente.
    // ------------------------------------------------------------
    async function buscarDataCriacao(playerId) {
        const query = `
            query FGCPlayerCreatedAt($id: ID!) {
                player(id: $id) {
                    user {
                        createdAt
                    }
                }
            }
        `;

        try {
            const json = await callStartGG(
                query,
                { id: playerId }
            );

            if (json?.errors?.length) {
                return null;
            }

            return (
                json?.data?.player?.user?.createdAt ||
                null
            );

        } catch (error) {
            return null;
        }
    }

    // ------------------------------------------------------------
    // Cria o bloco visual.
    // ------------------------------------------------------------
    function montarBlocoPerfil(user, createdAt) {
        const name =
            String(user?.name || '').trim();

        const location =
            formatLocation(
                user?.location
            );

        const memberSince =
            formatMemberSince(
                createdAt
            );

        const slug =
            String(user?.slug || '').trim();

        const startggUrl =
            slug
                ? (
                    slug.startsWith('http://') ||
                    slug.startsWith('https://')
                        ? slug
                        : `https://www.start.gg/${slug.replace(/^\/+/, '')}`
                )
                : '';

        const hasAnyData =
            Boolean(
                name ||
                location ||
                memberSince ||
                startggUrl
            );

        if (!hasAnyData) {
            return null;
        }

        const bloco =
            document.createElement('div');

        bloco.id =
            EXTRA_ID;

        let html = `
            <div class="fgc-extra-title">
                PERFIL START.GG
            </div>

            <div class="fgc-extra-main">
        `;

        if (name) {
            html += `
                <div class="fgc-extra-item">
                    <span class="fgc-extra-label">Nome</span>
                    <span class="fgc-extra-value">
                        ${escapeHtml(name)}
                    </span>
                </div>
            `;
        }

        if (memberSince) {
            html += `
                <div class="fgc-extra-item">
                    <span class="fgc-extra-label">Membro desde</span>
                    <span class="fgc-extra-value">
                        ${escapeHtml(memberSince)}
                    </span>
                </div>
            `;
        }

        if (location) {
            html += `
                <div class="fgc-extra-item">
                    <span class="fgc-extra-label">Localização</span>
                    <span class="fgc-extra-value">
                        ${escapeHtml(location)}
                    </span>
                </div>
            `;
        }

        if (startggUrl) {
            html += `
                <div class="fgc-extra-item">
                    <a
                        class="fgc-extra-link"
                        href="${escapeHtml(startggUrl)}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Ver perfil no Start.gg ↗
                    </a>
                </div>
            `;
        }

        html += `
            </div>
        `;

        bloco.innerHTML = html;

        return bloco;
    }

    // ------------------------------------------------------------
    // Insere o bloco sem alterar o HTML original do perfil.
    // ------------------------------------------------------------
    function inserirBloco(user, createdAt) {
        if (
            !user &&
            !createdAt
        ) {
            return;
        }

        const perfil =
            document.querySelector(
                '#perfil_conteudo .player-profile'
            );

        if (!perfil) {
            return;
        }

        const existente =
            document.getElementById(
                EXTRA_ID
            );

        if (existente) {
            existente.remove();
        }

        const bloco =
            montarBlocoPerfil(
                user,
                createdAt
            );

        if (!bloco) {
            return;
        }

        const recentForm =
            perfil.querySelector(
                '.recent-form'
            );

        if (recentForm) {
            recentForm.before(
                bloco
            );
            return;
        }

        perfil.appendChild(
            bloco
        );
    }

    // ------------------------------------------------------------
    // Carregamento.
    // ------------------------------------------------------------
    async function carregar() {
        const params =
            new URLSearchParams(
                window.location.search
            );

        const playerId =
            params.get('id');

        if (!playerId) {
            return;
        }

        /*
         * Aguarda o perfil original aparecer.
         * O código original continua responsável por
         * carregar/renderizar o perfil.
         */
        let tentativas = 0;

        while (
            !document.querySelector(
                '#perfil_conteudo .player-profile'
            ) &&
            tentativas < 100
        ) {
            await new Promise(
                resolve =>
                    setTimeout(resolve, 150)
            );

            tentativas++;
        }

        if (
            !document.querySelector(
                '#perfil_conteudo .player-profile'
            )
        ) {
            return;
        }

        const user =
            await buscarPerfilBasico(
                playerId
            );

        /*
         * A data é opcional.
         * Se não existir no schema, não quebra nada.
         */
        let createdAt = null;

        if (user) {
            createdAt =
                await buscarDataCriacao(
                    playerId
                );
        }

        inserirBloco(
            user,
            createdAt
        );
    }

    // ------------------------------------------------------------
    // Observer:
    //
    // Se o usuário clicar em "Atualizar dados", o perfil original
    // é renderizado novamente. O observer remove/reinsere apenas
    // nosso bloco extra.
    // ------------------------------------------------------------
    function iniciarObserver() {
        const alvo =
            document.getElementById(
                'perfil_conteudo'
            );

        if (!alvo) {
            return;
        }

        const observer =
            new MutationObserver(() => {

                const perfil =
                    alvo.querySelector(
                        '.player-profile'
                    );

                if (
                    perfil &&
                    !document.getElementById(
                        EXTRA_ID
                    )
                ) {
                    carregar();
                }
            });

        observer.observe(
            alvo,
            {
                childList: true,
                subtree: true
            }
        );
    }

    // ------------------------------------------------------------
    // Inicialização.
    // ------------------------------------------------------------
    function iniciar() {
        injectStyles();
        iniciarObserver();

        /*
         * Pequeno atraso para garantir que o perfil original
         * tenha terminado seu primeiro render.
         */
        setTimeout(
            carregar,
            200
        );
    }

    if (
        document.readyState === 'loading'
    ) {
        document.addEventListener(
            'DOMContentLoaded',
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

})();