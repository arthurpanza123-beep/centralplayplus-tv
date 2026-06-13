# Central Play Plus TV — Esqueleto do Backend (para o Codex)

Este repositório contém a experiência visual (v0) **e** o esqueleto do backend.
A lógica real (banco, fornecedor, workers, segurança) será implementada pelo Codex.
Os arquivos abaixo definem o "contrato" e a organização para isso.

## Estrutura

```txt
lib/types/tv.ts              Contratos públicos da API (o que a TV vê). Sem dados sensíveis.
lib/providers/types.ts       Tipos internos do fornecedor (SENSÍVEL — só backend).
lib/providers/provider-adapter.ts   Factory: escolhe o adapter por fornecedor.
lib/providers/provider-main.ts      Adapter principal (Xtream-like) — stubs a implementar.
lib/config/remote-config.ts  Defaults de remote config.
lib/api/helpers.ts           Respostas JSON, auth de aparelho e admin.
scripts/001_schema.sql       Schema do banco (todas as tabelas do briefing).
.env.example                 Variáveis de ambiente necessárias.
```

## Endpoints (App Router — `app/api/...`)

TV:
```txt
POST /api/tv/register
GET  /api/tv/status/:deviceKey
POST /api/tv/activate-token
GET  /api/tv/config
GET  /api/tv/home
GET  /api/tv/categories
GET  /api/tv/channels
GET  /api/tv/channel/:id/play
POST /api/tv/playback-event
POST /api/tv/playback-error
POST /api/tv/heartbeat
```

App / Admin:
```txt
GET  /api/app/version
POST /api/admin/device/activate
POST /api/admin/device/block
POST /api/admin/device/renew
POST /api/admin/device/change-provider
```

Cada rota retorna um stub com comentários `TODO(Codex)` indicando a lógica esperada.

## Regras de ouro

1. A TV conversa **apenas** com a API da Central Play Plus.
2. Nenhum dado sensível do fornecedor (DNS/usuário/senha/api_key/M3U) vai para a TV.
3. Trocar de fornecedor = implementar um novo `ProviderAdapter`, sem mexer no resto.
4. Links de reprodução são temporários/proxados e a API escolhe a melhor rota.
5. `/api/admin/*` exige header `x-admin-key` igual a `ADMIN_API_KEY`.

## Próximos passos sugeridos (V1 / MVP)

- Implementar Device Key + ativação pelo painel (register/status/activate).
- Conectar o banco (scripts/001_schema.sql) e o Provider Adapter principal.
- Normalizar catálogo (live primeiro) com cache.
- Reprodução por canal com fallback básico + telemetria de erro.
- Heartbeat, remote config e versão por plataforma.
