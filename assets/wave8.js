// ==========================================
// VAGUE 8 — F49 être prévenu quand une demande change d'état, F50 tableau de bord des agents,
// F51 mes données et mes inquiétudes, F52 soutenir une demande déjà déposée.
// Chargé après assets/wave7.js ; réutilise t(), announce, escapeHtml, w4OpenDialog, goToSection,
// tnMyTickets, tnTicketHistory, tnNotificationItems, w6Notify, tnAuditRecord.
// ==========================================

function w8Esc(value) { return escapeHtml(String(value === undefined || value === null ? '' : value)); }
function w8Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w8Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }

const W8_STORE = {
    seen: 'tn_w8_seen', concerns: 'tn_concerns', supports: 'tn_supports', visitor: 'tn_w8_visitor'
};
const W8_PRIORITY_SUPPORTS = 5;

function w8Id(prefix) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `${prefix}-${out}`;
}

function w8Stamp(date = new Date()) { return typeof tnLocalStamp === 'function' ? tnLocalStamp(date) : date.toISOString(); }
function w8Fmt(stamp) { return typeof tnFormatStamp === 'function' ? tnFormatStamp(stamp) : String(stamp || ''); }
function w8StaffName() { return typeof w7StaffName === 'function' ? w7StaffName() : ''; }
function w8IsStaff() { return currentRole === 'agent' || currentRole === 'admin'; }

// ==========================================================
// Mots simples : ce que chaque état veut dire et ce que l'habitant doit faire (F49)
// ==========================================================
const W8_STATE = {
    'En attente': {
        meaning: "Votre demande est bien reçue. Elle attend qu'un agent la prenne en charge.",
        todo: "Rien à faire pour l'instant. Gardez votre numéro de suivi."
    },
    'En cours': {
        meaning: 'Un agent municipal traite votre demande.',
        todo: "Restez joignable. Si l'agent vous écrit, répondez-lui."
    },
    'Résolu': {
        meaning: 'Votre demande est traitée et clôturée.',
        todo: "Vérifiez que cela vous convient. Sinon, déposez une nouvelle demande en citant ce numéro."
    },
    'Rouverte': {
        meaning: 'Un agent a rouvert votre demande : elle est de nouveau en attente de traitement.',
        todo: "Rien à faire pour l'instant. Lisez le message de l'agent s'il y en a un."
    }
};

const W8_CONCERN_STATE = {
    'Reçue': {
        meaning: 'Votre inquiétude est bien enregistrée. Un agent va la lire.',
        todo: 'Rien à faire. Vous serez prévenu(e) ici dès qu\'elle est lue.'
    },
    'Lue': {
        meaning: 'Un agent a lu votre inquiétude. La réponse est en préparation.',
        todo: 'Rien à faire pour le moment.'
    },
    'Prise en compte': {
        meaning: 'Votre inquiétude a été prise en compte. La réponse est ci-dessous.',
        todo: 'Lisez la réponse. Si elle ne vous convient pas, envoyez une nouvelle inquiétude.'
    }
};

function w8TicketState(ticket) {
    const history = tnTicketHistory(ticket);
    const reopened = ticket.status === 'En attente' && history.length > 1;
    return W8_STATE[reopened ? 'Rouverte' : ticket.status] || W8_STATE['En attente'];
}

// ==========================================================
// Suivi des changements : demandes, inquiétudes, demandes soutenues
// ==========================================================
function w8Key() { return activeCitizen ? activeCitizen.matricule : ''; }

function w8Concerns() { return w8Load(W8_STORE.concerns, []); }
function w8Supports() { return w8Load(W8_STORE.supports, {}); }

function w8OwnerKey() {
    if (activeCitizen) return activeCitizen.matricule;
    const visitor = w8Load(W8_STORE.visitor, '');
    return visitor ? `v:${visitor}` : '';
}

function w8SeenMap() { const all = w8Load(W8_STORE.seen, {}); return all[w8Key()] || {}; }
function w8SaveSeen(map) { const all = w8Load(W8_STORE.seen, {}); all[w8Key()] = map; w8Save(W8_STORE.seen, all); }

// Tous les éléments que l'habitant suit, avec leur version (nombre d'étapes) et ce qu'il doit comprendre
function w8Followed() {
    if (!activeCitizen) return [];
    const items = [];
    tnMyTickets().forEach(ticket => {
        const history = tnTicketHistory(ticket);
        const last = history[history.length - 1] || {};
        const info = w8TicketState(ticket);
        items.push({
            key: `t:${ticket.id}`, kind: 'ticket', id: ticket.id, title: tnTicketTitle(ticket), status: ticket.status,
            version: history.length, baseline: last.date ? 1 : history.length,
            meaning: info.meaning, todo: info.todo, note: last.note || '', by: last.by || '', date: last.date,
            open: `goToMyTicket('${w8Esc(ticket.id)}')`
        });
    });
    const mine = activeCitizen.matricule;
    w8Concerns().filter(concern => concern.owner === mine).forEach(concern => {
        const last = concern.history[concern.history.length - 1] || {};
        const info = W8_CONCERN_STATE[concern.status] || W8_CONCERN_STATE['Reçue'];
        items.push({
            key: `c:${concern.id}`, kind: 'concern', id: concern.id, title: t(concern.topic), status: concern.status,
            version: concern.history.length, baseline: 1,
            meaning: info.meaning, todo: info.todo, note: concern.response || '', by: concern.answeredBy || '', date: last.date,
            open: `w8GoTo('w8-concerns')`
        });
    });
    const supports = w8Supports();
    Object.keys(supports).forEach(requestId => {
        const mineSupport = (supports[requestId] || []).find(entry => entry.key === mine);
        if (!mineSupport) return;
        const ticket = citizenTickets.find(entry => entry.id === requestId);
        if (!ticket || tnMyTickets().includes(ticket)) return;
        const history = tnTicketHistory(ticket);
        const last = history[history.length - 1] || {};
        const info = w8TicketState(ticket);
        items.push({
            key: `s:${ticket.id}`, kind: 'support', id: ticket.id, title: tnTicketTitle(ticket), status: ticket.status,
            version: history.length, baseline: mineSupport.version || history.length,
            meaning: info.meaning, todo: '', note: last.note || '', by: last.by || '', date: last.date,
            open: `w8GoTo('w8-support')`
        });
    });
    return items;
}

// Éléments dont l'état a changé depuis que l'habitant les a vus
function w8Unseen() {
    const seen = w8SeenMap();
    return w8Followed().filter(item => (seen[item.key] === undefined ? item.baseline : seen[item.key]) < item.version);
}

function w8MarkSeen(keys) {
    const seen = w8SeenMap();
    const followed = w8Followed();
    followed.forEach(item => { if (!keys || keys.includes(item.key)) seen[item.key] = item.version; });
    w8SaveSeen(seen);
    w8Refresh(false);
}

function w8KindLabel(item) {
    return item.kind === 'concern' ? t('Inquiétude') : item.kind === 'support' ? t('Demande que vous soutenez') : t('Demande');
}

function w8ItemHtml(item) {
    const klass = typeof TN_STATUS_CLASS !== 'undefined' && TN_STATUS_CLASS[item.status] ? TN_STATUS_CLASS[item.status] : (item.status === 'Prise en compte' ? 'resolved' : 'progress');
    return `
        <li class="tn-w8-change" data-w8-key="${w8Esc(item.key)}">
            <p class="tn-w8-change-head">
                <span class="tn-w8-kind" data-no-i18n>${w8Esc(w8KindLabel(item))}</span>
                <strong data-no-i18n>${w8Esc(item.id)}</strong>
                <span class="tn-badge tn-badge--${klass}" data-no-i18n>${w8Esc(t(item.status))}</span>
            </p>
            <p class="tn-w8-change-title" data-no-i18n>${w8Esc(item.title)}</p>
            <p class="tn-w8-line" data-no-i18n><b>${w8Esc(t('Ce que cela veut dire :'))}</b> ${w8Esc(t(item.meaning))}</p>
            ${item.todo ? `<p class="tn-w8-line" data-no-i18n><b>${w8Esc(t('Ce que vous devez faire :'))}</b> ${w8Esc(t(item.todo))}</p>` : ''}
            ${item.note ? `<p class="tn-w8-line tn-w8-note" data-no-i18n><b>${w8Esc(t("Message de l'agent :"))}</b> ${w8Esc(item.note)}${item.by ? ` <span class="tn-hint">— ${w8Esc(item.by)}</span>` : ''}</p>` : ''}
            <div class="tn-row-actions">
                <button type="button" class="tn-tab" data-w8-open="${w8Esc(item.key)}">${w8Esc(t('Voir'))}</button>
                <button type="button" class="tn-tab" data-w8-seen="${w8Esc(item.key)}">${w8Esc(t("J'ai compris"))}</button>
            </div>
        </li>`;
}

let w8Toasted = new Set();
let w8LastUnseen = '';

