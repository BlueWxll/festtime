// ==========================================
// VAGUE 6 — D13 mots simples (lexique), D20 accessibilité pour tous, F41 navigation au clavier,
// F42 formulaires accessibles, F43 couleurs, F44 agrandissement.
// Chargé après assets/wave5.js ; réutilise t(), announce, escapeHtml, w4OpenDialog/w4CloseDialog,
// goToSection, toggleSearch, toggleNotifications, toggleA11yPanel, changeFontScale, updateA11yUI.
// ==========================================

const W6_KEYS = { cb: 'tn_a11y_cb', read: 'tn_a11y_read', keys: 'tn_a11y_keys' };

function w6Pref(key, fallback) {
    try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch (err) { return fallback; }
}

function w6SetPref(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { }
}

function w6Esc(value) { return escapeHtml(String(value)); }

// ==========================================================
// F43 / D20 — Couleurs adaptées et lecture facilitée
// ==========================================================
function w6SyncA11yButtons() {
    const root = document.documentElement;
    const cb = document.getElementById('a11y-cb-btn');
    const read = document.getElementById('a11y-read-btn');
    if (cb) cb.setAttribute('aria-pressed', String(root.classList.contains('cb')));
    if (read) read.setAttribute('aria-pressed', String(root.classList.contains('tn-easy-read')));
}

function w6ToggleColorBlind() {
    const on = document.documentElement.classList.toggle('cb');
    w6SetPref(W6_KEYS.cb, on ? '1' : '0');
    w6SyncA11yButtons();
    announce(t(on ? 'Couleurs adaptées activées : les états sont aussi indiqués par des symboles.' : 'Couleurs adaptées désactivées.'));
}

function w6ToggleEasyRead() {
    const on = document.documentElement.classList.toggle('tn-easy-read');
    w6SetPref(W6_KEYS.read, on ? '1' : '0');
    w6SyncA11yButtons();
    announce(t(on ? 'Lecture facilitée activée.' : 'Lecture facilitée désactivée.'));
}

function w6ResetA11y() {
    const root = document.documentElement;
    changeFontScale(0);
    root.classList.remove('hc', 'tn-reduce-motion', 'cb', 'tn-easy-read');
    ['tn_a11y_contrast', 'tn_a11y_motion', W6_KEYS.cb, W6_KEYS.read, W6_KEYS.keys].forEach(key => { try { localStorage.removeItem(key); } catch (err) { } });
    updateA11yUI();
    w6SyncShortcutsToggle();
    announce(t('Réglages d\'accessibilité réinitialisés.'));
}

