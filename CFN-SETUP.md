# Integração Street Fighter 6 — FGC HUB

## Como funciona

1. O jogador cadastra o CFN ID no próprio perfil FGC HUB.
2. O identificador é salvo no Firestore no documento daquele jogador.
3. O workflow **CFN sync** coleta os perfis da fila e grava `data/cfn/<CFN_ID>.json`.
4. O perfil lê o JSON publicado e renderiza a seção **Desempenho · Street Fighter 6**.

A integração não pede login ou cookie de cada jogador. A coleta atual usa uma sessão Buckler administrativa armazenada como secret do GitHub Actions.

## Configuração obrigatória (uma vez)

1. Entrar no GitHub → repositório **FGCTESTE** → **Settings** → **Secrets and variables** → **Actions**.
2. Criar repository secret com o nome `BUCKLER_COOKIE`.
3. Colar o valor do cookie de sessão de uma conta Buckler autorizada. Não colocar esse valor em arquivos, commits, issues ou conversas.
4. Em **Settings → Actions → General → Workflow permissions**, habilitar **Read and write permissions**.
5. Abrir **Actions → CFN sync → Run workflow** para executar a primeira coleta.

O workflow também está agendado diariamente às 06:00 (horário de Brasília).

## Dados exibidos

- Personagem favorito
- MR atual, LP e posição no ranking MR
- Partidas, vitórias, derrotas e win rate da temporada
- Tempo total de jogo
- Até 3 personagens mais utilizados
- Data da última sincronização

A seção mostra estado de "ainda não sincronizado" enquanto o JSON do CFN não existir.

## Limitações e segurança

- Buckler usa rotas internas não documentadas oficialmente; a Capcom pode alterá-las.
- O workflow para em respostas 401, 403, 429 ou erros 5xx; não tenta contornar autenticação ou limites.
- O cookie é usado somente no GitHub Actions e nunca enviado ao navegador do visitante.
- A coleta atual usa o ID numérico de 10 dígitos como identificador do perfil Buckler. Confirmar a primeira execução com o CFN de teste antes de ampliar a fila.
- Os dados ficam em arquivos JSON públicos do repositório porque o GitHub Pages precisa servi-los sem autenticação.
- A coleta atual não importa histórico completo de MR nem dados de matchup; esses conjuntos exigem outra fonte/rotina.

## Diagnóstico

- **BUCKLER_COOKIE vazio** → cadastrar/renovar o secret.
- **401/403 ou redirecionamento** → sessão expirou; renovar o secret.
- **429** → limite da fonte; aguardar próxima execução.
- **Firestore HTTP 403** → a leitura REST da coleção `players` não está pública; a fila manual `data/cfn-ids.json` continua disponível.
- **Perfil indisponível** → conferir se o User Code/CFN ID corresponde ao perfil Buckler.

