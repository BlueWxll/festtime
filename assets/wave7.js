// ==========================================
// VAGUE 7 — F45 plan des services physiques, F46 urgences et hôpitaux,
// F47 journal d'activité traçable, F48 « qui a modifié quoi » dans l'administration.
// Chargé après assets/wave6.js ; réutilise t(), announce, escapeHtml, w4OpenDialog, goToSection,
// tnMySector/setMySector, w5Outage, w4RenderAccounts et les fonctions de l'espace agents.
// ==========================================

function w7Esc(value) { return escapeHtml(String(value)); }

function w7Load(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; }
}

function w7Save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { }
}

function w7Locale() { return typeof tnLocale === 'function' ? tnLocale() : 'fr-FR'; }

// ==========================================================
// F45 / F46 — Plan de la ville, services physiques, urgences
// ==========================================================
const W7_SECTORS = {
    'Dôme Alpha - Anneau 1': { x: 27, y: 30 },
    'Dôme Bêta - Anneau 2': { x: 73, y: 30 },
    'Anneau Orbital Zéro': { x: 50, y: 58 },
    'Secteur Sud Extérieur': { x: 50, y: 88 }
};

const W7_CATS = {
    urgence: { label: 'Urgences et hôpitaux', icon: 'fa-truck-medical', shape: 'circle' },
    sante: { label: 'Santé : pharmacies et soins', icon: 'fa-house-medical', shape: 'circle' },
    secours: { label: 'Sécurité et abris', icon: 'fa-shield-halved', shape: 'diamond' },
    admin: { label: 'Mairie et état civil', icon: 'fa-landmark', shape: 'square' },
    transport: { label: 'Transports', icon: 'fa-train-tram', shape: 'square' },
    energie: { label: 'Énergie et air', icon: 'fa-bolt', shape: 'diamond' }
};

const W7_ALWAYS = { all: true };
const W7_WEEK = { days: [1, 2, 3, 4, 5] };

// x, y : position sur le plan (0 à 100). service : service municipal concerné (état F38)
const W7_POIS = [
    { id: 'hop-central', cat: 'urgence', name: 'Hôpital Central Cryo-Soins', sector: 'Dôme Alpha - Anneau 1', x: 22, y: 25, hours: W7_ALWAYS, contact: "Balise d'urgence 112", service: 'Santé Biotech & Cryo-Soins',
      what: "Urgences vitales, réanimation, cryo-soins, blocs opératoires. Entrée des urgences : côté Hyper-Tube, porte rouge.", way: "Station Hyper-Tube « Dôme Alpha », 2 minutes à pied." },
    { id: 'hop-beta', cat: 'urgence', name: 'Clinique Biotech Bêta', sector: 'Dôme Bêta - Anneau 2', x: 69, y: 26, hours: W7_ALWAYS, contact: "Balise d'urgence 112", service: 'Santé Biotech & Cryo-Soins',
      what: "Urgences, consultations, suivi des biolinks, aile Cryo-Soins (accueil 2).", way: "Station Hyper-Tube « Dôme Bêta », devant l'entrée principale." },
    { id: 'med-orbital', cat: 'urgence', name: 'Poste médical avancé Orbital Zéro', sector: 'Anneau Orbital Zéro', x: 45, y: 54, hours: W7_ALWAYS, contact: "Balise d'urgence 112", service: 'Santé Biotech & Cryo-Soins',
      what: "Premiers soins, stabilisation avant transfert vers un hôpital, défibrillateurs.", way: "Hall central de l'Anneau Orbital Zéro, au pied du Hub des Hyper-Tubes." },
    { id: 'inf-sud', cat: 'sante', name: 'Infirmerie du Secteur Sud', sector: 'Secteur Sud Extérieur', x: 44, y: 86, hours: { days: [0, 1, 2, 3, 4, 5, 6], open: '08:00', close: '20:00' }, contact: 'Poste 0-6-1', service: 'Santé Biotech & Cryo-Soins',
      what: "Soins courants, pansements, vaccins. En dehors des horaires : appelez le 112.", way: "À côté de la station Hyper-Tube « Secteur Sud »." },
    { id: 'pha-alpha', cat: 'sante', name: 'Pharmacie Biotech Alpha', sector: 'Dôme Alpha - Anneau 1', x: 33, y: 36, hours: { days: [0, 1, 2, 3, 4, 5, 6], open: '08:00', close: '20:00' }, contact: 'Poste 0-4-2', service: 'Santé Biotech & Cryo-Soins',
      what: "Médicaments, ordonnances, matériel de santé.", way: "Galerie marchande du Dôme Alpha, niveau 1." },
    { id: 'pha-beta', cat: 'sante', name: 'Pharmacie Biotech Bêta', sector: 'Dôme Bêta - Anneau 2', x: 78, y: 35, hours: { days: [1, 2, 3, 4, 5, 6], open: '09:00', close: '19:00' }, contact: 'Poste 0-4-3', service: 'Santé Biotech & Cryo-Soins',
      what: "Médicaments, ordonnances, matériel de santé.", way: "Face à la clinique, sous la verrière." },
    { id: 'sent-central', cat: 'secours', name: 'Poste Central des Sentinelles', sector: 'Dôme Alpha - Anneau 1', x: 30, y: 22, hours: W7_ALWAYS, contact: "Balise d'urgence 112", service: 'Sécurité Civile & Sentinelles',
      what: "Police, pompiers de dôme, déclaration d'incident. Accueil du public à toute heure.", way: "Station Hyper-Tube « Dôme Alpha », sortie nord." },
    { id: 'sent-sud', cat: 'secours', name: 'Poste des Sentinelles du Sud', sector: 'Secteur Sud Extérieur', x: 58, y: 90, hours: W7_ALWAYS, contact: "Balise d'urgence 112", service: 'Sécurité Civile & Sentinelles',
      what: "Intervention rapide en zone extérieure, secours en cas de montée des eaux.", way: "Au bout du quai de la station « Secteur Sud »." },
    { id: 'abri-sud', cat: 'secours', name: 'Abri anti-orage du Secteur Sud', sector: 'Secteur Sud Extérieur', x: 40, y: 92, hours: W7_ALWAYS, contact: '—', service: '',
      what: "Abri collectif ouvert en permanence : orage ionique, montée des eaux, alerte de la cité.", way: "Panneaux jaunes sur les trottoirs, 3 minutes à pied de la station." },
    { id: 'mairie', cat: 'admin', name: 'Hôtel de la Colonie (Mairie)', sector: 'Anneau Orbital Zéro', x: 55, y: 62, hours: { days: [1, 2, 3, 4, 5], open: '08:00', close: '17:00' }, contact: 'Poste 0-1-0', service: 'Mairie & État Civil Spatial',
      what: "Matricule colonial, état civil, attestations, rendez-vous avec un agent (guichet 4).", way: "Anneau Orbital Zéro, à 2 minutes du Hub des Hyper-Tubes." },
    { id: 'etat-civil', cat: 'admin', name: 'Annexe État Civil Bêta', sector: 'Dôme Bêta - Anneau 2', x: 80, y: 24, hours: { days: [1, 2, 3, 4, 5], open: '09:00', close: '16:00' }, contact: 'Poste 0-1-4', service: 'Mairie & État Civil Spatial',
      what: "Naissances, unions, attestations de résidence.", way: "Rez-de-chaussée du Dôme Bêta, près de la place centrale." },
    { id: 'hub', cat: 'transport', name: 'Hub Central des Hyper-Tubes', sector: 'Anneau Orbital Zéro', x: 47, y: 63, hours: { days: [0, 1, 2, 3, 4, 5, 6], open: '05:00', close: '23:00' }, contact: 'Poste 0-2-0', service: 'Transports & Hyper-Tubes',
      what: "Départ de toutes les lignes, abonnements (quai 1), objets perdus.", way: "Centre de l'Anneau Orbital Zéro." },
    { id: 'station-sud', cat: 'transport', name: 'Station Hyper-Tube « Secteur Sud »', sector: 'Secteur Sud Extérieur', x: 50, y: 84, hours: { days: [0, 1, 2, 3, 4, 5, 6], open: '05:00', close: '23:00' }, contact: 'Poste 0-2-6', service: 'Transports & Hyper-Tubes',
      what: "Terminus sud, correspondances avec l'abri et l'infirmerie.", way: "Entrée du Secteur Sud Extérieur." },
    { id: 'reacteur', cat: 'energie', name: 'Réacteur Zéro — accueil des habitants', sector: 'Anneau Orbital Zéro', x: 58, y: 54, hours: { days: [1, 2, 3, 4, 5], open: '08:00', close: '17:00' }, contact: 'Poste 0-3-0', service: 'Énergie Plasma & Réacteur Zéro',
      what: "Quotas d'énergie, raccordements, changement de compteur.", way: "Bâtiment d'accueil, côté Anneau Orbital Zéro." },
    { id: 'tour-air', cat: 'energie', name: "Tour de régulation de l'air", sector: 'Dôme Alpha - Anneau 1', x: 20, y: 36, hours: { days: [1, 2, 3, 4, 5], open: '08:00', close: '18:00' }, contact: 'Poste 0-5-0', service: 'Atmosphère & Biosphère',
      what: "Qualité de l'air, signalement d'une fuite ou d'une odeur suspecte.", way: "Anneau 1, accueil au pied de la tour." }
];