// ==========================================================
// D13 — Lexique : les mots difficiles expliqués simplement
// ==========================================================
// Chaque entrée : id, mots repérés dans la page, titre et explication en langage courant
const W6_LEXICON = [
    { id: 'matricule', terms: ['matricule colonial', 'matricule citoyen', 'matricule', 'passeport colonial'], title: 'Matricule colonial', plain: "Votre numéro personnel d'habitant, de la forme TN-2842-XXXX. Il remplace une carte d'identité : gardez-le pour vous connecter." },
    { id: 'code', terms: ['empreinte cryptographique'], title: 'Empreinte cryptographique', plain: "Votre code secret personnel, celui que vous avez choisi à l'inscription. Ne le donnez à personne." },
    { id: 'dome', terms: ['dôme', 'dômes'], title: 'Dôme', plain: "Le grand bâtiment couvert où vous habitez, comme un quartier fermé et protégé." },
    { id: 'anneau', terms: ['anneau zéro', 'anneaux', 'anneau'], title: 'Anneau', plain: "Un grand cercle de la ville. Il y en a quatre ; l'Anneau Zéro est au centre." },
    { id: 'secteur', terms: ['secteur'], title: 'Secteur', plain: "Une zone de la ville (Nord, Sud…). Elle sert à savoir qui est concerné par une alerte." },
    { id: 'hypertube', terms: ['hyper-tubes', 'hyper-tube', 'hypertube'], title: 'Hyper-Tube', plain: "Le train très rapide de la ville, qui roule dans un tunnel." },
    { id: 'biolink', terms: ['biolinks', 'biolink'], title: 'Biolink', plain: "La puce ou le bracelet de santé qui relie votre dossier médical à la clinique." },
    { id: 'cryo', terms: ['cryo-soins', 'cryo'], title: 'Cryo-soins', plain: "Des soins médicaux par le froid, pour conserver ou réparer le corps." },
    { id: 'plasma', terms: ['réacteur zéro', 'énergie plasma', 'plasma'], title: 'Énergie plasma', plain: "L'électricité de la ville. Le Réacteur Zéro est la grande centrale qui la produit." },
    { id: 'quota', terms: ['quota énergétique', 'quotas', 'quota'], title: 'Quota', plain: "La quantité d'électricité que vous avez le droit d'utiliser." },
    { id: 'biosphere', terms: ['biosphère'], title: 'Biosphère', plain: "L'air, l'eau et les plantes qui rendent la vie possible sous les dômes." },
    { id: 'sentinelles', terms: ['sentinelles', 'sentinelle'], title: 'Sentinelles', plain: "Les agents et les drones de sécurité qui surveillent la ville." },
    { id: 'conseil', terms: ['haut conseil'], title: 'Haut Conseil', plain: "Le groupe de personnes qui dirige la colonie, comme un gouvernement." },
    { id: 'decret', terms: ['décrets', 'décret'], title: 'Décret', plain: "Une règle officielle publiée par le Haut Conseil." },
    { id: 'doleance', terms: ['doléances', 'doléance'], title: 'Doléance', plain: "Une plainte ou une réclamation que vous adressez à la mairie." },
    { id: 'aethel', terms: ['aethel-os', 'aethel'], title: 'Aethel-OS', plain: "Le système informatique de la ville. C'est lui qui fait fonctionner ce site." },
    { id: 'bouclier', terms: ['boucliers', 'bouclier'], title: 'Bouclier', plain: "La protection invisible qui défend la colonie contre les tempêtes et les météorites." },
    { id: 'ionique', terms: ['orage ionique'], title: 'Orage ionique', plain: "Une tempête électrique venue de l'espace, qui peut gêner l'électricité et les écrans." },
    { id: 'role', terms: ['rbac', 'contrôle d\'accès'], title: 'Contrôle d\'accès (RBAC)', plain: "Chaque personne a un rôle (citoyen, agent ou administrateur). Le rôle décide de ce que l'on peut voir et faire." },
    { id: 'ticket', terms: ['ticket'], title: 'Ticket', plain: "Le numéro de suivi de votre demande (par exemple TK-TN-1234). Gardez-le pour savoir où elle en est." },
    { id: 'polling', terms: ['polling'], title: 'Polling', plain: "La page se met à jour toute seule, toutes les 30 secondes, pour afficher les nouveautés." },
    { id: 'backoffice', terms: ['backoffice', 'back-office'], title: 'Backoffice', plain: "L'espace de travail des agents, que les habitants ne voient pas." },
    { id: 'accuse', terms: ['accusé de réception'], title: 'Accusé de réception', plain: "Un message qui prouve que votre demande a bien été reçue." },
    { id: 'doublon', terms: ['doublon'], title: 'Doublon', plain: "Une demande envoyée deux fois, par erreur." },
    { id: 'demarche', terms: ['démarches', 'démarche'], title: 'Démarche', plain: "Une action administrative que vous faites : une demande, une déclaration, un rendez-vous…" },
    { id: 'etatcivil', terms: ['état civil'], title: 'État civil', plain: "Les actes officiels de la vie : naissance, union, décès." },
    { id: 'exoplanete', terms: ['exoplanétaire', 'exoplanète'], title: 'Exoplanète', plain: "Une planète qui tourne autour d'une autre étoile que notre Soleil." },
    { id: 'megapole', terms: ['mégapole'], title: 'Mégapole', plain: "Une très très grande ville." },
    { id: 'creneau', terms: ['créneaux', 'créneau'], title: 'Créneau', plain: "Une plage d'horaire réservée pour votre rendez-vous (par exemple de 10:00 à 10:30)." },
    { id: 'heurecite', terms: ['heure de la cité'], title: 'Heure de la cité', plain: "L'heure officielle de la colonie. Elle s'écrit sur 24 heures : 14:30 veut dire 2 heures et demie de l'après-midi." },
    { id: 'vague', terms: ['vague initiale', 'vagues'], title: 'Vague', plain: "Un groupe de demandes qui arrive en même temps." },
    { id: 'charge', terms: ['charge de travail'], title: 'Charge de travail', plain: "Le nombre de demandes que les agents ont à traiter." },
    { id: 'telemetrie', terms: ['télémétrique', 'télémétrie'], title: 'Télémétrie', plain: "Les mesures envoyées en direct par les capteurs de la ville (air, énergie, boucliers…)." }
];

