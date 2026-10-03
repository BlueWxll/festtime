// ==========================================
// VAGUE 11 — F61 rapide sur appareils peu puissants, F62 versions simples de certaines pages,
// F63 couper un service défectueux en un clic, F64 voir l'état d'un service avant une démarche.
// Chargé après assets/wave10.js ; réutilise w5Outage / w5StatusMap (wave5), w7 (plan de la ville),
// w4OpenDialog, w4Audit, announce, goToSection, t().
// ==========================================

const W11T = (source, params) => escapeHtml(String(t(source, params)));
function w11Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w11Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }
function w11Staff() { return typeof w4Staff === 'function' ? w4Staff() : (currentRole === 'agent' || currentRole === 'admin'); }
function w11Clock(date = new Date()) { return date.toLocaleTimeString(typeof tnLocale === 'function' ? tnLocale() : 'fr-FR', { hour: '2-digit', minute: '2-digit' }); }

// ==========================================================
// F61 — Appareils peu puissants : effets réduits et mesure de fluidité
// ==========================================================
const W11_PERF = { tasks: 0, blocking: 0, longest: 0 };

if (window.PerformanceObserver) {
    try {
        new PerformanceObserver(list => list.getEntries().forEach(entry => {
            W11_PERF.tasks += 1;
            W11_PERF.blocking += Math.max(0, entry.duration - 50);
            W11_PERF.longest = Math.max(W11_PERF.longest, entry.duration);
        })).observe({ type: 'longtask', buffered: true });
    } catch (err) { }
}

function w11Device() {
    return { cores: navigator.hardwareConcurrency || 0, memory: navigator.deviceMemory || 0, weak: !!(window.TN_NET && window.TN_NET.weak) };
}
function w11LowFx() { return document.documentElement.classList.contains('lowfx'); }

function w11SetLowFx(on) {
    document.documentElement.classList.toggle('lowfx', on);
    try { localStorage.setItem('tn_lowfx', on ? '1' : '0'); } catch (err) { }
    announce(on ? t('Effets réduits : la page demande moins de travail à votre appareil.') : t('Effets rétablis.'));
    w11RenderPerf();
}

function w11Verdict() {
    const blocking = W11_PERF.blocking;
    if (blocking < 200) return { key: 'good', text: t('Fluide : la page répond tout de suite à vos actions.') };
    if (blocking < 600) return { key: 'ok', text: t('Correct : de petites pauses sont possibles au chargement.') };
    return { key: 'slow', text: t('Chargée : l\'appareil a du mal au démarrage. Les effets réduits aident.') };
}

