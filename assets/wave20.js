// ==========================================
// VAGUE 20 — Alerte panne électrique par secteur (F101)
// Un agent déclenche l'alerte (secteurs touchés, retour prévu, exercice ou réelle) : tous les habitants la voient
// tout de suite, avec ce qu'ils doivent savoir ou faire selon LEUR secteur, les mises à jour datées et les lieux d'aide.
// Réutilise : tnMySector, setMySector, tnBroadcasts (alerte officielle liée), W7_POIS, w7OpenState, w15Api, w15Unlocked,
// refreshBroadcasts (tn:server), announce, escapeHtml, t().
// ==========================================

const W20T = (source, params) => escapeHtml(String(t(source, params)));
const W20_NORTH = ['Dôme Alpha - Anneau 1', 'Dôme Bêta - Anneau 2'];
const W20_SECTORS = ['Dôme Alpha - Anneau 1', 'Dôme Bêta - Anneau 2', 'Anneau Orbital Zéro', 'Secteur Sud Extérieur'];
const W20_STEPS = [
    ['fa-person', 'Restez calme et ne sortez pas dans les coursives sans lampe.'],
    ['fa-lightbulb', 'Éclairez-vous avec une lampe torche, jamais avec une flamme.'],
    ['fa-heart-pulse', 'Appareil médical branché ? Appelez le 112 tout de suite.'],
    ['fa-stairs', 'Évitez les ascenseurs et les portes automatiques : prenez les escaliers.'],
    ['fa-snowflake', 'Gardez le réfrigérateur fermé et débranchez les appareils sensibles.'],
    ['fa-battery-half', 'Économisez la batterie de votre téléphone.']
];
const w20 = { outage: null, sig: '', baseTitle: document.title, confirmTimer: null, confirming: '' };

