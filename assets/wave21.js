// ==========================================
// VAGUE 21 — Alerte tempête solaire (F104)
// Une tempête solaire peut couper les communications dans les minutes qui viennent : l'agent déclenche l'alerte
// (impact dans N minutes, durée, niveau), tous les habitants voient un bandeau avec compte à rebours et des consignes
// claires, d'abord pour AVANT l'impact, puis pour PENDANT la tempête. Reprise dans l'Essentiel (hors ligne) et la fiche.
// Réutilise : w20Clock, w20Help, w20UpdatesHtml, w20Seen/w20SetSeen, tnMySector, w15Api, w15Unlocked, w18BuildSheet,
// refreshBroadcasts (tn:server), announce, escapeHtml, t().
// ==========================================

const W21T = (source, params) => escapeHtml(String(t(source, params)));
const W21_LEVELS = { moderee: 'Modérée', forte: 'Forte', extreme: 'Extrême' };
const W21_BEFORE = [
    ['fa-comments', 'Prévenez vos proches et dites-leur où vous serez : les messages peuvent être coupés.'],
    ['fa-house-chimney', "Mettez-vous à l'abri dans un dôme ou un bâtiment couvert ; évitez le Secteur Sud Extérieur et les sorties orbitales."],
    ['fa-plug-circle-bolt', 'Rechargez téléphone et lampe, débranchez les appareils sensibles.'],
    ['fa-location-dot', "Repérez le point d'aide le plus proche (ci-dessous) : si les communications coupent, rendez-vous-y."],
    ['fa-train-tram', 'Reportez les trajets Hyper-Tube et navette qui ne sont pas indispensables.'],
    ['fa-wifi', "Gardez la page « Essentiel » ouverte : elle reste lisible même sans réseau."]
];
const W21_DURING = [
    ['fa-house-chimney', "Restez à l'abri. Ne sortez pas tant que l'alerte n'est pas levée."],
    ['fa-tower-broadcast', "Téléphone ou balise muets ? C'est normal pendant la tempête : n'insistez pas, la batterie compte."],
    ['fa-location-dot', "En cas d'urgence vitale, rendez-vous au point d'aide le plus proche (ci-dessous) ou faites appeler le 112 par un voisin."],
    ['fa-comments', 'Ne cherchez pas à joindre vos proches en boucle : envoyez un seul message court dès que la liaison revient.'],
    ['fa-file-lines', "Cette page et la fiche essentielle restent consultables sans réseau."]
];
const w21 = { solar: null, sig: '', timer: null, confirming: '', confirmTimer: null, baseTitle: document.title };

function w21Phase(solar) {
    const now = Date.now();
    if (!solar.active) return 'over';
    if (now < Date.parse(solar.startsAt)) return 'before';
    if (now < Date.parse(solar.endsAt)) return 'during';
    return 'late';
}
function w21Sig(solar) { return solar ? [solar.id, solar.active, w21Phase(solar), (solar.updates || []).length, solar.endsAt].join('|') : ''; }
function w21Left(iso) {
    const minutes = Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 60000));
    return minutes >= 60 ? t('{h} h {m} min', { h: Math.floor(minutes / 60), m: minutes % 60 }) : t('{n} min', { n: minutes });
}
function w21Seen() { try { return sessionStorage.getItem('tn_w21_seen') || ''; } catch (err) { return ''; } }
function w21SetSeen(sig) { try { sessionStorage.setItem('tn_w21_seen', sig); } catch (err) { } }

function w21Headline(solar) {
    const phase = w21Phase(solar);
    if (phase === 'before') return `${t('Impact attendu dans')} <span data-w21-count="${escapeHtml(solar.startsAt)}">${escapeHtml(w21Left(solar.startsAt))}</span> (${t('vers {time}', { time: w20Clock(solar.startsAt) })})`;
    if (phase === 'during') return `${t('Tempête en cours')} · ${t('fin estimée dans')} <span data-w21-count="${escapeHtml(solar.endsAt)}">${escapeHtml(w21Left(solar.endsAt))}</span> (${t('vers {time}', { time: w20Clock(solar.endsAt) })})`;
    return t("La fin estimée est dépassée : attendez la confirmation de l'agent avant de ressortir.");
}