function w11PerfHtml() {
    const device = w11Device();
    const nav = (performance.getEntriesByType('navigation') || [])[0];
    const ready = nav && nav.domContentLoadedEventEnd > 0 ? Math.round(nav.domContentLoadedEventEnd) : null;
    const verdict = w11Verdict();
    const on = w11LowFx();
    let stored = null;
    try { stored = localStorage.getItem('tn_lowfx'); } catch (err) { }
    const reason = !on ? t('Les effets sont complets.') : stored === '1' ? t('Vous les avez réduits.') : t('Réduits automatiquement : votre appareil est peu puissant.');
    return `
        <div class="tn-w10-switch">
            <div>
                <p class="tn-w9-lead"><strong>${W11T(on ? 'Effets réduits : activé' : 'Effets réduits : désactivé')}</strong></p>
                <p class="tn-hint" data-no-i18n>${escapeHtml(reason)}</p>
            </div>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w11="lowfx" aria-pressed="${on ? 'true' : 'false'}">${W11T(on ? 'Rétablir les effets' : 'Réduire les effets')}</button>
        </div>
        <ul class="tn-w10-kpis">
            <li><span class="tn-w10-label">${W11T('Fluidité')}</span><strong class="tn-w11-verdict tn-w11-verdict--${verdict.key}" data-no-i18n>${escapeHtml(verdict.key === 'good' ? t('Bonne') : verdict.key === 'ok' ? t('Correcte') : t('À améliorer'))}</strong><span class="tn-w9-meta" data-no-i18n>${escapeHtml(verdict.text)}</span></li>
            <li><span class="tn-w10-label">${W11T('Pauses de plus de 50 ms')}</span><strong data-no-i18n>${W11_PERF.tasks}</strong><span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('plus longue : {n} ms', { n: Math.round(W11_PERF.longest) }))}</span></li>
            <li><span class="tn-w10-label">${W11T('Temps bloqué')}</span><strong data-no-i18n>${Math.round(W11_PERF.blocking)} ms</strong><span class="tn-w9-meta">${W11T('depuis le chargement de la page')}</span></li>
            <li><span class="tn-w10-label">${W11T('Page utilisable en')}</span><strong data-no-i18n>${ready === null ? '—' : ready >= 1000 ? (ready / 1000).toFixed(1) + ' s' : ready + ' ms'}</strong></li>
            <li><span class="tn-w10-label">${W11T('Votre appareil')}</span><strong data-no-i18n>${escapeHtml(t('{n} cœur(s)', { n: device.cores || '?' }))}</strong><span class="tn-w9-meta" data-no-i18n>${escapeHtml(device.memory ? t('mémoire : {n} Go ou plus', { n: device.memory }) : t('mémoire non communiquée'))}${device.weak ? ' · ' + escapeHtml(t('peu puissant')) : ''}</span></li>
        </ul>
        <h4 class="tn-w8-sub">${W11T('Ce que font les effets réduits')}</h4>
        <ul class="tn-w9-brief">
            <li>${W11T('Le fond animé (particules) s\'arrête, et il s\'arrête aussi quand l\'onglet est caché.')}</li>
            <li>${W11T('Plus d\'animations, de transitions, de textures ni de flous : la page affiche la même chose, avec moins de calculs.')}</li>
            <li>${W11T('Les sections hors de l\'écran ne sont affichées qu\'au moment d\'y arriver.')}</li>
            <li>${W11T('Les textes, les boutons et toutes les actions restent identiques.')}</li>
        </ul>`;
}

function w11RenderPerf() {
    const box = document.getElementById('w11-perf-body');
    if (box) box.innerHTML = w11PerfHtml();
}

function w11InitPerfCard() {
    const host = document.getElementById('sobriete');
    if (!host || document.getElementById('w11-perf')) return;
    const card = document.createElement('div');
    card.id = 'w11-perf';
    card.className = 'holo-card p-6 relative mt-8';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-labelledby', 'w11-perf-title');
    card.innerHTML = `
        <div class="tn-eyebrow">${W11T('Appareils peu puissants')}</div>
        <h3 id="w11-perf-title" class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">${W11T('FLUIDITÉ DE LA PAGE')}</h3>
        <div id="w11-perf-body" class="mt-3"></div>`;
    const first = host.querySelector('.holo-card');
    (first || host).after(card);
    w11RenderPerf();
}

// ==========================================================
// F62 — Versions simples de certaines pages
// ==========================================================
const W11_SIMPLE_KEY = 'tn_w11_simple';
const W11_SIMPLE_PAGES = [
    { id: 'plan-ville', label: 'Plan de la ville', render: () => w11SimplePlan() },
    { id: 'services-municipaux', label: 'Services municipaux', render: () => w11SimpleServices() },
    { id: 'annonces', label: 'Actualités et décrets', render: () => w11SimpleNews() }
];

function w11SimpleState() { return w11Load(W11_SIMPLE_KEY, {}) || {}; }

function w11SimplePlan() {
    if (typeof W7_POIS === 'undefined') return '';
    const groups = Object.keys(W7_CATS).map(cat => ({ cat, items: W7_POIS.filter(poi => poi.cat === cat) })).filter(group => group.items.length);
    return groups.map(group => `
        <h4 class="tn-w8-sub">${escapeHtml(t(W7_CATS[group.cat].label))}</h4>
        <ul class="tn-w11-list">${group.items.map(poi => {
            const state = typeof w7OpenState === 'function' ? w7OpenState(poi) : { open: true, text: '' };
            return `<li><div><strong data-no-i18n>${escapeHtml(poi.name)}</strong>
                <span class="tn-w9-meta" data-no-i18n>${escapeHtml(t(poi.sector))} · ${escapeHtml(state.text)} · ${escapeHtml(state.open ? t('Ouvert maintenant') : t('Fermé maintenant'))}</span>
                <span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('Contact : {c}', { c: poi.contact }))}</span></div></li>`;
        }).join('')}</ul>`).join('');
}