function w20Clock(iso) { const d = new Date(iso); return isNaN(d) ? '—' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
function w20Sig(o) { return o ? [o.id, o.active, (o.updates || []).length, o.backAt || ''].join('|') : ''; }
function w20Label(sectors) {
    const set = new Set(sectors || []);
    if (set.size === 2 && W20_NORTH.every(name => set.has(name))) return t('Secteur nord');
    return (sectors || []).map(name => t(name)).join(', ');
}
function w20Seen() { try { return sessionStorage.getItem('tn_w20_seen') || ''; } catch (err) { return ''; } }
function w20SetSeen(sig) { try { sessionStorage.setItem('tn_w20_seen', sig); } catch (err) { } }
function w20Mine() { return typeof tnMySector === 'function' ? tnMySector() : ''; }
function w20Concern(outage) {
    const mine = w20Mine();
    if (!mine) return 'unknown';
    return outage.sectors.includes(mine) ? 'mine' : 'other';
}

function w20Help(outage) {
    const all = typeof W7_POIS !== 'undefined' ? W7_POIS : [];
    const mine = w20Mine();
    const near = all.filter(poi => (poi.cat === 'urgence' || poi.cat === 'secours') && (outage.sectors.includes(poi.sector) || poi.sector === mine));
    const pool = near.length ? near : all.filter(poi => poi.cat === 'urgence' || poi.cat === 'secours');
    return pool.slice(0, 3).map(poi => {
        const state = typeof w7OpenState === 'function' ? w7OpenState(poi) : { open: true, text: '' };
        return `<li><strong data-no-i18n>${escapeHtml(t(poi.name))}</strong> <span class="tn-badge tn-badge--${state.open ? 'resolved' : 'pending'}">${W20T(state.open ? 'Ouvert' : 'Fermé')}</span><br><span class="tn-hint" data-no-i18n>${escapeHtml(t(poi.sector))} · ${escapeHtml(state.text)}${poi.contact && poi.contact !== '—' ? ' · ' + escapeHtml(t(poi.contact)) : ''}</span></li>`;
    }).join('');
}

function w20StepsHtml() {
    return `<ol class="w20-steps">${W20_STEPS.map(([icon, text]) => `<li><i aria-hidden="true" class="fa-solid ${icon}"></i><span>${W20T(text)}</span></li>`).join('')}</ol>`;
}

function w20UpdatesHtml(outage) {
    const list = (outage.updates || []).slice().reverse();
    if (!list.length) return '';
    return `<h3 class="w20-sub">${W20T('Dernières informations')}</h3><ul class="w20-updates" data-no-i18n>${list.slice(0, 4).map(item => `<li><strong>${escapeHtml(w20Clock(item.at))}</strong> ${escapeHtml(item.text)}</li>`).join('')}</ul>`;
}

function w20Exercise(outage) { return outage.exercise ? `<span class="w20-exercise">${W20T('EXERCICE')}</span>` : ''; }

function w20ExpandedHtml(outage) {
    const label = w20Label(outage.sectors);
    const concern = w20Concern(outage);
    const mine = w20Mine();
    const eta = outage.backAt ? t('Retour prévu vers {time} (estimation).', { time: w20Clock(outage.backAt) }) : t('Heure de retour non connue : prochaine information dès que possible.');
    const concernHtml = concern === 'mine' ? `<p class="w20-concern w20-concern--mine"><i aria-hidden="true" class="fa-solid fa-triangle-exclamation"></i> ${W20T('Vous êtes dans un secteur touché. Suivez ces consignes maintenant.')}</p>`
        : concern === 'other' ? `<p class="w20-concern w20-concern--other"><i aria-hidden="true" class="fa-solid fa-circle-check"></i> ${W20T('Votre secteur ({sector}) n\'est pas touché. Rien à faire : limitez votre consommation d\'énergie pour aider le réseau.', { sector: t(mine) })}</p>`
        : `<p class="w20-concern w20-concern--unknown"><i aria-hidden="true" class="fa-solid fa-location-dot"></i> ${W20T('Indiquez votre secteur pour savoir si vous êtes touché·e.')}
            <select id="w20-sector" class="cyber-input" aria-label="${escapeHtml(t('Mon secteur'))}"><option value="">${escapeHtml(t('Choisir mon secteur'))}</option>${W20_SECTORS.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(t(name))}</option>`).join('')}</select></p>`;
    return `
        <div class="w20-head"><i aria-hidden="true" class="fa-solid fa-bolt-lightning"></i><h2 id="w20-title" data-no-i18n>${escapeHtml(t('PANNE ÉLECTRIQUE'))} — ${escapeHtml(label)}</h2>${w20Exercise(outage)}</div>
        <p class="w20-meta" data-no-i18n>${escapeHtml(t('En cours depuis'))} ${escapeHtml(w20Clock(outage.since))} · ${escapeHtml(eta)}</p>
        ${concernHtml}
        ${concern !== 'other' ? `<h3 class="w20-sub">${W20T('Que faire maintenant')}</h3>${w20StepsHtml()}` : ''}
        <h3 class="w20-sub">${W20T("Où trouver de l'aide")}</h3>
        <ul class="w20-help"><li><strong data-no-i18n>112</strong> <span class="tn-hint">${W20T("Balise d'urgence, à toute heure.")}</span></li>${w20Help(outage)}</ul>
        ${w20UpdatesHtml(outage)}
        <div class="w20-actions">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w20="ack">${W20T("J'ai compris")}</button>
            <a class="btn-cyber px-4 py-2 text-xs font-bold uppercase" href="#essentiel">${W20T("Voir l'essentiel")}</a>
            <a class="btn-cyber px-4 py-2 text-xs font-bold uppercase" href="#plan-ville">${W20T('Voir le plan')}</a>
        </div>`;
}

function w20Render(force) {
    const outage = w20.outage;
    let bar = document.getElementById('w20-outage');
    if (!outage) {
        if (bar) bar.remove();
        document.title = w20.baseTitle;
        return;
    }
    const sig = w20Sig(outage);
    const changed = sig !== w20.sig;
    if (!changed && !force && bar) return;
    w20.sig = sig;
    if (!bar) {
        bar = document.createElement('section');
        bar.id = 'w20-outage';
        const first = document.getElementById('w18-incident');
        if (first) first.after(bar); else document.body.prepend(bar);
    }
    const label = w20Label(outage.sectors);
    const concern = outage.active ? w20Concern(outage) : 'restored';
    bar.className = `w20 w20--${outage.active ? 'active' : 'restored'} w20--${concern}`;
    bar.setAttribute('aria-labelledby', 'w20-title');
    const seen = w20Seen() === sig;
    if (!outage.active) {
        document.title = w20.baseTitle;
        if (seen) { bar.remove(); return; }
        bar.setAttribute('role', 'status');
        bar.innerHTML = `<div class="w20-head"><i aria-hidden="true" class="fa-solid fa-plug-circle-check"></i><h2 id="w20-title" data-no-i18n>${escapeHtml(t('Courant rétabli'))} — ${escapeHtml(label)}</h2>${w20Exercise(outage)}</div>
            <p class="w20-meta" data-no-i18n>${escapeHtml(t('Rétabli à'))} ${escapeHtml(w20Clock(outage.clearedAt))}. ${escapeHtml(t("Si un appareil ne redémarre pas, faites un signalement dans « Signalement & contact »."))}</p>
            ${w20UpdatesHtml(outage)}
            <div class="w20-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w20="ack">${W20T('Fermer')}</button></div>`;
        announce(t('Le courant est rétabli : {sector}.', { sector: label }));
        return;
    }
    document.title = `⚠ ${t('Panne électrique')} — ${w20.baseTitle}`;
    bar.setAttribute('role', 'alert');
    if (seen && w20Concern(outage) !== 'unknown') {
        bar.classList.add('w20--slim');
        bar.innerHTML = `<i aria-hidden="true" class="fa-solid fa-bolt-lightning"></i> <strong data-no-i18n>${escapeHtml(t('Panne électrique'))} — ${escapeHtml(label)}</strong>${outage.exercise ? ' <span class="w20-exercise">' + W20T('EXERCICE') + '</span>' : ''}<span data-no-i18n>${outage.backAt ? ' · ' + escapeHtml(t('retour prévu vers {time}', { time: w20Clock(outage.backAt) })) : ''}</span> <button type="button" class="w20-link" data-w20="open">${W20T('Détails')}</button>`;
        return;
    }
    bar.innerHTML = w20ExpandedHtml(outage);
    const select = bar.querySelector('#w20-sector');
    if (select) select.addEventListener('change', () => { if (select.value && typeof setMySector === 'function') { setMySector(select.value); w20Render(true); } });
}

