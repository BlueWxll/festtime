// ==========================================
// VAGUE 15 — Sécurité
// F69 centre de sécurité numérique (contrôles et protections), F70 données administratives réservées aux agents
// (le serveur ne les envoie qu'avec une session agent), F81 robots (champ piège, vitesse, cadence),
// F82 formulaires envoyés deux fois, F85 activité inhabituelle (alertes calculées par le serveur).
// Chargé après assets/wave14.js ; réutilise escapeHtml, announce, t(), currentRole, switchRole.
// ==========================================

const W15T = (source, params) => escapeHtml(String(t(source, params)));
const W15_TOKEN_KEY = 'tn_w15_session';

const w15 = { token: null, role: null, expiresAt: null, status: null, alerts: null, timer: null };

function w15Restore() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(W15_TOKEN_KEY) || 'null');
        if (saved && saved.token && Date.parse(saved.expiresAt) > Date.now()) Object.assign(w15, { token: saved.token, role: saved.role, expiresAt: saved.expiresAt });
    } catch (err) { }
}
function w15Store() { try { sessionStorage.setItem(W15_TOKEN_KEY, JSON.stringify({ token: w15.token, role: w15.role, expiresAt: w15.expiresAt })); } catch (err) { } }
function w15Clear() { w15.token = null; w15.role = null; w15.expiresAt = null; w15.alerts = null; try { sessionStorage.removeItem(W15_TOKEN_KEY); } catch (err) { } }
function w15Unlocked() { return Boolean(w15.token) && Date.parse(w15.expiresAt) > Date.now(); }

async function w15Api(path, options = {}, extraHeaders = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders);
    if (w15.token) headers.Authorization = `Bearer ${w15.token}`;
    const response = await fetch(path, Object.assign({ cache: 'no-store' }, options, { headers }));
    let data = null;
    try { data = await response.json(); } catch (err) { }
    return { ok: response.ok, status: response.status, data, headers: response.headers };
}

// ------------------------------------------
// F70 — Données administratives réservées
// ------------------------------------------
async function w15Login(code, role) {
    const result = await w15Api('/api/agent/login', { method: 'POST', body: JSON.stringify({ code, role }) });
    if (result.ok && result.data && result.data.token) {
        Object.assign(w15, { token: result.data.token, role: result.data.role, expiresAt: result.data.expiresAt });
        w15Store();
        return { ok: true };
    }
    return { ok: false, status: result.status, message: result.status === 429 ? 'Trop de tentatives. Patientez quelques minutes.' : 'Code refusé.' };
}

function w15RecordsHtml(data) {
    const admin = data.role === 'admin';
    return `<div class="w15-table-wrap"><table class="w15-table" data-no-i18n>
        <caption class="sr-only">${escapeHtml(t('Registre administratif réservé (données de démonstration)'))}</caption>
        <thead><tr><th scope="col">${escapeHtml(t('Matricule'))}</th><th scope="col">${escapeHtml(t('Dôme'))}</th><th scope="col">${escapeHtml(t('Dossier'))}</th><th scope="col">${escapeHtml(t('Accréditation'))}</th><th scope="col">${escapeHtml(t('Mis à jour'))}</th>${admin ? `<th scope="col">${escapeHtml(t('Note interne (admin)'))}</th>` : ''}</tr></thead>
        <tbody>${data.records.map(record => `<tr><td>${escapeHtml(record.matricule)}</td><td>${escapeHtml(record.dome)}</td><td>${escapeHtml(record.dossier)}</td><td>${escapeHtml(record.accreditation)}</td><td>${escapeHtml(record.updated)}</td>${admin ? `<td>${escapeHtml(record.internal || '')}</td>` : ''}</tr>`).join('')}</tbody></table></div>
        <p class="tn-hint">${W15T('Données de démonstration. Les agents voient ces colonnes ; seule l\'administration voit les notes internes.')}</p>
        ${data.accessLog && data.accessLog.length ? `<p class="tn-hint" data-no-i18n>${escapeHtml(t('Dernières consultations du registre'))} : ${data.accessLog.map(entry => `${escapeHtml(new Date(entry.at).toLocaleTimeString('fr-FR'))} (${escapeHtml(entry.who)}, ${escapeHtml(entry.source)})`).join(' · ')}</p>` : ''}`;
}

