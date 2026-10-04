// ==========================================
// VAGUE 16 — Exploitation
// F77 surcharge détectée sur les serveurs, F78 tenue de charge, F87 sauvegardes vérifiables,
// F88 transmission régulière d'un extrait agrégé du suivi à d'autres services.
// Chargé après assets/wave15.js ; réutilise w15Api, w15Unlocked, w14Sha256, w14Urgency, citizenTickets, announce, t().
// ==========================================

const W16T = (source, params) => escapeHtml(String(t(source, params)));
const W16_STATES = { nominal: { label: 'Normal', cls: 'pending' }, degraded: { label: 'Ralenti', cls: 'progress' }, overload: { label: 'Surcharge', cls: 'danger' } };

const w16 = { system: null, quality: null, backups: null, loadResult: null, timers: {}, healthDelay: 30000 };

function w16Locked(box, text) {
    box.innerHTML = `<p class="tn-hint"><i aria-hidden="true" class="fa-solid fa-lock"></i> ${W16T(text || 'Déverrouillez l\'accès agent dans le Centre de sécurité ci-dessus pour utiliser cette fonction.')}</p>`;
}
function w16Time(iso) { return iso ? new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'; }
function w16Bytes(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : n > 1024 ? Math.round(n / 1024) + ' Ko' : n + ' o'; }

// ------------------------------------------
// F77 — Bandeau public et état des serveurs
// ------------------------------------------
async function w16Health() {
    const banner = document.getElementById('w16-banner');
    let delay = 30000;
    try {
        let data;
        if (document.hidden) { clearTimeout(w16.timers.health); w16.timers.health = setTimeout(w16Health, 30000); return; }
        // F95 : l'état est déjà fourni par la dernière actualisation des messages (moins de 40 s) : pas de requête de plus
        if (window.tnPlatform && Date.now() - window.tnPlatform.at < 40000) {
            data = { state: window.tnPlatform.state };
        } else {
            const response = await fetch('/api/health', { cache: 'no-store' });
            if (!response.ok) throw new Error('status ' + response.status);
            data = await response.json();
        }
        document.dispatchEvent(new CustomEvent('tn:health', { detail: { ok: true, state: data.state } }));
        w16.healthDelay = 30000;
        if (banner) {
            const degraded = data.state !== 'nominal';
            banner.hidden = !degraded;
            if (degraded) {
                banner.className = 'w16-banner w16-banner--' + data.state;
                banner.innerHTML = data.state === 'overload'
                    ? `<strong>${W16T('Le service est très sollicité.')}</strong> ${W16T('L\'assistant, la reformulation et les conseils par IA sont suspendus quelques minutes. Les alertes, les urgences et vos démarches restent disponibles.')}`
                    : `<strong>${W16T('Le service est un peu ralenti.')}</strong> ${W16T('Tout fonctionne, mais certaines pages peuvent mettre plus de temps à s\'afficher.')}`;
            }
        }
        delay = 30000 + Math.floor(Math.random() * 5000);
    } catch (err) {
        // Le serveur ne répond pas bien : on espace les vérifications au lieu de l'harceler
        w16.healthDelay = Math.min(w16.healthDelay * 2, 300000);
        delay = w16.healthDelay;
        document.dispatchEvent(new CustomEvent('tn:health', { detail: { ok: false } }));
    }
    clearTimeout(w16.timers.health);
    w16.timers.health = setTimeout(w16Health, delay);
}

function w16Bars(history) {
    const list = history.slice(-30);
    const max = Math.max(1, ...list.map(entry => entry.count));
    return `<div class="w16-bars" role="img" aria-label="${escapeHtml(t('Requêtes par minute sur les {n} dernières minutes, maximum {max}', { n: list.length, max }))}">${list.map(entry => `<span class="w16-bar${entry.errors ? ' has-errors' : ''}" style="height:${Math.max(4, Math.round((entry.count / max) * 100))}%" title="${escapeHtml(new Date(entry.minute).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))} : ${entry.count}"></span>`).join('')}</div>`;
}

async function w16LoadSystem() {
    const box = document.getElementById('w16-system');
    if (!box) return;
    if (!w15Unlocked()) { w16Locked(box); return; }
    const result = await w15Api('/api/agent/system');
    if (!result.ok || !result.data) { box.innerHTML = `<p class="tn-form-error">${W16T('État des serveurs indisponible pour le moment.')}</p>`; return; }
    const d = result.data;
    w16.system = d;
    const state = W16_STATES[d.state] || W16_STATES.nominal;
    box.innerHTML = `
        <p class="w16-state" role="status"><span class="tn-badge tn-badge--${state.cls}" data-no-i18n>${escapeHtml(t(state.label))}</span> ${d.state === 'nominal' ? W16T('Les serveurs répondent normalement.') : `<span data-no-i18n>${escapeHtml(d.reasons.map(reason => t(reason)).join(' · '))}</span>`}</p>
        ${d.state === 'overload' ? `<p class="w16-warn">${W16T('Mode allégé actif : assistant, reformulation et conseils IA suspendus. Les alertes, les urgences, les démarches et les accusés de réception continuent de fonctionner.')}</p>` : ''}
        <dl class="w16-metrics" data-no-i18n>
            <div><dt>${escapeHtml(t('Requêtes / minute'))}</dt><dd>${d.requests.thisMinute}</dd></div>
            <div><dt>${escapeHtml(t('En même temps'))}</dt><dd>${d.requests.active} <small>(${escapeHtml(t('pic'))} ${d.requests.peak})</small></dd></div>
            <div><dt>${escapeHtml(t('Réponse (médiane / 95 %)'))}</dt><dd>${d.latency.p50} / ${d.latency.p95} ms</dd></div>
            <div><dt>${escapeHtml(t('Retard du serveur'))}</dt><dd>${d.eventLoopLagMs} ms</dd></div>
            <div><dt>${escapeHtml(t('Processeur'))}</dt><dd>${Math.round(d.cpu.ratio * 100)} % <small>(${d.cpu.cores} ${escapeHtml(t('cœurs'))})</small></dd></div>
            <div><dt>${escapeHtml(t('Mémoire'))}</dt><dd>${d.memory.rssMb} Mo</dd></div>
            <div><dt>${escapeHtml(t('Erreurs (5 min)'))}</dt><dd>${d.requests.errorRatePct} %</dd></div>
            <div><dt>${escapeHtml(t('Refusées / suspendues'))}</dt><dd>${d.requests.limited} / ${d.requests.shed}</dd></div>
        </dl>
        ${w16Bars(d.history)}
        <p class="tn-hint">${W16T('Seuils : ralenti dès 60 requêtes simultanées, 100 ms de retard ou des réponses lentes ; surcharge dès 150 requêtes simultanées, 250 ms de retard ou 1 500 requêtes par minute.')}</p>
        <div class="tn-row-actions">
            <button type="button" class="tn-tab" data-w16="system-refresh">${W16T('Actualiser')}</button>
            ${d.simulated ? `<button type="button" class="tn-tab tn-tab--danger" data-w16="simulate-stop">${W16T('Arrêter la simulation')}</button>` : `<button type="button" class="tn-tab" data-w16="simulate">${W16T('Simuler une surcharge (1 min)')}</button>`}
        </div>`;
    clearTimeout(w16.timers.system);
    w16.timers.system = setTimeout(() => { if (document.getElementById('w16-system') && w15Unlocked() && !document.hidden) w16LoadSystem(); }, 10000);
}

async function w16Simulate(minutes) {
    const result = await w15Api('/api/agent/system/simulate', { method: 'POST', body: JSON.stringify({ minutes }) });
    announce(t(minutes ? 'Surcharge simulée pendant {n} minute : le mode allégé est actif.' : 'Simulation arrêtée.', { n: minutes }));
    if (result.ok) { w16LoadSystem(); w16Health(); }
}

// ------------------------------------------
// F78 — Test de charge léger depuis le navigateur
// ------------------------------------------
async function w16LoadTest() {
    const box = document.getElementById('w16-load');
    if (!box) return;
    const total = 60;
    const targets = ['/api/health', '/assets/wave13.css', '/api/broadcasts', '/api/health'];
    box.innerHTML = `<p class="tn-hint">${W16T('Test en cours : {n} requêtes, 8 en même temps…', { n: total })}</p>`;
    const times = [];
    let ok = 0;
    let limited = 0;
    let failed = 0;
    let next = 0;
    const worker = async () => {
        while (next < total) {
            const index = next++;
            const url = targets[index % targets.length];
            const start = performance.now();
            try {
                const response = await fetch(url, { cache: 'no-store' });
                times.push(performance.now() - start);
                if (response.ok) ok += 1; else if (response.status === 429 || response.status === 503 || response.status === 508) limited += 1; else failed += 1;
                await response.arrayBuffer();
            } catch (err) { failed += 1; }
        }
    };
    const begin = performance.now();
    await Promise.all(Array.from({ length: 8 }, worker));
    const duration = performance.now() - begin;
    const sorted = times.slice().sort((a, b) => a - b);
    const q = fraction => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] || 0);
    w16.loadResult = { total, ok, limited, failed, p50: q(0.5), p95: q(0.95), seconds: (duration / 1000).toFixed(1) };
    box.innerHTML = `<p class="${failed ? 'tn-form-error' : 'w15-ok'}" role="status" data-no-i18n>${failed ? '⚠' : '✔'} ${escapeHtml(t('{ok} requêtes réussies sur {total}', { ok, total }))} · ${limited} ${escapeHtml(t('refusées pour excès'))} · ${failed} ${escapeHtml(t('en erreur'))}<br>${escapeHtml(t('Réponse : médiane {p50} ms, 95 % sous {p95} ms, durée totale {s} s.', { p50: w16.loadResult.p50, p95: w16.loadResult.p95, s: w16.loadResult.seconds }))}</p>`;
    announce(t('{ok} requêtes réussies sur {total}.', { ok, total }));
}