function w8RenderChanges() {
    const unseen = w8IsStaff() ? [] : w8Unseen();

    // Bandeau visible dans toutes les sections
    let strip = document.getElementById('w8-strip');
    if (!strip) {
        const bar = document.getElementById('tn-locbar');
        if (bar) {
            strip = document.createElement('div');
            strip.id = 'w8-strip';
            strip.className = 'tn-w8-strip';
            strip.setAttribute('role', 'status');
            bar.after(strip);
        }
    }
    if (strip) {
        strip.hidden = !unseen.length;
        strip.innerHTML = unseen.length ? `
            <p data-no-i18n><i aria-hidden="true" class="fa-solid fa-bell"></i> ${w8Esc(t('{n} de vos suivis ont changé : {first}', { n: unseen.length, first: `${unseen[0].id} → ${t(unseen[0].status)}` }))}</p>
            <div class="tn-row-actions">
                <button type="button" class="tn-tab" data-w8-strip-open>${w8Esc(t('Voir ce qui a changé'))}</button>
                <button type="button" class="tn-tab" data-w8-strip-seen>${w8Esc(t("J'ai compris"))}</button>
            </div>` : '';
    }

    // Encart détaillé dans l'espace citoyen
    const tracker = document.getElementById('citizen-tracker');
    if (tracker) {
        let box = document.getElementById('w8-changes');
        if (!box) {
            box = document.createElement('div');
            box.id = 'w8-changes';
            box.className = 'tn-w8-changes';
            tracker.before(box);
        }
        box.hidden = !unseen.length;
        box.innerHTML = unseen.length ? `
            <div class="tn-eyebrow">${w8Esc(t('Du nouveau dans vos démarches'))}</div>
            <ul class="tn-w8-change-list">${unseen.map(w8ItemHtml).join('')}</ul>
            ${unseen.length > 1 ? `<button type="button" class="tn-tab" data-w8-strip-seen>${w8Esc(t('Tout marquer comme compris'))}</button>` : ''}` : '';
    }

    // Un message à l'écran au bon moment, une seule fois par changement
    const fresh = unseen.filter(item => !w8Toasted.has(`${item.key}:${item.version}`));
    fresh.forEach(item => w8Toasted.add(`${item.key}:${item.version}`));
    const signature = unseen.map(item => `${item.key}:${item.version}`).join(',');
    if (fresh.length && typeof w6Notify === 'function' && activeCitizen) {
        const lines = fresh.slice(0, 3).map(item => `${item.id} : ${t(item.status)}${item.todo ? ' — ' + t(item.todo) : ''}`);
        if (fresh.length > 3) lines.push(t('… et {n} autre(s) changement(s).', { n: fresh.length - 3 }));
        w6Notify(lines.join('\n'));
        // Notification du navigateur si l'habitant l'a activée dans la cloche
        try {
            if ('Notification' in window && Notification.permission === 'granted' && tnLoad('tn_notify_enabled', false) && document.hidden) {
                new Notification(t('Terra Nova : votre démarche a changé'), { body: lines.join('\n') });
            }
        } catch (err) { }
    }
    w8LastUnseen = signature;
}

// Explications et messages d'agent dans la fiche de chaque demande
function w8DecorateTracker() {
    const list = document.getElementById('tracker-list');
    if (!list) return;
    const supports = w8Supports();
    const seen = w8SeenMap();
    list.querySelectorAll('.tn-w8-state, .tn-w8-inline').forEach(node => node.remove());
    list.querySelectorAll('.tn-ticket').forEach(card => {
        const id = card.id.replace(/^ticket-/, '');
        const ticket = citizenTickets.find(entry => entry.id === id);
        if (!ticket) return;
        const history = tnTicketHistory(ticket);
        const info = w8TicketState(ticket);
        const last = history[history.length - 1] || {};
        const isNew = (seen[`t:${id}`] === undefined ? (last.date ? 1 : history.length) : seen[`t:${id}`]) < history.length;
        const count = (supports[id] || []).length;
        const block = document.createElement('div');
        block.className = 'tn-w8-state';
        block.setAttribute('data-no-i18n', '');
        block.innerHTML = `
            ${isNew ? `<span class="tn-badge tn-badge--pending">${w8Esc(t('Nouveau'))}</span>` : ''}
            <p class="tn-w8-line"><b>${w8Esc(t('Ce que cela veut dire :'))}</b> ${w8Esc(t(info.meaning))}</p>
            <p class="tn-w8-line"><b>${w8Esc(t('Ce que vous devez faire :'))}</b> ${w8Esc(t(info.todo))}</p>
            ${last.note ? `<p class="tn-w8-line tn-w8-note"><b>${w8Esc(t("Message de l'agent :"))}</b> ${w8Esc(last.note)}${last.by ? ` <span class="tn-hint">— ${w8Esc(last.by)}</span>` : ''}</p>` : ''}
            ${ticket.public ? `<p class="tn-hint">${w8Esc(count ? t('{n} habitant(s) soutiennent votre demande.', { n: count }) : t('Votre demande peut être soutenue par les autres habitants. Aucun soutien pour le moment.'))}</p>` : ''}`;
        const steps = card.querySelector('.tn-steps');
        if (steps) steps.after(block); else card.appendChild(block);
        card.querySelectorAll('.tn-timeline li').forEach((item, index) => {
            const entry = history[index];
            if (entry && entry.note && !item.querySelector('.tn-w8-inline')) {
                const span = document.createElement('span');
                span.className = 'tn-w8-inline';
                span.setAttribute('data-no-i18n', '');
                span.textContent = `« ${entry.note} »${entry.by ? ' — ' + entry.by : ''}`;
                item.appendChild(span);
            }
        });
    });
}

// Message libre de l'agent, joint au prochain changement d'état
function w8InitAgentNote() {
    const body = document.getElementById('agent-tickets-tbody');
    if (!body || document.getElementById('w8-note-box')) return;
    const wrapper = body.closest('.overflow-x-auto') || body.closest('table');
    if (!wrapper) return;
    const box = document.createElement('div');
    box.id = 'w8-note-box';
    box.className = 'tn-w8-note-box';
    box.innerHTML = `
        <label class="tn-field-label" for="w8-agent-note">Message pour l'habitant (facultatif)</label>
        <input id="w8-agent-note" class="cyber-input" maxlength="200" autocomplete="off" placeholder="ex : Merci d'apporter un justificatif de domicile.">
        <p class="tn-hint">Ce message est joint au prochain changement d'état que vous faites : l'habitant le voit dans sa notification et dans sa demande.</p>
        <div class="tn-row-actions" role="group" aria-label="Messages rapides">
            <button type="button" class="tn-tab" data-w8-quick="Aucune action de votre part.">Aucune action de votre part</button>
            <button type="button" class="tn-tab" data-w8-quick="Merci d'apporter un justificatif de domicile.">Justificatif demandé</button>
            <button type="button" class="tn-tab" data-w8-quick="Un agent vous rappellera dans la journée.">Rappel dans la journée</button>
            <button type="button" class="tn-tab" data-w8-quick="Le problème est réglé : dites-nous s'il persiste.">Problème réglé</button>
        </div>`;
    wrapper.before(box);
    box.addEventListener('click', event => {
        const button = event.target.closest('[data-w8-quick]');
        if (!button) return;
        const input = document.getElementById('w8-agent-note');
        input.value = button.dataset.w8Quick;
        input.focus();
    });
}

function w8Refresh(decorate = true) {
    try { w8RenderChanges(); } catch (err) { }
    if (decorate) { try { w8DecorateTracker(); } catch (err) { } }
    try { w8RenderDash(); } catch (err) { }
    try { if (typeof w8RenderParticipation === 'function') w8RenderParticipation(); } catch (err) { }
    try { w8BadgeAgentRows(); } catch (err) { }
}

function w8GoTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const section = target.closest('section');
    if (section && typeof goToSection === 'function') goToSection(section.id);
    setTimeout(() => {
        target.scrollIntoView({ block: 'start', behavior: 'smooth' });
        if (typeof tnFlash === 'function') tnFlash(target, 'start');
    }, 150);
}

