// ==========================================
// VAGUE 17 — Information en direct, associations, accueil en nombre
// F73 messages officiels poussés en temps réel (flux SSE), F74 associations partenaires et leurs horaires,
// F71 accueil de nombreux nouveaux arrivants (import par lot, cartes d'accueil multilingues).
// Chargé après assets/wave16.js ; réutilise refreshBroadcasts, tnBroadcasts, W7_POIS, W7_CATS, w7OpenState,
// w7ShowPoi, w7Render, registeredCitizens, tnHashCode, w4TemporaryCode, w4Audit, escapeHtml, announce, t().
// ==========================================

const W17T = (source, params) => escapeHtml(String(t(source, params)));
const w17 = { live: false, source: null, dismissed: [], lastBatch: null, assoFilter: { topic: 'all', day: 'all', open: false }, edits: {} };
function w17Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (err) { return fallback; } }
function w17Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; } }
function w17Download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}
function w17IsAgent() { return currentRole === 'agent' || currentRole === 'admin'; }

// ------------------------------------------
// F73 — Messages officiels en temps réel
// ------------------------------------------
function w17OfficialItems() {
    return (typeof tnBroadcasts !== 'undefined' ? tnBroadcasts : []).filter(item => item.official && !w17.dismissed.includes(item.id));
}

function w17RenderOfficial() {
    let box = document.getElementById('w17-official');
    const items = w17OfficialItems();
    if (!items.length) { if (box) box.remove(); return; }
    if (!box) {
        box = document.createElement('div');
        box.id = 'w17-official';
        box.className = 'w17-official';
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', t('Messages officiels'));
        const banner = document.getElementById('w16-banner');
        if (banner) banner.after(box); else document.body.prepend(box);
    }
    box.innerHTML = items.slice(0, 3).map(item => {
        const time = item.createdAt ? new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
        return `<div class="w17-official-item w17-lvl-${escapeHtml(item.level || 'info')}" data-id="${escapeHtml(item.id)}">
            <i aria-hidden="true" class="fa-solid fa-bullhorn"></i>
            <div class="w17-official-text"><strong data-no-i18n>${escapeHtml(item.title)}</strong>
                <span data-no-i18n>${escapeHtml(item.body)}</span>
                ${item.action ? `<span class="w17-official-act" data-no-i18n><b>${W17T('À faire :')}</b> ${escapeHtml(item.action)}</span>` : ''}
                <small data-no-i18n>${W17T('Message officiel')} · ${escapeHtml(item.source || '')} · ${escapeHtml(time)}</small></div>
            <button type="button" class="w17-official-close" data-w17-dismiss="${escapeHtml(item.id)}" aria-label="${escapeHtml(t('Marquer comme lu'))}">${W17T('Lu')}</button>
        </div>`;
    }).join('');
}

function w17ConnectStream() {
    if (typeof EventSource === 'undefined') return;
    let source;
    try { source = new EventSource('/api/stream'); } catch (err) { return; }
    w17.source = source;
    source.addEventListener('hello', () => { w17.live = true; document.documentElement.dataset.w17Live = '1'; });
    source.addEventListener('broadcast', async event => {
        let data = {};
        try { data = JSON.parse(event.data); } catch (err) { }
        w17.lastPush = Date.now();
        await refreshBroadcasts();
        if (data.action === 'publish' && data.official) announce(t('Message officiel : {title}', { title: data.title || '' }));
    });
    source.onerror = () => { w17.live = false; document.documentElement.dataset.w17Live = '0'; };
}

document.addEventListener('click', event => {
    const close = event.target.closest('[data-w17-dismiss]');
    if (!close) return;
    w17.dismissed.push(close.dataset.w17Dismiss);
    try { sessionStorage.setItem('tn_w17_read', JSON.stringify(w17.dismissed)); } catch (err) { }
    w17RenderOfficial();
});

// ------------------------------------------
// F74 — Associations partenaires
// ------------------------------------------
const W17_DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const W17_DAYS_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const W17_TOPICS = { all: 'Toutes', alimentation: 'Alimentation', jardin: 'Jardins et plantes', reparation: 'Réparation', langues: 'Langues et accueil', entraide: 'Entraide' };

