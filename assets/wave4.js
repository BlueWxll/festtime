// ==========================================
// VAGUE 4 — F33 suppression de compte, F34 administration des comptes par les agents,
// F35 aides contextuelles, F36 horaires des transports.
// Chargé après assets/alerts.js ; réutilise registeredCitizens, citizenTickets, activeCitizen,
// currentRole, escapeHtml, announce, t() et les fonctions de rendu d'index.html.
// ==========================================

const W4_STORE = { audit: 'tn_account_audit', tips: 'tn_tips' };

// ------------------------------------------
// Utilitaires
// ------------------------------------------
function w4Staff() {
    return currentRole === 'agent' || currentRole === 'admin';
}

function w4Clock(date = new Date()) {
    return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
}

function w4SaveCitizens() {
    localStorage.setItem('tn_citizens', JSON.stringify(registeredCitizens));
}

function w4SaveTickets() {
    localStorage.setItem('tn_tickets', JSON.stringify(citizenTickets));
}

function w4Account(matricule) {
    return registeredCitizens.find(citizen => citizen.matricule === matricule) || null;
}

// Mêmes règles d'association que tnMyTickets() : le nom ou le matricule figure dans la demande
function w4TicketsOf(citizen) {
    return citizenTickets.filter(ticket => String(ticket.citizenName).includes(citizen.matricule) || String(ticket.citizenName).includes(citizen.name));
}

// Empreinte du code d'accès : le code n'est jamais conservé en clair
async function tnHashCode(code, matricule) {
    const data = `${matricule}|${code}`;
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
        return 'sha256:' + Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
    let hash = 5381;
    for (const char of data) hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
    return 'djb2:' + hash.toString(16);
}

function w4TemporaryCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = new Uint32Array(8);
    (window.crypto || { getRandomValues: array => array.forEach((_, i) => { array[i] = Math.floor(Math.random() * 4294967296); }) }).getRandomValues(values);
    return Array.from(values).map(value => alphabet[value % alphabet.length]).join('');
}

function w4Audit(text) {
    let log = [];
    try { log = JSON.parse(localStorage.getItem(W4_STORE.audit)) || []; } catch (err) { }
    log.unshift({ at: new Date().toISOString(), role: currentRole, text });
    try { localStorage.setItem(W4_STORE.audit, JSON.stringify(log.slice(0, 30))); } catch (err) { }
}

function w4AuditLog() {
    try { return JSON.parse(localStorage.getItem(W4_STORE.audit)) || []; } catch (err) { return []; }
}

// ------------------------------------------
// Fenêtre de dialogue accessible : focus piégé, Échap, retour du focus
// ------------------------------------------
let w4Opener = null;

function w4CloseDialog() {
    const overlay = document.getElementById('tn-dialog');
    if (!overlay) return;
    overlay.remove();
    if (w4Opener && document.contains(w4Opener)) w4Opener.focus();
    w4Opener = null;
}

