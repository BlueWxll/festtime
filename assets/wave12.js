// ==========================================
// VAGUE 12 — Participation des habitants
// F65 avis sur certaines décisions + trace claire de la prise en compte, F66 répondre à une consultation
// (hors vote officiel) avec accusé d'enregistrement, F67 consulter les projets en cours de la ville,
// F68 proposer des idées pour la colonie.
// Chargé après assets/wave11.js ; réutilise w4OpenDialog, w4Audit, w6Notify, announce, goToSection, tnNotificationItems.
// ==========================================

const W12T = (source, params) => escapeHtml(String(t(source, params)));
const W12_KEYS = { resp: 'tn_w12_resp', out: 'tn_w12_out', ideas: 'tn_w12_ideas' };
const W12_UI = { tab: 'projets', status: '', zone: '', ideaSort: 'soutiens' };

function w12Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w12Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }
function w12Staff() { return typeof w4Staff === 'function' ? w4Staff() : (currentRole === 'agent' || currentRole === 'admin'); }
function w12Ref(prefix) { return prefix + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
function w12Me() { return typeof activeCitizen !== 'undefined' && activeCitizen ? activeCitizen : null; }
function w12Date(day) {
    const date = new Date(day + 'T00:00:00');
    return isNaN(date) ? day : date.toLocaleDateString(typeof tnLocale === 'function' ? tnLocale() : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
function w12Stamp(stamp) { return typeof tnFormatStamp === 'function' ? tnFormatStamp(stamp) : stamp; }
function w12Now() { return typeof tnLocalStamp === 'function' ? tnLocalStamp() : new Date().toISOString().slice(0, 16).replace('T', ' '); }
function w12DaysLeft(day) { return Math.ceil((new Date(day + 'T23:59:59') - Date.now()) / 86400000); }

// ------------------------------------------
// Données de démonstration
// ------------------------------------------
const W12_PROJECT_STATE = {
    planned: { label: 'Prévu', cls: 'pending' },
    building: { label: 'En cours', cls: 'progress' },
    done: { label: 'Terminé', cls: 'resolved' }
};

const W12_PROJECTS = [
    { id: 'PRJ-01', title: 'Nouvelle ligne Hyper-Tube Anneau 2 – Dôme Bêta', summary: 'Une ligne directe pour relier l\'Anneau 2 au Dôme Bêta sans changer à la station centrale.', zone: 'Anneau 2', service: 'Transports & Hyper-Tubes', state: 'building', progress: 55, period: 'Mars 2026 – Juin 2027', budget: '4,2 M crédits', next: 'Pose des rails du tronçon nord', consult: 'CON-01' },
    { id: 'PRJ-02', title: 'Jardin hydroponique du Dôme Alpha', summary: 'Un jardin partagé sous le dôme, ouvert à tous les habitants du secteur.', zone: 'Dôme Alpha', service: 'Atmosphère & Biosphère', state: 'planned', progress: 10, period: 'Janvier 2027 – Septembre 2027', budget: '1,1 M crédits', next: 'Choix des horaires d\'ouverture', consult: 'CON-02' },
    { id: 'PRJ-03', title: 'Rénovation de l\'éclairage des passerelles', summary: 'Remplacement des lampes défaillantes par des modules basse consommation.', zone: 'Anneau 2', service: 'Énergie Plasma & Réacteur Zéro', state: 'building', progress: 30, period: 'Septembre 2026 – Février 2027', budget: '0,6 M crédits', next: 'Passerelles de l\'Anneau 2 (secteur est)', consult: null },
    { id: 'PRJ-04', title: 'Extension de l\'aile Cryo-Soins', summary: 'Plus de places d\'accueil et des consultations plus tard dans la journée.', zone: 'Dôme Alpha', service: 'Santé Biotech & Cryo-Soins', state: 'planned', progress: 15, period: 'Novembre 2026 – Décembre 2027', budget: '6,8 M crédits', next: 'Plans validés, début du chantier', consult: 'CON-03' },
    { id: 'PRJ-05', title: 'Capteurs de qualité de l\'air dans tous les dômes', summary: 'Des mesures en direct de l\'air respirable, visibles par tous.', zone: 'Tous les dômes', service: 'Atmosphère & Biosphère', state: 'done', progress: 100, period: 'Janvier 2026 – Juillet 2026', budget: '0,9 M crédits', next: 'Projet terminé : entretien annuel', consult: null }
];

const W12_CONSULTS = [
    { id: 'CON-01', project: 'PRJ-01', question: 'Où placer la nouvelle station du Dôme Bêta ?', options: ['Près de la place centrale', 'Près du marché hydroponique', 'Peu importe'], base: [41, 28, 6], opens: '2026-09-20', closes: '2026-12-15', outcome: null },
    { id: 'CON-02', project: 'PRJ-02', question: 'À quels moments ouvrir le jardin hydroponique ?', options: ['Chaque jour, jusqu\'au soir', 'Seulement le week-end', 'En journée uniquement'], base: [34, 19, 22], opens: '2026-09-25', closes: '2026-11-20', outcome: null },
    { id: 'CON-03', project: 'PRJ-04', question: 'Faut-il étendre les horaires de consultation de l\'aile Cryo-Soins ?', options: ['Oui, jusqu\'à 22 h', 'Oui, le week-end seulement', 'Non, garder les horaires actuels'], base: [57, 31, 8], opens: '2026-08-15', closes: '2026-09-15',
        outcome: { at: '2026-09-22 10:00', text: 'Les consultations seront ouvertes jusqu\'à 22 h dès l\'ouverture de l\'extension. Le week-end sera étudié dans un second temps.', retained: 'Oui, jusqu\'à 22 h' } }
];

const W12_THEMES = ['Transports', 'Santé', 'Environnement et air', 'Énergie', 'Vie de quartier', 'Numérique', 'Autre'];

const W12_IDEA_STATE = {
    received: { label: 'Reçue', cls: 'pending', meaning: 'Votre idée est enregistrée. Un agent va la lire.' },
    study: { label: 'À l\'étude', cls: 'progress', meaning: 'Les services de la ville étudient si elle est possible.' },
    retained: { label: 'Retenue', cls: 'resolved', meaning: 'La ville a décidé de la mettre en œuvre.' },
    declined: { label: 'Non retenue', cls: 'neutral', meaning: 'La ville ne peut pas la réaliser, les raisons sont indiquées.' },
    done: { label: 'Réalisée', cls: 'resolved', meaning: 'L\'idée est mise en place.' }
};

const W12_RESP_STATE = {
    received: { label: 'Reçu', cls: 'pending', meaning: 'Votre avis est enregistré.' },
    read: { label: 'Lu par un agent', cls: 'progress', meaning: 'Un agent a pris connaissance de tous les avis.' },
    considered: { label: 'Pris en compte', cls: 'resolved', meaning: 'La ville a publié sa décision, voir ci-dessous ce qu\'elle a retenu.' },
    withdrawn: { label: 'Retiré', cls: 'neutral', meaning: 'Vous avez retiré votre avis.' }
};

const W12_SEED_IDEAS = [
    { id: 'IDE-4K2MA', title: 'Des bancs avec prises de recharge sur les passerelles', text: 'Pouvoir recharger son biolink en attendant le tube.', theme: 'Vie de quartier', zone: 'Anneau 2', ownerName: 'Habitant du Dôme Gamma', owner: 'seed', at: '2026-09-18 09:10', base: 23, supports: [], status: 'study', reply: '', history: [{ at: '2026-09-18 09:10', status: 'received', note: '' }, { at: '2026-09-24 14:30', status: 'study', note: 'Le service Énergie vérifie la puissance disponible.' }] },
    { id: 'IDE-7Q9XD', title: 'Une carte des zones calmes de la colonie', text: 'Indiquer les lieux sans bruit de machines, pour se reposer.', theme: 'Environnement et air', zone: 'Tous les dômes', ownerName: 'Habitante du Dôme Alpha', owner: 'seed', at: '2026-09-10 18:42', base: 31, supports: [], status: 'retained', reply: 'Les mesures de bruit des capteurs seront publiées sur le Plan de la ville au printemps.', history: [{ at: '2026-09-10 18:42', status: 'received', note: '' }, { at: '2026-09-17 11:00', status: 'study', note: '' }, { at: '2026-09-29 16:15', status: 'retained', note: 'Les mesures de bruit des capteurs seront publiées sur le Plan de la ville au printemps.' }] },
    { id: 'IDE-2B6TL', title: 'Un guichet sans file d\'attente le samedi matin', text: 'Pour ceux qui travaillent en semaine.', theme: 'Numérique', zone: 'Dôme Alpha', ownerName: 'Habitant du Dôme Bêta', owner: 'seed', at: '2026-09-27 08:05', base: 12, supports: [], status: 'received', reply: '', history: [{ at: '2026-09-27 08:05', status: 'received', note: '' }] }
];

function w12Responses() { return w12Load(W12_KEYS.resp, []); }
function w12Outcomes() { return w12Load(W12_KEYS.out, {}); }
function w12Ideas() {
    const stored = w12Load(W12_KEYS.ideas, null);
    if (stored) return stored;
    const seeded = JSON.parse(JSON.stringify(W12_SEED_IDEAS));
    w12Save(W12_KEYS.ideas, seeded);
    return seeded;
}
function w12Outcome(consult) { return w12Outcomes()[consult.id] || (consult.outcome ? { at: consult.outcome.at, text: consult.outcome.text, retained: consult.outcome.retained, by: 'Mairie' } : null); }
function w12IsOpen(consult) { return !w12Outcome(consult) && w12DaysLeft(consult.closes) >= 0; }
function w12Project(id) { return W12_PROJECTS.find(project => project.id === id); }
function w12MyResponse(consultId) {
    const me = w12Me();
    return me ? w12Responses().find(r => r.consult === consultId && r.owner === me.matricule && r.status !== 'withdrawn') : null;
}
function w12Counts(consult) {
    const counts = consult.base.slice();
    w12Responses().filter(r => r.consult === consult.id && r.status !== 'withdrawn').forEach(r => { const i = consult.options.indexOf(r.choice); if (i >= 0) counts[i] += 1; });
    return counts;
}

// ------------------------------------------
// Composants
// ------------------------------------------
function w12Badge(info) { return `<span class="tn-badge tn-badge--${info.cls}" data-no-i18n>${escapeHtml(t(info.label))}</span>`; }

function w12Steps(history, states) {
    return `<ol class="tn-w12-steps">${history.map(step => {
        const info = states[step.status];
        return `<li><span class="tn-w12-step-date" data-no-i18n>${escapeHtml(w12Stamp(step.at))}</span> ${info ? w12Badge(info) : ''}${step.note ? `<span class="tn-w12-step-note" data-no-i18n>${escapeHtml(step.note)}</span>` : ''}</li>`;
    }).join('')}</ol>`;
}

function w12Bars(consult, highlight) {
    const counts = w12Counts(consult);
    const total = counts.reduce((a, b) => a + b, 0) || 1;
    return `<ul class="tn-w12-bars">${consult.options.map((option, i) => {
        const pct = Math.round(counts[i] * 100 / total);
        return `<li><div class="tn-w12-bar-head"><span data-no-i18n>${escapeHtml(t(option))}${highlight === option ? ' ✓' : ''}</span><strong data-no-i18n>${pct} % (${counts[i]})</strong></div><div class="tn-w12-bar" aria-hidden="true"><span style="width:${pct}%"></span></div></li>`;
    }).join('')}</ul><p class="tn-w9-meta" data-no-i18n>${escapeHtml(t('{n} avis au total', { n: total }))}</p>`;
}

// ------------------------------------------
// F67 — Projets en cours
// ------------------------------------------
function w12ProjectsHtml() {
    const zones = Array.from(new Set(W12_PROJECTS.map(p => p.zone)));
    const list = W12_PROJECTS.filter(p => (!W12_UI.status || p.state === W12_UI.status) && (!W12_UI.zone || p.zone === W12_UI.zone));
    return `
        <div class="tn-w12-filters">
            <div><label class="tn-field-label" for="w12-f-status">${W12T('État du projet')}</label>
            <select id="w12-f-status" class="cyber-input" data-w12-filter="status"><option value="">${W12T('Tous')}</option>${Object.keys(W12_PROJECT_STATE).map(key => `<option value="${key}"${W12_UI.status === key ? ' selected' : ''}>${W12T(W12_PROJECT_STATE[key].label)}</option>`).join('')}</select></div>
            <div><label class="tn-field-label" for="w12-f-zone">${W12T('Secteur')}</label>
            <select id="w12-f-zone" class="cyber-input" data-w12-filter="zone"><option value="">${W12T('Tous')}</option>${zones.map(zone => `<option value="${escapeHtml(zone)}"${W12_UI.zone === zone ? ' selected' : ''}>${W12T(zone)}</option>`).join('')}</select></div>
        </div>
        <p class="tn-w9-meta" role="status">${W12T('{n} projet(s) affiché(s)', { n: list.length })}</p>
        <ul class="tn-w12-cards">${list.map(project => {
            const state = W12_PROJECT_STATE[project.state];
            const consult = project.consult ? W12_CONSULTS.find(c => c.id === project.consult) : null;
            return `<li class="tn-w12-card">
                <div class="tn-w12-card-head"><h4>${W12T(project.title)}</h4>${w12Badge(state)}</div>
                <p>${W12T(project.summary)}</p>
                <div class="tn-w12-progress"><div class="tn-w12-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${project.progress}" aria-label="${W12T('Avancement')}"><span style="width:${project.progress}%"></span></div><strong data-no-i18n>${project.progress} %</strong></div>
                <dl class="tn-w12-facts">
                    <div><dt>${W12T('Secteur')}</dt><dd>${W12T(project.zone)}</dd></div>
                    <div><dt>${W12T('Service responsable')}</dt><dd>${W12T(project.service)}</dd></div>
                    <div><dt>${W12T('Période')}</dt><dd>${W12T(project.period)}</dd></div>
                    <div><dt>${W12T('Budget')}</dt><dd data-no-i18n>${escapeHtml(project.budget.replace('crédits', t('crédits')))}</dd></div>
                    <div><dt>${W12T('Prochaine étape')}</dt><dd>${W12T(project.next)}</dd></div>
                </dl>
                ${consult ? `<p class="tn-w12-link">${w12IsOpen(consult) ? W12T('Une consultation est ouverte sur ce projet.') : W12T('La consultation sur ce projet est terminée.')} <button type="button" class="tn-tab" data-w12="goto-consult" data-id="${consult.id}">${W12T('Voir la consultation')}</button></p>` : ''}
            </li>`;
        }).join('')}</ul>`;
}

// ------------------------------------------
// F65 / F66 — Consultations
// ------------------------------------------
function w12ConsultHtml(consult) {
    const project = w12Project(consult.project);
    const open = w12IsOpen(consult);
    const mine = w12MyResponse(consult.id);
    const outcome = w12Outcome(consult);
    const left = w12DaysLeft(consult.closes);
    const state = outcome ? { label: 'Décision publiée', cls: 'resolved' } : open ? { label: 'Ouverte', cls: 'progress' } : { label: 'Clôturée, décision à venir', cls: 'pending' };
    return `<li class="tn-w12-card" id="w12-${consult.id}">
        <div class="tn-w12-card-head"><h4>${W12T(consult.question)}</h4>${w12Badge(state)}</div>
        <p class="tn-w12-nonofficial"><i aria-hidden="true" class="fa-solid fa-circle-info"></i> ${W12T('Consultation : votre avis éclaire la décision, ce n\'est pas un vote officiel.')}</p>
        <dl class="tn-w12-facts">
            <div><dt>${W12T('Projet concerné')}</dt><dd>${project ? W12T(project.title) : ''}</dd></div>
            <div><dt>${W12T('Ouverte jusqu\'au')}</dt><dd data-no-i18n>${escapeHtml(w12Date(consult.closes))}${open ? ` · ${escapeHtml(t('{n} jour(s) restant(s)', { n: Math.max(left, 0) }))}` : ''}</dd></div>
        </dl>
        ${mine ? `<div class="tn-w12-receipt" role="group" aria-label="${W12T('Votre avis')}">
            <p><strong>✓ ${W12T('Votre avis est enregistré')}</strong> · <span data-no-i18n>${escapeHtml(mine.id)}</span></p>
            <p data-no-i18n>${escapeHtml(t('Votre réponse : {c}', { c: t(mine.choice) }))}${mine.comment ? ` · « ${escapeHtml(mine.comment)} »` : ''}</p>
            <p class="tn-w9-meta">${W12T('Où en est votre avis ?')}</p>${w12Steps(mine.history, W12_RESP_STATE)}</div>` : ''}
        ${outcome ? `<div class="tn-w12-outcome" role="group" aria-label="${W12T('Ce que la ville a retenu')}"><h5>${W12T('Ce que la ville a retenu')}</h5><p data-no-i18n>${escapeHtml(t(outcome.text))}</p><p class="tn-w9-meta" data-no-i18n>${escapeHtml(w12Stamp(outcome.at))}</p></div>` : ''}
        ${(mine || !open) ? `<h5 class="tn-w12-sub">${W12T('Résultats')}</h5>${w12Bars(consult, outcome ? outcome.retained : (mine && mine.choice))}` : `<p class="tn-w9-meta">${W12T('Les résultats s\'affichent après votre réponse.')}</p>`}
        ${open ? `<div class="tn-w12-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w12="respond" data-id="${consult.id}">${W12T(mine ? 'Modifier mon avis' : 'Donner mon avis')}</button>${mine ? `<button type="button" class="tn-tab tn-tab--danger" data-w12="withdraw" data-id="${consult.id}">${W12T('Retirer mon avis')}</button>` : ''}</div>` : ''}
    </li>`;
}

function w12ConsultationsHtml() {
    return `<p class="tn-hint">${W12T('Une consultation, ce n\'est pas un vote : vous donnez votre avis, la ville décide et vous explique ce qu\'elle a retenu.')}</p>
        <ul class="tn-w12-cards">${W12_CONSULTS.map(w12ConsultHtml).join('')}</ul>`;
}

function w12NeedLogin() {
    if (w12Me()) return false;
    announce(t('Connectez-vous pour participer : votre contribution est rattachée à votre compte.'));
    w6Notify(t('Connectez-vous pour participer : votre contribution est rattachée à votre compte.'));
    if (typeof goToSection === 'function') goToSection('espace-citoyen');
    return true;
}

function w12OpenRespond(id) {
    if (w12NeedLogin()) return;
    const consult = W12_CONSULTS.find(c => c.id === id);
    if (!consult || !w12IsOpen(consult)) return;
    const mine = w12MyResponse(id);
    w4OpenDialog(W12T('Donner mon avis'), `
        <form id="w12-respond-form" data-id="${id}" class="space-y-4">
            <p class="tn-hint">${W12T('Ce n\'est pas un vote officiel. Votre avis est rattaché à votre compte, une seule réponse par consultation, modifiable jusqu\'à la clôture.')}</p>
            <fieldset class="tn-w12-fieldset"><legend class="tn-field-label" data-no-i18n>${escapeHtml(t(consult.question))}</legend>
                ${consult.options.map((option, i) => `<label class="tn-w12-radio"><input type="radio" name="choice" value="${escapeHtml(option)}" ${mine ? (mine.choice === option ? 'checked' : '') : (i === 0 ? 'required' : '')} ${i === 0 ? 'data-autofocus' : ''}> <span data-no-i18n>${escapeHtml(t(option))}</span></label>`).join('')}
            </fieldset>
            <div><label class="tn-field-label" for="w12-comment">${W12T('Un mot pour expliquer (facultatif)')}</label>
            <textarea id="w12-comment" name="comment" class="cyber-input" rows="3" maxlength="500">${escapeHtml(mine ? mine.comment || '' : '')}</textarea></div>
            <div class="tn-w12-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W12T('Envoyer mon avis')}</button><button type="button" class="tn-tab" data-dialog-close>${W12T('Annuler')}</button></div>
        </form>`);
}

function w12SubmitRespond(form) {
    const me = w12Me();
    if (!me) return;
    const id = form.dataset.id;
    const consult = W12_CONSULTS.find(c => c.id === id);
    const choice = (form.querySelector('input[name=choice]:checked') || {}).value;
    if (!consult || !choice || !w12IsOpen(consult)) return;
    const comment = form.elements.comment.value.trim().slice(0, 500);
    const all = w12Responses();
    const now = w12Now();
    let entry = all.find(r => r.consult === id && r.owner === me.matricule && r.status !== 'withdrawn');
    if (entry) {
        entry.choice = choice; entry.comment = comment; entry.updatedAt = now;
        entry.history.push({ at: now, status: 'received', note: t('Avis modifié') });
    } else {
        entry = { id: w12Ref('AV'), consult: id, owner: me.matricule, ownerName: me.name, choice, comment, at: now, status: 'received', history: [{ at: now, status: 'received', note: '' }] };
        all.push(entry);
    }
    w12Save(W12_KEYS.resp, all);
    w4CloseDialog();
    w12Render();
    const message = t('Avis enregistré. Référence {id}. Vous pouvez suivre sa prise en compte dans « Mes contributions ».', { id: entry.id });
    announce(message); w6Notify(message);
    w12ScrollTo('w12-' + id);
}

function w12Withdraw(id) {
    const me = w12Me();
    if (!me) return;
    const all = w12Responses();
    const entry = all.find(r => r.consult === id && r.owner === me.matricule && r.status !== 'withdrawn');
    if (!entry) return;
    const now = w12Now();
    entry.status = 'withdrawn';
    entry.history.push({ at: now, status: 'withdrawn', note: '' });
    w12Save(W12_KEYS.resp, all);
    w12Render();
    announce(t('Votre avis est retiré.'));
}

// ------------------------------------------
// F68 — Boîte à idées
// ------------------------------------------
function w12IdeaSupports(idea) { return (idea.base || 0) + idea.supports.length; }

function w12IdeaHtml(idea, mineView) {
    const me = w12Me();
    const info = W12_IDEA_STATE[idea.status];
    const mineIdea = me && idea.owner === me.matricule;
    const supported = me && idea.supports.includes(me.matricule);
    return `<li class="tn-w12-card" id="w12-${idea.id}">
        <div class="tn-w12-card-head"><h4 data-no-i18n>${escapeHtml(idea.title)}</h4>${w12Badge(info)}</div>
        <p data-no-i18n>${escapeHtml(idea.text)}</p>
        <p class="tn-w9-meta" data-no-i18n>${escapeHtml(idea.id)} · ${escapeHtml(t(idea.theme))} · ${escapeHtml(t(idea.zone))} · ${escapeHtml(mineIdea ? t('Vous') : idea.ownerName)} · ${escapeHtml(w12Stamp(idea.at))}</p>
        <p class="tn-w12-meaning">${W12T(info.meaning)}</p>
        ${idea.reply ? `<div class="tn-w12-outcome"><h5>${W12T('Réponse de la ville')}</h5><p data-no-i18n>${escapeHtml(t(idea.reply))}</p></div>` : ''}
        ${(mineView || mineIdea) ? `<p class="tn-w9-meta">${W12T('Où en est votre idée ?')}</p>${w12Steps(idea.history, W12_IDEA_STATE)}` : ''}
        <div class="tn-w12-actions">
            <span class="tn-w12-count" data-no-i18n>${escapeHtml(t('{n} soutien(s)', { n: w12IdeaSupports(idea) }))}</span>
            ${mineIdea ? `<span class="tn-w9-meta">${W12T('Votre idée')}</span>` : `<button type="button" class="tn-tab" data-w12="support" data-id="${idea.id}" aria-pressed="${supported ? 'true' : 'false'}">${W12T(supported ? 'Soutenue ✓ (retirer)' : 'Je soutiens cette idée')}</button>`}
        </div>
    </li>`;
}

function w12IdeasHtml() {
    const ideas = w12Ideas().slice();
    ideas.sort((a, b) => W12_UI.ideaSort === 'recentes' ? String(b.at).localeCompare(String(a.at)) : w12IdeaSupports(b) - w12IdeaSupports(a));
    return `
        <div class="tn-w12-split">
            <form id="w12-idea-form" class="tn-w12-form" novalidate>
                <h4>${W12T('Proposer une idée')}</h4>
                <p class="tn-hint">${W12T('Une idée courte et concrète a plus de chances d\'être étudiée. Vous recevez une référence et vous voyez où elle en est.')}</p>
                <div><label class="tn-field-label" for="w12-i-title">${W12T('Titre de l\'idée')}</label><input id="w12-i-title" name="title" class="cyber-input" maxlength="80" required autocomplete="off"></div>
                <div><label class="tn-field-label" for="w12-i-text">${W12T('Expliquez en quelques phrases')}</label><textarea id="w12-i-text" name="text" class="cyber-input" rows="3" maxlength="400" required></textarea></div>
                <div class="tn-w12-two">
                    <div><label class="tn-field-label" for="w12-i-theme">${W12T('Thème')}</label><select id="w12-i-theme" name="theme" class="cyber-input">${W12_THEMES.map(theme => `<option value="${escapeHtml(theme)}">${W12T(theme)}</option>`).join('')}</select></div>
                    <div><label class="tn-field-label" for="w12-i-zone">${W12T('Secteur')}</label><select id="w12-i-zone" name="zone" class="cyber-input">${['Tous les dômes', 'Dôme Alpha', 'Anneau 2'].map(zone => `<option value="${escapeHtml(zone)}">${W12T(zone)}</option>`).join('')}</select></div>
                </div>
                <p id="w12-i-error" class="tn-w12-error" role="alert" hidden></p>
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W12T('Envoyer mon idée')}</button>
            </form>
            <div>
                <div class="tn-w12-filters"><div><label class="tn-field-label" for="w12-i-sort">${W12T('Trier par')}</label>
                <select id="w12-i-sort" class="cyber-input" data-w12-filter="ideaSort"><option value="soutiens"${W12_UI.ideaSort === 'soutiens' ? ' selected' : ''}>${W12T('Les plus soutenues')}</option><option value="recentes"${W12_UI.ideaSort === 'recentes' ? ' selected' : ''}>${W12T('Les plus récentes')}</option></select></div></div>
                <ul class="tn-w12-cards">${ideas.map(idea => w12IdeaHtml(idea, false)).join('')}</ul>
            </div>
        </div>`;
}

function w12SubmitIdea(form) {
    const me = w12Me();
    const error = document.getElementById('w12-i-error');
    if (!me) { w12NeedLogin(); return; }
    const title = form.elements.title.value.trim();
    const text = form.elements.text.value.trim();
    if (title.length < 5 || text.length < 15) {
        error.hidden = false;
        error.textContent = t('Merci de donner un titre (5 caractères minimum) et une explication (15 caractères minimum).');
        (title.length < 5 ? form.elements.title : form.elements.text).focus();
        return;
    }
    error.hidden = true;
    const now = w12Now();
    const idea = { id: w12Ref('IDE'), title, text, theme: form.elements.theme.value, zone: form.elements.zone.value, owner: me.matricule, ownerName: me.name, at: now, base: 0, supports: [], status: 'received', reply: '', history: [{ at: now, status: 'received', note: '' }] };
    const all = w12Ideas();
    all.unshift(idea);
    w12Save(W12_KEYS.ideas, all);
    W12_UI.tab = 'idees';
    w12Render();
    const message = t('Idée enregistrée. Référence {id}. Vous pouvez suivre son avancement dans « Mes contributions ».', { id: idea.id });
    announce(message); w6Notify(message);
    w12ScrollTo('w12-' + idea.id);
}

function w12ToggleSupport(id) {
    const me = w12Me();
    if (!me) { w12NeedLogin(); return; }
    const all = w12Ideas();
    const idea = all.find(entry => entry.id === id);
    if (!idea || idea.owner === me.matricule) return;
    const i = idea.supports.indexOf(me.matricule);
    if (i >= 0) idea.supports.splice(i, 1); else idea.supports.push(me.matricule);
    w12Save(W12_KEYS.ideas, all);
    w12Render();
    announce(t(i >= 0 ? 'Soutien retiré.' : 'Merci, votre soutien est enregistré.'));
    const button = document.querySelector(`[data-w12=support][data-id="${id}"]`);
    if (button) button.focus();
}

// ------------------------------------------
// Mes contributions
// ------------------------------------------
function w12MineHtml() {
    const me = w12Me();
    if (!me) return `<p class="tn-hint">${W12T('Connectez-vous pour voir vos avis et vos idées.')} <button type="button" class="tn-tab" data-w12="login">${W12T('Se connecter')}</button></p>`;
    const responses = w12Responses().filter(r => r.owner === me.matricule);
    const ideas = w12Ideas().filter(idea => idea.owner === me.matricule);
    const respHtml = responses.length ? responses.map(r => {
        const consult = W12_CONSULTS.find(c => c.id === r.consult);
        const info = W12_RESP_STATE[r.status];
        return `<li class="tn-w12-card"><div class="tn-w12-card-head"><h4 data-no-i18n>${escapeHtml(consult ? t(consult.question) : r.consult)}</h4>${w12Badge(info)}</div>
            <p class="tn-w9-meta" data-no-i18n>${escapeHtml(r.id)} · ${escapeHtml(t(r.choice))}</p><p class="tn-w12-meaning">${W12T(info.meaning)}</p>${w12Steps(r.history, W12_RESP_STATE)}
            ${consult ? `<button type="button" class="tn-tab" data-w12="goto-consult" data-id="${consult.id}">${W12T('Voir la consultation')}</button>` : ''}</li>`;
    }).join('') : `<li class="tn-hint">${W12T('Vous n\'avez pas encore donné d\'avis.')}</li>`;
    const ideaHtml = ideas.length ? ideas.map(idea => w12IdeaHtml(idea, true)).join('') : `<li class="tn-hint">${W12T('Vous n\'avez pas encore proposé d\'idée.')}</li>`;
    return `<h4 class="tn-w12-sub">${W12T('Mes avis')}</h4><ul class="tn-w12-cards">${respHtml}</ul>
        <h4 class="tn-w12-sub">${W12T('Mes idées')}</h4><ul class="tn-w12-cards">${ideaHtml}</ul>`;
}

// ------------------------------------------
// Section
// ------------------------------------------
const W12_TABS = [
    { id: 'projets', label: 'Projets en cours' },
    { id: 'consultations', label: 'Consultations' },
    { id: 'idees', label: 'Boîte à idées' },
    { id: 'mes', label: 'Mes contributions' }
];

function w12Render() {
    const body = document.getElementById('w12-body');
    if (!body) return;
    const focused = document.activeElement && document.activeElement.id;
    const panel = { projets: w12ProjectsHtml, consultations: w12ConsultationsHtml, idees: w12IdeasHtml, mes: w12MineHtml }[W12_UI.tab]();
    body.innerHTML = `
        <ol class="tn-w12-how" aria-label="${W12T('Comment participer')}">
            <li><strong>1</strong> ${W12T('Je lis les projets')}</li>
            <li><strong>2</strong> ${W12T('Je donne mon avis ou mon idée')}</li>
            <li><strong>3</strong> ${W12T('Je vois ce que la ville a retenu')}</li>
        </ol>
        <div class="tn-w12-tabs" role="tablist" aria-label="${W12T('Participation')}">${W12_TABS.map(tab => `<button type="button" role="tab" id="w12-tab-${tab.id}" class="tn-tab" aria-selected="${W12_UI.tab === tab.id ? 'true' : 'false'}" aria-controls="w12-panel" tabindex="${W12_UI.tab === tab.id ? '0' : '-1'}" data-w12="tab" data-tab="${tab.id}">${W12T(tab.label)}${tab.id === 'mes' ? ` <span data-no-i18n>(${w12MineCount()})</span>` : ''}</button>`).join('')}</div>
        <div id="w12-panel" role="tabpanel" aria-labelledby="w12-tab-${W12_UI.tab}">${panel}</div>`;
    if (focused && document.getElementById(focused)) document.getElementById(focused).focus();
    w12RenderAgent();
}

function w12MineCount() {
    const me = w12Me();
    if (!me) return 0;
    return w12Responses().filter(r => r.owner === me.matricule && r.status !== 'withdrawn').length + w12Ideas().filter(i => i.owner === me.matricule).length;
}

function w12ScrollTo(id) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ block: 'center' }); el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
}

function w12InitSection() {
    // La section « Participation » (vague 8) existe déjà : celle-ci vient juste après, avec son propre identifiant
    const anchor = document.getElementById('participation') || document.getElementById('annonces');
    if (!anchor || document.getElementById('projets-ville')) return;
    const section = document.createElement('section');
    section.id = 'projets-ville';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'projets-ville-title');
    section.dataset.crumb = 'Projets et consultations';
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1"><i aria-hidden="true" class="fa-solid fa-comments"></i><span>${W12T('Donner son avis sur la colonie')}</span></div>
            <h2 id="projets-ville-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">${W12T('PROJETS & CONSULTATIONS')}</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">${W12T('Consultez les projets de la ville, répondez aux consultations et proposez vos idées. Chaque contribution reçoit une référence et un suivi.')}</p>
        </div>
        <div class="holo-card p-6 relative" role="region" aria-labelledby="projets-ville-title"><div id="w12-body"></div></div>`;
    anchor.after(section);
    if (typeof TN_SECTIONS !== 'undefined' && !TN_SECTIONS.some(entry => entry.id === 'projets-ville')) {
        const index = TN_SECTIONS.findIndex(entry => entry.id === 'participation' || entry.id === 'annonces');
        TN_SECTIONS.splice(index >= 0 ? index + 1 : TN_SECTIONS.length, 0, { id: 'projets-ville', label: 'Projets et consultations' });
    }
    const navLink = document.querySelector('#site-nav a[href="#participation"]') || document.querySelector('#site-nav a[href="#annonces"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#projets-ville';
        link.className = navLink.className;
        link.innerHTML = `<i aria-hidden="true" class="fa-solid fa-comments text-[11px] text-[#00B8FF]"></i><span>${W12T('PROJETS & IDÉES')}</span>`;
        navLink.after(link);
    }
}

// ------------------------------------------
// Côté agent : examiner les avis, publier la décision, répondre aux idées
// ------------------------------------------
function w12RenderAgent() {
    const host = document.getElementById('agent-workspace-content');
    if (!host) return;
    let card = document.getElementById('w12-agent');
    if (!card) {
        card = document.createElement('div');
        card.id = 'w12-agent';
        card.className = 'holo-card p-6 relative';
        card.setAttribute('role', 'region');
        card.setAttribute('aria-labelledby', 'w12-agent-title');
        host.appendChild(card);
    }
    const ideas = w12Ideas();
    card.innerHTML = `
        <h3 id="w12-agent-title" class="text-sm font-bold font-orbitron text-[#8FE1FF] uppercase tracking-widest mb-1">${W12T('PARTICIPATION DES HABITANTS')}</h3>
        <p class="tn-hint">${W12T('Lisez les avis après la clôture, puis publiez ce que la ville retient : chaque habitant ayant répondu voit alors son avis « pris en compte ». Répondez aussi aux idées.')}</p>
        <h4 class="tn-w12-sub">${W12T('Consultations')}</h4>
        <ul class="tn-w12-cards">${W12_CONSULTS.map(consult => {
            const responses = w12Responses().filter(r => r.consult === consult.id && r.status !== 'withdrawn');
            const outcome = w12Outcome(consult);
            const unread = responses.filter(r => r.status === 'received').length;
            return `<li class="tn-w12-card"><div class="tn-w12-card-head"><h4 data-no-i18n>${escapeHtml(t(consult.question))}</h4>${w12Badge(outcome ? { label: 'Décision publiée', cls: 'resolved' } : w12IsOpen(consult) ? { label: 'Ouverte', cls: 'progress' } : { label: 'Clôturée, décision à venir', cls: 'pending' })}</div>
                ${w12Bars(consult)}
                <p class="tn-w9-meta" data-no-i18n>${escapeHtml(t('{n} avis de cette session, {m} pas encore lu(s)', { n: responses.length, m: unread }))}</p>
                ${responses.filter(r => r.comment).map(r => `<blockquote class="tn-w12-quote" data-no-i18n>« ${escapeHtml(r.comment)} » <span class="tn-w9-meta">${escapeHtml(r.ownerName)} (${escapeHtml(r.owner)}), ${escapeHtml(t(r.choice))}</span></blockquote>`).join('')}
                <div class="tn-w12-actions">
                    ${unread ? `<button type="button" class="tn-tab" data-w12="mark-read" data-id="${consult.id}">${W12T('Marquer tous les avis comme lus')}</button>` : ''}
                    ${outcome ? '' : `<button type="button" class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase" data-w12="publish" data-id="${consult.id}">${W12T('Publier la décision de la ville')}</button>`}
                </div></li>`;
        }).join('')}</ul>
        <h4 class="tn-w12-sub">${W12T('Idées des habitants')}</h4>
        <ul class="tn-w12-cards">${ideas.map(idea => `<li class="tn-w12-card"><div class="tn-w12-card-head"><h4 data-no-i18n>${escapeHtml(idea.title)}</h4>${w12Badge(W12_IDEA_STATE[idea.status])}</div>
            <p class="tn-w9-meta" data-no-i18n>${escapeHtml(idea.id)} · ${escapeHtml(idea.ownerName)} · ${escapeHtml(t('{n} soutien(s)', { n: w12IdeaSupports(idea) }))}</p>
            <div class="tn-w12-actions"><button type="button" class="tn-tab" data-w12="idea-state" data-id="${idea.id}">${W12T('Changer l\'état et répondre')}</button></div></li>`).join('')}</ul>`;
}

function w12MarkRead(consultId) {
    if (!w12Staff()) return;
    const all = w12Responses();
    const now = w12Now();
    let n = 0;
    all.filter(r => r.consult === consultId && r.status === 'received').forEach(r => { r.status = 'read'; r.history.push({ at: now, status: 'read', note: '' }); n += 1; });
    w12Save(W12_KEYS.resp, all);
    if (typeof w4Audit === 'function') w4Audit(`Participation : avis lus (${consultId}, ${n})`, { category: 'participation', target: 'consultation:' + consultId, targetLabel: consultId, before: { avis_non_lus: n }, after: { avis_non_lus: 0 } });
    w12Render();
    announce(t('Avis marqués comme lus.'));
}

function w12OpenPublish(consultId) {
    if (!w12Staff()) return;
    const consult = W12_CONSULTS.find(c => c.id === consultId);
    if (!consult) return;
    w4OpenDialog(W12T('Publier la décision de la ville'), `
        <form id="w12-publish-form" data-id="${consultId}" class="space-y-4">
            <p class="tn-hint" data-no-i18n>${escapeHtml(t(consult.question))}</p>
            <div><label class="tn-field-label" for="w12-p-retained">${W12T('Option retenue')}</label><select id="w12-p-retained" name="retained" class="cyber-input" data-autofocus>${consult.options.map(option => `<option value="${escapeHtml(option)}">${W12T(option)}</option>`).join('')}</select></div>
            <div><label class="tn-field-label" for="w12-p-text">${W12T('Ce que la ville retient et pourquoi (visible par tous)')}</label><textarea id="w12-p-text" name="text" class="cyber-input" rows="4" maxlength="500" required></textarea></div>
            <div class="tn-w12-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W12T('Publier')}</button><button type="button" class="tn-tab" data-dialog-close>${W12T('Annuler')}</button></div>
        </form>`);
}

function w12SubmitPublish(form) {
    if (!w12Staff()) return;
    const id = form.dataset.id;
    const text = form.elements.text.value.trim();
    if (!text) return;
    const now = w12Now();
    const outcomes = w12Outcomes();
    outcomes[id] = { at: now, text, retained: form.elements.retained.value, by: 'Mairie' };
    w12Save(W12_KEYS.out, outcomes);
    const all = w12Responses();
    all.filter(r => r.consult === id && r.status !== 'withdrawn').forEach(r => {
        if (r.status === 'received') r.history.push({ at: now, status: 'read', note: '' });
        r.status = 'considered';
        r.history.push({ at: now, status: 'considered', note: text });
    });
    w12Save(W12_KEYS.resp, all);
    if (typeof w4Audit === 'function') w4Audit(`Participation : décision publiée (${id})`, { category: 'participation', target: 'consultation:' + id, targetLabel: id, before: { decision: '—' }, after: { decision: form.elements.retained.value } });
    w4CloseDialog();
    w12Render();
    announce(t('Décision publiée : les habitants qui ont répondu voient leur avis « pris en compte ».'));
}

function w12OpenIdeaState(ideaId) {
    if (!w12Staff()) return;
    const idea = w12Ideas().find(entry => entry.id === ideaId);
    if (!idea) return;
    w4OpenDialog(W12T('Changer l\'état et répondre'), `
        <form id="w12-idea-state-form" data-id="${ideaId}" class="space-y-4">
            <p class="tn-hint" data-no-i18n>${escapeHtml(idea.title)}</p>
            <div><label class="tn-field-label" for="w12-s-state">${W12T('Nouvel état')}</label><select id="w12-s-state" name="state" class="cyber-input" data-autofocus>${Object.keys(W12_IDEA_STATE).map(key => `<option value="${key}"${idea.status === key ? ' selected' : ''}>${W12T(W12_IDEA_STATE[key].label)}</option>`).join('')}</select></div>
            <div><label class="tn-field-label" for="w12-s-reply">${W12T('Réponse de la ville (obligatoire si retenue ou non retenue)')}</label><textarea id="w12-s-reply" name="reply" class="cyber-input" rows="3" maxlength="400">${escapeHtml(idea.reply || '')}</textarea></div>
            <p id="w12-s-error" class="tn-w12-error" role="alert" hidden></p>
            <div class="tn-w12-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W12T('Enregistrer')}</button><button type="button" class="tn-tab" data-dialog-close>${W12T('Annuler')}</button></div>
        </form>`);
}

function w12SubmitIdeaState(form) {
    if (!w12Staff()) return;
    const all = w12Ideas();
    const idea = all.find(entry => entry.id === form.dataset.id);
    if (!idea) return;
    const state = form.elements.state.value;
    const reply = form.elements.reply.value.trim();
    if ((state === 'retained' || state === 'declined') && !reply) {
        const error = document.getElementById('w12-s-error');
        error.hidden = false; error.textContent = t('Une réponse est obligatoire quand l\'idée est retenue ou non retenue.');
        form.elements.reply.focus();
        return;
    }
    const before = idea.status;
    idea.status = state;
    idea.reply = reply;
    idea.history.push({ at: w12Now(), status: state, note: reply });
    w12Save(W12_KEYS.ideas, all);
    if (typeof w4Audit === 'function') w4Audit(`Participation : idée ${idea.id} → ${W12_IDEA_STATE[state].label}`, { category: 'participation', target: 'idee:' + idea.id, targetLabel: idea.id, before: { etat: W12_IDEA_STATE[before].label }, after: { etat: W12_IDEA_STATE[state].label, reponse: reply } });
    w4CloseDialog();
    w12Render();
    announce(t('État de l\'idée enregistré.'));
}

// ------------------------------------------
// Événements
// ------------------------------------------
document.addEventListener('click', event => {
    const el = event.target.closest('[data-w12]');
    if (!el) return;
    switch (el.dataset.w12) {
        case 'tab': W12_UI.tab = el.dataset.tab; w12Render(); { const tab = document.getElementById('w12-tab-' + W12_UI.tab); if (tab) tab.focus(); } break;
        case 'respond': w12OpenRespond(el.dataset.id); break;
        case 'withdraw': w12Withdraw(el.dataset.id); break;
        case 'support': w12ToggleSupport(el.dataset.id); break;
        case 'login': if (typeof goToSection === 'function') goToSection('espace-citoyen'); break;
        case 'goto-consult': W12_UI.tab = 'consultations'; w12Render(); w12ScrollTo('w12-' + el.dataset.id); break;
        case 'mark-read': w12MarkRead(el.dataset.id); break;
        case 'publish': w12OpenPublish(el.dataset.id); break;
        case 'idea-state': w12OpenIdeaState(el.dataset.id); break;
    }
});

document.addEventListener('change', event => {
    const el = event.target.closest('[data-w12-filter]');
    if (!el) return;
    W12_UI[el.dataset.w12Filter] = el.value;
    w12Render();
    const again = document.getElementById(el.id);
    if (again) again.focus();
});

document.addEventListener('keydown', event => {
    const tab = event.target.closest && event.target.closest('[role=tab][data-w12=tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const ids = W12_TABS.map(item => item.id);
    const next = ids[(ids.indexOf(tab.dataset.tab) + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
    W12_UI.tab = next; w12Render();
    const focus = document.getElementById('w12-tab-' + next); if (focus) focus.focus();
});

document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id === 'w12-respond-form') { event.preventDefault(); w12SubmitRespond(form); }
    else if (form.id === 'w12-idea-form') { event.preventDefault(); w12SubmitIdea(form); }
    else if (form.id === 'w12-publish-form') { event.preventDefault(); w12SubmitPublish(form); }
    else if (form.id === 'w12-idea-state-form') { event.preventDefault(); w12SubmitIdeaState(form); }
});

document.addEventListener('DOMContentLoaded', () => {
    w12InitSection();
    w12Render();

    // La cloche : chaque étape de la prise en compte d'un avis ou d'une idée de l'habitant
    if (typeof tnNotificationItems === 'function') {
        const baseItems = tnNotificationItems;
        tnNotificationItems = function () {
            const items = baseItems.apply(this, arguments);
            const me = w12Me();
            if (!me || (me.profile && me.profile.notify === false)) return items;
            const read = new Set(tnLoad('tn_read_items', []));
            const stamp = value => String(value || '').replace(' ', 'T');
            w12Responses().filter(r => r.owner === me.matricule).forEach(r => r.history.slice(1).forEach((step, index) => {
                const id = `${r.id}-${index + 1}`;
                const info = W12_RESP_STATE[step.status];
                if (!info) return;
                items.push({ id, level: 'info', date: stamp(step.at), userText: true, read: read.has(id), title: t('Avis {id}', { id: r.id }), text: `${t('Nouvel état : {status}', { status: t(info.label) })} ${t(info.meaning)}`, action: `W12_UI.tab='mes'; w12Render(); goToSection('projets-ville'); markNotificationRead('${id}')` });
            }));
            w12Ideas().filter(i => i.owner === me.matricule).forEach(idea => idea.history.slice(1).forEach((step, index) => {
                const id = `${idea.id}-${index + 1}`;
                const info = W12_IDEA_STATE[step.status];
                items.push({ id, level: 'info', date: stamp(step.at), userText: true, read: read.has(id), title: t('Idée {id}', { id: idea.id }), text: `${t('Nouvel état : {status}', { status: t(info.label) })} ${t(info.meaning)}${step.note ? ' ' + step.note : ''}`, action: `W12_UI.tab='mes'; w12Render(); goToSection('projets-ville'); markNotificationRead('${id}')` });
            }));
            return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        };
    }
    if (typeof refreshPersonalisedViews === 'function') {
        const baseRefresh = refreshPersonalisedViews;
        refreshPersonalisedViews = function () { baseRefresh.apply(this, arguments); w12Render(); };
    }
    if (typeof switchRole === 'function') {
        const baseSwitch = switchRole;
        switchRole = function () { const result = baseSwitch.apply(this, arguments); w12Render(); return result; };
    }
    document.addEventListener('tn:langchange', () => w12Render());
    window.addEventListener('storage', event => { if (event.key && event.key.indexOf('tn_w12_') === 0) w12Render(); });
});