// ==========================================================
// F50 — Tableau de bord simplifié des agents
// ==========================================================
function w8Dur(ms) {
    if (!isFinite(ms) || ms < 0) return '—';
    const minutes = Math.round(ms / 60000);
    if (minutes < 1) return t('moins d\'une minute');
    if (minutes < 60) return t('{n} min', { n: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return t('{h} h {m} min', { h: hours, m: minutes % 60 });
    return t('{n} j', { n: Math.round(hours / 24) });
}

function w8Date(stamp) { return typeof tnParseStamp === 'function' ? tnParseStamp(stamp) : new Date(stamp); }

function w8SupportCount(ticket) { return (w8Supports()[ticket.id] || []).length; }

function w8Metrics() {
    const now = Date.now();
    const list = citizenTickets;
    const groups = { pending: [], progress: [], resolved: [] };
    list.forEach(ticket => { (groups[ticket.status === 'Résolu' ? 'resolved' : ticket.status === 'En cours' ? 'progress' : 'pending']).push(ticket); });

    const first = [];
    const resolution = [];
    list.forEach(ticket => {
        const history = tnTicketHistory(ticket);
        const start = history[0] && w8Date(history[0].date);
        if (!start || isNaN(start)) return;
        const taken = history.find((entry, index) => index > 0 && entry.status === 'En cours' && entry.date);
        const done = history.slice().reverse().find((entry, index) => entry.status === 'Résolu' && entry.date);
        if (taken) { const d = w8Date(taken.date) - start; if (d >= 0) first.push(d); }
        if (done && ticket.status === 'Résolu') { const d = w8Date(done.date) - start; if (d >= 0) resolution.push(d); }
    });
    const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;

    const days = [];
    for (let i = 6; i >= 0; i--) {
        const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() - i);
        days.push({ day, label: day.toLocaleDateString(typeof tnLocale === 'function' ? tnLocale() : 'fr-FR', { weekday: 'short', day: 'numeric' }), received: 0, changes: 0 });
    }
    list.forEach(ticket => {
        tnTicketHistory(ticket).forEach((entry, index) => {
            const date = entry.date && w8Date(entry.date);
            if (!date || isNaN(date)) return;
            const slot = days.find(d => date >= d.day && date < new Date(d.day.getTime() + 86400000));
            if (slot) { if (index === 0) slot.received++; else slot.changes++; }
        });
    });

    const byService = {};
    groups.pending.concat(groups.progress).forEach(ticket => { byService[ticket.service] = (byService[ticket.service] || 0) + 1; });

    const waiting = groups.pending.map(ticket => {
        const date = w8Date(tnTicketHistory(ticket).slice(-1)[0].date || ticket.date);
        const age = isNaN(date) ? 0 : now - date;
        const supports = w8SupportCount(ticket);
        const urgent = ticket.priority === 'Critique' ? 2 : ticket.priority === 'Élevé' ? 1 : 0;
        return { ticket, age, supports, urgent, score: urgent * 1e12 + (supports >= W8_PRIORITY_SUPPORTS ? 5e11 : 0) + age };
    }).sort((a, b) => b.score - a.score);

    return { groups, firstResponse: avg(first), resolution: avg(resolution), days, byService, waiting };
}

function w8Attention(metrics) {
    const items = [];
    const old = metrics.waiting.filter(entry => entry.age > 24 * 3600000).length;
    if (old) items.push({ icon: 'fa-hourglass-half', text: t('{n} demande(s) attendent depuis plus de 24 h.', { n: old }), goto: 'agent-tickets-tbody' });
    const supported = metrics.waiting.filter(entry => entry.supports >= W8_PRIORITY_SUPPORTS).length;
    if (supported) items.push({ icon: 'fa-people-group', text: t('{n} demande(s) soutenue(s) par {s} habitants ou plus attendent un agent.', { n: supported, s: W8_PRIORITY_SUPPORTS }), goto: 'agent-tickets-tbody' });
    const concerns = w8Concerns().filter(concern => concern.status === 'Reçue').length;
    if (concerns) items.push({ icon: 'fa-shield-halved', text: t('{n} inquiétude(s) sur les données à lire.', { n: concerns }), goto: 'concerns-admin' });
    let down = 0;
    try { down = typeof w5StatusMap === 'function' ? Object.keys(w5StatusMap()).length : 0; } catch (err) { }
    if (down) items.push({ icon: 'fa-plug-circle-exclamation', text: t('{n} service(s) interrompu(s) ou en maintenance.', { n: down }), goto: 'service-status-admin' });
    const suspended = (typeof registeredCitizens !== 'undefined' ? registeredCitizens : []).filter(account => account.suspended).length;
    if (suspended) items.push({ icon: 'fa-user-lock', text: t('{n} compte(s) suspendu(s).', { n: suspended }), goto: 'account-admin' });
    return items;
}

function w8RenderDash() {
    const panel = document.getElementById('agent-dashboard');
    if (!panel) return;
    const m = w8Metrics();
    const total = citizenTickets.length;
    const open = m.groups.pending.length + m.groups.progress.length;
    const maxService = Math.max(1, ...Object.values(m.byService));
    const maxDay = Math.max(1, ...m.days.map(d => d.received + d.changes));
    const attention = w8Attention(m);

    panel.querySelector('#dash-summary').textContent = open
        ? t("En ce moment : {a} demande(s) à prendre en charge, {b} en cours de traitement, {c} résolue(s).", { a: m.groups.pending.length, b: m.groups.progress.length, c: m.groups.resolved.length })
        : t('En ce moment : aucune demande ouverte. Tout est traité.');

    panel.querySelector('#dash-kpis').innerHTML = [
        { label: 'À prendre en charge', value: m.groups.pending.length, note: 'Demandes qui attendent un agent', tone: 'pending' },
        { label: 'En cours', value: m.groups.progress.length, note: 'Demandes en cours de traitement', tone: 'progress' },
        { label: 'Résolues', value: m.groups.resolved.length, note: `Sur ${total} demande(s) au total`, tone: 'resolved', params: { n: total } },
        { label: 'Délai de prise en charge', value: w8Dur(m.firstResponse), note: isFinite(m.firstResponse) ? `Délai de résolution moyen : ${w8Dur(m.resolution)}` : 'Pas encore assez de données', tone: 'neutral', text: true }
    ].map(kpi => `
        <div class="tn-w8-kpi tn-w8-kpi--${kpi.tone}">
            <div class="tn-kpi-label">${w8Esc(t(kpi.label))}</div>
            <div class="tn-w8-kpi-value" data-no-i18n>${w8Esc(kpi.value)}</div>
            <div class="tn-kpi-note" data-no-i18n>${w8Esc(kpi.params ? t('Sur {n} demande(s) au total', kpi.params) : kpi.text ? (isFinite(m.firstResponse) ? t('Délai de résolution moyen : {d}', { d: w8Dur(m.resolution) }) : t('Pas encore assez de données')) : t(kpi.note))}</div>
        </div>`).join('');

    const first = m.waiting.slice(0, 5);
    panel.querySelector('#dash-first').innerHTML = first.length ? first.map(entry => `
        <li>
            <button type="button" class="tn-w8-first" data-w8-agent-ticket="${w8Esc(entry.ticket.id)}">
                <span class="tn-w8-first-id" data-no-i18n>${w8Esc(entry.ticket.id)}</span>
                <span class="tn-w8-first-title" data-no-i18n>${w8Esc(tnTicketTitle(entry.ticket))}</span>
                <span class="tn-w8-first-meta" data-no-i18n>${w8Esc(t(entry.ticket.service))} · ${w8Esc(t('attend depuis {d}', { d: w8Dur(entry.age) }))}${entry.urgent ? ' · ' + w8Esc(entry.ticket.priority) : ''}${entry.supports ? ' · ' + w8Esc(t('{n} soutien(s)', { n: entry.supports })) : ''}</span>
            </button>
        </li>`).join('') : `<li class="tn-empty">${w8Esc(t('Aucune demande en attente.'))}</li>`;

    const services = Object.keys(m.byService).sort((a, b) => m.byService[b] - m.byService[a]);
    panel.querySelector('#dash-services').innerHTML = services.length ? services.map(name => `
        <div class="tn-w8-bar"><span class="tn-w8-bar-label" data-no-i18n>${w8Esc(t(name))}</span>
        <span class="tn-w8-bar-track" aria-hidden="true"><span class="tn-w8-bar-fill" style="width:${Math.round(m.byService[name] / maxService * 100)}%"></span></span>
        <span class="tn-w8-bar-value" data-no-i18n>${m.byService[name]}</span></div>`).join('') : `<p class="tn-empty">${w8Esc(t('Aucune demande ouverte.'))}</p>`;

    panel.querySelector('#dash-days').innerHTML = m.days.map(d => `
        <div class="tn-w8-bar"><span class="tn-w8-bar-label" data-no-i18n>${w8Esc(d.label)}</span>
        <span class="tn-w8-bar-track" aria-hidden="true"><span class="tn-w8-bar-fill" style="width:${Math.round((d.received + d.changes) / maxDay * 100)}%"></span></span>
        <span class="tn-w8-bar-value" data-no-i18n>${w8Esc(t('{a} reçue(s), {b} étape(s)', { a: d.received, b: d.changes }))}</span></div>`).join('');

    panel.querySelector('#dash-attention').innerHTML = attention.length
        ? attention.map(item => `<li><i aria-hidden="true" class="fa-solid ${item.icon}"></i><span data-no-i18n>${w8Esc(item.text)}</span> <button type="button" class="tn-link" data-w8-goto="${item.goto}">${w8Esc(t('Ouvrir'))}</button></li>`).join('')
        : `<li class="tn-w8-ok"><i aria-hidden="true" class="fa-solid fa-circle-check"></i><span>${w8Esc(t("Rien d'urgent : tout est à jour."))}</span></li>`;

    panel.querySelector('#dash-updated').textContent = t('Mis à jour à {time}', { time: new Date().toLocaleTimeString(typeof tnLocale === 'function' ? tnLocale() : 'fr-FR', { hour: '2-digit', minute: '2-digit' }) });
}

function initAgentDashboard() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('agent-dashboard')) return;
    const panel = document.createElement('div');
    panel.id = 'agent-dashboard';
    panel.className = 'holo-card p-6 relative';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'agent-dashboard-title');
    panel.dataset.crumb = 'Tableau de bord';
    panel.innerHTML = `
        <div class="tn-w8-dash-head">
            <div>
                <div class="tn-eyebrow">Vue d'ensemble</div>
                <h3 id="agent-dashboard-title" class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">TABLEAU DE BORD</h3>
            </div>
            <div class="tn-row-actions">
                <span id="dash-updated" class="tn-hint" data-no-i18n></span>
                <button type="button" class="tn-tab" id="dash-refresh"><i aria-hidden="true" class="fa-solid fa-arrows-rotate"></i> Actualiser</button>
            </div>
        </div>
        <p id="dash-summary" class="tn-w8-summary" role="status" data-no-i18n></p>
        <div id="dash-kpis" class="tn-w8-kpis"></div>
        <div class="tn-w8-dash-grid">
            <section aria-labelledby="dash-first-title">
                <h4 id="dash-first-title" class="tn-w8-sub">À traiter en premier</h4>
                <p class="tn-hint">Classées par urgence, puis par soutien des habitants (à partir de 5 soutiens), puis par temps d'attente.</p>
                <ol id="dash-first" class="tn-w8-first-list"></ol>
            </section>
            <section aria-labelledby="dash-attention-title">
                <h4 id="dash-attention-title" class="tn-w8-sub">Points d'attention</h4>
                <ul id="dash-attention" class="tn-w8-attention"></ul>
            </section>
            <section aria-labelledby="dash-services-title">
                <h4 id="dash-services-title" class="tn-w8-sub">Demandes ouvertes par service</h4>
                <div id="dash-services" class="tn-w8-bars"></div>
            </section>
            <section aria-labelledby="dash-days-title">
                <h4 id="dash-days-title" class="tn-w8-sub">Activité des 7 derniers jours</h4>
                <div id="dash-days" class="tn-w8-bars"></div>
            </section>
        </div>`;
    // Premier élément après l'en-tête de l'espace de travail : c'est ce que l'agent voit en arrivant
    const header = workspace.children[0];
    if (header) header.after(panel); else workspace.prepend(panel);

    panel.addEventListener('click', event => {
        const ticketButton = event.target.closest('[data-w8-agent-ticket]');
        if (ticketButton) { if (typeof goToAgentTicket === 'function') goToAgentTicket(ticketButton.dataset.w8AgentTicket); return; }
        const go = event.target.closest('[data-w8-goto]');
        if (go) { const el = document.getElementById(go.dataset.w8Goto); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (typeof tnFlash === 'function') tnFlash(el, 'start'); } return; }
        if (event.target.closest('#dash-refresh')) { w8RenderDash(); announce(t('Tableau de bord actualisé.')); }
    });
}