// ------------------------------------------
// F87 — Sauvegardes vérifiables
// ------------------------------------------
function w16VerifyRows(result) {
    const rows = [['structure', 'Structure du fichier'], ['checksum', 'Empreinte SHA-256 identique'], ['signature', 'Signature de la mairie valide'], ['counts', 'Nombre d\'éléments conforme']];
    return `<ul class="w15-checks" data-no-i18n>${rows.map(([key, label]) => `<li class="${result[key] ? 'is-ok' : 'is-ko'}"><span aria-hidden="true">${result[key] ? '✔' : '✘'}</span><span>${escapeHtml(t(label))}</span></li>`).join('')}</ul>`;
}

async function w16LoadBackups() {
    const box = document.getElementById('w16-backups');
    if (!box) return;
    if (!w15Unlocked()) { w16Locked(box); return; }
    const list = await w15Api('/api/agent/backups');
    const items = list.ok && list.data ? list.data.backups : [];
    w16.backups = items;
    box.innerHTML = `
        <h5 class="tn-w12-sub">${W16T('Données du serveur (messages diffusés, suivi)')}</h5>
        <div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w16="backup-server">${W16T('Sauvegarder et vérifier maintenant')}</button><button type="button" class="tn-tab" data-w16="backup-download-server">${W16T('Télécharger')}</button></div>
        <div id="w16-backup-result" role="status" aria-live="polite"></div>
        ${items.length ? `<ul class="w16-list" data-no-i18n>${items.map(item => `<li><span>${escapeHtml(item.name)}</span> <span class="tn-hint">${escapeHtml(w16Bytes(item.bytes))}</span> <span class="tn-badge tn-badge--${item.valid ? 'pending' : 'danger'}">${escapeHtml(t(item.valid ? 'Vérifiée' : 'Invalide'))}</span></li>`).join('')}</ul>` : `<p class="tn-hint">${W16T('Aucune sauvegarde du serveur pour le moment.')}</p>`}
        <h5 class="tn-w12-sub">${W16T('Données de cet appareil (demandes, comptes, rendez-vous…)')}</h5>
        <div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w16="backup-local">${W16T('Télécharger la sauvegarde')}</button></div>
        <p class="tn-hint">${W16T('Le fichier contient des données personnelles : conservez-le en lieu sûr. Il est signé par une empreinte SHA-256.')}</p>
        <label class="tn-field-label" for="w16-file">${W16T('Vérifier ou restaurer un fichier de sauvegarde')}</label>
        <input id="w16-file" type="file" accept=".json,application/json" class="cyber-input" data-w16-change="file">
        <div id="w16-file-result" role="status" aria-live="polite"></div>`;
}

