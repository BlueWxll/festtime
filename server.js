const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');
const crypto = require('crypto');

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

// Diffusion des messages aux habitants (D18) : code exigé pour publier ou lever un message
const BROADCAST_CODE = process.env.BROADCAST_CODE || '';
// Recommandations adaptées par IA (F31) via OpenRouter
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/free';
const SEED_BROADCASTS = require('./assets/alert-seeds.js');

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
    if (parts[0] === 'data') return true;
    if (parts.length === 1 && PRIVATE_ROOT_FILES.has(parts[0].toLowerCase())) return true;
    return PRIVATE_EXTENSIONS.has(path.extname(relPath).toLowerCase());
}

// Cache de sécurité en cas de panne réseau
let lastCachedApiResponse = null;

// ==========================================
// STOCKAGE (messages diffusés, recommandations déjà générées)
// ==========================================
// Chaque déploiement publie une nouvelle version dans releases/<id> : les données vivent à côté pour survivre.
function resolveDataDir() {
    const candidates = [process.env.DATA_DIR];
    if (path.basename(path.dirname(__dirname)) === 'releases') candidates.push(path.resolve(__dirname, '..', '..', 'data'));
    candidates.push(path.join(__dirname, 'data'), path.join(os.tmpdir(), 'terra-nova-data'));

    for (const dir of candidates.filter(Boolean)) {
        try {
            fs.mkdirSync(dir, { recursive: true });
            fs.accessSync(dir, fs.constants.W_OK);
            return dir;
        } catch (err) { }
    }
    return null;
}

const DATA_DIR = resolveDataDir();

// Relu à chaque requête : plusieurs processus du serveur peuvent tourner en parallèle
function readStore(name, fallback) {
    if (!DATA_DIR) return fallback;
    try {
        return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8'));
    } catch (err) {
        return fallback;
    }
}

function writeStore(name, value) {
    if (!DATA_DIR) return false;
    try {
        fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(value));
        return true;
    } catch (err) {
        console.error('[DATA] Écriture impossible :', err.message);
        return false;
    }
}

function sendJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
}

function readJsonBody(req, limit = 10000) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', chunk => {
            size += chunk.length;
            if (size > limit) {
                reject(new Error('Corps de requête trop volumineux'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
            } catch (err) {
                reject(new Error('JSON invalide'));
            }
        });
        req.on('error', reject);
    });
}