function w11SimpleServices() {
    const services = typeof tnServices !== 'undefined' ? tnServices : [];
    return `<ul class="tn-w11-list">${services.map(service => {
        const outage = typeof w5Outage === 'function' ? w5Outage(service.name) : null;
        return `<li><div><strong data-no-i18n>${escapeHtml(t(service.name))}</strong> ${w11Badge(outage)}
            <span class="tn-w9-meta" data-no-i18n>${escapeHtml(service.description)}</span></div>
            <button type="button" class="tn-tab" data-w11="request" data-service="${escapeHtml(service.name)}">${W11T('Faire une demande')}</button></li>`;
    }).join('')}</ul>`;
}

function w11SimpleNews() {
    if (typeof newsData === 'undefined') return '';
    return `<ul class="tn-w11-list">${newsData.map((article, index) => `
        <li><div><strong data-no-i18n>${escapeHtml(t(article.title))}</strong>
            <span class="tn-w9-meta" data-no-i18n>${escapeHtml(t(article.badge))} · ${escapeHtml(t(article.date))}</span></div>
            <button type="button" class="tn-tab" onclick="openNewsDetail(${index})">${W11T('Lire')}</button></li>`).join('')}</ul>`;
}

function w11ApplySimple(id, on) {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.toggle('w11-on', on);
    const view = section.querySelector(':scope > .w11-simple');
    const page = W11_SIMPLE_PAGES.find(item => item.id === id);
    if (view && page) { view.hidden = !on; if (on) view.innerHTML = `<p class="tn-hint">${W11T('Version simple : une liste de texte, rapide à charger et à lire.')}</p>${page.render()}`; }
    const button = section.querySelector('.w11-simple-btn');
    if (button) {
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
        button.textContent = t(on ? 'Version complète' : 'Version simple');
    }
}

function w11SetSimple(id, on, silent) {
    const state = w11SimpleState();
    state[id] = on;
    w11Save(W11_SIMPLE_KEY, state);
    w11ApplySimple(id, on);
    if (!silent) announce(on ? t('Version simple affichée.') : t('Version complète affichée.'));
}

function w11InitSimple() {
    const state = w11SimpleState();
    W11_SIMPLE_PAGES.forEach(page => {
        const section = document.getElementById(page.id);
        if (!section || section.querySelector('.w11-simple')) return;
        const head = section.firstElementChild;
        if (!head) return;
        head.classList.add('w11-keep');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tn-tab w11-simple-btn';
        button.dataset.w11 = 'simple';
        button.dataset.page = page.id;
        head.appendChild(button);
        const view = document.createElement('div');
        view.className = 'w11-simple w11-keep';
        view.hidden = true;
        section.appendChild(view);
        w11ApplySimple(page.id, !!state[page.id]);
    });
}

function w11RefreshSimple() {
    const state = w11SimpleState();
    W11_SIMPLE_PAGES.forEach(page => w11ApplySimple(page.id, !!state[page.id]));
}

// ==========================================================
// F64 — L'état des services, visible avant toute démarche
// ==========================================================
const W11_LABEL = { available: 'Disponible', maintenance: 'En maintenance', incident: 'Incident en cours', disabled: 'Désactivé' };

function w11Badge(outage) {
    const state = outage ? outage.state : 'available';
    const cls = state === 'available' ? 'resolved' : 'pending';
    const icon = state === 'available' ? '✓' : state === 'disabled' ? '⛔' : '⚠';
    return `<span class="tn-badge tn-badge--${cls}" data-no-i18n>${icon} ${escapeHtml(t(W11_LABEL[state] || 'Indisponible'))}</span>`;
}

function w11NextAction(service, outage) {
    if (!outage) return `<button type="button" class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase" data-w11="request" data-service="${escapeHtml(service)}">${W11T('Faire une demande')}</button>`;
    const alt = outage.alt && outage.alt !== service && !w5Outage(outage.alt) ? outage.alt : '';
    const wait = outage.state === 'disabled'
        ? `<span class="tn-w9-meta">${W11T('Les nouvelles demandes sont suspendues pour ce service.')}</span>`
        : `<button type="button" class="tn-tab" data-w11="request" data-service="${escapeHtml(service)}">${W11T('Envoyer quand même (traité au retour)')}</button>`;
    return `${wait}${alt ? ` <button type="button" class="tn-tab" data-w11="request" data-service="${escapeHtml(alt)}">${escapeHtml(t('Contacter : {s}', { s: t(alt) }))}</button>` : ''}`;
}