// Pastille « soutiens » dans le tableau des demandes
function w8BadgeAgentRows() {
    const body = document.getElementById('agent-tickets-tbody');
    if (!body) return;
    const supports = w8Supports();
    body.querySelectorAll('tr[data-ticket]').forEach(row => {
        const id = row.dataset.ticket;
        const count = (supports[id] || []).length;
        const cell = row.querySelector('td');
        const old = cell && cell.querySelector('.tn-w8-support-badge');
        if (old) old.remove();
        if (cell && count) {
            const badge = document.createElement('div');
            badge.className = 'tn-w8-support-badge';
            badge.setAttribute('data-no-i18n', '');
            badge.textContent = `${t('{n} soutien(s)', { n: count })}${count >= W8_PRIORITY_SUPPORTS ? ' · ' + t('très soutenue') : ''}`;
            cell.appendChild(badge);
        }
    });
}

// ==========================================================
// F51 / F52 — Participation : mes données, mes inquiétudes, soutenir une demande
// ==========================================================
const W8_DATA = [
    { icon: 'fa-id-card', name: 'Votre identité', what: 'Votre nom et votre matricule colonial.', why: 'Vous reconnaître et retrouver vos démarches.', who: 'Vous. Les agents municipaux, pour traiter vos demandes.', keep: "Jusqu'à la suppression de votre compte." },
    { icon: 'fa-location-dot', name: 'Votre dôme et votre secteur', what: "Le dôme choisi à l'inscription et le secteur que vous indiquez.", why: 'Vous montrer les alertes et les lieux qui vous concernent.', who: 'Vous. Les agents voient votre dôme, pas votre secteur.', keep: "Jusqu'à ce que vous les changiez." },
    { icon: 'fa-envelope-open-text', name: 'Vos demandes et vos messages', what: 'Ce que vous écrivez aux services municipaux.', why: 'Traiter votre demande et vous répondre.', who: "Vous. Les agents du service concerné. Si vous autorisez le soutien, les autres habitants voient seulement l'objet, le service, le lieu et l'état : jamais votre nom ni votre message.", keep: "Jusqu'à la suppression de votre compte." },
    { icon: 'fa-calendar-check', name: 'Vos rendez-vous et vos rappels', what: 'Le service, le motif, la date et le rappel choisis.', why: 'Vous recevoir et vous rappeler le rendez-vous.', who: "Vous. Les agents de l'accueil.", keep: "Jusqu'à la suppression de votre compte." },
    { icon: 'fa-sliders', name: 'Vos réglages', what: 'Langue, taille du texte, couleurs, notifications.', why: 'Adapter le site à vos besoins.', who: 'Vous seul : ils restent dans votre navigateur.', keep: "Jusqu'à ce que vous les réinitialisiez." },
    { icon: 'fa-people-group', name: 'Vos inquiétudes et vos soutiens', what: "Les inquiétudes que vous déposez et les demandes que vous soutenez.", why: 'Vous répondre et mesurer ce qui préoccupe les habitants.', who: 'Vous. Les agents lisent vos inquiétudes. Un soutien ne montre jamais votre nom aux autres habitants.', keep: "Jusqu'à la suppression de votre compte." },
    { icon: 'fa-clipboard-list', name: 'Les actions des agents sur votre dossier', what: 'Chaque modification faite par un agent : qui, quand, quoi, avant et après.', why: "Permettre à la ville de justifier ce qui a été fait.", who: 'Les agents et administrateurs.', keep: 'Dans le journal d\'activité (les 500 dernières actions).' }
];

const W8_NOT = [
    "Nous ne vendons pas vos données et n'affichons aucune publicité.",
    'Nous ne demandons pas votre position GPS : vous choisissez vous-même votre secteur.',
    "Pour les conseils d'une alerte, seuls votre secteur, vos situations cochées et la langue sont envoyés au serveur : jamais votre nom ni votre matricule.",
    "Dans cette version, vos informations sont enregistrées dans le navigateur de cet appareil.",
    "Pour s'afficher, le site charge des polices et des icônes depuis des serveurs tiers (Google Fonts, Cloudflare) : ils voient votre adresse IP, comme pour tout site."
];

const W8_TOPICS = [
    'Quelles données sont collectées ?',
    'Qui peut voir mes données ?',
    'Combien de temps sont-elles gardées ?',
    'Je veux corriger ou supprimer des données',
    'Autre inquiétude sur mes données'
];

// Demandes d'exemple déposées par d'autres habitants (pour pouvoir essayer le soutien)
const W8_SEEDS = [
    { id: 'EX-ECL-01', title: "Éclairage défaillant sur la passerelle de l'Anneau 2", service: 'Énergie Plasma & Réacteur Zéro', place: 'Dôme Bêta - Anneau 2', status: 'En cours', base: 6, date: '2026-10-01 09:10' },
    { id: 'EX-ASC-02', title: 'Ascenseur en panne au Secteur Sud', service: 'Transports & Hyper-Tubes', place: 'Secteur Sud Extérieur', status: 'En attente', base: 3, date: '2026-10-02 16:40' },
    { id: 'EX-AIR-03', title: "Odeur persistante près de la tour de l'air", service: 'Atmosphère & Biosphère', place: 'Dôme Alpha - Anneau 1', status: 'En attente', base: 4, date: '2026-10-02 11:25' },
    { id: 'EX-PHA-04', title: 'Horaires du samedi de la pharmacie Bêta', service: 'Santé Biotech & Cryo-Soins', place: 'Dôme Bêta - Anneau 2', status: 'Résolu', base: 9, date: '2026-09-28 08:05' }
];

let w8Sup = { q: '', sort: 'top', service: '', mine: false };
let w8ConcernTab = 'new';

function w8PublicList() {
    const supports = w8Supports();
    const me = w8Key();
    const mineTickets = new Set(tnMyTickets().map(ticket => ticket.id));
    const real = citizenTickets.filter(ticket => ticket.public).map(ticket => {
        const list = supports[ticket.id] || [];
        return {
            id: ticket.id, title: tnTicketTitle(ticket), service: ticket.service, place: tnTicketPlace(ticket), status: ticket.status, date: ticket.date,
            count: list.length, mine: mineTickets.has(ticket.id), supported: !!me && list.some(entry => entry.key === me), seed: false
        };
    });
    const seeds = W8_SEEDS.map(seed => {
        const list = supports[seed.id] || [];
        return Object.assign({}, seed, { count: seed.base + list.length, mine: false, supported: !!me && list.some(entry => entry.key === me), seed: true });
    });
    return real.concat(seeds);
}

function w8SupportCard(entry) {
    const klass = typeof TN_STATUS_CLASS !== 'undefined' && TN_STATUS_CLASS[entry.status] ? TN_STATUS_CLASS[entry.status] : 'neutral';
    const closed = entry.status === 'Résolu';
    const action = entry.mine
        ? `<span class="tn-hint">${w8Esc(t("C'est votre demande."))}</span>`
        : closed
            ? `<span class="tn-hint">${w8Esc(t('Cette demande est résolue : le soutien est fermé.'))}</span>`
            : `<button type="button" class="tn-tab tn-w8-support-btn" data-w8-support="${w8Esc(entry.id)}" aria-pressed="${entry.supported}">${w8Esc(entry.supported ? t('Retirer mon soutien') : t('Je soutiens cette demande'))}</button>`;
    return `
        <li class="tn-poi-card tn-w8-request" id="req-${w8Esc(entry.id)}">
            <p class="tn-w8-change-head">
                <strong data-no-i18n>${w8Esc(entry.title)}</strong>
                <span class="tn-badge tn-badge--${klass}" data-no-i18n>${w8Esc(t(entry.status))}</span>
                ${entry.seed ? `<span class="tn-w8-kind" data-no-i18n>${w8Esc(t('Exemple'))}</span>` : ''}
            </p>
            <p class="tn-hint" data-no-i18n>${w8Esc(t(entry.service))}${entry.place ? ' · ' + w8Esc(entry.place) : ''} · ${w8Esc(w8Fmt(entry.date))}</p>
            <p class="tn-w8-count" data-no-i18n><strong>${entry.count}</strong> ${w8Esc(t('habitant(s) soutiennent'))}${entry.supported ? ` · <span class="tn-w8-you">${w8Esc(t('dont vous'))}</span>` : ''}${entry.count >= W8_PRIORITY_SUPPORTS && !closed ? ` · <span class="tn-w8-you">${w8Esc(t('signalée comme prioritaire aux agents'))}</span>` : ''}</p>
            <div class="tn-row-actions">${action}</div>
        </li>`;
}