// Associations imaginaires du jeu de rôle ; horaires par jour (jusqu'à deux plages)
const W17_ASSOS = [
    { id: 'asso-jardins', cat: 'asso', topic: 'jardin', name: "Les Jardins d'Orion", sector: 'Dôme Alpha - Anneau 1', x: 20, y: 40, contact: 'Poste 0-7-11', service: null,
      what: "Potagers partagés sous le dôme : prêt d'outils, graines, conseils pour cultiver en circuit fermé.", way: "Terrasse verte du Dôme Alpha, niveau 2.",
      hours: { week: { 2: [['09:00', '12:00']], 4: [['14:00', '18:00']], 6: [['09:00', '13:00']] } } },
    { id: 'asso-entraide', cat: 'asso', topic: 'entraide', name: 'Entraide des Premiers Colons', sector: 'Dôme Bêta - Anneau 2', x: 82, y: 40, contact: 'Poste 0-7-12', service: null,
      what: "Écoute, aide aux démarches et visites aux personnes isolées. Accueil sans rendez-vous.", way: "Galerie de la Technocité, local 14.",
      hours: { week: { 1: [['10:00', '12:00'], ['14:00', '17:00']], 2: [['10:00', '12:00'], ['14:00', '17:00']], 3: [['14:00', '17:00']], 5: [['10:00', '12:00']] } } },
    { id: 'asso-banque', cat: 'asso', topic: 'alimentation', name: 'Banque Alimentaire du Secteur Sud', sector: 'Secteur Sud Extérieur', x: 38, y: 92, contact: 'Poste 0-7-13', service: null,
      what: "Distribution de colis alimentaires et de paniers de fermes hydroponiques. Pièce d'identité coloniale demandée.", way: "Hangar 3, à côté de la station Hyper-Tube « Secteur Sud ».",
      hours: { week: { 1: [['08:00', '11:30']], 3: [['08:00', '11:30']], 5: [['08:00', '11:30'], ['15:00', '18:00']], 6: [['09:00', '12:00']] } } },
    { id: 'asso-atelier', cat: 'asso', topic: 'reparation', name: "Atelier Réparation de l'Anneau Zéro", sector: 'Anneau Orbital Zéro', x: 58, y: 64, contact: 'Poste 0-7-14', service: null,
      what: "On répare ensemble : combinaisons, tablettes, petits appareils. Pièces de récupération, bénévoles formés.", way: "Niveau -1 du Hub des Hyper-Tubes, porte orange.",
      hours: { week: { 3: [['16:00', '20:00']], 4: [['16:00', '20:00']], 0: [['10:00', '16:00']] } } },
    { id: 'asso-langues', cat: 'asso', topic: 'langues', name: 'Langues sans Frontières', sector: 'Dôme Alpha - Anneau 1', x: 34, y: 24, contact: 'Poste 0-7-15', service: null,
      what: "Cours de langue gratuits et interprètes bénévoles pour les démarches. Accueil des nouveaux arrivants.", way: "Médiathèque du Dôme Alpha, salle 3.",
      hours: { week: { 1: [['18:00', '20:00']], 2: [['09:00', '12:00']], 4: [['18:00', '20:00']], 6: [['10:00', '12:00']] } } }
];
const W17_ASSO_ORIGINAL = JSON.parse(JSON.stringify(W17_ASSOS.map(a => ({ id: a.id, week: a.hours.week }))));

function w17Clock(text) { const [h, m] = String(text).split(':').map(Number); return h * 60 + m; }

function w17Week(poi) { return poi.hours && poi.hours.week; }

// Prochaine ouverture à partir de "now" : { day, start, end, date }
function w17Next(poi, now) {
    const week = w17Week(poi) || {};
    const minutes = now.getHours() * 60 + now.getMinutes();
    for (let offset = 0; offset < 8; offset++) {
        const day = (now.getDay() + offset) % 7;
        const slots = (week[day] || []).slice().sort((a, b) => w17Clock(a[0]) - w17Clock(b[0]));
        for (const slot of slots) {
            if (offset === 0 && w17Clock(slot[0]) <= minutes) continue;
            const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0);
            const [sh, sm] = slot[0].split(':').map(Number); const [eh, em] = slot[1].split(':').map(Number);
            const start = new Date(date); start.setHours(sh, sm, 0, 0);
            const end = new Date(date); end.setHours(eh, em, 0, 0);
            return { day, offset, start, end, slot };
        }
    }
    return null;
}

function w17State(poi, now = new Date()) {
    const week = w17Week(poi) || {};
    const minutes = now.getHours() * 60 + now.getMinutes();
    const todays = week[now.getDay()] || [];
    const current = todays.find(slot => minutes >= w17Clock(slot[0]) && minutes < w17Clock(slot[1]));
    if (current) return { open: true, text: t('Ouvert jusqu\'à {h}', { h: current[1] }), until: current[1] };
    const next = w17Next(poi, now);
    if (!next) return { open: false, text: t('Fermé : aucun créneau cette semaine') };
    const when = next.offset === 0 ? t('aujourd\'hui {h}', { h: next.slot[0] }) : next.offset === 1 ? t('demain {h}', { h: next.slot[0] }) : t('{d} {h}', { d: t(W17_DAYS[next.day]), h: next.slot[0] });
    return { open: false, text: t('Fermé · ouvre {when}', { when }), next };
}

function w17Slots(slots) { return (slots && slots.length) ? slots.map(slot => slot.join('–')).join(' · ') : '—'; }

function w17ApplyEdits() {
    const edits = w17Load('tn_w17_assos', {});
    W17_ASSOS.forEach(poi => { if (edits[poi.id]) poi.hours.week = edits[poi.id].week; });
    w17.edits = edits;
}

function w17Visible() {
    const now = new Date();
    return W17_ASSOS.filter(poi => {
        const f = w17.assoFilter;
        if (f.topic !== 'all' && poi.topic !== f.topic) return false;
        const week = poi.hours.week || {};
        if (f.day !== 'all' && !(week[f.day] || []).length) return false;
        if (f.open && !w17State(poi, now).open) return false;
        return true;
    });
}

function w17Ics(poi) {
    const state = w17State(poi);
    const next = state.open ? { start: new Date(), end: (() => { const d = new Date(); const [h, m] = state.until.split(':').map(Number); d.setHours(h, m, 0, 0); return d; })() } : state.next;
    if (!next) return null;
    const pad = n => String(n).padStart(2, '0');
    const stamp = d => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const esc = s => String(s).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Terra Nova//Associations//FR', 'BEGIN:VEVENT',
        `UID:${poi.id}-${stamp(next.start)}@terra-nova`, `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(next.start)}`, `DTEND:${stamp(next.end)}`,
        `SUMMARY:${esc(poi.name)}`, `LOCATION:${esc(poi.sector + ' - ' + poi.way)}`, `DESCRIPTION:${esc(poi.what)}`,
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}