let w7Sel = '';
let w7Cat = 'all';
let w7Query = '';

function w7Position() {
    const mine = typeof tnMySector === 'function' ? tnMySector() : '';
    return mine && W7_SECTORS[mine] ? mine : '';
}

function w7Distance(poi, sector) {
    if (!sector) return null;
    const from = W7_SECTORS[sector];
    return Math.hypot(poi.x - from.x, poi.y - from.y);
}

function w7Minutes(distance) { return Math.max(1, Math.round(distance / 7)); }

function w7Clock(text) { const [h, m] = text.split(':').map(Number); return h * 60 + m; }

// Ouvert maintenant ? (heure de la cité = heure de l'appareil)
function w7OpenState(poi, now = new Date()) {
    const hours = poi.hours;
    if (hours.all) return { open: true, text: t('Ouvert 24 h/24, 7 j/7') };
    const minutes = now.getHours() * 60 + now.getMinutes();
    const days = hours.days;
    const open = days.includes(now.getDay()) && minutes >= w7Clock(hours.open) && minutes < w7Clock(hours.close);
    const names = [t('dim.'), t('lun.'), t('mar.'), t('mer.'), t('jeu.'), t('ven.'), t('sam.')];
    const dayText = days.length === 7 ? t('Tous les jours') : days.length === 6 ? t('Lun–Sam') : t('Lun–Ven');
    return { open, text: `${dayText} ${hours.open}–${hours.close}`, names };
}

function w7ServiceNote(poi) {
    const outage = poi.service && typeof w5Outage === 'function' ? w5Outage(poi.service) : null;
    if (!outage) return '';
    const emergency = poi.cat === 'urgence' || poi.id.startsWith('sent');
    return emergency
        ? t("Le service est en maintenance, mais les urgences restent ouvertes.")
        : t('Service interrompu : {back}.', { back: typeof w5BackText === 'function' ? w5BackText(outage) : '' });
}

function w7Sorted(list, sector) {
    return list.slice().sort((a, b) => {
        const da = w7Distance(a, sector);
        const db = w7Distance(b, sector);
        if (da === null || db === null) return t(a.name).localeCompare(t(b.name), tnLang || 'fr');
        return da - db;
    });
}

function w7Matches(poi) {
    if (w7Cat !== 'all' && poi.cat !== w7Cat) return false;
    if (!w7Query) return true;
    const hay = typeof tnFold === 'function'
        ? tnFold(`${t(poi.name)} ${t(poi.what)} ${t(W7_CATS[poi.cat].label)} ${poi.sector}`)
        : `${poi.name} ${poi.what}`.toLowerCase();
    return hay.includes(typeof tnFold === 'function' ? tnFold(w7Query) : w7Query.toLowerCase());
}

function w7CardHtml(poi, sector) {
    const cat = W7_CATS[poi.cat];
    const state = w7OpenState(poi);
    const distance = w7Distance(poi, sector);
    const away = distance === null ? '' : (poi.sector === sector ? t('Dans votre secteur') : t('À environ {n} min', { n: w7Minutes(distance) }));
    const note = w7ServiceNote(poi);
    return `
        <li class="tn-poi-card ${w7Sel === poi.id ? 'tn-poi-card--on' : ''}" id="poi-card-${poi.id}">
            <p class="tn-poi-head">
                <span class="tn-poi-icon tn-shape-${cat.shape}" aria-hidden="true"><i class="fa-solid ${cat.icon}"></i></span>
                <strong data-no-i18n>${w7Esc(t(poi.name))}</strong>
            </p>
            <p class="tn-hint" data-no-i18n>${w7Esc(t(cat.label))} · ${w7Esc(poi.sector)}${away ? ' · <b>' + w7Esc(away) + '</b>' : ''}</p>
            <p class="tn-poi-open" data-no-i18n><span class="tn-badge tn-badge--${state.open ? 'resolved' : 'neutral'}">${w7Esc(state.open ? t('Ouvert') : t('Fermé'))}</span> ${w7Esc(state.text)}</p>
            ${note ? `<p class="tn-poi-note" data-no-i18n>${w7Esc(note)}</p>` : ''}
            <p class="tn-poi-text" data-no-i18n>${w7Esc(t(poi.what))}</p>
            <p class="tn-hint" data-no-i18n><b>${w7Esc(t('Accès :'))}</b> ${w7Esc(t(poi.way))}</p>
            ${poi.contact && poi.contact !== '—' ? `<p class="tn-hint" data-no-i18n><b>${w7Esc(t('Contact :'))}</b> ${w7Esc(t(poi.contact))}</p>` : ''}
            <div class="tn-row-actions">
                <button type="button" class="tn-tab" data-poi-show="${poi.id}">Voir sur le plan</button>
                ${poi.service && W7_RDV.includes(poi.cat) ? `<button type="button" class="tn-tab" data-poi-rdv="${poi.id}">Prendre rendez-vous</button>` : ''}
            </div>
        </li>`;
}