function w8RenderSupport() {
    const section = document.getElementById('w8-support');
    if (!section) return;
    const all = w8PublicList();
    const serviceSelect = section.querySelector('#sup-service');
    const services = Array.from(new Set(all.map(entry => entry.service))).sort();
    if (serviceSelect.options.length !== services.length + 1) {
        serviceSelect.innerHTML = `<option value="">${w8Esc(t('Tous les services'))}</option>` + services.map(name => `<option value="${w8Esc(name)}" data-no-i18n>${w8Esc(t(name))}</option>`).join('');
        serviceSelect.value = w8Sup.service;
    }
    const fold = value => typeof tnFold === 'function' ? tnFold(String(value)) : String(value).toLowerCase();
    let shown = all.filter(entry => (!w8Sup.service || entry.service === w8Sup.service)
        && (!w8Sup.mine || entry.supported)
        && (!w8Sup.q || fold(`${entry.title} ${t(entry.service)} ${entry.place}`).includes(fold(w8Sup.q))));
    shown = shown.sort((a, b) => w8Sup.sort === 'new' ? String(b.date).localeCompare(String(a.date)) : (b.count - a.count));
    section.querySelector('#sup-count').textContent = shown.length ? t('{n} demande(s) affichée(s)', { n: shown.length }) : '';
    section.querySelector('#sup-list').innerHTML = shown.length ? shown.map(w8SupportCard).join('') : `<li class="tn-empty">${w8Esc(t('Aucune demande ne correspond.'))}</li>`;

    // Trace : mes soutiens
    const me = w8Key();
    const supports = w8Supports();
    const mine = me ? all.filter(entry => entry.supported) : [];
    section.querySelector('#sup-mine').innerHTML = !me
        ? `<p class="tn-hint">${w8Esc(t('Connectez-vous pour soutenir une demande et retrouver ici vos soutiens.'))}</p>`
        : mine.length ? mine.map(entry => {
            const record = (supports[entry.id] || []).find(item => item.key === me) || {};
            return `<li class="tn-w8-mysupport"><span data-no-i18n><strong>${w8Esc(entry.title)}</strong> · <span class="tn-hint">${w8Esc(t('Référence'))} ${w8Esc(record.ref || '')} · ${w8Esc(w8Fmt(record.at))} · ${w8Esc(t(entry.status))}</span></span></li>`;
        }).join('') : `<li class="tn-hint">${w8Esc(t("Vous ne soutenez aucune demande pour l'instant."))}</li>`;
}

function w8ToggleSupport(id) {
    if (!activeCitizen) {
        announce(t('Connectez-vous pour soutenir une demande.'));
        if (typeof w6Notify === 'function') w6Notify(t('Connectez-vous pour soutenir une demande.'));
        if (typeof openAuthModal === 'function') openAuthModal('login');
        return;
    }
    const entry = w8PublicList().find(item => item.id === id);
    if (!entry || entry.mine || entry.status === 'Résolu') return;
    const supports = w8Supports();
    const list = supports[id] || [];
    const me = w8Key();
    const index = list.findIndex(item => item.key === me);
    const before = entry.count;
    let message;
    if (index >= 0) {
        list.splice(index, 1);
        message = t('Votre soutien est retiré.');
    } else {
        const ticket = citizenTickets.find(item => item.id === id);
        const ref = w8Id('SOU');
        list.push({ key: me, at: w8Stamp(), ref, version: ticket ? tnTicketHistory(ticket).length : 1 });
        message = t('Soutien enregistré. Référence {ref}. Vous serez prévenu(e) quand l\'état de cette demande change.', { ref });
    }
    supports[id] = list;
    w8Save(W8_STORE.supports, supports);
    if (typeof tnAuditRecord === 'function') tnAuditRecord({
        category: 'participation', action: index >= 0 ? 'Soutien retiré' : 'Soutien ajouté', target: `demande:${id}`, targetLabel: entry.title,
        before: { soutiens: before }, after: { soutiens: before + (index >= 0 ? -1 : 1) }
    });
    w8Refresh(false);
    announce(message);
    if (typeof w6Notify === 'function') w6Notify(message);
    const button = document.querySelector(`[data-w8-support="${id}"]`);
    if (button) button.focus();
}

// ---------- Mes données ----------
function w8MyData() {
    const box = document.getElementById('w8-mydata');
    if (!box) return;
    if (!activeCitizen) {
        box.innerHTML = `
            <p class="tn-hint">${w8Esc(t('Connectez-vous pour voir ce que la plateforme détient sur vous.'))}</p>
            <div class="tn-row-actions"><button type="button" class="tn-tab" onclick="openAuthModal('login')">${w8Esc(t('Se connecter'))}</button></div>`;
        return;
    }
    const me = activeCitizen.matricule;
    const tickets = tnMyTickets().length;
    const concerns = w8Concerns().filter(concern => concern.owner === me).length;
    const supports = Object.values(w8Supports()).filter(list => list.some(entry => entry.key === me)).length;
    box.innerHTML = `
        <dl class="tn-facts tn-w8-facts" data-no-i18n>
            <dt>${w8Esc(t('Nom'))}</dt><dd>${w8Esc(activeCitizen.name)}</dd>
            <dt>${w8Esc(t('Matricule'))}</dt><dd>${w8Esc(me)}</dd>
            <dt>${w8Esc(t('Dôme'))}</dt><dd>${w8Esc(activeCitizen.dome || '—')}</dd>
            <dt>${w8Esc(t('Demandes'))}</dt><dd>${tickets}</dd>
            <dt>${w8Esc(t('Inquiétudes'))}</dt><dd>${concerns}</dd>
            <dt>${w8Esc(t('Demandes soutenues'))}</dt><dd>${supports}</dd>
        </dl>
        <div class="tn-row-actions">
            <button type="button" class="tn-tab" id="w8-export"><i aria-hidden="true" class="fa-solid fa-download"></i> ${w8Esc(t('Télécharger mes données'))}</button>
            <button type="button" class="tn-tab" id="w8-delete"><i aria-hidden="true" class="fa-solid fa-trash"></i> ${w8Esc(t('Supprimer mon compte'))}</button>
        </div>`;
}