function w21Expanded(solar) {
    const phase = w21Phase(solar);
    const steps = phase === 'before' ? W21_BEFORE : W21_DURING;
    const mine = typeof tnMySector === 'function' ? tnMySector() : '';
    const outside = mine === 'Secteur Sud Extérieur';
    const base = { sectors: [] };
    return `
        <div class="w20-head"><i aria-hidden="true" class="fa-solid fa-sun"></i><h2 id="w21-title" data-no-i18n>${escapeHtml(t('TEMPÊTE SOLAIRE'))}</h2>
            <span class="w21-level w21-level--${escapeHtml(solar.severity)}">${W21T(W21_LEVELS[solar.severity] || 'Modérée')}</span>${solar.exercise ? `<span class="w20-exercise">${W21T('EXERCICE')}</span>` : ''}</div>
        <p class="w20-meta w21-when" data-no-i18n>${w21Headline(solar)}</p>
        <p class="w20-concern w21-concern"><i aria-hidden="true" class="fa-solid fa-tower-broadcast"></i> ${W21T('Les communications (téléphone, balise, messages) peuvent être brouillées ou coupées.')}</p>
        ${outside ? `<p class="w20-concern w20-concern--mine"><i aria-hidden="true" class="fa-solid fa-triangle-exclamation"></i> ${W21T('Vous êtes en zone extérieure (Secteur Sud) : mettez-vous à l\'abri maintenant.')}</p>` : ''}
        <h3 class="w20-sub">${W21T(phase === 'before' ? "À faire maintenant, avant l'impact" : 'Pendant la tempête')}</h3>
        <ol class="w20-steps">${steps.map(([icon, text]) => `<li><i aria-hidden="true" class="fa-solid ${icon}"></i><span>${W21T(text)}</span></li>`).join('')}</ol>
        <h3 class="w20-sub">${W21T("Où trouver de l'aide")}</h3>
        <ul class="w20-help"><li><strong data-no-i18n>112</strong> <span class="tn-hint">${W21T("Balise d'urgence (peut être perturbée pendant la tempête).")}</span></li>${typeof w20Help === 'function' ? w20Help(base) : ''}</ul>
        ${typeof w20UpdatesHtml === 'function' ? w20UpdatesHtml(solar) : ''}
        <div class="w20-actions">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w21="ack">${W21T("J'ai compris")}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w21="sheet">${W21T('Télécharger la fiche essentielle')}</button>
            <a class="btn-cyber px-4 py-2 text-xs font-bold uppercase" href="#essentiel">${W21T("Voir l'essentiel")}</a>
        </div>`;
}

function w21Render(force) {
    const solar = w21.solar;
    let bar = document.getElementById('w21-solar');
    if (!solar) { if (bar) bar.remove(); if (document.title.startsWith('☀')) document.title = w21.baseTitle; return; }
    const sig = w21Sig(solar);
    const changed = sig !== w21.sig;
    if (!changed && !force && bar) return;
    w21.sig = sig;
    if (!bar) {
        bar = document.createElement('section');
        bar.id = 'w21-solar';
        const anchor = document.getElementById('w20-outage') || document.getElementById('w18-incident');
        if (anchor) anchor.after(bar); else document.body.prepend(bar);
    }
    const phase = w21Phase(solar);
    bar.className = `w20 w21 w21--${solar.active ? phase : 'over'}`;
    bar.setAttribute('aria-labelledby', 'w21-title');
    const seen = w21Seen() === sig;
    if (!solar.active) {
        if (document.title.startsWith('☀')) document.title = w21.baseTitle;
        if (seen) { bar.remove(); return; }
        bar.classList.add('w20--restored');
        bar.setAttribute('role', 'status');
        bar.innerHTML = `<div class="w20-head"><i aria-hidden="true" class="fa-solid fa-sun"></i><h2 id="w21-title" data-no-i18n>${escapeHtml(t('Tempête solaire terminée'))}</h2>${solar.exercise ? `<span class="w20-exercise">${W21T('EXERCICE')}</span>` : ''}</div>
            <p class="w20-meta" data-no-i18n>${escapeHtml(t('Fin confirmée à'))} ${escapeHtml(w20Clock(solar.clearedAt))}. ${escapeHtml(t('Les communications reviennent progressivement : un seul message court à vos proches suffit.'))}</p>
            <div class="w20-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w21="ack">${W21T('Fermer')}</button></div>`;
        announce(t('La tempête solaire est terminée.'));
        return;
    }
    document.title = `☀ ${t('Tempête solaire')} — ${w21.baseTitle}`;
    bar.setAttribute('role', 'alert');
    if (seen) {
        bar.classList.add('w20--slim');
        bar.innerHTML = `<i aria-hidden="true" class="fa-solid fa-sun"></i> <strong data-no-i18n>${escapeHtml(t('Tempête solaire'))}</strong>${solar.exercise ? ' <span class="w20-exercise">' + W21T('EXERCICE') + '</span>' : ''} · <span data-no-i18n>${w21Headline(solar)}</span> <button type="button" class="w20-link" data-w21="open">${W21T('Détails')}</button>`;
        return;
    }
    bar.innerHTML = w21Expanded(solar);
}