function cleanText(value, max) {
    return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

// Limite simple par adresse : protège le code de diffusion et le quota du service d'IA
const rateBuckets = new Map();
function rateLimited(req, bucket, max, windowMs) {
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const key = `${bucket}:${ip}`;
    const now = Date.now();
    if (rateBuckets.size > 5000) rateBuckets.clear();
    const hits = (rateBuckets.get(key) || []).filter(time => now - time < windowMs);
    hits.push(now);
    rateBuckets.set(key, hits);
    return hits.length > max;
}

// ==========================================
// DIFFUSION DE MESSAGES AUX HABITANTS (D18, F29, F30)
// ==========================================
const BROADCAST_LEVELS = ['info', 'important', 'alerte', 'urgence'];

function isBroadcastCode(value) {
    if (!BROADCAST_CODE || typeof value !== 'string') return false;
    const given = Buffer.from(value);
    const expected = Buffer.from(BROADCAST_CODE);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function loadBroadcasts() {
    const store = readStore('broadcasts.json', {});
    return {
        broadcasts: Array.isArray(store.broadcasts) ? store.broadcasts : [],
        retired: Array.isArray(store.retired) ? store.retired : []
    };
}

function buildBroadcast(input) {
    const title = cleanText(input.title, 120);
    const body = cleanText(input.body, 600);
    if (!title || !body) return null;

    const now = new Date();
    const hours = Number(input.durationHours);
    return {
        id: `MSG-${now.getTime().toString(36).toUpperCase()}`,
        level: BROADCAST_LEVELS.includes(input.level) ? input.level : 'info',
        title,
        body,
        action: cleanText(input.action, 600),
        sectors: Array.isArray(input.sectors) ? input.sectors.map(sector => cleanText(sector, 60)).filter(Boolean).slice(0, 8) : [],
        source: cleanText(input.source, 80) || 'Haut Conseil de la Ville',
        advice: Boolean(input.advice),
        createdAt: now.toISOString(),
        expiresAt: hours > 0 ? new Date(now.getTime() + Math.min(hours, 720) * 3600000).toISOString() : null
    };
}

async function handleBroadcasts(req, res, pathname) {
    if (req.method === 'GET') {
        const store = loadBroadcasts();
        sendJson(res, 200, {
            publishing: Boolean(BROADCAST_CODE && DATA_DIR),
            broadcasts: store.broadcasts,
            retired: store.retired,
            serverTime: new Date().toISOString()
        });
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Méthode non autorisée' });
        return;
    }
    if (rateLimited(req, 'broadcast', 10, 10 * 60000)) {
        sendJson(res, 429, { error: 'Trop de tentatives, réessayez dans quelques minutes' });
        return;
    }

    let body;
    try {
        body = await readJsonBody(req);
    } catch (err) {
        sendJson(res, 400, { error: err.message });
        return;
    }

    if (!BROADCAST_CODE || !DATA_DIR) {
        sendJson(res, 503, { error: 'Diffusion non configurée sur ce serveur' });
        return;
    }
    if (!isBroadcastCode(body.code)) {
        sendJson(res, 403, { error: 'Code de diffusion refusé' });
        return;
    }

    const store = loadBroadcasts();

    // Levée d'un message (y compris une alerte de référence)
    if (pathname === '/api/broadcasts/retire') {
        const id = cleanText(body.id, 40);
        if (!id) {
            sendJson(res, 400, { error: 'Identifiant manquant' });
            return;
        }
        if (!store.retired.includes(id)) store.retired.push(id);
        store.retired = store.retired.slice(-200);
        writeStore('broadcasts.json', store);
        sendJson(res, 200, { retired: id });
        return;
    }

    const broadcast = buildBroadcast(body.broadcast || {});
    if (!broadcast) {
        sendJson(res, 400, { error: 'Titre et message obligatoires' });
        return;
    }
    store.broadcasts = store.broadcasts.concat(broadcast).slice(-50);
    if (!writeStore('broadcasts.json', store)) {
        sendJson(res, 500, { error: 'Enregistrement impossible' });
        return;
    }
    console.log(`[DIFFUSION] ${broadcast.id} (${broadcast.level}) : ${broadcast.title}`);
    sendJson(res, 201, { broadcast });
}

// ==========================================
// RECOMMANDATIONS ADAPTÉES PAR IA (F31)
// ==========================================
const ADVICE_SITUATIONS = {
    senior: 'personne de 65 ans ou plus',
    infant: 'enfant de moins de 3 ans au foyer',
    pregnant: 'grossesse',
    chronic: 'maladie chronique ou implant biolink sous surveillance',
    outdoor: 'travail en extérieur ou hors dôme',
    isolated: 'personne vivant seule',
    mobility: 'mobilité réduite'
};
const ADVICE_LANGUAGES = { fr: 'français', en: 'anglais', es: 'espagnol' };
const ADVICE_DAILY_LIMIT = 40;

function requestOpenRouter(messages) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: 1500, temperature: 0.3 });
        const request = https.request({
            hostname: 'openrouter.ai',
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'X-Title': 'Terra Nova - 24H By Webcup'
            },
            timeout: 30000
        }, response => {
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const choice = parsed.choices && parsed.choices[0];
                    const content = choice && choice.message ? choice.message.content : null;
                    // Selon le modèle gratuit retenu, le contenu est une chaîne ou une liste de blocs de texte
                    const text = Array.isArray(content) ? content.map(part => part.text || '').join('') : String(content || '');
                    if (response.statusCode !== 200 || !text.trim()) {
                        reject(new Error((parsed.error && parsed.error.message) || `OpenRouter ${response.statusCode} sans contenu (${parsed.model || 'modèle inconnu'})`));
                        return;
                    }
                    resolve({ text, model: parsed.model || OPENROUTER_MODEL });
                } catch (err) {
                    reject(new Error('Réponse OpenRouter illisible'));
                }
            });
        });
        request.on('timeout', () => request.destroy(new Error('Délai dépassé')));
        request.on('error', reject);
        request.end(payload);
    });
}

