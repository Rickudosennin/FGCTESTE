const STARTGG_TOKEN = "43b15884e09284466a58db7b06350b50"; // Token Start.gg

async function obterDadosPlayer(playerId, gamerTagFallback = 'Player', forceRefresh = false, prefixFallback = '') {
    const cacheKey = `fgchub_player_${playerId}`;
    
    // Verifica cache local se não for forçado o refresh
    if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Date.now() - parsed.timestamp < 3600000) { // Cache por 1 hora
                    return { dados: parsed.dados, fonte: 'cache' };
                }
            } catch (e) {
                console.warn("Erro ao ler cache do player:", e);
            }
        }
    }

    // Query GraphQL buscando dados do usuário, localização e eventos
    const query = `
    query GetPlayerProfile($userId: ID!) {
      user(id: $userId) {
        id
        gamerTag
        prefix
        name
        location {
          country
        }
        images {
          url
          type
        }
        events(query: { perPage: 12, page: 1 }) {
          nodes {
            id
            name
            tournament {
              name
              images {
                url
                type
              }
            }
            userEntrant(userId: $userId) {
              id
              standing {
                placement
              }
            }
          }
        }
      }
    }`;

    try {
        const response = await fetch('https://api.start.gg/gql/alpha', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${STARTGG_TOKEN}`
            },
            body: JSON.stringify({
                query: query,
                variables: { userId: playerId }
            })
        });

        const result = await response.json();
        const user = result.data?.user;

        if (!user) {
            throw new Error("Usuário não encontrado na Start.gg");
        }

        // Extração de imagens (Avatar e Banner)
        const avatarObj = user.images?.find(img => img.type === 'profile');
        const bannerObj = user.images?.find(img => img.type === 'banner');

        const avatarUrl = avatarObj ? avatarObj.url : '';
        const bannerUrl = bannerObj ? bannerObj.url : '';
        
        // Extração do País (Localização)
        const country = user.location?.country || '';

        // Processamento dos torneios
        let totalWins = 0;
        let totalLosses = 0;
        const recentForm = [];
        const highlights = [];
        const tournaments = [];

        if (user.events?.nodes) {
            user.events.nodes.forEach(evt => {
                const placement = evt.userEntrant?.standing?.placement || 0;
                const tournamentName = evt.tournament?.name || 'Torneio';
                const eventName = evt.name || '';
                const logoObj = evt.tournament?.images?.find(img => img.type === 'profile');
                const image = logoObj ? logoObj.url : '';

                if (placement > 0) {
                    recentForm.push({
                        placement: placement,
                        eventName: `${tournamentName} - ${eventName}`,
                        image: image
                    });

                    highlights.push({
                        eventName: `${tournamentName} (${eventName})`,
                        placement: `${placement}`
                    });

                    tournaments.push({
                        name: tournamentName,
                        eventName: eventName,
                        placement: placement,
                        attendees: 'N/A',
                        wins: 0,
                        losses: 0,
                        winrate: 0,
                        date: 'Recente'
                    });
                }
            });
        }

        // Estimativa estatística baseada nos torneios listados
        totalWins = tournaments.reduce((acc, curr) => acc + (curr.placement <= 8 ? 3 : 1), 0);
        totalLosses = tournaments.length * 2;
        const totalSets = totalWins + totalLosses;
        const winrateAllTime = totalSets > 0 ? Math.round((totalWins / totalSets) * 100) : 0;

        const dadosProcessed = {
            gamerTag: user.gamerTag || gamerTagFallback,
            playerPrefix: user.prefix || prefixFallback,
            realName: user.name || '',
            country: country, // <-- Dado retornado do GraphQL da Start.gg
            avatarUrl: avatarUrl,
            bannerUrl: bannerUrl,
            totalWins: totalWins,
            totalLosses: totalLosses,
            winrateAllTime: winrateAllTime,
            recentForm: recentForm.slice(0, 6),
            highlights: highlights.slice(0, 5),
            tournaments: tournaments
        };

        // Salva no cache local
        localStorage.setItem(cacheKey, JSON.stringify({
            timestamp: Date.now(),
            dados: dadosProcessed
        }));

        return { dados: dadosProcessed, fonte: 'live' };

    } catch (error) {
        console.error("Erro na busca de dados do jogador:", error);
        
        // Fallback genérico em caso de falha da API
        return {
            dados: {
                gamerTag: gamerTagFallback,
                playerPrefix: prefixFallback,
                realName: '',
                country: '',
                avatarUrl: '',
                bannerUrl: '',
                totalWins: 0,
                totalLosses: 0,
                winrateAllTime: 0,
                recentForm: [],
                highlights: [],
                tournaments: []
            },
            fonte: 'error'
        };
    }
}