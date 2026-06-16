#!/usr/bin/env bash
set -euo pipefail

cd /opt/centralplayplus-tv
set -a
source .env.local
set +a

read -rp "Cole o DNS Xtream principal, ex: http://host:porta : " NEW_XTREAM_BASE
read -rp "Cole o usuário Xtream: " NEW_XTREAM_USER
read -srp "Cole a senha Xtream: " NEW_XTREAM_PASS
echo

if [ -z "$NEW_XTREAM_BASE" ] || [ -z "$NEW_XTREAM_USER" ] || [ -z "$NEW_XTREAM_PASS" ]; then
  echo "ERRO: DNS/usuário/senha vazio"
  exit 1
fi

node - <<'NODE' "$NEW_XTREAM_BASE" > /tmp/normalized_xtream_base.txt
const raw = process.argv[2] || "";
function normalize(value) {
  let v = value.trim();
  if (!/^https?:\/\//i.test(v)) v = "http://" + v;
  const u = new URL(v);
  u.username = "";
  u.password = "";
  u.search = "";
  u.hash = "";
  u.pathname = u.pathname
    .replace(/\/player_api\.php.*$/i, "")
    .replace(/\/get\.php.*$/i, "")
    .replace(/\/xmltv\.php.*$/i, "")
    .replace(/\/live\/.*$/i, "")
    .replace(/\/movie\/.*$/i, "")
    .replace(/\/series\/.*$/i, "")
    .replace(/\/+$/g, "");
  return u.toString().replace(/\/$/, "");
}
console.log(normalize(raw));
NODE

NORMALIZED_BASE="$(cat /tmp/normalized_xtream_base.txt)"

if [ -z "$NORMALIZED_BASE" ]; then
  echo "ERRO: normalização falhou"
  exit 1
fi

cp .env.local ".env.local.bak-real-xtream-$(date +%Y%m%d-%H%M%S)"

node - <<'NODE' "$NORMALIZED_BASE"
const fs = require("fs");
const file = ".env.local";
const next = process.argv[2] || "";
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
let found = false;
const updated = lines.map((line) => {
  if (/^YELLOW_BOX_XTREAM_URL=/.test(line)) {
    found = true;
    return `YELLOW_BOX_XTREAM_URL=${next}`;
  }
  return line;
});
if (!found) updated.push(`YELLOW_BOX_XTREAM_URL=${next}`);
fs.writeFileSync(file, updated.join("\n").replace(/\n*$/, "\n"));
NODE

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v base="$NORMALIZED_BASE" \
  -v xtuser="$NEW_XTREAM_USER" \
  -v xtpass="$NEW_XTREAM_PASS" <<'SQL'
update provider_servers
set
  base_url = :'base',
  username = :'xtuser',
  password = :'xtpass'
where name = 'Yellow Box'
  and kind = 'xtream';

update provider_accounts pa
set
  username = :'xtuser',
  password = :'xtpass'
from provider_servers ps
where pa.server_id = ps.id
  and ps.name = 'Yellow Box'
  and ps.kind = 'xtream'
  and pa.id = (
    select pa2.id
    from provider_accounts pa2
    where pa2.server_id = ps.id
      and pa2.status = 'active'
    order by pa2.created_at desc
    limit 1
  );

select
  name,
  kind,
  case when base_url is null or base_url = '' then 'EMPTY' else 'SET' end as base_url_status,
  case when username is null or username = '' then 'EMPTY' else 'SET' end as username_status,
  case when password is null or password = '' then 'EMPTY' else 'SET' end as password_status
from provider_servers
where name = 'Yellow Box';
SQL

rm -f /tmp/normalized_xtream_base.txt
unset NEW_XTREAM_BASE NEW_XTREAM_USER NEW_XTREAM_PASS NORMALIZED_BASE

echo "OK: provider Xtream atualizado sem imprimir segredos."