function w8ExportData() {
    if (!activeCitizen) return;
    const me = activeCitizen.matricule;
    const account = typeof w4Account === 'function' ? w4Account(me) : null;
    const appointments = (w8Load('tn_appointments', []) || []).filter(entry => { try { const text = JSON.stringify(entry); return text.includes(me) || text.includes(activeCitizen.name); } catch (err) { return false; } });
    const supports = w8Supports();
    const data = {
        exporte_le: new Date().toISOString(),
        identite: { nom: activeCitizen.name, matricule: me, dome: activeCitizen.dome || '', profil: account ? account.role || '' : '' },
        demandes: tnMyTickets(),
        rendez_vous: appointments,
        inquietudes: w8Concerns().filter(concern => concern.owner === me),
        soutiens: Object.keys(supports).filter(id => supports[id].some(entry => entry.key === me)).map(id => Object.assign({ demande: id }, supports[id].find(entry => entry.key === me))),
        reglages: { langue: typeof tnLang !== 'undefined' ? tnLang : '', secteur: typeof tnMySector === 'function' ? tnMySector() : '' }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `terra-nova-mes-donnees-${me}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
    announce(t('Vos données ont été téléchargées.'));
}

// ---------- Mes inquiétudes ----------
function w8ConcernSteps(concern) {
    const find = status => concern.history.find(entry => entry.status === status);
    return ['Reçue', 'Lue', 'Prise en compte'].map(status => ({ status, entry: find(status) }));
}

function w8RenderConcerns() {
    const list = document.getElementById('inq-list');
    if (!list) return;
    const owner = w8OwnerKey();
    const mine = owner ? w8Concerns().filter(concern => concern.owner === owner).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))) : [];
    const seen = w8SeenMap();
    list.innerHTML = mine.length ? mine.map(concern => {
        const klass = concern.status === 'Prise en compte' ? 'resolved' : concern.status === 'Lue' ? 'progress' : 'pending';
        const info = W8_CONCERN_STATE[concern.status];
        const isNew = activeCitizen && (seen[`c:${concern.id}`] === undefined ? 1 : seen[`c:${concern.id}`]) < concern.history.length;
        return `
        <li class="tn-ticket tn-w8-concern" id="concern-${w8Esc(concern.id)}">
            <div class="tn-ticket-head"><span class="tn-ticket-id" data-no-i18n>${w8Esc(concern.id)}</span>
                <span class="tn-badge tn-badge--${klass}" data-no-i18n>${w8Esc(t(concern.status))}</span>${isNew ? `<span class="tn-badge tn-badge--pending" data-no-i18n>${w8Esc(t('Nouveau'))}</span>` : ''}</div>
            <h4 class="tn-ticket-subject" data-no-i18n>${w8Esc(t(concern.topic))}</h4>
            <p class="tn-ticket-meta" data-no-i18n>${w8Esc(w8Fmt(concern.createdAt))}</p>
            <ol class="tn-steps">${w8ConcernSteps(concern).map(step => `
                <li class="tn-step ${step.entry ? 'tn-step--done' : ''}"><span data-no-i18n>${w8Esc(t(step.status))}</span>
                <span class="sr-only">${w8Esc(step.entry ? t('Étape réalisée') : t('Étape à venir'))}</span>
                ${step.entry ? `<span class="tn-step-date" data-no-i18n>${w8Esc(w8Fmt(step.entry.date))}</span>` : ''}</li>`).join('')}</ol>
            <div class="tn-w8-state" data-no-i18n>
                <p class="tn-w8-line"><b>${w8Esc(t('Ce que cela veut dire :'))}</b> ${w8Esc(t(info.meaning))}</p>
                ${concern.response ? `<p class="tn-w8-line tn-w8-note"><b>${w8Esc(t('Réponse de la mairie :'))}</b> ${w8Esc(concern.response)}${concern.answeredBy ? ` <span class="tn-hint">— ${w8Esc(concern.answeredBy)}</span>` : ''}</p>` : ''}
            </div>
            <details><summary>${w8Esc(t('Ce que vous avez écrit'))}</summary><p class="tn-w8-line" data-no-i18n>${w8Esc(concern.message)}</p></details>
        </li>`;
    }).join('') : `<li class="tn-empty">${w8Esc(t(owner ? "Vous n'avez pas encore fait remonter d'inquiétude." : 'Vos inquiétudes apparaîtront ici dès que vous en aurez envoyé une.'))}</li>`;

    const nameField = document.getElementById('inq-name-field');
    if (nameField) nameField.hidden = !!activeCitizen;
}

function w8SubmitConcern(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const topic = form.querySelector('#inq-topic').value;
    const message = form.querySelector('#inq-message').value.trim();
    let name = activeCitizen ? activeCitizen.name : form.querySelector('#inq-name').value.trim();
    if (!name || message.length < 10) return;
    const owner = activeCitizen ? activeCitizen.matricule : `v:${name}`;
    if (!activeCitizen) w8Save(W8_STORE.visitor, name);
    const concern = {
        id: w8Id('INQ'), owner, ownerName: name, topic, message, wantsReply: form.querySelector('#inq-reply').checked,
        status: 'Reçue', history: [{ status: 'Reçue', date: w8Stamp() }], response: '', answeredBy: '', createdAt: w8Stamp()
    };
    const all = w8Concerns();
    all.unshift(concern);
    w8Save(W8_STORE.concerns, all.slice(0, 200));
    if (typeof tnAuditRecord === 'function') tnAuditRecord({
        category: 'participation', action: 'Inquiétude déposée', target: `inquietude:${concern.id}`, targetLabel: concern.id, before: null, after: { statut: 'Reçue', titre: topic }
    });
    form.reset();
    const receipt = document.getElementById('inq-receipt');
    receipt.hidden = false;
    receipt.innerHTML = `
        <h4 class="tn-w8-sub">${w8Esc(t('Votre inquiétude est bien enregistrée'))}</h4>
        <p class="tn-w8-line" data-no-i18n><b>${w8Esc(t('Numéro de suivi :'))}</b> <strong>${w8Esc(concern.id)}</strong> · ${w8Esc(w8Fmt(concern.createdAt))}</p>
        <p class="tn-w8-line" data-no-i18n>${w8Esc(t("Un agent la lit sous 5 jours ouvrés. Vous verrez ici son état et la réponse, et la cloche de notifications vous prévient à chaque étape."))}</p>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-w8-inq-more>${w8Esc(t('Envoyer une autre inquiétude'))}</button></div>`;
    receipt.setAttribute('tabindex', '-1');
    receipt.focus();
    form.hidden = true;
    announce(t('Inquiétude enregistrée. Numéro de suivi {id}.', { id: concern.id }));
    w8Refresh(false);
}

// ---------- Espace agents : lire et répondre aux inquiétudes ----------
function w8RenderConcernsAdmin() {
    const panel = document.getElementById('concerns-admin');
    if (!panel) return;
    const all = w8Concerns();
    const tabs = { new: c => c.status === 'Reçue', read: c => c.status === 'Lue', done: c => c.status === 'Prise en compte', all: () => true };
    panel.querySelectorAll('[data-inq-tab]').forEach(button => {
        const key = button.dataset.inqTab;
        button.setAttribute('aria-pressed', String(key === w8ConcernTab));
        const count = all.filter(tabs[key]).length;
        const badge = button.querySelector('.tn-w8-tabcount');
        if (badge) badge.textContent = count;
    });
    const rows = all.filter(tabs[w8ConcernTab]).slice(0, 50);
    panel.querySelector('#inq-admin-body').innerHTML = rows.length ? rows.map(concern => `
        <tr class="border-b border-cyan-900/30" data-concern="${w8Esc(concern.id)}">
            <td class="py-2.5 px-3 align-top" data-no-i18n><strong>${w8Esc(concern.id)}</strong><div class="tn-hint">${w8Esc(w8Fmt(concern.createdAt))}</div></td>
            <td class="py-2.5 px-3 align-top" data-no-i18n>${w8Esc(concern.ownerName)}<div class="tn-hint">${w8Esc(String(concern.owner).startsWith('v:') ? t('Visiteur') : concern.owner)}${concern.wantsReply ? ' · ' + w8Esc(t('réponse souhaitée')) : ''}</div></td>
            <td class="py-2.5 px-3 align-top" data-no-i18n><span class="tn-badge tn-badge--neutral">${w8Esc(t(concern.topic))}</span><div>${w8Esc(concern.message)}</div>${concern.response ? `<div class="tn-w8-note tn-hint">${w8Esc(t('Réponse :'))} ${w8Esc(concern.response)}</div>` : ''}</td>
            <td class="py-2.5 px-3 align-top"><span class="tn-badge tn-badge--${concern.status === 'Prise en compte' ? 'resolved' : concern.status === 'Lue' ? 'progress' : 'pending'}" data-no-i18n>${w8Esc(t(concern.status))}</span></td>
            <td class="py-2.5 px-3 align-top tn-row-actions">
                ${concern.status === 'Reçue' ? `<button type="button" class="tn-tab" data-inq-read="${w8Esc(concern.id)}">${w8Esc(t('Marquer comme lue'))}</button>` : ''}
                ${concern.status !== 'Prise en compte' ? `<button type="button" class="tn-tab" data-inq-answer="${w8Esc(concern.id)}">${w8Esc(t('Répondre et clôturer'))}</button>` : ''}
            </td>
        </tr>`).join('') : `<tr><td colspan="5" class="py-6 px-3 text-[#6F8696]">${w8Esc(t('Aucune inquiétude dans cette liste.'))}</td></tr>`;
}

function w8UpdateConcern(id, status, response) {
    if (!w8IsStaff()) return;
    const all = w8Concerns();
    const concern = all.find(item => item.id === id);
    if (!concern || concern.status === status) return;
    const before = concern.status;
    const name = w8StaffName() || t('Agent municipal');
    concern.status = status;
    concern.history.push({ status, date: w8Stamp(), by: name });
    if (response) { concern.response = response; concern.answeredBy = name; }
    w8Save(W8_STORE.concerns, all);
    if (typeof tnAuditRecord === 'function') tnAuditRecord({
        category: 'inquietude', action: status === 'Lue' ? 'Inquiétude lue' : 'Inquiétude prise en compte', target: `inquietude:${id}`, targetLabel: id,
        before: { statut: before }, after: response ? { statut: status, reponse: response } : { statut: status }
    });
    w8Refresh(false);
    if (typeof renderNotifications === 'function') renderNotifications();
    announce(status === 'Lue' ? t('Inquiétude marquée comme lue.') : t('Réponse enregistrée. L\'habitant est prévenu.'));
}

function w8OpenAnswer(id) {
    const concern = w8Concerns().find(item => item.id === id);
    if (!concern || typeof w4OpenDialog !== 'function') return;
    const dialog = w4OpenDialog(t('Répondre à {id}', { id }), `
        <p class="tn-hint" data-no-i18n>${w8Esc(concern.message)}</p>
        <form id="inq-answer-form" class="tn-dialog-form" novalidate>
            <div><label class="tn-field-label" for="inq-answer">Votre réponse (visible par l'habitant)</label>
            <textarea id="inq-answer" class="cyber-input" rows="4" maxlength="600" required data-autofocus></textarea></div>
            <p class="tn-form-error" id="inq-answer-error" role="alert" data-no-i18n></p>
            <div class="tn-dialog-actions">
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close>Annuler</button>
                <button type="submit" class="btn-cyber btn-amber px-4 py-2 text-xs font-bold uppercase">Envoyer et clôturer</button>
            </div>
        </form>`);
    dialog.querySelector('#inq-answer-form').addEventListener('submit', event => {
        event.preventDefault();
        const text = dialog.querySelector('#inq-answer').value.trim();
        if (text.length < 10) { dialog.querySelector('#inq-answer-error').textContent = t('Écrivez une réponse d\'au moins 10 caractères.'); dialog.querySelector('#inq-answer').focus(); return; }
        w8UpdateConcern(id, 'Prise en compte', text);
        w4CloseDialog();
    });
}

function initConcernsAdmin() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('concerns-admin')) return;
    const panel = document.createElement('div');
    panel.id = 'concerns-admin';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = 'Inquiétudes sur les données';
    panel.innerHTML = `
        <div class="tn-eyebrow">Participation des habitants</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">INQUIÉTUDES SUR LES DONNÉES</h3>
        <p class="tn-hint">Chaque inquiétude reçoit un numéro. Marquez-la comme lue, puis répondez : l'habitant voit l'état et votre réponse, et il est prévenu par notification.</p>
        <div class="tn-tabs" role="group" aria-label="Filtrer les inquiétudes">
            <button type="button" class="tn-tab" data-inq-tab="new" aria-pressed="true">À lire <span class="tn-w8-tabcount" data-no-i18n></span></button>
            <button type="button" class="tn-tab" data-inq-tab="read" aria-pressed="false">Lues <span class="tn-w8-tabcount" data-no-i18n></span></button>
            <button type="button" class="tn-tab" data-inq-tab="done" aria-pressed="false">Prises en compte <span class="tn-w8-tabcount" data-no-i18n></span></button>
            <button type="button" class="tn-tab" data-inq-tab="all" aria-pressed="false">Toutes <span class="tn-w8-tabcount" data-no-i18n></span></button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs tn-audit-table">
                <caption class="sr-only">Inquiétudes des habitants sur leurs données</caption>
                <thead><tr class="border-b border-cyan-900/60 text-[#6F8696] uppercase text-[10px]">
                    <th scope="col" class="py-2.5 px-3">Numéro</th><th scope="col" class="py-2.5 px-3">Habitant</th><th scope="col" class="py-2.5 px-3">Inquiétude</th><th scope="col" class="py-2.5 px-3">État</th><th scope="col" class="py-2.5 px-3">Action</th>
                </tr></thead>
                <tbody id="inq-admin-body"></tbody>
            </table>
        </div>`;
    const anchor = document.getElementById('account-admin') || document.getElementById('audit-journal');
    if (anchor) anchor.after(panel); else workspace.appendChild(panel);
    panel.addEventListener('click', event => {
        const tab = event.target.closest('[data-inq-tab]');
        if (tab) { w8ConcernTab = tab.dataset.inqTab; w8RenderConcernsAdmin(); return; }
        const read = event.target.closest('[data-inq-read]');
        if (read) { w8UpdateConcern(read.dataset.inqRead, 'Lue', ''); return; }
        const answer = event.target.closest('[data-inq-answer]');
        if (answer) w8OpenAnswer(answer.dataset.inqAnswer);
    });
}

// ---------- La section « Participation » ----------
function initParticipation() {
    const anchor = document.getElementById('espace-citoyen');
    if (!anchor || document.getElementById('participation')) return;
    const section = document.createElement('section');
    section.id = 'participation';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'participation-title');
    section.dataset.crumb = 'Participation';
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1">
                <i aria-hidden="true" class="fa-solid fa-people-group"></i>
                <span>Votre voix compte</span>
            </div>
            <h2 id="participation-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">PARTICIPATION</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">Comprendre l'usage de vos données, faire remonter une inquiétude et soutenir les demandes des autres habitants. Chaque action laisse une trace que vous retrouvez ici.</p>
            <div class="tn-row-actions mt-3" role="group" aria-label="Aller à">
                <button type="button" class="tn-tab" data-w8-jump="w8-data">Mes données</button>
                <button type="button" class="tn-tab" data-w8-jump="w8-concerns">Faire remonter une inquiétude</button>
                <button type="button" class="tn-tab" data-w8-jump="w8-support">Soutenir une demande</button>
            </div>
        </div>

        <div class="space-y-8">
            <div class="holo-card p-6 relative" id="w8-data" role="region" aria-labelledby="w8-data-title">
                <div class="tn-eyebrow">Transparence</div>
                <h3 id="w8-data-title" class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">MES DONNÉES : QUOI, POURQUOI, QUI, COMBIEN DE TEMPS</h3>
                <div id="w8-mydata" class="mt-3"></div>
                <ul class="tn-w8-data-list">
                    ${W8_DATA.map(item => `
                    <li class="tn-w8-data-card">
                        <h4 class="tn-w8-data-name"><i aria-hidden="true" class="fa-solid ${item.icon}"></i> <span>${w8Esc(item.name)}</span></h4>
                        <dl>
                            <div><dt>Ce que c'est</dt><dd>${w8Esc(item.what)}</dd></div>
                            <div><dt>Pourquoi</dt><dd>${w8Esc(item.why)}</dd></div>
                            <div><dt>Qui peut la voir</dt><dd>${w8Esc(item.who)}</dd></div>
                            <div><dt>Combien de temps</dt><dd>${w8Esc(item.keep)}</dd></div>
                        </dl>
                    </li>`).join('')}
                </ul>
                <h4 class="tn-w8-sub">Ce que nous ne faisons pas, et ce qu'il faut savoir</h4>
                <ul class="tn-w8-not">${W8_NOT.map(text => `<li>${w8Esc(text)}</li>`).join('')}</ul>
            </div>

            <div class="holo-card p-6 relative" id="w8-concerns" role="region" aria-labelledby="w8-concerns-title">
                <div class="tn-eyebrow">Vous avez une inquiétude ?</div>
                <h3 id="w8-concerns-title" class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">FAIRE REMONTER UNE INQUIÉTUDE SUR MES DONNÉES</h3>
                <p class="tn-hint">Écrivez-nous en quelques mots. Vous recevez un numéro de suivi, puis vous voyez ici quand un agent a lu votre message et ce qui a été décidé.</p>
                <form id="inq-form" class="tn-w8-form" autocomplete="off">
                    <div id="inq-name-field"><label class="tn-field-label" for="inq-name">Votre nom ou pseudo</label>
                        <input id="inq-name" class="cyber-input" maxlength="40" autocomplete="name"></div>
                    <div><label class="tn-field-label" for="inq-topic">Sujet</label>
                        <select id="inq-topic" class="cyber-input">${W8_TOPICS.map(topic => `<option value="${w8Esc(topic)}">${w8Esc(topic)}</option>`).join('')}</select></div>
                    <div><label class="tn-field-label" for="inq-message">Votre message</label>
                        <textarea id="inq-message" class="cyber-input" rows="4" maxlength="800" required minlength="10" placeholder="Décrivez ce qui vous inquiète, en quelques phrases."></textarea></div>
                    <label class="tn-w8-check"><input type="checkbox" id="inq-reply" checked> <span>Je souhaite une réponse écrite</span></label>
                    <button type="submit" class="btn-cyber btn-amber px-6 py-2.5 text-xs font-bold uppercase">Envoyer mon inquiétude</button>
                </form>
                <div id="inq-receipt" class="tn-w8-receipt" role="status" hidden></div>
                <h4 class="tn-w8-sub">Mes inquiétudes</h4>
                <ol id="inq-list" class="tn-ticket-list"></ol>
            </div>

            <div class="holo-card p-6 relative" id="w8-support" role="region" aria-labelledby="w8-support-title">
                <div class="tn-eyebrow">Ensemble</div>
                <h3 id="w8-support-title" class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">SOUTENIR UNE DEMANDE DÉJÀ DÉPOSÉE</h3>
                <p class="tn-hint">Un problème touche plusieurs habitants ? Ajoutez votre soutien au lieu de déposer la même demande. Votre nom n'est jamais affiché. À 5 soutiens, la demande est signalée comme prioritaire aux agents.</p>
                <div class="tn-w8-filters">
                    <div><label class="tn-field-label" for="sup-q">Chercher</label><input id="sup-q" type="search" class="cyber-input" autocomplete="off" placeholder="objet, service, lieu…"></div>
                    <div><label class="tn-field-label" for="sup-service">Service</label><select id="sup-service" class="cyber-input"></select></div>
                    <div><label class="tn-field-label" for="sup-sort">Trier par</label>
                        <select id="sup-sort" class="cyber-input"><option value="top">Les plus soutenues</option><option value="new">Les plus récentes</option></select></div>
                    <label class="tn-w8-check"><input type="checkbox" id="sup-only"> <span>Seulement celles que je soutiens</span></label>
                </div>
                <p id="sup-count" class="tn-tracker-count" role="status" data-no-i18n></p>
                <ul id="sup-list" class="tn-poi-list"></ul>
                <h4 class="tn-w8-sub">Mes soutiens</h4>
                <ul id="sup-mine" class="tn-w8-mysupports"></ul>
            </div>
        </div>`;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'participation')) {
        const index = TN_SECTIONS.findIndex(entry => entry.id === 'espace-citoyen');
        TN_SECTIONS.splice(index >= 0 ? index + 1 : TN_SECTIONS.length, 0, { id: 'participation', label: 'Participation' });
    }
    const navLink = document.querySelector('#site-nav a[href="#espace-citoyen"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#participation';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-people-group text-[11px] text-[#00B8FF]"></i><span>PARTICIPATION</span>';
        navLink.after(link);
    }

    section.addEventListener('click', event => {
        const jump = event.target.closest('[data-w8-jump]');
        if (jump) { const el = document.getElementById(jump.dataset.w8Jump); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); if (typeof tnFlash === 'function') tnFlash(el, 'start'); } return; }
        const support = event.target.closest('[data-w8-support]');
        if (support) { w8ToggleSupport(support.dataset.w8Support); return; }
        if (event.target.closest('#w8-export')) { w8ExportData(); return; }
        if (event.target.closest('#w8-delete')) { if (typeof openDeleteAccount === 'function') openDeleteAccount(); return; }
        if (event.target.closest('[data-w8-inq-more]')) {
            document.getElementById('inq-receipt').hidden = true;
            const form = document.getElementById('inq-form');
            form.hidden = false;
            form.querySelector('#inq-message').focus();
        }
    });
    section.querySelector('#sup-q').addEventListener('input', event => { w8Sup.q = event.target.value; w8RenderSupport(); });
    section.querySelector('#sup-service').addEventListener('change', event => { w8Sup.service = event.target.value; w8RenderSupport(); });
    section.querySelector('#sup-sort').addEventListener('change', event => { w8Sup.sort = event.target.value; w8RenderSupport(); });
    section.querySelector('#sup-only').addEventListener('change', event => { w8Sup.mine = event.target.checked; w8RenderSupport(); });
    section.querySelector('#inq-form').addEventListener('submit', w8SubmitConcern);
    if (typeof w6EnhanceForms === 'function') w6EnhanceForms();
}