async function w15LoadRecords() {
    const box = document.getElementById('w15-records');
    if (!box) return;
    if (!w15Unlocked()) {
        const hint = w15.status && w15.status.demoMode && w15.status.demoCodes
            ? `<p class="tn-hint">${W15T('Mode démonstration : le code agent est')} <code data-no-i18n>${escapeHtml(w15.status.demoCodes.agent)}</code> <button type="button" class="w13-link" data-w15="demo-code" data-role="agent">${W15T('Utiliser ce code')}</button> · ${W15T('administration')} <code data-no-i18n>${escapeHtml(w15.status.demoCodes.admin)}</code> <button type="button" class="w13-link" data-w15="demo-code" data-role="admin">${W15T('Utiliser ce code')}</button></p>`
            : '';
        box.innerHTML = `<p class="w15-lock"><i aria-hidden="true" class="fa-solid fa-lock"></i> ${W15T('Registre administratif verrouillé. Le serveur ne l\'envoie qu\'avec un code d\'accès agent valide.')}</p>
            <form id="w15-login-form" class="w15-login" novalidate>
                <label class="tn-field-label" for="w15-code">${W15T('Code d\'accès agent')}</label>
                <input id="w15-code" class="cyber-input" type="password" autocomplete="off" maxlength="60" aria-describedby="w15-login-msg">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W15T('Déverrouiller')}</button>
                <button type="button" class="tn-tab" data-w15="probe-records">${W15T('Tester l\'accès sans autorisation')}</button>
            </form>
            <p id="w15-login-msg" class="tn-form-error" role="alert"></p>${hint}`;
        return;
    }
    box.innerHTML = `<p class="tn-hint">${W15T('Chargement du registre…')}</p>`;
    const result = await w15Api('/api/agent/records');
    if (result.status === 401) { w15Clear(); w15LoadRecords(); return; }
    if (!result.ok) { box.innerHTML = `<p class="tn-form-error">${W15T('Registre indisponible pour le moment.')}</p>`; return; }
    box.innerHTML = `<p class="w15-ok"><i aria-hidden="true" class="fa-solid fa-lock-open"></i> ${W15T('Registre déverrouillé')} (<span data-no-i18n>${escapeHtml(result.data.role)}</span> · ${W15T('session jusqu\'à')} <span data-no-i18n>${escapeHtml(new Date(w15.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}</span>)
        <button type="button" class="tn-tab" data-w15="lock">${W15T('Verrouiller')}</button></p>${w15RecordsHtml(result.data)}`;
}

async function w15ProbeRecords() {
    const msg = document.getElementById('w15-login-msg');
    const result = await fetch('/api/agent/records', { cache: 'no-store' });
    if (msg) msg.textContent = t('Réponse du serveur sans code : {status} — accès refusé, aucune donnée envoyée. La tentative est enregistrée.', { status: result.status });
    announce(t('Accès sans autorisation refusé.'));
}