function parseRecommendations(text) {
    let list = [];
    const json = text.match(/\{[\s\S]*\}/);
    if (json) {
        try {
            const parsed = JSON.parse(json[0]);
            const value = parsed.recommandations || parsed.recommendations || parsed.recomendaciones;
            if (Array.isArray(value)) list = value;
        } catch (err) { }
    }
    if (!list.length) {
        list = text.split('\n').map(line => line.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(line => line.length > 15);
    }
    return list.map(item => cleanText(item, 260)).filter(Boolean).slice(0, 6);
}

async function handleAdvice(req, res) {
    if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Méthode non autorisée' });
        return;
    }

    let body;
    try {
        body = await readJsonBody(req, 2000);
    } catch (err) {
        sendJson(res, 400, { error: err.message });
        return;
    }

    // L'alerte est relue côté serveur : le texte envoyé au modèle ne vient jamais du navigateur
    const store = loadBroadcasts();
    const alert = SEED_BROADCASTS.concat(store.broadcasts).find(item => item.id === body.alertId && item.advice);
    if (!alert) {
        sendJson(res, 404, { error: 'Alerte inconnue ou sans recommandations adaptées' });
        return;
    }

    const situations = Array.isArray(body.situations) ? body.situations.filter(key => ADVICE_SITUATIONS[key]).sort() : [];
    const lang = ADVICE_LANGUAGES[body.lang] ? body.lang : 'fr';
    const sector = cleanText(body.sector, 60);

    const cacheKey = crypto.createHash('sha1')
        .update(JSON.stringify([alert.id, alert.title, alert.body, alert.action, situations, lang, sector]))
        .digest('hex');
    const adviceStore = readStore('advice.json', {});
    const cache = adviceStore.cache || {};
    if (cache[cacheKey]) {
        sendJson(res, 200, { source: 'ia', cached: true, recommendations: cache[cacheKey].recommendations });
        return;
    }

    if (!OPENROUTER_API_KEY) {
        sendJson(res, 503, { error: 'Service de recommandations non configuré' });
        return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const usedToday = adviceStore.day === today ? adviceStore.count || 0 : 0;
    if (usedToday >= ADVICE_DAILY_LIMIT || rateLimited(req, 'advice', 6, 10 * 60000)) {
        sendJson(res, 429, { error: 'Service de recommandations momentanément saturé' });
        return;
    }

    const system = [
        "Tu rédiges des consignes de prévention pour l'Agence sanitaire de Nova Terra, une cité fictive.",
        "À partir d'une alerte officielle et de la situation déclarée par un habitant, tu donnes des recommandations pratiques adaptées à cette situation précise.",
        "Règles : adresse-toi directement à l'habitant en le vouvoyant ; reste cohérent avec les consignes officielles de l'alerte ; ne pose aucun diagnostic ; ne recommande aucun médicament ni dosage ; sois concret et bref ; la dernière recommandation indique les signes qui doivent faire contacter immédiatement les secours.",
        "N'indique aucun numéro de téléphone : les secours de la cité sont la Santé Biotech & Cryo-Soins et la Sécurité Civile.",
        `Réponds uniquement par un objet JSON de la forme {"recommandations": ["...", "..."]} contenant 4 à 6 phrases de 30 mots maximum, rédigées en ${ADVICE_LANGUAGES[lang]}.`
    ].join(' ');
    const user = [
        `Alerte : ${alert.title}`,
        `Ce qu'il se passe : ${alert.body}`,
        `Consignes officielles : ${String(alert.action || '').split('\n').join(' ')}`,
        `Secteur de l'habitant : ${sector || 'non précisé'}`,
        `Situation déclarée par l'habitant : ${situations.length ? situations.map(key => ADVICE_SITUATIONS[key]).join(' ; ') : 'aucune situation particulière'}`
    ].join('\n');

    try {
        // Le routeur de modèles gratuits change de modèle d'un appel à l'autre :
        // une réponse vide ou inexploitable est retentée une fois
        const messages = [{ role: 'system', content: system }, { role: 'user', content: user }];
        let result = null;
        let recommendations = [];
        for (let attempt = 1; attempt <= 2 && recommendations.length < 3; attempt++) {
            try {
                result = await requestOpenRouter(messages);
                recommendations = parseRecommendations(result.text);
            } catch (err) {
                console.error(`[IA] tentative ${attempt} :`, err.message);
            }
        }
        if (recommendations.length < 3) throw new Error('Réponse du modèle inexploitable');

        // Une même situation ne consomme qu'un appel : le quota gratuit est limité
        const fresh = readStore('advice.json', {});
        const entries = Object.entries(fresh.cache || {}).slice(-300);
        entries.push([cacheKey, { recommendations, model: result.model, at: new Date().toISOString() }]);
        writeStore('advice.json', { day: today, count: (fresh.day === today ? fresh.count || 0 : 0) + 1, cache: Object.fromEntries(entries) });

        sendJson(res, 200, { source: 'ia', cached: false, recommendations });
    } catch (err) {
        console.error('[IA]', err.message);
        sendJson(res, 502, { error: 'Service de recommandations indisponible' });
    }
}

// F57/F58 : fichiers texte compressés (brotli ou gzip), mis en mémoire, avec ETag pour que le navigateur
// revalide au lieu de retélécharger (réponse 304 de quelques octets).
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml)|image\/svg)/;
const staticCache = new Map();