const W6_GLOSS_SELECTOR = 'h2, h3, h4, legend, th, summary, .tn-eyebrow, dt';
let w6TermIndex = null;

function w6Terms() {
    if (w6TermIndex) return w6TermIndex;
    const list = [];
    W6_LEXICON.forEach(entry => entry.terms.forEach(term => list.push({ entry, term, source: term.toLowerCase() })));
    list.sort((a, b) => b.source.length - a.source.length);
    w6TermIndex = list.map(item => {
        const escaped = item.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return { entry: item.entry, source: item.source, regex: new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'iu') };
    });
    return w6TermIndex;
}

let w6TitleIndex = null;

function w6Find(text) {
    const lower = String(text || '').toLowerCase();
    const hit = w6Terms().find(item => item.regex.test(lower));
    if (hit) return hit.entry;
    // Dans une autre langue, le titre traduit du mot sert aussi de repère
    if (typeof tnLang !== 'undefined' && tnLang !== 'fr') {
        if (!w6TitleIndex) {
            w6TitleIndex = W6_LEXICON.map(entry => {
                const title = t(entry.title).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return { entry, regex: new RegExp(`(?<![\\p{L}\\p{N}])${title}(?![\\p{L}\\p{N}])`, 'iu') };
            });
        }
        const found = w6TitleIndex.find(item => item.regex.test(lower));
        if (found) return found.entry;
    }
    return null;
}

function w6OpenTerm(id) {
    const entry = W6_LEXICON.find(item => item.id === id);
    if (!entry) return;
    w4OpenDialog(t('Que veut dire « {mot} » ?', { mot: t(entry.title) }), `
        <p class="tn-gloss-plain" data-no-i18n>${w6Esc(t(entry.plain))}</p>
        <div class="tn-dialog-actions">
            <button type="button" class="tn-tab" data-no-i18n onclick="w6OpenLexicon()">${w6Esc(t('Voir tous les mots'))}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus data-no-i18n>${w6Esc(t('Compris'))}</button>
        </div>
    `);
}

function w6OpenLexicon() {
    const rows = filter => W6_LEXICON
        .filter(entry => !filter || `${t(entry.title)} ${t(entry.plain)}`.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => t(a.title).localeCompare(t(b.title), tnLang || 'fr'))
        .map(entry => `<div class="tn-lex-item"><dt data-no-i18n>${w6Esc(t(entry.title))}</dt><dd data-no-i18n>${w6Esc(t(entry.plain))}</dd></div>`).join('');
    w4OpenDialog(t('Lexique : les mots simples'), `
        <label class="tn-field-label" for="lex-filter">${w6Esc(t('Chercher un mot'))}</label>
        <input id="lex-filter" type="search" class="cyber-input" autocomplete="off" data-autofocus data-no-i18n placeholder="${w6Esc(t('ex : dôme, matricule, quota'))}">
        <p id="lex-count" class="tn-tracker-count" role="status" data-no-i18n></p>
        <dl id="lex-list" class="tn-lex">${rows('')}</dl>
        <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-no-i18n>${w6Esc(t('Fermer'))}</button></div>
    `);
    const input = document.getElementById('lex-filter');
    const list = document.getElementById('lex-list');
    const count = document.getElementById('lex-count');
    const refresh = () => {
        list.innerHTML = rows(input.value.trim());
        const n = list.querySelectorAll('.tn-lex-item').length;
        count.textContent = n ? t('{n} mot(s)', { n }) : t('Aucun mot trouvé.');
    };
    input.addEventListener('input', refresh);
    refresh();
}

// Un bouton « ? » est ajouté après les titres qui contiennent un mot difficile ; le texte d'origine n'est pas modifié
let w6GlossBusy = false;

