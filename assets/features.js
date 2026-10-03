// ==========================================
// VAGUE 2 — fonctionnalités citoyens et agents
// D11 suivi, D12 premiers pas, D15 fil d'Ariane, D16 confirmation, D17 charge de travail,
// F25 signalement, F26 historique, F28 services à la une.
// Chargé avant le script principal de index.html, dont il utilise l'état global
// (citizenTickets, activeCitizen, registeredCitizens, currentRole, escapeHtml, announce).
// Les libellés sont écrits en français : assets/i18n.js les traduit à l'affichage.
// ==========================================

const TN_SECTIONS = [
    { id: 'accueil', label: 'Accueil' },
    { id: 'services-municipaux', label: 'Services municipaux' },
    { id: 'annonces', label: 'Actualités & décrets' },
    { id: 'demarches', label: 'Signalement & contact' },
    { id: 'espace-citoyen', label: 'Espace citoyen' },
    { id: 'espace-agent', label: 'Espace agents' }
];

const TN_STATUS_CLASS = { 'En attente': 'pending', 'En cours': 'progress', 'Résolu': 'resolved' };

function tnLocalStamp(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function tnParseStamp(stamp) {
    const date = stamp ? new Date(String(stamp).replace(' ', 'T')) : null;
    return date && !isNaN(date) ? date : null;
}

function tnFormatStamp(stamp) {
    const date = tnParseStamp(stamp);
    if (!date) return t('date non enregistrée');
    return date.toLocaleString(tnLocale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function tnFormatAge(stamp) {
    const date = tnParseStamp(stamp);
    if (!date) return '—';
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 60) return t('{n} min', { n: minutes });
    if (minutes < 1440) return t('{h} h {m} min', { h: Math.floor(minutes / 60), m: minutes % 60 });
    return t('{d} j {h} h', { d: Math.floor(minutes / 1440), h: Math.floor((minutes % 1440) / 60) });
}

// ==========================================
// D15 — FIL D'ARIANE, SECTION COURANTE ET SÉLECTEUR DE LANGUE (D14)
// ==========================================
let tnLocationKey = null;
let tnLocationFrame = null;

function initLocationBar() {
    const nav = document.getElementById('site-nav');
    if (!nav) return;

    const bar = document.createElement('div');
    bar.id = 'tn-locbar';
    bar.innerHTML = `
        <nav aria-label="Fil d'Ariane">
            <ol class="tn-crumbs" id="tn-crumbs"></ol>
        </nav>
        <div class="tn-lang">
            <i aria-hidden="true" class="fa-solid fa-language"></i>
            <label for="tn-lang-select" class="sr-only">Langue de l'interface</label>
            <select id="tn-lang-select" data-no-i18n onchange="setLanguage(this.value)">
                ${Object.keys(TN_LANGS).map(code => `<option value="${code}" lang="${code}" ${code === tnLang ? 'selected' : ''}>${code.toUpperCase()} — ${TN_LANGS[code]}</option>`).join('')}
            </select>
        </div>
    `;
    nav.appendChild(bar);

    const schedule = () => {
        if (tnLocationFrame) return;
        tnLocationFrame = requestAnimationFrame(() => {
            tnLocationFrame = null;
            updateLocation();
        });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    updateLocation();
}

// Détermine la section (et le bloc) affichés sous les barres collantes, puis met à jour le fil d'Ariane
function updateLocation(force = false) {
    const crumbs = document.getElementById('tn-crumbs');
    const nav = document.getElementById('site-nav');
    if (!crumbs || !nav) return;

    const offset = Math.max(nav.getBoundingClientRect().bottom, 0) + 24;
    let section = TN_SECTIONS[0];
    TN_SECTIONS.forEach(candidate => {
        const el = document.getElementById(candidate.id);
        if (el && el.getBoundingClientRect().top <= offset) section = candidate;
    });

    let crumb = null;
    document.getElementById(section.id).querySelectorAll('[data-crumb]').forEach(el => {
        if (el.offsetParent !== null && el.getBoundingClientRect().top <= offset + 48) crumb = el.dataset.crumb;
    });

    const key = `${section.id}|${crumb || ''}|${tnLang}`;
    if (!force && key === tnLocationKey) return;
    tnLocationKey = key;

    const trail = [{ label: 'Terra Nova', href: '#accueil' }, { label: t(section.label), href: `#${section.id}` }];
    if (crumb) trail.push({ label: t(crumb), href: null });

    crumbs.innerHTML = trail.map((item, index) => index === trail.length - 1
        ? `<li data-no-i18n><span aria-current="location">${escapeHtml(item.label)}</span></li>`
        : `<li data-no-i18n><a href="${item.href}">${escapeHtml(item.label)}</a></li>`
    ).join('');

    nav.querySelectorAll(':scope > div:first-child a').forEach(link => {
        if (link.getAttribute('href') === `#${section.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
    });
}

// ==========================================
// F28 — SERVICES À LA UNE (prioritaires et plus demandés)
// ==========================================
const TN_DEFAULT_FEATURED = ['Mairie & État Civil Spatial', 'Transports & Hyper-Tubes', 'Santé Biotech & Cryo-Soins'];
// Le titre d'une carte du catalogue peut différer du nom de service enregistré dans les demandes
const TN_SERVICE_NAMES = { 'Dôme Atmosphère & Biosphère': 'Atmosphère & Biosphère' };
let tnServices = [];

function loadFeaturedServices() {
    try {
        const stored = JSON.parse(localStorage.getItem('tn_featured_services'));
        if (Array.isArray(stored)) return stored;
    } catch (e) { }
    return TN_DEFAULT_FEATURED.slice();
}

function initFeaturedServices() {
    const grid = document.getElementById('services-grid');
    if (!grid) return;

    tnServices = Array.from(grid.querySelectorAll('.service-item')).map((card, index) => {
        const heading = card.querySelector('h3');
        const title = heading.textContent.trim();
        const proceduresLabel = Array.from(card.querySelectorAll('span')).find(span => span.textContent.trim() === 'Démarches :');

        const flag = document.createElement('span');
        flag.className = 'tn-badge tn-badge--progress';
        flag.textContent = 'Prioritaire';
        flag.hidden = true;
        heading.after(flag);

        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'tn-pin';
        pin.hidden = true;
        pin.addEventListener('click', () => toggleFeaturedService(index));
        heading.parentElement.appendChild(pin);

        return {
            card, title, flag, pin,
            name: TN_SERVICE_NAMES[title] || title,
            procedures: proceduresLabel && proceduresLabel.nextElementSibling ? proceduresLabel.nextElementSibling.textContent.trim() : ''
        };
    });

    const strip = document.createElement('div');
    strip.id = 'featured-services';
    strip.tabIndex = -1;
    strip.dataset.crumb = 'Services à la une';
    grid.before(strip);
    grid.dataset.crumb = 'Catalogue complet';

    renderFeaturedServices();
}

function renderFeaturedServices() {
    const strip = document.getElementById('featured-services');
    if (!strip) return;

    const featured = loadFeaturedServices();
    const canEdit = currentRole !== 'citizen';
    const usage = service => citizenTickets.filter(ticket => ticket.service === service.name).length;
    const maxUsage = Math.max(0, ...tnServices.map(usage));

    tnServices.forEach(service => {
        const on = featured.includes(service.name);
        service.card.style.order = on ? '-1' : '';
        service.flag.hidden = !on;
        service.pin.hidden = !canEdit;
        service.pin.setAttribute('aria-pressed', String(on));
        service.pin.textContent = on ? 'Retirer de la une' : 'Mettre en avant';
    });

    const list = tnServices
        .map((service, index) => ({ service, index, count: usage(service) }))
        .filter(entry => featured.includes(entry.service.name))
        .sort((a, b) => b.count - a.count);
    let topMarked = false;

    strip.innerHTML = `
        <div class="tn-eyebrow">Services à la une</div>
        <h3 class="font-orbitron font-bold text-xl text-[#E6F1F7] uppercase mt-1">DÉMARCHES LES PLUS COURANTES</h3>
        <p class="tn-hint">Les services prioritaires et les plus demandés, sans parcourir tout le catalogue.</p>
        ${list.length ? `
            <ol class="tn-featured-list">
                ${list.map(entry => {
                    const top = !topMarked && maxUsage > 0 && entry.count === maxUsage;
                    if (top) topMarked = true;
                    return `
                        <li class="tn-featured-item">
                            <div>
                                <div class="tn-featured-name">${escapeHtml(entry.service.title)}</div>
                                <div class="tn-featured-meta">
                                    <span class="tn-badge tn-badge--progress">Prioritaire</span>
                                    ${top ? `<span class="tn-badge tn-badge--pending">Le plus demandé</span>` : ''}
                                    <span>${escapeHtml(entry.service.procedures)}</span>
                                    <span class="tn-featured-count" data-no-i18n>${t('{n} demande(s) reçue(s)', { n: entry.count })}</span>
                                </div>
                            </div>
                            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="startFeaturedService(${entry.index})">Commencer</button>
                        </li>
                    `;
                }).join('')}
            </ol>
        ` : `<p class="tn-empty">Aucun service mis en avant pour le moment.</p>`}
    `;
}

function toggleFeaturedService(index) {
    const service = tnServices[index];
    const featured = loadFeaturedServices();
    const position = featured.indexOf(service.name);
    if (position === -1) featured.push(service.name);
    else featured.splice(position, 1);
    localStorage.setItem('tn_featured_services', JSON.stringify(featured));

    renderFeaturedServices();
    announce(t(position === -1 ? 'Service mis en avant : {name}' : 'Service retiré de la une : {name}', { name: t(service.title) }));
}

// Lance l'action principale de la carte du catalogue (contact prérempli ou inscription)
function startFeaturedService(index) {
    const action = tnServices[index].card.querySelector('button.btn-cyber');
    if (action) action.click();
}

// ==========================================
// F25 — SIGNALEMENT D'UN PROBLÈME (quoi et où, service attribué automatiquement)
// ==========================================
const TN_REPORT_KINDS = [
    { label: 'Éclairage public en panne', service: 'Énergie Plasma & Réacteur Zéro' },
    { label: 'Voirie, passerelle ou coursive dégradée', service: 'Transports & Hyper-Tubes' },
    { label: 'Station ou capsule Hyper-Tube', service: 'Transports & Hyper-Tubes' },
    { label: "Fuite d'air, d'eau ou de fluide", service: 'Atmosphère & Biosphère' },
    { label: 'Propreté, déchets, végétation', service: 'Atmosphère & Biosphère' },
    { label: 'Danger ou incident de sécurité', service: 'Sécurité Civile & Sentinelles' },
    { label: 'Autre problème', service: 'Mairie & État Civil Spatial' }
];
const TN_SECTORS = ['Dôme Alpha - Anneau 1', 'Dôme Bêta - Anneau 2', 'Anneau Orbital Zéro', 'Secteur Sud Extérieur', 'Je ne sais pas'];
let contactMode = 'contact';

function initContactModes() {
    const form = document.getElementById('contact-municipal-form');
    if (!form) return;

    const tabs = document.createElement('div');
    tabs.id = 'contact-mode';
    tabs.className = 'tn-tabs';
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Type de demande');
    tabs.innerHTML = `
        <button type="button" class="tn-tab" data-mode="contact" aria-pressed="true" onclick="setContactMode('contact')">Contacter un service</button>
        <button type="button" class="tn-tab" data-mode="report" aria-pressed="false" onclick="setContactMode('report')">Signaler un problème</button>
    `;
    form.prepend(tabs);

    const fields = document.createElement('div');
    fields.id = 'report-fields';
    fields.hidden = true;
    fields.innerHTML = `
        <p class="tn-hint">Vous n'avez pas à savoir quel service contacter : votre signalement est transmis au bon service.</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="flex flex-col space-y-2">
                <label for="report-kind" class="text-xs text-[#6F8696] uppercase tracking-wider">Nature du problème</label>
                <select id="report-kind" class="cyber-input py-2 px-2 text-xs cursor-pointer" onchange="updateReportRouting()">
                    ${TN_REPORT_KINDS.map(kind => `<option>${escapeHtml(kind.label)}</option>`).join('')}
                </select>
                <p id="report-routing" class="tn-hint" data-no-i18n aria-live="polite"></p>
            </div>
            <div class="flex flex-col space-y-2">
                <label for="report-sector" class="text-xs text-[#6F8696] uppercase tracking-wider">Secteur concerné</label>
                <select id="report-sector" class="cyber-input py-2 px-2 text-xs cursor-pointer">
                    ${TN_SECTORS.map(sector => `<option>${escapeHtml(sector)}</option>`).join('')}
                </select>
            </div>
        </div>
        <div class="flex flex-col space-y-2">
            <label for="report-place" class="text-xs text-[#6F8696] uppercase tracking-wider">Adresse ou repère précis</label>
            <input type="text" id="report-place" placeholder="ex: Coursive 12, face au sas B — lampadaire n° 47" class="cyber-input py-2 px-2 text-xs">
        </div>
    `;
    form.querySelector('.grid').after(fields);

    form.dataset.crumb = 'Contacter un service';
    updateReportRouting();
}

function setContactMode(mode) {
    const form = document.getElementById('contact-municipal-form');
    if (!form) return;
    contactMode = mode;
    const report = mode === 'report';

    document.querySelectorAll('#contact-mode .tn-tab').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode)));
    document.getElementById('report-fields').hidden = !report;

    // En signalement, le service, le type et l'objet sont déduits de la nature du problème et du lieu
    ['contact-service', 'contact-category', 'contact-subject'].forEach(id => {
        document.getElementById(id).closest('.flex-col').style.display = report ? 'none' : '';
    });
    // Les champs restés seuls sur leur ligne prennent toute la largeur
    ['contact-name', 'contact-priority'].forEach(id => {
        document.getElementById(id).closest('.flex-col').style.gridColumn = report ? '1 / -1' : '';
    });
    document.getElementById('contact-subject').required = !report;
    document.getElementById('report-place').required = report;

    const message = document.getElementById('contact-message');
    form.querySelector('label[for="contact-message"]').textContent = report ? "Que s'est-il passé ?" : 'Description Détaillée du Besoin';
    message.placeholder = report
        ? 'ex: Le lampadaire est éteint depuis trois cycles et la coursive est dans le noir.'
        : 'Expliquez clairement votre problème ou votre requête aux agents municipaux...';
    form.querySelector('button[type="submit"] span').textContent = report ? 'Envoyer le signalement' : 'Transmettre à la Mairie';

    form.dataset.crumb = report ? 'Signaler un problème' : 'Contacter un service';
    updateReportRouting();
    updateLocation(true);
}

function updateReportRouting() {
    const select = document.getElementById('report-kind');
    const routing = document.getElementById('report-routing');
    if (!select || !routing) return;
    routing.textContent = t('Service compétent : {service} (attribué automatiquement)', { service: t(TN_REPORT_KINDS[select.selectedIndex].service) });
}

function readReportFields() {
    const kind = TN_REPORT_KINDS[document.getElementById('report-kind').selectedIndex];
    const place = document.getElementById('report-place').value.trim();
    return {
        kind: kind.label,
        service: kind.service,
        subject: `${kind.label} — ${place}`,
        location: { sector: document.getElementById('report-sector').value, place }
    };
}

// Objet affiché : la nature d'un signalement est traduite, le lieu saisi par l'habitant ne l'est pas
function tnTicketTitle(ticket) {
    return ticket.kind && ticket.location ? `${t(ticket.kind)} — ${ticket.location.place}` : ticket.subject;
}

function tnTicketPlace(ticket) {
    if (!ticket.location) return '';
    return ticket.location.sector === 'Je ne sais pas' ? ticket.location.place : `${t(ticket.location.sector)} — ${ticket.location.place}`;
}

// ==========================================
// D16 — CONFIRMATION CLAIRE APRÈS L'ENVOI
// ==========================================
let tnConfirmedTicket = null;

// Même demande, non résolue, envoyée par la même personne dans les 10 dernières minutes
function findRecentDuplicate(name, service, subject) {
    return citizenTickets.find(ticket => {
        const sent = tnParseStamp(ticket.date);
        return ticket.citizenName === name && ticket.service === service && ticket.subject === subject
            && ticket.status !== 'Résolu' && sent && Date.now() - sent.getTime() < 10 * 60000;
    });
}

function renderSubmissionConfirmation() {
    const receipt = document.getElementById('contact-receipt');
    const ticket = tnConfirmedTicket;
    if (!receipt || !ticket) return;

    receipt.className = 'tn-confirm';
    receipt.dataset.crumb = 'Demande envoyée';
    receipt.innerHTML = `
        <div class="tn-confirm-title">
            <i aria-hidden="true" class="fa-solid fa-circle-check"></i>
            <span>DEMANDE BIEN ENREGISTRÉE</span>
        </div>
        <p class="tn-hint mt-2">Votre demande a été transmise. Vous n'avez pas besoin de la renvoyer.</p>
        <div class="tn-confirm-id">
            <span class="tn-kpi-label">Numéro de suivi</span>
            <strong data-no-i18n>${escapeHtml(ticket.id)}</strong>
        </div>
        <dl class="tn-facts">
            <dt>Service destinataire</dt><dd>${escapeHtml(ticket.service)}</dd>
            <dt>Objet</dt><dd data-no-i18n>${escapeHtml(tnTicketTitle(ticket))}</dd>
            ${ticket.location ? `<dt>Lieu</dt><dd data-no-i18n>${escapeHtml(tnTicketPlace(ticket))}</dd>` : ''}
            <dt>Envoyée le</dt><dd data-no-i18n>${tnFormatStamp(ticket.date)}</dd>
            <dt>État actuel</dt><dd><span class="tn-badge tn-badge--pending">En attente de prise en charge par un agent</span></dd>
        </dl>
        <p class="tn-hint mt-4">${activeCitizen
            ? 'Prochaine étape : un agent municipal prend en charge votre demande. Son état est mis à jour dans votre espace citoyen.'
            : "Conservez ce numéro : connectez-vous pour suivre vos demandes dans l'espace citoyen."}</p>
        <div class="tn-confirm-actions">
            ${activeCitizen
                ? `<button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="goToTracker('${escapeHtml(ticket.id)}')">Suivre ma demande</button>`
                : `<button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="openAuthModal('login')">Se Connecter</button>`}
            <button type="button" class="btn-cyber btn-amber px-4 py-2 text-xs font-bold uppercase" onclick="resetContactForm()">Envoyer une autre demande</button>
        </div>
    `;
}

// Le formulaire laisse place à la confirmation : impossible de renvoyer la même demande par erreur
function showSubmissionConfirmation(ticket) {
    tnConfirmedTicket = ticket;
    document.getElementById('contact-municipal-form').hidden = true;
    renderSubmissionConfirmation();

    const receipt = document.getElementById('contact-receipt');
    receipt.scrollIntoView({ block: 'center' });
    receipt.focus();
    announce(t('Demande {id} enregistrée et transmise au service {service}.', { id: ticket.id, service: t(ticket.service) }));
    updateLocation(true);
}

function resetContactForm() {
    const form = document.getElementById('contact-municipal-form');
    const receipt = document.getElementById('contact-receipt');
    tnConfirmedTicket = null;
    receipt.className = 'hidden';
    receipt.innerHTML = '';
    delete receipt.dataset.crumb;
    form.hidden = false;
    form.querySelector(contactMode === 'report' ? '#report-kind' : '#contact-service').focus();
    updateLocation(true);
}

// ==========================================
// D11 & F26 — SUIVI DES DÉMARCHES ET HISTORIQUE DANS L'ESPACE CITOYEN
// ==========================================
let trackerView = 'active';
let trackerQuery = '';
let trackerStatus = 'all';

// Chaque changement d'état est daté. Les demandes antérieures à ce suivi reçoivent un historique minimal.
function tnTicketHistory(ticket) {
    if (!Array.isArray(ticket.history) || !ticket.history.length) {
        ticket.history = [{ status: 'En attente', date: ticket.date }];
        if (ticket.status !== 'En attente') ticket.history.push({ status: 'En cours', date: null });
        if (ticket.status === 'Résolu') ticket.history.push({ status: 'Résolu', date: null });
    }
    return ticket.history;
}

function recordTicketStep(ticket, status) {
    tnTicketHistory(ticket).push({ status, date: tnLocalStamp() });
}

function tnMyTickets() {
    if (!activeCitizen) return [];
    return citizenTickets.filter(ticket => ticket.citizenName.includes(activeCitizen.name) || ticket.citizenName.includes(activeCitizen.matricule));
}

function setTrackerView(view) {
    trackerView = view;
    renderCitizenTracker();
}

function renderCitizenTracker() {
    const box = document.getElementById('citizen-tracker');
    if (!box) return;

    if (!activeCitizen) {
        box.innerHTML = `
            <div class="tn-empty">
                <p>Connectez-vous pour retrouver vos démarches, leur état et leur historique.</p>
                <button type="button" class="btn-cyber px-4 py-2 mt-4 text-xs font-bold uppercase" onclick="openAuthModal('login')">Se Connecter</button>
            </div>
        `;
        return;
    }

    const all = tnMyTickets();
    const active = all.filter(ticket => ticket.status !== 'Résolu');

    box.innerHTML = `
        <div class="tn-tabs" role="group" aria-label="Mes démarches">
            <button type="button" class="tn-tab" data-no-i18n aria-pressed="${trackerView === 'active'}" onclick="setTrackerView('active')">${t('En cours de traitement ({n})', { n: active.length })}</button>
            <button type="button" class="tn-tab" data-no-i18n aria-pressed="${trackerView === 'history'}" onclick="setTrackerView('history')">${t('Historique complet ({n})', { n: all.length })}</button>
        </div>
        ${trackerView === 'history' ? `
            <div class="tn-tracker-tools">
                <div>
                    <label for="tracker-search" class="sr-only">Rechercher dans mes demandes</label>
                    <input type="search" id="tracker-search" class="cyber-input" placeholder="N° de suivi, objet, service…" value="${escapeHtml(trackerQuery)}" oninput="trackerQuery = this.value; renderTrackerList()">
                </div>
                <div>
                    <label for="tracker-status" class="sr-only">Filtrer par état</label>
                    <select id="tracker-status" class="cyber-input" onchange="trackerStatus = this.value; renderTrackerList()">
                        <option value="all">Tous les états</option>
                        ${Object.keys(TN_STATUS_CLASS).map(status => `<option value="${status}" ${status === trackerStatus ? 'selected' : ''}>${status}</option>`).join('')}
                    </select>
                </div>
            </div>
        ` : ''}
        <p class="tn-tracker-count" id="tracker-count" role="status" data-no-i18n></p>
        <ol class="tn-ticket-list" id="tracker-list"></ol>
    `;
    renderTrackerList();
}

function renderTrackerList() {
    const list = document.getElementById('tracker-list');
    const count = document.getElementById('tracker-count');
    if (!list) return;

    const all = tnMyTickets().slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const query = trackerQuery.trim().toLowerCase();
    const shown = trackerView === 'active'
        ? all.filter(ticket => ticket.status !== 'Résolu')
        : all.filter(ticket => (trackerStatus === 'all' || ticket.status === trackerStatus)
            && (!query || [ticket.id, tnTicketTitle(ticket), ticket.service, t(ticket.service), ticket.message, tnTicketPlace(ticket)]
                .some(value => String(value || '').toLowerCase().includes(query))));

    count.textContent = shown.length ? t('{n} demande(s) affichée(s)', { n: shown.length }) : '';

    if (!shown.length) {
        const message = !all.length
            ? 'Aucune demande pour le moment. Utilisez le formulaire pour transmettre votre premier besoin.'
            : trackerView === 'active'
                ? "Aucune démarche en cours. Vos demandes résolues restent disponibles dans l'historique."
                : 'Aucune demande ne correspond à cette recherche.';
        list.innerHTML = `<li class="tn-empty">${message}</li>`;
        return;
    }

    list.innerHTML = shown.map(renderTicketCard).join('');
}

function renderTicketCard(ticket) {
    const history = tnTicketHistory(ticket);
    const lastOf = status => history.slice().reverse().find(entry => entry.status === status);
    const taken = ticket.status === 'En cours' || ticket.status === 'Résolu';
    const resolved = ticket.status === 'Résolu';
    const steps = [
        { label: 'Envoyée', done: true, date: history[0].date },
        { label: 'Prise en charge', done: taken, date: taken && lastOf('En cours') ? lastOf('En cours').date : null },
        { label: 'Résolue', done: resolved, date: resolved && lastOf('Résolu') ? lastOf('Résolu').date : null }
    ];
    const eventLabel = (entry, index) => index === 0
        ? 'Demande envoyée aux services municipaux'
        : entry.status === 'En cours'
            ? 'Prise en charge par un agent municipal'
            : entry.status === 'Résolu' ? 'Demande résolue et clôturée' : 'Demande rouverte par un agent';

    return `
        <li class="tn-ticket" id="ticket-${escapeHtml(ticket.id)}">
            <div class="tn-ticket-head">
                <span class="tn-ticket-id" data-no-i18n>${escapeHtml(ticket.id)}</span>
                <span class="tn-badge tn-badge--${TN_STATUS_CLASS[ticket.status] || 'neutral'}">${escapeHtml(ticket.status)}</span>
            </div>
            <h4 class="tn-ticket-subject" data-no-i18n>${escapeHtml(tnTicketTitle(ticket))}</h4>
            <p class="tn-ticket-meta">
                <span>${escapeHtml(ticket.service)}</span> ·
                <span data-no-i18n>${tnFormatStamp(ticket.date)}</span>
                ${ticket.location ? `· <span data-no-i18n>${escapeHtml(tnTicketPlace(ticket))}</span>` : ''}
            </p>
            <ol class="tn-steps">
                ${steps.map(step => `
                    <li class="tn-step ${step.done ? 'tn-step--done' : ''}">
                        <span>${step.label}</span>
                        <span class="sr-only">${step.done ? 'Étape réalisée' : 'Étape à venir'}</span>
                        ${step.done ? `<span class="tn-step-date" data-no-i18n>${tnFormatStamp(step.date)}</span>` : ''}
                    </li>
                `).join('')}
            </ol>
            <details>
                <summary>Détail et étapes réalisées</summary>
                <div class="tn-ticket-detail">
                    <dl class="tn-facts">
                        <dt>Votre message</dt><dd data-no-i18n>${escapeHtml(ticket.message)}</dd>
                        <dt>Urgence</dt><dd>${escapeHtml(ticket.priority)}</dd>
                        ${ticket.location ? `<dt>Lieu</dt><dd data-no-i18n>${escapeHtml(tnTicketPlace(ticket))}</dd>` : ''}
                    </dl>
                    <div class="tn-kpi-label mt-4">Chronologie</div>
                    <ol class="tn-timeline">
                        ${history.map((entry, index) => `
                            <li>
                                <span>${eventLabel(entry, index)}</span>
                                <span class="tn-step-date" data-no-i18n>${tnFormatStamp(entry.date)}</span>
                            </li>
                        `).join('')}
                    </ol>
                </div>
            </details>
        </li>
    `;
}

function goToTracker(ticketId) {
    trackerView = 'active';
    renderCitizenTracker();
    const card = document.getElementById(`ticket-${ticketId}`);
    const target = card || document.getElementById('citizen-tracker');
    if (card) card.querySelector('details').open = true;
    target.scrollIntoView({ block: 'center' });
    (card ? card.querySelector('summary') : target).focus();
}

// ==========================================
// D17 — CHARGE DE TRAVAIL DES AGENTS EN UN COUP D'ŒIL
// ==========================================
function initWorkload() {
    const link = document.querySelector('#site-nav a[href="#espace-agent"]');
    if (link) {
        const count = document.createElement('span');
        count.id = 'nav-pending-count';
        count.className = 'tn-nav-count';
        count.dataset.noI18n = '';
        count.hidden = true;
        link.appendChild(count);
    }
    // L'ancienneté de la plus vieille demande en attente avance avec le temps
    setInterval(renderWorkload, 60000);
}

function renderWorkload() {
    const pending = citizenTickets.filter(ticket => ticket.status === 'En attente');
    const urgent = pending.filter(ticket => ticket.priority && ticket.priority !== 'Normal').length;
    const progress = citizenTickets.filter(ticket => ticket.status === 'En cours').length;
    const resolved = citizenTickets.filter(ticket => ticket.status === 'Résolu').length;
    const oldest = pending.reduce((first, ticket) => (!first || String(ticket.date || '') < String(first.date || '') ? ticket : first), null);

    const navCount = document.getElementById('nav-pending-count');
    if (navCount) {
        navCount.hidden = currentRole === 'citizen' || !pending.length;
        navCount.innerHTML = `<span aria-hidden="true">${pending.length}</span><span class="sr-only">${t('{n} demande(s) en attente de prise en charge', { n: pending.length })}</span>`;
    }

    const box = document.getElementById('agent-workload');
    if (!box) return;
    box.innerHTML = `
        <div class="tn-eyebrow">CHARGE DE TRAVAIL EN UN COUP D'ŒIL</div>
        <div class="tn-kpis">
            <div class="tn-kpi ${pending.length ? 'tn-kpi--pending' : 'tn-kpi--clear'}">
                <div class="tn-kpi-label">En attente de prise en charge</div>
                <div class="tn-kpi-value" data-no-i18n>${pending.length}</div>
                <div class="tn-kpi-note" data-no-i18n>${!pending.length ? t('Rien en attente') : urgent ? t('dont {n} urgente(s)', { n: urgent }) : t('aucune urgente')}</div>
                ${pending.length ? `<button type="button" class="tn-link" onclick="showPendingTickets()">Voir les demandes en attente</button>` : ''}
            </div>
            <div class="tn-kpi">
                <div class="tn-kpi-label">En cours de traitement</div>
                <div class="tn-kpi-value" data-no-i18n>${progress}</div>
            </div>
            <div class="tn-kpi">
                <div class="tn-kpi-label">Résolues</div>
                <div class="tn-kpi-value" data-no-i18n>${resolved}</div>
            </div>
            <div class="tn-kpi">
                <div class="tn-kpi-label">Plus ancienne en attente</div>
                <div class="tn-kpi-value" data-no-i18n>${oldest ? tnFormatAge(oldest.date) : '—'}</div>
                <div class="tn-kpi-note">${oldest
                    ? `<span data-no-i18n>${escapeHtml(oldest.id)}</span> · <span>${escapeHtml(oldest.service)}</span>`
                    : 'Rien en attente'}</div>
            </div>
        </div>
    `;
}

function showPendingTickets() {
    const filter = document.querySelectorAll('.agent-ticket-filter')[1];
    if (filter) filter.click();
    const table = document.getElementById('agent-tickets-tbody');
    if (table) table.scrollIntoView({ block: 'center' });
}

// ==========================================
// D12 — PREMIERS PAS APRÈS LA PREMIÈRE CONNEXION
// ==========================================
const TN_ONBOARDING_STEPS = ['profile', 'service', 'demarche'];
let tnProfileEditing = false;

function initOnboarding() {
    const dashboard = document.querySelector('#espace-citoyen .grid');
    if (!dashboard) return;

    const panel = document.createElement('div');
    panel.id = 'citizen-onboarding';
    panel.tabIndex = -1;
    panel.hidden = true;
    panel.dataset.crumb = 'Premiers pas';
    dashboard.before(panel);

    const logout = document.querySelector('#espace-citoyen button[onclick="logoutCitizen()"]');
    if (logout) {
        const reopen = document.createElement('button');
        reopen.type = 'button';
        reopen.id = 'onboarding-reopen';
        reopen.className = 'tn-link';
        reopen.hidden = true;
        reopen.textContent = 'Revoir le guide de premiers pas';
        reopen.addEventListener('click', showOnboarding);
        logout.after(reopen);
    }
}

function tnSaveActiveCitizen() {
    const index = registeredCitizens.findIndex(citizen => citizen.matricule === activeCitizen.matricule);
    if (index !== -1) registeredCitizens[index] = activeCitizen;
    localStorage.setItem('tn_citizens', JSON.stringify(registeredCitizens));
    localStorage.setItem('tn_active_citizen', JSON.stringify(activeCitizen));
}

// Appelé à la création d'un compte : le nouvel habitant arrive sur son guide
function startOnboarding() {
    if (!activeCitizen) return;
    activeCitizen.onboarding = { profile: false, service: false, demarche: false, hidden: false };
    tnSaveActiveCitizen();
    renderOnboarding();
    const panel = document.getElementById('citizen-onboarding');
    // Différé : la fenêtre d'inscription qui se ferme rend d'abord le focus au bouton qui l'avait ouverte
    setTimeout(() => {
        if (!panel || panel.hidden) return;
        panel.scrollIntoView({ block: 'start' });
        panel.focus();
    }, 100);
}

function showOnboarding() {
    if (!activeCitizen) return;
    const previous = activeCitizen.onboarding || {};
    activeCitizen.onboarding = {
        profile: Boolean(previous.profile || activeCitizen.profile),
        service: Boolean(previous.service),
        demarche: Boolean(previous.demarche || tnMyTickets().length),
        hidden: false
    };
    tnSaveActiveCitizen();
    renderOnboarding();
    document.getElementById('citizen-onboarding').focus();
}

function hideOnboarding() {
    if (!activeCitizen || !activeCitizen.onboarding) return;
    activeCitizen.onboarding.hidden = true;
    tnSaveActiveCitizen();
    renderOnboarding();
}

function completeOnboardingStep(step) {
    if (!activeCitizen || !activeCitizen.onboarding || activeCitizen.onboarding[step]) return;
    activeCitizen.onboarding[step] = true;
    tnSaveActiveCitizen();
    renderOnboarding();
}

function renderOnboarding() {
    const panel = document.getElementById('citizen-onboarding');
    const reopen = document.getElementById('onboarding-reopen');
    if (!panel) return;

    const state = activeCitizen && activeCitizen.onboarding;
    const visible = Boolean(state && !state.hidden);
    if (reopen) reopen.hidden = !activeCitizen || visible;
    panel.hidden = !visible;
    if (!visible) {
        panel.innerHTML = '';
        return;
    }

    const done = TN_ONBOARDING_STEPS.filter(step => state[step]).length;
    const profile = activeCitizen.profile || {};
    const stateBadge = ok => `<span class="tn-badge ${ok ? 'tn-badge--resolved' : 'tn-badge--neutral'}">${ok ? 'Fait' : 'À faire'}</span>`;
    const domes = Array.from(document.querySelectorAll('#reg-dome option')).map(option => option.value);
    if (activeCitizen.dome && !domes.includes(activeCitizen.dome)) domes.unshift(activeCitizen.dome);

    panel.innerHTML = `
        <div class="tn-onboard-head">
            <div>
                <div class="tn-eyebrow">Premiers pas</div>
                <h3 class="tn-onboard-title">PREMIERS PAS À TERRA NOVA</h3>
                <p class="tn-hint" data-no-i18n>${t('Bienvenue {name}. Trois étapes pour utiliser les services de la ville.', { name: escapeHtml(activeCitizen.name) })}</p>
            </div>
            <div class="tn-kpi-label" data-no-i18n>${t('{done} étape(s) sur 3 réalisée(s)', { done })}</div>
        </div>
        <div class="tn-progress" role="progressbar" aria-label="Premiers pas" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${done}">
            <span style="width: ${Math.round(done / 3 * 100)}%"></span>
        </div>
        ${done === 3 ? `<p class="tn-hint mt-4">Parcours d'accueil terminé. Vous savez maintenant utiliser les services de Terra Nova.</p>` : ''}
        <ol class="tn-onboard-steps">
            <li class="tn-onboard-step ${state.profile ? 'tn-onboard-step--done' : ''}">
                <h4><span>Compléter mon profil</span>${stateBadge(state.profile)}</h4>
                <p>Indiquez comment vous joindre et votre langue : les services vous répondent plus vite.</p>
                ${state.profile && !tnProfileEditing ? `
                    <div class="tn-onboard-actions">
                        <button type="button" class="tn-link" onclick="tnProfileEditing = true; renderOnboarding()">Modifier mon profil</button>
                    </div>
                ` : `
                    <form class="tn-profile-form" onsubmit="saveProfile(event)">
                        <div>
                            <label class="tn-field-label" for="profile-email">Adresse de contact (holo-courriel)</label>
                            <input type="email" id="profile-email" required class="cyber-input" placeholder="ex: thalia.kren@terranova.city" value="${escapeHtml(profile.email || '')}">
                        </div>
                        <div>
                            <label class="tn-field-label" for="profile-lang">Langue préférée</label>
                            <select id="profile-lang" class="cyber-input" data-no-i18n>
                                ${Object.keys(TN_LANGS).map(code => `<option value="${code}" ${code === (profile.lang || tnLang) ? 'selected' : ''}>${TN_LANGS[code]}</option>`).join('')}
                            </select>
                        </div>
                        <div class="tn-wide">
                            <label class="tn-field-label" for="profile-dome">Dôme de résidence</label>
                            <select id="profile-dome" class="cyber-input">
                                ${domes.map(dome => `<option ${dome === activeCitizen.dome ? 'selected' : ''}>${escapeHtml(dome)}</option>`).join('')}
                            </select>
                        </div>
                        <label class="tn-check tn-wide">
                            <input type="checkbox" id="profile-notify" ${profile.notify === false ? '' : 'checked'}>
                            <span>Recevoir une notification à chaque changement d'état de mes demandes</span>
                        </label>
                        <div class="tn-wide">
                            <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">Enregistrer mon profil</button>
                        </div>
                    </form>
                `}
            </li>
            <li class="tn-onboard-step ${state.service ? 'tn-onboard-step--done' : ''}">
                <h4><span>Trouver un service</span>${stateBadge(state.service)}</h4>
                <p>Les démarches les plus courantes sont mises en avant en haut du catalogue.</p>
                <div class="tn-onboard-actions">
                    <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="onboardingFindService()">Voir les services à la une</button>
                </div>
            </li>
            <li class="tn-onboard-step ${state.demarche ? 'tn-onboard-step--done' : ''}">
                <h4><span>Commencer une démarche</span>${stateBadge(state.demarche)}</h4>
                <p>Posez une question à un service ou signalez un problème dans votre secteur.</p>
                <div class="tn-onboard-actions">
                    <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="onboardingStartRequest('report')">Signaler un problème</button>
                    <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="onboardingStartRequest('contact')">Contacter un service</button>
                </div>
            </li>
        </ol>
        <div class="tn-onboard-actions">
            <button type="button" class="tn-link" onclick="hideOnboarding()">Masquer ce guide</button>
        </div>
    `;
}

function saveProfile(event) {
    event.preventDefault();
    const lang = document.getElementById('profile-lang').value;
    activeCitizen.profile = {
        email: document.getElementById('profile-email').value.trim(),
        lang,
        notify: document.getElementById('profile-notify').checked
    };
    activeCitizen.dome = document.getElementById('profile-dome').value;
    if (activeCitizen.onboarding) activeCitizen.onboarding.profile = true;
    tnProfileEditing = false;
    tnSaveActiveCitizen();

    // Met à jour le passeport, puis redessine le guide
    updateCitizenProfileUI();
    if (lang !== tnLang) setLanguage(lang);
    announce(t('Profil enregistré.'));
}

function onboardingFindService() {
    completeOnboardingStep('service');
    const strip = document.getElementById('featured-services');
    strip.scrollIntoView({ block: 'center' });
    strip.focus();
}

function onboardingStartRequest(mode) {
    setContactMode(mode);
    resetContactForm();
    document.getElementById('demarches').scrollIntoView({ block: 'start' });
}

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initLocationBar();
    initFeaturedServices();
    initContactModes();
    initOnboarding();
    initWorkload();
    initI18n();

    // Changement de langue : les blocs dont le texte contient des valeurs (compteurs, dates) se redessinent
    document.addEventListener('tn:langchange', () => {
        const select = document.getElementById('tn-lang-select');
        if (select) select.value = tnLang;
        updateLocation(true);
        renderFeaturedServices();
        renderCitizenTracker();
        renderOnboarding();
        renderWorkload();
        updateReportRouting();
        renderSubmissionConfirmation();
        announce(t('Langue : {lang}', { lang: TN_LANGS[tnLang] }));
    });
});