// ------------------------------------------
// F69 — Contrôle de sécurité
// ------------------------------------------
async function w15RunChecks() {
    const box = document.getElementById('w15-checks');
    if (!box) return;
    if (!w15Unlocked()) { box.innerHTML = `<p class="tn-form-error">${W15T('Déverrouillez d\'abord l\'accès agent : le contrôle est réservé aux agents.')}</p>`; return; }
    box.innerHTML = `<p class="tn-hint">${W15T('Contrôle en cours…')}</p>`;
    const rows = [];
    const add = (ok, label, detail) => rows.push({ ok, label, detail });
    try {
        const head = await fetch('/', { method: 'HEAD', cache: 'no-store' });
        const csp = head.headers.get('content-security-policy') || '';
        add(/default-src 'self'/.test(csp) && /object-src 'none'/.test(csp), 'Politique de sécurité du contenu (CSP) active', csp ? csp.split(';').slice(0, 3).join(';') + '…' : 'absente');
        add(csp.includes("frame-ancestors 'none'") && head.headers.get('x-frame-options') === 'DENY', 'La plateforme ne peut pas être affichée dans le cadre d\'un autre site', 'X-Frame-Options : ' + head.headers.get('x-frame-options'));
        add(head.headers.get('x-content-type-options') === 'nosniff', 'Les types de fichiers ne sont pas devinés par le navigateur', 'X-Content-Type-Options : ' + head.headers.get('x-content-type-options'));
        add(Boolean(head.headers.get('referrer-policy')) && Boolean(head.headers.get('permissions-policy')), 'Adresse d\'origine, caméra, micro et position limitées', 'Referrer-Policy : ' + head.headers.get('referrer-policy'));
        add(!head.headers.get('access-control-allow-origin'), 'Les autres sites ne peuvent pas lire l\'API (pas de CORS ouvert)', head.headers.get('access-control-allow-origin') ? 'ouvert : ' + head.headers.get('access-control-allow-origin') : 'fermé');
    } catch (err) { add(false, 'En-têtes de sécurité', 'Lecture impossible'); }
    for (const file of ['/.env', '/server.js', '/data/broadcasts.json', '/package.json', '/.git/config']) {
        try {
            const result = await fetch(file, { cache: 'no-store', headers: { Authorization: `Bearer ${w15.token}`, 'X-Security-Check': '1' } });
            add(result.status === 404, `Fichier privé non servi : ${file}`, `réponse ${result.status}`);
        } catch (err) { add(false, `Fichier privé ${file}`, 'erreur réseau'); }
    }
    try {
        const config = await fetch('/api/config', { cache: 'no-store' });
        const text = await config.text();
        add(!/keyMasked|api[_-]?key"\s*:\s*"[^"]/i.test(text), 'La configuration publique ne montre aucune clé, même masquée', 'GET /api/config');
    } catch (err) { add(false, 'Configuration publique', 'erreur réseau'); }
    add(escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;', 'Les textes saisis par les habitants sont neutralisés avant affichage', 'escapeHtml');
    try {
        const own = await w15Api('/api/agent/selfcheck');
        if (own.ok && own.data) own.data.checks.forEach(check => add(check.ok, check.label, 'serveur'));
        else add(false, 'Auto-contrôle du serveur', 'statut ' + own.status);
    } catch (err) { add(false, 'Auto-contrôle du serveur', 'erreur réseau'); }
    const passed = rows.filter(row => row.ok).length;
    box.innerHTML = `<p class="${passed === rows.length ? 'w15-ok' : 'tn-form-error'}" role="status" data-no-i18n>${passed === rows.length ? '✔' : '⚠'} ${escapeHtml(t('{ok} contrôles réussis sur {total}', { ok: passed, total: rows.length }))}</p>
        <ul class="w15-checks" data-no-i18n>${rows.map(row => `<li class="${row.ok ? 'is-ok' : 'is-ko'}"><span aria-hidden="true">${row.ok ? '✔' : '✘'}</span> <span><strong>${escapeHtml(t(row.label))}</strong><br><span class="tn-hint">${escapeHtml(row.detail)}</span></span><span class="sr-only">${row.ok ? escapeHtml(t('réussi')) : escapeHtml(t('échec'))}</span></li>`).join('')}</ul>`;
    announce(t('{ok} contrôles réussis sur {total}.', { ok: passed, total: rows.length }));
}

// ------------------------------------------
// F85 — Activité inhabituelle
// ------------------------------------------
const W15_SEVERITY = { critical: { label: 'Critique', cls: 'danger' }, high: { label: 'Élevée', cls: 'progress' }, medium: { label: 'Moyenne', cls: 'pending' } };
const W15_TYPES = { login_failed: 'codes refusés', unauthorized: 'accès sans autorisation', probe: 'fichiers privés demandés', bot: 'robots bloqués', duplicate: 'envois en double', rate_limited: 'requêtes refusées pour excès', login_ok: 'connexions agent', records_read: 'consultations du registre' };

async function w15LoadAlerts() {
    const box = document.getElementById('w15-alerts');
    if (!box) return;
    if (!w15Unlocked()) { box.innerHTML = `<p class="tn-hint">${W15T('Déverrouillez l\'accès agent pour voir les alertes.')}</p>`; return; }
    const result = await w15Api('/api/agent/security');
    if (result.status === 401) { w15Clear(); w15LoadRecords(); w15LoadAlerts(); return; }
    if (!result.ok || !result.data) { box.innerHTML = `<p class="tn-form-error">${W15T('Alertes indisponibles pour le moment.')}</p>`; return; }
    w15.alerts = result.data;
    const data = result.data;
    const totals = Object.entries(data.totals).map(([type, count]) => `<span class="w15-chip" data-no-i18n>${count} ${escapeHtml(t(W15_TYPES[type] || type))}</span>`).join('');
    box.innerHTML = `${data.alerts.length ? `<ul class="w15-alerts">${data.alerts.map(alert => {
        const level = W15_SEVERITY[alert.severity] || W15_SEVERITY.medium;
        return `<li class="w15-alert w15-alert--${alert.severity}"><span class="tn-badge tn-badge--${level.cls}">${escapeHtml(t(level.label))}</span> <strong>${escapeHtml(t(alert.title))}</strong><br><span class="tn-hint" data-no-i18n>${escapeHtml(alert.detail)} · ${escapeHtml(new Date(alert.last).toLocaleTimeString('fr-FR'))}</span></li>`;
    }).join('')}</ul>` : `<p class="w15-ok" data-no-i18n>✔ ${escapeHtml(t('Aucune activité inhabituelle sur les 15 dernières minutes.'))}</p>`}
        ${totals ? `<p class="w15-chips"><span class="tn-hint">${W15T('Sur 24 h')} :</span> ${totals}</p>` : ''}
        ${data.recent.length ? `<details class="w14-details"><summary>${W15T('Derniers événements')} (<span data-no-i18n>${data.recent.length}</span>)</summary><ul class="w15-events" data-no-i18n>${data.recent.map(event => `<li>${escapeHtml(new Date(event.at).toLocaleTimeString('fr-FR'))} · ${escapeHtml(t(W15_TYPES[event.type] || event.type))} · ${escapeHtml(event.detail || '')} · ${escapeHtml(event.ip)}</li>`).join('')}</ul></details>` : ''}
        <p class="tn-hint">${W15T('Le serveur compare les événements des 15 dernières minutes : codes refusés, fichiers privés demandés, robots, envois en double, excès de requêtes. Les adresses ne sont jamais conservées, seulement une empreinte courte.')}</p>`;
    clearTimeout(w15.timer);
    w15.timer = setTimeout(() => { if (document.getElementById('w15-alerts') && w15Unlocked() && !document.hidden) w15LoadAlerts(); else if (w15Unlocked()) w15.timer = setTimeout(w15LoadAlerts, 20000); }, 20000);
}

function w15RenderPanel() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w15-security')) return;
    const panel = document.createElement('section');
    panel.id = 'w15-security';
    panel.className = 'w15-panel';
    panel.setAttribute('aria-labelledby', 'w15-title');
    panel.innerHTML = `
        <h3 id="w15-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-shield-halved"></i> ${W15T('Centre de sécurité numérique')}</h3>
        <p class="tn-hint">${W15T('Protéger les données sensibles : registre réservé aux agents, contrôles des protections et alertes d\'activité inhabituelle.')}</p>
        <div class="w15-grid">
            <div class="w15-card"><h4 class="tn-w12-sub">${W15T('Données administratives réservées')}</h4><div id="w15-records"></div></div>
            <div class="w15-card"><h4 class="tn-w12-sub">${W15T('Contrôle des protections')}</h4>
                <p class="tn-hint">${W15T('Vérifie en direct les en-têtes de sécurité, les fichiers privés, la configuration publique et les jetons.')}</p>
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w15="run-checks">${W15T('Lancer le contrôle')}</button>
                <div id="w15-checks" role="status" aria-live="polite"></div></div>
            <div class="w15-card"><h4 class="tn-w12-sub">${W15T('Activité inhabituelle')}</h4>
                <button type="button" class="tn-tab" data-w15="refresh-alerts">${W15T('Actualiser')}</button>
                <div id="w15-alerts" aria-live="polite"></div></div>
        </div>`;
    const anchor = document.getElementById('w14-medical');
    if (anchor) anchor.after(panel); else workspace.prepend(panel);
    w15LoadRecords();
    w15LoadAlerts();
}

// ------------------------------------------
// F81 / F82 — Robots et envois en double
// ------------------------------------------
const W15_GUARDED = new Set(['contact-municipal-form', 'form-login', 'form-register', 'broadcast-form', 'w12-idea-form', 'w12-respond-form', 'appt-form', 'inq-form', 'svc-form', 'transit-form', 'edit-account-form']);
const W15_NO_DUPLICATE = new Set(['form-register', 'broadcast-form', 'w12-idea-form', 'appt-form', 'inq-form', 'svc-form', 'transit-form']);
const W15_NO_SPEED = new Set(['form-login', 'form-register', 'edit-account-form']);
const W15_SENT_KEY = 'tn_w15_sent';
const w15Recent = [];
const W15_MAX_PER_MINUTE = 8;

function w15Report(type, form) {
    try { fetch('/api/security/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, form: String(form || '').slice(0, 40) }), keepalive: true }).catch(() => { }); } catch (err) { }
}

function w15AddHoneypot(form) {
    if (!W15_GUARDED.has(form.id) || form.querySelector('.w15-hp')) return;
    const wrap = document.createElement('div');
    wrap.className = 'w15-hp';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = '<label>Laisser ce champ vide<input type="text" name="w15_company_ref" tabindex="-1" autocomplete="off" value=""></label>';
    form.appendChild(wrap);
}

function w15Fingerprint(form) {
    const parts = [form.id];
    form.querySelectorAll('input, textarea, select').forEach(field => {
        if (field.closest('.w15-hp') || field.type === 'password' || field.type === 'hidden' || field.type === 'submit' || field.type === 'button') return;
        if ((field.type === 'checkbox' || field.type === 'radio') && !field.checked) return;
        parts.push((field.name || field.id || field.type) + '=' + String(field.value).trim().toLowerCase());
    });
    return parts.join('|');
}

function w15SentLoad() { try { return JSON.parse(sessionStorage.getItem(W15_SENT_KEY) || '[]'); } catch (err) { return []; } }
function w15SentSave(list) { try { sessionStorage.setItem(W15_SENT_KEY, JSON.stringify(list.slice(-30))); } catch (err) { } }

function w15Block(form, event, message, type) {
    event.preventDefault();
    event.stopImmediatePropagation();
    let box = form.querySelector('.w15-guard-msg');
    if (!box) {
        box = document.createElement('p');
        box.className = 'w15-guard-msg';
        box.setAttribute('role', 'alert');
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.before(box); else form.appendChild(box);
    }
    box.textContent = message;
    announce(message);
    w15Report(type, form.id);
}

function w15FieldsEmpty(form) {
    const fields = Array.from(form.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea')).filter(field => !field.closest('.w15-hp'));
    return fields.length > 0 && fields.every(field => !String(field.value).trim());
}

document.addEventListener('focusin', event => {
    const form = event.target.closest && event.target.closest('form');
    if (form && !form.dataset.w15Start) form.dataset.w15Start = String(Date.now());
}, true);
document.addEventListener('input', event => {
    const form = event.target.closest && event.target.closest('form');
    if (form && !form.dataset.w15Start) form.dataset.w15Start = String(Date.now());
}, true);

document.addEventListener('submit', event => {
    const form = event.target;
    if (!form || !form.id || !W15_GUARDED.has(form.id)) return;
    const now = Date.now();

    // F81 — champ piège rempli : seul un robot le voit
    const trap = form.querySelector('.w15-hp input');
    if (trap && trap.value) { w15Block(form, event, t('Envoi bloqué : ce formulaire a été rempli de façon automatique.'), 'bot'); return; }

    // F81 — texte saisi presque instantanément
    const start = Number(form.dataset.w15Start || 0);
    if (!W15_NO_SPEED.has(form.id) && start && now - start < 700) {
        const text = Array.from(form.querySelectorAll('textarea, input[type=text], input:not([type])')).filter(field => !field.closest('.w15-hp')).reduce((sum, field) => sum + String(field.value).length, 0);
        if (text > 20) { w15Block(form, event, t('Envoi bloqué : le formulaire a été rempli beaucoup trop vite pour une personne. Réessayez calmement.'), 'bot'); return; }
    }

    // F81 — trop d'envois en une minute
    while (w15Recent.length && now - w15Recent[0] > 60000) w15Recent.shift();
    if (w15Recent.length >= W15_MAX_PER_MINUTE) { w15Block(form, event, t('Trop d\'envois en peu de temps. Attendez une minute avant de réessayer.'), 'bot'); return; }

    // F82 — double clic : le même formulaire n'est traité qu'une fois
    if (form.dataset.w15Busy && now - Number(form.dataset.w15Busy) < 1500) { event.preventDefault(); event.stopImmediatePropagation(); return; }

    // F82 — même contenu déjà envoyé il y a moins d'une minute
    const fingerprint = w15Fingerprint(form);
    if (W15_NO_DUPLICATE.has(form.id)) {
        const sent = w15SentLoad().find(entry => entry.fp === fingerprint && now - entry.at < 60000);
        if (sent) {
            const seconds = Math.max(1, Math.round((now - sent.at) / 1000));
            w15Block(form, event, t('Ce formulaire a déjà été envoyé il y a {n} s avec le même contenu. Il n\'est pas renvoyé pour éviter un doublon. Modifiez-le si vous voulez en envoyer un autre.', { n: seconds }), 'duplicate');
            return;
        }
    }

    form.dataset.w15Busy = String(now);
    const message = form.querySelector('.w15-guard-msg');
    if (message) message.remove();
    w15Recent.push(now);

    // On ne retient le contenu que si l'envoi a réellement abouti (formulaire fermé, masqué ou vidé)
    if (W15_NO_DUPLICATE.has(form.id)) {
        setTimeout(() => {
            const done = !document.body.contains(form) || form.hidden || Boolean(form.closest('[hidden], .hidden')) || w15FieldsEmpty(form);
            if (done) { const list = w15SentLoad(); list.push({ fp: fingerprint, at: now }); w15SentSave(list); }
        }, 500);
    }
}, true);

// ------------------------------------------
// Événements du panneau
// ------------------------------------------
document.addEventListener('click', event => {
    const el = event.target.closest('[data-w15]');
    if (!el) return;
    switch (el.dataset.w15) {
        case 'run-checks': w15RunChecks(); break;
        case 'refresh-alerts': w15LoadAlerts(); break;
        case 'probe-records': w15ProbeRecords(); break;
        case 'lock': w15Clear(); w15LoadRecords(); w15LoadAlerts(); announce(t('Registre verrouillé.')); break;
        case 'demo-code': {
            const field = document.getElementById('w15-code');
            const code = w15.status && w15.status.demoCodes ? w15.status.demoCodes[el.dataset.role] : '';
            if (field) { field.value = code; field.dataset.role = el.dataset.role; field.focus(); }
            break;
        }
        default: break;
    }
});

document.addEventListener('submit', async event => {
    if (event.target.id !== 'w15-login-form') return;
    event.preventDefault();
    const field = document.getElementById('w15-code');
    const msg = document.getElementById('w15-login-msg');
    const code = field.value.trim();
    if (!code) { msg.textContent = t('Saisissez le code d\'accès.'); field.focus(); return; }
    msg.textContent = '';
    const outcome = await w15Login(code, field.dataset.role === 'admin' ? 'admin' : 'agent');
    if (outcome.ok) { announce(t('Registre déverrouillé.')); w15LoadRecords(); w15LoadAlerts(); }
    else { msg.textContent = t(outcome.message); field.value = ''; field.focus(); w15LoadAlertsSoon(); }
});
let w15AlertTimer = null;
function w15LoadAlertsSoon() { clearTimeout(w15AlertTimer); w15AlertTimer = setTimeout(() => { if (w15Unlocked()) w15LoadAlerts(); }, 500); }

document.addEventListener('DOMContentLoaded', async () => {
    w15Restore();
    try { const status = await w15Api('/api/agent/status'); if (status.ok) w15.status = status.data; } catch (err) { }
    w15RenderPanel();

    document.querySelectorAll('form').forEach(w15AddHoneypot);
    new MutationObserver(mutations => {
        mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
            if (node.nodeType !== 1) return;
            if (node.matches && node.matches('form')) w15AddHoneypot(node);
            if (node.querySelectorAll) node.querySelectorAll('form').forEach(w15AddHoneypot);
        }));
    }).observe(document.body, { childList: true, subtree: true });

    // Alertes de sécurité dans les notifications des agents
    if (typeof tnNotificationItems === 'function') {
        const baseItems = tnNotificationItems;
        tnNotificationItems = function () {
            const items = baseItems.apply(this, arguments);
            try {
                if (typeof currentRole !== 'undefined' && currentRole !== 'citizen' && w15.alerts && w15Unlocked()) {
                    w15.alerts.alerts.slice(0, 3).forEach(alert => items.push({
                        id: 'sec-' + alert.id, level: alert.severity === 'critical' ? 'urgence' : 'important', date: alert.last, userText: false, read: false,
                        title: t(alert.title), text: alert.detail, action: "goToSection('espace-agent')"
                    }));
                    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                }
            } catch (err) { }
            return items;
        };
    }
    document.addEventListener('tn:langchange', () => { const panel = document.getElementById('w15-security'); if (panel) { panel.remove(); w15RenderPanel(); } });
});