function w6ScanGlossary() {
    if (w6GlossBusy) return;
    w6GlossBusy = true;
    try {
        document.querySelectorAll('.tn-gloss').forEach(button => button.remove());
        let added = 0;
        document.querySelectorAll(W6_GLOSS_SELECTOR).forEach(element => {
            if (added >= 40 || element.closest('.tn-dialog, #tn-notif-panel, #tn-search-panel, #a11y-panel')) return;
            if (!element.offsetParent && getComputedStyle(element).position !== 'fixed') return;
            const own = Array.from(element.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join(' ') || element.textContent;
            if (own.length > 90) return;
            const entry = w6Find(own);
            if (!entry) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tn-gloss';
            button.dataset.term = entry.id;
            button.setAttribute('data-no-i18n', '');
            button.setAttribute('aria-label', t('Que veut dire « {mot} » ?', { mot: t(entry.title) }));
            button.title = t('Que veut dire « {mot} » ?', { mot: t(entry.title) });
            button.innerHTML = '<span aria-hidden="true">?</span>';
            button.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); w6OpenTerm(entry.id); });
            element.appendChild(button);
            added += 1;
        });
    } finally {
        setTimeout(() => { w6GlossBusy = false; }, 0);
    }
}

let w6ScanTimer = null;
function w6ScheduleScan() {
    if (w6ScanTimer) return;
    w6ScanTimer = setTimeout(() => { w6ScanTimer = null; w6ScanGlossary(); w6FixClickables(); w6EnhanceForms(); }, 1500);
}

// Sélectionner un mot dans la page suffit pour proposer son explication
function initSelectionHelper() {
    let chip = null;
    const hide = () => { if (chip) { chip.remove(); chip = null; } };
    const show = () => {
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        hide();
        if (!text || text.length < 3 || text.length > 40 || selection.rangeCount === 0) return;
        const anchor = selection.anchorNode && (selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement);
        if (anchor && anchor.closest('input, textarea, .tn-dialog, #tn-dialog')) return;
        const entry = w6Find(text);
        if (!entry) return;
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'tn-gloss-chip';
        chip.setAttribute('data-no-i18n', '');
        chip.textContent = t('Que veut dire ce mot ?');
        chip.style.left = `${Math.max(8, Math.min(window.innerWidth - 200, rect.left + window.scrollX))}px`;
        chip.style.top = `${rect.bottom + window.scrollY + 6}px`;
        chip.addEventListener('mousedown', event => event.preventDefault());
        chip.addEventListener('click', () => { hide(); w6OpenTerm(entry.id); });
        document.body.appendChild(chip);
    };
    document.addEventListener('mouseup', () => setTimeout(show, 10));
    document.addEventListener('keyup', event => { if (event.shiftKey) setTimeout(show, 10); });
    document.addEventListener('scroll', hide, { passive: true });
    document.addEventListener('mousedown', event => { if (!event.target.closest || !event.target.closest('.tn-gloss-chip')) hide(); });
}

// Quelques intitulés très techniques sont remplacés par des mots courants
function w6PlainLabels() {
    const swap = (selector, from, to) => {
        document.querySelectorAll(selector).forEach(node => {
            Array.from(node.childNodes).forEach(child => {
                if (child.nodeType === 3 && child.textContent.trim() === from) child.textContent = child.textContent.replace(from, to);
            });
        });
    };
    swap('label[for="login-pwd"]', 'Empreinte Cryptographique / Code', 'Code secret personnel');
    swap('label[for="contact-service"]', 'Service Municipal Destinataire', 'Service qui recevra votre demande');
}

// ==========================================================
// F41 — Navigation au clavier
// ==========================================================
// Tout élément cliquable à la souris devient atteignable (Tab) et activable (Entrée, Espace)
function w6FixClickables() {
    document.querySelectorAll('[onclick]').forEach(element => {
        if (['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(element.tagName)) return;
        if (element.hasAttribute('data-w6-kb')) return;
        element.setAttribute('data-w6-kb', '');
        if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '0');
        if (!element.getAttribute('role')) element.setAttribute('role', 'button');
        element.classList.add('tn-kb-target');
        element.addEventListener('keydown', event => {
            if (event.target !== element) return;
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); element.click(); }
        });
    });
}

function w6AddSkipLinks() {
    const first = document.querySelector('.skip-link');
    if (!first || document.getElementById('skip-nav')) return;
    const nav = document.getElementById('site-nav');
    if (nav && !nav.hasAttribute('tabindex')) nav.setAttribute('tabindex', '-1');
    const link = document.createElement('a');
    link.id = 'skip-nav';
    link.href = '#site-nav';
    link.className = first.className;
    link.textContent = 'Aller à la navigation';
    link.addEventListener('click', event => { event.preventDefault(); if (nav) { nav.scrollIntoView(); nav.focus(); } });
    first.after(link);
}