function w20Sync(outage) {
    const next = outage && outage.id ? outage : null;
    const sig = w20Sig(next);
    const same = sig === w20.sig;
    w20.outage = next;
    if (!same || !document.getElementById('w20-outage') && next) {
        w20Render(false);
        if (next) document.dispatchEvent(new CustomEvent('tn:outage', { detail: next }));
        else document.dispatchEvent(new CustomEvent('tn:outage', { detail: null }));
        w20Panel();
    }
}

// ------------------------------------------
// Panneau agent
// ------------------------------------------
function w20Panel() {
    const box = document.getElementById('w20-panel-body');
    if (!box) return;
    if (!w15Unlocked()) { box.innerHTML = `<p class="tn-hint"><i aria-hidden="true" class="fa-solid fa-lock"></i> ${W20T('Réservé aux agents connectés.')} <a class="tn-link" href="#w15-security">${W20T("Ouvrir le centre de sécurité pour s'identifier")}</a></p>`; return; }
    const outage = w20.outage;
    const etaOptions = [[0, 'Inconnu'], [30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h'], [480, '8 h']].map(([value, label]) => `<option value="${value}">${escapeHtml(t(label))}</option>`).join('');
    if (outage && outage.active) {
        box.innerHTML = `<p class="w20-state" role="status"><span class="tn-badge tn-badge--pending">${W20T('Alerte en cours')}</span> <span data-no-i18n>${escapeHtml(w20Label(outage.sectors))} · ${escapeHtml(t('depuis'))} ${escapeHtml(w20Clock(outage.since))}${outage.backAt ? ' · ' + escapeHtml(t('retour prévu vers {time}', { time: w20Clock(outage.backAt) })) : ''}</span>${outage.exercise ? ' <span class="w20-exercise">' + W20T('EXERCICE') + '</span>' : ''}</p>
            <form data-w20-form="update" novalidate class="w20-form">
                <label class="tn-field-label" for="w20-text">${W20T('Mise à jour pour les habitants')}</label>
                <input id="w20-text" class="cyber-input" maxlength="240" placeholder="${escapeHtml(t('Ex. Équipe sur place, réparation en cours'))}">
                <label class="tn-field-label" for="w20-eta">${W20T('Nouveau retour prévu dans')}</label>
                <select id="w20-eta" class="cyber-input">${etaOptions}</select>
                <div class="w20-actions">
                    <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W20T('Publier la mise à jour')}</button>
                    <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w20="clear">${W20T('Rétablir le courant')}</button>
                </div>
                <p id="w20-msg" class="tn-hint" role="status"></p>
            </form>`;
        return;
    }
    box.innerHTML = `<form data-w20-form="set" novalidate class="w20-form">
        <fieldset class="w20-fieldset"><legend class="tn-field-label">${W20T('Secteurs touchés')}</legend>
            ${W20_SECTORS.map((name, index) => `<label class="w13-need-opt"><input type="checkbox" name="w20-sector" value="${escapeHtml(name)}" id="w20-s${index}"> <span data-no-i18n>${escapeHtml(t(name))}</span></label>`).join('')}
            <button type="button" class="tn-link" data-w20="north">${W20T('Secteur nord (Dôme Alpha + Dôme Bêta)')}</button>
        </fieldset>
        <label class="tn-field-label" for="w20-eta">${W20T('Retour prévu dans')}</label>
        <select id="w20-eta" class="cyber-input">${etaOptions}</select>
        <label class="tn-field-label" for="w20-text">${W20T('Première information (facultatif)')}</label>
        <input id="w20-text" class="cyber-input" maxlength="240" placeholder="${escapeHtml(t('Ex. Défaut sur le transformateur nord'))}">
        <label class="w13-need-opt"><input type="checkbox" id="w20-exercise"> <span>${W20T('Exercice : les habitants voient « EXERCICE »')}</span></label>
        <div class="w20-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w20-submit>${W20T("Déclencher l'alerte")}</button></div>
        <p id="w20-msg" class="tn-hint" role="status"></p>
    </form>
    ${outage && !outage.active ? `<p class="tn-hint" data-no-i18n>${escapeHtml(t('Dernière panne rétablie à'))} ${escapeHtml(w20Clock(outage.clearedAt))}.</p>` : ''}`;
}

function w20Confirm(kind) {
    if (w20.confirming === kind) { w20.confirming = ''; clearTimeout(w20.confirmTimer); return true; }
    w20.confirming = kind;
    clearTimeout(w20.confirmTimer);
    const button = kind === 'set' ? document.querySelector('[data-w20-submit]') : document.querySelector('[data-w20="clear"]');
    const original = button ? button.textContent : '';
    if (button) button.textContent = t(kind === 'set' ? 'Confirmer : diffuser à tous les habitants' : 'Confirmer : courant rétabli');
    w20.confirmTimer = setTimeout(() => { w20.confirming = ''; if (button && document.body.contains(button)) button.textContent = original; const m = document.getElementById('w20-msg'); if (m) m.textContent = ''; }, 8000);
    const msg = document.getElementById('w20-msg');
    if (msg) msg.textContent = t('Cela sera visible par tous les habitants. Cliquez encore pour confirmer.');
    return false;
}

async function w20Send(body, okText) {
    const result = await w15Api('/api/agent/outage', { method: 'POST', body: JSON.stringify(body) });
    const msg = document.getElementById('w20-msg');
    if (!result.ok) { if (msg) msg.textContent = (result.data && result.data.error) || t('Opération refusée.'); return; }
    window.tnOutage = result.data.outage;
    w20.confirming = '';
    w20Sync(result.data.outage);
    w20SetSeen(w20Sig(result.data.outage));
    w20Render(true);
    w20Panel();
    const note = document.getElementById('w20-msg'); if (note) note.textContent = t(okText);
    announce(t(okText));
    if (typeof refreshBroadcasts === 'function') refreshBroadcasts();
}

function w20BuildPanel() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w20-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'w20-panel';
    panel.className = 'w15-panel';
    panel.setAttribute('aria-labelledby', 'w20-panel-title');
    panel.innerHTML = `<h3 id="w20-panel-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-bolt-lightning"></i> ${W20T('Alerte panne électrique')}</h3>
        <p class="tn-hint">${W20T("Informer tous les habitants sans délai : l'alerte s'affiche en haut de chaque page, avec les consignes adaptées au secteur de chacun.")}</p>
        <div id="w20-panel-body"></div>`;
    workspace.prepend(panel);
    w20Panel();
}

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w20]');
    if (!el) return;
    switch (el.dataset.w20) {
        case 'ack': if (w20.outage) { w20SetSeen(w20Sig(w20.outage)); w20Render(true); } break;
        case 'open': { w20SetSeen(''); w20Render(true); const bar = document.getElementById('w20-outage'); if (bar) { bar.setAttribute('tabindex', '-1'); bar.focus(); } break; }
        case 'north': W20_NORTH.forEach(name => { const box = document.querySelector(`input[name="w20-sector"][value="${name}"]`); if (box) box.checked = true; }); break;
        case 'clear': if (w20Confirm('clear')) w20Send({ action: 'clear', text: 'Le courant est rétabli.' }, 'Courant rétabli : les habitants en sont informés.'); break;
    }
});

