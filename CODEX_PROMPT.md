# Super Prompt para o Codex — Central Play Plus

> Documento de handoff. O frontend (app de TV) e o painel `/admin` já estão prontos
> e validados visualmente. Sua missão é implementar TODO o backend, conectar o
> conteúdo real (Xtream + TMDB), finalizar o site de ativação e gerar o APK para TV.
> **NÃO altere o visual das telas** — só conecte dados reais e implemente a lógica.

---

## 0. Regras de ouro (segurança)

1. **NUNCA** coloque segredos no código. Tudo via `process.env.*`.
2. A TV **nunca** fala direto com o fornecedor Xtream. Ela só fala com a NOSSA API.
   Credenciais Xtream, URLs do fornecedor e tokens ficam **somente no servidor**.
3. Os links de stream entregues à TV são **temporários e proxados/assinados** —
   nunca a URL crua do fornecedor.
4. Trocar de fornecedor deve afetar **apenas** o Provider Adapter (`lib/providers/`).
5. O painel `/admin` e as rotas `/api/admin/*` devem exigir autenticação real
   (Better Auth no Neon — o schema `neon_auth` já existe).
6. **Rotacione** as chaves que foram expostas em texto (TMDB e Yellow Box) antes de ir a produção.

---

## 1. Os dois projetos

| Projeto | Repo | Domínio | Função |
|---|---|---|---|
| **App de TV** | `arthurpanza123-beep/centralplayplus-tv` | (APK na TV) | App que o cliente usa na TV. Frontend pronto. |
| **Site de ativação** | `arthurpanza123-beep/centralplayplus-ativacao` | `device.centralplayplus.com.br` | Onde geramos/ativamos Device Keys, monitoramos e encaminhamos relatos. |

O painel `/admin` que já está neste repo é o protótipo do site de ativação.
Você pode **reaproveitar** o que já existe na VPS (há um projeto "no esquema" lá —
verifique antes de começar do zero) ou refazer do zero seguindo estes contratos.

---

## 2. O que JÁ está pronto neste repo (use como contrato, não refaça)

```
lib/types/tv.ts              Contratos de TODOS os payloads da API (Device Key, config, catálogo, play, heartbeat…)
lib/providers/*              Provider Adapter (camada isolada do fornecedor) — implemente o Xtream aqui
lib/config/remote-config.ts  Defaults de remote config
lib/api/helpers.ts           Respostas JSON, auth de aparelho e admin (isAdmin → reativar com Better Auth)
lib/db/client.ts             Cliente Neon Postgres (sql parametrizado)
lib/redis/client.ts          Cliente Upstash Redis + convenções de chaves
lib/redis/rate-limit.ts      Rate limiting (activation / play / api)
lib/cache/catalog-cache.ts   Cache de catálogo (TTL curto)
lib/streaming/variant-health.ts   Ranking de variantes + degrade/recover (FALLBACK)
lib/streaming/live-sessions.ts    Sessões ao vivo no Redis (alimenta o monitoramento)
lib/reports.ts               Relatos de "conteúdo não funcionando" (JÁ FUNCIONAL via Redis)
scripts/001_schema.sql       Schema Postgres completo (clients, tv_devices, sessions, channel_variants, telemetria…)

app/api/tv/*                 Rotas da TV (register, status, activate-token, config, home, categories,
                             channels, channel/[id]/play, stream/[token], playback-event,
                             playback-error, heartbeat, report-problem)
app/api/app/version          Versão do app / update obrigatório
app/api/admin/device/*       activate, block, renew, change-provider
app/api/admin/reports        Caixa de entrada dos relatos (JÁ FUNCIONAL)
app/api/cron/health-check    Cron (5 min, ver vercel.json) que testa variantes e ajusta health_score
```

A maioria das rotas TV/admin são **stubs** que retornam `501` com um `TODO(Codex)`.
Seu trabalho é implementar a lógica mantendo **exatamente** os formatos de `lib/types/tv.ts`.

---

