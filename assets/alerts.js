// ==========================================
// VAGUE 3 — informer et servir
// D18 diffusion d'un message à tous les habitants, F29 alerte ciblée par secteur,
// F30 notifications, F31 recommandations adaptées (IA), F32 recherche.
// Chargé après assets/features.js, dont il réutilise TN_SECTORS, tnServices, tnFormatStamp et t().
// Les messages viennent de trois sources : alertes de référence (assets/alert-seeds.js),
// messages publiés sur le serveur (/api/broadcasts) et messages de démonstration gardés sur l'appareil.
// ==========================================

const TN_LEVELS = {
    info: { label: 'Information', rank: 0, badge: 'progress' },
    important: { label: 'Important', rank: 1, badge: 'pending' },
    alerte: { label: 'Alerte', rank: 2, badge: 'danger' },
    urgence: { label: 'Urgence absolue', rank: 3, badge: 'danger' }
};

const TN_SITUATIONS = [
    { key: 'senior', label: '65 ans ou plus' },
    { key: 'infant', label: 'Enfant de moins de 3 ans au foyer' },
    { key: 'pregnant', label: 'Grossesse' },
    { key: 'chronic', label: 'Maladie chronique ou implant biolink sous surveillance' },
    { key: 'outdoor', label: 'Travail en extérieur ou hors dôme' },
    { key: 'isolated', label: 'Personne vivant seule' },
    { key: 'mobility', label: 'Mobilité réduite' }
];

// Recommandations de référence, utilisées quand le service d'IA ne répond pas
const TN_REFERENCE_ADVICE = {
    general: [
        "Buvez de l'eau toutes les heures, même sans soif, et évitez l'alcool.",
        'Restez dans une pièce fraîche ou climatisée aux heures les plus chaudes.'
    ],
    senior: 'Après 65 ans, la soif se ressent moins : programmez un rappel pour boire et mouillez-vous la peau plusieurs fois par jour.',
    infant: 'Ne laissez jamais un jeune enfant dans une capsule ou une pièce fermée, proposez-lui à boire très souvent et habillez-le légèrement.',
    pregnant: 'Enceinte, reposez-vous aux heures chaudes, hydratez-vous davantage et signalez tout malaise à la Santé Biotech.',
    chronic: 'Poursuivez votre traitement sans le modifier seul et demandez à la Santé Biotech si la chaleur impose une adaptation.',
    outdoor: "En extérieur, décalez les tâches physiques tôt le matin, faites une pause à l'ombre toutes les 30 minutes et ne travaillez pas seul.",
    isolated: "Donnez de vos nouvelles chaque jour à un proche ou à la Mairie et gardez un moyen d'appel à portée de main.",
    mobility: "Gardez à portée de main de l'eau et un moyen d'appel, et demandez une visite de la Sécurité Civile si vous ne pouvez pas vous déplacer.",
    emergency: 'Malaise, confusion, fièvre élevée ou peau chaude et sèche : contactez immédiatement la Santé Biotech & Cryo-Soins.'
};

const TN_BROADCAST_TEMPLATES = [
    { label: 'Message libre' },
    {
        label: 'Montée des eaux', level: 'alerte', title: 'Montée des eaux',
        body: "Une montée inhabituelle du niveau de l'eau est observée dans le secteur.",
        action: "Quittez les niveaux bas et rejoignez les étages supérieurs.\nN'empruntez aucune coursive inondée, même à pied.\nSignalez toute personne en difficulté à la Sécurité Civile."
    },
    {
        label: 'Vague de chaleur', level: 'alerte', title: 'Vague de chaleur extrême', advice: true,
        body: 'Une vague de chaleur extrême touche plusieurs secteurs de la ville.',
        action: "Buvez de l'eau régulièrement, sans attendre la soif.\nRestez dans les zones climatisées aux heures les plus chaudes.\nPrenez des nouvelles des personnes âgées, isolées ou malades de votre entourage."
    },
    {
        label: "Coupure d'énergie", level: 'important', title: "Coupure d'énergie programmée",
        body: "L'alimentation plasma sera interrompue le temps d'une intervention de maintenance.",
        action: "Rechargez vos équipements avant la coupure.\nN'utilisez pas les capsules pendant l'intervention."
    },
    {
        label: 'Information générale', level: 'info', title: 'Information du Haut Conseil',
        body: '', action: ''
    }
];

// Mots que les habitants emploient pour chercher un service (F32)
const TN_SERVICE_KEYWORDS = {
    'Santé Biotech & Cryo-Soins': 'santé médecin docteur hôpital clinique soins malade maladie urgence médicale visite certificat vaccin health doctor hospital salud médico',
    'Atmosphère & Biosphère': 'air oxygène eau fuite pollution environnement déchets propreté water leak agua',
    'Transports & Hyper-Tubes': 'transport navette capsule métro trajet abonnement voirie route bus travel transporte',
    'Énergie Plasma & Réacteur Zéro': 'énergie électricité courant panne lampadaire éclairage quota facture power energy luz',
    'Sécurité Civile & Sentinelles': 'sécurité police secours danger incident vol drone urgence security emergency seguridad',
    'Mairie & État Civil Spatial': 'mairie état civil naissance mariage matricule compte inscription papiers déménagement city hall ayuntamiento'
};

// Mots courants pour chaque nature de signalement, dans l'ordre de TN_REPORT_KINDS
const TN_REPORT_KEYWORDS = [
    'lampadaire lumière ampoule éclairage noir streetlight farola',
    'route chaussée trou passerelle coursive abîmée road camino',
    'capsule station hyper-tube retard panne transport',
    'fuite eau air inondation tuyau leak fuga',
    'déchets poubelle saleté ordures végétation waste basura',
    'danger agression accident menace sécurité',
    'autre divers'
];