function sendStatic(req, res, contentType, content, mtime, filePath) {
    const key = `${filePath}|${mtime}|${content.length}`;
    let entry = staticCache.get(key);
    if (!entry) {
        entry = { etag: '"' + crypto.createHash('sha1').update(content).digest('base64').slice(0, 22) + '"', raw: content };
        if (COMPRESSIBLE.test(contentType) && content.length > 512) {
            entry.br = zlib.brotliCompressSync(content, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 6 } });
            entry.gzip = zlib.gzipSync(content, { level: 9 });
        }
        if (staticCache.size > 200) staticCache.clear();
        staticCache.set(key, entry);
    }
    const headers = { 'Content-Type': contentType, 'ETag': entry.etag, 'Cache-Control': 'public, max-age=0, must-revalidate', 'Vary': 'Accept-Encoding' };
    if (req.headers['if-none-match'] === entry.etag) {
        res.writeHead(304, headers);
        res.end();
        return;
    }
    const accept = String(req.headers['accept-encoding'] || '');
    let body = entry.raw;
    if (entry.br && /\bbr\b/.test(accept)) { body = entry.br; headers['Content-Encoding'] = 'br'; }
    else if (entry.gzip && /\bgzip\b/.test(accept)) { body = entry.gzip; headers['Content-Encoding'] = 'gzip'; }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
}

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
            keyMasked: API_KEY ? `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : null,
            broadcastPublishing: Boolean(BROADCAST_CODE && DATA_DIR),
            adviceAi: Boolean(OPENROUTER_API_KEY),
            persistentData: Boolean(DATA_DIR)
        }));
        return;
    }

    // --- ENDPOINTS : /api/broadcasts (messages aux habitants) et /api/advice (recommandations IA) ---
    if (pathname === '/api/broadcasts' || pathname === '/api/broadcasts/retire') {
        handleBroadcasts(req, res, pathname).catch(err => sendJson(res, 500, { error: err.message }));
        return;
    }
    if (pathname === '/api/advice') {
        handleAdvice(req, res).catch(err => sendJson(res, 500, { error: err.message }));
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
                sendStatic(req, res, contentType, content, stats && stats.isFile() ? stats.mtimeMs : 0, filePath);
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
