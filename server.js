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
        official: Boolean(input.official),
        createdAt: now.toISOString(),
        expiresAt: hours > 0 ? new Date(now.getTime() + Math.min(hours, 720) * 3600000).toISOString() : null
    };
}

// ==========================================
// DIFFUSION EN TEMPS RÉEL (F73) : flux SSE
// ==========================================
const SSE_CLIENTS = new Set();
const SSE_MAX = 1000;
function pushEvent(type, data) {
    const frame = `event: ${type}\ndata: ${JSON.stringify(Object.assign({ at: new Date().toISOString() }, data))}\n\n`;
    for (const client of SSE_CLIENTS) {
        try { client.write(frame); } catch (err) { SSE_CLIENTS.delete(client); }
    }
}
function handleStream(req, res) {
    if (SSE_CLIENTS.size >= SSE_MAX) { sendJson(res, 503, { error: 'Flux saturé, utilisez l\'actualisation automatique' }); return; }
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    if (res.flushHeaders) res.flushHeaders();
    res.write(':' + ' '.repeat(2048) + '\n\n'); // force les relais intermédiaires à vider leur tampon
    res.write('retry: 5000\nevent: hello\ndata: {"clients":' + (SSE_CLIENTS.size + 1) + '}\n\n');
    SSE_CLIENTS.add(res);
    req.on('close', () => SSE_CLIENTS.delete(res));
}
setInterval(() => { for (const client of SSE_CLIENTS) { try { client.write(': ping\n\n'); } catch (err) { SSE_CLIENTS.delete(client); } } }, 25000).unref();

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
        pushEvent('broadcast', { action: 'retire', id });
        sendJson(res, 200, { retired: id });
        return;
    }

    const broadcast = buildBroadcast(body.broadcast || {});
    if (!broadcast) {
        sendJson(res, 400, { error: 'Titre et message obligatoires' });
        return;
    }
    const twin = store.broadcasts.find(entry => entry.title === broadcast.title && entry.body === broadcast.body && Date.now() - Date.parse(entry.createdAt) < 5 * 60000);
    if (twin) {
        securityEvent(req, 'duplicate', 'diffusion');
        sendJson(res, 409, { error: 'Ce message vient déjà d\'être diffusé il y a moins de 5 minutes', broadcast: twin });
        return;
    }
    store.broadcasts = store.broadcasts.concat(broadcast).slice(-50);
    if (!writeStore('broadcasts.json', store)) {
        sendJson(res, 500, { error: 'Enregistrement impossible' });
        return;
    }
    console.log(`[DIFFUSION] ${broadcast.id} (${broadcast.level}) : ${broadcast.title}`);
    pushEvent('broadcast', { action: 'publish', id: broadcast.id, level: broadcast.level, official: broadcast.official, title: broadcast.title });
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

// ==========================================
// ASSISTANT AUTOMATISÉ (F91) ET EXPLICATIONS SIMPLES (F90)
// Le navigateur répond d'abord avec ses propres règles ; ces points d'accès ne servent qu'en complément.
// Sans clé OpenRouter, ils répondent 503 et le navigateur reste sur ses réponses de référence.
// ==========================================
const AI_DAILY_LIMIT = 200;
const aiUsage = { day: '', count: 0 };
const simplifyCache = new Map();

function aiBudgetLeft() {
    const today = new Date().toISOString().slice(0, 10);
    if (aiUsage.day !== today) { aiUsage.day = today; aiUsage.count = 0; }
    return aiUsage.count < AI_DAILY_LIMIT;
}

const ASSISTANT_SYSTEM = [
    "Tu es l'assistant automatique de la plateforme numérique de Terra Nova, une cité fictive sous dôme.",
    "Tu aides les habitants à trouver le bon service ou la bonne démarche. Les 6 services sont : Atmosphère & Biosphère (air, eau, fuites, déchets, végétation), Transports & Hyper-Tubes (navettes, titres de transport, voirie), Énergie Plasma & Réacteur Zéro (quotas, raccordements, éclairage), Santé Biotech & Cryo-Soins (soins, implants biolinks), Sécurité Civile & Sentinelles (dangers, incidents, sas), Mairie & État Civil Spatial (matricules, naissances, mariages, changement de dôme).",
    "La plateforme propose : signalement d'un problème, contact avec un agent, rendez-vous, suivi des demandes, horaires des transports, plan de la ville, alertes, projets et idées.",
    "Règles : réponds en 3 phrases maximum, en vouvoyant, dans la langue de l'habitant ; n'invente aucun horaire, prix ni numéro ; si tu n'es pas sûr, propose d'écrire à un agent ; en cas d'urgence médicale ou de danger immédiat, dis d'appeler d'abord le 112 ; ne donne aucun conseil médical ni juridique ; pas de mise en forme (ni liste, ni gras)."
].join(' ');