document.addEventListener('submit', event => {
    const form = event.target.closest('[data-w20-form]');
    if (!form) return;
    event.preventDefault();
    const text = (document.getElementById('w20-text') || {}).value || '';
    const backMinutes = Number((document.getElementById('w20-eta') || {}).value) || 0;
    if (form.dataset.w20Form === 'set') {
        const sectors = Array.from(document.querySelectorAll('input[name="w20-sector"]:checked')).map(box => box.value);
        const msg = document.getElementById('w20-msg');
        if (!sectors.length) { if (msg) msg.textContent = t('Choisissez au moins un secteur touché.'); return; }
        if (w20Confirm('set')) w20Send({ action: 'set', sectors, backMinutes, text, exercise: document.getElementById('w20-exercise').checked }, 'Alerte diffusée à tous les habitants.');
    } else {
        w20Send({ action: 'update', text, backMinutes }, 'Mise à jour publiée.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    w20.baseTitle = document.title;
    w20BuildPanel();
    w20Sync(window.tnOutage || null);
    document.addEventListener('tn:server', () => w20Sync(window.tnOutage || null));
    document.addEventListener('tn:agent-session', w20Panel);
    document.addEventListener('tn:langchange', () => { w20Render(true); const p = document.getElementById('w20-panel'); if (p) { p.remove(); w20BuildPanel(); } });
    if (typeof setMySector === 'function') {
        const baseSet = setMySector;
        setMySector = function () { const out = baseSet.apply(this, arguments); w20Render(true); return out; };
    }
});
