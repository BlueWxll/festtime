#!/bin/sh
# Build Hodifly : écrit la clé API (variable d'environnement API_KEY) dans api/key.php pour le proxy PHP
set -e

if [ -z "$API_KEY" ]; then
    echo "API_KEY manquante : définissez-la dans les variables d'environnement" >&2
    exit 1
fi

printf "<?php return '%s';\n" "$API_KEY" > api/key.php
echo "api/key.php généré"
