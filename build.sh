#!/bin/sh
# Build Hodifly : l'hébergement est statique (ni Node ni PHP). On enregistre donc au déploiement
# un instantané de l'API Webcup dans api/requests.json, lu par le backoffice agents.
# La clé vient de la variable d'environnement API_KEY. Un échec ne bloque jamais le déploiement.

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
    echo "Instantané API indisponible : le backoffice affichera HORS LIGNE" >&2
fi

exit 0