function w4OpenDialog(title, bodyHtml) {
    w4CloseDialog();
    w4Opener = document.activeElement;

    const overlay = document.createElement('div');
    overlay.id = 'tn-dialog';
    overlay.className = 'tn-dialog-overlay';
    overlay.innerHTML = `
        <div class="tn-dialog" role="dialog" aria-modal="true" aria-labelledby="tn-dialog-title" tabindex="-1">
            <h3 id="tn-dialog-title" class="tn-dialog-title">${title}</h3>
            <div id="tn-dialog-body">${bodyHtml}</div>
        </div>
    `;
    document.body.appendChild(overlay);

    const dialog = overlay.querySelector('.tn-dialog');
    overlay.addEventListener('mousedown', event => { if (event.target === overlay) w4CloseDialog(); });
    overlay.addEventListener('click', event => { if (event.target.closest('[data-dialog-close]')) w4CloseDialog(); });
    overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            w4CloseDialog();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(dialog.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'))
            .filter(el => !el.disabled && el.offsetParent !== null);
        if (!focusable.length) { event.preventDefault(); return; }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    const start = dialog.querySelector('[data-autofocus]') || dialog;
    start.focus();
    return dialog;
}

// ------------------------------------------
// F33 — SUPPRIMER SON COMPTE
// ------------------------------------------
function initAccountDeletion() {
    const logout = document.querySelector('#espace-citoyen button[onclick="logoutCitizen()"]');
    if (!logout) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'delete-account-btn';
    button.className = 'tn-danger-link';
    button.hidden = true;
    button.innerHTML = '<i aria-hidden="true" class="fa-solid fa-user-slash"></i> <span>Supprimer mon compte</span>';
    button.addEventListener('click', openDeleteAccount);
    const reopen = document.getElementById('onboarding-reopen');
    (reopen || logout).after(button);
}

function w4RefreshDeletionButton() {
    const button = document.getElementById('delete-account-btn');
    if (button) button.hidden = !(activeCitizen && w4Account(activeCitizen.matricule));
}

function openDeleteAccount() {
    const account = activeCitizen && w4Account(activeCitizen.matricule);
    if (!account) return;
    const needsCode = Boolean(account.pwdHash);
    const count = w4TicketsOf(account).length;

    const dialog = w4OpenDialog('Supprimer mon compte', `
        <p class="tn-hint">${t('Cette action est définitive. Seront effacés : votre passeport colonial (matricule {matricule}), votre profil et vos demandes ({n}).', { matricule: `<strong>${escapeHtml(account.matricule)}</strong>`, n: count })}</p>
        <form id="delete-account-form" class="tn-dialog-form" autocomplete="off" novalidate>
            <div>
                <label class="tn-field-label" for="del-matricule">Pour confirmer, saisissez votre matricule</label>
                <input id="del-matricule" class="cyber-input" type="text" data-autofocus autocomplete="off" spellcheck="false" aria-describedby="del-error" placeholder="${escapeHtml(account.matricule)}">
            </div>
            ${needsCode ? `
            <div>
                <label class="tn-field-label" for="del-code">Code de sécurité d'accès</label>
                <input id="del-code" class="cyber-input" type="password" autocomplete="current-password" aria-describedby="del-error">
            </div>` : `
            <p class="tn-hint">Ce compte n'a pas de code d'accès enregistré : le matricule suffit.</p>`}
            <p id="del-error" class="tn-form-error" role="alert"></p>
            <div class="tn-dialog-actions">
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close>Annuler</button>
                <button type="submit" id="del-submit" class="tn-btn-danger" disabled>Supprimer définitivement</button>
            </div>
        </form>
    `);

    const form = dialog.querySelector('#delete-account-form');
    const matriculeInput = form.querySelector('#del-matricule');
    const submit = form.querySelector('#del-submit');
    const error = form.querySelector('#del-error');
    matriculeInput.addEventListener('input', () => {
        submit.disabled = matriculeInput.value.trim().toUpperCase() !== account.matricule;
        error.textContent = '';
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (matriculeInput.value.trim().toUpperCase() !== account.matricule) return;
        if (needsCode) {
            const code = form.querySelector('#del-code').value;
            const fresh = w4Account(account.matricule);
            if (!fresh || !code || (await tnHashCode(code, account.matricule)) !== fresh.pwdHash) {
                error.textContent = t("Code de sécurité incorrect. Le compte n'a pas été supprimé.");
                form.querySelector('#del-code').focus();
                return;
            }
        }
        const removedTickets = w4RemoveAccount(account);
        w4Audit(`Compte ${account.matricule} supprimé par son titulaire`);
        const body = document.getElementById('tn-dialog-body');
        body.innerHTML = `
            <p role="status">${t('Votre compte {matricule} a été supprimé, ainsi que {n} demande(s).', { matricule: escapeHtml(account.matricule), n: removedTickets })}</p>
            <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus>Fermer</button></div>
        `;
        body.querySelector('[data-autofocus]').focus();
        announce(t('Compte supprimé.'));
        w4Opener = document.getElementById('citizen-auth-actions') && document.querySelector('#citizen-auth-actions button');
    });
}

// Retire le compte, ses demandes et, s'il est ouvert ici, la session. Renvoie le nombre de demandes effacées.
function w4RemoveAccount(account) {
    const mine = new Set(w4TicketsOf(account).map(ticket => ticket.id));
    citizenTickets = citizenTickets.filter(ticket => !mine.has(ticket.id));
    registeredCitizens = registeredCitizens.filter(citizen => citizen.matricule !== account.matricule);
    w4SaveTickets();
    w4SaveCitizens();

    if (activeCitizen && activeCitizen.matricule === account.matricule) {
        activeCitizen = null;
        localStorage.setItem('tn_active_citizen', 'null');
    }
    w4RefreshAll();
    if (typeof consoleLog === 'function') consoleLog(`[F33] Compte supprimé : ${account.matricule}`);
    return mine.size;
}

function w4RefreshAll() {
    updateCitizenProfileUI();
    if (typeof renderAgentTicketsTable === 'function') renderAgentTicketsTable();
    if (typeof renderWorkload === 'function') renderWorkload();
    w4RenderAccounts();
}

// ------------------------------------------
// F34 — ADMINISTRATION DES COMPTES CITOYENS (agents et administrateurs)
// ------------------------------------------
let w4AccountQuery = '';
let w4AccountState = 'all';

function initAccountAdmin() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace) return;

    const panel = document.createElement('div');
    panel.id = 'account-admin';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = 'Comptes citoyens';
    panel.innerHTML = `
        <div class="tn-eyebrow">Administration des comptes</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">COMPTES CITOYENS</h3>
        <p class="tn-hint">Retrouvez un compte, corrigez son profil, suspendez ou réactivez l'accès, remettez un code d'accès ou supprimez un compte. Chaque action est inscrite au journal.</p>
        <div class="tn-account-tools">
            <div>
                <label class="tn-field-label" for="account-search">Rechercher un compte</label>
                <input id="account-search" type="search" class="cyber-input" autocomplete="off" placeholder="nom, matricule ou dôme">
            </div>
            <div>
                <label class="tn-field-label" for="account-state">État</label>
                <select id="account-state" class="cyber-input">
                    <option value="all">Tous les comptes</option>
                    <option value="active">Actifs</option>
                    <option value="suspended">Suspendus</option>
                </select>
            </div>
        </div>
        <p id="account-count" class="tn-tracker-count" role="status" data-no-i18n></p>
        <div class="overflow-x-auto">
            <table class="w-full text-left text-xs tn-account-table">
                <caption class="sr-only">Comptes citoyens enregistrés</caption>
                <thead>
                    <tr class="border-b border-cyan-900/60 text-[#6F8696] uppercase text-[10px]">
                        <th scope="col" class="py-2.5 px-3">Citoyen</th>
                        <th scope="col" class="py-2.5 px-3">Secteur</th>
                        <th scope="col" class="py-2.5 px-3">Demandes</th>
                        <th scope="col" class="py-2.5 px-3">État</th>
                        <th scope="col" class="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody id="account-tbody" class="divide-y divide-cyan-950/60"></tbody>
            </table>
        </div>
        <div class="tn-kpi-label mt-6">Journal des actions</div>
        <ul id="account-audit" class="tn-audit"></ul>
    `;
    const broadcast = document.getElementById('broadcast-admin');
    if (broadcast) broadcast.after(panel); else workspace.prepend(panel);

    panel.querySelector('#account-search').addEventListener('input', event => { w4AccountQuery = event.target.value; w4RenderAccounts(); });
    panel.querySelector('#account-state').addEventListener('change', event => { w4AccountState = event.target.value; w4RenderAccounts(); });
    panel.querySelector('#account-tbody').addEventListener('click', event => {
        const action = event.target.closest('[data-account-action]');
        if (!action) return;
        w4AccountAction(action.dataset.accountAction, action.dataset.matricule, action);
    });
}