function w8RenderParticipation() {
    w8MyData();
    w8RenderSupport();
    w8RenderConcerns();
    w8RenderConcernsAdmin();
}

// ---------- Case « soutien » dans le formulaire de contact ----------
function w8ContactPublic() { const box = document.getElementById('contact-public'); return !!(box && box.checked); }

function w8SyncPublic() {
    const box = document.getElementById('contact-public');
    if (!box || box.dataset.touched) return;
    const category = (document.getElementById('contact-category') || {}).value;
    box.checked = (typeof contactMode !== 'undefined' && contactMode === 'report') || category === 'Signalement Incident' || category === 'Doléance Urbaine';
}

function initContactShare() {
    const form = document.getElementById('contact-municipal-form');
    if (!form || document.getElementById('contact-public')) return;
    const submitRow = form.querySelector('.pt-2');
    if (!submitRow) return;
    const block = document.createElement('div');
    block.className = 'tn-w8-share';
    block.innerHTML = `
        <label class="tn-w8-check"><input type="checkbox" id="contact-public"> <span>Permettre aux autres habitants de soutenir cette demande</span></label>
        <p class="tn-hint">Seuls l'objet, le service, le lieu et l'état de la demande sont visibles. Jamais votre nom ni votre message.</p>`;
    submitRow.before(block);
    block.querySelector('#contact-public').addEventListener('click', event => { event.target.dataset.touched = '1'; });
    form.addEventListener('change', w8SyncPublic);
    form.addEventListener('click', () => setTimeout(w8SyncPublic, 0));
    w8SyncPublic();
}