function w17AssoCard(poi) {
    const now = new Date();
    const state = w17State(poi, now);
    const week = poi.hours.week || {};
    const order = [1, 2, 3, 4, 5, 6, 0];
    const rows = order.map(day => `<tr class="${day === now.getDay() ? 'w17-today' : ''}"><th scope="row">${W17T(W17_DAYS_LONG[day])}</th><td data-no-i18n>${escapeHtml(w17Slots(week[day]))}</td></tr>`).join('');
    const edited = w17.edits[poi.id];
    return `<li class="w17-asso" id="w17-card-${poi.id}">
        <h3 class="w17-asso-name" data-no-i18n>${escapeHtml(t(poi.name))}</h3>
        <p class="tn-hint" data-no-i18n>${W17T(W17_TOPICS[poi.topic])} · ${escapeHtml(poi.sector)}</p>
        <p><span class="tn-badge tn-badge--${state.open ? 'resolved' : 'neutral'}">${W17T(state.open ? 'Ouvert maintenant' : 'Fermé')}</span> <span data-no-i18n>${escapeHtml(state.text)}</span></p>
        <p class="tn-poi-text" data-no-i18n>${escapeHtml(t(poi.what))}</p>
        <p class="tn-hint" data-no-i18n><b>${W17T('Accès :')}</b> ${escapeHtml(t(poi.way))} · <b>${W17T('Contact :')}</b> ${escapeHtml(poi.contact)}</p>
        <table class="w17-week"><caption class="sr-only">${W17T('Horaires de la semaine')}</caption><tbody>${rows}</tbody></table>
        ${edited ? `<p class="tn-hint">${W17T('Horaires mis à jour par les services municipaux le {d}.', { d: new Date(edited.at).toLocaleDateString('fr-FR') })}</p>` : ''}
        <div class="tn-row-actions">
            <button type="button" class="tn-tab" data-w17="show" data-id="${poi.id}">${W17T('Voir sur le plan')}</button>
            <button type="button" class="tn-tab" data-w17="ics" data-id="${poi.id}">${W17T('Ajouter à mon agenda')}</button>
            ${w17IsAgent() ? `<button type="button" class="tn-tab" data-w17="edit" data-id="${poi.id}">${W17T('Modifier les horaires')}</button>` : ''}
        </div>
        <div class="w17-editor" id="w17-editor-${poi.id}" hidden></div>
    </li>`;
}

function w17RenderAssos() {
    const section = document.getElementById('associations');
    if (!section) return;
    const list = section.querySelector('#w17-asso-list');
    const visible = w17Visible();
    section.querySelector('#w17-asso-count').textContent = visible.length ? t('{n} association(s) affichée(s)', { n: visible.length }) : t('Aucune association ne correspond.');
    list.innerHTML = visible.length ? visible.map(w17AssoCard).join('') : `<li class="tn-empty">${W17T('Aucune association ne correspond. Essayez « Tous les jours » ou décochez « Ouvert maintenant ».')}</li>`;
}

function w17OpenEditor(id) {
    const poi = W17_ASSOS.find(item => item.id === id);
    const box = document.getElementById(`w17-editor-${id}`);
    if (!poi || !box) return;
    if (!box.hidden) { box.hidden = true; return; }
    const week = poi.hours.week || {};
    box.hidden = false;
    box.innerHTML = `<form class="w17-form" data-w17-form="${id}" novalidate>
        <p class="tn-hint">${W17T('Une plage par bloc, au format 09:00-12:00. Plusieurs plages : séparez-les par une virgule. Laissez vide si fermé.')}</p>
        ${[1, 2, 3, 4, 5, 6, 0].map(day => `<div class="w17-form-row"><label class="tn-field-label" for="w17-h-${id}-${day}">${W17T(W17_DAYS_LONG[day])}</label>
            <input id="w17-h-${id}-${day}" class="cyber-input" data-no-i18n value="${escapeHtml((week[day] || []).map(s => s.join('-')).join(', '))}" autocomplete="off" placeholder="09:00-12:00, 14:00-17:00"></div>`).join('')}
        <p class="tn-hint w17-form-error" role="alert"></p>
        <div class="tn-row-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W17T('Enregistrer les horaires')}</button>
        <button type="button" class="tn-tab" data-w17="reset" data-id="${id}">${W17T('Remettre les horaires d\'origine')}</button></div></form>`;
}

function w17ParseSlots(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return { slots: [] };
    const slots = [];
    for (const part of trimmed.split(',')) {
        const match = part.trim().match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})$/);
        if (!match) return { error: t('« {p} » n\'est pas une plage valide (exemple : 09:00-12:00).', { p: part.trim() }) };
        const [sh, sm, eh, em] = match.slice(1).map(Number);
        if (sh > 23 || eh > 23 || sm > 59 || em > 59) return { error: t('« {p} » contient une heure impossible.', { p: part.trim() }) };
        if (sh * 60 + sm >= eh * 60 + em) return { error: t('« {p} » : la fermeture doit être après l\'ouverture.', { p: part.trim() }) };
        const pad = n => String(n).padStart(2, '0');
        slots.push([`${pad(sh)}:${pad(sm)}`, `${pad(eh)}:${pad(em)}`]);
    }
    slots.sort((a, b) => w17Clock(a[0]) - w17Clock(b[0]));
    for (let i = 1; i < slots.length; i++) if (w17Clock(slots[i][0]) < w17Clock(slots[i - 1][1])) return { error: t('Les plages se chevauchent.') };
    if (slots.length > 3) return { error: t('Trois plages au maximum par jour.') };
    return { slots };
}