function w21Tick() {
    document.querySelectorAll('[data-w21-count]').forEach(el => { el.textContent = w21Left(el.dataset.w21Count); });
    if (w21.solar && w21Sig(w21.solar) !== w21.sig) w21Render(true);
}

function w21Sync(solar) {
    const next = solar && solar.id ? solar : null;
    const same = w21Sig(next) === w21.sig && Boolean(document.getElementById('w21-solar')) === Boolean(next);
    w21.solar = next;
    if (!same) {
        w21Render(true);
        document.dispatchEvent(new CustomEvent('tn:solar', { detail: next }));
        w21Panel();
    }
}

// ------------------------------------------
// Panneau agent
// ------------------------------------------
function w21Panel() {
    const box = document.getElementById('w21-panel-body');
    if (!box) return;
    if (!w15Unlocked()) { box.innerHTML = `<p class="tn-hint"><i aria-hidden="true" class="fa-solid fa-lock"></i> ${W21T('Réservé aux agents connectés.')} <a class="tn-link" href="#w15-security">${W21T("Ouvrir le centre de sécurité pour s'identifier")}</a></p>`; return; }
    const solar = w21.solar;
    const durations = [[30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h']].map(([value, label]) => `<option value="${value}" ${value === 60 ? 'selected' : ''}>${escapeHtml(t(label))}</option>`).join('');
    if (solar && solar.active) {
        box.innerHTML = `<p class="w20-state" role="status"><span class="tn-badge tn-badge--pending">${W21T('Alerte en cours')}</span> <span data-no-i18n>${escapeHtml(t(W21_LEVELS[solar.severity] || 'Modérée'))} · ${escapeHtml(t(w21Phase(solar) === 'before' ? 'impact vers {time}' : 'fin estimée vers {time}', { time: w20Clock(w21Phase(solar) === 'before' ? solar.startsAt : solar.endsAt) }))}</span>${solar.exercise ? ' <span class="w20-exercise">' + W21T('EXERCICE') + '</span>' : ''}</p>
            <form data-w21-form="update" novalidate class="w20-form">
                <label class="tn-field-label" for="w21-text">${W21T('Mise à jour pour les habitants')}</label>
                <input id="w21-text" class="cyber-input" maxlength="240" placeholder="${escapeHtml(t('Ex. Impact confirmé, liaisons coupées dans le Secteur Sud'))}">
                <label class="tn-field-label" for="w21-duration">${W21T('Nouvelle durée estimée (à partir de maintenant)')}</label>
                <select id="w21-duration" class="cyber-input"><option value="">${escapeHtml(t('Ne pas changer'))}</option>${durations}</select>
                <div class="w20-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W21T('Publier la mise à jour')}</button>
                    <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w21="clear">${W21T('Fin de la tempête')}</button></div>
                <p id="w21-msg" class="tn-hint" role="status"></p>
            </form>`;
        return;
    }
    box.innerHTML = `<form data-w21-form="set" novalidate class="w20-form">
        <label class="tn-field-label" for="w21-start">${W21T('Impact attendu dans')}</label>
        <select id="w21-start" class="cyber-input">${[[0, 'Déjà en cours'], [5, '5 min'], [10, '10 min'], [15, '15 min'], [30, '30 min'], [60, '1 h']].map(([value, label], index) => `<option value="${value}" ${value === 10 ? 'selected' : ''}>${escapeHtml(t(label))}</option>`).join('')}</select>
        <label class="tn-field-label" for="w21-duration">${W21T('Durée estimée')}</label>
        <select id="w21-duration" class="cyber-input">${durations}</select>
        <label class="tn-field-label" for="w21-severity">${W21T('Niveau')}</label>
        <select id="w21-severity" class="cyber-input">${Object.keys(W21_LEVELS).map(key => `<option value="${key}">${escapeHtml(t(W21_LEVELS[key]))}</option>`).join('')}</select>
        <label class="tn-field-label" for="w21-text">${W21T('Première information (facultatif)')}</label>
        <input id="w21-text" class="cyber-input" maxlength="240" placeholder="${escapeHtml(t('Ex. Éruption détectée par la veille atmosphérique'))}">
        <label class="w13-need-opt"><input type="checkbox" id="w21-exercise"> <span>${W21T('Exercice : les habitants voient « EXERCICE »')}</span></label>
        <div class="w20-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w21-submit>${W21T("Déclencher l'alerte")}</button></div>
        <p id="w21-msg" class="tn-hint" role="status"></p>
    </form>${solar && !solar.active ? `<p class="tn-hint" data-no-i18n>${escapeHtml(t('Dernière tempête terminée à'))} ${escapeHtml(w20Clock(solar.clearedAt))}.</p>` : ''}`;
}

function w21Confirm(kind) {
    if (w21.confirming === kind) { w21.confirming = ''; clearTimeout(w21.confirmTimer); return true; }
    w21.confirming = kind;
    clearTimeout(w21.confirmTimer);
    const button = kind === 'set' ? document.querySelector('[data-w21-submit]') : document.querySelector('[data-w21="clear"]');
    const original = button ? button.textContent : '';
    if (button) button.textContent = t(kind === 'set' ? 'Confirmer : diffuser à tous les habitants' : 'Confirmer : fin de la tempête');
    w21.confirmTimer = setTimeout(() => { w21.confirming = ''; if (button && document.body.contains(button)) button.textContent = original; const m = document.getElementById('w21-msg'); if (m) m.textContent = ''; }, 8000);
    const msg = document.getElementById('w21-msg');
    if (msg) msg.textContent = t('Cela sera visible par tous les habitants. Cliquez encore pour confirmer.');
    return false;
}

async function w21Send(body, okText) {
    const result = await w15Api('/api/agent/solar', { method: 'POST', body: JSON.stringify(body) });
    const msg = document.getElementById('w21-msg');
    if (!result.ok) { if (msg) msg.textContent = (result.data && result.data.error) || t('Opération refusée.'); return; }
    window.tnSolar = result.data.solar;
    w21.confirming = '';
    w21Sync(result.data.solar);
    w21SetSeen(w21Sig(result.data.solar));
    w21Render(true);
    w21Panel();
    const note = document.getElementById('w21-msg'); if (note) note.textContent = t(okText);
    announce(t(okText));
    if (typeof refreshBroadcasts === 'function') refreshBroadcasts();
}

function w21BuildPanel() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w21-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'w21-panel';
    panel.className = 'w15-panel';
    panel.setAttribute('aria-labelledby', 'w21-panel-title');
    panel.innerHTML = `<h3 id="w21-panel-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-sun"></i> ${W21T('Alerte tempête solaire')}</h3>
        <p class="tn-hint">${W21T("Prévenir tous les habitants avant l'impact : compte à rebours, consignes pour avant puis pendant la tempête, mises à jour datées.")}</p>
        <div id="w21-panel-body"></div>`;
    workspace.prepend(panel);
    w21Panel();
}

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w21]');
    if (!el) return;
    switch (el.dataset.w21) {
        case 'ack': if (w21.solar) { w21SetSeen(w21Sig(w21.solar)); w21Render(true); } break;
        case 'open': { w21SetSeen(''); w21Render(true); const bar = document.getElementById('w21-solar'); if (bar) { bar.setAttribute('tabindex', '-1'); bar.focus(); } break; }
        case 'sheet': if (typeof w18BuildSheet === 'function') { w18Download('fiche-essentielle-terra-nova.html', w18BuildSheet(), 'text/html;charset=utf-8'); announce(t('Fiche essentielle téléchargée.')); } break;
        case 'clear': if (w21Confirm('clear')) w21Send({ action: 'clear', text: 'La tempête solaire est terminée.' }, 'Fin de la tempête : les habitants en sont informés.'); break;
    }
});