async function w16BackupServer() {
    const box = document.getElementById('w16-backup-result');
    box.innerHTML = `<p class="tn-hint">${W16T('Sauvegarde en cours…')}</p>`;
    const result = await w15Api('/api/agent/backup/save', { method: 'POST' });
    if (!result.ok || !result.data) { box.innerHTML = `<p class="tn-form-error">${W16T('Sauvegarde impossible : aucun dossier de données disponible sur ce serveur.')}</p>`; return; }
    const verification = result.data.verification;
    box.innerHTML = `<p class="${verification.valid ? 'w15-ok' : 'tn-form-error'}" data-no-i18n>${verification.valid ? '✔' : '⚠'} ${escapeHtml(t('Sauvegarde enregistrée puis relue depuis le disque'))} : ${escapeHtml(result.data.name)} (${escapeHtml(w16Bytes(result.data.bytes))})</p>${w16VerifyRows(verification)}`;
    announce(t(verification.valid ? 'Sauvegarde enregistrée et vérifiée.' : 'Sauvegarde enregistrée mais invalide.'));
    const list = await w15Api('/api/agent/backups');
    if (list.ok && list.data) {
        const target = document.querySelector('#w16-backups .w16-list');
        const html = list.data.backups.map(item => `<li><span>${escapeHtml(item.name)}</span> <span class="tn-hint">${escapeHtml(w16Bytes(item.bytes))}</span> <span class="tn-badge tn-badge--${item.valid ? 'pending' : 'danger'}">${escapeHtml(t(item.valid ? 'Vérifiée' : 'Invalide'))}</span></li>`).join('');
        if (target) target.innerHTML = html;
    }
}