function w17SaveEditor(form) {
    const id = form.dataset.w17Form;
    const poi = W17_ASSOS.find(item => item.id === id);
    const week = {};
    for (const day of [1, 2, 3, 4, 5, 6, 0]) {
        const parsed = w17ParseSlots(form.querySelector(`#w17-h-${id}-${day}`).value);
        if (parsed.error) { form.querySelector('.w17-form-error').textContent = `${t(W17_DAYS_LONG[day])} : ${parsed.error}`; return; }
        if (parsed.slots.length) week[day] = parsed.slots;
    }
    poi.hours.week = week;
    w17.edits[id] = { week, at: new Date().toISOString() };
    w17Save('tn_w17_assos', w17.edits);
    if (typeof w4Audit === 'function') w4Audit(`Horaires modifiés : ${poi.name}`);
    announce(t('Horaires enregistrés.'));
    w17RenderAssos();
    if (typeof w7Render === 'function') w7Render();
}

function w17ResetHours(id) {
    const poi = W17_ASSOS.find(item => item.id === id);
    const original = W17_ASSO_ORIGINAL.find(item => item.id === id);
    poi.hours.week = JSON.parse(JSON.stringify(original.week));
    delete w17.edits[id];
    w17Save('tn_w17_assos', w17.edits);
    announce(t('Horaires d\'origine rétablis.'));
    w17RenderAssos();
    if (typeof w7Render === 'function') w7Render();
}