const W7_RDV = ['admin', 'energie', 'sante'];

function w7Render() {
    const section = document.getElementById('plan-ville');
    if (!section) return;
    const sector = w7Position();
    const visible = w7Sorted(W7_POIS.filter(w7Matches), sector);

    const select = section.querySelector('#poi-pos');
    if (select && select.value !== sector) select.value = sector;

    section.querySelectorAll('[data-poi-cat]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.poiCat === w7Cat)));

    // Plan : tous les repères, ceux qui ne correspondent pas au filtre sont atténués
    const layer = section.querySelector('#city-pois');
    layer.innerHTML = W7_POIS.map(poi => {
        const cat = W7_CATS[poi.cat];
        const on = w7Matches(poi);
        return `<button type="button" class="tn-poi tn-shape-${cat.shape} ${w7Sel === poi.id ? 'tn-poi--on' : ''} ${on ? '' : 'tn-poi--dim'}" style="left:${poi.x}%;top:${poi.y}%" data-poi="${poi.id}"
            aria-label="${w7Esc(t(poi.name))}, ${w7Esc(t(cat.label))}" aria-pressed="${w7Sel === poi.id}" ${on ? '' : 'tabindex="-1" aria-hidden="true"'}><i aria-hidden="true" class="fa-solid ${cat.icon}"></i></button>`;
    }).join('') + (sector ? `<span class="tn-here" style="left:${W7_SECTORS[sector].x}%;top:${W7_SECTORS[sector].y}%" data-no-i18n><span class="tn-here-dot" aria-hidden="true"></span><span class="tn-here-label">${w7Esc(t('Vous êtes ici'))}</span></span>` : '');

    section.querySelector('#poi-count').textContent = visible.length ? t('{n} lieu(x) affiché(s)', { n: visible.length }) : t('Aucun lieu ne correspond.');
    section.querySelector('#poi-list').innerHTML = visible.length ? visible.map(poi => w7CardHtml(poi, sector)).join('') : `<li class="tn-empty">${w7Esc(t('Aucun lieu ne correspond. Essayez un autre mot ou « Tout ».'))}</li>`;

    // Le plus proche pour une urgence : toujours visible, sans changer d'écran
    const near = w7Nearest(sector);
    const box = section.querySelector('#poi-urgent');
    box.innerHTML = near ? `
        <p class="tn-eyebrow"><i aria-hidden="true" class="fa-solid fa-truck-medical"></i> ${w7Esc(t(sector ? "Urgence : le lieu le plus proche de vous" : 'Urgence : indiquez où vous êtes pour voir le plus proche'))}</p>
        <p class="tn-urgent-name" data-no-i18n>${w7Esc(t(near.name))}</p>
        <p class="tn-hint" data-no-i18n>${w7Esc(near.sector)}${sector ? ' · ' + w7Esc(near.sector === sector ? t('Dans votre secteur') : t('À environ {n} min', { n: w7Minutes(w7Distance(near, sector)) })) : ''} · ${w7Esc(t('Ouvert 24 h/24, 7 j/7'))}</p>
        <p class="tn-urgent-call" data-no-i18n>${w7Esc(t("En danger immédiat : appelez la balise d'urgence 112 (gratuit, 24 h/24)."))}</p>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-poi-show="${near.id}">Voir sur le plan</button><button type="button" class="tn-tab" data-open-emergency>Toutes les urgences</button></div>` : '';
}

function w7Nearest(sector) {
    const list = W7_POIS.filter(poi => poi.cat === 'urgence');
    return w7Sorted(list, sector)[0] || null;
}

function w7ShowPoi(id, focus) {
    const poi = W7_POIS.find(item => item.id === id);
    if (!poi) return;
    w4CloseDialog();
    w7Sel = id;
    if (!w7Matches(poi)) { w7Cat = 'all'; w7Query = ''; const input = document.getElementById('poi-search'); if (input) input.value = ''; }
    w7Render();
    if (typeof goToSection === 'function') goToSection('plan-ville');
    setTimeout(() => {
        const card = document.getElementById(`poi-card-${id}`);
        if (card && typeof tnFlash === 'function') tnFlash(card); else if (card) card.scrollIntoView({ block: 'center' });
        const marker = document.querySelector(`[data-poi="${id}"]`);
        if (focus && marker) marker.focus();
    }, 250);
    announce(t('{name} : {sector}. {state}', { name: t(poi.name), sector: poi.sector, state: w7OpenState(poi).text }));
}

function w7OpenEmergency() {
    const sector = w7Position();
    const list = w7Sorted(W7_POIS.filter(poi => poi.cat === 'urgence' || poi.cat === 'secours'), sector).slice(0, 4);
    const outage = typeof w5Outage === 'function' ? w5Outage('Santé Biotech & Cryo-Soins') : null;
    const options = Object.keys(W7_SECTORS).map(name => `<option value="${w7Esc(name)}" ${name === sector ? 'selected' : ''}>${w7Esc(name)}</option>`).join('');
    const body = `
        <p class="tn-urgent-call" data-no-i18n>${w7Esc(t("En danger immédiat : appelez d'abord la balise d'urgence 112 (gratuit, 24 h/24)."))}</p>
        <label class="tn-field-label" for="em-pos">${w7Esc(t('Où êtes-vous ?'))}</label>
        <select id="em-pos" class="cyber-input"><option value="" ${sector ? '' : 'selected'}>${w7Esc(t('Choisir mon secteur'))}</option>${options}</select>
        ${outage ? `<p class="tn-poi-note" data-no-i18n>${w7Esc(t('Les rendez-vous de santé sont suspendus, mais les urgences restent ouvertes.'))}</p>` : ''}
        <ol class="tn-em-list" data-no-i18n>${list.map(poi => {
            const state = w7OpenState(poi);
            const distance = w7Distance(poi, sector);
            return `<li><strong>${w7Esc(t(poi.name))}</strong><br><span class="tn-hint">${w7Esc(poi.sector)}${distance === null ? '' : ' · ' + w7Esc(poi.sector === sector ? t('Dans votre secteur') : t('À environ {n} min', { n: w7Minutes(distance) }))} · ${w7Esc(state.text)}</span><br><span class="tn-hint">${w7Esc(t(poi.way))}</span><br><button type="button" class="tn-tab" data-poi-show="${poi.id}">${w7Esc(t('Voir sur le plan'))}</button></li>`;
        }).join('')}</ol>
        <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus data-no-i18n>${w7Esc(t('Fermer'))}</button></div>`;
    w4OpenDialog(t('Urgences : où aller ?'), body);
    const dialog = document.getElementById('tn-dialog');
    dialog.querySelector('#em-pos').addEventListener('change', event => {
        if (typeof setMySector === 'function') setMySector(event.target.value);
        w7Render();
        w7OpenEmergency();
    });
}

function initCityMap() {
    const anchor = document.getElementById('transports') || document.getElementById('services-municipaux');
    if (!anchor || document.getElementById('plan-ville')) return;

    const section = document.createElement('section');
    section.id = 'plan-ville';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'plan-ville-title');
    section.dataset.crumb = 'Plan de la ville';
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1">
                <i aria-hidden="true" class="fa-solid fa-map-location-dot"></i>
                <span>Où trouver…</span>
            </div>
            <h2 id="plan-ville-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">PLAN DE LA VILLE</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">Hôpitaux, urgences, mairie, transports, pharmacies : un seul écran, le plus proche de vous en premier, avec les horaires et l'accès.</p>
        </div>
        <div id="poi-urgent" class="tn-urgent-box" role="region" aria-label="Urgence"></div>
        <div class="tn-poi-tools">
            <div>
                <label class="tn-field-label" for="poi-pos">Où êtes-vous ?</label>
                <select id="poi-pos" class="cyber-input"><option value="">Je ne sais pas</option>${Object.keys(W7_SECTORS).map(name => `<option value="${w7Esc(name)}" data-no-i18n>${w7Esc(name)}</option>`).join('')}</select>
            </div>
            <div>
                <label class="tn-field-label" for="poi-search">Chercher un lieu</label>
                <input id="poi-search" type="search" class="cyber-input" autocomplete="off" placeholder="ex : hôpital, pharmacie, mairie">
            </div>
        </div>
        <div class="tn-tabs" role="group" aria-label="Filtrer par type de lieu">
            <button type="button" class="tn-tab" data-poi-cat="all" aria-pressed="true">Tout</button>
            ${Object.keys(W7_CATS).map(key => `<button type="button" class="tn-tab" data-poi-cat="${key}" aria-pressed="false"><i aria-hidden="true" class="fa-solid ${W7_CATS[key].icon}"></i> ${w7Esc(W7_CATS[key].label)}</button>`).join('')}
        </div>
        <p id="poi-count" class="tn-tracker-count" role="status" data-no-i18n></p>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-5">
                <div class="tn-map" id="city-map" role="group" aria-label="Plan schématique de la ville : la liste à côté donne les mêmes lieux">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
                        <ellipse cx="50" cy="52" rx="47" ry="47" class="map-city"/>
                        <line x1="27" y1="30" x2="73" y2="30" class="map-tube"/><line x1="27" y1="30" x2="50" y2="58" class="map-tube"/><line x1="73" y1="30" x2="50" y2="58" class="map-tube"/><line x1="50" y1="58" x2="50" y2="88" class="map-tube"/>
                        <circle cx="27" cy="30" r="16" class="map-dome"/><circle cx="27" cy="30" r="9" class="map-ring"/>
                        <circle cx="73" cy="30" r="16" class="map-dome"/><circle cx="73" cy="30" r="9" class="map-ring"/>
                        <circle cx="50" cy="58" r="15" class="map-dome map-core"/><circle cx="50" cy="58" r="8" class="map-ring"/>
                        <ellipse cx="50" cy="88" rx="30" ry="8" class="map-zone"/>
                        <text x="27" y="12" class="map-label" text-anchor="middle">DÔME ALPHA</text>
                        <text x="73" y="12" class="map-label" text-anchor="middle">DÔME BÊTA</text>
                        <text x="50" y="76" class="map-label" text-anchor="middle">ORBITAL ZÉRO</text>
                        <text x="50" y="99" class="map-label" text-anchor="middle">SECTEUR SUD</text>
                    </svg>
                    <div id="city-pois"></div>
                </div>
                <p class="tn-hint">Plan schématique, non à l'échelle. Les lignes sont les Hyper-Tubes.</p>
            </div>
            <div class="lg:col-span-7"><ul id="poi-list" class="tn-poi-list"></ul></div>
        </div>
    `;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'plan-ville')) {
        TN_SECTIONS.splice(TN_SECTIONS.findIndex(entry => entry.id === 'transports') + 1 || TN_SECTIONS.length, 0, { id: 'plan-ville', label: 'Plan de la ville' });
    }
    const navLink = document.querySelector('#site-nav a[href="#transports"]') || document.querySelector('#site-nav a[href="#services-municipaux"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#plan-ville';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-map-location-dot text-[11px] text-[#00B8FF]"></i><span>PLAN DE LA VILLE</span>';
        navLink.after(link);
    }

    section.querySelector('#poi-pos').addEventListener('change', event => {
        if (typeof setMySector === 'function') setMySector(event.target.value);
        w7Render();
    });
    section.querySelector('#poi-search').addEventListener('input', event => { w7Query = event.target.value.trim(); w7Render(); });
    section.addEventListener('click', event => {
        const cat = event.target.closest('[data-poi-cat]');
        const marker = event.target.closest('[data-poi]');
        const show = event.target.closest('[data-poi-show]');
        const rdv = event.target.closest('[data-poi-rdv]');
        const emergency = event.target.closest('[data-open-emergency]');
        if (cat) { w7Cat = cat.dataset.poiCat; w7Render(); announce(t('{n} lieu(x) affiché(s)', { n: W7_POIS.filter(w7Matches).length })); }
        else if (marker) {
            w7Sel = marker.dataset.poi;
            w7Render();
            const card = document.getElementById(`poi-card-${w7Sel}`);
            if (card && typeof tnFlash === 'function') tnFlash(card); else if (card) card.scrollIntoView({ block: 'nearest' });
            const again = document.querySelector(`[data-poi="${w7Sel}"]`);
            if (again) again.focus();
            const poi = W7_POIS.find(item => item.id === w7Sel);
            announce(`${t(poi.name)} : ${poi.sector}. ${w7OpenState(poi).text}`);
        }
        else if (show) w7ShowPoi(show.dataset.poiShow, true);
        else if (rdv) w7BookAt(rdv.dataset.poiRdv);
        else if (emergency) w7OpenEmergency();
    });
    // Le dialogue des urgences utilise les mêmes boutons « Voir sur le plan »
    document.addEventListener('click', event => {
        const show = event.target.closest('#tn-dialog [data-poi-show]');
        if (show) w7ShowPoi(show.dataset.poiShow, true);
        const open = event.target.closest('[data-open-emergency]');
        if (open && !event.target.closest('#plan-ville')) w7OpenEmergency();
    });

    w7Render();
    setInterval(w7Render, 60000);
}

// « Prendre rendez-vous » depuis un lieu : le service est déjà choisi
function w7BookAt(id) {
    const poi = W7_POIS.find(item => item.id === id);
    if (!poi || !poi.service || typeof w5Pick === 'undefined') return;
    const select = document.getElementById('appt-service');
    if (!select) return;
    select.value = poi.service;
    select.dispatchEvent(new Event('change'));
    goToSection('rendez-vous');
    setTimeout(() => { const motif = document.getElementById('appt-motif'); if (motif) motif.focus(); }, 500);
}

function initEmergencyButton() {
    const tools = document.querySelector('.tn-tools');
    if (!tools || document.getElementById('tn-urgent-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'tn-urgent-toggle';
    button.className = 'tn-tool tn-tool--urgent';
    button.title = 'Urgences';
    button.innerHTML = '<i aria-hidden="true" class="fa-solid fa-truck-medical"></i><span class="tn-tool-label">Urgences</span>';
    button.addEventListener('click', w7OpenEmergency);
    tools.insertBefore(button, tools.firstChild);
}

// ==========================================================
// F47 / F48 — Journal d'activité traçable
// Chaque action est inscrite avec qui, quand, quoi, sur quoi, avant et après. Le journal ne peut qu'être
// complété : chaque ligne contient l'empreinte de la précédente (SHA-256), toute altération se voit.
// ==========================================================
const W7_AUDIT = { chain: 'tn_audit_chain', anchor: 'tn_audit_anchor', name: 'tn_staff_name' };
const W7_AUDIT_MAX = 500;
const W7_CAT_LABEL = {
    compte: 'Comptes', service: 'Disponibilité des services', une: 'Services à la une', diffusion: 'Messages diffusés',
    demande: 'Demandes', acces: 'Accès et rôles', securite: 'Sécurité', systeme: 'Système'
};
const W7_ADMIN_CATS = ['compte', 'service', 'une', 'diffusion', 'acces', 'securite'];

let w7AuditQueue = Promise.resolve();
let w7AuditView = { tab: 'all', query: '', actor: '', cat: '', from: '', to: '', limit: 25 };

async function w7Sha(text) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    for (const char of text) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
    return 'djb2' + hash.toString(16).padStart(8, '0');
}

function w7Chain() {
    const chain = w7Load(W7_AUDIT.chain, []);
    return Array.isArray(chain) ? chain : [];
}

function w7StaffName() {
    const stored = w7Load(W7_AUDIT.name, '');
    return typeof stored === 'string' ? stored.trim() : '';
}

function w7Actor() {
    if (currentRole === 'agent' || currentRole === 'admin') {
        return { role: currentRole === 'admin' ? 'Administrateur' : 'Agent', name: w7StaffName() || t('Agent non nommé'), id: '' };
    }
    if (typeof activeCitizen !== 'undefined' && activeCitizen) return { role: 'Citoyen', name: activeCitizen.name, id: activeCitizen.matricule };
    return { role: 'Visiteur', name: t('Visiteur non connecté'), id: '' };
}

function w7Body(entry) {
    return JSON.stringify([entry.n, entry.at, entry.actor, entry.category, entry.action, entry.target, entry.targetLabel, entry.before, entry.after]);
}

// Inscrit une action. Les écritures se font l'une après l'autre pour que la chaîne reste dans l'ordre.
function tnAuditRecord(info) {
    const actor = w7Actor();
    const at = new Date().toISOString();
    w7AuditQueue = w7AuditQueue.then(async () => {
        const chain = w7Chain();
        const last = chain[chain.length - 1];
        const prev = last ? last.hash : (w7Load(W7_AUDIT.anchor, '') || 'origine');
        const entry = {
            n: last ? last.n + 1 : 1, at, actor,
            category: info.category || 'systeme', action: String(info.action || ''),
            target: info.target || '', targetLabel: info.targetLabel || '',
            before: info.before || null, after: info.after || null, prev
        };
        entry.hash = await w7Sha(prev + '|' + w7Body(entry));
        chain.push(entry);
        while (chain.length > W7_AUDIT_MAX) {
            const dropped = chain.shift();
            w7Save(W7_AUDIT.anchor, dropped.hash);
        }
        w7Save(W7_AUDIT.chain, chain);
        w7RenderAudit();
        document.dispatchEvent(new Event('tn:audit'));
    }).catch(() => { });
    return w7AuditQueue;
}

async function w7VerifyChain() {
    const chain = w7Chain();
    let prev = chain.length ? (chain[0].n === 1 ? 'origine' : (w7Load(W7_AUDIT.anchor, '') || chain[0].prev)) : '';
    for (const entry of chain) {
        if (entry.prev !== prev) return { ok: false, at: entry.n, count: chain.length };
        const expected = await w7Sha(entry.prev + '|' + w7Body(entry));
        if (expected !== entry.hash) return { ok: false, at: entry.n, count: chain.length };
        prev = entry.hash;
    }
    return { ok: true, count: chain.length };
}

const W7_FIELD = { name: 'Nom', role: 'Rôle', dome: 'Dôme', etat: 'État', statut: 'Statut', titre: 'Titre', niveau: 'Niveau', raison: 'Raison', retour: 'Retour prévu', alternative: 'Service à contacter', conseil: 'Que faire', services: 'Services à la une', nom: 'Nom' };

function w7Diff(entry) {
    const keys = Array.from(new Set(Object.keys(entry.before || {}).concat(Object.keys(entry.after || {}))));
    const rows = keys.filter(key => JSON.stringify((entry.before || {})[key]) !== JSON.stringify((entry.after || {})[key]));
    const show = value => value === undefined || value === null || value === '' ? '—' : Array.isArray(value) ? (value.join(', ') || '—') : String(value);
    return rows.map(key => ({ field: W7_FIELD[key] ? t(W7_FIELD[key]) : key, before: show((entry.before || {})[key]), after: show((entry.after || {})[key]) }));
}

function w7Stamp(iso) {
    const date = new Date(iso);
    return date.toLocaleString(w7Locale(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function w7Filtered() {
    const view = w7AuditView;
    const query = view.query ? (typeof tnFold === 'function' ? tnFold(view.query) : view.query.toLowerCase()) : '';
    const fold = text => typeof tnFold === 'function' ? tnFold(text) : String(text).toLowerCase();
    return w7Chain().filter(entry => {
        if (view.tab === 'admin' && !W7_ADMIN_CATS.includes(entry.category)) return false;
        if (view.cat && entry.category !== view.cat) return false;
        if (view.actor && `${entry.actor.name}|${entry.actor.role}` !== view.actor) return false;
        const day = entry.at.slice(0, 10);
        const local = new Date(entry.at);
        const localDay = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        if (view.from && localDay < view.from) return false;
        if (view.to && localDay > view.to) return false;
        if (query && !fold(`${entry.actor.name} ${entry.actor.role} ${entry.action} ${entry.target} ${entry.targetLabel} ${JSON.stringify(entry.before)} ${JSON.stringify(entry.after)} ${day}`).includes(query)) return false;
        return true;
    }).reverse();
}

function w7EntryRow(entry) {
    const diff = w7Diff(entry);
    return `<tr class="border-b border-cyan-900/30" data-n="${entry.n}">
        <td class="py-2.5 px-3 align-top" data-no-i18n><time datetime="${w7Esc(entry.at)}">${w7Esc(w7Stamp(entry.at))}</time><div class="tn-hint">#${entry.n}</div></td>
        <td class="py-2.5 px-3 align-top" data-no-i18n><strong>${w7Esc(entry.actor.name)}</strong><div class="tn-hint">${w7Esc(t(entry.actor.role))}${entry.actor.id ? ' · ' + w7Esc(entry.actor.id) : ''}</div></td>
        <td class="py-2.5 px-3 align-top" data-no-i18n><span class="tn-badge tn-badge--neutral">${w7Esc(t(W7_CAT_LABEL[entry.category] || entry.category))}</span><div>${w7Esc(t(entry.action))}</div></td>
        <td class="py-2.5 px-3 align-top" data-no-i18n>${w7Esc(entry.targetLabel || entry.target || '—')}${entry.target && entry.targetLabel ? `<div class="tn-hint">${w7Esc(entry.target)}</div>` : ''}${entry.target ? `<button type="button" class="tn-link" data-w7-history="${w7Esc(entry.target)}" data-w7-label="${w7Esc(entry.targetLabel || entry.target)}">${w7Esc(t('Historique'))}</button>` : ''}</td>
        <td class="py-2.5 px-3 align-top" data-no-i18n>${diff.length ? `<ul class="tn-diff">${diff.map(row => `<li><b>${w7Esc(row.field)}</b> : <del>${w7Esc(row.before)}</del> <span aria-hidden="true">→</span><span class="sr-only">${w7Esc(t('devient'))}</span> <ins>${w7Esc(row.after)}</ins></li>`).join('')}</ul>` : '—'}</td>
    </tr>`;
}

function w7RenderAudit() {
    const panel = document.getElementById('audit-journal');
    if (!panel) return;
    const view = w7AuditView;
    panel.querySelectorAll('[data-audit-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.auditTab === view.tab)));

    const chain = w7Chain();
    const actors = Array.from(new Set(chain.map(entry => `${entry.actor.name}|${entry.actor.role}`)));
    const actorSelect = panel.querySelector('#audit-actor');
    const current = actorSelect.value;
    actorSelect.innerHTML = `<option value="">${w7Esc(t('Toutes les personnes'))}</option>` + actors.map(key => { const [name, role] = key.split('|'); return `<option value="${w7Esc(key)}" data-no-i18n>${w7Esc(name)} (${w7Esc(t(role))})</option>`; }).join('');
    actorSelect.value = actors.includes(current) ? current : '';
    view.actor = actorSelect.value;

    const catSelect = panel.querySelector('#audit-cat');
    if (!catSelect.options.length) catSelect.innerHTML = `<option value="">${w7Esc(t('Tous les types'))}</option>` + Object.keys(W7_CAT_LABEL).map(key => `<option value="${key}">${w7Esc(t(W7_CAT_LABEL[key]))}</option>`).join('');

    const rows = w7Filtered();
    const shown = rows.slice(0, view.limit);
    panel.querySelector('#audit-count').textContent = rows.length ? t('{n} ligne(s), les plus récentes en premier.', { n: rows.length }) : t('Aucune action ne correspond.');
    panel.querySelector('#audit-body').innerHTML = shown.length ? shown.map(w7EntryRow).join('') : `<tr><td colspan="5" class="py-6 px-3 text-[#6F8696]">${w7Esc(t('Aucune action enregistrée pour ces filtres.'))}</td></tr>`;
    panel.querySelector('#audit-more').hidden = rows.length <= shown.length;
    const nameInput = panel.querySelector('#audit-name');
    if (document.activeElement !== nameInput) nameInput.value = w7StaffName();
    const who = panel.querySelector('#audit-who');
    who.textContent = w7StaffName() ? t('Vos actions sont inscrites au nom de : {name}.', { name: w7StaffName() }) : t("Vous n'avez pas indiqué votre nom : vos actions apparaissent comme « Agent non nommé ».");
}

function initAuditPanel() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('audit-journal')) return;
    const panel = document.createElement('div');
    panel.id = 'audit-journal';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = "Journal d'activité";
    panel.innerHTML = `
        <div class="tn-eyebrow">Traçabilité</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">JOURNAL D'ACTIVITÉ</h3>
        <p class="tn-hint">Qui a fait quoi, quand, sur quoi, avec la valeur avant et après. Le journal ne peut pas être modifié ni vidé : chaque ligne contient l'empreinte de la précédente, une altération est détectée par la vérification d'intégrité.</p>
        <form id="audit-name-form" class="tn-audit-name" onsubmit="return false">
            <div><label class="tn-field-label" for="audit-name">Votre nom d'agent (inscrit dans le journal)</label>
            <input id="audit-name" class="cyber-input" maxlength="40" autocomplete="name" placeholder="ex : Maëlle Voss"></div>
            <button type="button" id="audit-name-save" class="tn-tab">Enregistrer mon nom</button>
        </form>
        <p id="audit-who" class="tn-hint" role="status" data-no-i18n></p>
        <div class="tn-tabs" role="group" aria-label="Type de journal">
            <button type="button" class="tn-tab" data-audit-tab="all" aria-pressed="true">Toutes les actions</button>
            <button type="button" class="tn-tab" data-audit-tab="admin" aria-pressed="false">Modifications de l'administration</button>
        </div>
        <div class="tn-audit-filters">
            <div><label class="tn-field-label" for="audit-q">Rechercher</label><input id="audit-q" type="search" class="cyber-input" autocomplete="off" placeholder="nom, matricule, ticket, mot…"></div>
            <div><label class="tn-field-label" for="audit-actor">Qui</label><select id="audit-actor" class="cyber-input"></select></div>
            <div><label class="tn-field-label" for="audit-cat">Quoi</label><select id="audit-cat" class="cyber-input"></select></div>
            <div><label class="tn-field-label" for="audit-from">Du</label><input id="audit-from" type="date" class="cyber-input"></div>
            <div><label class="tn-field-label" for="audit-to">Au</label><input id="audit-to" type="date" class="cyber-input"></div>
        </div>
        <p id="audit-count" class="tn-tracker-count" role="status" data-no-i18n></p>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs tn-audit-table">
                <caption class="sr-only">Journal d'activité de la plateforme</caption>
                <thead><tr class="border-b border-cyan-900/60 text-[#6F8696] uppercase text-[10px]">
                    <th scope="col" class="py-2.5 px-3">Date et heure</th><th scope="col" class="py-2.5 px-3">Qui</th><th scope="col" class="py-2.5 px-3">Quoi</th><th scope="col" class="py-2.5 px-3">Sur quoi</th><th scope="col" class="py-2.5 px-3">Avant → après</th>
                </tr></thead>
                <tbody id="audit-body"></tbody>
            </table>
        </div>
        <div class="tn-row-actions tn-audit-actions">
            <button type="button" id="audit-more" class="tn-tab" hidden>Afficher plus</button>
            <button type="button" id="audit-verify" class="tn-tab">Vérifier l'intégrité</button>
            <button type="button" id="audit-export" class="tn-tab">Exporter en CSV</button>
        </div>
        <p id="audit-verify-result" class="tn-hint" role="status" data-no-i18n></p>
    `;
    const anchor = document.getElementById('account-admin');
    if (anchor) anchor.after(panel); else workspace.appendChild(panel);

    panel.querySelectorAll('[data-audit-tab]').forEach(button => button.addEventListener('click', () => { w7AuditView.tab = button.dataset.auditTab; w7AuditView.limit = 25; w7RenderAudit(); }));
    const bind = (id, key) => panel.querySelector(id).addEventListener('input', event => { w7AuditView[key] = event.target.value; w7AuditView.limit = 25; w7RenderAudit(); });
    bind('#audit-q', 'query'); bind('#audit-actor', 'actor'); bind('#audit-cat', 'cat'); bind('#audit-from', 'from'); bind('#audit-to', 'to');
    panel.querySelector('#audit-more').addEventListener('click', () => { w7AuditView.limit += 25; w7RenderAudit(); });
    panel.querySelector('#audit-verify').addEventListener('click', async () => {
        const result = await w7VerifyChain();
        panel.querySelector('#audit-verify-result').textContent = result.ok
            ? t('Journal intact : {n} ligne(s) vérifiée(s), aucune altération.', { n: result.count })
            : t("Altération détectée à la ligne n° {n} : le journal a été modifié.", { n: result.at });
        announce(panel.querySelector('#audit-verify-result').textContent);
    });
    panel.querySelector('#audit-export').addEventListener('click', w7ExportCsv);
    panel.querySelector('#audit-name-save').addEventListener('click', () => {
        const input = panel.querySelector('#audit-name');
        const before = w7StaffName();
        const name = input.value.trim();
        if (!name) { announce(t('Indiquez votre nom.')); input.focus(); return; }
        w7Save(W7_AUDIT.name, name);
        tnAuditRecord({ category: 'acces', action: "Nom d'agent défini", target: 'agent', targetLabel: name, before: { nom: before }, after: { nom: name } });
        announce(t('Nom enregistré.'));
    });
    panel.addEventListener('click', event => {
        const history = event.target.closest('[data-w7-history]');
        if (history) w7OpenHistory(history.dataset.w7History, history.dataset.w7Label);
    });
    w7RenderAudit();
}

function w7ExportCsv() {
    const cell = value => `"${String(value === undefined || value === null ? '' : value).replace(/"/g, '""')}"`;
    const lines = [['n', 'date', 'role', 'nom', 'matricule', 'type', 'action', 'cible', 'libelle', 'avant', 'apres', 'empreinte'].join(',')];
    w7Chain().forEach(entry => lines.push([entry.n, entry.at, entry.actor.role, entry.actor.name, entry.actor.id, entry.category, entry.action, entry.target, entry.targetLabel, JSON.stringify(entry.before || ''), JSON.stringify(entry.after || ''), entry.hash].map(cell).join(',')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `journal-terra-nova-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    tnAuditRecord({ category: 'securite', action: 'Journal exporté en CSV', target: 'journal', targetLabel: String(w7Chain().length) });
}

// Historique d'un élément : toutes les modifications d'un compte, d'un service, d'une demande…
function w7History(target) { return w7Chain().filter(entry => entry.target === target).reverse(); }

function w7OpenHistory(target, label) {
    const items = w7History(target);
    w4OpenDialog(t('Historique : {name}', { name: label || target }), `
        ${items.length ? `<ol class="tn-history" data-no-i18n>${items.map(entry => {
            const diff = w7Diff(entry);
            return `<li><time datetime="${w7Esc(entry.at)}">${w7Esc(w7Stamp(entry.at))}</time> — <strong>${w7Esc(entry.actor.name)}</strong> (${w7Esc(t(entry.actor.role))})<br>${w7Esc(t(entry.action))}${diff.length ? `<ul class="tn-diff">${diff.map(row => `<li><b>${w7Esc(row.field)}</b> : <del>${w7Esc(row.before)}</del> → <ins>${w7Esc(row.after)}</ins></li>`).join('')}</ul>` : ''}</li>`;
        }).join('')}</ol>` : `<p class="tn-empty">${w7Esc(t('Aucune modification enregistrée pour cet élément.'))}</p>`}
        <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus data-no-i18n>${w7Esc(t('Fermer'))}</button></div>
    `);
}

function w7LastMod(target) {
    const entry = w7History(target)[0];
    if (!entry) return t('Dernière modification : aucune enregistrée.');
    return t('Dernière modification : {name}, le {when}.', { name: entry.actor.name, when: w7Stamp(entry.at) });
}

// --- Branchement sur les actions existantes ---
function w7Snapshot(account) { return account ? { nom: account.name, role: account.role, dome: account.dome, etat: account.suspended ? 'Suspendu' : 'Actif' } : null; }

function initAuditHooks() {
    // Changements d'état des demandes (espace agents)
    const baseStatus = updateTicketStatus;
    updateTicketStatus = function (ticketId, newStatus) {
        const ticket = citizenTickets.find(item => item.id === ticketId);
        const before = ticket ? ticket.status : '';
        const result = baseStatus.apply(this, arguments);
        if (ticket && before !== newStatus) {
            tnAuditRecord({ category: 'demande', action: "Changement d'état de la demande", target: ticketId, targetLabel: `${ticket.service || ''}`.trim(), before: { statut: before }, after: { statut: newStatus } });
        }
        return result;
    };

    // Changement de rôle
    const baseRole = switchRole;
    switchRole = function (newRole) {
        const before = currentRole;
        const result = baseRole.apply(this, arguments);
        if (before !== newRole) tnAuditRecord({ category: 'acces', action: 'Changement de profil', target: 'profil', targetLabel: w7Actor().name, before: { role: before }, after: { role: newRole } });
        return result;
    };

    // Services à la une
    if (typeof toggleFeaturedService === 'function') {
        const baseFeature = toggleFeaturedService;
        toggleFeaturedService = function (index) {
            const before = loadFeaturedServices().slice();
            const result = baseFeature.apply(this, arguments);
            const after = loadFeaturedServices().slice();
            const service = tnServices[index];
            tnAuditRecord({ category: 'une', action: after.length > before.length ? 'Service mis à la une' : 'Service retiré de la une', target: `une:${service.name}`, targetLabel: service.name, before: { services: before }, after: { services: after } });
            return result;
        };
    }

    // Messages diffusés et levés
    if (typeof publishBroadcast === 'function') {
        const basePublish = publishBroadcast;
        publishBroadcast = async function (event) {
            const title = (document.getElementById('bc-title') || {}).value || '';
            const level = (document.getElementById('bc-level') || {}).value || '';
            const result = await basePublish.apply(this, arguments);
            const status = (document.getElementById('bc-status') || {}).textContent || '';
            if (/diffusé/i.test(status)) tnAuditRecord({ category: 'diffusion', action: 'Message diffusé', target: `diffusion:${title.trim().slice(0, 40)}`, targetLabel: title.trim(), before: null, after: { titre: title.trim(), niveau: level } });
            return result;
        };
    }
    if (typeof retireBroadcast === 'function') {
        const baseRetire = retireBroadcast;
        retireBroadcast = async function (id) {
            const item = tnBroadcasts.find(entry => entry.id === id);
            const result = await baseRetire.apply(this, arguments);
            const status = (document.getElementById('bc-status') || {}).textContent || '';
            if (item && /levé/i.test(status)) tnAuditRecord({ category: 'diffusion', action: 'Message levé', target: `diffusion:${item.title.slice(0, 40)}`, targetLabel: item.title, before: { statut: 'Diffusé' }, after: { statut: 'Levé' } });
            return result;
        };
    }

    // Comptes (wave4), disponibilité des services et déblocages (wave5) : w4Audit transmet le détail
    const baseAudit = w4Audit;
    w4Audit = function (text, detail) {
        baseAudit.apply(this, arguments);
        const info = Object.assign({ category: 'compte', action: text }, detail || {});
        tnAuditRecord(info);
    };

    // Comptes : lignes enrichies (dernière modification + bouton Historique)
    if (typeof w4RenderAccounts === 'function') {
        const baseRender = w4RenderAccounts;
        w4RenderAccounts = function () {
            const result = baseRender.apply(this, arguments);
            document.querySelectorAll('tr[data-account]').forEach(row => {
                if (row.querySelector('.tn-lastmod')) return;
                const id = row.dataset.account;
                const first = row.querySelector('td');
                const line = document.createElement('div');
                line.className = 'tn-hint tn-lastmod';
                line.setAttribute('data-no-i18n', '');
                line.textContent = w7LastMod(id);
                if (first) first.appendChild(line);
                const actions = row.querySelector('.tn-row-actions');
                if (actions) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'tn-tab';
                    button.dataset.w7History = id;
                    button.dataset.w7Label = (row.querySelector('td .font-semibold') || {}).textContent || id;
                    button.textContent = t('Historique');
                    button.setAttribute('data-no-i18n', '');
                    actions.appendChild(button);
                }
            });
            return result;
        };
    }
    document.addEventListener('click', event => {
        const history = event.target.closest('#account-admin [data-w7-history], #service-status-admin [data-w7-history]');
        if (history) w7OpenHistory(history.dataset.w7History, history.dataset.w7Label);
    });
}

function initServiceHistory() {
    const form = document.getElementById('svc-form');
    if (!form || document.getElementById('svc-lastmod')) return;
    const name = form.querySelector('#svc-name');
    const line = document.createElement('p');
    line.id = 'svc-lastmod';
    line.className = 'tn-hint';
    line.setAttribute('data-no-i18n', '');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tn-link';
    button.setAttribute('data-no-i18n', '');
    button.textContent = t('Historique de ce service');
    const wrap = document.createElement('div');
    wrap.appendChild(line);
    wrap.appendChild(button);
    name.parentElement.appendChild(wrap);
    const sync = () => { line.textContent = w7LastMod(`service:${name.value}`); };
    name.addEventListener('change', sync);
    button.addEventListener('click', () => w7OpenHistory(`service:${name.value}`, name.value));
    sync();
    document.addEventListener('tn:audit', sync);
}

// ==========================================================
// Démarrage
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const baseRefresh = refreshPersonalisedViews;
    refreshPersonalisedViews = function () { baseRefresh(); w7Render(); w7RenderAudit(); };
    if (typeof setMySector === 'function') {
        const baseSector = setMySector;
        setMySector = function (sector) { baseSector.apply(this, arguments); w7Render(); };
    }
    const baseApply = applyRolePermissions;
    applyRolePermissions = function () { baseApply(); w7RenderAudit(); };

    const baseSearch = tnSearchItems;
    tnSearchItems = function () {
        return baseSearch().concat(W7_POIS.map(poi => ({
            group: 'Lieux', title: poi.name,
            text: `${W7_CATS[poi.cat].label} ${poi.sector} ${poi.what} ${poi.cat === 'urgence' ? 'urgence urgences hôpital hopital secours médecin' : ''} ${poi.cat === 'sante' ? 'pharmacie médicament soins' : ''}`,
            action: `w7ShowPoi('${poi.id}')`
        })), [{
            group: 'Lieux', title: 'Urgences : où aller ?',
            text: 'urgence urgences hôpital hopital ambulance secours danger 112 plus proche',
            action: 'w7OpenEmergency()'
        }]);
    };

    initCityMap();
    initEmergencyButton();
    initAuditHooks();
    initAuditPanel();
    initServiceHistory();

    // Première ligne du journal : la chaîne démarre toujours par un événement système
    if (!w7Chain().length) tnAuditRecord({ category: 'systeme', action: "Journal d'activité initialisé", target: 'journal', targetLabel: 'Journal' });

    document.addEventListener('tn:langchange', () => { w7Render(); w7RenderAudit(); });
});