function w11BoardHtml() {
    const rows = W5_SERVICES.map(name => ({ name, outage: w5Outage(name) }));
    const down = rows.filter(row => row.outage).length;
    const summary = down ? t('{n} service(s) sur {total} ne sont pas disponibles.', { n: down, total: rows.length }) : t('Tous les services sont disponibles.');
    return `
        <div class="tn-eyebrow">${W11T('État des services')}</div>
        <p class="tn-w9-lead" data-no-i18n><strong>${escapeHtml(summary)}</strong> <span class="tn-w9-meta" style="display:inline">${escapeHtml(t('Vérifié à {h}', { h: w11Clock() }))}</span></p>
        <ul class="tn-w11-board">${rows.map(row => `
            <li class="tn-w11-row tn-w11-row--${row.outage ? row.outage.state : 'available'}">
                <div class="tn-w11-row-main"><strong data-no-i18n>${escapeHtml(t(row.name))}</strong> ${w11Badge(row.outage)}
                    ${row.outage ? `<span class="tn-w9-meta" data-no-i18n>${escapeHtml(row.outage.reason ? t(row.outage.reason) : '')}${row.outage.reason ? ' · ' : ''}${escapeHtml(w5BackText(row.outage))}</span>
                    ${row.outage.todo ? `<span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('À faire en attendant :'))} ${escapeHtml(t(row.outage.todo))}</span>` : ''}` : `<span class="tn-w9-meta">${W11T('Vous pouvez déposer une demande dès maintenant.')}</span>`}</div>
                <div class="tn-w11-row-act">${w11NextAction(row.name, row.outage)}</div>
            </li>`).join('')}</ul>`;
}

function w11RenderBoard() {
    const section = document.getElementById('services-municipaux');
    if (!section) return;
    let board = document.getElementById('w11-status');
    if (!board) {
        board = document.createElement('div');
        board.id = 'w11-status';
        board.className = 'holo-card p-6 relative tn-w11-statusboard w11-keep-complex';
        board.setAttribute('role', 'region');
        board.setAttribute('aria-label', t('État des services'));
        const head = section.firstElementChild;
        (head || section).after(board);
        board.classList.add('w11-keep');
    }
    board.innerHTML = w11BoardHtml();
}

// Une ligne « disponible » ou « interrompu » juste à côté du choix du service, dans le formulaire et pour les rendez-vous
function w11ContactService() {
    if (typeof contactMode !== 'undefined' && contactMode === 'report' && typeof readReportFields === 'function') {
        try { return readReportFields().service; } catch (err) { }
    }
    const select = document.getElementById('contact-service');
    return select ? select.value : '';
}

function w11RenderFormStates() {
    const contactBox = document.getElementById('contact-service-status');
    if (contactBox) {
        const service = w11ContactService();
        const outage = service ? w5Outage(service) : null;
        let ok = document.getElementById('w11-contact-state');
        if (!ok) { ok = document.createElement('p'); ok.id = 'w11-contact-state'; ok.setAttribute('role', 'status'); contactBox.after(ok); }
        const reportMode = typeof contactMode !== 'undefined' && contactMode === 'report';
        if (!outage) {
            ok.className = 'tn-w11-ok';
            ok.innerHTML = service ? `<span class="tn-badge tn-badge--resolved" data-no-i18n>✓ ${escapeHtml(t('Disponible'))}</span> ${W11T('Ce service est disponible : vous pouvez envoyer votre demande.')}` : '';
        } else if (reportMode || outage.state === 'disabled') {
            ok.className = 'tn-w11-down';
            const alt = outage.alt && outage.alt !== service && !w5Outage(outage.alt) ? outage.alt : '';
            ok.innerHTML = `${w11Badge(outage)} <strong data-no-i18n>${escapeHtml(t(service))}</strong> — <span data-no-i18n>${escapeHtml(w5BackText(outage))}</span>
                ${outage.state === 'disabled' ? `<span class="tn-hint">${W11T('Les nouvelles demandes sont suspendues pour ce service.')}</span>` : ''}
                ${alt ? `<button type="button" class="tn-link" data-w11="request" data-service="${escapeHtml(alt)}">${escapeHtml(t('Contacter : {s}', { s: t(alt) }))}</button>` : ''}`;
        } else {
            ok.className = 'tn-w11-down';
            ok.innerHTML = '';
        }
    }
    const apptBox = document.getElementById('appt-service-status');
    if (apptBox && typeof w5Pick !== 'undefined' && !apptBox.innerHTML.trim() && w5Pick.service) {
        apptBox.innerHTML = `<p class="tn-w11-ok"><span class="tn-badge tn-badge--resolved" data-no-i18n>✓ ${escapeHtml(t('Disponible'))}</span> ${W11T('Ce service est disponible : vous pouvez prendre rendez-vous.')}</p>`;
    }
}