const W6_GO = { h: 'accueil', s: 'services-municipaux', d: 'demarches', r: 'rendez-vous', t: 'transports', c: 'espace-citoyen', a: 'annonces' };
let w6GoPending = false;
let w6GoTimer = null;

function w6ShortcutsOn() { return w6Pref(W6_KEYS.keys, '1') !== '0'; }

function w6SyncShortcutsToggle() {
    const box = document.getElementById('w6-keys-toggle');
    if (box) box.checked = w6ShortcutsOn();
}

function w6OpenShortcuts() {
    const rows = [
        ['?', 'Afficher cette aide'], ['/', 'Rechercher'], ['n', 'Notifications'], ['a', "Réglages d'accessibilité"], ['l', 'Lexique : les mots simples'], ['u', 'Urgences et hôpitaux'],
        ['g puis h', "Aller à l'accueil"], ['g puis s', 'Aller aux services municipaux'], ['g puis d', 'Aller aux démarches'],
        ['g puis r', 'Aller aux rendez-vous'], ['g puis t', 'Aller aux transports'], ['g puis c', "Aller à l'espace citoyen"], ['g puis a', 'Aller aux actualités'],
        ['Tab / Maj+Tab', 'Passer à l’élément suivant / précédent'], ['Entrée ou Espace', 'Activer le bouton ou le lien'], ['Échap', 'Fermer la fenêtre ou le panneau ouvert']
    ];
    w4OpenDialog(t('Raccourcis clavier'), `
        <dl class="tn-keys" data-no-i18n>${rows.map(row => `<div><dt><kbd>${w6Esc(row[0])}</kbd></dt><dd>${w6Esc(t(row[1]))}</dd></div>`).join('')}</dl>
        <label class="tn-check"><input type="checkbox" id="w6-keys-toggle" ${w6ShortcutsOn() ? 'checked' : ''}> <span data-no-i18n>${w6Esc(t('Activer les raccourcis à une touche'))}</span></label>
        <p class="tn-hint" data-no-i18n>${w6Esc(t('Désactivez-les si vous utilisez une commande vocale ou si une touche se déclenche par erreur. Tab, Entrée et Échap fonctionnent toujours.'))}</p>
        <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus data-no-i18n>${w6Esc(t('Fermer'))}</button></div>
    `);
    document.getElementById('w6-keys-toggle').addEventListener('change', event => {
        w6SetPref(W6_KEYS.keys, event.target.checked ? '1' : '0');
        announce(t(event.target.checked ? 'Raccourcis à une touche activés.' : 'Raccourcis à une touche désactivés.'));
    });
}

function initShortcuts() {
    document.addEventListener('keydown', event => {
        if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
        if (!w6ShortcutsOn()) return;
        const target = event.target;
        if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
        const dialogOpen = document.getElementById('tn-dialog') || (typeof openModalElement === 'function' && openModalElement());
        if (dialogOpen) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

        if (w6GoPending) {
            w6GoPending = false;
            clearTimeout(w6GoTimer);
            if (W6_GO[key]) { event.preventDefault(); goToSection(W6_GO[key]); return; }
        }
        if (key === 'g') { w6GoPending = true; w6GoTimer = setTimeout(() => { w6GoPending = false; }, 1500); return; }
        if (event.key === '?') { event.preventDefault(); w6OpenShortcuts(); }
        else if (key === '/') { event.preventDefault(); if (typeof toggleSearch === 'function') toggleSearch(); }
        else if (key === 'n') { event.preventDefault(); if (typeof toggleNotifications === 'function') toggleNotifications(); }
        else if (key === 'a') { event.preventDefault(); toggleA11yPanel(true); }
        else if (key === 'l') { event.preventDefault(); w6OpenLexicon(); }
        else if (key === 'u') { event.preventDefault(); if (typeof w7OpenEmergency === 'function') w7OpenEmergency(); }
    });
}

// ==========================================================
// F42 — Formulaires accessibles
// ==========================================================
const W6_AUTOCOMPLETE = {
    'contact-name': 'name', 'reg-name': 'name', 'login-matricule': 'username', 'login-pwd': 'current-password', 'reg-pwd': 'new-password',
    'appt-name': 'name', 'contact-subject': 'off', 'report-place': 'off', 'bc-title': 'off', 'svc-reason': 'off', 'svc-todo': 'off', 'cmd-input': 'off'
};