## 3. Integrações e variáveis de ambiente

Configure tudo como env (na Vercel e/ou na VPS). **Não comitar valores.**

```bash
# Banco — Neon (já conectado no projeto v0)
DATABASE_URL=

# Cache / sessões / rate-limit — Upstash Redis (já conectado)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Admin / cron
ADMIN_API_KEY=
CRON_SECRET=

# Fornecedor Xtream (SOMENTE servidor) — preencher por cliente/fornecedor
XTREAM_BASE_URL=
XTREAM_USERNAME=
XTREAM_PASSWORD=

# Yellow Box (gera testes e ativa o Xtream) — tratar a URL inteira como SEGREDO
YELLOWBOX_API_URL=        # endpoint do chatbot (NÃO colar em código)

# TMDB (metadados e capas) — ROTACIONAR as chaves expostas
TMDB_READ_TOKEN=          # token de leitura v4 (Bearer)
TMDB_API_KEY=             # api key v3
```

---

## 4. Backend — o que implementar (em ordem)

### 4.1 Provider Adapter Xtream (`lib/providers/provider-main.ts`)
- Implementar contra a API Xtream Codes: `player_api.php` para `get_live_categories`,
  `get_live_streams`, `get_vod_categories`, `get_vod_streams`, `get_series`,
  `get_series_info`, `get_short_epg`, e a URL de stream (`/live/USER/PASS/ID.ts` ou `.m3u8`).
- Normalizar tudo para os tipos de `lib/types/tv.ts`.
- **Capas/poster**: usar a capa do Xtream quando existir; senão, buscar no **TMDB**
  por título/ano e cachear o resultado (Redis + coluna no Postgres). Nunca deixar card sem capa.

### 4.2 Catálogo conectado ao banco/cache
- `home`, `categories`, `channels`, filmes, séries e kids devem vir do fornecedor,
  normalizados e **cacheados** (`lib/cache/catalog-cache.ts`). Sincronizar periodicamente.
- Persistir catálogo em Postgres para busca rápida (tabela de conteúdos + índices).

### 4.3 Ativação por Device Key (fluxo completo)
- `POST /api/tv/register` → cria/recupera o aparelho e devolve `deviceKey` + status.
- `GET /api/tv/status/[deviceKey]` → a TV faz polling até ser ativada.
- Painel chama `POST /api/admin/device/activate` → vincula cliente/plano e,
  via **Yellow Box** (`YELLOWBOX_API_URL`), **gera o teste / ativa o Xtream** e guarda
  as credenciais do fornecedor no servidor (cifradas).
- `POST /api/tv/activate-token` → troca a Device Key ativada por um token de sessão da TV.

### 4.4 Play + Fallback (engenharia de estabilidade)
- `GET /api/tv/channel/[id]/play` → retorna a **melhor variante** (via `rankVariants`)
  + lista de fallback ordenada por `health_score`/prioridade.
- `GET /api/tv/stream/[token]` → **proxy/redirect assinado** que esconde a URL do fornecedor
  e permite trocar de variante sem reabrir o player.
- A TV reporta falhas em `POST /api/tv/playback-error` → `degradeVariant()` rebaixa a variante ruim.
- O cron `/api/cron/health-check` testa as variantes e chama `recoverVariant()`.

### 4.5 Sessões, heartbeat e monitoramento
- `POST /api/tv/heartbeat` → `touchSession()` (Redis) p/ online/offline e bloqueio remoto.
- `POST /api/tv/playback-event` → telemetria (início/fim, audiência).
- O `/admin` lê `listActiveSessions()`, erros e saúde — já cabeado ao front.

### 4.6 Relatos de "não funcionando" (JÁ FUNCIONAL)
- TV → `POST /api/tv/report-problem` → Redis → caixa de entrada em `/admin` (aba Relatos).
- Persistir também em Postgres (tabela `content_reports`) para histórico e métricas.
- Opcional: notificação (e-mail/Telegram/WhatsApp) ao operador a cada novo relato.