function w11RenderChips() {
    (typeof tnServices !== 'undefined' ? tnServices : []).forEach(service => {
        const outage = w5Outage(service.name);
        let chip = service.card.querySelector('.w11-chip');
        if (!chip) {
            chip = document.createElement('p');
            chip.className = 'w11-chip';
            const slot = service.card.querySelector('.tn-svc-slot');
            (slot || service.card.querySelector('h3')).after(chip);
        }
        chip.innerHTML = outage ? '' : w11Badge(null);
    });
}

// Aller faire une demande auprès d'un service : le choix est déjà fait
function w11GoRequest(service) {
    if (typeof goToSection === 'function') goToSection('demarches');
    setTimeout(() => {
        const select = document.getElementById('contact-service');
        if (select) {
            select.value = service;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            select.focus();
        }
    }, 250);
}

// ==========================================================
// F63 — Couper ou rétablir un service en un clic
// ==========================================================
const W11_REASONS = ['Panne technique', 'Maintenance imprévue', 'Surcharge du service', 'Incident de sécurité'];
const W11_RETURNS = [['', 'Je ne sais pas encore'], ['1', 'Dans 1 heure'], ['3', 'Dans 3 heures'], ['tomorrow', 'Demain à 8 h']];
const W11_ALT = {
    'Santé Biotech & Cryo-Soins': 'Sécurité Civile & Sentinelles',
    'Sécurité Civile & Sentinelles': 'Santé Biotech & Cryo-Soins'
};
let w11UndoTimer = null;

function w11BackStamp(choice) {
    if (!choice) return '';
    if (choice === 'tomorrow') {
        const date = new Date(); date.setDate(date.getDate() + 1); date.setHours(8, 0, 0, 0);
        return `${w5Day(date)}T${w5Pad(date.getHours())}:${w5Pad(date.getMinutes())}`;
    }
    return w5RoundedLater(Number(choice));
}

function w11SetService(service, entry, undo) {
    if (!w11Staff()) { announce(t('Action réservée aux agents et administrateurs.')); return; }
    const map = w5StatusMap();
    const prev = map[service] ? JSON.parse(JSON.stringify(map[service])) : null;
    const fmt = e => e ? { etat: t(W11_LABEL[e.state] || e.state), raison: e.reason || '', retour: e.backAt || '', alternative: e.alt || '', conseil: e.todo || '' } : { etat: t('Disponible') };
    if (entry) map[service] = entry; else delete map[service];
    w5Save(W5_STORE.status, map);
    if (typeof w4Audit === 'function') {
        const label = entry ? (entry.state === 'disabled' ? 'désactivé' : 'en maintenance') : 'rétabli';
        w4Audit(`Disponibilité de « ${service} » : ${undo ? 'annulation, ' : ''}${label}`, { category: 'service', target: 'service:' + service, targetLabel: service, before: fmt(prev), after: fmt(entry) });
    }
    w5RenderStatuses();
    if (typeof w5RenderStatusAdminList === 'function') w5RenderStatusAdminList();
    w11Refresh();
    if (!undo) w11ShowUndo(service, prev, entry);
}