function w6LabelOf(control) {
    let label = control.id ? document.querySelector(`label[for="${control.id}"]`) : null;
    if (!label) label = control.closest('label');
    const text = label ? Array.from(label.childNodes).filter(node => node.nodeType === 3 || (node.nodeType === 1 && !node.matches('.tn-req, .tn-gloss, input, select, textarea'))).map(node => node.textContent).join(' ') : control.getAttribute('aria-label') || control.name || '';
    return text.replace(/\s+/g, ' ').trim();
}

function w6ErrorId(control) { return `${control.id}-w6err`; }

function w6Message(control) {
    const v = control.validity;
    if (v.valueMissing) return control.type === 'checkbox' ? t('Cochez cette case pour continuer.') : t('Ce champ est obligatoire.');
    if (v.typeMismatch) return control.type === 'email' ? t('Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.') : t('La valeur saisie n\'est pas valide.');
    if (v.tooShort) return t('Saisissez au moins {n} caractères (vous en avez saisi {m}).', { n: control.minLength, m: control.value.length });
    if (v.patternMismatch) return control.title ? control.title : t('Le format attendu n\'est pas respecté.');
    if (v.rangeUnderflow || v.rangeOverflow) return t('La valeur est hors des limites autorisées.');
    return t('Ce champ doit être corrigé.');
}

function w6ClearError(control) {
    control.removeAttribute('aria-invalid');
    const error = document.getElementById(w6ErrorId(control));
    if (error) error.remove();
    const described = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== w6ErrorId(control));
    if (described.length) control.setAttribute('aria-describedby', described.join(' ')); else control.removeAttribute('aria-describedby');
    control.classList.remove('tn-invalid');
}

function w6ShowError(control, message) {
    w6ClearError(control);
    const error = document.createElement('p');
    error.id = w6ErrorId(control);
    error.className = 'tn-field-error';
    error.setAttribute('data-no-i18n', '');
    error.innerHTML = `<span aria-hidden="true">✖</span> <span>${w6Esc(message)}</span>`;
    control.after(error);
    control.setAttribute('aria-invalid', 'true');
    control.setAttribute('aria-describedby', ((control.getAttribute('aria-describedby') || '') + ' ' + error.id).trim());
    control.classList.add('tn-invalid');
}