### 4.7 Admin protegido
- Trocar `isAdmin()` por sessão real (Better Auth/Neon). Proteger todo `/api/admin/*` e a página `/admin`.

---

## 5. App de TV — conectar o front (sem mexer no visual)

- Substituir os dados mock de `lib/data` por fetch das rotas `/api/tv/*` (SWR no client
  ou RSC). Manter os mesmos tipos para o visual não quebrar.
- Abas a conectar: **Início, Canais, Filmes, Séries, Kids, Buscar, Favoritos, Configurações**.
- **Ativação**: o app já tem fluxo `intro → login(ativação) → loading → app`
  (`app/page.tsx`, `lib/activation.ts`). Conectar a tela de ativação à API real
  (Device Key + polling de status). Remover o mock de ativação local e usar o backend.
- **Configurações**: Device Key real, plano, validade, dispositivos — tudo do banco.

### Checklist de engenharia do player (validar canal por canal)
- [ ] Trocar de canal sozinho quando a variante falha (fallback automático, sem ação do usuário).
- [ ] **Pré-carregar/pré-bufferizar** o próximo canal provável para iniciar mais rápido.
- [ ] Tempo de "zapping" baixo (medir e otimizar).
- [ ] Flash do nome do canal e EPG corretos (já no front).
- [ ] Reprodução em Android TV (ExoPlayer) com HLS/TS, legendas e faixas de áudio.
- [ ] Recuperação automática em queda de rede.

---

## 6. Site de ativação (`device.centralplayplus.com.br`)

- Pode ser este mesmo `/admin` promovido a app próprio (repo `centralplayplus-ativacao`)
  ou um deploy separado que consome a MESMA API.
- Funções: gerar/ativar Device Key, listar dispositivos + status, bloquear/renovar/trocar
  fornecedor, monitoramento ao vivo e caixa de relatos.
- Integrar com **Yellow Box** para geração de teste e ativação do Xtream.
- Apontar DNS de `device.centralplayplus.com.br` para o deploy e configurar TLS.

---

## 7. APK para Android TV

- Empacotar o app web como APK Android TV **otimizado e rápido**:
  - Opção recomendada: WebView/TWA dedicada para TV **ou** Capacitor, com ExoPlayer nativo
    para o vídeo (não reproduzir HLS dentro de WebView por performance).
  - Suporte a **D-pad/controle remoto** (a navegação espacial já existe no front — validar foco).
  - `splash`/ícone, `leanback` feature, banner de TV, orientação landscape, retomar estado.
  - Build de release assinado, minificado, com network security config.
- **Publicar o APK**:
  - Anexar o `.apk` em **GitHub Releases** do repo `centralplayplus-tv`.
  - Colocar o `.apk` também na **VPS** (download direto) e versionar em `/api/app/version`
    para o app oferecer atualização obrigatória quando sair versão nova.

---

## 8. Checklist final de aceite

- [ ] Catálogo real (filmes, séries, canais, kids) com **capas** vindo do Xtream/TMDB.
- [ ] Busca, favoritos e configurações conectados ao banco.
- [ ] Ativação por Device Key ponta a ponta (TV ↔ painel ↔ Yellow Box ↔ Xtream).
- [ ] Play com fallback automático + proxy assinado; health-check rodando.
- [ ] Heartbeat/sessões/telemetria alimentando o monitoramento do `/admin`.
- [ ] Relatos de "não funcionando" chegando no painel (+ persistência e notificação).
- [ ] `/admin` e `/api/admin/*` protegidos por login real.
- [ ] APK Android TV assinado, rápido, publicado no GitHub Releases e na VPS.
- [ ] `device.centralplayplus.com.br` no ar com backend funcionando.
- [ ] Teste **canal por canal**: zapping rápido, troca automática em falha, pré-buffer do próximo.

> Mantenha os contratos de `lib/types/tv.ts`. Se precisar mudar um formato,
> atualize o tipo **e** o consumidor no front juntos, para nada quebrar visualmente.
