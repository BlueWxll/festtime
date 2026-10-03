#!/bin/sh
# Build Hodifly.
# 1. Recopie dans .env les variables définies dans Hodifly : server.js les lit au démarrage
#    (API_KEY, BROADCAST_CODE, OPENROUTER_API_KEY, OPENROUTER_MODEL).
# 2. Enregistre un instantané de l'API Webcup dans api/requests.json, utilisé en secours par le
#    backoffice agents quand le proxy Node (/api/requests) ne répond pas.
# Un échec ne bloque jamais le déploiement.

# Un .env déjà présent (poste de développement) n'est jamais écrasé
if [ ! -f .env ]; then
    for name in API_KEY BROADCAST_CODE OPENROUTER_API_KEY OPENROUTER_MODEL; do
        eval "value=\${$name}"
        if [ -n "$value" ]; then
            printf '%s=%s\n' "$name" "$value" >> .env
        fi
    done
    if [ -f .env ]; then
        echo ".env généré ($(cut -d= -f1 .env | tr '\n' ' '))"
    fi
fi

API_URL="https://24h.webcup.fr/wp-json/webcup/v1/requests"
OUT="api/requests.json"

if [ -z "$API_KEY" ]; then
    echo "API_KEY manquante : instantané API non généré" >&2
    exit 0
fi

mkdir -p api

if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 20 -H "X-Webcup-Api-Key: $API_KEY" -H "Accept: application/json" "$API_URL" -o "$OUT" || rm -f "$OUT"
elif command -v wget >/dev/null 2>&1; then
    wget -q -T 20 --header="X-Webcup-Api-Key: $API_KEY" --header="Accept: application/json" -O "$OUT" "$API_URL" || rm -f "$OUT"
else
    echo "Ni curl ni wget disponibles" >&2
fi

if [ -f "$OUT" ] && grep -q '"requests"' "$OUT"; then
    echo "$OUT généré"
else
    rm -f "$OUT"
    echo "Instantané API indisponible" >&2
fi

exit 0
