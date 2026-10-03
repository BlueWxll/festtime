const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 1. Chargement sécurisé du fichier .env
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        try {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const idx = trimmed.indexOf('=');
                    if (idx !== -1) {
                        const key = trimmed.substring(0, idx).trim();
                        const val = trimmed.substring(idx + 1).trim().replace(/(^["']|["']$)/g, '');
                        if (!process.env[key]) {
                            process.env[key] = val;
                        }
                    }
                }
            });
            console.log('[ENV] Variables d\'environnement chargées depuis .env');
        } catch (err) {
            console.error('[ENV] Erreur de lecture du .env :', err.message);
        }
    } else {
        console.log('[ENV] Aucun fichier .env trouvé, utilisation des variables système.');
    }
}

loadEnv();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 's45f4ds5fgrtr4hytutyt45y4t54yty';
const WEBCUP_API_URL = 'https://24h.webcup.fr/wp-json/webcup/v1/requests';

// MIME types pour le serveur statique
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.pdf': 'application/pdf'
};

// Fichiers du dépôt qui ne doivent jamais être servis au public (code serveur, configuration, documentation)
const PRIVATE_ROOT_FILES = new Set(['server.js', 'package.json', 'package-lock.json', 'build.sh', 'hodifly.json']);
const PRIVATE_EXTENSIONS = new Set(['.md', '.sh', '.php', '.env', '.log', '.lock']);

function isPrivatePath(relPath) {
    const parts = relPath.split(/[\\/]+/).filter(Boolean);
    if (parts.some(part => part.startsWith('.') || part === 'node_modules')) return true;
    if (parts.length === 1 && PRIVATE_ROOT_FILES.has(parts[0].toLowerCase())) return true;
    return PRIVATE_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

// Cache de sécurité en cas de panne réseau
let lastCachedApiResponse = null;

// Création du serveur HTTP
const server = http.createServer((req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webcup-Api-Key');

    // En-têtes de sécurité
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // --- ENDPOINT : /api/config ---
    if (pathname === '/api/config') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'online',
            environment: 'Terra Nova Directorate v1.0',
            hasApiKey: Boolean(API_KEY),
            keyMasked: API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : null
        }));
        return;
    }

    // --- ENDPOINT : /api/requests (Proxy Webcup avec la clé .env) ---
    if (pathname === '/api/requests') {
        const clientKey = req.headers['x-webcup-api-key'] || parsedUrl.searchParams.get('api_key') || API_KEY;
        const targetUrl = new URL(WEBCUP_API_URL);

        const options = {
            hostname: targetUrl.hostname,
            path: targetUrl.pathname,
            method: 'GET',
            headers: {
                'X-Webcup-Api-Key': clientKey,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TerraNovaPlatform/1.0'
            },
            timeout: 10000
        };

        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            proxyRes.on('data', chunk => { data += chunk; });
            proxyRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    lastCachedApiResponse = parsed;
                    res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(parsed));
                } catch (e) {
                    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: 'Réponse JSON invalide reçue de l\'API Webcup', raw: data }));
                }
            });
        });

        proxyReq.on('error', (err) => {
            console.error('[PROXY ERROR]', err.message);
            if (lastCachedApiResponse) {
                console.log('[PROXY] Utilisation du cache de secours');
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'X-Fallback': 'true' });
                res.end(JSON.stringify(lastCachedApiResponse));
            } else {
                res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Impossible de contacter l\'API Webcup', details: err.message }));
            }
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Timeout lors de la liaison avec le relais Terra Nova' }));
        });

        proxyReq.end();
        return;
    }

    // --- SERVEUR DE FICHIERS STATIQUES ---
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

    // Sécurité : éviter les Directory Traversals
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Accès interdit');
        return;
    }

    const isPrivate = isPrivatePath(pathname);

    fs.stat(filePath, (err, stats) => {
        if (isPrivate || err || !stats.isFile()) {
            // Une ressource introuvable ou privée (chemin avec extension) renvoie une vraie 404
            if (path.extname(pathname)) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Ressource introuvable');
                return;
            }
            // Fallback SPA sur index.html pour les routes inconnues
            filePath = path.join(__dirname, 'index.html');
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('500 Erreur interne du serveur');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 SERVEUR TERRA NOVA OPÉRATIONNEL SUR LE PORT ${PORT}`);
    console.log(`📡 URL locale : http://localhost:${PORT}`);
    console.log(`🔑 Clé API active : ${API_KEY ? 'CONFIGURÉE (.env)' : 'NON CONFIGURÉE'}`);
    console.log(`=======================================================`);
});