function w11ShowUndo(service, prev, entry) {
    let box = document.getElementById('w11-undo');
    if (!box) { box = document.createElement('div'); box.id = 'w11-undo'; box.className = 'tn-w11-undo'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    box.hidden = false;
    box.innerHTML = `<span data-no-i18n>${escapeHtml(entry ? t('« {s} » est désactivé.', { s: t(service) }) : t('« {s} » est rétabli.', { s: t(service) }))}</span>
        <button type="button" class="tn-tab" data-w11="undo">${W11T('Annuler')}</button>`;
    box.querySelector('[data-w11="undo"]').onclick = () => { w11SetService(service, prev, true); box.hidden = true; announce(t('Action annulée.')); };
    clearTimeout(w11UndoTimer);
    w11UndoTimer = setTimeout(() => { box.hidden = true; }, 9000);
    announce(entry ? t('Service désactivé. Les habitants voient l\'état tout de suite.') : t('Service rétabli.'));
}

function w11OpenDisable(service) {
    const alt = W11_ALT[service] || '';
    w4OpenDialog(escapeHtml(t('Désactiver « {s} »', { s: t(service) })), `
        <p class="tn-hint">${W11T('Les nouvelles demandes et les rendez-vous de ce service seront suspendus, et les habitants verront l\'état tout de suite. Vous pourrez annuler.')}</p>
        <form id="w11-disable-form" autocomplete="off">
            <label class="tn-field-label" for="w11-reason">${W11T('Raison affichée aux habitants')}</label>
            <select id="w11-reason" class="cyber-input" data-autofocus>${W11_REASONS.map(reason => `<option value="${escapeHtml(reason)}">${escapeHtml(t(reason))}</option>`).join('')}</select>
            <label class="tn-field-label" for="w11-back">${W11T('Retour prévu')}</label>
            <select id="w11-back" class="cyber-input">${W11_RETURNS.map(item => `<option value="${item[0]}">${escapeHtml(t(item[1]))}</option>`).join('')}</select>
            <label class="tn-field-label" for="w11-alt">${W11T('Service à contacter en attendant')}</label>
            <select id="w11-alt" class="cyber-input"><option value="">${W11T('Aucun')}</option>${W5_SERVICES.filter(name => name !== service).map(name => `<option value="${escapeHtml(name)}"${name === alt ? ' selected' : ''}>${escapeHtml(t(name))}</option>`).join('')}</select>
            <div class="tn-dialog-actions">
                <button type="submit" class="tn-btn-danger">${W11T('Désactiver maintenant')}</button>
                <button type="button" class="tn-tab" data-dialog-close>${W11T('Annuler')}</button>
            </div>
        </form>`);
    document.getElementById('w11-disable-form').addEventListener('submit', event => {
        event.preventDefault();
        const reason = document.getElementById('w11-reason').value;
        const back = w11BackStamp(document.getElementById('w11-back').value);
        const altChoice = document.getElementById('w11-alt').value;
        w4CloseDialog();
        w11SetService(service, {
            state: 'disabled', reason, backAt: back, alt: altChoice,
            todo: altChoice ? 'Contactez le service indiqué ci-dessous.' : 'Réessayez plus tard : une nouvelle information sera affichée ici.',
            since: new Date().toISOString()
        });
    });
}

function w11RenderSwitches() {
    const body = document.getElementById('w11-switches-body');
    if (!body) return;
    const rows = W5_SERVICES.map(name => ({ name, outage: w5Outage(name) }));
    const down = rows.filter(row => row.outage).length;
    body.innerHTML = `
        <ul class="tn-w11-board">${rows.map(row => `
            <li class="tn-w11-row tn-w11-row--${row.outage ? row.outage.state : 'available'}">
                <div class="tn-w11-row-main"><strong data-no-i18n>${escapeHtml(t(row.name))}</strong> ${w11Badge(row.outage)}
                    ${row.outage ? `<span class="tn-w9-meta" data-no-i18n>${escapeHtml(row.outage.reason ? t(row.outage.reason) : '')}${row.outage.reason ? ' · ' : ''}${escapeHtml(w5BackText(row.outage))}</span>` : ''}</div>
                <div class="tn-w11-row-act">${row.outage
                    ? `<button type="button" class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase" data-w11="restore" data-service="${escapeHtml(row.name)}">${W11T('Rétablir')}</button>`
                    : `<button type="button" class="tn-btn-danger" data-w11="disable" data-service="${escapeHtml(row.name)}">${W11T('Désactiver')}</button>`}</div>
            </li>`).join('')}</ul>
        ${down ? `<div class="tn-row-actions"><button type="button" class="tn-tab" data-w11="restore-all">${W11T('Tout rétablir')}</button></div>` : ''}`;
}

function w11InitSwitches() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w11-switches')) return;
    const panel = document.createElement('div');
    panel.id = 'w11-switches';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = 'Interrupteurs des services';
    panel.innerHTML = `
        <div class="tn-eyebrow">${W11T('Disponibilité des services')}</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">${W11T('INTERRUPTEURS DES SERVICES')}</h3>
        <p class="tn-hint">${W11T('Un service défectueux ? Désactivez-le en deux clics. Les nouvelles demandes et les rendez-vous sont suspendus, les habitants voient l\'état tout de suite, et l\'action est inscrite au journal.')}</p>
        <div id="w11-switches-body"></div>`;
    const admin = document.getElementById('service-status-admin');
    if (admin) admin.before(panel); else workspace.appendChild(panel);
    // L'état « Désactivé » devient aussi un choix du formulaire détaillé
    const select = document.getElementById('svc-state');
    if (select && !select.querySelector('option[value="disabled"]')) {
        const option = document.createElement('option');
        option.value = 'disabled';
        option.textContent = 'Désactivé (demandes suspendues)';
        select.appendChild(option);
    }
    w11RenderSwitches();
}