function w4Fold(text) {
    return String(text || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function w4RenderAccounts() {
    const tbody = document.getElementById('account-tbody');
    if (!tbody) return;

    const terms = w4Fold(w4AccountQuery).split(/\s+/).filter(Boolean);
    const list = registeredCitizens.filter(citizen => {
        if (w4AccountState === 'active' && citizen.suspended) return false;
        if (w4AccountState === 'suspended' && !citizen.suspended) return false;
        const haystack = w4Fold(`${citizen.name} ${citizen.matricule} ${citizen.dome} ${citizen.role}`);
        return terms.every(term => haystack.includes(term));
    });

    const count = document.getElementById('account-count');
    if (count) count.textContent = t('{n} compte(s) sur {total}', { n: list.length, total: registeredCitizens.length });

    tbody.innerHTML = list.length ? list.map(citizen => {
        const name = escapeHtml(citizen.name);
        const id = escapeHtml(citizen.matricule);
        const suspended = Boolean(citizen.suspended);
        const label = suffix => `aria-label="${t(suffix)} — ${name}"`;
        return `
            <tr data-account="${id}">
                <td class="py-3 px-3"><div class="text-[#E6F1F7] font-semibold" data-no-i18n>${name}</div><div class="font-mono text-[#00B8FF]" data-no-i18n>${id}</div><div class="text-[#6F8696]" data-no-i18n>${escapeHtml(citizen.role)}</div></td>
                <td class="py-3 px-3 text-[#E6F1F7]" data-no-i18n>${escapeHtml(citizen.dome)}</td>
                <td class="py-3 px-3 text-[#E6F1F7]" data-no-i18n>${w4TicketsOf(citizen).length}</td>
                <td class="py-3 px-3"><span class="tn-badge ${suspended ? 'tn-badge--danger' : 'tn-badge--resolved'}">${suspended ? 'Suspendu' : 'Actif'}</span>${citizen.resetPending ? ' <span class="tn-badge tn-badge--pending">Nouveau code remis</span>' : ''}</td>
                <td class="py-3 px-3 text-right">
                    <div class="tn-row-actions">
                        <button type="button" class="tn-tab" data-account-action="edit" data-matricule="${id}" ${label('Modifier')}>Modifier</button>
                        <button type="button" class="tn-tab" data-account-action="${suspended ? 'reactivate' : 'suspend'}" data-matricule="${id}" ${label(suspended ? 'Réactiver' : 'Suspendre')}>${suspended ? 'Réactiver' : 'Suspendre'}</button>
                        <button type="button" class="tn-tab" data-account-action="reset" data-matricule="${id}" ${label('Nouveau code')}>Nouveau code</button>
                        <button type="button" class="tn-tab tn-tab--danger" data-account-action="delete" data-matricule="${id}" ${label('Supprimer')}>Supprimer</button>
                    </div>
                </td>
            </tr>`;
    }).join('') : `<tr><td colspan="5" class="py-6 px-3 text-[#6F8696]">${t('Aucun compte ne correspond.')}</td></tr>`;

    const audit = document.getElementById('account-audit');
    if (audit) {
        const log = w4AuditLog().slice(0, 6);
        audit.innerHTML = log.length
            ? log.map(entry => `<li><span class="tn-step-date" data-no-i18n>${tnFormatStamp(tnLocalStamp(new Date(entry.at)))}</span> <span data-no-i18n>${escapeHtml(t(entry.text))}</span></li>`).join('')
            : `<li class="tn-hint">${t('Aucune action pour le moment.')}</li>`;
    }
}

function w4AccountAction(action, matricule, trigger) {
    // Seuls les agents et administrateurs administrent les comptes : un citoyen n'atteint jamais ces actions
    if (!w4Staff()) {
        announce(t('Action réservée aux agents et administrateurs.'));
        return;
    }
    const account = w4Account(matricule);
    if (!account) return;

    if (action === 'suspend' || action === 'reactivate') {
        account.suspended = action === 'suspend';
        w4SaveCitizens();
        if (account.suspended && activeCitizen && activeCitizen.matricule === matricule) {
            activeCitizen = null;
            localStorage.setItem('tn_active_citizen', 'null');
        }
        w4Audit(`${account.suspended ? 'Compte suspendu' : 'Compte réactivé'} : ${matricule}`);
        updateCitizenProfileUI();
        w4RenderAccounts();
        announce(t(account.suspended ? 'Compte suspendu.' : 'Compte réactivé.'));
        const again = document.querySelector(`#account-tbody [data-account="${matricule}"] [data-account-action]`);
        if (again) again.focus();
    } else if (action === 'edit') {
        openEditAccount(account);
    } else if (action === 'reset') {
        openResetCode(account);
    } else if (action === 'delete') {
        openDeleteAccountByStaff(account);
    }
}

function w4Options(values, selected) {
    return values.map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('');
}

function openEditAccount(account) {
    const domes = document.getElementById('reg-dome') ? Array.from(document.getElementById('reg-dome').options).map(option => option.value) : [];
    const roles = document.getElementById('reg-role') ? Array.from(document.getElementById('reg-role').options).map(option => option.value) : [];
    if (!domes.includes(account.dome)) domes.push(account.dome);
    if (!roles.includes(account.role)) roles.push(account.role);

    const dialog = w4OpenDialog('Modifier le compte', `
        <p class="tn-hint">${t('Matricule : {matricule} (non modifiable)', { matricule: `<strong>${escapeHtml(account.matricule)}</strong>` })}</p>
        <form id="edit-account-form" class="tn-dialog-form">
            <div><label class="tn-field-label" for="edit-name">Nom et prénom</label><input id="edit-name" class="cyber-input" required data-autofocus value="${escapeHtml(account.name)}"></div>
            <div><label class="tn-field-label" for="edit-role">Spécialisation</label><select id="edit-role" class="cyber-input">${w4Options(roles, account.role)}</select></div>
            <div><label class="tn-field-label" for="edit-dome">Secteur de résidence</label><select id="edit-dome" class="cyber-input">${w4Options(domes, account.dome)}</select></div>
            <div class="tn-dialog-actions">
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close>Annuler</button>
                <button type="submit" class="btn-cyber btn-amber px-4 py-2 text-xs font-bold uppercase">Enregistrer</button>
            </div>
        </form>
    `);
    dialog.querySelector('#edit-account-form').addEventListener('submit', event => {
        event.preventDefault();
        if (!w4Staff()) return;
        const name = dialog.querySelector('#edit-name').value.trim();
        if (!name) return;
        const previous = account.name;
        // Les demandes déjà envoyées restent rattachées au compte : on met aussi à jour leur auteur
        citizenTickets.forEach(ticket => {
            if (String(ticket.citizenName).includes(account.matricule) || ticket.citizenName === previous) {
                ticket.citizenName = ticket.citizenName.split(previous).join(name);
            }
        });
        w4SaveTickets();
        account.name = name;
        account.role = dialog.querySelector('#edit-role').value;
        account.dome = dialog.querySelector('#edit-dome').value;
        w4SaveCitizens();
        if (activeCitizen && activeCitizen.matricule === account.matricule) {
            activeCitizen = Object.assign({}, activeCitizen, { name: account.name, role: account.role, dome: account.dome });
            localStorage.setItem('tn_active_citizen', JSON.stringify(activeCitizen));
        }
        w4Audit(`Profil modifié : ${account.matricule}`);
        w4CloseDialog();
        w4RefreshAll();
        announce(t('Compte modifié.'));
    });
}

function openResetCode(account) {
    const dialog = w4OpenDialog('Remettre un code d\'accès', `
        <p class="tn-hint">${t("Un nouveau code temporaire remplace l'ancien pour {name}. Il n'est affiché qu'une seule fois : transmettez-le à l'habitant.", { name: `<strong>${escapeHtml(account.name)}</strong>` })}</p>
        <div class="tn-dialog-actions">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus>Annuler</button>
            <button type="button" id="reset-confirm" class="btn-cyber btn-amber px-4 py-2 text-xs font-bold uppercase">Générer le code</button>
        </div>
    `);
    dialog.querySelector('#reset-confirm').addEventListener('click', async () => {
        if (!w4Staff()) return;
        const code = w4TemporaryCode();
        account.pwdHash = await tnHashCode(code, account.matricule);
        account.resetPending = true;
        w4SaveCitizens();
        w4Audit(`Code d'accès remis : ${account.matricule}`);
        const body = document.getElementById('tn-dialog-body');
        body.innerHTML = `
            <p class="tn-hint">${t('Code temporaire de {name} :', { name: `<strong>${escapeHtml(account.name)}</strong>` })}</p>
            <p class="tn-confirm-id"><strong data-no-i18n id="reset-code">${code}</strong></p>
            <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus>Fermer</button></div>
        `;
        body.querySelector('[data-autofocus]').focus();
        w4RenderAccounts();
        announce(t('Nouveau code généré.'));
    });
}

function openDeleteAccountByStaff(account) {
    const count = w4TicketsOf(account).length;
    const dialog = w4OpenDialog('Supprimer ce compte ?', `
        <p class="tn-hint">${t('Le compte {who} et ses {n} demande(s) seront effacés définitivement.', { who: `<strong>${escapeHtml(account.name)} (${escapeHtml(account.matricule)})</strong>`, n: count })}</p>
        <div class="tn-dialog-actions">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus>Annuler</button>
            <button type="button" id="staff-delete-confirm" class="tn-btn-danger">Supprimer définitivement</button>
        </div>
    `);
    dialog.querySelector('#staff-delete-confirm').addEventListener('click', () => {
        if (!w4Staff()) return;
        w4RemoveAccount(account);
        w4Audit(`Compte supprimé par un agent : ${account.matricule}`);
        w4CloseDialog();
        w4RenderAccounts();
        announce(t('Compte supprimé.'));
    });
}

// ------------------------------------------
// F36 — HORAIRES ET INFORMATIONS DES TRANSPORTS
// ------------------------------------------
const TN_LINES = [
    { id: 'HT1', name: 'Hyper-Tube Alpha–Bêta', kind: 'Hyper-Tube', stops: ['Dôme Alpha - Anneau 1', 'Dôme Bêta - Anneau 2'], trip: 4, every: 6, first: '05:00', last: '23:30' },
    { id: 'HT2', name: 'Hyper-Tube Bêta–Anneau Zéro', kind: 'Hyper-Tube', stops: ['Dôme Bêta - Anneau 2', 'Anneau Orbital Zéro'], trip: 7, every: 10, first: '05:30', last: '23:00' },
    { id: 'NO', name: 'Navette orbitale Alpha–Anneau Zéro', kind: 'Navette', stops: ['Dôme Alpha - Anneau 1', 'Anneau Orbital Zéro'], trip: 9, every: 15, first: '06:00', last: '22:00' },
    { id: 'NS', name: 'Navette Sud–Bêta', kind: 'Navette', stops: ['Secteur Sud Extérieur', 'Dôme Bêta - Anneau 2'], trip: 12, every: 20, first: '06:00', last: '21:00' }
];

const TN_STATIONS = ['Dôme Alpha - Anneau 1', 'Dôme Bêta - Anneau 2', 'Anneau Orbital Zéro', 'Secteur Sud Extérieur'];
const TN_TRAFFIC_WORDS = /\beaux?\b|inond|transport|hyper-?tube|navette|panne/i;
let w4From = '';
let w4To = '';

function w4Minutes(clock) {
    const [h, m] = clock.split(':').map(Number);
    return h * 60 + m;
}

function w4Format(minutes) {
    const day = Math.floor(minutes / 1440);
    const inDay = ((minutes % 1440) + 1440) % 1440;
    return String(Math.floor(inDay / 60)).padStart(2, '0') + ':' + String(inDay % 60).padStart(2, '0') + (day > 0 ? ' (+1)' : '');
}

// Départs d'une ligne depuis une station : toutes les `every` minutes entre le premier et le dernier départ.
// Le sens retour est décalé de 3 minutes. Les départs de demain complètent la liste en fin de service.
function w4Departures(line, from, afterMinute, count) {
    const reverse = line.stops[0] !== from;
    const offset = reverse ? 3 : 0;
    const first = w4Minutes(line.first) + offset;
    const last = w4Minutes(line.last) + offset;
    const out = [];
    for (let day = 0; day < 2 && out.length < count; day++) {
        for (let minute = first; minute <= last && out.length < count; minute += line.every) {
            const at = minute + day * 1440;
            if (at >= afterMinute) out.push(at);
        }
    }
    return out;
}

function w4LineStatus(line) {
    const items = typeof tnBroadcasts !== 'undefined' ? tnBroadcasts : [];
    const alert = items.find(item => item.level === 'alerte'
        && TN_TRAFFIC_WORDS.test(`${item.title} ${item.body}`)
        && (item.sectors || []).some(sector => line.stops.includes(sector)));
    return alert ? { disrupted: true, text: alert.title } : { disrupted: false, text: '' };
}

function w4LinesBetween(a, b) {
    return TN_LINES.filter(line => line.stops.includes(a) && line.stops.includes(b));
}

// Itinéraire direct, sinon une correspondance (marge de 2 minutes)
function w4Journeys(from, to, nowMinute) {
    const direct = w4LinesBetween(from, to);
    if (direct.length) {
        return direct.flatMap(line => w4Departures(line, from, nowMinute, 3).map(at => ({
            legs: [{ line, from, to, depart: at, arrive: at + line.trip }]
        }))).sort((x, y) => x.legs[0].depart - y.legs[0].depart).slice(0, 3);
    }
    const journeys = [];
    TN_STATIONS.filter(mid => mid !== from && mid !== to).forEach(mid => {
        w4LinesBetween(from, mid).forEach(firstLine => w4LinesBetween(mid, to).forEach(secondLine => {
            w4Departures(firstLine, from, nowMinute, 3).forEach(depart => {
                const arrive = depart + firstLine.trip;
                const next = w4Departures(secondLine, mid, arrive + 2, 1)[0];
                if (next === undefined) return;
                journeys.push({
                    legs: [
                        { line: firstLine, from, to: mid, depart, arrive },
                        { line: secondLine, from: mid, to, depart: next, arrive: next + secondLine.trip }
                    ]
                });
            });
        }));
    });
    return journeys.sort((x, y) => x.legs[0].depart - y.legs[0].depart).slice(0, 3);
}

function initTransports() {
    const services = document.getElementById('services-municipaux');
    if (!services || document.getElementById('transports')) return;

    const section = document.createElement('section');
    section.id = 'transports';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'transports-title');
    section.dataset.crumb = 'Horaires des transports';
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1">
                <i aria-hidden="true" class="fa-solid fa-train-tram"></i>
                <span>Transports & Hyper-Tubes</span>
            </div>
            <h2 id="transports-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">HORAIRES DES TRANSPORTS</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">Choisissez votre départ et votre destination : les prochains passages s'affichent tout de suite, avec l'état du trafic.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-7 holo-card p-6 relative">
                <div class="corner-tr"></div><div class="corner-bl"></div>
                <form id="transit-form" class="tn-transit-form" onsubmit="return false">
                    <div>
                        <label class="tn-field-label" for="transit-from">Départ</label>
                        <select id="transit-from" class="cyber-input"></select>
                    </div>
                    <button type="button" id="transit-swap" class="tn-tab" aria-label="Inverser le départ et la destination" title="Inverser"><i aria-hidden="true" class="fa-solid fa-right-left"></i></button>
                    <div>
                        <label class="tn-field-label" for="transit-to">Destination</label>
                        <select id="transit-to" class="cyber-input"></select>
                    </div>
                </form>
                <p class="tn-tracker-count">Heure de la cité : <span id="transit-clock" data-no-i18n></span></p>
                <div id="transit-results" role="status" aria-live="polite"></div>
            </div>
            <div class="lg:col-span-5 holo-card p-6 relative">
                <div class="corner-tr"></div><div class="corner-bl"></div>
                <h3 class="font-orbitron font-bold text-base text-[#00B8FF] uppercase mb-1">LIGNES ET ÉTAT DU TRAFIC</h3>
                <ul id="transit-lines" class="tn-lines"></ul>
            </div>
        </div>
    `;
    services.after(section);

    // Navigation, fil d'Ariane et recherche connaissent la nouvelle rubrique
    if (!TN_SECTIONS.some(entry => entry.id === 'transports')) {
        TN_SECTIONS.splice(TN_SECTIONS.findIndex(entry => entry.id === 'services-municipaux') + 1, 0, { id: 'transports', label: 'Horaires des transports' });
    }
    const navLink = document.querySelector('#site-nav a[href="#services-municipaux"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#transports';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-train-tram text-[11px] text-[#00B8FF]"></i><span>HORAIRES TRANSPORTS</span>';
        navLink.after(link);
    }

    const options = selected => TN_STATIONS.map(station => `<option value="${escapeHtml(station)}" ${station === selected ? 'selected' : ''}>${escapeHtml(station)}</option>`).join('');
    const mine = typeof tnMySector === 'function' ? tnMySector() : '';
    w4From = TN_STATIONS.includes(mine) ? mine : TN_STATIONS[0];
    w4To = TN_STATIONS.find(station => station !== w4From);
    const fromSelect = section.querySelector('#transit-from');
    const toSelect = section.querySelector('#transit-to');
    fromSelect.innerHTML = options(w4From);
    toSelect.innerHTML = options(w4To);

    fromSelect.addEventListener('change', () => { w4From = fromSelect.value; w4CheckPair('from'); });
    toSelect.addEventListener('change', () => { w4To = toSelect.value; w4CheckPair('to'); });
    section.querySelector('#transit-swap').addEventListener('click', () => {
        [w4From, w4To] = [w4To, w4From];
        fromSelect.value = w4From;
        toSelect.value = w4To;
        w4RenderTransports();
    });

    w4RenderTransports();
    setInterval(w4RenderTransports, 30000);
}

// Départ et destination ne peuvent pas être identiques : l'autre champ change
function w4CheckPair(changed) {
    const fromSelect = document.getElementById('transit-from');
    const toSelect = document.getElementById('transit-to');
    if (w4From === w4To) {
        const other = TN_STATIONS.find(station => station !== (changed === 'from' ? w4From : w4To));
        if (changed === 'from') { w4To = other; toSelect.value = other; } else { w4From = other; fromSelect.value = other; }
    }
    w4RenderTransports();
}

function w4RenderTransports() {
    const results = document.getElementById('transit-results');
    const linesBox = document.getElementById('transit-lines');
    if (!results || !linesBox) return;

    const now = new Date();
    const nowMinute = now.getHours() * 60 + now.getMinutes();
    const clock = document.getElementById('transit-clock');
    if (clock) clock.textContent = w4Clock(now);

    const journeys = w4Journeys(w4From, w4To, nowMinute);
    const statusBadge = line => w4LineStatus(line).disrupted
        ? `<span class="tn-badge tn-badge--pending">${t('Perturbé')}</span>`
        : `<span class="tn-badge tn-badge--resolved">${t('Trafic normal')}</span>`;

    results.innerHTML = journeys.length ? `
        <h3 class="tn-eyebrow mt-4">${t('Prochains départs')}</h3>
        <ul class="tn-journeys">
            ${journeys.map(journey => {
                const first = journey.legs[0];
                const last = journey.legs[journey.legs.length - 1];
                const wait = first.depart - nowMinute;
                const when = wait <= 0 ? t('à quai') : wait >= 1440 ? t('demain') : t('dans {n} min', { n: wait });
                const disrupted = journey.legs.some(leg => w4LineStatus(leg.line).disrupted);
                return `
                <li class="tn-journey">
                    <div class="tn-journey-head">
                        <span class="tn-journey-time" data-no-i18n>${w4Format(first.depart)}</span>
                        <span class="tn-journey-wait">${when}</span>
                        <span class="tn-hint">${t('Arrivée {time}', { time: w4Format(last.arrive) })}</span>
                        ${disrupted ? `<span class="tn-badge tn-badge--pending">${t('Retards possibles')}</span>` : ''}
                    </div>
                    ${journey.legs.map(leg => `<div class="tn-leg"><span class="tn-line-id" data-no-i18n>${leg.line.id}</span> <span>${t(leg.line.name)}</span> <span class="tn-hint" data-no-i18n>${w4Format(leg.depart)} → ${w4Format(leg.arrive)}</span></div>`).join('')}
                    ${journey.legs.length > 1 ? `<div class="tn-hint">${t('Correspondance à {station}', { station: t(first.to) })}</div>` : ''}
                </li>`;
            }).join('')}
        </ul>` : `<p class="tn-empty">${t('Aucun départ prévu pour ce trajet.')}</p>`;

    linesBox.innerHTML = TN_LINES.map(line => {
        const status = w4LineStatus(line);
        return `
        <li class="tn-line">
            <div class="tn-line-head"><span class="tn-line-id" data-no-i18n>${line.id}</span><strong>${t(line.name)}</strong>${statusBadge(line)}</div>
            <div class="tn-hint">${t('Toutes les {n} min', { n: line.every })} · <span data-no-i18n>${line.first}–${line.last}</span></div>
            ${status.disrupted ? `<div class="tn-hint tn-line-alert"><i aria-hidden="true" class="fa-solid fa-triangle-exclamation"></i> <span data-no-i18n>${escapeHtml(t(status.text))}</span></div>` : ''}
        </li>`;
    }).join('');
}

// ------------------------------------------
// F35 — AIDES CONTEXTUELLES
// Une bulle courte apparaît la première fois qu'une rubrique est consultée. Elle ne bloque rien,
// se ferme d'un clic ou d'Échap, et ne revient pas. Le bouton « Aides » la rappelle à la demande.
// ------------------------------------------
const TN_TIPS = [
    { id: 'recherche', target: '#tn-search-toggle', title: 'Retrouvez tout en un geste', text: 'Cliquez sur « Rechercher » ou appuyez sur « / » : services, démarches, annonces et numéros de suivi s\'affichent au fil de la frappe.' },
    { id: 'services', section: 'services-municipaux', title: 'Les services de la cité', text: 'Ouvrez un service pour voir ses démarches. Les plus courantes sont épinglées en tête du catalogue.' },
    { id: 'transports', section: 'transports', title: 'Vos prochains départs', text: 'Choisissez un départ et une destination : les trois prochains passages s\'affichent aussitôt, avec la correspondance si besoin.' },
    { id: 'demarches', section: 'demarches', title: 'Contact ou signalement ?', text: '« Contact » sert à poser une question. « Signalement » sert à signaler un problème (lampadaire, fuite…) : le bon service est désigné automatiquement.' },
    { id: 'espace-citoyen', section: 'espace-citoyen', title: 'Votre espace personnel', text: 'Créez un compte pour obtenir votre matricule. Vous y suivez l\'état de chaque demande et retrouvez tout votre historique.' },
    { id: 'notifications', target: '#tn-bell', title: 'Restez prévenu', text: 'La cloche rassemble les alertes, les annonces et l\'avancement de vos demandes. Le compteur indique ce qui n\'est pas lu.' },
    { id: 'espace-agent', section: 'espace-agent', staff: true, title: 'Espace des agents', text: 'Traitez les demandes, diffusez un message aux habitants et administrez les comptes depuis cette page.' }
];

let w4TipState = { off: false, seen: [] };
let w4TipQueue = [];
let w4TipCurrent = null;
let w4TipTimer = null;

function w4LoadTips() {
    try {
        const saved = JSON.parse(localStorage.getItem(W4_STORE.tips));
        if (saved && Array.isArray(saved.seen)) w4TipState = { off: Boolean(saved.off), seen: saved.seen };
    } catch (err) { }
}

function w4SaveTips() {
    try { localStorage.setItem(W4_STORE.tips, JSON.stringify(w4TipState)); } catch (err) { }
}

function w4ShowTip(tip, force = false) {
    if (!tip || (tip.staff && !w4Staff() && !force)) return;
    if (!force && (w4TipState.off || w4TipState.seen.includes(tip.id))) return;
    if (w4TipCurrent) {
        if (w4TipCurrent.id !== tip.id && !w4TipQueue.some(entry => entry.id === tip.id)) w4TipQueue.push(tip);
        return;
    }
    w4TipCurrent = tip;

    let card = document.getElementById('tn-tip');
    if (!card) {
        card = document.createElement('aside');
        card.id = 'tn-tip';
        card.className = 'tn-tip';
        card.setAttribute('role', 'status');
        card.setAttribute('aria-live', 'polite');
        document.body.appendChild(card);
    }
    card.hidden = false;
    card.innerHTML = `
        <div class="tn-tip-head"><span class="tn-eyebrow">Astuce</span>
            <button type="button" class="tn-tip-x" data-tip="close" aria-label="Fermer l'astuce"><span aria-hidden="true">✕</span></button></div>
        <h3 class="tn-tip-title">${t(tip.title)}</h3>
        <p class="tn-hint">${t(tip.text)}</p>
        <div class="tn-tip-actions">
            <button type="button" class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase" data-tip="ok">Compris</button>
            <button type="button" class="tn-link" data-tip="off">Ne plus afficher les astuces</button>
        </div>
    `;
}

function w4HideTip(markSeen = true) {
    const card = document.getElementById('tn-tip');
    if (card) { card.hidden = true; card.innerHTML = ''; }
    if (w4TipCurrent && markSeen && !w4TipState.seen.includes(w4TipCurrent.id)) {
        w4TipState.seen.push(w4TipCurrent.id);
        w4SaveTips();
    }
    w4TipCurrent = null;
    const next = w4TipQueue.shift();
    if (next) setTimeout(() => w4ShowTip(next), 600);
}

function w4SyncTipButton() {
    const button = document.getElementById('tn-tips-toggle');
    if (button) button.setAttribute('aria-pressed', String(!w4TipState.off));
}

function w4CurrentSectionTip() {
    const probe = window.innerHeight * 0.35;
    const visible = TN_TIPS.find(tip => {
        if (!tip.section) return false;
        const el = document.getElementById(tip.section);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top <= probe && rect.bottom >= probe;
    });
    return visible || TN_TIPS[0];
}

function initTips() {
    w4LoadTips();

    const tools = document.querySelector('.tn-tools');
    if (tools) {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'tn-tips-toggle';
        button.className = 'tn-tool';
        button.setAttribute('aria-pressed', String(!w4TipState.off));
        button.title = 'Astuces';
        button.innerHTML = '<i aria-hidden="true" class="fa-solid fa-lightbulb"></i><span class="tn-tool-label">Astuces</span>';
        button.addEventListener('click', () => {
            if (w4TipState.off) {
                w4TipState = { off: false, seen: [] };
                w4SaveTips();
                w4SyncTipButton();
                announce(t('Astuces activées.'));
                w4ShowTip(w4CurrentSectionTip(), true);
            } else {
                // Réaffiche l'astuce de la rubrique en cours, même déjà lue
                if (w4TipCurrent) w4HideTip(false);
                w4ShowTip(w4CurrentSectionTip(), true);
            }
        });
        tools.appendChild(button);
    }

    document.addEventListener('click', event => {
        const control = event.target.closest('[data-tip]');
        if (!control) return;
        if (control.dataset.tip === 'off') {
            w4TipState.off = true;
            w4TipQueue = [];
            w4SaveTips();
            w4HideTip(false);
            w4SyncTipButton();
            announce(t('Astuces désactivées. Le bouton « Astuces » les réactive.'));
        } else {
            w4HideTip(true);
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && w4TipCurrent && !document.getElementById('tn-dialog')) w4HideTip(true);
    });

    // Une rubrique qui reste à l'écran un instant déclenche son astuce, une seule fois
    if ('IntersectionObserver' in window) {
        const timers = new Map();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const tip = TN_TIPS.find(candidate => candidate.section === entry.target.id);
                if (!tip) return;
                if (entry.isIntersecting) {
                    timers.set(tip.id, setTimeout(() => w4ShowTip(tip), 1500));
                } else {
                    clearTimeout(timers.get(tip.id));
                }
            });
        }, { threshold: 0.35 });
        TN_TIPS.filter(tip => tip.section).forEach(tip => {
            const el = document.getElementById(tip.section);
            if (el) observer.observe(el);
        });
    }

    // Première visite : on présente d'abord la recherche
    w4TipTimer = setTimeout(() => w4ShowTip(TN_TIPS[0]), 2500);
}

// ------------------------------------------
// INITIALISATION
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Les rendus d'index.html et d'alerts.js sont complétés, jamais remplacés
    const baseRefresh = refreshPersonalisedViews;
    refreshPersonalisedViews = function () {
        baseRefresh();
        w4RefreshDeletionButton();
        w4RenderAccounts();
    };
    const baseApply = applyRolePermissions;
    applyRolePermissions = function () {
        baseApply();
        w4RenderAccounts();
        w4RenderTransports();
    };
    const baseSearch = tnSearchItems;
    tnSearchItems = function () {
        return baseSearch().concat([{
            group: 'Services', title: 'Horaires des transports',
            text: 'horaires transport hyper-tube navette départ prochain passage station trajet metro bus ligne trafic',
            action: "goToSection('transports')"
        }]);
    };

    initTransports();
    initAccountDeletion();
    initAccountAdmin();
    initTips();
    w4RefreshDeletionButton();
    w4RenderAccounts();

    document.addEventListener('tn:langchange', () => {
        w4RenderAccounts();
        w4RenderTransports();
        if (w4TipCurrent) { const tip = w4TipCurrent; w4TipCurrent = null; w4ShowTip(tip, true); }
    });
});