function plainReply(text, max) {
    return cleanText(String(text || '').replace(/[*_#`>]+/g, '').replace(/\s*\n+\s*/g, ' '), max);
}

async function handleAssistant(req, res) {
    if (req.method !== 'POST') { sendJson(res, 405, { error: 'Méthode non autorisée' }); return; }
    let body;
    try { body = await readJsonBody(req, 3000); } catch (err) { sendJson(res, 400, { error: err.message }); return; }
    const message = cleanText(body.message, 400);
    if (!message) { sendJson(res, 400, { error: 'Message vide' }); return; }
    if (!OPENROUTER_API_KEY) { sendJson(res, 200, { reply: null, reason: 'non configuré' }); return; }
    if (!aiBudgetLeft() || rateLimited(req, 'assistant', 12, 10 * 60000)) { sendJson(res, 200, { reply: null, reason: 'saturé' }); return; }
    const lang = ADVICE_LANGUAGES[body.lang] ? body.lang : 'fr';
    const history = (Array.isArray(body.history) ? body.history : []).slice(-3).map(item => cleanText(item, 300)).filter(Boolean);
    const messages = [{ role: 'system', content: `${ASSISTANT_SYSTEM} Réponds en ${ADVICE_LANGUAGES[lang]}.` }]
        .concat(history.map(item => ({ role: 'user', content: item })))
        .concat([{ role: 'user', content: message }]);
    try {
        aiUsage.count += 1;
        const result = await requestOpenRouter(messages);
        const reply = plainReply(result.text, 600);
        if (!reply) throw new Error('Réponse vide');
        sendJson(res, 200, { reply, model: result.model });
    } catch (err) {
        console.error('[Assistant]', err.message);
        sendJson(res, 200, { reply: null, reason: 'indisponible' });
    }
}

async function handleSimplify(req, res) {
    if (req.method !== 'POST') { sendJson(res, 405, { error: 'Méthode non autorisée' }); return; }
    let body;
    try { body = await readJsonBody(req, 3000); } catch (err) { sendJson(res, 400, { error: err.message }); return; }
    const text = cleanText(body.text, 1200);
    if (text.length < 12) { sendJson(res, 400, { error: 'Texte trop court' }); return; }
    const lang = ADVICE_LANGUAGES[body.lang] ? body.lang : 'fr';
    const key = crypto.createHash('sha1').update(lang + '|' + text).digest('hex');
    if (simplifyCache.has(key)) { sendJson(res, 200, { text: simplifyCache.get(key), cached: true }); return; }
    if (!OPENROUTER_API_KEY) { sendJson(res, 200, { text: null, reason: 'non configuré' }); return; }
    if (!aiBudgetLeft() || rateLimited(req, 'simplify', 10, 10 * 60000)) { sendJson(res, 200, { text: null, reason: 'saturé' }); return; }
    const system = `Tu réécris des passages administratifs en langage clair et simple (niveau B1), en ${ADVICE_LANGUAGES[lang]}. Garde tous les chiffres, dates, noms et obligations. N'ajoute aucune information. Phrases courtes. 120 mots maximum. Réponds uniquement par le texte réécrit, sans introduction ni mise en forme.`;
    try {
        aiUsage.count += 1;
        const result = await requestOpenRouter([{ role: 'system', content: system }, { role: 'user', content: text }]);
        const simple = plainReply(result.text, 900);
        if (!simple) throw new Error('Réponse vide');
        if (simplifyCache.size > 300) simplifyCache.clear();
        simplifyCache.set(key, simple);
        sendJson(res, 200, { text: simple, cached: false });
    } catch (err) {
        console.error('[Simplify]', err.message);
        sendJson(res, 200, { text: null, reason: 'indisponible' });
    }
}

// ==========================================
// F83 — Accusé de réception signé par le serveur
// Le serveur date la réception et signe (HMAC-SHA256) la référence, la date et l'empreinte de la demande.
// Il ne conserve pas le contenu : n'importe qui peut ensuite vérifier un accusé en présentant ces trois valeurs.
// ==========================================
// Secret propre à la ville : variable RECEIPT_SECRET, sinon une clé aléatoire gardée dans le dossier de données
function loadReceiptSecret() {
    if (process.env.RECEIPT_SECRET) return process.env.RECEIPT_SECRET;
    const stored = readStore('receipt-secret.json', null);
    if (stored && typeof stored.secret === 'string' && stored.secret.length >= 32) return stored.secret;
    const secret = crypto.randomBytes(32).toString('hex');
    writeStore('receipt-secret.json', { secret });
    return secret;
}
const RECEIPT_SECRET = crypto.createHash('sha256').update('terra-nova-receipt|' + loadReceiptSecret()).digest();
function receiptSignature(ref, issuedAt, digest) {
    return crypto.createHmac('sha256', RECEIPT_SECRET).update(`${ref}|${issuedAt}|${digest}`).digest('hex').slice(0, 32).toUpperCase();
}

async function handleReceipt(req, res, pathname) {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
    if (rateLimited(req, 'receipt', 40, 10 * 60 * 1000)) return sendJson(res, 429, { error: 'Trop de demandes. Réessayez dans quelques minutes.' });
    const body = await readJsonBody(req, 4000);
    const ref = cleanText(body.ref, 40);
    const digest = cleanText(body.digest, 64).toLowerCase();
    if (!/^TK-TN-\d{4}$/.test(ref) || !/^[a-f0-9]{64}$/.test(digest)) return sendJson(res, 400, { error: 'Référence ou empreinte invalide.' });
    if (pathname === '/api/receipt/verify') {
        const issuedAt = cleanText(body.issuedAt, 40);
        const signature = cleanText(body.signature, 40).toUpperCase();
        const expected = receiptSignature(ref, issuedAt, digest);
        const valid = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
        return sendJson(res, 200, { valid, ref, issuedAt: valid ? issuedAt : null });
    }
    const issuedAt = new Date().toISOString();
    return sendJson(res, 200, { ref, digest, issuedAt, signature: receiptSignature(ref, issuedAt, digest), issuer: 'Mairie de Terra Nova — plateforme numérique' });
}

// ==========================================
// SÉCURITÉ (F69 protection des données, F70 données réservées aux agents, F81 robots, F82 envois en double,
// F85 activité inhabituelle). Les codes d'accès se règlent par AGENT_CODE et ADMIN_CODE ; sans eux, le serveur
// est en mode démonstration et l'indique clairement.
// ==========================================
const AGENT_CODE = process.env.AGENT_CODE || 'TERRA-AGENT-2842';
const ADMIN_CODE = process.env.ADMIN_CODE || 'TERRA-ADMIN-2842';
const SECURITY_DEMO = !process.env.AGENT_CODE;
const SESSION_KEY = crypto.createHmac('sha256', RECEIPT_SECRET).update('session').digest();
const SESSION_HOURS = 2;

function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
// L'adresse n'est jamais stockée : seulement une empreinte courte pour reconnaître une même source
function ipTag(req) { return crypto.createHmac('sha256', SESSION_KEY).update(clientIp(req)).digest('hex').slice(0, 8); }
function safeEqual(a, b) {
    return crypto.timingSafeEqual(crypto.createHash('sha256').update(String(a)).digest(), crypto.createHash('sha256').update(String(b)).digest());
}

function issueSession(role) {
    const expires = Date.now() + SESSION_HOURS * 3600000;
    const payload = Buffer.from(JSON.stringify({ role, exp: expires })).toString('base64url');
    const sig = crypto.createHmac('sha256', SESSION_KEY).update(payload).digest('hex').slice(0, 32);
    return { token: `${payload}.${sig}`, role, expiresAt: new Date(expires).toISOString() };
}

function readSession(req) {
    const match = /^Bearer\s+([\w-]+)\.([a-f0-9]{32})$/.exec(String(req.headers.authorization || ''));
    if (!match) return null;
    const expected = crypto.createHmac('sha256', SESSION_KEY).update(match[1]).digest('hex').slice(0, 32);
    if (!safeEqual(match[2], expected)) return null;
    try {
        const data = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
        return data && ['agent', 'admin'].includes(data.role) && data.exp > Date.now() ? data : null;
    } catch (err) { return null; }
}

function securityEvent(req, type, detail) {
    const events = readStore('security-log.json', []);
    events.push({ at: new Date().toISOString(), type, ip: ipTag(req), detail: cleanText(detail, 120) });
    writeStore('security-log.json', events.slice(-300));
}

const SECURITY_RULES = {
    login_failed: { min: 3, title: 'Tentatives de connexion répétées', detail: 'codes d\'accès agent incorrects' },
    unauthorized: { min: 3, title: 'Accès refusés à des données réservées', detail: 'demandes sans autorisation' },
    probe: { min: 3, title: 'Recherche de fichiers sensibles', detail: 'adresses de fichiers privés demandées' },
    bot: { min: 3, title: 'Envois automatiques bloqués', detail: 'formulaires remplis par un robot' },
    duplicate: { min: 5, title: 'Envois en double répétés', detail: 'mêmes formulaires renvoyés' },
    rate_limited: { min: 5, title: 'Débit de requêtes anormal', detail: 'requêtes refusées pour excès' }
};

function securityAnalysis() {
    const events = readStore('security-log.json', []);
    const now = Date.now();
    const recent = events.filter(event => now - Date.parse(event.at) < 15 * 60000 && event.type !== 'login_ok' && event.type !== 'records_read');
    const byIp = new Map();
    recent.forEach(event => { if (!byIp.has(event.ip)) byIp.set(event.ip, []); byIp.get(event.ip).push(event); });
    const alerts = [];
    byIp.forEach((list, ip) => {
        Object.entries(SECURITY_RULES).forEach(([type, rule]) => {
            const hits = list.filter(event => event.type === type);
            if (hits.length >= rule.min) alerts.push({ id: `${type}-${ip}`, severity: hits.length >= rule.min * 2 ? 'high' : 'medium', title: rule.title, detail: `${hits.length} ${rule.detail} en 15 minutes (source ${ip})`, count: hits.length, since: hits[0].at, last: hits[hits.length - 1].at });
        });
        const kinds = new Set(list.map(event => event.type));
        if (kinds.size >= 3) alerts.push({ id: `multi-${ip}`, severity: 'critical', title: 'Activité inhabituelle sur plusieurs parties de la plateforme', detail: `${kinds.size} types d'événements différents (${Array.from(kinds).join(', ')}) depuis une même source (${ip})`, count: list.length, since: list[0].at, last: list[list.length - 1].at });
    });
    if (recent.length >= 30) alerts.push({ id: 'spike', severity: 'high', title: 'Pic d\'activité suspecte', detail: `${recent.length} événements de sécurité en 15 minutes`, count: recent.length, since: recent[0].at, last: recent[recent.length - 1].at });
    const order = { critical: 0, high: 1, medium: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
    const totals = {};
    events.filter(event => now - Date.parse(event.at) < 24 * 3600000).forEach(event => { totals[event.type] = (totals[event.type] || 0) + 1; });
    return { generatedAt: new Date(now).toISOString(), windowMinutes: 15, alerts, totals, recent: events.slice(-12).reverse() };
}

// Registre administratif : données de démonstration, jamais envoyées sans session agent valide
const ADMIN_RECORDS = [
    { matricule: 'TN-2842-8812', dome: 'Bêta', dossier: 'Changement de dôme en cours', accreditation: 'Valide', updated: '2026-10-02', internal: 'Pièce justificative de logement manquante.' },
    { matricule: 'TN-2842-3340', dome: 'Alpha', dossier: 'Certificat de colon', accreditation: 'À renouveler', updated: '2026-09-28', internal: 'Rappel envoyé le 28/09.' },
    { matricule: 'TN-2842-5127', dome: 'Gamma', dossier: 'Raccordement énergie', accreditation: 'Valide', updated: '2026-10-01', internal: 'Contrôle technique prévu jeudi.' },
    { matricule: 'TN-2842-7790', dome: 'Bêta', dossier: 'Titre de propriété', accreditation: 'Suspendue', updated: '2026-09-30', internal: 'Doublon détecté : vérification d\'identité demandée.' },
    { matricule: 'TN-2842-1604', dome: 'Delta', dossier: 'Suivi médical Biolink', accreditation: 'Valide', updated: '2026-10-03', internal: 'Données de santé : accès limité aux agents santé.' }
];

async function handleSecurity(req, res, pathname) {
    if (pathname === '/api/agent/status') {
        return sendJson(res, 200, { demoMode: SECURITY_DEMO, demoCodes: SECURITY_DEMO ? { agent: AGENT_CODE, admin: ADMIN_CODE } : null, sessionHours: SESSION_HOURS });
    }
    if (pathname === '/api/agent/login') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        if (rateLimited(req, 'login', 10, 10 * 60000)) {
            securityEvent(req, 'rate_limited', 'connexion agent');
            return sendJson(res, 429, { error: 'Trop de tentatives. Réessayez dans quelques minutes.' });
        }
        const body = await readJsonBody(req, 1000);
        const code = cleanText(body.code, 60);
        const wantsAdmin = body.role === 'admin';
        const ok = wantsAdmin ? safeEqual(code, ADMIN_CODE) : (safeEqual(code, AGENT_CODE) || safeEqual(code, ADMIN_CODE));
        if (!ok) {
            securityEvent(req, 'login_failed', wantsAdmin ? 'code administrateur refusé' : 'code agent refusé');
            return sendJson(res, 401, { error: 'Code refusé' });
        }
        securityEvent(req, 'login_ok', wantsAdmin ? 'administrateur' : 'agent');
        return sendJson(res, 200, issueSession(wantsAdmin ? 'admin' : 'agent'));
    }
    if (pathname === '/api/agent/records' || pathname === '/api/agent/security') {
        const session = readSession(req);
        if (!session) {
            securityEvent(req, 'unauthorized', pathname);
            return sendJson(res, 401, { error: 'Accès réservé aux agents autorisés' });
        }
        if (pathname === '/api/agent/security') return sendJson(res, 200, securityAnalysis());
        securityEvent(req, 'records_read', session.role);
        const log = readStore('security-log.json', []).filter(event => event.type === 'records_read').slice(-5).reverse().map(event => ({ at: event.at, who: event.detail, source: event.ip }));
        return sendJson(res, 200, {
            role: session.role,
            demo: true,
            records: ADMIN_RECORDS.map(record => session.role === 'admin' ? record : Object.assign({}, record, { internal: undefined })),
            accessLog: log
        });
    }
    if (pathname === '/api/agent/selfcheck') {
        const session = readSession(req);
        if (!session) { securityEvent(req, 'unauthorized', pathname); return sendJson(res, 401, { error: 'Accès réservé aux agents autorisés' }); }
        const good = issueSession('agent').token;
        const flipped = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0');
        const expiredPayload = Buffer.from(JSON.stringify({ role: 'agent', exp: Date.now() - 1000 })).toString('base64url');
        const expired = `${expiredPayload}.${crypto.createHmac('sha256', SESSION_KEY).update(expiredPayload).digest('hex').slice(0, 32)}`;
        const fake = token => ({ headers: { authorization: `Bearer ${token}` } });
        const secrets = [API_KEY, BROADCAST_CODE, OPENROUTER_API_KEY, process.env.AGENT_CODE, process.env.ADMIN_CODE].filter(value => value && String(value).length >= 8);
        const publicFiles = ['index.html'].concat(fs.readdirSync(path.join(__dirname, 'assets')).filter(name => /\.(js|css|html)$/.test(name)).map(name => 'assets/' + name));
        const leaked = publicFiles.filter(file => { try { const text = fs.readFileSync(path.join(__dirname, file), 'utf8'); return secrets.some(secret => text.includes(secret)); } catch (err) { return false; } });
        const privateOk = ['.env', 'server.js', 'data/broadcasts.json', 'package.json', 'build.sh', '.git/config', 'README.md'].every(file => isPrivatePath(file));
        return sendJson(res, 200, { checks: [
            { id: 'token-tampered', ok: readSession(fake(flipped)) === null, label: 'Un jeton de session modifié est refusé' },
            { id: 'token-expired', ok: readSession(fake(expired)) === null, label: 'Un jeton de session expiré est refusé' },
            { id: 'token-missing', ok: readSession({ headers: {} }) === null, label: 'Une demande sans jeton est refusée' },
            { id: 'private-rules', ok: privateOk, label: 'Les fichiers privés (.env, serveur, données, scripts) ne sont jamais servis' },
            { id: 'secrets', ok: leaked.length === 0, label: leaked.length ? `Un secret apparaît dans : ${leaked.join(', ')}` : 'Aucun secret (clés, codes) dans les pages et scripts publics' },
            { id: 'ip', ok: !JSON.stringify(readStore('security-log.json', [])).includes(clientIp(req)) || clientIp(req) === '', label: 'Le journal de sécurité ne garde aucune adresse IP complète' }
        ] });
    }
    if (pathname === '/api/security/report') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        if (rateLimited(req, 'report', 30, 10 * 60000)) return sendJson(res, 429, { error: 'Trop de signalements' });
        const body = await readJsonBody(req, 1000);
        const type = ['bot', 'duplicate'].includes(body.type) ? body.type : null;
        if (!type) return sendJson(res, 400, { error: 'Type inconnu' });
        securityEvent(req, type, cleanText(body.form, 40));
        return sendJson(res, 200, { recorded: true });
    }
    return sendJson(res, 404, { error: 'Introuvable' });
}

// En-têtes de sécurité sur toutes les réponses
function applySecurityHeaders(req, res) {
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'"
    ].join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (String(req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// ==========================================
// EXPLOITATION (F77 surcharge, F78 tenue de charge, F87 sauvegardes vérifiables, F88 transmission régulière du suivi)
// ==========================================
const OPS = { startedAt: Date.now(), total: 0, active: 0, peak: 0, buckets: [], latencies: [], lag: 0, simulatedUntil: 0, stateAt: 0, stateValue: null };
const PARTNER_KEY = process.env.PARTNER_KEY || 'TERRA-PARTNER-2842';
const PARTNER_DEMO = !process.env.PARTNER_KEY;

function opsBucket() {
    const minute = Math.floor(Date.now() / 60000);
    let bucket = OPS.buckets[OPS.buckets.length - 1];
    if (!bucket || bucket.minute !== minute) {
        bucket = { minute, count: 0, errors: 0, limited: 0, shed: 0, slow: 0 };
        OPS.buckets.push(bucket);
        if (OPS.buckets.length > 60) OPS.buckets.shift();
    }
    return bucket;
}

// Mesure chaque requête : durée, erreurs, requêtes simultanées
function trackRequest(req, res) {
    const start = process.hrtime.bigint();
    OPS.total += 1;
    OPS.active += 1;
    if (OPS.active > OPS.peak) OPS.peak = OPS.active;
    opsBucket().count += 1;
    res.on('close', () => {
        OPS.active = Math.max(0, OPS.active - 1);
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        OPS.latencies.push(ms);
        if (OPS.latencies.length > 400) OPS.latencies.shift();
        const bucket = opsBucket();
        if (res.statusCode >= 500) bucket.errors += 1;
        if (res.statusCode === 429) bucket.limited += 1;
        if (ms > 1000) bucket.slow += 1;
    });
}

let lagLast = Date.now();
setInterval(() => { const now = Date.now(); OPS.lag = OPS.lag * 0.7 + Math.max(0, now - lagLast - 500) * 0.3; lagLast = now; }, 500).unref();

function percentile(values, q) {
    if (!values.length) return 0;
    const sorted = values.slice().sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

function systemSnapshot() {
    const now = Date.now();
    const cores = os.cpus().length || 1;
    const load1 = os.loadavg()[0];
    const ratio = load1 / cores;
    const last5 = OPS.buckets.filter(bucket => bucket.minute >= Math.floor(now / 60000) - 4);
    const reqLast5 = last5.reduce((sum, bucket) => sum + bucket.count, 0);
    const errLast5 = last5.reduce((sum, bucket) => sum + bucket.errors, 0);
    const current = OPS.buckets.length ? OPS.buckets[OPS.buckets.length - 1] : { count: 0, shed: 0, limited: 0 };
    const p95 = percentile(OPS.latencies, 0.95);
    const reasons = [];
    let state = 'nominal';
    const simulated = OPS.simulatedUntil > now;
    if (simulated) { state = 'overload'; reasons.push('Simulation de surcharge demandée par un agent'); }
    if (OPS.active >= 150) { state = 'overload'; reasons.push(`${OPS.active} requêtes en même temps`); }
    else if (OPS.active >= 60 && state === 'nominal') { state = 'degraded'; reasons.push(`${OPS.active} requêtes en même temps`); }
    if (OPS.lag > 250) { state = 'overload'; reasons.push(`Serveur en retard de ${Math.round(OPS.lag)} ms`); }
    else if (OPS.lag > 100 && state === 'nominal') { state = 'degraded'; reasons.push(`Serveur en retard de ${Math.round(OPS.lag)} ms`); }
    if (ratio > 1.5) { state = 'overload'; reasons.push('Processeur saturé'); }
    else if (ratio > 0.9 && state === 'nominal') { state = 'degraded'; reasons.push('Processeur très chargé'); }
    if (current.count > 1500) { state = 'overload'; reasons.push(`${current.count} requêtes cette minute`); }
    else if (p95 > 800 && state === 'nominal') { state = 'degraded'; reasons.push(`Réponses lentes (95 % sous ${Math.round(p95)} ms)`); }
    const mem = process.memoryUsage();
    return {
        state, reasons, simulated, simulatedUntil: simulated ? new Date(OPS.simulatedUntil).toISOString() : null,
        uptimeSeconds: Math.round(process.uptime()),
        requests: { total: OPS.total, active: OPS.active, peak: OPS.peak, thisMinute: current.count, last5Minutes: reqLast5, errorRatePct: reqLast5 ? Math.round((errLast5 / reqLast5) * 1000) / 10 : 0, limited: OPS.buckets.reduce((sum, bucket) => sum + bucket.limited, 0), shed: OPS.buckets.reduce((sum, bucket) => sum + bucket.shed, 0) },
        latency: { p50: Math.round(percentile(OPS.latencies, 0.5)), p95: Math.round(p95), max: Math.round(OPS.latencies.length ? Math.max(...OPS.latencies) : 0) },
        eventLoopLagMs: Math.round(OPS.lag),
        cpu: { cores, load1: Math.round(load1 * 100) / 100, ratio: Math.round(ratio * 100) / 100 },
        memory: { rssMb: Math.round(mem.rss / 1048576), heapMb: Math.round(mem.heapUsed / 1048576), systemFreePct: Math.round((os.freemem() / os.totalmem()) * 100) },
        thresholds: { degraded: '60 requêtes simultanées, retard serveur 100 ms, réponses lentes 800 ms', overload: '150 requêtes simultanées, retard serveur 250 ms, 1 500 requêtes par minute' },
        history: OPS.buckets.slice(-30).map(bucket => ({ minute: new Date(bucket.minute * 60000).toISOString(), count: bucket.count, errors: bucket.errors, limited: bucket.limited, shed: bucket.shed }))
    };
}

// L'état est recalculé au plus une fois par seconde
function systemState() {
    const now = Date.now();
    if (!OPS.stateValue || now - OPS.stateAt > 1000) { OPS.stateValue = systemSnapshot(); OPS.stateAt = now; }
    return OPS.stateValue;
}

const SHEDDABLE = new Set(['/api/assistant', '/api/simplify', '/api/advice']);
function shedIfOverloaded(req, res, pathname) {
    if (!SHEDDABLE.has(pathname) || systemState().state !== 'overload') return false;
    opsBucket().shed += 1;
    res.setHeader('Retry-After', '30');
    if (pathname === '/api/advice') sendJson(res, 503, { error: 'Service très sollicité : recommandations suspendues, réessayez dans quelques instants.' });
    else sendJson(res, 200, { reply: null, text: null, reason: 'overload' });
    return true;
}

function sha256Hex(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function backupSignature(manifest) { return crypto.createHmac('sha256', SESSION_KEY).update(`backup|${manifest.version}|${manifest.createdAt}|${manifest.sha256}`).digest('hex').slice(0, 32); }

function buildServerBackup() {
    const broadcasts = readStore('broadcasts.json', { broadcasts: [], retired: [] });
    const data = {
        broadcasts: { broadcasts: Array.isArray(broadcasts.broadcasts) ? broadcasts.broadcasts : [], retired: Array.isArray(broadcasts.retired) ? broadcasts.retired : [] },
        qualityConfig: readStore('quality-config.json', null),
        qualityHistory: readStore('quality-history.json', [])
    };
    const manifest = { version: 1, createdAt: new Date().toISOString(), counts: { messagesDiffuses: data.broadcasts.broadcasts.length, messagesLeves: data.broadcasts.retired.length, transmissions: data.qualityHistory.length }, sha256: sha256Hex(JSON.stringify(data)) };
    manifest.signature = backupSignature(manifest);
    return { manifest, data };
}

function verifyBackup(backup) {
    const result = { structure: false, checksum: false, signature: false, counts: false };
    try {
        const { manifest, data } = backup;
        result.structure = Boolean(manifest && data && manifest.version === 1 && data.broadcasts && Array.isArray(data.broadcasts.broadcasts) && Array.isArray(data.broadcasts.retired) && Array.isArray(data.qualityHistory));
        if (!result.structure) return Object.assign(result, { valid: false });
        result.checksum = sha256Hex(JSON.stringify(data)) === manifest.sha256;
        result.signature = safeEqual(String(manifest.signature || ''), backupSignature(manifest));
        result.counts = manifest.counts.messagesDiffuses === data.broadcasts.broadcasts.length && manifest.counts.messagesLeves === data.broadcasts.retired.length && manifest.counts.transmissions === data.qualityHistory.length;
    } catch (err) { }
    return Object.assign(result, { valid: result.structure && result.checksum && result.signature && result.counts });
}

function backupDir() { return DATA_DIR ? path.join(DATA_DIR, 'backups') : null; }
function saveServerBackup() {
    const dir = backupDir();
    if (!dir) return null;
    fs.mkdirSync(dir, { recursive: true });
    const backup = buildServerBackup();
    const name = `sauvegarde-${backup.manifest.createdAt.replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(path.join(dir, name), JSON.stringify(backup));
    // Preuve : le fichier est relu depuis le disque puis revérifié
    const reread = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const verification = verifyBackup(reread);
    const files = fs.readdirSync(dir).filter(file => file.startsWith('sauvegarde-')).sort();
    files.slice(0, Math.max(0, files.length - 5)).forEach(file => { try { fs.unlinkSync(path.join(dir, file)); } catch (err) { } });
    return { name, bytes: fs.statSync(path.join(dir, name)).size, manifest: backup.manifest, verification };
}
function listServerBackups() {
    const dir = backupDir();
    if (!dir || !fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(file => file.startsWith('sauvegarde-')).sort().reverse().map(file => {
        try {
            const raw = fs.readFileSync(path.join(dir, file), 'utf8');
            const backup = JSON.parse(raw);
            return { name: file, bytes: Buffer.byteLength(raw), createdAt: backup.manifest.createdAt, counts: backup.manifest.counts, valid: verifyBackup(backup).valid };
        } catch (err) { return { name: file, bytes: 0, createdAt: null, counts: null, valid: false }; }
    });
}

// Transmission régulière d'un extrait agrégé du suivi : jamais de nom, de matricule ni de message
const QUALITY_INTERVALS = [1, 5, 15, 60, 1440];
function qualityConfig() { return Object.assign({ enabled: true, intervalMinutes: 15 }, readStore('quality-config.json', {})); }

function buildQualityFeed() {
    const snapshot = systemSnapshot();
    const store = readStore('broadcasts.json', { broadcasts: [] });
    const now = Date.now();
    const active = (store.broadcasts || []).filter(item => !item.expiresAt || Date.parse(item.expiresAt) > now).length;
    const security = securityAnalysis();
    const ingest = readStore('quality-ingest.json', null);
    return {
        schema: 'terra-nova/suivi/1',
        generatedAt: new Date(now).toISOString(),
        privacy: 'Données agrégées : aucun nom, matricule ni message d\'habitant.',
        platform: { state: snapshot.state, uptimeMinutes: Math.round(snapshot.uptimeSeconds / 60), requestsLast5Minutes: snapshot.requests.last5Minutes, errorRatePct: snapshot.requests.errorRatePct, p95Ms: snapshot.latency.p95 },
        security: { alertsOpen: security.alerts.length, eventsLast24h: security.totals },
        broadcasts: { active, total: (store.broadcasts || []).length },
        followUp: ingest
    };
}

function feedToCsv(feed) {
    const rows = [['section', 'cle', 'valeur']];
    const walk = (section, value) => {
        if (value && typeof value === 'object') Object.entries(value).forEach(([key, inner]) => walk(section ? `${section}.${key}` : key, inner));
        else rows.push([section.split('.')[0], section.split('.').slice(1).join('.') || section, value]);
    };
    walk('', feed);
    return rows.map(row => row.map(cell => `"${String(cell == null ? '' : cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function postWebhook(url, body, signature) {
    return new Promise(resolve => {
        try {
            const target = new URL(url);
            if (target.protocol !== 'https:') return resolve({ ok: false, status: 'https obligatoire' });
            const request = https.request({ hostname: target.hostname, path: target.pathname + target.search, method: 'POST', timeout: 5000, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'X-Terra-Signature': signature } }, response => { response.resume(); resolve({ ok: response.statusCode < 300, status: response.statusCode }); });
            request.on('timeout', () => { request.destroy(); resolve({ ok: false, status: 'délai dépassé' }); });
            request.on('error', err => resolve({ ok: false, status: err.code || 'erreur' }));
            request.end(body);
        } catch (err) { resolve({ ok: false, status: 'adresse invalide' }); }
    });
}

let transmitting = false;
async function runTransmission(reason) {
    if (transmitting) return null;
    transmitting = true;
    try {
        writeStore('quality-state.json', { lastRunAt: Date.now() });
        const feed = buildQualityFeed();
        const json = JSON.stringify(feed);
        writeStore('quality-feed.json', feed);
        const destinations = [
            { name: 'Archive du Service Qualité', ok: true, status: 'enregistré' },
            { name: 'Flux partenaire /api/export/quality', ok: true, status: 'à jour' }
        ];
        const hooks = String(process.env.QUALITY_WEBHOOK_URLS || '').split(',').map(entry => entry.trim()).filter(Boolean).slice(0, 5);
        const signature = crypto.createHmac('sha256', SESSION_KEY).update(json).digest('hex');
        for (const url of hooks) { const result = await postWebhook(url, json, signature); destinations.push({ name: 'Service externe ' + new URL(url).hostname, ok: result.ok, status: String(result.status) }); }
        const history = readStore('quality-history.json', []);
        history.push({ at: new Date().toISOString(), reason, bytes: Buffer.byteLength(json), sha256: sha256Hex(json).slice(0, 16), destinations });
        writeStore('quality-history.json', history.slice(-30));
        return history[history.length - 1];
    } finally { transmitting = false; }
}

setInterval(() => {
    const config = qualityConfig();
    if (!config.enabled) return;
    const last = readStore('quality-state.json', { lastRunAt: 0 }).lastRunAt || 0;
    if (Date.now() - last >= config.intervalMinutes * 60000 - 5000) runTransmission('planifiée').catch(() => { });
}, 30000).unref();

function numberOr(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) && n >= 0 && n < 1e7 ? Math.round(n * 100) / 100 : fallback; }

async function handleOps(req, res, pathname) {
    const session = readSession(req);
    if (!session) { securityEvent(req, 'unauthorized', pathname); return sendJson(res, 401, { error: 'Accès réservé aux agents autorisés' }); }
    if (pathname === '/api/agent/system') return sendJson(res, 200, systemSnapshot());
    if (pathname === '/api/agent/system/simulate') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        const body = await readJsonBody(req, 500);
        const minutes = Math.max(0, Math.min(3, Number(body.minutes) || 0));
        OPS.simulatedUntil = minutes ? Date.now() + minutes * 60000 : 0;
        OPS.stateAt = 0;
        return sendJson(res, 200, systemSnapshot());
    }
    if (pathname === '/api/agent/backup') {
        const backup = buildServerBackup();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename="sauvegarde-serveur-${backup.manifest.createdAt.slice(0, 10)}.json"` });
        return res.end(JSON.stringify(backup));
    }
    if (pathname === '/api/agent/backup/save') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        const saved = saveServerBackup();
        return saved ? sendJson(res, 200, saved) : sendJson(res, 503, { error: 'Aucun dossier de données disponible sur ce serveur' });
    }
    if (pathname === '/api/agent/backups') return sendJson(res, 200, { backups: listServerBackups() });
    if (pathname === '/api/agent/backup/verify') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        const body = await readJsonBody(req, 3000000);
        return sendJson(res, 200, verifyBackup(body));
    }
    if (pathname === '/api/agent/quality') {
        const config = qualityConfig();
        const last = readStore('quality-state.json', { lastRunAt: 0 }).lastRunAt || 0;
        return sendJson(res, 200, {
            config, intervals: QUALITY_INTERVALS, history: readStore('quality-history.json', []).slice(-10).reverse(),
            lastRunAt: last ? new Date(last).toISOString() : null,
            nextRunAt: config.enabled ? new Date((last || Date.now()) + config.intervalMinutes * 60000).toISOString() : null,
            feed: buildQualityFeed(), partnerUrl: '/api/export/quality', partnerKey: PARTNER_DEMO ? PARTNER_KEY : null
        });
    }
    if (pathname === '/api/agent/quality/config') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        const body = await readJsonBody(req, 500);
        const interval = QUALITY_INTERVALS.includes(Number(body.intervalMinutes)) ? Number(body.intervalMinutes) : qualityConfig().intervalMinutes;
        writeStore('quality-config.json', { enabled: body.enabled !== false, intervalMinutes: interval });
        return sendJson(res, 200, qualityConfig());
    }
    if (pathname === '/api/agent/quality/run') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        const record = await runTransmission('manuelle');
        return sendJson(res, 200, { record });
    }
    if (pathname === '/api/agent/quality/ingest') {
        if (req.method !== 'POST') return sendJson(res, 405, { error: 'Méthode non autorisée' });
        const body = await readJsonBody(req, 20000);
        const byService = {};
        Object.entries(body.byService || {}).slice(0, 20).forEach(([name, value]) => {
            byService[cleanText(name, 60)] = { total: numberOr(value.total), pending: numberOr(value.pending), inProgress: numberOr(value.inProgress), resolved: numberOr(value.resolved), avgSatisfaction: value.avgSatisfaction == null ? null : numberOr(value.avgSatisfaction), feedbackCount: numberOr(value.feedbackCount) };
        });
        writeStore('quality-ingest.json', { updatedAt: new Date().toISOString(), tickets: numberOr(body.tickets), openUrgent: numberOr(body.openUrgent), openMedical: numberOr(body.openMedical), byService });
        return sendJson(res, 200, { stored: true });
    }
    return sendJson(res, 404, { error: 'Introuvable' });
}

function handleHealth(req, res) {
    const snapshot = systemState();
    sendJson(res, 200, { state: snapshot.state, uptimeSeconds: snapshot.uptimeSeconds, time: new Date().toISOString(), degradedFeatures: snapshot.state === 'overload' ? ['assistant', 'reformulation', 'conseils IA'] : [] });
}

function handleQualityExport(req, res, parsedUrl) {
    const key = String(req.headers['x-partner-key'] || '');
    if (!(key && safeEqual(key, PARTNER_KEY)) && !readSession(req)) {
        securityEvent(req, 'unauthorized', '/api/export/quality');
        return sendJson(res, 401, { error: 'Clé partenaire requise (en-tête X-Partner-Key)' });
    }
    const feed = readStore('quality-feed.json', null) || buildQualityFeed();
    if (parsedUrl.searchParams.get('format') === 'csv') {
        res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(feedToCsv(feed));
    }
    return sendJson(res, 200, feed);
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

// Relais vers l'API Webcup : cache court, requêtes simultanées regroupées, secours si l'API ne répond pas
let webcupCache = null;
let webcupInflight = null;
function fetchWebcupRequests() {
    if (webcupCache && Date.now() - webcupCache.at < 15000) return Promise.resolve(webcupCache.result);
    if (webcupInflight) return webcupInflight;
    const targetUrl = new URL(WEBCUP_API_URL);
    webcupInflight = new Promise(resolve => {
        const request = https.request({
            hostname: targetUrl.hostname, path: targetUrl.pathname, method: 'GET', timeout: 10000,
            headers: { 'X-Webcup-Api-Key': API_KEY, 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TerraNovaPlatform/1.0' }
        }, response => {
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    lastCachedApiResponse = parsed;
                    const result = { status: response.statusCode, body: parsed };
                    if (response.statusCode === 200) webcupCache = { at: Date.now(), result };
                    resolve(result);
                } catch (err) { resolve({ status: 502, body: { error: 'Réponse invalide reçue de l\'API Webcup' } }); }
            });
        });
        const fail = err => {
            console.error('[PROXY ERROR]', err.message);
            if (lastCachedApiResponse) resolve({ status: 200, body: lastCachedApiResponse, fallback: true });
            else resolve({ status: 503, body: { error: 'Impossible de contacter l\'API Webcup' } });
        };
        request.on('error', fail);
        request.on('timeout', () => { request.destroy(); fail(new Error('délai dépassé')); });
        request.end();
    }).finally(() => { webcupInflight = null; });
    return webcupInflight;
}

// Création du serveur HTTP
const server = http.createServer((req, res) => {
    applySecurityHeaders(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (pathname.startsWith('/api/') && rateLimited(req, 'api', 1500, 60000)) {
        if (!rateLimited(req, 'api-log', 1, 60000)) securityEvent(req, 'rate_limited', 'api');
        res.setHeader('Retry-After', '60');
        sendJson(res, 429, { error: 'Trop de requêtes. Réessayez dans une minute.' });
        return;
    }

    if (pathname === '/api/stream' && req.method === 'GET') { handleStream(req, res); return; }
    trackRequest(req, res);
    if (pathname === '/api/health') { handleHealth(req, res); return; }
    if (shedIfOverloaded(req, res, pathname)) return;

    // --- ENDPOINT : /api/config ---
    if (pathname === '/api/config') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            status: 'online',
            environment: 'Terra Nova Directorate v1.0',
            hasApiKey: Boolean(API_KEY),
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
    if (pathname === '/api/export/quality') { handleQualityExport(req, res, parsedUrl); return; }
    if (/^\/api\/agent\/(system|backup|backups|quality)/.test(pathname)) {
        handleOps(req, res, pathname).catch(err => sendJson(res, 400, { error: err.message }));
        return;
    }
    if (pathname.startsWith('/api/agent/') || pathname === '/api/security/report') {
        handleSecurity(req, res, pathname).catch(err => sendJson(res, 400, { error: err.message }));
        return;
    }
    if (pathname === '/api/receipt' || pathname === '/api/receipt/verify') {
        handleReceipt(req, res, pathname).catch(err => sendJson(res, 400, { error: err.message }));
        return;
    }
    if (pathname === '/api/assistant') {
        handleAssistant(req, res).catch(err => sendJson(res, 500, { error: err.message }));
        return;
    }
    if (pathname === '/api/simplify') {
        handleSimplify(req, res).catch(err => sendJson(res, 500, { error: err.message }));
        return;
    }

    // --- ENDPOINT : /api/requests (Proxy Webcup avec la clé .env) ---
    // F78 : une seule requête part vers Webcup à la fois, et la réponse est gardée 15 s pour tous les habitants
    if (pathname === '/api/requests') {
        fetchWebcupRequests().then(result => {
            const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
            if (result.fallback) headers['X-Fallback'] = 'true';
            res.writeHead(result.status, headers);
            res.end(JSON.stringify(result.body));
        });
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
        if (isPrivate && !(req.headers['x-security-check'] && readSession(req))) securityEvent(req, 'probe', pathname.slice(0, 60));
        if (isPrivate || err || !stats.isFile()) {
            // Un fichier privé, ou une ressource introuvable (chemin avec extension), renvoie une vraie 404
            if (isPrivate || path.extname(pathname)) {
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

// F78 : délais et plafonds pour qu'un afflux de visiteurs ne bloque pas le serveur
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.requestTimeout = 30000;
server.maxConnections = 2000;

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 SERVEUR TERRA NOVA OPÉRATIONNEL SUR LE PORT ${PORT}`);
    console.log(`📡 URL locale : http://localhost:${PORT}`);
    console.log(`🔑 Clé API active : ${API_KEY ? 'CONFIGURÉE (.env)' : 'NON CONFIGURÉE'}`);
    console.log(`=======================================================`);
});
