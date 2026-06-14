-- ====================================================================
-- Central Play Plus TV — Schema do banco (PostgreSQL / Supabase / Neon)
-- --------------------------------------------------------------------
-- Estrutura base para o backend (implementado pelo Codex).
-- Cobre: clientes, aparelhos, sessões, versões de app, remote config,
-- fornecedores, catálogo, variantes/rotas, telemetria e logs.
--
-- Observações:
--  * Dados sensíveis do fornecedor (usuário/senha/api_key) ficam APENAS
--    em provider_servers / provider_accounts e NUNCA são expostos à TV.
--  * Ajuste tipos/índices conforme o provedor (Supabase RLS, etc).
-- ====================================================================

create extension if not exists "pgcrypto";

-- ── Clientes ────────────────────────────────────────────────────────
create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         text,
  note          text,
  created_at    timestamptz not null default now()
);

-- ── Fornecedores / servidores (SENSÍVEL) ────────────────────────────
create table if not exists provider_servers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  kind          text not null check (kind in ('xtream','m3u','custom')),
  base_url      text not null,
  username      text,
  password      text,
  api_key       text,
  m3u_url       text,
  status        text not null default 'active' check (status in ('active','disabled')),
  created_at    timestamptz not null default now()
);

-- Conta do cliente dentro do fornecedor (SENSÍVEL)
create table if not exists provider_accounts (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  server_id     uuid not null references provider_servers(id),
  account_ref   text not null,            -- id da conta no fornecedor
  username      text not null,
  password      text not null,
  max_conns     int  not null default 1,
  status        text not null default 'active' check (status in ('active','blocked','expired')),
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

-- ── Aparelhos (TVs) ─────────────────────────────────────────────────
create table if not exists tv_devices (
  id            uuid primary key default gen_random_uuid(),
  device_key    text unique not null,     -- ex: CP-482913
  client_id     uuid references clients(id) on delete set null,
  server_id     uuid references provider_servers(id),
  install_id    text,
  platform      text not null check (platform in ('android_tv','lg_webos','samsung_tizen','roku')),
  device_model  text,
  app_version   text,
  token_hash    text,                     -- hash do access token vigente
  status        text not null default 'pending' check (status in ('pending','active','blocked','expired')),
  activated_at  timestamptz,
  expires_at    timestamptz,
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_tv_devices_status on tv_devices(status);
create index if not exists idx_tv_devices_client on tv_devices(client_id);

-- Tokens emitidos por aparelho (access/refresh) — guardar apenas hash
create table if not exists device_tokens (
  id            uuid primary key default gen_random_uuid(),
  device_id     uuid not null references tv_devices(id) on delete cascade,
  refresh_hash  text not null,
  expires_at    timestamptz not null,
  revoked       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists idx_device_tokens_device on device_tokens(device_id);

-- ── Sessões / controle de telas ─────────────────────────────────────
create table if not exists tv_sessions (
  id                 uuid primary key default gen_random_uuid(),
  device_id          uuid not null references tv_devices(id) on delete cascade,
  client_id          uuid references clients(id) on delete set null,
  started_at         timestamptz not null default now(),
  last_ping_at       timestamptz not null default now(),
  current_channel_id text,
  ip_address         text,
  status             text not null default 'online' check (status in ('online','offline'))
);
create index if not exists idx_tv_sessions_device on tv_sessions(device_id);
create index if not exists idx_tv_sessions_lastping on tv_sessions(last_ping_at);

-- ── Versões do app por plataforma ───────────────────────────────────
create table if not exists tv_app_versions (
  id                       uuid primary key default gen_random_uuid(),
  platform                 text not null check (platform in ('android_tv','lg_webos','samsung_tizen','roku')),
  latest_version           text not null,
  latest_version_code      int  not null,
  min_required_version_code int not null,
  force_update             boolean not null default false,
  message                  text,
  release_url              text,
  sha256                   text,
  created_at               timestamptz not null default now()
);
create index if not exists idx_app_versions_platform on tv_app_versions(platform);

-- ── Remote config (overrides por chave) ─────────────────────────────
create table if not exists tv_remote_config (
  key         text primary key,           -- ex: 'global' ou por plataforma
  config      jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ── Catálogo normalizado em cache ───────────────────────────────────
create table if not exists provider_catalog_cache (
  id          uuid primary key default gen_random_uuid(),
  server_id   uuid not null references provider_servers(id) on delete cascade,
  type        text not null check (type in ('live','vod','series')),
  payload     jsonb not null,             -- catálogo já normalizado
  version     text not null,
  fetched_at  timestamptz not null default now()
);
create index if not exists idx_catalog_server_type on provider_catalog_cache(server_id, type);

-- Canais normalizados (visíveis para a TV; sem provider_ref)
create table if not exists channels (
  id          text primary key,           -- ex: 'globo-rj'
  server_id   uuid references provider_servers(id) on delete cascade,
  name        text not null,
  logo        text,
  category    text,
  type        text not null default 'live' check (type in ('live','vod','series')),
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_channels_category on channels(category);

-- Variantes/rotas por canal (SENSÍVEL: provider_ref) + score
create table if not exists channel_variants (
  id                text primary key,     -- ex: 'globo-rj-hd-01'
  channel_id        text not null references channels(id) on delete cascade,
  quality           text not null check (quality in ('SD','HD','FHD','4K','ALT')),
  provider_ref      text not null,        -- referência crua no fornecedor
  health_score      int  not null default 100,
  avg_start_time_ms int  not null default 0,
  fail_count        int  not null default 0,
  success_count     int  not null default 0,
  status            text not null default 'active' check (status in ('active','blacklisted','disabled')),
  blacklisted_until timestamptz,
  last_checked_at   timestamptz,
  last_error_at     timestamptz
);
create index if not exists idx_variants_channel on channel_variants(channel_id);
create index if not exists idx_variants_score on channel_variants(health_score desc);

-- ── Telemetria / logs ───────────────────────────────────────────────
create table if not exists playback_events (
  id          bigserial primary key,
  device_id   uuid references tv_devices(id) on delete set null,
  channel_id  text,
  variant_id  text,
  event       text not null,
  value_ms    int,
  created_at  timestamptz not null default now()
);
create index if not exists idx_play_events_created on playback_events(created_at);

create table if not exists playback_errors (
  id            bigserial primary key,
  device_id     uuid references tv_devices(id) on delete set null,
  channel_id    text,
  variant_id    text,
  error_type    text not null,
  startup_time_ms int,
  created_at    timestamptz not null default now()
);
create index if not exists idx_play_errors_created on playback_errors(created_at);
create index if not exists idx_play_errors_variant on playback_errors(variant_id);

create table if not exists content_reports (
  id            text primary key,
  kind          text not null check (kind in ('channel','movie','series')),
  content_id    text not null,
  content_title text not null,
  category      text,
  device_key    text,
  reason        text,
  note          text,
  status        text not null default 'new' check (status in ('new','sent_to_media','resolved')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_content_reports_created on content_reports(created_at desc);
create index if not exists idx_content_reports_status on content_reports(status);

create table if not exists app_update_logs (
  id          bigserial primary key,
  device_id   uuid references tv_devices(id) on delete set null,
  from_version text,
  to_version   text,
  platform     text,
  created_at   timestamptz not null default now()
);