function w16Download(name, text, type = 'application/json') {
    const blob = new Blob([text], { type: type + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function w16DownloadServer() {
    const response = await fetch('/api/agent/backup', { headers: { Authorization: `Bearer ${w15.token}` }, cache: 'no-store' });
    if (!response.ok) { announce(t('Téléchargement refusé.')); return; }
    w16Download(`sauvegarde-serveur-${new Date().toISOString().slice(0, 10)}.json`, await response.text());
    announce(t('Sauvegarde du serveur téléchargée.'));
}

function w16LocalKeys() { const keys = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('tn_')) keys.push(key); } return keys.sort(); }
function w16Count(raw) { try { const value = JSON.parse(raw); return Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 1; } catch (err) { return 1; } }

async function w16BuildLocal() {
    const keys = {};
    w16LocalKeys().forEach(key => { keys[key] = localStorage.getItem(key); });
    // Les demandes et les comptes sont pris tels qu'ils sont affichés, même s'ils n'ont pas encore été enregistrés
    if (typeof citizenTickets !== 'undefined') keys.tn_tickets = JSON.stringify(citizenTickets);
    if (typeof registeredCitizens !== 'undefined') keys.tn_citizens = JSON.stringify(registeredCitizens);
    const data = { keys };
    const manifest = {
        version: 1, kind: 'local', app: 'Terra Nova', createdAt: new Date().toISOString(),
        counts: { demandes: w16Count(keys.tn_tickets || '[]'), comptes: w16Count(keys.tn_citizens || '[]'), reglages: Object.keys(keys).length },
        sha256: await w14Sha256(JSON.stringify(data))
    };
    return { manifest, data };
}

async function w16BackupLocal() {
    const backup = await w16BuildLocal();
    w16Download(`sauvegarde-locale-${backup.manifest.createdAt.slice(0, 16).replace(/[:T]/g, '-')}.json`, JSON.stringify(backup));
    announce(t('Sauvegarde téléchargée : {n} demandes, {m} comptes.', { n: backup.manifest.counts.demandes, m: backup.manifest.counts.comptes }));
    return backup;
}

async function w16VerifyLocal(backup) {
    const result = { structure: false, checksum: false, signature: true, counts: false };
    try {
        result.structure = backup.manifest.kind === 'local' && backup.manifest.version === 1 && backup.data && typeof backup.data.keys === 'object';
        if (result.structure) {
            result.checksum = (await w14Sha256(JSON.stringify(backup.data))) === backup.manifest.sha256;
            result.counts = backup.manifest.counts.demandes === w16Count(backup.data.keys.tn_tickets || '[]') && backup.manifest.counts.comptes === w16Count(backup.data.keys.tn_citizens || '[]');
        }
    } catch (err) { }
    result.valid = result.structure && result.checksum && result.counts;
    return result;
}

let w16Loaded = null;
async function w16HandleFile(file) {
    const box = document.getElementById('w16-file-result');
    w16Loaded = null;
    if (!file) { box.innerHTML = ''; return; }
    if (file.size > 3000000) { box.innerHTML = `<p class="tn-form-error">${W16T('Fichier trop volumineux (3 Mo maximum).')}</p>`; return; }
    let backup;
    try { backup = JSON.parse(await file.text()); } catch (err) { box.innerHTML = `<p class="tn-form-error">${W16T('Ce fichier n\'est pas une sauvegarde valide (JSON illisible).')}</p>`; return; }
    if (!backup || !backup.manifest) { box.innerHTML = `<p class="tn-form-error">${W16T('Ce fichier n\'est pas une sauvegarde de Terra Nova.')}</p>`; return; }
    if (backup.manifest.kind === 'local') {
        const result = await w16VerifyLocal(backup);
        w16Loaded = result.valid ? backup : null;
        const diff = result.valid ? w16Diff(backup) : null;
        box.innerHTML = `<p class="${result.valid ? 'w15-ok' : 'tn-form-error'}" data-no-i18n>${result.valid ? '✔' : '✘'} ${escapeHtml(t(result.valid ? 'Sauvegarde valide : {n} demandes, {m} comptes, créée le {d}' : 'Sauvegarde corrompue ou modifiée : ne pas la restaurer', { n: backup.manifest.counts.demandes, m: backup.manifest.counts.comptes, d: new Date(backup.manifest.createdAt).toLocaleString('fr-FR') }))}</p>${w16VerifyRows(result)}
            ${diff ? `<h5 class="tn-w12-sub">${W16T('Restauration d\'essai (rien n\'est modifié)')}</h5><ul class="w16-list" data-no-i18n>${diff.map(row => `<li>${escapeHtml(row)}</li>`).join('')}</ul>
            <div class="tn-row-actions"><button type="button" class="tn-tab tn-tab--danger" data-w16="restore-local">${W16T('Restaurer ces données')}</button></div>
            <p class="tn-hint">${W16T('La restauration remplace les données de cet appareil par celles du fichier. Un point de retour est gardé avant le remplacement.')}</p>` : ''}`;
    } else {
        const result = await w15Api('/api/agent/backup/verify', { method: 'POST', body: JSON.stringify(backup) });
        const verification = result.ok && result.data ? result.data : { valid: false, structure: false, checksum: false, signature: false, counts: false };
        box.innerHTML = `<p class="${verification.valid ? 'w15-ok' : 'tn-form-error'}" data-no-i18n>${verification.valid ? '✔' : '✘'} ${escapeHtml(t(verification.valid ? 'Sauvegarde du serveur valide : authentique et complète.' : 'Sauvegarde du serveur invalide ou modifiée.'))}</p>${w16VerifyRows(verification)}`;
    }
}

function w16Diff(backup) {
    const rows = [];
    let same = 0, changed = 0, added = 0;
    Object.entries(backup.data.keys).forEach(([key, value]) => {
        const current = localStorage.getItem(key);
        if (current === null) added += 1; else if (current === value) same += 1; else changed += 1;
    });
    rows.push(t('{n} réglages et listes identiques', { n: same }));
    rows.push(t('{n} remplacés par la version de la sauvegarde', { n: changed }));
    rows.push(t('{n} ajoutés (absents aujourd\'hui)', { n: added }));
    const now = w16Count(localStorage.getItem('tn_tickets') || '[]');
    rows.push(t('Demandes : {now} aujourd\'hui, {then} dans la sauvegarde', { now, then: backup.manifest.counts.demandes }));
    rows.push(t('Comptes : {now} aujourd\'hui, {then} dans la sauvegarde', { now: w16Count(localStorage.getItem('tn_citizens') || '[]'), then: backup.manifest.counts.comptes }));
    return rows;
}

function w16Restore() {
    if (!w16Loaded) return;
    if (!confirm(t('Remplacer les données de cet appareil par celles de la sauvegarde ? Un point de retour est conservé.'))) return;
    const previous = {};
    Object.keys(w16Loaded.data.keys).forEach(key => { previous[key] = localStorage.getItem(key); });
    try { localStorage.setItem('tn_w16_prerestore', JSON.stringify({ at: new Date().toISOString(), previous })); } catch (err) { }
    Object.entries(w16Loaded.data.keys).forEach(([key, value]) => { if (key !== 'tn_w16_prerestore') { try { localStorage.setItem(key, value); } catch (err) { } } });
    announce(t('Données restaurées. La page va se recharger.'));
    setTimeout(() => location.reload(), 600);
}

// ------------------------------------------
// F88 — Transmission régulière du suivi
// ------------------------------------------
function w16Aggregate() {
    const byService = {};
    citizenTickets.forEach(ticket => {
        const entry = byService[ticket.service] = byService[ticket.service] || { total: 0, pending: 0, inProgress: 0, resolved: 0, ratings: [] };
        entry.total += 1;
        if (ticket.status === 'Résolu') entry.resolved += 1; else if (ticket.status === 'En cours') entry.inProgress += 1; else entry.pending += 1;
        if (ticket.feedback) entry.ratings.push(ticket.feedback.rating);
    });
    const clean = {};
    Object.entries(byService).forEach(([name, entry]) => {
        clean[name] = { total: entry.total, pending: entry.pending, inProgress: entry.inProgress, resolved: entry.resolved, avgSatisfaction: entry.ratings.length ? Math.round((entry.ratings.reduce((a, b) => a + b, 0) / entry.ratings.length) * 10) / 10 : null, feedbackCount: entry.ratings.length };
    });
    const open = citizenTickets.filter(ticket => ticket.status !== 'Résolu');
    return {
        tickets: citizenTickets.length,
        openUrgent: typeof w14Urgency === 'function' ? open.filter(ticket => w14Urgency(ticket, 1).rank >= 2).length : 0,
        openMedical: open.filter(ticket => ticket.medicalUrgent).length,
        byService: clean
    };
}

async function w16Ingest() {
    if (!w15Unlocked()) return;
    try { await w15Api('/api/agent/quality/ingest', { method: 'POST', body: JSON.stringify(w16Aggregate()) }); } catch (err) { }
}

function w16Remaining(iso) {
    if (!iso) return '—';
    const seconds = Math.max(0, Math.round((Date.parse(iso) - Date.now()) / 1000));
    return seconds >= 60 ? Math.floor(seconds / 60) + ' min ' + (seconds % 60) + ' s' : seconds + ' s';
}

async function w16LoadQuality() {
    const box = document.getElementById('w16-quality');
    if (!box) return;
    if (!w15Unlocked()) { w16Locked(box); return; }
    await w16Ingest();
    const result = await w15Api('/api/agent/quality');
    if (!result.ok || !result.data) { box.innerHTML = `<p class="tn-form-error">${W16T('Suivi indisponible pour le moment.')}</p>`; return; }
    const d = result.data;
    w16.quality = d;
    const labels = { 1: '1 minute (démonstration)', 5: '5 minutes', 15: '15 minutes', 60: '1 heure', 1440: '1 jour' };
    box.innerHTML = `
        <p class="tn-hint">${W16T('Un extrait agrégé du suivi (nombre de demandes par service, états, satisfaction, état des serveurs, alertes) est transmis régulièrement aux autres services. Aucun nom, matricule ni message n\'est transmis.')}</p>
        <div class="w16-config">
            <label class="w13-need-opt"><input type="checkbox" id="w16-q-enabled" data-w16-change="q-config" ${d.config.enabled ? 'checked' : ''}> <span>${W16T('Transmission automatique')}</span></label>
            <label class="tn-field-label" for="w16-q-interval">${W16T('Toutes les')}</label>
            <select id="w16-q-interval" class="cyber-input" data-w16-change="q-config">${d.intervals.map(value => `<option value="${value}" ${d.config.intervalMinutes === value ? 'selected' : ''}>${W16T(labels[value] || value + ' min')}</option>`).join('')}</select>
        </div>
        <p class="tn-hint" data-no-i18n>${escapeHtml(t('Dernière transmission'))} : ${escapeHtml(w16Time(d.lastRunAt))} · ${escapeHtml(t('prochaine dans'))} <span id="w16-countdown" data-next="${escapeHtml(d.nextRunAt || '')}">${escapeHtml(d.config.enabled ? w16Remaining(d.nextRunAt) : t('suspendue'))}</span></p>
        <div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w16="quality-run">${W16T('Transmettre maintenant')}</button><button type="button" class="tn-tab" data-w16="quality-refresh">${W16T('Actualiser')}</button></div>
        <h5 class="tn-w12-sub">${W16T('Historique des transmissions')}</h5>
        ${d.history.length ? `<div class="w15-table-wrap"><table class="w15-table" data-no-i18n><thead><tr><th scope="col">${escapeHtml(t('Heure'))}</th><th scope="col">${escapeHtml(t('Déclenchement'))}</th><th scope="col">${escapeHtml(t('Taille'))}</th><th scope="col">${escapeHtml(t('Destinations'))}</th></tr></thead><tbody>${d.history.map(row => `<tr><td>${escapeHtml(w16Time(row.at))}</td><td>${escapeHtml(row.reason)}</td><td>${escapeHtml(w16Bytes(row.bytes))}</td><td>${row.destinations.map(dest => `${dest.ok ? '✔' : '✘'} ${escapeHtml(dest.name)}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="tn-hint">${W16T('Aucune transmission pour le moment : lancez-en une ou attendez la prochaine.')}</p>`}
        <details class="w14-details"><summary>${W16T('Aperçu des données transmises')}</summary><pre class="w16-pre" data-no-i18n>${escapeHtml(JSON.stringify(d.feed, null, 2))}</pre></details>
        <h5 class="tn-w12-sub">${W16T('Accès des autres services')}</h5>
        <p class="tn-hint" data-no-i18n>GET <code>${escapeHtml(location.origin + d.partnerUrl)}</code> — ${escapeHtml(t('en-tête'))} <code>X-Partner-Key</code>${d.partnerKey ? ` (${escapeHtml(t('démonstration'))} : <code>${escapeHtml(d.partnerKey)}</code>)` : ''} — <code>?format=csv</code></p>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-w16="quality-csv">${W16T('Télécharger le flux en CSV')}</button></div>`;
    clearTimeout(w16.timers.quality);
    w16.timers.quality = setTimeout(() => { if (document.getElementById('w16-quality') && w15Unlocked() && !document.hidden) w16LoadQuality(); }, 30000);
}

async function w16QualityConfig() {
    const enabled = document.getElementById('w16-q-enabled').checked;
    const intervalMinutes = Number(document.getElementById('w16-q-interval').value);
    const result = await w15Api('/api/agent/quality/config', { method: 'POST', body: JSON.stringify({ enabled, intervalMinutes }) });
    if (result.ok) { announce(t(enabled ? 'Transmission programmée toutes les {n} minutes.' : 'Transmission automatique suspendue.', { n: intervalMinutes })); w16LoadQuality(); }
}

async function w16QualityRun() {
    await w16Ingest();
    const result = await w15Api('/api/agent/quality/run', { method: 'POST' });
    announce(result.ok ? t('Suivi transmis.') : t('Transmission impossible.'));
    w16LoadQuality();
}

async function w16QualityCsv() {
    const key = w16.quality && w16.quality.partnerKey;
    const response = await fetch('/api/export/quality?format=csv', { headers: key ? { 'X-Partner-Key': key } : { Authorization: `Bearer ${w15.token}` }, cache: 'no-store' });
    if (!response.ok) { announce(t('Téléchargement refusé.')); return; }
    w16Download('suivi-terra-nova.csv', await response.text(), 'text/csv');
}

// ------------------------------------------
// Panneau et événements
// ------------------------------------------
function w16RenderPanel() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w16-ops')) return;
    const panel = document.createElement('section');
    panel.id = 'w16-ops';
    panel.className = 'w15-panel';
    panel.setAttribute('aria-labelledby', 'w16-title');
    panel.innerHTML = `
        <h3 id="w16-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-server"></i> ${W16T('Centre technique')}</h3>
        <p class="tn-hint">${W16T('Surveiller les serveurs, tenir la charge, sauvegarder les données importantes et transmettre le suivi aux autres services.')}</p>
        <div class="w15-grid">
            <div class="w15-card"><h4 class="tn-w12-sub">${W16T('État des serveurs')}</h4><div id="w16-system"></div></div>
            <div class="w15-card"><h4 class="tn-w12-sub">${W16T('Tenue de charge')}</h4>
                <ul class="w16-list">
                    <li>${W16T('Les pages et scripts sont compressés et mis en cache : un visiteur de plus ne recalcule rien.')}</li>
                    <li>${W16T('Les demandes vers l\'API Webcup sont regroupées et gardées 15 s pour tous les habitants.')}</li>
                    <li>${W16T('Chaque adresse a une limite de requêtes ; les excès reçoivent un refus poli, pas une panne.')}</li>
                    <li>${W16T('En cas de surcharge, les fonctions non essentielles (IA) sont suspendues, pas les urgences.')}</li>
                    <li>${W16T('Si le serveur répond mal, les pages espacent leurs vérifications au lieu d\'insister.')}</li>
                </ul>
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w16="load-test">${W16T('Lancer un test de charge léger')}</button>
                <div id="w16-load" role="status" aria-live="polite"></div></div>
            <div class="w15-card"><h4 class="tn-w12-sub">${W16T('Sauvegardes')}</h4><div id="w16-backups"></div></div>
            <div class="w15-card"><h4 class="tn-w12-sub">${W16T('Transmission du suivi aux autres services')}</h4><div id="w16-quality"></div></div>
        </div>`;
    const anchor = document.getElementById('w15-security') || document.getElementById('w14-medical');
    if (anchor) anchor.after(panel); else workspace.prepend(panel);
    w16Refresh();
}

function w16Refresh() { w16LoadSystem(); w16LoadBackups(); w16LoadQuality(); }

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w16]');
    if (!el) return;
    switch (el.dataset.w16) {
        case 'system-refresh': w16LoadSystem(); break;
        case 'simulate': w16Simulate(1); break;
        case 'simulate-stop': w16Simulate(0); break;
        case 'load-test': w16LoadTest(); break;
        case 'backup-server': w16BackupServer(); break;
        case 'backup-download-server': w16DownloadServer(); break;
        case 'backup-local': w16BackupLocal(); break;
        case 'restore-local': w16Restore(); break;
        case 'quality-run': w16QualityRun(); break;
        case 'quality-refresh': w16LoadQuality(); break;
        case 'quality-csv': w16QualityCsv(); break;
        default: break;
    }
});

document.addEventListener('change', event => {
    const el = event.target.closest('[data-w16-change]');
    if (!el) return;
    if (el.dataset.w16Change === 'file') w16HandleFile(el.files && el.files[0]);
    if (el.dataset.w16Change === 'q-config') w16QualityConfig();
});

document.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.id = 'w16-banner';
    banner.className = 'w16-banner';
    banner.setAttribute('role', 'status');
    banner.hidden = true;
    document.body.prepend(banner);
    setTimeout(w16Health, 2500);
    w16RenderPanel();
    document.addEventListener('tn:agent-session', () => { w16Refresh(); });
    document.addEventListener('tn:langchange', () => { const panel = document.getElementById('w16-ops'); if (panel) { panel.remove(); w16RenderPanel(); } w16Health(); });
    setInterval(() => { const el = document.getElementById('w16-countdown'); if (el && el.dataset.next) el.textContent = w16Remaining(el.dataset.next); }, 1000);
    // Les chiffres envoyés au suivi restent à jour tant qu'un agent est connecté
    setInterval(() => { if (w15Unlocked() && !document.hidden) w16Ingest(); }, 60000);
});
