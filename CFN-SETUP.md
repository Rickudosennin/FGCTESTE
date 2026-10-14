# Ativar a sincronização do CFN (Street Fighter 6)

O card "Street Fighter 6 · CFN" do `player.html` lê `data/cfn/<cfnId>.json`.
Esses arquivos são gerados 1x/dia por um robô do GitHub Actions (`.github/workflows/cfn-sync.yml`
→ `scripts/cfn-sync.mjs`) usando **a sua sessão** do Buckler's Boot Camp.
O visitante do site **não** precisa de conta e nunca fala com a Capcom.

> Uso não oficial: as rotas do Buckler não têm API pública. Use conta própria, poucas consultas
> e nunca exponha o cookie. Doc de referência: https://github.com/Matars/buckler-api-docs

## Arquivos

| Arquivo | Função |
| --- | --- |
| `player.html`, `players.js` | Botão CFN (só com SF6 em Jogos) + card com os dados |
| `scripts/cfn-sync.mjs` | Busca `profile/{id}/play.json` e grava `data/cfn/<id>.json` |
| `.github/workflows/cfn-sync.yml` | Agenda diária (06:00 Brasília) + execução manual |
| `data/cfn-ids.json` | Lista manual de CFN IDs (opcional). Ex.: `["1234567890"]` |
| `data/cfn/` | JSONs gerados pelo robô (não editar à mão) |

## Passo a passo

### 1. Subir os arquivos
Copie tudo para a raiz do repositório mantendo as pastas. A pasta `.github` é oculta no Windows
(ative "itens ocultos"). Faça commit e push na branch **main** (agendamentos só rodam na branch padrão).

### 2. Liberar o Actions
GitHub → repo → **Settings → Actions → General**:
- *Actions permissions*: **Allow all actions**.
- *Workflow permissions*: **Read and write permissions** → Save.

Se a aba **Actions** pedir, clique em *"I understand my workflows, go ahead and enable them"*.

### 3. Copiar os cookies do Buckler
1. Abra uma **janela anônima** e entre em https://www.streetfighter.com/6/buckler/en com a Capcom ID.
2. `F12` → aba **Application** → **Storage → Cookies → https://www.streetfighter.com**.
3. Copie o **Value** de: `buckler_id`, `buckler_r_id`, `buckler_praise_date`.
4. Feche a janela **sem clicar em sair/logout** (sair pode invalidar a sessão).

Nunca cole esses valores em chat, issue, commit ou qualquer arquivo do repo.

### 4. Montar o texto do cookie
Uma linha só, neste formato exato (ponto e vírgula + espaço, sem aspas, sem quebra de linha):

```
buckler_id=VALOR1; buckler_r_id=VALOR2; buckler_praise_date=VALOR3
```

Se algum dos três não aparecer, copie todos os cookies do domínio `streetfighter.com` no formato `nome=valor`.

### 5. Criar o secret
Repo → **Settings → Secrets and variables → Actions → Secrets → New repository secret**:
- Name: `BUCKLER_COOKIE` (exatamente assim)
- Secret: a linha do passo 4 → **Add secret**.

### 6. Ter pelo menos um CFN ID
- **Opção A**: no perfil do player no site, marque *Street Fighter 6* em **Jogos** e salve o CFN ID no botão CFN.
- **Opção B** (garante o teste): edite `data/cfn-ids.json` com um CFN ID real de 10 dígitos, ex.: `["1234567890"]`.

O script junta as duas fontes. Os IDs do site são lidos do Firestore (leitura pública das regras).
Se as regras bloquearem, o log avisa e só a Opção B vale.

### 7. Rodar na mão
Repo → **Actions → CFN sync → Run workflow** → branch `main` → marque **force** → **Run workflow**.
Espere 1–2 min, abra a execução → job **sync** → passo **Sincronizar CFN**.

Sucesso:
```
Firestore: N CFN ID(s) com SF6.
- 1234567890: ok
Concluído: 1 atualizado(s), 0 indisponível(is).
```
O robô cria o commit `chore(cfn): atualizar dados CFN` com `data/cfn/<id>.json`.

### 8. Ver no site
Aguarde o redeploy (GitHub Pages / Netlify ligado ao repo: ~1 min) e abra o perfil do player com SF6 + CFN ID.
Para testar local: `git pull` e sirva por http (`python -m http.server`). Abrir por `file://` bloqueia a leitura do JSON
e o card mostra "ainda não sincronizados".

### 9. Manutenção
- Roda sozinho todo dia. Sessão da Capcom expirou → o GitHub envia e-mail de falha → repita os passos 3–5 (só troque o valor do secret).
- Repo sem atividade por 60 dias → o GitHub pausa agendamentos → reative na aba Actions.
- Rank com nome/ícone: preencha `SF6_LEAGUE_NAMES` em `player.html` após ver o primeiro `data/cfn/<id>.json`.

## Problemas comuns

| Log / sintoma | Causa | Solução |
| --- | --- | --- |
| `BUCKLER_COOKIE vazio` | Secret não criado ou nome errado | Passo 5 |
| `Sessão do Buckler recusada` | Cookie mal copiado, expirado ou sessão invalidada | Passos 3–5 |
| `Firestore HTTP 403` | Regras bloqueiam leitura pública de `players` | Usar `data/cfn-ids.json` |
| `Nenhum CFN ID para sincronizar` | Ninguém salvou ID com SF6 e lista manual vazia | Passo 6 |
| `perfil indisponível` | ID errado ou perfil fechado | Conferir o ID |
| `HTTP 429` | Capcom limitando | Esperar horas; não rodar de novo |
| Falha no `git push` (403) | Workflow sem permissão de escrita | Passo 2 |
| Card diz "ainda não sincronizados" | Não existe `data/cfn/<id>.json` ou página em `file://` | Passos 7–8 |

## Privacidade
O script guarda só o necessário: MR/LP, main, tempo de jogo, win rate da temporada e top personagens.
Não guarda nome, clube, comentário nem status online. Qualquer pessoa pode salvar um CFN ID num perfil;
para remover os dados de alguém, apague `data/cfn/<id>.json` e o ID em `data/cfn-ids.json`.
