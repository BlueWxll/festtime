// ==========================================
// VAGUE 18 — Continuité de service : l'essentiel quand le réseau ou le serveur lâche
// F93 vue « Essentiel » consultable hors ligne (copie gardée sur l'appareil + service worker),
// F94 consignes et bandeau d'incident lisibles même si le serveur ne répond plus,
// F96 mode « Vue essentielle » allégé pour mobiles et connexions lentes.
// Réutilise : refreshBroadcasts (tn:server), w16Health (tn:health), W7_POIS, w7OpenState, w7Sorted, w5Outage,
// citizenTickets, activeCitizen, w10SetLite, TN_SECTIONS, escapeHtml, announce, t().
// ==========================================

const W18T = (source, params) => escapeHtml(String(t(source, params)));
const W18_SNAP = 'tn_w18_snapshot';
const W18_ESS = 'tn_w18_ess';
const w18 = { simulated: false, live: true, swReady: false, data: null, from: 'none', prevLite: null, timer: null, loading: null };

function w18Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (err) { return fallback; } }
function w18Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (err) { return false; } }
function w18Time(iso) { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function w18Download(name, text, type) {
    const blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

// ------------------------------------------
// Instantané : dernière version reçue du serveur, gardée dans l'appareil
// ------------------------------------------
async function w18Fetch() {
    if (w18.simulated) { const kept = w18Load(W18_SNAP, null); w18.data = kept ? kept.data : null; w18.from = kept ? 'copy' : 'none'; w18.savedAt = kept ? kept.at : null; return; }
    try {
        const response = await fetch('/api/essential', { cache: 'no-store' });
        if (!response.ok) throw new Error('http ' + response.status);
        const data = await response.json();
        if (!data || !Array.isArray(data.alerts)) throw new Error('format');
        w18.data = data; w18.from = 'live'; w18.savedAt = new Date().toISOString();
        w18Save(W18_SNAP, { at: w18.savedAt, data });
    } catch (err) {
        const kept = w18Load(W18_SNAP, null);
        w18.data = kept ? kept.data : null;
        w18.from = kept ? 'copy' : 'none';
        w18.savedAt = kept ? kept.at : null;
    }
}

function w18Pois() {
    const all = typeof W7_POIS !== 'undefined' ? W7_POIS : [];
    const sorted = list => (typeof w7Sorted === 'function' ? w7Sorted(list, '') : list);
    return {
        emergency: sorted(all.filter(poi => poi.cat === 'urgence' || poi.cat === 'secours')),
        hospitals: sorted(all.filter(poi => /^(hop|med)/.test(poi.id))),
        pharmacies: sorted(all.filter(poi => /^pha/.test(poi.id)))
    };
}

function w18PoiRow(poi) {
    const state = typeof w7OpenState === 'function' ? w7OpenState(poi) : { open: true, text: '' };
    return { name: t(poi.name), sector: t(poi.sector), open: state.open, hours: state.text, contact: poi.contact && poi.contact !== '—' ? t(poi.contact) : '', way: t(poi.way || '') };
}

const W18_LEVELS = { alerte: 'Alerte', info: 'Information', conseil: 'Conseil' };
function w18LevelLabel(level) { return t(W18_LEVELS[level] || 'Information'); }

const W18_OUTAGE_STEPS = [
    "En cas d'urgence vitale : composez le 112 (balise d'urgence). Cette ligne ne dépend pas du site.",
    "Si le site ne répond pas : gardez cette page ouverte, elle reste lisible sans connexion. Réessayez dans 5 minutes.",
    "Pour une démarche : notez votre numéro de demande, il suffira de le donner à l'accueil de votre dôme.",
    "À l'accueil des mairies de dôme : demandez le formulaire papier, il a la même valeur que la demande en ligne.",
    "Si votre ligne de transport est perturbée : consultez les solutions de remplacement ou rendez-vous à la station la plus proche."
];

// ------------------------------------------
// Vue « Essentiel »
// ------------------------------------------
function w18Tickets() {
    try {
        if (typeof activeCitizen === 'undefined' || !activeCitizen) return null;
        const list = typeof citizenTickets !== 'undefined' ? citizenTickets : [];
        return list.filter(ticket => String(ticket.citizenName || '').includes(activeCitizen.name) || String(ticket.citizenName || '').includes(activeCitizen.matricule)).slice(0, 5);
    } catch (err) { return null; }
}

function w18StatusLine() {
    const online = !w18.simulated && navigator.onLine !== false && w18.from === 'live';
    if (online) return `<span class="tn-badge tn-badge--resolved">${W18T('En ligne')}</span> <span class="tn-hint" data-no-i18n>${escapeHtml(t('Mis à jour'))} ${escapeHtml(w18Time(w18.savedAt))}</span>`;
    if (w18.data) return `<span class="tn-badge tn-badge--pending">${W18T(w18.simulated ? 'Simulation hors ligne' : 'Hors ligne')}</span> <span class="tn-hint" data-no-i18n>${escapeHtml(t('Copie gardée sur cet appareil le'))} ${escapeHtml(w18Time(w18.savedAt))}</span>`;
    return `<span class="tn-badge tn-badge--danger">${W18T('Aucune copie')}</span>`;
}

function w18PoiList(list) {
    return `<ul class="w18-list">${list.map(poi => { const r = w18PoiRow(poi); return `<li><strong data-no-i18n>${escapeHtml(r.name)}</strong> <span class="tn-badge tn-badge--${r.open ? 'resolved' : 'pending'}">${W18T(r.open ? 'Ouvert' : 'Fermé')}</span><br><span class="tn-hint" data-no-i18n>${escapeHtml(r.sector)} · ${escapeHtml(r.hours)}${r.contact ? ' · ' + escapeHtml(r.contact) : ''}</span></li>`; }).join('')}</ul>`;
}


function w18OutageCard(data) {
    const outage = data && data.outage;
    if (!outage || !outage.id || !outage.active) return '';
    const label = typeof w20Label === 'function' ? w20Label(outage.sectors) : outage.sectors.join(', ');
    const steps = typeof W20_STEPS !== 'undefined' ? W20_STEPS : [];
    return `<article class="w18-card w18-card--emerg w18-outage" id="w18-outage"><h3 class="tn-w12-sub"><i aria-hidden="true" class="fa-solid fa-bolt-lightning"></i> ${W18T('Panne électrique')} — <span data-no-i18n>${escapeHtml(label)}</span>${outage.exercise ? ' <span class="tn-badge tn-badge--pending">' + W18T('EXERCICE') + '</span>' : ''}</h3>
        <p class="tn-hint" data-no-i18n>${escapeHtml(t('En cours depuis'))} ${escapeHtml(w18Time(outage.since))}${outage.backAt ? ' · ' + escapeHtml(t('retour prévu vers {time}', { time: w18Time(outage.backAt) })) : ''}</p>
        <ol class="w18-steps">${steps.map(step => `<li>${W18T(step[1])}</li>`).join('')}</ol>
        ${(outage.updates || []).length ? `<ul class="w18-list" data-no-i18n>${outage.updates.slice(-3).reverse().map(item => `<li><strong>${escapeHtml(w18Time(item.at))}</strong> ${escapeHtml(item.text)}</li>`).join('')}</ul>` : ''}</article>`;
}

function w18RenderEssential() {
    const box = document.getElementById('w18-body');
    if (!box) return;
    const data = w18.data;
    const pois = w18Pois();
    const tickets = w18Tickets();
    const alerts = data ? data.alerts : [];
    const disruptions = data && data.transport ? data.transport : [];
    const lead = document.getElementById('w18-status');
    if (lead) lead.innerHTML = w18StatusLine();
    box.innerHTML = `
        ${w18OutageCard(data)}
        <div class="w18-grid">
            <article class="w18-card w18-card--emerg" id="w18-emerg">
                <h3 class="tn-w12-sub">${W18T('Urgences')}</h3>
                <p class="w18-112" data-no-i18n>112</p>
                <p class="tn-hint">${W18T("Balise d'urgence : police, secours, santé. Disponible à toute heure.")}</p>
                ${w18PoiList(pois.emergency.slice(0, 4))}
            </article>
            <article class="w18-card" id="w18-alerts">
                <h3 class="tn-w12-sub">${W18T('Alertes en cours')}</h3>
                ${alerts.length ? `<ul class="w18-list">${alerts.slice(0, 6).map(item => `<li><span class="tn-badge tn-badge--${item.level === 'alerte' ? 'danger' : 'neutral'}">${escapeHtml(w18LevelLabel(item.level))}</span>${item.official ? ` <span class="tn-badge tn-badge--progress">${W18T('Officiel')}</span>` : ''} <strong data-no-i18n>${escapeHtml(item.title)}</strong><br><span class="tn-hint" data-no-i18n>${escapeHtml(String(item.body || '').slice(0, 160))}${item.action ? ' — ' + escapeHtml(item.action) : ''}</span></li>`).join('')}</ul>` : `<p class="tn-hint">${W18T(data ? 'Aucune alerte en cours.' : "Aucune copie des alertes sur cet appareil : connectez-vous une fois pour la créer.")}</p>`}
            </article>
            <article class="w18-card" id="w18-transport">
                <h3 class="tn-w12-sub">${W18T('Transports')}</h3>
                ${disruptions.length ? `<ul class="w18-list">${disruptions.map(item => `<li><strong data-no-i18n>${escapeHtml(item.lineId)}</strong> <span class="tn-badge tn-badge--pending">${W18T('Interrompue')}</span><br><span class="tn-hint" data-no-i18n>${escapeHtml(item.cause)} · ${escapeHtml(t('retour prévu'))} ${escapeHtml(w18Time(item.until))}</span></li>`).join('')}</ul>` : `<p class="tn-hint">${W18T(data ? 'Aucune interruption signalée.' : 'Information indisponible hors ligne.')}</p>`}
                <p><a class="tn-link" href="#transports">${W18T('Voir les horaires')}</a></p>
            </article>
            <article class="w18-card" id="w18-health">
                <h3 class="tn-w12-sub">${W18T('Hôpitaux et soins')}</h3>
                ${w18PoiList(pois.hospitals)}
            </article>
            <article class="w18-card" id="w18-pharma">
                <h3 class="tn-w12-sub">${W18T('Pharmacies')}</h3>
                ${w18PoiList(pois.pharmacies)}
            </article>
            <article class="w18-card" id="w18-mine">
                <h3 class="tn-w12-sub">${W18T('Mes demandes')}</h3>
                ${tickets === null ? `<p class="tn-hint">${W18T('Connectez-vous à votre espace citoyen pour voir vos demandes ici.')}</p>`
                    : tickets.length ? `<ul class="w18-list">${tickets.map(ticket => `<li><strong data-no-i18n>${escapeHtml(ticket.id)}</strong> <span class="tn-badge tn-badge--neutral" data-no-i18n>${escapeHtml(t(ticket.status || ''))}</span><br><span class="tn-hint" data-no-i18n>${escapeHtml(ticket.subject || '')}</span></li>`).join('')}</ul>`
                    : `<p class="tn-hint">${W18T('Aucune demande en cours.')}</p>`}
            </article>
            <article class="w18-card w18-card--wide" id="w18-steps">
                <h3 class="tn-w12-sub">${W18T('Si le service est interrompu')}</h3>
                <ol class="w18-steps">${W18_OUTAGE_STEPS.map(step => `<li>${W18T(step)}</li>`).join('')}</ol>
            </article>
        </div>`;
    w18UpdateOfflineHint();
}

function w18UpdateOfflineHint() {
    const el = document.getElementById('w18-offline-state');
    if (!el) return;
    const ready = w18.swReady;
    const copy = Boolean(w18Load(W18_SNAP, null));
    el.innerHTML = `<span class="tn-badge tn-badge--${ready ? 'resolved' : 'pending'}">${W18T(ready ? 'Pages disponibles hors ligne' : 'Pages hors ligne : préparation')}</span> <span class="tn-badge tn-badge--${copy ? 'resolved' : 'pending'}">${W18T(copy ? 'Copie des informations prête' : 'Copie des informations absente')}</span>`;
}

async function w18Refresh() {
    await w18Fetch();
    w18RenderEssential();
}

// Fiche à emporter : un seul fichier HTML, lisible sans site ni connexion

function w18OutageSheet(data) {
    const outage = data && data.outage;
    if (!outage || !outage.active) return '';
    const label = typeof w20Label === 'function' ? w20Label(outage.sectors) : outage.sectors.join(', ');
    const steps = typeof W20_STEPS !== 'undefined' ? W20_STEPS : [];
    return `<h2>Panne électrique — ${escapeHtml(label)}${outage.exercise ? ' (EXERCICE)' : ''}</h2><p>Depuis ${escapeHtml(w18Time(outage.since))}${outage.backAt ? ', retour prévu vers ' + escapeHtml(w18Time(outage.backAt)) : ''}.</p><ol>${steps.map(step => `<li>${escapeHtml(t(step[1]))}</li>`).join('')}</ol>`;
}

function w18BuildSheet() {
    const data = w18.data || { alerts: [], transport: [] };
    const pois = w18Pois();
    const esc = escapeHtml;
    const poiRows = list => list.map(poi => { const r = w18PoiRow(poi); return `<li><strong>${esc(r.name)}</strong> — ${esc(r.sector)} — ${esc(r.hours)}${r.contact ? ' — ' + esc(r.contact) : ''}${r.way ? '<br><small>' + esc(r.way) + '</small>' : ''}</li>`; }).join('');
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fiche essentielle — Terra Nova</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:46rem;margin:0 auto;padding:1rem;color:#111;background:#fff}h1{font-size:1.4rem}h2{font-size:1.1rem;border-bottom:2px solid #0a6;padding-bottom:.2rem;margin-top:1.5rem}.n112{font-size:2.4rem;font-weight:800;color:#b00020;margin:.2rem 0}li{margin:.4rem 0}small{color:#444}@media print{body{font-size:12pt}}</style></head><body>
<h1>Terra Nova — fiche essentielle</h1>
<p>Établie le ${esc(w18Time(new Date().toISOString()))} · informations du ${esc(w18Time(w18.savedAt))}. Cette fiche fonctionne sans connexion ; vérifiez la date avant de vous y fier.</p>
${w18OutageSheet(data)}<h2>Urgences</h2><p class="n112">112</p><p>Balise d'urgence : police, secours, santé, à toute heure.</p><ul>${poiRows(pois.emergency)}</ul>
<h2>Hôpitaux et soins</h2><ul>${poiRows(pois.hospitals)}</ul>
<h2>Pharmacies</h2><ul>${poiRows(pois.pharmacies)}</ul>
<h2>Alertes au moment de l'établissement</h2>${data.alerts.length ? `<ul>${data.alerts.slice(0, 8).map(item => `<li><strong>${esc(item.title)}</strong> (${esc(w18LevelLabel(item.level))})<br><small>${esc(String(item.body || '').slice(0, 220))}</small></li>`).join('')}</ul>` : '<p>Aucune alerte.</p>'}
<h2>Transports</h2>${(data.transport || []).length ? `<ul>${data.transport.map(item => `<li><strong>${esc(item.lineId)}</strong> interrompue : ${esc(item.cause)} (retour prévu ${esc(w18Time(item.until))})</li>`).join('')}</ul>` : '<p>Aucune interruption signalée à cette date.</p>'}
<h2>Si le service est interrompu</h2><ol>${W18_OUTAGE_STEPS.map(step => `<li>${esc(t(step))}</li>`).join('')}</ol>
</body></html>`;
}

function w18Simulate() {
    w18.simulated = !w18.simulated;
    const btn = document.getElementById('w18-sim');
    if (btn) { btn.setAttribute('aria-pressed', String(w18.simulated)); btn.textContent = t(w18.simulated ? 'Revenir en ligne' : 'Tester sans connexion'); }
    announce(t(w18.simulated ? "Simulation hors ligne : seule la copie gardée sur l'appareil est utilisée." : 'Retour à la connexion normale.'));
    w18Refresh();
    w18Incident();
}

// ------------------------------------------
// F94 — Bandeau d'incident
// ------------------------------------------
w18.health = { ok: true, state: 'nominal' };
function w18Incident() {
    const bar = document.getElementById('w18-incident');
    if (!bar) return;
    const offline = navigator.onLine === false || w18.simulated;
    const down = w18.health.ok === false;
    const overload = w18.health.state === 'overload';
    if (!offline && !down && !overload) { bar.hidden = true; return; }
    const title = offline ? 'Vous êtes hors ligne' : down ? 'Le serveur ne répond pas' : 'Le service est très sollicité';
    const works = offline || down
        ? "Fonctionne : cette fiche, les contacts d'urgence, les hôpitaux et pharmacies, vos demandes déjà enregistrées. Ne fonctionne pas : nouvelles demandes, alertes en direct."
        : "Fonctionne : alertes, urgences, démarches, accusés de réception. Suspendu : assistant et conseils IA.";
    bar.innerHTML = `<strong>${W18T(title)}.</strong> <span>${W18T(works)}</span> <a href="#essentiel" class="w18-incident-link" data-w18="open">${W18T("Ouvrir l'essentiel")}</a> <a href="#w18-emerg" class="w18-incident-link">${W18T('Urgence : 112')}</a>`;
    bar.hidden = false;
}

// ------------------------------------------
// F96 — Vue essentielle (allégée)
// ------------------------------------------
function w18EssOn() { return document.documentElement.classList.contains('w18-ess'); }

function w18Count() {
    const main = document.getElementById('contenu-principal');
    if (!main) return null;
    const total = main.querySelectorAll('*').length;
    let shown = 0;
    main.querySelectorAll(':scope > section').forEach(section => { if (getComputedStyle(section).display !== 'none') shown += section.querySelectorAll('*').length + 1; });
    return { total, shown };
}

function w18SetEss(on, silent) {
    const root = document.documentElement;
    root.classList.toggle('w18-ess', on);
    try { localStorage.setItem(W18_ESS, on ? '1' : '0'); } catch (err) { }
    if (typeof w10SetLite === 'function') {
        if (on) { if (w18.prevLite === null) w18.prevLite = typeof w10IsLite === 'function' ? w10IsLite() : false; if (!(typeof w10IsLite === 'function' && w10IsLite())) w10SetLite(true); }
        else if (w18.prevLite !== null) { if (!w18.prevLite && typeof w10IsLite === 'function' && w10IsLite()) w10SetLite(false); w18.prevLite = null; }
    }
    const btn = document.getElementById('w18-ess-btn');
    if (btn) { btn.setAttribute('aria-pressed', String(on)); btn.querySelector('.tn-tool-label').textContent = t(on ? 'Vue complète' : 'Vue essentielle'); }
    const sugg = document.getElementById('w18-suggest'); if (sugg) sugg.hidden = true;
    const meter = document.getElementById('w18-meter');
    if (meter) {
        const c = w18Count();
        meter.hidden = !on || !c;
        if (on && c) meter.textContent = t('{shown} éléments affichés au lieu de {total} ({pct} % de moins).', { shown: c.shown, total: c.total, pct: Math.round((1 - c.shown / c.total) * 100) });
    }
    if (!silent) { announce(t(on ? 'Vue essentielle activée : seulement les informations et démarches vitales.' : 'Vue complète rétablie.')); if (on) { const s = document.getElementById('essentiel'); if (s) s.scrollIntoView({ block: 'start' }); } }
}

function w18ShouldSuggest() {
    const c = navigator.connection || {};
    const slow = c.saveData || /(^|-)2g$|3g/.test(c.effectiveType || '');
    const small = window.innerWidth < 640;
    return Boolean(slow || (small && window.TN_NET && window.TN_NET.slow));
}

// ------------------------------------------
// Montage
// ------------------------------------------
function w18Build() {
    const anchor = document.getElementById('accueil');
    if (!anchor || document.getElementById('essentiel')) return;
    const section = document.createElement('section');
    section.id = 'essentiel';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'essentiel-title');
    section.dataset.crumb = 'Essentiel';
    section.innerHTML = `
        <div class="mb-6">
            <h2 id="essentiel-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">ESSENTIEL</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">${W18T("Urgences, alertes, soins, transports et vos demandes sur une seule page. Une copie reste sur votre appareil : elle s'ouvre même sans connexion.")}</p>
        </div>
        <p id="w18-status" role="status" class="w18-status"></p>
        <p id="w18-meter" class="tn-hint" role="status" hidden data-no-i18n></p>
        <div class="w18-actions">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w18="download">${W18T('Télécharger la fiche essentielle')}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w18="print">${W18T('Imprimer')}</button>
            <button type="button" id="w18-sim" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w18="simulate" aria-pressed="false">${W18T('Tester sans connexion')}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w18="refresh">${W18T('Actualiser')}</button>
        </div>
        <p id="w18-offline-state" class="w18-offline" role="status"></p>
        <div id="w18-body" aria-live="polite"></div>`;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'essentiel')) TN_SECTIONS.splice(1, 0, { id: 'essentiel', label: 'Essentiel' });
    const navLink = document.querySelector('#site-nav a[href="#accueil"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#essentiel';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-life-ring text-[11px] text-[#00B8FF]"></i><span>ESSENTIEL</span>';
        navLink.after(link);
    }
}

function w18Init() {
    const bar = document.createElement('div');
    bar.id = 'w18-incident';
    bar.className = 'w18-incident';
    bar.setAttribute('role', 'alert');
    bar.hidden = true;
    document.body.prepend(bar);

    w18Build();
    w18RenderEssential();

    const tools = document.querySelector('#tn-locbar .tn-tools');
    if (tools && !document.getElementById('w18-ess-btn')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'w18-ess-btn';
        btn.className = 'tn-tool';
        btn.setAttribute('aria-pressed', 'false');
        btn.dataset.w18 = 'ess';
        btn.innerHTML = `<i aria-hidden="true" class="fa-solid fa-life-ring"></i><span class="tn-tool-label">${W18T('Vue essentielle')}</span>`;
        tools.appendChild(btn);
    }

    const sugg = document.createElement('div');
    sugg.id = 'w18-suggest';
    sugg.className = 'w18-suggest';
    sugg.hidden = true;
    sugg.innerHTML = `<span>${W18T('Connexion lente détectée. La vue essentielle charge moins et va droit aux urgences, alertes et démarches.')}</span> <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w18="ess-yes">${W18T('Activer')}</button> <button type="button" class="tn-link" data-w18="ess-no">${W18T('Non merci')}</button>`;
    document.body.prepend(sugg);

    // Chargement : copie existante tout de suite, version à jour dès que le navigateur est disponible
    const saved = w18Load(W18_SNAP, null);
    if (saved) { w18.data = saved.data; w18.savedAt = saved.at; w18.from = 'copy'; w18RenderEssential(); }
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1500));
    idle(() => w18Refresh(), { timeout: 4000 });
    w18.timer = setInterval(() => { if (!document.hidden && !w18.simulated) w18Refresh(); }, 300000);

    let ess = false;
    try { ess = localStorage.getItem(W18_ESS) === '1'; } catch (err) { }
    if (ess) w18SetEss(true, true);
    else if (w18ShouldSuggest()) sugg.hidden = false;

    window.addEventListener('online', () => { w18Incident(); w18Refresh(); });
    window.addEventListener('offline', () => { w18Incident(); w18Refresh(); });
    document.addEventListener('tn:health', event => { w18.health = event.detail || { ok: true, state: 'nominal' }; w18Incident(); });
    document.addEventListener('tn:server', event => { if (event.detail && event.detail.online === false) { w18.health = { ok: false, state: 'down' }; } else if (w18.health.state === 'down') w18.health = { ok: true, state: 'nominal' }; w18Incident(); });
    document.addEventListener('tn:langchange', () => { const s = document.getElementById('essentiel'); if (s) { s.remove(); w18Build(); w18RenderEssential(); } w18Incident(); });
    document.addEventListener('tn:agent-session', () => w18RenderEssential());
    document.addEventListener('tn:outage', event => { if (!w18.data) return; w18.data.outage = event.detail || null; if (!w18.simulated) w18Save(W18_SNAP, { at: w18.savedAt || new Date().toISOString(), data: w18.data }); w18RenderEssential(); });
    document.addEventListener('tn:citizen', () => w18RenderEssential());
    w18Incident();

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => { w18.swReady = true; w18UpdateOfflineHint(); }).catch(() => { w18UpdateOfflineHint(); });
    } else w18UpdateOfflineHint();
}

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w18]');
    if (!el) return;
    switch (el.dataset.w18) {
        case 'download': w18Download('fiche-essentielle-terra-nova.html', w18BuildSheet(), 'text/html;charset=utf-8'); announce(t('Fiche essentielle téléchargée.')); break;
        case 'print': window.print(); break;
        case 'simulate': w18Simulate(); break;
        case 'refresh': w18Refresh(); break;
        case 'ess': w18SetEss(!w18EssOn()); break;
        case 'ess-yes': w18SetEss(true); break;
        case 'ess-no': { const s = document.getElementById('w18-suggest'); if (s) s.hidden = true; break; }
        case 'open': break;
    }
});

document.addEventListener('DOMContentLoaded', w18Init);
