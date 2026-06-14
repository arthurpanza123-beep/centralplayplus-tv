# Super Prompt para o Codex — Central Play Plus

> Documento de handoff. O frontend (app de TV) e o painel `/admin` já estão prontos
> e validados visualmente. Sua missão é implementar TODO o backend, conectar o
> conteúdo real (Xtream + TMDB), finalizar o site de ativação e gerar o APK para TV.
> **NÃO altere o visual das telas** — só conecte dados reais e implemente a lógica.

---

## ⚡ MODO DE EXECUÇÃO CONTÍNUA (LEIA PRIMEIRO)

**Você deve executar este projeto do início ao fim sem parar para pedir confirmação.**

1. **NÃO PARE entre as etapas.** Termine uma seção e comece a próxima imediatamente.
   Faça as Seções 4 → 5 → 6 → 7 → 8 em ordem, uma após a outra, até concluir TUDO.
2. **NÃO peça permissão** para continuar, nem pergunte "quer que eu siga?". Apenas siga.
   A única exceção é se faltar um **segredo/credencial** que só o dono tem (ex.: uma
   chave de API ausente) — nesse caso, liste exatamente o que falta e continue com o
   restante que não depende daquele segredo.
3. **Trabalhe em ordem de dependência:** primeiro o backend (Provider Adapter Xtream +
   catálogo + ativação + play/fallback), depois conecte o app de TV aos dados reais,
   depois finalize o site de ativação, e SÓ ENTÃO gere o APK.
4. **Defina de pronto = funcionando de verdade.** Não deixe stub, mock, `501`, `TODO`,
   nem dado fake. Ao terminar:
   - O app deve mostrar **canais, filmes e séries REAIS** do Xtream, com **capas reais**
     (Xtream ou TMDB) — nada de gradiente/placeholder/mock.
   - O **site de ativação deve ativar de verdade** (Device Key → Yellow Box → Xtream),
     e a TV deve sair de "Não ativado" para "Ativado" e carregar o conteúdo do cliente.
   - Backend, APIs e banco populados e respondendo. Player tocando os streams.
5. **Valide antes de declarar concluído.** Rode o "Checklist final de aceite" (Seção 8)
   item por item, testando **canal por canal** (abrir, zapear, cair e recuperar sozinho).
6. **Entregue o pacote final:** app de TV pronto, backend/APIs prontos, site de ativação
   no ar ativando de verdade, e o **APK assinado** publicado no GitHub Releases e na VPS.
   Ao final, escreva um relatório curto do que foi feito, URLs/links e como instalar o APK.

> Resumindo o pedido do dono: **"não quero fazer nada — entregue o app pronto, backend
> pronto, APIs prontas e o site de ativação ativando de verdade, com canais, filmes e
> séries perfeitos, trocando capas e tudo por conteúdo real."** Execute até esse estado.

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

> **Estado atual (ponto de partida):** a tela de ativação (`components/tv/login-screen.tsx`)
> já faz polling real em `GET /api/tv/status/[deviceKey]` e renderiza 3 estados:
> **verificando**, **não ativado** (status `pending`/`blocked`/`expired`) e **ativado** (entra no app).
> O stub atualmente retorna `active` para o preview funcionar; defina `TV_STATUS_FORCE=pending`
> para ver o estado "Não ativado". Troque o stub pela lógica real do banco — a UI não precisa mudar.

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

## 7. APK para Android TV (passo a passo detalhado)

Objetivo: um APK **leve, rápido e fluido** em Android TV/TV Box baratas, com vídeo
nativo (ExoPlayer/Media3) e navegação 100% por controle remoto (D-pad).

### 7.1 Arquitetura recomendada
- App **híbrido**: a UI (que já existe e é responsiva para TV) roda numa WebView de alta
  performance, **mas o vídeo NÃO toca dentro da WebView**. Use uma ponte JS↔nativo para
  entregar a URL de play ao **ExoPlayer/Media3** nativo (HLS/TS), que é muito mais fluido.
  - Stack sugerida: **Capacitor** (empacota o Next.js exportado) + um **plugin nativo**
    que abre uma `PlayerActivity` com `androidx.media3:media3-exoplayer` +
    `media3-exoplayer-hls`. Alternativa: app 100% nativo Kotlin/Compose for TV consumindo a API.
- O front chama `/api/tv/channel/[id]/play` → recebe o token → manda a URL
  `/api/tv/stream/[token]` pro player nativo. A troca de variante (fallback) é feita
  pedindo um novo token sem fechar a `PlayerActivity`.

### 7.2 Configuração Android TV (obrigatória)
- `minSdk 21+`, `targetSdk` atual; `android.software.leanback` **required=false** só se
  também rodar em celular; para TV use `<uses-feature android:name="android.software.leanback" android:required="true"/>`
  e `<uses-feature android:name="android.hardware.touchscreen" android:required="false"/>`.
- `MainActivity` com `<intent-filter>` incluindo `android.intent.category.LEANBACK_LAUNCHER`
  (senão não aparece na home da TV).
- **Banner de TV** 320x180 (`android:banner`), ícone adaptativo, splash screen, `screenOrientation="landscape"`.
- `network_security_config` permitindo o domínio da API (e cleartext só se algum
  fornecedor exigir HTTP — preferir HTTPS sempre).

### 7.3 Controle remoto / D-pad
- Garantir foco visível (o contorno premium já existe no front) e navegação espacial.
- Mapear teclas: **OK** = play/abrir, **Voltar** = fecha player/volta aba,
  **setas** = navegação, **canal +/-** e setas ↑/↓ no player = zapping.
- Testar com `adb shell input keyevent` (DPAD_UP/DOWN/LEFT/RIGHT/CENTER/BACK).

### 7.4 Performance (metas)
- Cold start rápido; **zapping de canal < 1,5s** (ajudado pelo pré-buffer da Seção 5).
- Pré-bufferizar o próximo canal provável; manter o ExoPlayer "aquecido".
- Habilitar R8/minify + `shrinkResources`, remover libs não usadas, comprimir assets.
- Cache de imagens de capa (Coil/Glide) com placeholder.

### 7.5 Build de release assinado
- Gerar keystore (`keytool`), configurar `signingConfigs.release` no `build.gradle`.
- `./gradlew assembleRelease` (ou `bundleRelease`) → gera o `.apk` (ou `.aab`).
  Para sideload em TV Box use **APK**; para Play Store, AAB.
- Versionar `versionCode`/`versionName` a cada build.

### 7.6 Publicação e atualização automática
- Anexar o `app-release.apk` em **GitHub Releases** do repo `centralplayplus-tv`
  (tag por versão, ex.: `v1.0.0`).
- Subir o mesmo `.apk` na **VPS** para download direto (ex.: `https://device.centralplayplus.com.br/app/centralplayplus.apk`).
- Atualizar `/api/app/version` com `{ versionCode, versionName, apkUrl, mandatory }`
  para o app detectar versão nova e oferecer/forçar atualização (download do APK da VPS).
- Documentar no relatório final o **link do APK** e o passo a passo de instalação na TV
  (Downloader app / sideload / "fontes desconhecidas").

---

## 8. Checklist final de aceite

- [ ] **ZERO mock/placeholder/501/TODO** no fluxo do usuário — tudo conteúdo real.
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