// ---------- Rafraîchissement commun ----------
function w11Refresh() {
    w11RenderBoard();
    w11RenderChips();
    w11RenderFormStates();
    w11RenderSwitches();
    w11RefreshSimple();
}

document.addEventListener('click', event => {
    const button = event.target.closest('[data-w11]');
    if (!button) return;
    switch (button.dataset.w11) {
        case 'lowfx': w11SetLowFx(!w11LowFx()); break;
        case 'simple': w11SetSimple(button.dataset.page, button.getAttribute('aria-pressed') !== 'true'); break;
        case 'request': w11GoRequest(button.dataset.service); break;
        case 'disable': w11OpenDisable(button.dataset.service); break;
        case 'restore': w11SetService(button.dataset.service, null); break;
        case 'restore-all': {
            const names = W5_SERVICES.filter(name => w5Outage(name));
            names.forEach(name => w11SetService(name, null, true));
            announce(t('Tous les services sont rétablis.'));
            break;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    W5_STATE_LABEL.disabled = 'Désactivé';
    w11InitPerfCard();
    w11InitSimple();
    w11InitSwitches();

    // F63 : un service désactivé ne reçoit plus de nouvelles demandes
    if (typeof handleContactMunicipal === 'function') {
        const baseContact = handleContactMunicipal;
        handleContactMunicipal = function (event) {
            const service = w11ContactService();
            const outage = service ? w5Outage(service) : null;
            if (outage && outage.state === 'disabled') {
                event.preventDefault();
                w11RenderFormStates();
                announce(t('Ce service est désactivé : votre demande n\'a pas été envoyée.'));
                const box = document.getElementById('w11-contact-state');
                if (box) box.scrollIntoView({ block: 'center' });
                return false;
            }
            return baseContact.apply(this, arguments);
        };
    }
    if (typeof w5RenderStatuses === 'function') {
        const baseStatuses = w5RenderStatuses;
        w5RenderStatuses = function () { const result = baseStatuses.apply(this, arguments); try { w11Refresh(); } catch (err) { } return result; };
    }
    if (typeof w5RenderApptServiceState === 'function') {
        const baseAppt = w5RenderApptServiceState;
        w5RenderApptServiceState = function () { const result = baseAppt.apply(this, arguments); try { w11RenderFormStates(); } catch (err) { } return result; };
    }
    ['contact-service', 'report-kind', 'report-sector'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('change', () => setTimeout(w11RenderFormStates, 0)); });
    if (typeof setContactMode === 'function') {
        const baseMode = setContactMode;
        setContactMode = function () { const result = baseMode.apply(this, arguments); w11RenderFormStates(); return result; };
    }

    w11Refresh();
    document.addEventListener('tn:langchange', () => { w11Refresh(); w11RenderPerf(); w11InitSimple(); });
    window.addEventListener('storage', event => { if (event.key === W5_STORE.status) w11Refresh(); });
    setInterval(() => { if (!document.hidden) w11Refresh(); }, 30000);
    setInterval(() => { if (!document.hidden) w11RenderPerf(); }, 10000);
});
