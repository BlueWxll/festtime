// ==========================================
// VAGUE 10 — F57 mesurer et alléger la plateforme, F58 choix de conception sobres,
// F59 connexion lente : le mode économe, F60 images et médias légers.
// Chargé après assets/wave9.js. Le démarrage (mode économe, polices et icônes non bloquantes,
// rafraîchissements suspendus onglet caché) est dans le <head> de index.html ; le CSS Tailwind
// est pré-compilé (assets/tailwind.css) ; le serveur compresse et valide le cache (server.js).
// ==========================================

const W10T = (source, params) => escapeHtml(String(t(source, params)));
function w10Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w10Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }

const W10_RUNS = 'tn_w10_runs';
const W10_SLOW_MS = 4000;
// Estimation « Sustainable Web Design » : 0,81 kWh par Go transféré, 442 g de CO₂e par kWh (moyenne mondiale)
const W10_KWH_PER_GB = 0.81;
const W10_G_PER_KWH = 442;

function w10IsLite() { return document.documentElement.classList.contains('lite'); }
function w10Net() { return window.TN_NET || { lite: false, auto: false, slow: false, saveData: false, type: '' }; }

// ---------- Mesure (F57) ----------
function w10Measure() {
    const nav = (performance.getEntriesByType('navigation') || [])[0] || null;
    const resources = (performance.getEntriesByType('resource') || []).map(entry => {
        let origin = '';
        try { origin = new URL(entry.name, location.href).origin; } catch (err) { }
        const first = origin === location.origin;
        const sent = entry.transferSize || entry.encodedBodySize || 0;
        let label = entry.name;
        try { const url = new URL(entry.name, location.href); label = first ? url.pathname.replace(/^\//, '') || '/' : url.host; } catch (err) { }
        return { name: label, type: entry.initiatorType || 'autre', first, sent, real: entry.decodedBodySize || 0, cached: entry.transferSize === 0 && entry.decodedBodySize > 0 };
    });
    const page = nav ? { name: '(page)', type: 'document', first: true, sent: nav.transferSize || nav.encodedBodySize || 0, real: nav.decodedBodySize || 0, cached: false } : null;
    const mine = resources.filter(item => item.first).concat(page ? [page] : []);
    const outside = resources.filter(item => !item.first);
    const sent = mine.reduce((sum, item) => sum + item.sent, 0);
    const real = mine.reduce((sum, item) => sum + item.real, 0);
    const byType = {};
    mine.forEach(item => { const key = /^(script)$/.test(item.type) ? 'script' : /^(link|css)$/.test(item.type) ? 'style' : item.type; byType[key] = (byType[key] || 0) + item.sent; });
    return {
        at: new Date().toISOString(), lite: w10IsLite(),
        sent, real, requests: mine.length, external: outside.length, externalHosts: Array.from(new Set(outside.map(item => item.name))),
        loadMs: nav && nav.loadEventEnd > 0 ? Math.round(nav.loadEventEnd) : null,
        readyMs: nav && nav.domContentLoadedEventEnd > 0 ? Math.round(nav.domContentLoadedEventEnd) : null,
        byType, list: mine.slice().sort((a, b) => b.sent - a.sent), outside
    };
}

function w10Grams(bytes) { return (bytes / 1e9) * W10_KWH_PER_GB * W10_G_PER_KWH; }
function w10Kb(bytes) { return `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} ${t('Ko')}`; }
function w10Grade(bytes) {
    const kb = bytes / 1024;
    return kb <= 150 ? 'A' : kb <= 300 ? 'B' : kb <= 600 ? 'C' : kb <= 1000 ? 'D' : 'E';
}
function w10Ms(ms) { return ms === null || ms === undefined ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`; }

// Chaque chargement de page est retenu, pour comparer le mode normal et le mode économe
function w10Record() {
    const run = w10Measure();
    const runs = w10Load(W10_RUNS, {}) || {};
    runs[run.lite ? 'lite' : 'normal'] = { at: run.at, sent: run.sent, real: run.real, requests: run.requests, external: run.external, loadMs: run.loadMs, readyMs: run.readyMs };
    w10Save(W10_RUNS, runs);
    return run;
}

// ---------- Médias (F60) ----------
function w10Media() {
    const count = selector => document.querySelectorAll(selector).length;
    return {
        images: count('img'), videos: count('video'), audios: count('audio'), frames: count('iframe'), canvases: count('canvas'),
        lazy: count('img[loading="lazy"], iframe[loading="lazy"]')
    };
}

function w10TuneMedia(node) {
    if (!node || node.nodeType !== 1) return;
    const items = node.matches && node.matches('img, iframe, video, audio') ? [node] : [];
    node.querySelectorAll && node.querySelectorAll('img, iframe, video, audio').forEach(el => items.push(el));
    items.forEach(el => {
        const tag = el.tagName;
        if (tag === 'IMG') { if (!el.hasAttribute('loading')) el.loading = 'lazy'; if (!el.hasAttribute('decoding')) el.decoding = 'async'; }
        else if (tag === 'IFRAME') { if (!el.hasAttribute('loading')) el.loading = 'lazy'; }
        else { el.preload = 'none'; el.removeAttribute('autoplay'); }
    });
}

// Sans les icônes, un bouton qui n'avait qu'une icône garde un nom visible
function w10LiteLabels(root) {
    if (!w10IsLite()) return;
    (root || document).querySelectorAll('button[aria-label], a[aria-label]').forEach(el => {
        if (el.dataset.liteLabel !== undefined) return;
        const hasText = Array.from(el.childNodes).some(node => (node.nodeType === 3 && node.textContent.trim()) || (node.nodeType === 1 && node.tagName !== 'I' && node.textContent.trim()));
        if (hasText) return;
        el.dataset.liteLabel = (el.getAttribute('title') || el.getAttribute('aria-label') || '').split(' ')[0].slice(0, 12);
    });
}

// ---------- Le mode économe (F59) ----------
function w10SetLite(on, reason) {
    const root = document.documentElement;
    root.classList.toggle('lite', on);
    try { localStorage.setItem('tn_lite', on ? '1' : '0'); } catch (err) { }
    if (window.TN_EXT) { if (on) window.TN_EXT.unload(); else window.TN_EXT.load(); }
    if (on) w10LiteLabels(document); else document.querySelectorAll('[data-lite-label]').forEach(el => el.removeAttribute('data-lite-label'));
    const banner = document.getElementById('w10-slow');
    if (banner) banner.hidden = true;
    announce(on ? t('Mode économe activé. Les textes et les actions restent les mêmes.') : t('Mode économe désactivé.'));
    w10Refresh();
    if (typeof w6Notify === 'function') w6Notify(on ? t('Mode économe activé : moins d\'animations, ni polices ni icônes téléchargées.') : t('Mode économe désactivé.'));
}

function w10Reason() {
    const net = w10Net();
    let stored = null;
    try { stored = localStorage.getItem('tn_lite'); } catch (err) { }
    if (!w10IsLite()) return '';
    if (stored === '1') return t('Vous l\'avez activé.');
    if (net.saveData) return t('Activé automatiquement : votre appareil demande d\'économiser les données.');
    return t('Activé automatiquement : votre connexion est très lente.');
}

function w10RenderToolbar() {
    const tools = document.querySelector('#tn-locbar .tn-tools');
    if (!tools) return;
    let button = document.getElementById('w10-lite-btn');
    if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.id = 'w10-lite-btn';
        button.className = 'tn-tool';
        button.addEventListener('click', () => w10SetLite(!w10IsLite()));
        tools.appendChild(button);
    }
    const on = w10IsLite();
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.innerHTML = `<i aria-hidden="true" class="fa-solid fa-leaf"></i> <span class="tn-tool-label">${W10T('Mode économe')}</span><span class="sr-only"> : ${W10T(on ? 'activé' : 'désactivé')}</span>`;
    button.title = t('Mode économe : charge moins de données');
}

// Connexion lente : la page propose elle-même le mode économe, en mots simples
function w10RenderSlow(measured) {
    let strip = document.getElementById('w10-slow');
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('tn_w10_dismiss') === '1'; } catch (err) { }
    const net = w10Net();
    const slow = net.slow || (measured && measured > W10_SLOW_MS);
    if (!slow || w10IsLite() || dismissed) { if (strip) strip.hidden = true; return; }
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'w10-slow';
        strip.className = 'tn-w10-slow';
        strip.setAttribute('role', 'status');
        const anchor = document.getElementById('w9-strip') || document.getElementById('w8-strip') || document.getElementById('tn-locbar');
        if (anchor) anchor.after(strip); else document.body.prepend(strip);
    }
    strip.hidden = false;
    strip.innerHTML = `
        <p><i aria-hidden="true" class="fa-solid fa-gauge"></i> <strong>${W10T('Votre connexion semble lente.')}</strong> ${W10T('Le mode économe charge beaucoup moins de données. Tous les textes et les boutons restent là.')}</p>
        <div class="tn-w10-slow-actions">
            <button type="button" class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase" data-w10="lite-on">${W10T('Passer en mode économe')}</button>
            <button type="button" class="tn-tab" data-w10="slow-no">${W10T('Non merci')}</button>
        </div>`;
}

// ---------- La section « Sobriété numérique » ----------
const W10_CHOICES = [
    ['CSS pré-compilé : plus de bibliothèque de mise en forme téléchargée et recalculée à chaque visite (le lien externe a disparu de la page).', 'style'],
    ['Textes et scripts compressés par le serveur (gzip ou brotli), avec validation du cache : une visite suivante ne retélécharge presque rien.', 'zip'],
    ['Polices et icônes chargées sans bloquer l\'affichage : le texte apparaît tout de suite.', 'font'],
    ['Aucune image, vidéo ni son à télécharger : les graphiques sont dessinés par le navigateur et les sons sont générés à la volée.', 'media'],
    ['Les rafraîchissements automatiques s\'arrêtent quand l\'onglet est caché, et sont deux fois moins fréquents en mode économe.', 'timer'],
    ['Mode économe : pas d\'animations, de textures ni d\'effets, et aucune police ni icône téléchargée. Zéro requête vers un site externe.', 'lite']
];

function w10RenderSection() {
    const body = document.getElementById('w10-body');
    if (!body) return;
    const run = w10Measure();
    const runs = w10Load(W10_RUNS, {}) || {};
    const lite = w10IsLite();
    const grade = w10Grade(run.sent);
    const grams = w10Grams(run.sent);
    const media = w10Media();
    const saved = run.real > 0 ? Math.max(0, Math.round((1 - run.sent / run.real) * 100)) : 0;
    const row = (label, normal, light) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${normal}</td><td>${light}</td></tr>`;
    const cell = (key, fn) => runs[key] ? escapeHtml(fn(runs[key])) : `<em>${W10T('pas encore mesuré')}</em>`;
    body.innerHTML = `
        <div class="tn-w10-switch">
            <div>
                <p class="tn-w9-lead"><strong>${W10T(lite ? 'Mode économe : activé' : 'Mode économe : désactivé')}</strong></p>
                <p class="tn-hint" data-no-i18n>${escapeHtml(lite ? w10Reason() : t('Idéal si votre connexion est lente ou si vous voulez consommer moins. Les textes et les actions restent les mêmes.'))}</p>
            </div>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w10="toggle" aria-pressed="${lite ? 'true' : 'false'}">${W10T(lite ? 'Désactiver le mode économe' : 'Activer le mode économe')}</button>
        </div>

        <h4 class="tn-w8-sub">${W10T('Mesure de cette page, en direct')}</h4>
        <ul class="tn-w10-kpis">
            <li><span class="tn-w10-label">${W10T('Note')}</span><strong class="tn-w10-grade tn-w10-grade--${grade}" data-no-i18n>${grade}</strong><span class="tn-w9-meta">${W10T('A = très léger, E = lourd')}</span></li>
            <li><span class="tn-w10-label">${W10T('Données reçues')}</span><strong data-no-i18n>${escapeHtml(w10Kb(run.sent))}</strong><span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('au lieu de {n} sans compression ({p} % économisés)', { n: w10Kb(run.real), p: saved }))}</span></li>
            <li><span class="tn-w10-label">${W10T('Requêtes')}</span><strong data-no-i18n>${run.requests}</strong><span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('dont {n} vers un site externe', { n: run.external }))}</span></li>
            <li><span class="tn-w10-label">${W10T('Page utilisable en')}</span><strong data-no-i18n>${escapeHtml(w10Ms(run.readyMs))}</strong><span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('chargement complet : {n}', { n: w10Ms(run.loadMs) }))}</span></li>
            <li><span class="tn-w10-label">${W10T('Empreinte estimée')}</span><strong data-no-i18n>${escapeHtml(grams < 0.01 ? '< 0,01' : grams.toFixed(2))} g CO₂e</strong><span class="tn-w9-meta">${W10T('par visite, pour les données de ce site (estimation)')}</span></li>
        </ul>
        <p class="tn-hint">${W10T('La note compare les données reçues de ce site : A jusqu\'à 150 Ko, B 300 Ko, C 600 Ko, D 1 000 Ko. Les polices et icônes d\'un fournisseur externe ne sont pas mesurables par le navigateur : en mode économe, elles ne sont tout simplement pas téléchargées.')}</p>

        <h4 class="tn-w8-sub">${W10T('Mode normal et mode économe, côte à côte')}</h4>
        <div class="tn-w9-tablewrap"><table class="tn-w9-table"><caption class="sr-only">${W10T('Comparaison des deux modes')}</caption>
            <thead><tr><th scope="col">${W10T('Dernière mesure')}</th><th scope="col">${W10T('Mode normal')}</th><th scope="col">${W10T('Mode économe')}</th></tr></thead>
            <tbody>
                ${row(t('Données reçues'), cell('normal', r => w10Kb(r.sent)), cell('lite', r => w10Kb(r.sent)))}
                ${row(t('Requêtes'), cell('normal', r => String(r.requests)), cell('lite', r => String(r.requests)))}
                ${row(t('Requêtes vers un site externe'), cell('normal', r => String(r.external)), cell('lite', r => String(r.external)))}
                ${row(t('Chargement complet'), cell('normal', r => w10Ms(r.loadMs)), cell('lite', r => w10Ms(r.loadMs)))}
            </tbody></table></div>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-w10="reload">${W10T('Recharger la page pour mesurer à nouveau')}</button></div>

        <h4 class="tn-w8-sub">${W10T('Les fichiers les plus lourds')}</h4>
        <div class="tn-w9-tablewrap"><table class="tn-w9-table"><caption class="sr-only">${W10T('Fichiers les plus lourds')}</caption>
            <thead><tr><th scope="col">${W10T('Fichier')}</th><th scope="col">${W10T('Type')}</th><th scope="col">${W10T('Reçu')}</th><th scope="col">${W10T('Taille réelle')}</th></tr></thead>
            <tbody>${run.list.slice(0, 8).map(item => `<tr><td data-no-i18n>${escapeHtml(item.name)}</td><td data-no-i18n>${escapeHtml(item.type)}</td><td data-no-i18n>${escapeHtml(item.cached ? t('déjà en mémoire') : w10Kb(item.sent))}</td><td data-no-i18n>${escapeHtml(w10Kb(item.real))}</td></tr>`).join('') || `<tr><td colspan="4">${W10T('Mesure indisponible sur ce navigateur.')}</td></tr>`}</tbody></table></div>
        ${run.external ? `<p class="tn-hint" data-no-i18n>${escapeHtml(t('Requêtes externes sur cette page : {hosts}.', { hosts: run.externalHosts.join(', ') }))}</p>` : `<p class="tn-hint">${W10T('Aucune requête vers un site externe sur cette page.')}</p>`}

        <h4 class="tn-w8-sub">${W10T('Images et médias')}</h4>
        <ul class="tn-w9-brief">
            <li data-no-i18n>${escapeHtml(t('{i} image(s), {v} vidéo(s), {a} son(s) et {f} cadre(s) externe(s) dans la page.', { i: media.images, v: media.videos, a: media.audios, f: media.frames }))}</li>
            <li>${W10T('Toute image ou tout cadre ajouté plus tard est chargé « en différé » (au moment d\'être vu), sans lecture automatique pour les vidéos et les sons.')}</li>
            <li data-no-i18n>${escapeHtml(t('{n} graphique(s) dessiné(s) par le navigateur, sans fichier image.', { n: media.canvases }))}</li>
        </ul>

        <h4 class="tn-w8-sub">${W10T('Ce que nous avons changé')}</h4>
        <ul class="tn-w9-brief">${W10_CHOICES.map(item => `<li>${W10T(item[0])}</li>`).join('')}</ul>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-w10="report">${W10T('Télécharger le diagnostic (.json)')}</button></div>`;
}

function w10Report() {
    const run = w10Measure();
    const media = w10Media();
    return JSON.stringify({
        genere_le: run.at, mode: run.lite ? 'econome' : 'normal',
        donnees_recues_octets: run.sent, taille_reelle_octets: run.real, requetes: run.requests, requetes_externes: run.external, hotes_externes: run.externalHosts,
        page_utilisable_ms: run.readyMs, chargement_complet_ms: run.loadMs, note: w10Grade(run.sent), co2e_g_estime: Number(w10Grams(run.sent).toFixed(4)),
        hypothese_co2: `${W10_KWH_PER_GB} kWh/Go, ${W10_G_PER_KWH} gCO2e/kWh`, medias: media,
        fichiers: run.list.map(item => ({ fichier: item.name, type: item.type, recu: item.sent, reel: item.real })),
        dernieres_mesures: w10Load(W10_RUNS, {})
    }, null, 2);
}

function w10Refresh() {
    w10RenderToolbar();
    w10RenderSection();
    w10RenderSlow();
}

function initSobriete() {
    const anchor = document.getElementById('compte') || document.getElementById('participation') || document.getElementById('espace-citoyen');
    if (!anchor || document.getElementById('sobriete')) return;
    const section = document.createElement('section');
    section.id = 'sobriete';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'sobriete-title');
    section.dataset.crumb = 'Sobriété numérique';
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1">
                <i aria-hidden="true" class="fa-solid fa-leaf"></i><span>${W10T('Moins de données, moins d\'énergie')}</span>
            </div>
            <h2 id="sobriete-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">${W10T('SOBRIÉTÉ NUMÉRIQUE')}</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">${W10T('Ce que pèse cette page, ce que nous avons fait pour l\'alléger, et un mode économe pour les connexions lentes.')}</p>
        </div>
        <div class="holo-card p-6 relative" id="w10-card" role="region" aria-labelledby="sobriete-title"><div id="w10-body"></div></div>`;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'sobriete')) {
        const index = TN_SECTIONS.findIndex(entry => entry.id === 'compte');
        TN_SECTIONS.splice(index >= 0 ? index + 1 : TN_SECTIONS.length, 0, { id: 'sobriete', label: 'Sobriété numérique' });
    }
    const navLink = document.querySelector('#site-nav a[href="#compte"]') || document.querySelector('#site-nav a[href="#participation"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#sobriete';
        link.className = navLink.className;
        link.innerHTML = `<i aria-hidden="true" class="fa-solid fa-leaf text-[11px] text-[#00B8FF]"></i><span>${W10T('SOBRIÉTÉ')}</span>`;
        navLink.after(link);
    }
}

document.addEventListener('click', event => {
    const button = event.target.closest('[data-w10]');
    if (!button) return;
    switch (button.dataset.w10) {
        case 'toggle': w10SetLite(!w10IsLite()); break;
        case 'lite-on': w10SetLite(true); break;
        case 'slow-no': try { sessionStorage.setItem('tn_w10_dismiss', '1'); } catch (err) { } w10RenderSlow(); break;
        case 'reload': location.reload(); break;
        case 'report': {
            const blob = new Blob([w10Report()], { type: 'application/json;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'terra-nova-diagnostic-sobriete.json';
            document.body.appendChild(link); link.click(); link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 2000);
            announce(t('Diagnostic téléchargé.'));
            break;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initSobriete();
    w10TuneMedia(document.body);
    new MutationObserver(list => list.forEach(record => {
        record.addedNodes.forEach(node => { w10TuneMedia(node); if (w10IsLite() && node.nodeType === 1) w10LiteLabels(node); });
    })).observe(document.body, { childList: true, subtree: true });
    w10LiteLabels(document);
    w10Refresh();
    document.addEventListener('tn:langchange', w10Refresh);

    // Une fois la page chargée : on retient la mesure et on propose le mode économe si le chargement a été long
    const done = () => setTimeout(() => {
        const run = w10Record();
        w10RenderSection();
        w10RenderSlow(run.loadMs);
    }, 400);
    if (document.readyState === 'complete') done(); else window.addEventListener('load', done);
});