let tnBroadcasts = [];
let tnBroadcastServer = { online: false, publishing: false };

function tnLoad(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value === null ? fallback : value;
    } catch (err) {
        return fallback;
    }
}

function tnStore(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { }
}

// ==========================================
// F29 — PERSONNES CONCERNÉES : SECTEUR ET SITUATION DE L'HABITANT
// ==========================================
function tnMySector() {
    const dome = activeCitizen && activeCitizen.dome ? activeCitizen.dome : tnLoad('tn_my_sector', '');
    if (!dome) return '';
    const zone = dome.split(' - ')[0];
    return TN_SECTORS.find(sector => sector !== 'Je ne sais pas' && (sector === dome || sector.split(' - ')[0] === zone)) || '';
}

function setMySector(sector) {
    tnStore('tn_my_sector', sector);
    renderAlerts();
}

// 'mine' : son secteur est touché ; 'all' : toute la cité ; 'other' : un autre secteur ; 'unknown' : secteur non renseigné
function tnConcern(item) {
    if (!item.sectors || !item.sectors.length) return 'all';
    const mine = tnMySector();
    if (!mine) return 'unknown';
    return item.sectors.includes(mine) ? 'mine' : 'other';
}

function tnMySituations() {
    if (activeCitizen) return (activeCitizen.profile && activeCitizen.profile.situations) || [];
    return tnLoad('tn_my_situations', []);
}

function toggleSituation(key, checked) {
    const list = tnMySituations().filter(item => item !== key);
    if (checked) list.push(key);
    if (activeCitizen) {
        activeCitizen.profile = Object.assign({}, activeCitizen.profile, { situations: list });
        tnSaveActiveCitizen();
    } else {
        tnStore('tn_my_situations', list);
    }

    // Sans redessiner la carte : la case cochée garde le focus
    tnBroadcasts.filter(item => item.advice).forEach(item => {
        const flag = document.getElementById(`vulnerable-${item.id}`);
        const box = document.getElementById(`advice-${item.id}`);
        if (flag) flag.hidden = !list.length;
        if (box) box.innerHTML = renderAdviceResult(tnCachedAdvice(item.id));
    });
}

// ==========================================
// CHARGEMENT DES MESSAGES
// ==========================================
async function refreshBroadcasts() {
    let server = null;
    try {
        const res = await fetch('/api/broadcasts', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
        if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.broadcasts)) server = json;
        }
    } catch (err) { }
    tnBroadcastServer = { online: Boolean(server), publishing: Boolean(server && server.publishing) };
    window.tnPlatform = server && server.platform ? { state: server.platform, at: Date.now() } : window.tnPlatform;
    window.tnTransport = server && Array.isArray(server.transport) ? server.transport : (window.tnTransport || []);
    document.dispatchEvent(new CustomEvent('tn:server', { detail: { online: Boolean(server) } }));

    const retired = new Set([...(server ? server.retired : []), ...tnLoad('tn_local_retired', [])]);
    const now = Date.now();
    const all = TN_SEED_BROADCASTS
        .concat(server ? server.broadcasts : [], tnLoad('tn_local_broadcasts', []))
        .filter(item => !retired.has(item.id) && (!item.expiresAt || new Date(item.expiresAt).getTime() > now))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    // Première visite : les messages en cours sont affichés sans être annoncés un par un
    const known = tnLoad('tn_known_broadcasts', null);
    const fresh = known ? all.filter(item => !known.includes(item.id)) : [];
    tnStore('tn_known_broadcasts', Array.from(new Set(all.map(item => item.id).concat(known || []))).slice(0, 200));

    tnBroadcasts = all;
    renderAlerts();
    renderNotifications();
    renderBroadcastList();
    fresh.forEach(announceBroadcast);
}

// ==========================================
// D18 & F29 — AFFICHAGE DES ALERTES ET MESSAGES
// ==========================================
function initAlerts() {
    const home = document.getElementById('accueil');
    if (home) {
        const region = document.createElement('div');
        region.id = 'city-alerts';
        region.setAttribute('role', 'region');
        region.setAttribute('aria-label', 'Alertes et messages en cours');
        region.dataset.crumb = 'Alertes en cours';
        region.hidden = true;
        home.prepend(region);
    }

    const toasts = document.createElement('div');
    toasts.id = 'tn-toasts';
    document.body.appendChild(toasts);
}