// ==========================================================
// Branchements
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Journal d'activité : nouvelles catégories
    if (typeof W7_CAT_LABEL !== 'undefined') {
        W7_CAT_LABEL.participation = 'Participation';
        W7_CAT_LABEL.inquietude = 'Inquiétudes sur les données';
        if (typeof W7_ADMIN_CATS !== 'undefined' && !W7_ADMIN_CATS.includes('inquietude')) W7_ADMIN_CATS.push('inquietude');
        if (typeof W7_FIELD !== 'undefined') Object.assign(W7_FIELD, { soutiens: 'Soutiens', reponse: 'Réponse' });
        const catSelect = document.getElementById('audit-cat');
        if (catSelect && typeof w7RenderAudit === 'function') { catSelect.innerHTML = ''; w7RenderAudit(); }
    }

    // Changement d'état : message de l'agent, enregistré dans la demande et dans la notification
    if (typeof updateTicketStatus === 'function') {
        const baseUpdate = updateTicketStatus;
        updateTicketStatus = function (ticketId) {
            const input = document.getElementById('w8-agent-note');
            const note = input ? input.value.trim() : '';
            const ticket = citizenTickets.find(entry => entry.id === ticketId);
            const lengthBefore = ticket ? tnTicketHistory(ticket).length : 0;
            const result = baseUpdate.apply(this, arguments);
            if (ticket) {
                const history = tnTicketHistory(ticket);
                const last = history[history.length - 1];
                if (history.length > lengthBefore && last) {
                    const by = w8StaffName();
                    if (note) last.note = note;
                    if (by) last.by = by;
                    try { localStorage.setItem('tn_tickets', JSON.stringify(citizenTickets)); } catch (err) { }
                    const events = tnLoad('tn_ticket_events', []);
                    if (events[0] && events[0].ticketId === ticketId) {
                        if (note) events[0].note = note;
                        if (by) events[0].by = by;
                        tnStore('tn_ticket_events', events);
                    }
                }
            }
            if (input) input.value = '';
            w8Refresh();
            return result;
        };
    }

    // Décoration de la liste des démarches
    if (typeof renderTrackerList === 'function') {
        const baseList = renderTrackerList;
        renderTrackerList = function () { const result = baseList.apply(this, arguments); try { w8DecorateTracker(); } catch (err) { } return result; };
    }
    if (typeof renderAgentTicketsTable === 'function') {
        const baseAgent = renderAgentTicketsTable;
        renderAgentTicketsTable = function () { const result = baseAgent.apply(this, arguments); try { w8BadgeAgentRows(); w8RenderDash(); } catch (err) { } return result; };
    }
    if (typeof refreshPersonalisedViews === 'function') {
        const baseRefresh = refreshPersonalisedViews;
        refreshPersonalisedViews = function () { baseRefresh.apply(this, arguments); w8Refresh(); };
    }
    if (typeof switchRole === 'function') {
        const baseSwitch = switchRole;
        switchRole = function () { const result = baseSwitch.apply(this, arguments); w8Refresh(); return result; };
    }

    // La cloche : sens de chaque état, message de l'agent, inquiétudes et demandes soutenues
    if (typeof tnNotificationItems === 'function') {
        const baseItems = tnNotificationItems;
        tnNotificationItems = function () {
            const items = baseItems.apply(this, arguments);
            const read = new Set(tnLoad('tn_read_items', []));
            const events = tnLoad('tn_ticket_events', []);
            items.forEach(item => {
                if (!item.userText || !/^EV-/.test(item.id)) return;
                const event = events.find(entry => entry.id === item.id);
                if (!event) return;
                const info = W8_STATE[event.status === 'En attente' ? 'Rouverte' : event.status];
                if (!info) return;
                item.text = [t('Nouvel état : {status}', { status: t(event.status) }), t(info.meaning), t(info.todo), event.note ? `${t("Message de l'agent :")} ${event.note}` : ''].filter(Boolean).join(' ');
            });
            if (activeCitizen && !(activeCitizen.profile && activeCitizen.profile.notify === false)) {
                const mine = activeCitizen.matricule;
                const stamp = value => String(value || '').replace(' ', 'T');
                w8Concerns().filter(concern => concern.owner === mine).forEach(concern => {
                    concern.history.slice(1).forEach((step, index) => {
                        const id = `${concern.id}-${index + 1}`;
                        const info = W8_CONCERN_STATE[step.status];
                        items.push({
                            id, level: 'info', date: stamp(step.date), userText: true, read: read.has(id),
                            title: t('Inquiétude {id}', { id: concern.id }),
                            text: `${t('Nouvel état : {status}', { status: t(step.status) })} ${t(info.meaning)}`,
                            action: `w8GoTo('w8-concerns'); markNotificationRead('${id}')`
                        });
                    });
                });
                const supports = w8Supports();
                const supported = Object.keys(supports).filter(id => (supports[id] || []).some(entry => entry.key === mine));
                events.filter(event => supported.includes(event.ticketId)).forEach(event => {
                    const ticket = citizenTickets.find(entry => entry.id === event.ticketId);
                    if (!ticket || tnMyTickets().includes(ticket)) return;
                    const id = `S-${event.id}`;
                    items.push({
                        id, level: 'info', date: event.date, userText: true, read: read.has(id),
                        title: t('Demande soutenue {id}', { id: event.ticketId }),
                        text: `${t('Nouvel état : {status}', { status: t(event.status) })}${event.note ? ' — ' + event.note : ''}`,
                        action: `w8GoTo('w8-support'); markNotificationRead('${id}')`
                    });
                });
                items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            }
            return items;
        };
    }

    // Formulaire de contact : demande soutenable
    if (typeof handleContactMunicipal === 'function') {
        const baseContact = handleContactMunicipal;
        handleContactMunicipal = function () {
            const lengthBefore = citizenTickets.length;
            const firstBefore = citizenTickets[0];
            const choice = w8ContactPublic();
            const result = baseContact.apply(this, arguments);
            if (citizenTickets.length > lengthBefore && citizenTickets[0] !== firstBefore) {
                citizenTickets[0].public = choice;
                try { localStorage.setItem('tn_tickets', JSON.stringify(citizenTickets)); } catch (err) { }
                const box = document.getElementById('contact-public');
                if (box) { delete box.dataset.touched; w8SyncPublic(); }
                w8Refresh();
            }
            return result;
        };
    }

    // Recherche globale
    if (typeof tnSearchItems === 'function') {
        const baseSearch = tnSearchItems;
        tnSearchItems = function () {
            return baseSearch.apply(this, arguments).concat([
                { group: 'Participation', title: 'Mes données : quoi, pourquoi, qui, combien de temps', text: 'données personnelles vie privée rgpd confidentialité conservation télécharger supprimer', action: "w8GoTo('w8-data')" },
                { group: 'Participation', title: 'Faire remonter une inquiétude sur mes données', text: 'inquiétude plainte réclamation données vie privée question', action: "w8GoTo('w8-concerns')" },
                { group: 'Participation', title: 'Soutenir une demande déjà déposée', text: 'soutien soutenir appuyer pétition même problème demande habitants', action: "w8GoTo('w8-support')" }
            ]);
        };
    }

    initParticipation();
    initAgentDashboard();
    initConcernsAdmin();
    w8InitAgentNote();
    initContactShare();

    // Bandeau et encart : clics
    document.addEventListener('click', event => {
        if (event.target.closest('[data-w8-strip-open]')) {
            const target = document.getElementById('w8-changes');
            if (target) { if (typeof goToSection === 'function') goToSection('espace-citoyen'); setTimeout(() => { target.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (typeof tnFlash === 'function') tnFlash(target); }, 150); }
            return;
        }
        if (event.target.closest('[data-w8-strip-seen]')) { w8MarkSeen(null); return; }
        const seen = event.target.closest('[data-w8-seen]');
        if (seen) { w8MarkSeen([seen.dataset.w8Seen]); return; }
        const open = event.target.closest('[data-w8-open]');
        if (open) {
            const item = w8Followed().find(entry => entry.key === open.dataset.w8Open);
            if (item) {
                if (item.kind === 'ticket' && typeof goToSection === 'function') goToSection('espace-citoyen');
                setTimeout(() => { try { new Function(item.open)(); } catch (err) { } }, 120);
                w8MarkSeen([item.key]);
            }
        }
    });

    // Ce qui change dans un autre onglet (agent et habitant ouverts en même temps)
    window.addEventListener('storage', event => {
        if (!event.key) return;
        if (event.key === 'tn_tickets') {
            try { citizenTickets = JSON.parse(event.newValue) || []; } catch (err) { }
            if (typeof renderCitizenTicketsTable === 'function') renderCitizenTicketsTable();
            if (typeof renderAgentTicketsTable === 'function') renderAgentTicketsTable();
        }
        if (['tn_tickets', 'tn_ticket_events', W8_STORE.concerns, W8_STORE.supports, W8_STORE.seen].includes(event.key)) {
            w8Refresh();
            if (typeof renderNotifications === 'function') renderNotifications();
        }
    });
    document.addEventListener('tn:langchange', () => { w8Refresh(); w8InitLang(); });
    document.addEventListener('tn:audit', () => { try { w8RenderDash(); } catch (err) { } });
    setInterval(() => { if (!document.hidden) { try { w8RenderDash(); } catch (err) { } } }, 30000);

    w8Refresh();
});

function w8InitLang() {
    const serviceSelect = document.getElementById('sup-service');
    if (serviceSelect) serviceSelect.innerHTML = '';
    w8Refresh();
}