document.addEventListener('submit', event => {
    const form = event.target.closest('[data-w21-form]');
    if (!form) return;
    event.preventDefault();
    const text = (document.getElementById('w21-text') || {}).value || '';
    const durationMinutes = Number((document.getElementById('w21-duration') || {}).value) || 0;
    if (form.dataset.w21Form === 'set') {
        if (w21Confirm('set')) w21Send({ action: 'set', startInMinutes: Number(document.getElementById('w21-start').value) || 0, durationMinutes, severity: document.getElementById('w21-severity').value, text, exercise: document.getElementById('w21-exercise').checked }, 'Alerte diffusée à tous les habitants.');
    } else {
        w21Send({ action: 'update', text, durationMinutes }, 'Mise à jour publiée.');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    w21.baseTitle = document.title.replace(/^[⚠☀] .*? — /, '');
    w21BuildPanel();
    w21Sync(window.tnSolar || null);
    document.addEventListener('tn:server', () => w21Sync(window.tnSolar || null));
    document.addEventListener('tn:agent-session', w21Panel);
    document.addEventListener('tn:langchange', () => { w21Render(true); const p = document.getElementById('w21-panel'); if (p) { p.remove(); w21BuildPanel(); } });
    // Le compte à rebours avance chaque seconde ; il ne fait aucune requête
    setInterval(() => { if (!document.hidden && w21.solar) w21Tick(); }, 1000);
});