function renderAlerts() {
    const region = document.getElementById('city-alerts');
    if (!region) return;
    if (!tnBroadcasts.length) {
        region.hidden = true;
        region.innerHTML = '';
        return;
    }

    const acknowledged = new Set(tnLoad('tn_ack_broadcasts', []));
    const situations = tnMySituations();
    const order = { mine: 0, all: 1, unknown: 2, other: 3 };
    const list = tnBroadcasts.slice().sort((a, b) =>
        order[tnConcern(a)] - order[tnConcern(b)] || TN_LEVELS[b.level].rank - TN_LEVELS[a.level].rank);
    const sector = tnMySector();

    region.hidden = false;
    region.innerHTML = `
        <div class="tn-alerts-head">
            <h2 class="tn-eyebrow">Alertes et messages en cours</h2>
            ${activeCitizen && sector ? '' : `
                <div class="tn-sector-choice">
                    <label for="tn-sector-select">Mon secteur</label>
                    <select id="tn-sector-select" class="cyber-input" onchange="setMySector(this.value)">
                        <option value="">Choisir mon secteur</option>
                        ${TN_SECTORS.filter(name => name !== 'Je ne sais pas').map(name => `<option ${name === sector ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}
                    </select>
                </div>
            `}
        </div>
        ${list.map(item => renderAlertCard(item, acknowledged.has(item.id), situations)).join('')}
    `;
}

function renderAlertCard(item, acknowledged, situations) {
    const level = TN_LEVELS[item.level] || TN_LEVELS.info;
    const id = escapeHtml(item.id);

    if (acknowledged) {
        return `
            <article class="tn-alert tn-alert--read" id="alert-${id}" tabindex="-1">
                <div class="tn-alert-tags">
                    <span class="tn-badge tn-badge--${level.badge}">${level.label}</span>
                    <span class="tn-alert-read-title">${escapeHtml(item.title)}</span>
                    <span class="tn-badge tn-badge--resolved">Lu</span>
                    <button type="button" class="tn-link" onclick="reopenAlert('${id}')">Afficher de nouveau</button>
                </div>
            </article>
        `;
    }

    const concern = tnConcern(item);
    const steps = String(item.action || '').split('\n').map(line => line.trim()).filter(Boolean);
    const sectors = item.sectors && item.sectors.length
        ? item.sectors.map(name => `<span>${escapeHtml(name)}</span>`).join(', ')
        : '<span>Toute la cité</span>';

    return `
        <article class="tn-alert tn-alert--${escapeHtml(item.level)}" id="alert-${id}" tabindex="-1">
            <div class="tn-alert-tags">
                <span class="tn-badge tn-badge--${level.badge}">${level.label}</span>
                ${concern === 'mine' ? '<span class="tn-badge tn-badge--pending">Votre secteur est concerné</span>' : ''}
                ${concern === 'other' ? `<span class="tn-badge tn-badge--neutral">Votre secteur n'est pas concerné</span>` : ''}
                ${item.advice ? `<span class="tn-badge tn-badge--pending" id="vulnerable-${id}" ${situations.length ? '' : 'hidden'}>Vous êtes particulièrement concerné(e)</span>` : ''}
                ${item.local ? '<span class="tn-badge tn-badge--neutral">Démonstration sur cet appareil</span>' : ''}
            </div>
            <h3 class="tn-alert-title">${escapeHtml(item.title)}</h3>
            <p class="tn-alert-meta">
                <span>${escapeHtml(item.source || 'Haut Conseil de la Ville')}</span> ·
                <span data-no-i18n>${tnFormatStamp(item.createdAt)}</span> ·
                <span>Secteurs concernés :</span> ${sectors}
                ${item.expiresAt ? `· <span>Valable jusqu'au</span> <span data-no-i18n>${tnFormatStamp(item.expiresAt)}</span>` : ''}
            </p>
            <div class="tn-alert-cols">
                <div>
                    <h4>Ce qu'il se passe</h4>
                    <p>${escapeHtml(item.body)}</p>
                </div>
                ${steps.length ? `
                    <div>
                        <h4>Ce que vous devez faire</h4>
                        <ol>${steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
                    </div>
                ` : ''}
            </div>
            ${item.advice ? renderAdvicePanel(item, situations) : ''}
            <div class="tn-alert-actions">
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="acknowledgeAlert('${id}')">J'ai compris</button>
            </div>
        </article>
    `;
}

function acknowledgeAlert(id) {
    tnStore('tn_ack_broadcasts', Array.from(new Set(tnLoad('tn_ack_broadcasts', []).concat(id))));
    markNotificationRead(id);
    renderAlerts();
    const card = document.getElementById(`alert-${id}`);
    if (card) card.focus({ preventScroll: true });
}

function reopenAlert(id) {
    tnStore('tn_ack_broadcasts', tnLoad('tn_ack_broadcasts', []).filter(item => item !== id));
    renderAlerts();
    const card = document.getElementById(`alert-${id}`);
    if (card) card.focus({ preventScroll: true });
}

function tnFlash(element, block = 'center') {
    if (!element) return;
    element.scrollIntoView({ block });
    element.classList.add('tn-flash');
    setTimeout(() => element.classList.remove('tn-flash'), 2500);
    if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
    element.focus({ preventScroll: true });
}

function goToAlert(id) {
    closeToolPanels();
    if (tnLoad('tn_ack_broadcasts', []).includes(id)) reopenAlert(id);
    markNotificationRead(id);
    tnFlash(document.getElementById(`alert-${id}`));
}

// Un nouveau message s'annonce où que soit l'habitant sur la page
function announceBroadcast(item) {
    const level = TN_LEVELS[item.level] || TN_LEVELS.info;
    const toasts = document.getElementById('tn-toasts');
    if (toasts) {
        const toast = document.createElement('div');
        toast.className = `tn-toast tn-alert--${item.level}`;
        toast.setAttribute('role', level.rank >= 2 ? 'alert' : 'status');
        toast.innerHTML = `
            <div class="tn-alert-tags"><span class="tn-badge tn-badge--${level.badge}">${level.label}</span></div>
            <p class="tn-toast-title">${escapeHtml(item.title)}</p>
            <p class="tn-hint">${escapeHtml(String(item.action || item.body).split('\n')[0])}</p>
            <div class="tn-alert-actions">
                <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-action="open">Voir le message</button>
                <button type="button" class="tn-link" data-action="close">Fermer</button>
            </div>
        `;
        toast.querySelector('[data-action="open"]').addEventListener('click', () => { toast.remove(); goToAlert(item.id); });
        toast.querySelector('[data-action="close"]').addEventListener('click', () => toast.remove());
        toasts.appendChild(toast);
        if (level.rank < 2) setTimeout(() => toast.remove(), 20000);
    }

    // F30 : notification du navigateur pour les annonces importantes, si l'habitant l'a demandé
    if (tnLoad('tn_notify_enabled', false) && 'Notification' in window && Notification.permission === 'granted'
        && level.rank >= 1 && tnConcern(item) !== 'other') {
        try {
            const notification = new Notification(`${t(level.label)} — ${t(item.title)}`, { body: t(item.body), tag: item.id });
            notification.onclick = () => { window.focus(); goToAlert(item.id); };
        } catch (err) { }
    }
}

// ==========================================
// F31 — RECOMMANDATIONS ADAPTÉES AUX PERSONNES VULNÉRABLES (IA)
// ==========================================
function tnAdviceKey(id) {
    return `${id}|${tnMySituations().slice().sort().join(',')}|${tnLang}`;
}

function tnCachedAdvice(id) {
    return tnLoad('tn_advice_cache', {})[tnAdviceKey(id)] || null;
}

function tnReferenceAdvice(situations) {
    return TN_REFERENCE_ADVICE.general
        .concat(situations.map(key => TN_REFERENCE_ADVICE[key]).filter(Boolean), TN_REFERENCE_ADVICE.emergency);
}

function renderAdvicePanel(item, situations) {
    const id = escapeHtml(item.id);
    return `
        <div class="tn-advice">
            <h4>Recommandations adaptées à votre situation</h4>
            <p class="tn-hint">Cochez ce qui vous concerne. Ces informations restent sur votre appareil : seules les cases cochées sont transmises, sans votre identité, pour préparer les recommandations.</p>
            <div class="tn-advice-options">
                ${TN_SITUATIONS.map(situation => `
                    <label class="tn-check">
                        <input type="checkbox" ${situations.includes(situation.key) ? 'checked' : ''} onchange="toggleSituation('${situation.key}', this.checked)">
                        <span>${situation.label}</span>
                    </label>
                `).join('')}
            </div>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" onclick="requestAdvice('${id}')">Obtenir mes recommandations</button>
            <div class="tn-advice-result" id="advice-${id}" aria-live="polite">${renderAdviceResult(tnCachedAdvice(item.id))}</div>
        </div>
    `;
}

function renderAdviceResult(result) {
    if (!result) return '';
    const generated = result.source === 'ia';
    return `
        <ul class="tn-advice-list" ${generated ? 'data-no-i18n' : ''}>
            ${result.recommendations.map(line => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
        <p class="tn-hint">${generated
            ? "Recommandations générées par IA à partir de l'alerte officielle. En cas d'urgence, suivez les consignes des secours."
            : "Recommandations de référence : le service d'IA ne répond pas pour le moment. En cas d'urgence, suivez les consignes des secours."}</p>
    `;
}

async function requestAdvice(id) {
    const box = document.getElementById(`advice-${id}`);
    if (!box) return;
    const situations = tnMySituations().slice().sort();
    const key = tnAdviceKey(id);
    box.innerHTML = '<p class="tn-hint">Préparation de vos recommandations…</p>';

    let result = null;
    try {
        const res = await fetch('/api/advice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertId: id, situations, sector: tnMySector(), lang: tnLang })
        });
        if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.recommendations) && json.recommendations.length) {
                result = { source: 'ia', recommendations: json.recommendations };
            }
        }
    } catch (err) { }

    if (result) {
        // Seules les réponses de l'IA sont gardées : une réponse de secours sera retentée au prochain clic
        const cache = tnLoad('tn_advice_cache', {});
        cache[key] = result;
        tnStore('tn_advice_cache', cache);
    } else {
        result = { source: 'reference', recommendations: tnReferenceAdvice(situations) };
    }
    box.innerHTML = renderAdviceResult(result);
}

// ==========================================
// F30 — NOTIFICATIONS
// ==========================================
function recordTicketEvent(ticket, status) {
    const events = tnLoad('tn_ticket_events', []);
    events.unshift({ id: `EV-${Date.now().toString(36)}`, ticketId: ticket.id, citizenName: ticket.citizenName, status, date: new Date().toISOString() });
    tnStore('tn_ticket_events', events.slice(0, 30));
    renderNotifications();
}

function tnNotificationItems() {
    const read = new Set(tnLoad('tn_read_items', []));
    const items = tnBroadcasts.map(item => ({
        id: item.id, level: item.level, title: item.title, text: item.body, date: item.createdAt, userText: false,
        action: `goToAlert('${escapeHtml(item.id)}')`
    }));

    // Changements d'état des demandes de l'habitant connecté, s'il a gardé ces notifications actives
    if (activeCitizen && !(activeCitizen.profile && activeCitizen.profile.notify === false)) {
        tnLoad('tn_ticket_events', [])
            .filter(event => String(event.citizenName).includes(activeCitizen.name) || String(event.citizenName).includes(activeCitizen.matricule))
            .forEach(event => items.push({
                id: event.id, level: 'info', date: event.date, userText: true,
                title: t('Demande {id}', { id: event.ticketId }),
                text: t('Nouvel état : {status}', { status: t(event.status) }),
                action: `goToMyTicket('${escapeHtml(event.ticketId)}'); markNotificationRead('${escapeHtml(event.id)}')`
            }));
    }

    return items
        .map(item => Object.assign(item, { read: read.has(item.id) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function initTools() {
    const bar = document.getElementById('tn-locbar');
    const lang = bar && bar.querySelector('.tn-lang');
    if (!bar || !lang) return;

    const tools = document.createElement('div');
    tools.className = 'tn-tools';
    tools.innerHTML = `
        <button type="button" id="tn-search-toggle" class="tn-tool" aria-expanded="false" aria-controls="tn-search-panel" onclick="toggleSearch()">
            <i aria-hidden="true" class="fa-solid fa-magnifying-glass"></i>
            <span class="tn-tool-label">Rechercher</span>
        </button>
        <button type="button" id="tn-bell" class="tn-tool" aria-expanded="false" aria-controls="tn-notif-panel" onclick="toggleNotifications()">
            <i aria-hidden="true" class="fa-solid fa-bell"></i>
            <span class="sr-only">Notifications</span>
            <span id="tn-bell-count" class="tn-nav-count" data-no-i18n hidden></span>
        </button>
    `;
    bar.insertBefore(tools, lang);

    const search = document.createElement('div');
    search.id = 'tn-search-panel';
    search.className = 'tn-panel';
    search.hidden = true;
    search.setAttribute('role', 'search');
    search.innerHTML = `
        <label for="tn-search-input" class="tn-field-label">Rechercher un service, une démarche, une annonce</label>
        <input type="search" id="tn-search-input" class="cyber-input" autocomplete="off" placeholder="ex: santé, lampadaire, TK-TN-8492…" oninput="renderSearchResults()" onkeydown="if (event.key === 'Enter') openFirstSearchResult()">
        <p class="tn-tracker-count" id="tn-search-count" role="status" data-no-i18n></p>
        <div id="tn-search-results"></div>
    `;
    bar.appendChild(search);

    const notifications = document.createElement('div');
    notifications.id = 'tn-notif-panel';
    notifications.className = 'tn-panel';
    notifications.hidden = true;
    notifications.setAttribute('role', 'region');
    notifications.setAttribute('aria-label', 'Notifications');
    bar.appendChild(notifications);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeToolPanels();
            return;
        }
        // « / » ouvre la recherche, sauf pendant une saisie
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleSearch(true);
        }
    });
}

function closeToolPanels() {
    [['tn-search-panel', 'tn-search-toggle'], ['tn-notif-panel', 'tn-bell']].forEach(([panelId, buttonId]) => {
        const panel = document.getElementById(panelId);
        const button = document.getElementById(buttonId);
        if (panel) panel.hidden = true;
        if (button) button.setAttribute('aria-expanded', 'false');
    });
}

function toggleNotifications() {
    const panel = document.getElementById('tn-notif-panel');
    const open = panel.hidden;
    closeToolPanels();
    if (!open) return;
    panel.hidden = false;
    document.getElementById('tn-bell').setAttribute('aria-expanded', 'true');
    renderNotifications();
}

function renderNotifications() {
    const items = tnNotificationItems();
    const unread = items.filter(item => !item.read).length;

    const count = document.getElementById('tn-bell-count');
    if (count) {
        count.hidden = !unread;
        count.innerHTML = `<span aria-hidden="true">${unread}</span><span class="sr-only">${t('{n} notification(s) non lue(s)', { n: unread })}</span>`;
    }

    const panel = document.getElementById('tn-notif-panel');
    if (!panel || panel.hidden) return;

    const supported = 'Notification' in window;
    const enabled = supported && Notification.permission === 'granted' && tnLoad('tn_notify_enabled', false);
    const hint = !supported
        ? 'Votre navigateur ne propose pas les notifications.'
        : Notification.permission === 'denied'
            ? 'Les notifications sont bloquées dans les réglages de votre navigateur.'
            : enabled
                ? 'Vous êtes prévenu(e) tant que le site reste ouvert dans un onglet.'
                : "Recevez une notification du navigateur dès qu'une annonce importante est publiée.";

    panel.innerHTML = `
        <div class="tn-panel-head">
            <span class="tn-eyebrow">Notifications</span>
            ${unread ? '<button type="button" class="tn-link" onclick="markAllNotificationsRead()">Tout marquer comme lu</button>' : ''}
        </div>
        <button type="button" class="tn-tab" aria-pressed="${enabled}" ${supported && Notification.permission !== 'denied' ? '' : 'disabled'} onclick="toggleBrowserNotifications()">Me prévenir des annonces importantes</button>
        <p class="tn-hint">${hint}</p>
        ${items.length ? `
            <ul class="tn-notif-list">
                ${items.map(item => `
                    <li>
                        <button type="button" class="tn-notif ${item.read ? '' : 'tn-notif--unread'}" onclick="${item.action}">
                            <span class="tn-badge tn-badge--${(TN_LEVELS[item.level] || TN_LEVELS.info).badge}">${(TN_LEVELS[item.level] || TN_LEVELS.info).label}</span>
                            <span class="tn-notif-title" ${item.userText ? 'data-no-i18n' : ''}>${escapeHtml(item.title)}</span>
                            <span class="tn-notif-text" ${item.userText ? 'data-no-i18n' : ''}>${escapeHtml(item.text)}</span>
                            <span class="tn-step-date" data-no-i18n>${tnFormatStamp(item.date)}${item.read ? '' : ` · ${t('non lu')}`}</span>
                        </button>
                    </li>
                `).join('')}
            </ul>
        ` : '<p class="tn-empty">Aucune notification pour le moment.</p>'}
    `;
}

function markNotificationRead(id) {
    tnStore('tn_read_items', Array.from(new Set(tnLoad('tn_read_items', []).concat(id))).slice(-300));
    renderNotifications();
}

function markAllNotificationsRead() {
    tnStore('tn_read_items', Array.from(new Set(tnLoad('tn_read_items', []).concat(tnNotificationItems().map(item => item.id)))).slice(-300));
    renderNotifications();
}

async function toggleBrowserNotifications() {
    if (!('Notification' in window)) return;
    if (tnLoad('tn_notify_enabled', false) && Notification.permission === 'granted') {
        tnStore('tn_notify_enabled', false);
    } else {
        const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
        tnStore('tn_notify_enabled', permission === 'granted');
    }
    renderNotifications();
}

// ==========================================
// D18 — DIFFUSER UN MESSAGE À TOUS LES HABITANTS (agents et Haut Conseil)
// ==========================================
function initBroadcastAdmin() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace) return;

    const panel = document.createElement('div');
    panel.id = 'broadcast-admin';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = 'Diffusion aux habitants';
    panel.innerHTML = `
        <div class="tn-eyebrow">Diffusion aux habitants</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">DIFFUSER UN MESSAGE À TOUS LES HABITANTS</h3>
        <p class="tn-hint">Le message s'affiche en tête de la plateforme et dans les notifications de chaque habitant, avec ce qu'il se passe et ce qu'il faut faire.</p>
        <form id="broadcast-form" class="tn-profile-form" onsubmit="publishBroadcast(event)">
            <div>
                <label class="tn-field-label" for="bc-template">Modèle rapide</label>
                <select id="bc-template" class="cyber-input" onchange="applyBroadcastTemplate(this.selectedIndex)">
                    ${TN_BROADCAST_TEMPLATES.map(template => `<option>${escapeHtml(template.label)}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="tn-field-label" for="bc-level">Niveau</label>
                <select id="bc-level" class="cyber-input">
                    ${Object.keys(TN_LEVELS).map(key => `<option value="${key}">${TN_LEVELS[key].label}</option>`).join('')}
                </select>
            </div>
            <div class="tn-wide">
                <label class="tn-field-label" for="bc-title">Titre du message</label>
                <input type="text" id="bc-title" class="cyber-input" required maxlength="120">
            </div>
            <div class="tn-wide">
                <label class="tn-field-label" for="bc-body">Ce qu'il se passe</label>
                <textarea id="bc-body" class="cyber-input" rows="3" required maxlength="600"></textarea>
            </div>
            <div class="tn-wide">
                <label class="tn-field-label" for="bc-action">Ce que les habitants doivent faire (une consigne par ligne)</label>
                <textarea id="bc-action" class="cyber-input" rows="4" maxlength="600"></textarea>
            </div>
            <fieldset class="tn-wide tn-fieldset">
                <legend class="tn-field-label">Secteurs concernés (aucune case cochée : toute la cité)</legend>
                <div class="tn-advice-options">
                    ${TN_SECTORS.filter(name => name !== 'Je ne sais pas').map(name => `
                        <label class="tn-check"><input type="checkbox" name="bc-sector" value="${escapeHtml(name)}"><span>${escapeHtml(name)}</span></label>
                    `).join('')}
                </div>
            </fieldset>
            <div>
                <label class="tn-field-label" for="bc-duration">Durée de validité</label>
                <select id="bc-duration" class="cyber-input">
                    <option value="0">Jusqu'à la levée du message</option>
                    <option value="1">1 heure</option>
                    <option value="6">6 heures</option>
                    <option value="24">24 heures</option>
                    <option value="72">3 jours</option>
                </select>
            </div>
            <div>
                <label class="tn-field-label" for="bc-code">Code de diffusion</label>
                <input type="password" id="bc-code" class="cyber-input" autocomplete="off">
            </div>
            <p class="tn-hint tn-wide" id="bc-mode"></p>
            <label class="tn-check tn-wide">
                <input type="checkbox" id="bc-official">
                <span>Message officiel : épinglé en tête du site et poussé en temps réel à tous les habitants connectés</span>
            </label>
            <label class="tn-check tn-wide">
                <input type="checkbox" id="bc-advice">
                <span>Proposer des recommandations adaptées aux personnes vulnérables</span>
            </label>
            <div class="tn-wide tn-alert-actions">
                <button type="submit" class="btn-cyber btn-amber px-5 py-2 text-xs font-bold uppercase">Diffuser maintenant</button>
                <span id="bc-status" class="tn-hint" role="status"></span>
            </div>
        </form>
        <div class="tn-kpi-label mt-6">Messages en cours</div>
        <ul id="broadcast-list" class="tn-notif-list"></ul>
    `;
    workspace.prepend(panel);
}

function applyBroadcastTemplate(index) {
    const template = TN_BROADCAST_TEMPLATES[index];
    if (!template || !template.level) return;
    document.getElementById('bc-level').value = template.level;
    document.getElementById('bc-title').value = t(template.title);
    document.getElementById('bc-body').value = t(template.body);
    document.getElementById('bc-action').value = template.action.split('\n').map(line => t(line)).join('\n');
    document.getElementById('bc-advice').checked = Boolean(template.advice);
}

function renderBroadcastList() {
    const list = document.getElementById('broadcast-list');
    const mode = document.getElementById('bc-mode');
    if (!list) return;

    if (mode) {
        mode.textContent = tnBroadcastServer.publishing
            ? "Avec le code de diffusion, le message est envoyé à tous les habitants. Sans code, il n'apparaît que sur cet appareil, à titre de démonstration."
            : "Diffusion à tous les appareils non configurée sur ce serveur : le message apparaît sur cet appareil uniquement.";
    }

    list.innerHTML = tnBroadcasts.length ? tnBroadcasts.map(item => {
        const level = TN_LEVELS[item.level] || TN_LEVELS.info;
        return `
            <li class="tn-broadcast-item">
                <span class="tn-badge tn-badge--${level.badge}">${level.label}</span>
                <span class="tn-notif-title">${escapeHtml(item.title)}</span>
                <span class="tn-step-date" data-no-i18n>${tnFormatStamp(item.createdAt)}</span>
                <button type="button" class="tn-link" onclick="retireBroadcast('${escapeHtml(item.id)}')">Lever ce message</button>
            </li>
        `;
    }).join('') : '<li class="tn-empty">Aucun message en cours.</li>';
}

async function publishBroadcast(event) {
    event.preventDefault();
    const status = document.getElementById('bc-status');
    const code = document.getElementById('bc-code').value;
    const hours = Number(document.getElementById('bc-duration').value);
    const draft = {
        level: document.getElementById('bc-level').value,
        title: document.getElementById('bc-title').value.trim(),
        body: document.getElementById('bc-body').value.trim(),
        action: document.getElementById('bc-action').value.trim(),
        sectors: Array.from(document.querySelectorAll('input[name="bc-sector"]:checked')).map(input => input.value),
        durationHours: hours,
        advice: document.getElementById('bc-advice').checked,
        official: Boolean(document.getElementById('bc-official') && document.getElementById('bc-official').checked),
        source: currentRole === 'admin' ? 'Haut Conseil de la Ville' : 'Services municipaux'
    };

    let message;
    if (code && tnBroadcastServer.publishing) {
        try {
            const res = await fetch('/api/broadcasts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, broadcast: draft })
            });
            if (res.status === 403) {
                status.textContent = 'Code de diffusion refusé.';
                return;
            }
            if (res.status !== 201) throw new Error(String(res.status));
            message = 'Message diffusé à tous les habitants.';
        } catch (err) {
            status.textContent = 'Diffusion impossible pour le moment.';
            return;
        }
    } else {
        const now = new Date();
        const local = Object.assign(draft, {
            id: `LOC-${now.getTime().toString(36).toUpperCase()}`,
            local: true,
            createdAt: now.toISOString(),
            expiresAt: hours > 0 ? new Date(now.getTime() + hours * 3600000).toISOString() : null
        });
        tnStore('tn_local_broadcasts', tnLoad('tn_local_broadcasts', []).concat(local).slice(-20));
        message = 'Message diffusé sur cet appareil uniquement.';
    }

    ['bc-title', 'bc-body', 'bc-action'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('bc-template').selectedIndex = 0;
    document.querySelectorAll('input[name="bc-sector"]').forEach(input => { input.checked = false; });
    document.getElementById('bc-advice').checked = false;
    if (document.getElementById('bc-official')) document.getElementById('bc-official').checked = false;
    status.textContent = message;
    await refreshBroadcasts();
}

async function retireBroadcast(id) {
    const status = document.getElementById('bc-status');
    const item = tnBroadcasts.find(entry => entry.id === id);
    const code = document.getElementById('bc-code').value;
    if (!item) return;

    if (item.local) {
        tnStore('tn_local_broadcasts', tnLoad('tn_local_broadcasts', []).filter(entry => entry.id !== id));
        status.textContent = 'Message levé.';
    } else if (code && tnBroadcastServer.publishing) {
        try {
            const res = await fetch('/api/broadcasts/retire', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, id })
            });
            if (res.status === 403) {
                status.textContent = 'Code de diffusion refusé.';
                return;
            }
            if (!res.ok) throw new Error(String(res.status));
            status.textContent = 'Message levé pour tous les habitants.';
        } catch (err) {
            status.textContent = 'Diffusion impossible pour le moment.';
            return;
        }
    } else {
        tnStore('tn_local_retired', tnLoad('tn_local_retired', []).concat(id));
        status.textContent = 'Message levé sur cet appareil uniquement.';
    }
    await refreshBroadcasts();
}

// ==========================================
// F32 — RECHERCHE : SERVICES, DÉMARCHES, ANNONCES, ALERTES, DEMANDES
// ==========================================
function tnFold(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function tnSearchItems() {
    const acknowledged = new Set(tnLoad('tn_ack_broadcasts', []));
    const items = [];

    tnBroadcasts.forEach(item => items.push({
        group: 'Alertes et messages', title: item.title,
        text: `${item.body} ${item.action} ${(item.sectors || []).join(' ')}`,
        attention: !acknowledged.has(item.id) && tnConcern(item) !== 'other',
        action: `goToAlert('${escapeHtml(item.id)}')`
    }));

    tnMyTickets().forEach(ticket => items.push({
        group: 'Mes démarches', title: `${ticket.id} — ${tnTicketTitle(ticket)}`, userText: true,
        text: `${ticket.service} ${t(ticket.service)} ${ticket.message} ${ticket.status} ${t(ticket.status)}`,
        attention: ticket.status !== 'Résolu',
        action: `goToMyTicket('${escapeHtml(ticket.id)}')`
    }));

    if (currentRole !== 'citizen') {
        citizenTickets.forEach(ticket => items.push({
            group: 'Demandes des habitants', title: `${ticket.id} — ${ticket.citizenName}`, userText: true,
            text: `${tnTicketTitle(ticket)} ${ticket.service} ${ticket.message} ${ticket.status} ${t(ticket.status)}`,
            attention: ticket.status === 'En attente',
            action: `goToAgentTicket('${escapeHtml(ticket.id)}')`
        }));
    }

    tnServices.forEach((service, index) => items.push({
        group: 'Services', title: service.title,
        text: `${service.description} ${t(service.description)} ${service.procedures} ${t(service.procedures)} ${TN_SERVICE_KEYWORDS[service.name] || ''}`,
        action: `goToService(${index})`
    }));

    items.push({
        group: 'Démarches', title: 'Contacter un service',
        text: 'question demande message écrire contact mairie administration',
        action: "closeToolPanels(); onboardingStartRequest('contact')"
    });
    TN_REPORT_KINDS.forEach((kind, index) => items.push({
        group: 'Démarches', title: kind.label,
        text: `signaler signalement problème ${TN_REPORT_KEYWORDS[index] || ''} ${kind.service} ${t(kind.service)}`,
        action: `goToReport(${index})`
    }));

    if (typeof newsData !== 'undefined') {
        newsData.forEach((article, index) => items.push({
            group: 'Annonces', title: article.title,
            text: `${article.badge} ${article.author} ${String(article.content).replace(/<[^>]+>/g, ' ')}`,
            action: `closeToolPanels(); openNewsDetail(${index})`
        }));
    }

    TN_SECTIONS.forEach(section => items.push({
        group: 'Rubriques', title: section.label, text: '',
        action: `goToSection('${section.id}')`
    }));

    return items;
}

function tnSearch(query) {
    const terms = tnFold(query).split(/\s+/).filter(Boolean);
    const items = tnSearchItems();

    // Sans mot saisi : ce qui demande l'attention de l'utilisateur
    if (!terms.length) return items.filter(item => item.attention);

    return items
        .map(item => {
            const title = tnFold(`${item.title} ${item.userText ? '' : t(item.title)}`);
            const text = tnFold(item.text);
            let score = 0;
            for (const term of terms) {
                if (title.includes(term)) score += 10;
                else if (text.includes(term)) score += 3;
                else return null;
            }
            return Object.assign(item, { score: score + (item.attention ? 5 : 0) });
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 14);
}

function toggleSearch(force) {
    const panel = document.getElementById('tn-search-panel');
    const open = typeof force === 'boolean' ? force : panel.hidden;
    closeToolPanels();
    if (!open) return;
    panel.hidden = false;
    document.getElementById('tn-search-toggle').setAttribute('aria-expanded', 'true');
    renderSearchResults();
    document.getElementById('tn-search-input').focus();
}

function renderSearchResults() {
    const box = document.getElementById('tn-search-results');
    const count = document.getElementById('tn-search-count');
    const query = document.getElementById('tn-search-input').value;
    if (!box) return;

    const results = tnSearch(query);
    const empty = !query.trim();
    count.textContent = empty
        ? (results.length ? t('{n} élément(s) demandent votre attention', { n: results.length }) : '')
        : t('{n} résultat(s)', { n: results.length });

    if (!results.length) {
        box.innerHTML = `<p class="tn-empty">${empty
            ? "Rien ne demande votre attention. Saisissez un mot : service, démarche, annonce ou numéro de suivi."
            : 'Aucun résultat. Essayez un autre mot, par exemple « santé », « transport » ou « signaler ».'}</p>`;
        return;
    }

    box.innerHTML = `
        <ul class="tn-notif-list">
            ${results.map(item => `
                <li>
                    <button type="button" class="tn-notif" onclick="${item.action}">
                        <span class="tn-step-date">${item.group}</span>
                        <span class="tn-notif-title" ${item.userText ? 'data-no-i18n' : ''}>${escapeHtml(item.title)}</span>
                        ${item.attention ? '<span class="tn-badge tn-badge--pending">À traiter</span>' : ''}
                    </button>
                </li>
            `).join('')}
        </ul>
    `;
}

function openFirstSearchResult() {
    const first = document.querySelector('#tn-search-results .tn-notif');
    if (first) first.click();
}

function goToService(index) {
    closeToolPanels();
    const all = document.querySelector('.service-filter-btn');
    if (all) all.click();
    tnFlash(tnServices[index].card);
}

function goToReport(index) {
    closeToolPanels();
    onboardingStartRequest('report');
    document.getElementById('report-kind').selectedIndex = index;
    updateReportRouting();
}

function goToSection(id) {
    closeToolPanels();
    tnFlash(document.getElementById(id), 'start');
}

function goToMyTicket(id) {
    closeToolPanels();
    const ticket = citizenTickets.find(entry => entry.id === id);
    trackerView = ticket && ticket.status === 'Résolu' ? 'history' : 'active';
    trackerQuery = '';
    trackerStatus = 'all';
    renderCitizenTracker();
    const card = document.getElementById(`ticket-${id}`);
    if (card) card.querySelector('details').open = true;
    tnFlash(card || document.getElementById('citizen-tracker'));
}

function goToAgentTicket(id) {
    closeToolPanels();
    const all = document.querySelector('.agent-ticket-filter');
    if (all) all.click();
    tnFlash(document.querySelector(`#agent-tickets-tbody tr[data-ticket="${id}"]`) || document.getElementById('agent-tickets-tbody'));
}

// Appelé quand l'habitant connecté change : secteur, situation et notifications lui sont propres
function refreshPersonalisedViews() {
    renderAlerts();
    renderNotifications();
}

// ==========================================
// INITIALISATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initAlerts();
    initTools();
    initBroadcastAdmin();
    refreshBroadcasts();

    // Un message publié apparaît chez tous les habitants en moins de 30 secondes
    setInterval(refreshBroadcasts, 30000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshBroadcasts(); });

    document.addEventListener('tn:langchange', () => {
        renderAlerts();
        renderNotifications();
        renderBroadcastList();
        if (!document.getElementById('tn-search-panel').hidden) renderSearchResults();
    });
});