function w17InitAssos() {
    const anchor = document.getElementById('plan-ville') || document.getElementById('transports');
    if (!anchor || document.getElementById('associations')) return;
    w17ApplyEdits();

    // les associations rejoignent le plan de la ville
    if (typeof W7_CATS !== 'undefined' && !W7_CATS.asso) W7_CATS.asso = { label: 'Associations partenaires', icon: 'fa-hands-holding-heart', shape: 'square' };
    if (typeof W7_POIS !== 'undefined') W17_ASSOS.forEach(poi => { if (!W7_POIS.some(item => item.id === poi.id)) W7_POIS.push(poi); });
    const tabs = document.querySelector('#plan-ville [role="group"][aria-label]');
    if (tabs && !tabs.querySelector('[data-poi-cat="asso"]')) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'tn-tab'; button.dataset.poiCat = 'asso'; button.setAttribute('aria-pressed', 'false');
        button.innerHTML = `<i aria-hidden="true" class="fa-solid fa-hands-holding-heart"></i> ${W17T('Associations partenaires')}`;
        tabs.appendChild(button);
    }
    // w7OpenState comprend les horaires par jour des associations
    if (typeof w7OpenState === 'function') {
        const base = w7OpenState;
        w7OpenState = function (poi, now) {
            if (poi && poi.hours && poi.hours.week) { const s = w17State(poi, now || new Date()); return { open: s.open, text: s.text }; }
            return base.apply(this, arguments);
        };
    }

    const section = document.createElement('section');
    section.id = 'associations';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'associations-title');
    section.dataset.crumb = 'Associations partenaires';
    section.innerHTML = `
        <div class="mb-8">
            <h2 id="associations-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">ASSOCIATIONS PARTENAIRES</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">${W17T('Aide alimentaire, jardins, réparation, langues, entraide : qui est ouvert maintenant, quand ça rouvre, et comment y aller.')}</p>
        </div>
        <div class="w17-filters">
            <div><label class="tn-field-label" for="w17-topic">${W17T('Type d\'aide')}</label>
                <select id="w17-topic" class="cyber-input">${Object.keys(W17_TOPICS).map(key => `<option value="${key}">${W17T(W17_TOPICS[key])}</option>`).join('')}</select></div>
            <div><label class="tn-field-label" for="w17-day">${W17T('Jour')}</label>
                <select id="w17-day" class="cyber-input"><option value="all">${W17T('Tous les jours')}</option>${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}">${W17T(W17_DAYS_LONG[d])}</option>`).join('')}</select></div>
            <label class="tn-check w17-open-check"><input type="checkbox" id="w17-open"><span>${W17T('Ouvert maintenant')}</span></label>
        </div>
        <p id="w17-asso-count" class="tn-tracker-count" role="status" data-no-i18n></p>
        <ul id="w17-asso-list" class="w17-asso-list"></ul>
        <p class="tn-hint">${W17T('Associations fictives du jeu de rôle Terra Nova. Les horaires sont mis à jour par les services municipaux.')}</p>`;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'associations')) {
        TN_SECTIONS.splice(TN_SECTIONS.findIndex(entry => entry.id === 'plan-ville') + 1 || TN_SECTIONS.length, 0, { id: 'associations', label: 'Associations partenaires' });
    }
    const navLink = document.querySelector('#site-nav a[href="#plan-ville"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#associations';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-hands-holding-heart text-[11px] text-[#00B8FF]"></i><span>ASSOCIATIONS</span>';
        navLink.after(link);
    }

    section.querySelector('#w17-topic').addEventListener('change', e => { w17.assoFilter.topic = e.target.value; w17RenderAssos(); });
    section.querySelector('#w17-day').addEventListener('change', e => { w17.assoFilter.day = e.target.value === 'all' ? 'all' : Number(e.target.value); w17RenderAssos(); });
    section.querySelector('#w17-open').addEventListener('change', e => { w17.assoFilter.open = e.target.checked; w17RenderAssos(); });
    section.addEventListener('submit', e => { const form = e.target.closest('[data-w17-form]'); if (form) { e.preventDefault(); w17SaveEditor(form); } });
    w17RenderAssos();
    if (typeof w7Render === 'function') w7Render();
    setInterval(() => { if (!document.hidden) w17RenderAssos(); }, 60000);
}

// ------------------------------------------
// F71 — Accueil de nombreux nouveaux arrivants
// ------------------------------------------
const W17_DOMES = [
    { name: 'Dôme Alpha - Anneau 1', keys: ['alpha'] },
    { name: 'Dôme Bêta - Anneau 2', keys: ['beta', 'bêta'] },
    { name: 'Anneau Orbital Zéro', keys: ['orbital', 'zero', 'zéro'] },
    { name: 'Secteur Sud Extérieur', keys: ['sud', 'exterieur', 'extérieur'] }
];
const W17_ROLES = ['Ingénieur Systèmes Plasma', 'Biologiste / Dôme Atmosphère', 'Pilote Navette Orbitale', 'Médecin Biotech & Cryo', 'Sentinelle Sécurité Urbaine', 'Citoyen Colon'];
const W17_LANGS = { fr: ['fr', 'francais', 'français', 'french'], en: ['en', 'english', 'anglais'], es: ['es', 'espanol', 'español', 'spanish', 'espagnol'] };
const W17_WELCOME = {
    fr: { title: 'Bienvenue sur Terra Nova', hello: 'Bonjour', intro: 'Votre passeport colonial est prêt.', id: 'Matricule', code: 'Code provisoire', how: 'Pour vous connecter : ouvrez le site, choisissez « Connexion », saisissez votre matricule et ce code, puis changez-le dans votre profil.', help: 'Besoin d\'aide ? Un guide de premiers pas s\'ouvre à votre première connexion. Urgence : balise 112.' },
    en: { title: 'Welcome to Terra Nova', hello: 'Hello', intro: 'Your colonial passport is ready.', id: 'ID number', code: 'Temporary code', how: 'To sign in: open the site, choose "Sign in", enter your ID number and this code, then change it in your profile.', help: 'Need help? A first-steps guide opens when you first sign in. Emergency: beacon 112.' },
    es: { title: 'Bienvenido a Terra Nova', hello: 'Hola', intro: 'Su pasaporte colonial está listo.', id: 'Matrícula', code: 'Código provisional', how: 'Para entrar: abra el sitio, elija «Conexión», escriba su matrícula y este código, y cámbielo en su perfil.', help: '¿Necesita ayuda? Una guía de primeros pasos se abre en su primera conexión. Emergencia: baliza 112.' }
};

function w17Fold(text) { return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }

function w17ParseCsv(text) {
    const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim());
    if (!lines.length) return [];
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';
    const rows = lines.map(line => {
        const cells = []; let cell = ''; let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { if (quoted && line[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
            else if (ch === sep && !quoted) { cells.push(cell); cell = ''; }
            else cell += ch;
        }
        cells.push(cell);
        return cells.map(c => c.trim());
    });
    if (/^(nom|name|nombre)$/.test(w17Fold(rows[0][0]))) rows.shift();
    return rows;
}

function w17Validate(rows) {
    const existing = new Set(registeredCitizens.map(c => w17Fold(c.name) + '|' + c.dome));
    const seen = new Set();
    const result = { ok: [], bad: [], dup: 0, byLang: { fr: 0, en: 0, es: 0, other: 0 }, noEmail: 0 };
    rows.forEach((row, index) => {
        const line = index + 1;
        const [nameRaw, langRaw, domeRaw, jobRaw, emailRaw] = row;
        const name = String(nameRaw || '').replace(/\s+/g, ' ').trim();
        const problems = [];
        if (name.length < 2 || name.length > 80) problems.push(t('nom manquant ou trop long'));
        const langFold = w17Fold(langRaw);
        let lang = Object.keys(W17_LANGS).find(key => W17_LANGS[key].some(v => w17Fold(v) === langFold));
        let spoken = '';
        if (!lang) { if (!langFold) lang = 'fr'; else { lang = 'other'; spoken = String(langRaw).trim().slice(0, 40); } }
        const domeFold = w17Fold(domeRaw);
        const dome = W17_DOMES.find(d => d.keys.some(k => domeFold.includes(w17Fold(k))));
        if (!dome) problems.push(t('dôme inconnu'));
        const email = String(emailRaw || '').trim();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push(t('e-mail invalide'));
        const key = w17Fold(name) + '|' + (dome ? dome.name : '');
        if (!problems.length && (seen.has(key) || existing.has(key))) { result.dup += 1; result.bad.push({ line, name, problems: [t('doublon (même nom et même dôme)')] }); return; }
        if (problems.length) { result.bad.push({ line, name, problems }); return; }
        seen.add(key);
        const job = W17_ROLES.find(r => w17Fold(r) === w17Fold(jobRaw)) || 'Citoyen Colon';
        result.ok.push({ name, lang, spoken, dome: dome.name, role: job, profession: String(jobRaw || '').slice(0, 60), email });
        result.byLang[lang] += 1;
        if (!email) result.noEmail += 1;
    });
    return result;
}

function w17Sample() {
    const first = ['Aiko', 'Mateo', 'Lina', 'Omar', 'Sofia', 'Noah', 'Priya', 'Lucas', 'Yara', 'Elias', 'Mei', 'Hugo', 'Amara', 'Tomas', 'Ines', 'Kofi', 'Zoé', 'Ravi', 'Clara', 'Idris'];
    const last = ['Marchand', 'Okafor', 'Silva', 'Nakamura', 'Duval', 'Haddad', 'Moreau', 'Petrov', 'Garcia', 'Lefèvre', 'Ibrahim', 'Rossi', 'Tran', 'Costa', 'Andersen', 'Benali'];
    const langs = ['français', 'français', 'français', 'français', 'français', 'français', 'français', 'english', 'english', 'español', 'español', 'tamoul', 'mandarin', 'arabe', 'portugais'];
    const domes = ['Dôme Alpha', 'Dôme Bêta', 'Orbital Zéro', 'Secteur Sud'];
    const rows = ['nom;langue;dôme;profession;email'];
    for (let i = 0; i < 495; i++) {
        const name = `${first[i % first.length]} ${last[Math.floor(i / first.length) % last.length]}-${Math.floor(i / (first.length * last.length)) + 1}`;
        rows.push([name, langs[(i * 7) % langs.length], domes[(i * 3) % domes.length], W17_ROLES[i % W17_ROLES.length], i % 4 === 0 ? `n${i}@exemple.org` : ''].join(';'));
    }
    // quelques lignes volontairement fausses, pour montrer la vérification
    rows.push(';français;Dôme Alpha;Citoyen Colon;');
    rows.push('Test Inconnu;english;Lune;Citoyen Colon;');
    rows.push('Mal Formé;español;Dôme Bêta;Citoyen Colon;pas-un-email');
    rows.push(rows[1]);
    rows.push(rows[2]);
    return rows.join('\n');
}

function w17RenderWelcome() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w17-welcome')) return;
    const panel = document.createElement('section');
    panel.id = 'w17-welcome';
    panel.className = 'w15-panel';
    panel.setAttribute('aria-labelledby', 'w17-title');
    panel.innerHTML = `
        <h3 id="w17-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-people-arrows"></i> ${W17T('Accueil des nouveaux arrivants')}</h3>
        <p class="tn-hint">${W17T('Créez d\'un coup les comptes d\'un convoi : liste CSV (nom;langue;dôme;profession;e-mail facultatif), vérification, import, puis cartes d\'accueil dans la langue de chacun.')}</p>
        <label class="tn-field-label" for="w17-csv">${W17T('Liste des arrivants (collez le CSV ou choisissez un fichier)')}</label>
        <textarea id="w17-csv" class="cyber-input" rows="5" spellcheck="false" data-no-i18n placeholder="nom;langue;dôme;profession;email"></textarea>
        <div class="tn-row-actions">
            <label class="tn-tab w17-file">${W17T('Choisir un fichier CSV')}<input type="file" accept=".csv,text/csv,text/plain" data-w17-file hidden></label>
            <button type="button" class="tn-tab" data-w17="sample">${W17T('Remplir avec 500 lignes d\'exemple')}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w17="check">${W17T('Vérifier la liste')}</button>
        </div>
        <div id="w17-preview" role="status" aria-live="polite"></div>
        <div id="w17-result" aria-live="polite"></div>`;
    const anchor = document.getElementById('w16-ops') || document.getElementById('w15-security') || document.getElementById('w14-medical');
    if (anchor) anchor.after(panel); else workspace.prepend(panel);
}

function w17Check() {
    const text = document.getElementById('w17-csv').value;
    const box = document.getElementById('w17-preview');
    const rows = w17ParseCsv(text);
    if (!rows.length) { box.innerHTML = `<p class="tn-hint">${W17T('La liste est vide.')}</p>`; w17.pending = null; return; }
    const res = w17Validate(rows);
    w17.pending = res;
    const bad = res.bad.slice(0, 8).map(b => `<li data-no-i18n>${W17T('Ligne')} ${b.line}${b.name ? ' (' + escapeHtml(b.name) + ')' : ''} : ${escapeHtml(b.problems.join(', '))}</li>`).join('');
    box.innerHTML = `
        <ul class="w17-stats">
            <li><strong>${res.ok.length}</strong> ${W17T('comptes prêts à créer')}</li>
            <li><strong>${res.bad.length}</strong> ${W17T('lignes refusées')}${res.dup ? ` (${res.dup} ${W17T('doublons')})` : ''}</li>
            <li>${W17T('Langues')} : FR ${res.byLang.fr} · EN ${res.byLang.en} · ES ${res.byLang.es} · ${W17T('autres (interprète)')} ${res.byLang.other}</li>
            <li>${res.noEmail} ${W17T('sans e-mail : carte imprimée à remettre en main propre')}</li>
        </ul>
        ${bad ? `<p class="tn-hint">${W17T('Lignes à corriger :')}</p><ul class="w17-bad">${bad}</ul>${res.bad.length > 8 ? `<p class="tn-hint">… ${res.bad.length - 8} ${W17T('autres')}</p>` : ''}` : ''}
        ${res.ok.length ? `<div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w17="import">${W17T('Créer les {n} comptes', { n: res.ok.length })}</button></div>` : ''}`;
}

async function w17Import() {
    const res = w17.pending;
    if (!res || !res.ok.length || w17.importing) return;
    w17.importing = true;
    const out = document.getElementById('w17-result');
    const batch = 'B' + Date.now().toString(36).toUpperCase();
    const used = new Set(registeredCitizens.map(c => c.matricule));
    if (used.size + res.ok.length > 8500) { out.innerHTML = `<p class="tn-hint">${W17T('Trop de comptes pour l\'espace de matricules disponible.')}</p>`; w17.importing = false; return; }
    const created = [];
    const total = res.ok.length;
    for (let i = 0; i < total; i += 100) {
        const chunk = res.ok.slice(i, i + 100);
        for (const row of chunk) {
            let matricule;
            do { matricule = `TN-2842-${Math.floor(1000 + Math.random() * 9000)}`; } while (used.has(matricule));
            used.add(matricule);
            const code = w4TemporaryCode();
            created.push({
                account: {
                    name: row.name, matricule, role: row.role, dome: row.dome, joined: '2842.10.04',
                    pwdHash: await tnHashCode(code, matricule),
                    profile: { email: row.email, lang: row.lang === 'other' ? 'fr' : row.lang, notify: Boolean(row.email) },
                    arrival: { batch, provisional: true, spoken: row.spoken, interpreter: row.lang === 'other', profession: row.profession, started: false }
                },
                code, lang: row.lang
            });
        }
        out.innerHTML = `<p class="tn-hint"><progress max="${total}" value="${Math.min(total, i + 100)}"></progress> ${Math.min(total, i + 100)} / ${total}</p>`;
        await new Promise(r => setTimeout(r, 0));
    }
    registeredCitizens.push(...created.map(c => c.account));
    if (!w17Save('tn_citizens', registeredCitizens)) {
        registeredCitizens.splice(registeredCitizens.length - created.length, created.length);
        out.innerHTML = `<p class="tn-hint" role="alert">${W17T('Enregistrement impossible : espace de stockage plein. Aucun compte n\'a été créé.')}</p>`;
        w17.importing = false; return;
    }
    if (typeof w4Audit === 'function') w4Audit(`Accueil : ${created.length} comptes créés (lot ${batch})`);
    w17.lastBatch = { id: batch, items: created };
    w17.pending = null;
    w17.importing = false;
    document.getElementById('w17-preview').innerHTML = '';
    if (typeof w4RenderAccounts === 'function') { try { w4RenderAccounts(); } catch (err) { } }
    announce(t('{n} comptes créés.', { n: created.length }));
    w17RenderResult();
}

function w17RenderResult() {
    const out = document.getElementById('w17-result');
    const batch = w17.lastBatch;
    if (!out) return;
    if (!batch) { out.innerHTML = ''; return; }
    const interpreters = batch.items.filter(c => c.account.arrival.interpreter).length;
    out.innerHTML = `<div class="w17-done">
        <p><strong>${batch.items.length}</strong> ${W17T('comptes créés (lot {id}).', { id: batch.id })}</p>
        <p class="tn-hint">${W17T('Les codes provisoires ne sont affichés qu\'une fois : imprimez les cartes ou téléchargez la liste avant de quitter cette page.')}</p>
        <div class="tn-row-actions">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w17="print">${W17T('Imprimer les cartes d\'accueil')}</button>
            <button type="button" class="tn-tab" data-w17="csv-out">${W17T('Télécharger la liste (CSV)')}</button>
            <button type="button" class="tn-tab" data-w17="interp">${W17T('Liste des interprètes à prévoir')} (${interpreters})</button>
            <button type="button" class="tn-tab" data-w17="undo">${W17T('Annuler cet import')}</button>
            <button type="button" class="tn-tab" data-w17="forget">${W17T('J\'ai terminé : effacer les codes de cette page')}</button>
        </div></div>`;
}

function w17CardsHtml(items) {
    return items.map(({ account, code, lang }) => {
        const langs = lang === 'other' ? ['fr', 'en'] : [lang];
        return `<article class="w17-card">${langs.map(l => { const w = W17_WELCOME[l]; return `<div class="w17-card-lang" lang="${l}">
            <h2>${escapeHtml(w.title)}</h2>
            <p>${escapeHtml(w.hello)} <strong>${escapeHtml(account.name)}</strong>. ${escapeHtml(w.intro)}</p>
            <p>${escapeHtml(w.id)} : <strong class="w17-mono">${escapeHtml(account.matricule)}</strong></p>
            <p>${escapeHtml(w.code)} : <strong class="w17-mono">${escapeHtml(code)}</strong></p>
            <p>${escapeHtml(account.dome)}</p>
            <p class="w17-small">${escapeHtml(w.how)}</p><p class="w17-small">${escapeHtml(w.help)}</p></div>`; }).join('')}</article>`;
    }).join('');
}

function w17Print() {
    const batch = w17.lastBatch;
    if (!batch) return;
    let sheet = document.getElementById('w17-print');
    if (sheet) sheet.remove();
    sheet = document.createElement('div');
    sheet.id = 'w17-print';
    sheet.innerHTML = w17CardsHtml(batch.items);
    document.body.appendChild(sheet);
    document.body.classList.add('w17-printing');
    const done = () => { document.body.classList.remove('w17-printing'); sheet.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch (err) { } }, 50);
}

function w17Csv(cells) { return cells.map(c => /[;"\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(';'); }

function w17Undo() {
    const batch = w17.lastBatch;
    if (!batch) return;
    const ids = new Set(batch.items.map(c => c.account.matricule));
    registeredCitizens = registeredCitizens.filter(c => !ids.has(c.matricule));
    w17Save('tn_citizens', registeredCitizens);
    if (typeof w4Audit === 'function') w4Audit(`Accueil : lot ${batch.id} annulé (${ids.size} comptes retirés)`);
    w17.lastBatch = null;
    if (typeof w4RenderAccounts === 'function') { try { w4RenderAccounts(); } catch (err) { } }
    w17RenderResult();
    announce(t('Import annulé.'));
}

// À la première connexion d'un compte importé : langue choisie et guide de premiers pas
function w17WrapProfile() {
    if (typeof updateCitizenProfileUI !== 'function') return;
    const base = updateCitizenProfileUI;
    updateCitizenProfileUI = function () {
        base.apply(this, arguments);
        const me = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
        if (!me || !me.arrival || me.arrival.started) return;
        me.arrival.started = true;
        if (!me.onboarding) me.onboarding = { profile: false, service: false, demarche: false, hidden: false };
        if (typeof tnSaveActiveCitizen === 'function') tnSaveActiveCitizen();
        if (me.profile && me.profile.lang && me.profile.lang !== tnLang && typeof setLanguage === 'function') setLanguage(me.profile.lang);
        if (typeof renderOnboarding === 'function') { try { renderOnboarding(); } catch (err) { } }
        const w = W17_WELCOME[(me.profile && me.profile.lang) || 'fr'] || W17_WELCOME.fr;
        announce(`${w.title}, ${me.name}.`);
    };
}

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w17]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.w17) {
        case 'show': if (typeof w7ShowPoi === 'function') w7ShowPoi(id); break;
        case 'ics': { const poi = W17_ASSOS.find(p => p.id === id); const ics = poi && w17Ics(poi); if (ics) w17Download(`${id}.ics`, ics, 'text/calendar;charset=utf-8'); else announce(t('Aucun créneau à ajouter.')); break; }
        case 'edit': w17OpenEditor(id); break;
        case 'reset': w17ResetHours(id); break;
        case 'sample': { const ta = document.getElementById('w17-csv'); if (ta) { ta.value = w17Sample(); w17Check(); } break; }
        case 'check': w17Check(); break;
        case 'import': w17Import(); break;
        case 'print': w17Print(); break;
        case 'csv-out': { const b = w17.lastBatch; if (b) w17Download(`accueil-${b.id}.csv`, '﻿' + [w17Csv(['nom', 'matricule', 'code provisoire', 'langue', 'dôme'])].concat(b.items.map(c => w17Csv([c.account.name, c.account.matricule, c.code, c.account.arrival.spoken || c.lang, c.account.dome]))).join('\r\n'), 'text/csv;charset=utf-8'); break; }
        case 'interp': { const b = w17.lastBatch; if (b) { const rows = b.items.filter(c => c.account.arrival.interpreter); const count = {}; rows.forEach(c => { const k = c.account.arrival.spoken || '?'; count[k] = (count[k] || 0) + 1; }); w17Download(`interpretes-${b.id}.csv`, '﻿' + [w17Csv(['langue', 'personnes'])].concat(Object.keys(count).sort().map(k => w17Csv([k, String(count[k])]))).concat(['', w17Csv(['nom', 'matricule', 'langue', 'dôme'])], rows.map(c => w17Csv([c.account.name, c.account.matricule, c.account.arrival.spoken, c.account.dome]))).join('\r\n'), 'text/csv;charset=utf-8'); } break; }
        case 'undo': w17Undo(); break;
        case 'forget': w17.lastBatch = null; w17RenderResult(); break;
        default: break;
    }
});

document.addEventListener('change', event => {
    const input = event.target.closest('[data-w17-file]');
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) { document.getElementById('w17-preview').innerHTML = `<p class="tn-hint" role="alert">${W17T('Fichier trop gros (2 Mo maximum).')}</p>`; return; }
    const reader = new FileReader();
    reader.onload = () => { document.getElementById('w17-csv').value = String(reader.result || ''); w17Check(); };
    reader.readAsText(file, 'utf-8');
});

document.addEventListener('DOMContentLoaded', () => {
    try { w17.dismissed = JSON.parse(sessionStorage.getItem('tn_w17_read') || '[]'); } catch (err) { }
    // messages officiels : affichés dès que la liste des diffusions est rafraîchie
    if (typeof refreshBroadcasts === 'function') {
        const base = refreshBroadcasts;
        refreshBroadcasts = async function () { const out = await base.apply(this, arguments); w17RenderOfficial(); return out; };
        w17RenderOfficial();
    }
    w17ConnectStream();
    w17InitAssos();
    w17RenderWelcome();
    w17WrapProfile();
    if (typeof applyRolePermissions === 'function') { const baseRole = applyRolePermissions; applyRolePermissions = function () { baseRole.apply(this, arguments); w17RenderAssos(); }; }
    document.addEventListener('tn:langchange', () => { w17RenderAssos(); w17RenderOfficial(); });
});