function w6Controls(form) {
    return Array.from(form.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea'))
        .filter(control => !control.disabled && control.offsetParent !== null);
}

function w6ValidateForm(form) {
    const invalid = [];
    w6Controls(form).forEach(control => {
        w6ClearError(control);
        const value = control.value;
        // Un champ vide ne compte pas s'il n'est composé que d'espaces
        if (control.required && control.type !== 'checkbox' && control.type !== 'radio' && !String(value).trim()) {
            invalid.push({ control, message: w6Message({ validity: { valueMissing: true }, type: control.type }) });
        } else if (!control.checkValidity()) {
            invalid.push({ control, message: w6Message(control) });
        }
    });
    const old = form.querySelector('.tn-error-summary');
    if (old) old.remove();
    if (!invalid.length) return true;

    invalid.forEach(item => w6ShowError(item.control, item.message));
    const summary = document.createElement('div');
    summary.className = 'tn-error-summary';
    summary.setAttribute('role', 'alert');
    summary.setAttribute('data-no-i18n', '');
    summary.innerHTML = `
        <p class="tn-error-title"><span aria-hidden="true">✖</span> ${w6Esc(t('{n} champ(s) à corriger :', { n: invalid.length }))}</p>
        <ul>${invalid.map((item, index) => `<li><a href="#${w6Esc(item.control.id)}" data-w6-field="${index}">${w6Esc(w6LabelOf(item.control) || item.control.id)} — ${w6Esc(item.message)}</a></li>`).join('')}</ul>`;
    summary.addEventListener('click', event => {
        const link = event.target.closest('[data-w6-field]');
        if (!link) return;
        event.preventDefault();
        invalid[Number(link.dataset.w6Field)].control.focus();
    });
    form.insertBefore(summary, form.firstChild);
    invalid[0].control.focus();
    announce(t('{n} champ(s) à corriger. {first}', { n: invalid.length, first: invalid[0].message }));
    return false;
}

function w6EnhanceForms() {
    document.querySelectorAll('form').forEach(form => {
        const selfHandled = /return false/.test(form.getAttribute('onsubmit') || '');
        const controls = Array.from(form.querySelectorAll('input:not([type=hidden]), select, textarea'));
        let hasRequired = false;

        controls.forEach(control => {
            if (control.required) {
                hasRequired = true;
                control.setAttribute('aria-required', 'true');
                const label = control.id ? document.querySelector(`label[for="${control.id}"]`) : null;
                if (label && !label.querySelector('.tn-req')) {
                    const mark = document.createElement('span');
                    mark.className = 'tn-req';
                    mark.setAttribute('aria-hidden', 'true');
                    mark.setAttribute('data-no-i18n', '');
                    mark.textContent = ' *';
                    label.appendChild(mark);
                }
            }
            if (!control.autocomplete && W6_AUTOCOMPLETE[control.id]) control.autocomplete = W6_AUTOCOMPLETE[control.id];
            if (!control.hasAttribute('data-w6-live')) {
                control.setAttribute('data-w6-live', '');
                const clear = () => { if (control.getAttribute('aria-invalid') === 'true') { w6ClearError(control); const summary = form.querySelector('.tn-error-summary'); if (summary && !form.querySelector('[aria-invalid="true"]')) summary.remove(); } };
                control.addEventListener('input', clear);
                control.addEventListener('change', clear);
            }
        });

        if (form.hasAttribute('data-w6-form')) return;
        form.setAttribute('data-w6-form', '');
        if (hasRequired && !form.querySelector('.tn-req-note') && !selfHandled) {
            const note = document.createElement('p');
            note.className = 'tn-hint tn-req-note';
            note.textContent = 'Les champs marqués * sont obligatoires.';
            form.insertBefore(note, form.firstChild);
        }
        if (selfHandled) return;

        // Les messages du navigateur (bulles, non lues par tous les lecteurs d'écran) sont remplacés par des messages écrits dans la page
        form.noValidate = true;
        form.addEventListener('submit', event => {
            if (!w6ValidateForm(form)) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);
    });
}

// Les messages bloquants (alert) deviennent des messages dans la page, lus par les lecteurs d'écran, sans bloquer la navigation
function w6Notify(message) {
    const text = String(message || '').trim();
    if (!text) return;
    let box = document.getElementById('tn-toasts');
    if (!box) { box = document.createElement('div'); box.id = 'tn-toasts'; document.body.appendChild(box); }
    const toast = document.createElement('div');
    toast.className = 'tn-toast tn-alert--info tn-notice';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="tn-alert-tags"><span class="tn-badge tn-badge--progress">${w6Esc(t('Message'))}</span></div>
        ${text.split('\n').filter(Boolean).map(line => `<p class="tn-toast-title" data-no-i18n>${w6Esc(line)}</p>`).join('')}
        <div class="tn-alert-actions"><button type="button" class="tn-link" data-action="close">${w6Esc(t('Fermer'))}</button></div>`;
    toast.querySelector('[data-action="close"]').addEventListener('click', () => toast.remove());
    box.appendChild(toast);
    if (/connexion réussie|login successful|conexión correcta/i.test(text)) setTimeout(() => toast.remove(), 8000);
}

// ==========================================================
// D20 — Déclaration d'accessibilité et signalement
// ==========================================================
function w6OpenStatement() {
    const items = [
        ['Clavier', "Toute la plateforme se parcourt au clavier. Liens d'évitement, raccourcis à une touche (désactivables), fenêtres qui retiennent et rendent le focus."],
        ['Lecteur d\'écran', 'Repères de page, champs reliés à leur libellé, erreurs lues à voix haute, états des boutons annoncés, images décoratives masquées.'],
        ['Vue', 'Texte agrandissable jusqu\'à 200 %, contraste renforcé, couleurs adaptées au daltonisme (les états ont aussi un symbole et un texte), lecture facilitée.'],
        ['Mouvement et concentration', 'Animations réductibles, aucun délai imposé, aucune action qui dépend d\'un geste précis ou d\'un glisser-déposer.'],
        ['Comprendre', 'Lexique des mots difficiles, bouton « ? » à côté des titres techniques, explication en sélectionnant un mot, langues : français, anglais, espagnol.'],
        ['Un seul parcours', 'Les habitants qui utilisent ces aides ont accès exactement aux mêmes fonctions que les autres : il n\'existe pas de version réduite.']
    ];
    w4OpenDialog(t("Déclaration d'accessibilité"), `
        <p class="tn-hint" data-no-i18n>${w6Esc(t("La plateforme Terra Nova est conçue pour être utilisable par tous les habitants, quelle que soit leur situation."))}</p>
        <dl class="tn-lex" data-no-i18n>${items.map(item => `<div class="tn-lex-item"><dt>${w6Esc(t(item[0]))}</dt><dd>${w6Esc(t(item[1]))}</dd></div>`).join('')}</dl>
        <p class="tn-hint" data-no-i18n>${w6Esc(t("Un obstacle rencontré ? Dites-le-nous : un agent vous répond et propose une solution."))}</p>
        <div class="tn-dialog-actions">
            <button type="button" class="tn-tab" id="w6-report-a11y" data-no-i18n>${w6Esc(t('Signaler un problème d\'accessibilité'))}</button>
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus data-no-i18n>${w6Esc(t('Fermer'))}</button>
        </div>
    `);
    document.getElementById('w6-report-a11y').addEventListener('click', () => {
        w4CloseDialog();
        const subject = document.getElementById('contact-subject');
        if (subject && !subject.value) subject.value = t("Problème d'accessibilité");
        goToSection('demarches');
        setTimeout(() => { if (subject) subject.focus(); }, 400);
    });
}

function initA11yFooter() {
    const footer = document.querySelector('footer .flex.space-x-6, footer div:last-child');
    if (!footer || document.getElementById('footer-a11y')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'footer-a11y';
    button.className = 'hover:text-[#00B8FF] transition';
    button.textContent = 'ACCESSIBILITÉ';
    button.addEventListener('click', w6OpenStatement);
    footer.appendChild(button);
}

function initLexiconTool() {
    const tools = document.querySelector('.tn-tools');
    if (!tools || document.getElementById('tn-lex-toggle')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'tn-lex-toggle';
    button.className = 'tn-tool';
    button.title = 'Lexique';
    button.innerHTML = '<i aria-hidden="true" class="fa-solid fa-book-open"></i><span class="tn-tool-label">Lexique</span>';
    button.addEventListener('click', w6OpenLexicon);
    tools.appendChild(button);
}

// ==========================================================
// Démarrage
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const baseUpdate = updateA11yUI;
    updateA11yUI = function () {
        baseUpdate();
        w6SyncA11yButtons();
        // À partir de 175 %, les grilles passent sur une colonne et les rangées à la ligne (F44)
        document.documentElement.classList.toggle('tn-text-xl', currentFontIndex() >= 4);
    };

    const baseSearch = tnSearchItems;
    tnSearchItems = function () {
        return baseSearch().concat(W6_LEXICON.map(entry => ({
            group: 'Aide', title: entry.title, text: `${entry.terms.join(' ')} ${entry.plain}`,
            action: `w6OpenTerm('${entry.id}')`
        })), [{
            group: 'Aide', title: "Déclaration d'accessibilité",
            text: 'accessibilité handicap daltonisme clavier lecteur écran contraste aide',
            action: 'w6OpenStatement()'
        }, {
            group: 'Aide', title: 'Raccourcis clavier',
            text: 'raccourcis clavier touches navigation',
            action: 'w6OpenShortcuts()'
        }]);
    };

    window.alert = w6Notify;
    w6PlainLabels();
    w6AddSkipLinks();
    initLexiconTool();
    initA11yFooter();
    initShortcuts();
    initSelectionHelper();
    updateA11yUI();
    w6FixClickables();
    w6EnhanceForms();
    setTimeout(w6ScanGlossary, 400);

    // Contenu ajouté plus tard (listes, panneaux) : même traitement
    new MutationObserver(mutations => {
        if (mutations.every(mutation => Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes)).every(node => node.nodeType === 1 && node.matches && node.matches('.tn-gloss, .tn-field-error, .tn-req, .tn-error-summary, .tn-gloss-chip')))) return;
        w6ScheduleScan();
    }).observe(document.body, { childList: true, subtree: true });

    document.addEventListener('tn:langchange', () => { w6TermIndex = null; w6TitleIndex = null; setTimeout(() => { w6ScanGlossary(); w6PlainLabels(); }, 500); });
});
