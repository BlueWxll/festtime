// ==========================================
// VAGUE 19 — Services vivants : transports de remplacement, usage des services, partenaires, journal de sécurité
// F97 interruptions de lignes partagées + solutions de remplacement, F98 statistiques d'usage anonymes,
// F99 partenaires (disponibilité, prochaine action, validation par un agent), F100 événements de sécurité détaillés.
// Réutilise : w4LineStatus, w4LinesBetween, w4Journeys, w4Departures, w4Format, w4RenderTransports, TN_LINES,
// w15Api, w15Unlocked, refreshBroadcasts (tn:server), showSubmissionConfirmation, w5Appointments, w5ConfirmAppointment,
// TN_SECTIONS, escapeHtml, announce, t().
// ==========================================

const W19T = (source, params) => escapeHtml(String(t(source, params)));
const w19 = { disruptions: [], sig: '', usage: null, usageDays: 7, usageDemo: false, queue: [], flushTimer: null, partners: [], partnersAt: 0, partnerVisible: false, events: null, eventFilter: '', eventAuto: true, eventTimer: null, seen: {} };
function w19Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (err) { return fallback; } }
function w19Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; } }
function w19Clock(iso) { const d = new Date(iso); return isNaN(d) ? '—' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function w19Stamp(iso) { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function w19Download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}
function w19Csv(rows) { return '﻿' + rows.map(row => row.map(cell => { const s = String(cell == null ? '' : cell); return /[";\n,]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n'); }
function w19Locked(icon, title) {
    return `<p class="tn-hint"><i aria-hidden="true" class="fa-solid ${icon}"></i> ${W19T('Réservé aux agents connectés.')} <a class="tn-link" href="#w15-security">${W19T('Ouvrir le centre de sécurité pour s\'identifier')}</a>${title ? '' : ''}</p>`;
}

// ------------------------------------------
// F97 — Interruptions de lignes et solutions de remplacement
// ------------------------------------------
const w19BaseStatus = w4LineStatus;
w4LineStatus = function (line) {
    const shared = w19.disruptions.find(item => item.lineId === line.id);
    if (shared) return { disrupted: true, text: `${shared.cause} — ${t('retour prévu')} ${w19Clock(shared.until)}` };
    return w19BaseStatus(line);
};
const w19BaseBetween = w4LinesBetween;
w4LinesBetween = function (a, b) {
    return w19BaseBetween(a, b).filter(line => !w19.disruptions.some(item => item.lineId === line.id));
};

function w19Substitutes() {
    for (let i = TN_LINES.length - 1; i >= 0; i--) if (TN_LINES[i].id.startsWith('S-')) TN_LINES.splice(i, 1);
    w19.disruptions.forEach(item => {
        const base = TN_LINES.find(line => line.id === item.lineId);
        if (!base) return;
        const now = new Date();
        const first = String(now.getHours()).padStart(2, '0') + ':' + String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
        TN_LINES.push({ id: 'S-' + base.id, name: `Navette de remplacement ${base.id}`, kind: 'Remplacement', stops: base.stops.slice(), trip: base.trip * 2, every: Math.max(20, base.every * 2), first, last: base.last });
    });
}

function w19Sync(list) {
    const next = (Array.isArray(list) ? list : []).filter(item => item && Date.parse(item.until) > Date.now());
    const sig = JSON.stringify(next.map(item => [item.lineId, item.since, item.until, item.cause]));
    if (sig === w19.sig) return;
    w19.sig = sig;
    w19.disruptions = next;
    w19Substitutes();
    if (typeof w4RenderTransports === 'function') w4RenderTransports();
    w19RenderReplace();
    if (next.length) announce(t('Interruption de ligne signalée : {lines}. Des solutions de remplacement sont proposées.', { lines: next.map(item => item.lineId).join(', ') }));
}

function w19ReplaceHtml() {
    const now = new Date();
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    if (!w19.disruptions.length) return `<p class="tn-hint">${W19T('Toutes les lignes circulent normalement.')}</p>`;
    return w19.disruptions.map(item => {
        const base = TN_LINES.find(line => line.id === item.lineId);
        const sub = TN_LINES.find(line => line.id === 'S-' + item.lineId);
        if (!base) return '';
        const [a, b] = base.stops;
        const next = sub ? w4Departures(sub, a, nowMinute, 1)[0] : undefined;
        const alt = w4Journeys(a, b, nowMinute).find(journey => journey.legs.every(leg => !leg.line.id.startsWith('S-')));
        return `<article class="w19-incident" aria-label="${escapeHtml(t('Ligne {id} interrompue', { id: item.lineId }))}">
            <h4 class="w19-incident-title"><span class="tn-line-id" data-no-i18n>${escapeHtml(item.lineId)}</span> ${W19T('interrompue')} <span class="tn-badge tn-badge--pending">${W19T('Retour prévu')} <span data-no-i18n>${escapeHtml(w19Clock(item.until))}</span></span></h4>
            <p class="tn-hint" data-no-i18n>${escapeHtml(item.cause)} · ${escapeHtml(t(a))} ⇄ ${escapeHtml(t(b))}</p>
            <ol class="w19-solutions">
                ${sub ? `<li>${W19T('Navette de remplacement {id} : toutes les {n} min.', { id: sub.id, n: sub.every })} ${next !== undefined ? W19T('Prochain départ de {station} à {time}.', { station: t(a), time: w4Format(next) }) : ''}</li>` : ''}
                ${alt ? `<li>${W19T('Autre itinéraire :')} <span data-no-i18n>${alt.legs.map(leg => escapeHtml(leg.line.id)).join(' → ')} · ${escapeHtml(w4Format(alt.legs[0].depart))} → ${escapeHtml(w4Format(alt.legs[alt.legs.length - 1].arrive))}</span></li>` : `<li>${W19T('Aucun autre itinéraire direct : utilisez la navette de remplacement.')}</li>`}
                <li>${W19T("En cas d'urgence : balise d'urgence 112, elle ne dépend pas des transports.")}</li>
            </ol>
        </article>`;
    }).join('');
}

function w19ControlHtml() {
    if (!w15Unlocked()) return `<p class="tn-hint">${W19T('Les agents connectés peuvent signaler ou lever une interruption de ligne.')}</p>`;
    return `<form class="w19-control" data-w19-form="transport" novalidate>
        <h4 class="tn-w12-sub">${W19T('Interruption de ligne (agents)')}</h4>
        <label class="tn-field-label" for="w19-line">${W19T('Ligne')}</label>
        <select id="w19-line" class="cyber-input">${TN_LINES.filter(line => !line.id.startsWith('S-')).map(line => `<option value="${escapeHtml(line.id)}">${escapeHtml(line.id)} — ${escapeHtml(t(line.name))}</option>`).join('')}</select>
        <label class="tn-field-label" for="w19-cause">${W19T('Cause')}</label>
        <input id="w19-cause" class="cyber-input" maxlength="120" value="${escapeHtml(t('Incident technique'))}">
        <label class="tn-field-label" for="w19-minutes">${W19T('Retour prévu dans')}</label>
        <select id="w19-minutes" class="cyber-input">${[[30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h'], [720, '12 h']].map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('')}</select>
        <div class="w19-actions">
            <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W19T("Signaler l'interruption")}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w19="transport-clear">${W19T('Rétablir la ligne')}</button>
        </div>
        <p id="w19-transport-msg" class="tn-hint" role="status"></p>
    </form>`;
}

function w19RenderReplace() {
    const box = document.getElementById('w19-replace');
    if (!box) return;
    box.innerHTML = `<h3 class="tn-eyebrow">${W19T('Perturbations et solutions de remplacement')}</h3><div id="w19-replace-list">${w19ReplaceHtml()}</div><div id="w19-control-box">${w19ControlHtml()}</div>`;
}

async function w19Transport(action) {
    const msg = document.getElementById('w19-transport-msg');
    const lineId = document.getElementById('w19-line').value;
    const body = { lineId, action, cause: document.getElementById('w19-cause').value, backMinutes: Number(document.getElementById('w19-minutes').value) };
    const result = await w15Api('/api/transport', { method: 'POST', body: JSON.stringify(body) });
    if (!result.ok) { if (msg) msg.textContent = t(result.status === 401 ? 'Session agent expirée : reconnectez-vous.' : 'Opération refusée.'); return; }
    window.tnTransport = result.data.disruptions;
    w19Sync(result.data.disruptions);
    const again = document.getElementById('w19-msg-keep');
    const note = document.getElementById('w19-transport-msg');
    if (note) note.textContent = t(action === 'set' ? 'Interruption publiée : tous les habitants la voient.' : 'Ligne rétablie.');
    void again;
}

function w19InitTransport() {
    const results = document.getElementById('transit-results');
    if (!results || document.getElementById('w19-replace')) return;
    const box = document.createElement('div');
    box.id = 'w19-replace';
    box.className = 'w19-replace';
    results.before(box);
    w19RenderReplace();
    w19Sync(window.tnTransport || []);
    document.addEventListener('tn:server', () => w19Sync(window.tnTransport || []));
    document.addEventListener('tn:agent-session', () => { const c = document.getElementById('w19-control-box'); if (c) c.innerHTML = w19ControlHtml(); });
    setInterval(() => { if (!document.hidden && w19.disruptions.length) { const list = document.getElementById('w19-replace-list'); if (list) list.innerHTML = w19ReplaceHtml(); w19Sync(window.tnTransport || []); } }, 60000);
}

// ------------------------------------------
// F98 — Usage des services (compteurs anonymes)
// ------------------------------------------
function w19Tracking() { return !(navigator.doNotTrack === '1' || window.doNotTrack === '1') && w19Load('tn_w19_notrack', false) !== true; }

function w19Track(service, kind) {
    if (!service || !w19Tracking()) return;
    const key = service + '|' + kind;
    if (kind === 'view' && Date.now() - (w19.seen[key] || 0) < 30000) return;
    w19.seen[key] = Date.now();
    w19.queue.push({ service: String(service).slice(0, 60), kind });
    clearTimeout(w19.flushTimer);
    w19.flushTimer = setTimeout(w19Flush, 6000);
}

function w19Flush() {
    if (!w19.queue.length) return;
    const events = w19.queue.splice(0, 20);
    const body = JSON.stringify({ events });
    try {
        if (document.visibilityState === 'hidden' && navigator.sendBeacon) navigator.sendBeacon('/api/usage', new Blob([body], { type: 'application/json' }));
        else fetch('/api/usage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => { });
    } catch (err) { }
    if (w19.queue.length) w19.flushTimer = setTimeout(w19Flush, 1000);
}

function w19InitUsage() {
    const grid = document.getElementById('services-grid');
    if (grid) {
        grid.addEventListener('click', event => {
            const card = event.target.closest('.service-item');
            const heading = card && card.querySelector('h3, h4');
            if (heading) w19Track(Array.from(heading.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim() || heading.textContent.trim(), 'view');
        });
        if (!document.getElementById('w19-privacy')) {
            const note = document.createElement('p');
            note.id = 'w19-privacy';
            note.className = 'tn-hint w19-privacy';
            note.innerHTML = `${W19T("Mesure d'usage anonyme : seuls des compteurs par service et par jour sont gardés, jamais de nom, d'adresse ni de contenu.")} <button type="button" class="tn-link" data-w19="notrack">${W19T(w19Tracking() ? 'Ne pas participer' : 'Participer à nouveau')}</button>`;
            grid.after(note);
        }
    }
    const baseConfirm = showSubmissionConfirmation;
    showSubmissionConfirmation = function (ticket) { const out = baseConfirm.apply(this, arguments); if (ticket && ticket.service) w19Track(ticket.service, 'request'); return out; };
    if (typeof w5ConfirmAppointment === 'function') {
        const baseAppt = w5ConfirmAppointment;
        w5ConfirmAppointment = function () {
            const before = w5Appointments().length;
            const out = baseAppt.apply(this, arguments);
            const list = w5Appointments();
            if (list.length > before) w19Track(list[list.length - 1].service, 'appointment');
            return out;
        };
    }
    window.addEventListener('pagehide', w19Flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) w19Flush(); });
}

const W19_USAGE_DEMO = { days: 7, demo: true, grandTotal: 0, services: [
    { service: 'Santé Biotech & Cryo-Soins', view: 210, request: 64, appointment: 41, search: 0, before: 240 },
    { service: 'Énergie & Dômes', view: 180, request: 58, appointment: 0, search: 0, before: 120 },
    { service: 'Sécurité Civile & Sentinelles', view: 150, request: 31, appointment: 12, search: 0, before: 170 },
    { service: 'Logement & Urbanisme', view: 96, request: 40, appointment: 22, search: 0, before: 98 },
    { service: 'Transports & Hyper-Tubes', view: 80, request: 9, appointment: 0, search: 0, before: 130 }
] };
W19_USAGE_DEMO.services.forEach(row => { row.total = row.view + row.request + row.appointment + row.search; });
W19_USAGE_DEMO.grandTotal = W19_USAGE_DEMO.services.reduce((sum, row) => sum + row.total, 0);

function w19Trend(row) {
    if (!row.before) return { text: t('nouveau'), cls: 'neutral', pct: null };
    const pct = Math.round(((row.total - row.before) / row.before) * 100);
    return { text: (pct > 0 ? '+' : '') + pct + ' %', cls: pct > 0 ? 'resolved' : pct < 0 ? 'pending' : 'neutral', pct };
}

function w19UsageSummary(d) {
    if (!d.services.length) return t("Aucune mesure sur la période : elles s'enregistrent quand les habitants consultent les services.");
    const top = d.services[0];
    const movers = d.services.filter(row => row.before).map(row => ({ row, pct: w19Trend(row).pct })).sort((a, b) => b.pct - a.pct);
    const up = movers[0];
    const down = movers[movers.length - 1];
    let text = t('Sur {n} jours : {total} usages enregistrés. Le plus demandé : {service} ({count}).', { n: d.days, total: d.grandTotal, service: top.service, count: top.total });
    if (up && up.pct > 0) text += ' ' + t('Plus forte hausse : {service} ({pct} %).', { service: up.row.service, pct: '+' + up.pct });
    if (down && down !== up && down.pct < 0) text += ' ' + t('Plus forte baisse : {service} ({pct} %).', { service: down.row.service, pct: down.pct });
    return text;
}

function w19RenderUsage() {
    const box = document.getElementById('w19-usage-body');
    if (!box) return;
    if (!w15Unlocked()) { box.innerHTML = w19Locked('fa-lock'); return; }
    const d = w19.usage;
    if (!d) { box.innerHTML = `<p class="tn-hint">${W19T('Chargement…')}</p>`; return; }
    const max = Math.max(1, ...d.services.map(row => row.total));
    box.innerHTML = `
        <div class="w19-toolbar">
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="usage-days" data-days="7" aria-pressed="${d.days === 7}">${W19T('7 jours')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="usage-days" data-days="30" aria-pressed="${d.days === 30}">${W19T('30 jours')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="usage-demo">${W19T(d.demo ? 'Revenir aux vraies mesures' : 'Voir un exemple')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="usage-csv">${W19T('Exporter en CSV')}</button>
        </div>
        ${d.demo ? `<p class="w19-demo" role="status">${W19T('Exemple chiffré fictif, pour illustrer le classement. Ce ne sont pas des mesures réelles.')}</p>` : ''}
        <p class="w19-summary" role="status" data-no-i18n>${escapeHtml(w19UsageSummary(d))}</p>
        ${d.services.length ? `<div class="w19-table-wrap"><table class="w19-table"><caption class="sr-only">${W19T('Classement des services par usage')}</caption>
            <thead><tr><th scope="col">#</th><th scope="col">${W19T('Service')}</th><th scope="col">${W19T('Consultations')}</th><th scope="col">${W19T('Demandes')}</th><th scope="col">${W19T('Rendez-vous')}</th><th scope="col">${W19T('Total')}</th><th scope="col">${W19T('Tendance')}</th></tr></thead>
            <tbody data-no-i18n>${d.services.map((row, index) => { const trend = w19Trend(row); return `<tr><td>${index + 1}</td><th scope="row">${escapeHtml(row.service)}<span class="w19-bar" style="width:${Math.round((row.total / max) * 100)}%" aria-hidden="true"></span></th><td>${row.view}</td><td>${row.request}</td><td>${row.appointment}</td><td><strong>${row.total}</strong></td><td><span class="tn-badge tn-badge--${trend.cls}">${escapeHtml(trend.text)}</span></td></tr>`; }).join('')}</tbody></table></div>` : ''}
        <p class="tn-hint">${W19T("Tendance : comparaison avec la période précédente de même durée. Compteurs anonymes, sans identifiant.")}</p>`;
}

async function w19LoadUsage(days) {
    if (!w15Unlocked()) { w19RenderUsage(); return; }
    w19.usageDays = days || w19.usageDays;
    if (w19.usageDemo) { w19.usage = Object.assign({}, W19_USAGE_DEMO, { days: w19.usageDays }); w19RenderUsage(); return; }
    const result = await w15Api('/api/agent/usage?days=' + w19.usageDays);
    if (!result.ok) { const box = document.getElementById('w19-usage-body'); if (box) box.innerHTML = `<p class="tn-form-error">${W19T('Statistiques indisponibles.')}</p>`; return; }
    w19.usage = result.data;
    w19RenderUsage();
}

function w19UsageCsv() {
    const d = w19.usage;
    if (!d) return;
    const rows = [['Service', 'Consultations', 'Demandes', 'Rendez-vous', 'Total', 'Total période précédente']].concat(d.services.map(row => [row.service, row.view, row.request, row.appointment, row.total, row.before]));
    w19Download(`usage-services-${d.days}j.csv`, w19Csv(rows));
}

// ------------------------------------------
// F99 — Partenaires
// ------------------------------------------
const W19_STATUS = { available: { label: 'Disponible', cls: 'resolved', cta: 'Réserver', done: 'Réservation notée', kind: 'book' }, limited: { label: 'Places limitées', cls: 'pending', cta: "S'inscrire sur la liste d'attente", done: "Inscrit sur la liste d'attente", kind: 'wait' }, unavailable: { label: 'Indisponible', cls: 'danger', cta: 'Être prévenu du retour', done: 'Vous serez prévenu', kind: 'notify' } };
function w19Actions() { const list = w19Load('tn_w19_actions', []); return Array.isArray(list) ? list : []; }

function w19PartnerCard(item) {
    const status = W19_STATUS[item.status] || W19_STATUS.available;
    const action = w19Actions().find(entry => entry.id === item.id);
    return `<li class="w19-partner">
        <div class="w19-partner-head"><strong data-no-i18n>${escapeHtml(item.partner)}</strong> <span class="tn-badge tn-badge--${status.cls}">${W19T(status.label)}</span></div>
        <p class="w19-partner-service" data-no-i18n>${escapeHtml(item.service)}</p>
        <p class="tn-hint" data-no-i18n>${escapeHtml(item.description)}</p>
        <p class="tn-hint"><span data-no-i18n>${escapeHtml(item.next || '')}</span>${item.until ? ` · ${W19T('jusqu\'au')} <span data-no-i18n>${escapeHtml(item.until)}</span>` : ''} · <span data-no-i18n>${escapeHtml(item.contact)}</span></p>
        ${action ? `<p class="w19-done" role="status"><i aria-hidden="true" class="fa-solid fa-circle-check"></i> ${W19T(action.label)} · <button type="button" class="tn-link" data-w19="partner-undo" data-id="${escapeHtml(item.id)}">${W19T('Annuler')}</button></p>`
            : `<button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="partner-act" data-id="${escapeHtml(item.id)}">${W19T(status.cta)}</button>`}
    </li>`;
}

function w19RenderPartners() {
    const list = document.getElementById('w19-partner-list');
    if (!list) return;
    const news = document.getElementById('w19-partner-news');
    list.innerHTML = w19.partners.length ? w19.partners.map(w19PartnerCard).join('') : `<li class="tn-empty">${W19T('Aucun partenaire pour le moment.')}</li>`;
    const count = document.getElementById('w19-partner-count');
    if (count) count.textContent = t('{n} partenaires', { n: w19.partners.length });
    void news;
}

// Inscription « être prévenu » : à chaque actualisation, on regarde si le partenaire est de nouveau disponible
function w19CheckNotify() {
    const actions = w19Actions();
    let changed = false;
    actions.forEach(entry => {
        if (entry.kind !== 'notify') return;
        const partner = w19.partners.find(item => item.id === entry.id);
        if (partner && partner.status !== 'unavailable') {
            entry.kind = 'ready'; entry.label = 'Le service est de nouveau disponible'; changed = true;
            const news = document.getElementById('w19-partner-news');
            if (news) { news.hidden = false; news.textContent = t('Bonne nouvelle : {partner} est de nouveau disponible.', { partner: partner.partner }); }
            announce(t('Bonne nouvelle : {partner} est de nouveau disponible.', { partner: partner.partner }));
        }
    });
    if (changed) w19Save('tn_w19_actions', actions);
}

async function w19LoadPartners() {
    try {
        const response = await fetch('/api/partners', { cache: 'no-store' });
        if (!response.ok) throw new Error('http');
        const data = await response.json();
        w19.partners = data.partners || [];
        w19Save('tn_w19_partners', { at: Date.now(), partners: w19.partners });
    } catch (err) {
        const kept = w19Load('tn_w19_partners', null);
        if (kept) w19.partners = kept.partners || [];
    }
    w19.partnersAt = Date.now();
    w19CheckNotify();
    w19RenderPartners();
}

function w19InitPartners() {
    if (document.getElementById('partenaires')) return;
    const anchor = document.getElementById('associations') || document.getElementById('plan-ville') || document.getElementById('transports');
    if (!anchor) return;
    const section = document.createElement('section');
    section.id = 'partenaires';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'partenaires-title');
    section.dataset.crumb = 'Partenaires';
    section.innerHTML = `
        <div class="mb-8">
            <h2 id="partenaires-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">PARTENAIRES</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">${W19T("Services proposés par des entreprises et organismes partenaires de la cité : ce qui est disponible maintenant, et la prochaine action possible.")}</p>
        </div>
        <p id="w19-partner-news" class="w19-news" role="status" hidden></p>
        <p id="w19-partner-count" class="tn-tracker-count" role="status" data-no-i18n></p>
        <ul id="w19-partner-list" class="w19-partners"></ul>
        <details class="w14-details w19-propose"><summary>${W19T('Proposer un partenaire')}</summary>
            <form id="w19-propose-form" data-w19-form="partner" novalidate class="w19-form">
                <label class="tn-field-label" for="w19-p-name">${W19T('Nom du partenaire')}</label><input id="w19-p-name" class="cyber-input" maxlength="80">
                <label class="tn-field-label" for="w19-p-service">${W19T('Service proposé')}</label><input id="w19-p-service" class="cyber-input" maxlength="100">
                <label class="tn-field-label" for="w19-p-desc">${W19T('Description')}</label><textarea id="w19-p-desc" class="cyber-input" rows="3" maxlength="400"></textarea>
                <label class="tn-field-label" for="w19-p-status">${W19T('Disponibilité actuelle')}</label>
                <select id="w19-p-status" class="cyber-input">${Object.keys(W19_STATUS).map(key => `<option value="${key}">${W19T(W19_STATUS[key].label)}</option>`).join('')}</select>
                <label class="tn-field-label" for="w19-p-next">${W19T('Prochaine action pour l\'habitant')}</label><input id="w19-p-next" class="cyber-input" maxlength="140">
                <label class="tn-field-label" for="w19-p-contact">${W19T('Contact')}</label><input id="w19-p-contact" class="cyber-input" maxlength="80">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W19T('Envoyer la proposition')}</button>
                <p id="w19-propose-msg" class="tn-hint" role="status"></p>
            </form>
        </details>
        <p class="tn-hint">${W19T("Partenaires fictifs du jeu de rôle Terra Nova. Une proposition n'est visible qu'après validation par un agent. Vos inscriptions sont gardées sur cet appareil.")}</p>`;
    anchor.after(section);
    if (!TN_SECTIONS.some(entry => entry.id === 'partenaires')) {
        const index = TN_SECTIONS.findIndex(entry => entry.id === 'associations');
        TN_SECTIONS.splice(index >= 0 ? index + 1 : TN_SECTIONS.length, 0, { id: 'partenaires', label: 'Partenaires' });
    }
    const navLink = document.querySelector('#site-nav a[href="#associations"]') || document.querySelector('#site-nav a[href="#plan-ville"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#partenaires';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-handshake text-[11px] text-[#00B8FF]"></i><span>PARTENAIRES</span>';
        navLink.after(link);
    }
    const kept = w19Load('tn_w19_partners', null);
    if (kept) { w19.partners = kept.partners || []; w19RenderPartners(); }
    // Chargement différé : au premier affichage de la rubrique, puis chaque minute tant qu'elle est visible
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            w19.partnerVisible = entries.some(entry => entry.isIntersecting);
            if (w19.partnerVisible && Date.now() - w19.partnersAt > 20000) w19LoadPartners();
        }, { rootMargin: '200px' }).observe(section);
    } else w19LoadPartners();
    setInterval(() => { if (w19.partnerVisible && !document.hidden) w19LoadPartners(); }, 60000);
    document.addEventListener('tn:langchange', w19RenderPartners);
}

async function w19Propose(form) {
    const msg = document.getElementById('w19-propose-msg');
    const value = id => document.getElementById(id).value.trim();
    const body = { partner: value('w19-p-name'), service: value('w19-p-service'), description: value('w19-p-desc'), status: value('w19-p-status'), next: value('w19-p-next'), contact: value('w19-p-contact') };
    if (!body.partner || !body.service || !body.description || !body.contact) { msg.textContent = t('Nom, service, description et contact sont obligatoires.'); return; }
    try {
        const response = await fetch('/api/partners', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!response.ok) { msg.textContent = response.status === 429 ? t('Trop de propositions, réessayez dans quelques minutes.') : t('Proposition refusée.'); return; }
        const data = await response.json();
        form.reset();
        msg.textContent = t('Proposition {id} envoyée : elle sera visible après validation par un agent.', { id: data.id });
        announce(msg.textContent);
    } catch (err) { msg.textContent = t('Envoi impossible pour le moment.'); }
}

// Panneau agent : valider les propositions, changer la disponibilité
async function w19LoadAgentPartners() {
    const box = document.getElementById('w19-partners-body');
    if (!box) return;
    if (!w15Unlocked()) { box.innerHTML = w19Locked('fa-lock'); return; }
    const result = await w15Api('/api/agent/partners');
    if (!result.ok) { box.innerHTML = `<p class="tn-form-error">${W19T('Partenaires indisponibles.')}</p>`; return; }
    const all = result.data.partners || [];
    const pending = all.filter(item => !item.approved);
    const approved = all.filter(item => item.approved);
    box.innerHTML = `
        <h5 class="tn-w12-sub">${W19T('Propositions à valider')} <span data-no-i18n>(${pending.length})</span></h5>
        ${pending.length ? `<ul class="w19-agent-list">${pending.map(item => `<li><strong data-no-i18n>${escapeHtml(item.partner)}</strong> — <span data-no-i18n>${escapeHtml(item.service)}</span><br><span class="tn-hint" data-no-i18n>${escapeHtml(item.description)} · ${escapeHtml(item.contact)}</span>
            <div class="w19-actions"><button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="partner-approve" data-id="${escapeHtml(item.id)}">${W19T('Approuver')}</button> <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="partner-reject" data-id="${escapeHtml(item.id)}">${W19T('Refuser')}</button></div></li>`).join('')}</ul>` : `<p class="tn-hint">${W19T('Aucune proposition en attente.')}</p>`}
        <h5 class="tn-w12-sub">${W19T('Disponibilité des partenaires')}</h5>
        <ul class="w19-agent-list">${approved.map(item => `<li data-partner="${escapeHtml(item.id)}"><strong data-no-i18n>${escapeHtml(item.partner)}</strong>
            <select class="cyber-input" data-w19-status aria-label="${escapeHtml(t('Disponibilité'))}">${Object.keys(W19_STATUS).map(key => `<option value="${key}" ${item.status === key ? 'selected' : ''}>${escapeHtml(t(W19_STATUS[key].label))}</option>`).join('')}</select>
            <input class="cyber-input" data-w19-next maxlength="140" value="${escapeHtml(item.next || '')}" aria-label="${escapeHtml(t('Prochaine action'))}">
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="partner-status" data-id="${escapeHtml(item.id)}">${W19T('Enregistrer')}</button></li>`).join('')}</ul>
        <p id="w19-agent-partners-msg" class="tn-hint" role="status"></p>`;
}

async function w19PartnerAdmin(body, okText) {
    const result = await w15Api('/api/agent/partners', { method: 'POST', body: JSON.stringify(body) });
    await w19LoadAgentPartners();
    const msg = document.getElementById('w19-agent-partners-msg');
    if (msg) msg.textContent = t(result.ok ? okText : 'Opération refusée.');
    if (result.ok) { announce(t(okText)); w19LoadPartners(); }
}

// ------------------------------------------
// F100 — Événements de sécurité détaillés (espace agent)
// ------------------------------------------
const W19_EVENT_LABELS = { login_failed: 'Connexion refusée', login_ok: 'Connexion agent', unauthorized: 'Accès refusé', probe: 'Fichier sensible demandé', bot: 'Robot bloqué', duplicate: 'Envoi en double', rate_limited: 'Débit excessif', records_read: 'Dossiers consultés', partner_proposal: 'Proposition de partenaire' };
function w19EventLabel(type) { return t(W19_EVENT_LABELS[type] || type); }

async function w19LoadEvents() {
    const box = document.getElementById('w19-events-body');
    if (!box) return;
    if (!w15Unlocked()) { w19.events = null; box.innerHTML = w19Locked('fa-lock'); return; }
    const result = await w15Api('/api/agent/events?limit=60' + (w19.eventFilter ? '&type=' + encodeURIComponent(w19.eventFilter) : ''));
    if (!result.ok) { box.innerHTML = `<p class="tn-form-error">${W19T('Journal indisponible.')}</p>`; return; }
    w19.events = result.data;
    w19RenderEvents();
}

function w19RenderEvents() {
    const box = document.getElementById('w19-events-body');
    const d = w19.events;
    if (!box || !d) return;
    const types = Array.from(new Set(Object.keys(W19_EVENT_LABELS).concat(Object.keys(d.totals || {}))));
    const totals = Object.entries(d.totals || {}).sort((a, b) => b[1] - a[1]);
    box.innerHTML = `
        <div class="w19-toolbar">
            <label class="tn-field-label" for="w19-ev-type">${W19T("Type d'événement")}</label>
            <select id="w19-ev-type" class="cyber-input" data-w19-filter>${`<option value="">${escapeHtml(t('Tous'))}</option>` + types.map(type => `<option value="${escapeHtml(type)}" ${w19.eventFilter === type ? 'selected' : ''}>${escapeHtml(w19EventLabel(type))}</option>`).join('')}</select>
            <label class="w13-need-opt"><input type="checkbox" id="w19-ev-auto" data-w19-auto ${w19.eventAuto ? 'checked' : ''}> <span>${W19T('Actualisation automatique (15 s)')}</span></label>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="events-refresh">${W19T('Actualiser')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w19="events-csv">${W19T('Copier en CSV')}</button>
        </div>
        ${d.alerts && d.alerts.length ? `<ul class="w19-alerts">${d.alerts.map(alert => `<li class="w19-alert w19-alert--${escapeHtml(alert.severity)}"><strong data-no-i18n>${escapeHtml(alert.title)}</strong><br><span class="tn-hint" data-no-i18n>${escapeHtml(alert.detail)}</span></li>`).join('')}</ul>` : `<p class="tn-hint">${W19T('Aucune alerte de sécurité en cours.')}</p>`}
        <p class="tn-hint" data-no-i18n>${escapeHtml(t('Dernières 24 h'))} : ${totals.length ? totals.map(([type, n]) => `${escapeHtml(w19EventLabel(type))} ${n}`).join(' · ') : escapeHtml(t('aucun événement'))}</p>
        ${d.events.length ? `<div class="w19-table-wrap"><table class="w19-table"><caption class="sr-only">${W19T('Derniers événements de sécurité')}</caption>
            <thead><tr><th scope="col">${W19T('Heure')}</th><th scope="col">${W19T('Type')}</th><th scope="col">${W19T('Source')}</th><th scope="col">${W19T('Détail')}</th></tr></thead>
            <tbody data-no-i18n>${d.events.map(event => `<tr><td>${escapeHtml(w19Stamp(event.at))}</td><td>${escapeHtml(w19EventLabel(event.type))}</td><td>${escapeHtml(event.ip || '')}</td><td>${escapeHtml(event.detail || '')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="tn-hint">${W19T('Aucun événement pour ce filtre.')}</p>`}
        <p class="tn-hint" data-no-i18n>${escapeHtml(t('Mis à jour'))} ${escapeHtml(w19Stamp(d.generatedAt))} · ${W19T('Les sources sont des identifiants abrégés, pas des adresses IP complètes.')}</p>`;
}

async function w19CopyEvents() {
    const d = w19.events;
    if (!d) return;
    const csv = w19Csv([['Heure', 'Type', 'Source', 'Détail']].concat(d.events.map(event => [event.at, w19EventLabel(event.type), event.ip, event.detail])));
    try { await navigator.clipboard.writeText(csv); announce(t('Journal copié en CSV.')); } catch (err) { w19Download('evenements-securite.csv', csv); announce(t('Copie impossible : le fichier CSV a été téléchargé.')); }
}

function w19ScheduleEvents() {
    clearTimeout(w19.eventTimer);
    w19.eventTimer = setTimeout(() => {
        if (document.getElementById('w19-events') && w19.eventAuto && w15Unlocked() && !document.hidden) w19LoadEvents();
        w19ScheduleEvents();
    }, 15000);
}

// ------------------------------------------
// Panneaux agent
// ------------------------------------------
function w19RenderAgentPanels() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w19-events')) return;
    const events = document.createElement('section');
    events.id = 'w19-events';
    events.className = 'w15-panel';
    events.setAttribute('aria-labelledby', 'w19-events-title');
    events.innerHTML = `<h3 id="w19-events-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-list-check"></i> ${W19T('Événements de sécurité')}</h3>
        <p class="tn-hint">${W19T("Ce qui s'est passé sur la plateforme, du plus récent au plus ancien : connexions, accès refusés, robots, débit anormal.")}</p><div id="w19-events-body"></div>`;
    workspace.prepend(events);

    const usage = document.createElement('section');
    usage.id = 'w19-usage';
    usage.className = 'w15-panel';
    usage.setAttribute('aria-labelledby', 'w19-usage-title');
    usage.innerHTML = `<h3 id="w19-usage-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-chart-column"></i> ${W19T('Usage des services')}</h3>
        <p class="tn-hint">${W19T('Les services les plus et les moins demandés, et leur évolution, pour orienter les efforts de la mairie.')}</p><div id="w19-usage-body"></div>`;
    const partners = document.createElement('section');
    partners.id = 'w19-partners';
    partners.className = 'w15-panel';
    partners.setAttribute('aria-labelledby', 'w19-partners-title');
    partners.innerHTML = `<h3 id="w19-partners-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-handshake"></i> ${W19T('Partenaires')}</h3>
        <p class="tn-hint">${W19T('Valider les propositions et tenir à jour la disponibilité des services partenaires.')}</p><div id="w19-partners-body"></div>`;
    const anchor = document.getElementById('w16-ops');
    if (anchor) { anchor.after(usage); usage.after(partners); } else { workspace.append(usage, partners); }
    w19RefreshAgent();
}

function w19RefreshAgent() { w19LoadEvents(); w19LoadUsage(); w19LoadAgentPartners(); }

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w19]');
    if (!el) return;
    switch (el.dataset.w19) {
        case 'transport-clear': w19Transport('clear'); break;
        case 'usage-days': w19LoadUsage(Number(el.dataset.days)); break;
        case 'usage-demo': w19.usageDemo = !w19.usageDemo; w19LoadUsage(); break;
        case 'usage-csv': w19UsageCsv(); break;
        case 'notrack': { const on = w19Tracking(); w19Save('tn_w19_notrack', on); el.textContent = t(on ? 'Participer à nouveau' : 'Ne pas participer'); announce(t(on ? "Mesure d'usage désactivée sur cet appareil." : "Mesure d'usage réactivée.")); break; }
        case 'partner-act': {
            const item = w19.partners.find(entry => entry.id === el.dataset.id);
            if (!item) break;
            const status = W19_STATUS[item.status] || W19_STATUS.available;
            const actions = w19Actions().filter(entry => entry.id !== item.id);
            actions.push({ id: item.id, kind: status.kind, label: status.done, at: new Date().toISOString() });
            w19Save('tn_w19_actions', actions);
            announce(t(status.done) + ' : ' + item.partner + '.');
            w19RenderPartners();
            break;
        }
        case 'partner-undo': w19Save('tn_w19_actions', w19Actions().filter(entry => entry.id !== el.dataset.id)); w19RenderPartners(); break;
        case 'partner-approve': w19PartnerAdmin({ id: el.dataset.id, action: 'approve' }, 'Partenaire approuvé.'); break;
        case 'partner-reject': w19PartnerAdmin({ id: el.dataset.id, action: 'reject' }, 'Proposition refusée.'); break;
        case 'partner-status': {
            const row = el.closest('[data-partner]');
            w19PartnerAdmin({ id: el.dataset.id, action: 'status', status: row.querySelector('[data-w19-status]').value, next: row.querySelector('[data-w19-next]').value }, 'Disponibilité mise à jour.');
            break;
        }
        case 'events-refresh': w19LoadEvents(); break;
        case 'events-csv': w19CopyEvents(); break;
    }
});

document.addEventListener('change', event => {
    if (event.target.matches('[data-w19-filter]')) { w19.eventFilter = event.target.value; w19LoadEvents(); }
    if (event.target.matches('[data-w19-auto]')) w19.eventAuto = event.target.checked;
});

document.addEventListener('submit', event => {
    const form = event.target.closest('[data-w19-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.w19Form === 'transport') w19Transport('set');
    if (form.dataset.w19Form === 'partner') w19Propose(form);
});

document.addEventListener('DOMContentLoaded', () => {
    w19InitTransport();
    w19InitUsage();
    w19InitPartners();
    w19RenderAgentPanels();
    w19ScheduleEvents();
    document.addEventListener('tn:agent-session', w19RefreshAgent);
    document.addEventListener('tn:langchange', () => {
        ['w19-events', 'w19-usage', 'w19-partners'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
        w19RenderAgentPanels();
        w19RenderReplace();
    });
});
