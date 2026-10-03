// ==========================================
// VAGUE 5 — F37 protection des connexions, F38 disponibilité des services,
// F39 prise de rendez-vous, F40 rappel de rendez-vous.
// Chargé après assets/wave4.js ; réutilise registeredCitizens, activeCitizen, currentRole,
// escapeHtml, announce, t(), w4OpenDialog, w4Audit et les rendus d'index.html.
// ==========================================

const W5_STORE = { guard: 'tn_login_guard', status: 'tn_service_status', appts: 'tn_appointments' };

function w5Load(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (err) { return fallback; }
}

function w5Save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { }
}

function w5Pad(n) { return String(n).padStart(2, '0'); }

function w5Day(date) { return `${date.getFullYear()}-${w5Pad(date.getMonth() + 1)}-${w5Pad(date.getDate())}`; }

function w5Locale() { return typeof tnLocale === 'function' ? tnLocale() : 'fr-FR'; }

function w5DateLabel(date) {
    return date.toLocaleDateString(w5Locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function w5ShortStamp(date) {
    return date.toLocaleString(w5Locale(), { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function w5Staff() { return currentRole === 'agent' || currentRole === 'admin'; }

function w5Wait(seconds) {
    seconds = Math.max(1, Math.ceil(seconds));
    if (seconds < 60) return t('{s} s', { s: seconds });
    return t('{m} min {s} s', { m: Math.floor(seconds / 60), s: seconds % 60 });
}

// ==========================================================
// F37 — Protection contre les tentatives de connexion répétées
// Trois essais libres, puis un délai d'attente qui double à chaque nouvel échec.
// Le compteur est tenu par compte (changer d'identifiant n'aide pas) et au niveau
// de la plateforme : une vague d'échecs ralentit toutes les connexions.
// ==========================================================
const W5_FREE_TRIES = 3;
const W5_BASE_DELAY = 30;          // secondes, au 3e échec
const W5_MAX_DELAY = 900;          // 15 minutes
const W5_RESET_AFTER = 15 * 60000; // sans tentative pendant 15 min, le compteur repart de zéro
const W5_SURGE_COUNT = 10;         // échecs, toutes cibles confondues…
const W5_SURGE_WINDOW = 10 * 60000; // …sur 10 minutes : alerte sécurité
const W5_SURGE_DELAY = 20;         // secondes entre deux essais pendant l'alerte

let w5GuardTimer = null;

function w5Guard() {
    const guard = w5Load(W5_STORE.guard, null);
    if (!guard || typeof guard !== 'object') return { acc: {}, log: [], recent: [], globalUntil: 0 };
    guard.acc = guard.acc || {};
    guard.log = guard.log || [];
    guard.recent = guard.recent || [];
    guard.globalUntil = guard.globalUntil || 0;
    return guard;
}

// Même règle de recherche que handleLoginSubmit : matricule exact ou fragment du nom
function w5FindAccount(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return null;
    return registeredCitizens.find(c => c.matricule.toLowerCase() === q || c.name.toLowerCase().includes(q)) || null;
}

function w5GuardKey(query) {
    const found = w5FindAccount(query);
    return found ? { key: found.matricule, label: found.name, known: true } : { key: 'inconnu:' + String(query || '').trim().toLowerCase().slice(0, 40), label: String(query || '').trim().slice(0, 40), known: false };
}

function w5SurgeActive(guard, now) {
    return guard.recent.filter(stamp => now - stamp < W5_SURGE_WINDOW).length >= W5_SURGE_COUNT;
}

// Secondes restantes avant la prochaine tentative autorisée (0 = libre)
function w5LockRemaining(key, guard = w5Guard(), now = Date.now()) {
    const account = guard.acc[key];
    let until = account && account.lockUntil ? account.lockUntil : 0;
    if (w5SurgeActive(guard, now) && guard.globalUntil > until) until = guard.globalUntil;
    return until > now ? (until - now) / 1000 : 0;
}

function w5RecordFailure(info) {
    const guard = w5Guard();
    const now = Date.now();
    const account = guard.acc[info.key] || { fails: 0, unseen: 0, lockUntil: 0, lastAt: 0, label: info.label, known: info.known };
    if (account.lastAt && now - account.lastAt > W5_RESET_AFTER) account.fails = 0;
    account.fails += 1;
    account.unseen = (account.unseen || 0) + 1;
    account.lastAt = now;
    account.label = info.label;
    account.known = info.known;
    if (account.fails >= W5_FREE_TRIES) {
        const delay = Math.min(W5_MAX_DELAY, W5_BASE_DELAY * Math.pow(2, account.fails - W5_FREE_TRIES));
        account.lockUntil = now + delay * 1000;
    }
    guard.acc[info.key] = account;

    guard.recent = guard.recent.filter(stamp => now - stamp < W5_SURGE_WINDOW).concat(now).slice(-60);
    if (w5SurgeActive(guard, now)) guard.globalUntil = now + W5_SURGE_DELAY * 1000;

    guard.log.unshift({ at: new Date(now).toISOString(), key: info.key, label: info.label, known: info.known, fails: account.fails });
    guard.log = guard.log.slice(0, 40);
    w5Save(W5_STORE.guard, guard);
    if (typeof consoleLog === 'function') consoleLog(`[SEC] Échec de connexion sur ${info.known ? info.key : 'un identifiant inconnu'} (essai ${account.fails}).`);
    return { account, guard, now };
}

function w5RecordSuccess(key) {
    const guard = w5Guard();
    const account = guard.acc[key];
    const unseen = account ? account.unseen || 0 : 0;
    const last = guard.log.find(entry => entry.key === key);
    delete guard.acc[key];
    w5Save(W5_STORE.guard, guard);
    return { unseen, lastAt: last ? last.at : null };
}

function w5GuardBox() {
    let box = document.getElementById('login-guard');
    if (box) return box;
    const form = document.getElementById('form-login');
    if (!form) return null;
    box = document.createElement('div');
    box.id = 'login-guard';
    box.className = 'tn-guard';
    box.hidden = true;
    const submit = form.querySelector('button[type="submit"]');
    form.insertBefore(box, submit ? submit.parentElement : null);
    return box;
}

function w5ShowGuard(message, remaining, surge) {
    const box = w5GuardBox();
    if (!box) return;
    box.hidden = false;
    box.classList.toggle('tn-guard--lock', remaining > 0);
    box.innerHTML = `
        <p class="tn-guard-title"><i aria-hidden="true" class="fa-solid fa-shield-halved"></i> <span>${escapeHtml(t(message))}</span></p>
        ${remaining > 0 ? `<p class="tn-guard-wait">${escapeHtml(t('Nouvel essai possible dans'))} <strong data-no-i18n id="login-guard-wait">${escapeHtml(w5Wait(remaining))}</strong></p>` : ''}
        ${surge ? `<p class="tn-hint">${escapeHtml(t("Une activité inhabituelle est détectée sur la plateforme : les connexions sont ralenties pour protéger les comptes."))}</p>` : ''}
        <p class="tn-hint">${escapeHtml(t("Votre code d'accès a été oublié ? Un agent municipal peut en remettre un nouveau."))}</p>
    `;
}

function w5HideGuard() {
    const box = document.getElementById('login-guard');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    const submit = document.querySelector('#form-login button[type="submit"]');
    if (submit) submit.disabled = false;
    clearInterval(w5GuardTimer);
    w5GuardTimer = null;
}

// Décompte visible ; le bouton reste bloqué tant que le délai court
function w5StartCountdown(key) {
    clearInterval(w5GuardTimer);
    const submit = document.querySelector('#form-login button[type="submit"]');
    const tick = () => {
        const remaining = w5LockRemaining(key);
        const wait = document.getElementById('login-guard-wait');
        if (remaining <= 0) {
            w5HideGuard();
            announce(t('Vous pouvez réessayer de vous connecter.'));
            return;
        }
        if (wait) wait.textContent = w5Wait(remaining);
        if (submit) submit.disabled = true;
    };
    tick();
    if (w5LockRemaining(key) > 0) w5GuardTimer = setInterval(tick, 1000);
}

function w5Alert(message) {
    alert(message);
}

async function w5GuardedLogin(event, base) {
    event.preventDefault();
    const field = document.getElementById('login-matricule');
    const info = w5GuardKey(field ? field.value : '');

    const remaining = w5LockRemaining(info.key);
    if (remaining > 0) {
        w5ShowGuard('Trop de tentatives. Par sécurité, la connexion est suspendue un instant.', remaining, w5SurgeActive(w5Guard(), Date.now()));
        w5StartCountdown(info.key);
        announce(t('Trop de tentatives. Nouvel essai possible dans {w}.', { w: w5Wait(remaining) }));
        return;
    }

    const failures = [t('Code de sécurité incorrect.'), t('Matricule ou identifiant non reconnu sur la colonie. Vérifiez votre saisie ou enregistrez-vous.')];
    const nativeAlert = window.alert;
    const captured = [];
    window.alert = message => { captured.push(String(message)); };
    const before = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
    try {
        await base(event);
    } finally {
        window.alert = nativeAlert;
    }

    const failed = captured.some(message => failures.includes(message));
    if (failed) {
        const result = w5RecordFailure(info);
        const left = W5_FREE_TRIES - result.account.fails;
        const lock = w5LockRemaining(info.key, result.guard, result.now);
        // Message volontairement identique, que le compte existe ou non
        if (lock > 0) {
            w5ShowGuard('Identifiants incorrects. Par sécurité, la connexion est suspendue un instant.', lock, w5SurgeActive(result.guard, result.now));
            w5StartCountdown(info.key);
            announce(t('Identifiants incorrects. Nouvel essai possible dans {w}.', { w: w5Wait(lock) }));
        } else {
            w5ShowGuard(left > 0 ? t('Identifiants incorrects. Il vous reste {n} essai(s) avant un délai d\'attente.', { n: left }) : 'Identifiants incorrects.', 0, false);
            announce(t('Identifiants incorrects.'));
        }
        const pwd = document.getElementById('login-pwd');
        if (pwd) { pwd.value = ''; pwd.focus(); }
        w5RenderSecurity();
        return;
    }

    // Autre message (compte suspendu, connexion réussie…) : affiché tel quel
    captured.forEach(message => nativeAlert.call(window, message));
    const now = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
    if (now && now !== before) {
        w5HideGuard();
        const seen = w5RecordSuccess(now.matricule);
        if (seen.unseen > 0) {
            const when = seen.lastAt ? new Date(seen.lastAt).toLocaleString(w5Locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
            w4OpenDialog(t('Tentatives de connexion échouées'), `
                <p class="tn-hint" data-no-i18n>${escapeHtml(t('{n} tentative(s) de connexion échouée(s) sur votre compte depuis votre dernière visite (dernière : {when}).', { n: seen.unseen, when }))}</p>
                <p class="tn-hint" data-no-i18n>${escapeHtml(t("Si ce n'était pas vous, changez votre code d'accès auprès d'un agent municipal."))}</p>
                <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-dialog-close data-autofocus data-no-i18n>${escapeHtml(t('Fermer'))}</button></div>
            `);
        }
        w5RenderSecurity();
    }
}

function initLoginGuard() {
    if (typeof handleLoginSubmit !== 'function') return;
    const base = handleLoginSubmit;
    handleLoginSubmit = event => w5GuardedLogin(event, base);

    const field = document.getElementById('login-matricule');
    if (field) field.addEventListener('input', () => {
        // Le délai suit l'identifiant saisi : on le réaffiche s'il est encore en cours
        const info = w5GuardKey(field.value);
        const remaining = w5LockRemaining(info.key);
        if (remaining > 0) { w5ShowGuard('Trop de tentatives. Par sécurité, la connexion est suspendue un instant.', remaining, w5SurgeActive(w5Guard(), Date.now())); w5StartCountdown(info.key); }
        else if (document.getElementById('login-guard') && !document.getElementById('login-guard').hidden && !document.getElementById('login-guard-wait')) { /* message d'essais restants : conservé */ }
        else w5HideGuard();
    });
}

// --- Panneau « Alerte sécurité » de l'espace agents ---
function initSecurityPanel() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('security-alert')) return;
    const panel = document.createElement('div');
    panel.id = 'security-alert';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = 'Alerte sécurité';
    panel.innerHTML = `
        <div class="tn-eyebrow">Sécurité des connexions</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">ALERTE SÉCURITÉ</h3>
        <p class="tn-hint">Après {n} échecs sur un compte, la connexion attend de plus en plus longtemps (30 s, 1 min, 2 min…). Une vague d'échecs sur la plateforme ralentit toutes les connexions.</p>
        <div id="security-state" class="tn-security-state" role="status"></div>
        <div id="security-list"></div>
    `;
    panel.querySelector('.tn-hint').innerHTML = escapeHtml(t("Après {n} échecs sur un compte, la connexion attend de plus en plus longtemps (30 s, 1 min, 2 min…). Une vague d'échecs sur la plateforme ralentit toutes les connexions.", { n: W5_FREE_TRIES }));
    panel.querySelector('.tn-hint').setAttribute('data-no-i18n', '');
    const anchor = document.getElementById('account-admin');
    if (anchor) anchor.before(panel); else workspace.appendChild(panel);
    w5RenderSecurity();
    setInterval(w5RenderSecurity, 5000);
}

function w5RenderSecurity() {
    const state = document.getElementById('security-state');
    const list = document.getElementById('security-list');
    if (!state || !list) return;
    const guard = w5Guard();
    const now = Date.now();
    const surge = w5SurgeActive(guard, now);
    const recent = guard.recent.filter(stamp => now - stamp < W5_SURGE_WINDOW).length;
    state.className = 'tn-security-state' + (surge ? ' tn-security-state--surge' : '');
    state.innerHTML = surge
        ? `<span class="tn-badge tn-badge--pending">${escapeHtml(t('Alerte active'))}</span> <span data-no-i18n>${escapeHtml(t('{n} échecs de connexion en 10 minutes : les connexions sont ralenties.', { n: recent }))}</span>`
        : `<span class="tn-badge tn-badge--resolved">${escapeHtml(t('Situation normale'))}</span> <span data-no-i18n>${escapeHtml(t('{n} échec(s) de connexion sur les 10 dernières minutes.', { n: recent }))}</span>`;

    const rows = Object.keys(guard.acc).map(key => ({ key, account: guard.acc[key] })).filter(row => row.account.fails > 0 || row.account.unseen > 0);
    if (!rows.length) { list.innerHTML = `<p class="tn-empty">${escapeHtml(t('Aucune tentative échouée en cours.'))}</p>`; return; }
    list.innerHTML = `
        <div class="overflow-x-auto"><table class="w-full text-left text-xs">
            <caption class="sr-only">${escapeHtml(t('Comptes visés par des tentatives de connexion échouées'))}</caption>
            <thead><tr class="border-b border-cyan-900/60 text-[#6F8696] uppercase text-[10px]">
                <th scope="col" class="py-2.5 px-3">${escapeHtml(t('Compte'))}</th>
                <th scope="col" class="py-2.5 px-3">${escapeHtml(t('Échecs'))}</th>
                <th scope="col" class="py-2.5 px-3">${escapeHtml(t('État'))}</th>
                <th scope="col" class="py-2.5 px-3 text-right">${escapeHtml(t('Action'))}</th>
            </tr></thead>
            <tbody>${rows.map(row => {
                const remaining = w5LockRemaining(row.key, guard, now);
                return `<tr class="border-b border-cyan-900/30">
                    <td class="py-2.5 px-3 text-[#E6F1F7]" data-no-i18n>${escapeHtml(row.account.known ? row.account.label + ' · ' + row.key : t('Identifiant inconnu') + ' : ' + row.account.label)}</td>
                    <td class="py-2.5 px-3" data-no-i18n>${row.account.unseen}</td>
                    <td class="py-2.5 px-3" data-no-i18n>${remaining > 0 ? escapeHtml(t('Bloqué {w}', { w: w5Wait(remaining) })) : escapeHtml(t('Libre'))}</td>
                    <td class="py-2.5 px-3 text-right"><button type="button" class="tn-tab" onclick="w5Unlock('${escapeHtml(row.key)}')">${escapeHtml(t('Débloquer'))}</button></td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>
    `;
}

function w5Unlock(key) {
    const guard = w5Guard();
    const account = guard.acc[key];
    if (!account) return;
    // Le blocage est levé, les échecs restent consultables par le titulaire à sa prochaine connexion
    account.fails = 0;
    account.lockUntil = 0;
    if (!account.known) delete guard.acc[key];
    guard.recent = [];
    guard.globalUntil = 0;
    w5Save(W5_STORE.guard, guard);
    if (typeof w4Audit === 'function') w4Audit(`Blocage de connexion levé : ${key}`);
    announce(t('Blocage levé.'));
    w5RenderSecurity();
}

// ==========================================================
// F38 — Disponibilité des services municipaux
// ==========================================================
const W5_SERVICES = [
    'Atmosphère & Biosphère',
    'Transports & Hyper-Tubes',
    'Énergie Plasma & Réacteur Zéro',
    'Santé Biotech & Cryo-Soins',
    'Sécurité Civile & Sentinelles',
    'Mairie & État Civil Spatial'
];

const W5_STATE_LABEL = { maintenance: 'En maintenance', incident: 'Incident en cours' };

function w5RoundedLater(hours) {
    const date = new Date(Date.now() + hours * 3600000);
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return `${w5Day(date)}T${w5Pad(date.getHours())}:${w5Pad(date.getMinutes())}`;
}

// Un exemple d'interruption est présent d'office pour que la fonction soit visible ; un agent peut le modifier ou le lever
function w5StatusMap() {
    let map = w5Load(W5_STORE.status, null);
    const now = Date.now();
    if (!map || typeof map !== 'object') {
        map = {};
    }
    const seed = map['Santé Biotech & Cryo-Soins'];
    if (!seed && !localStorage.getItem(W5_STORE.status + '_seeded')) {
        map['Santé Biotech & Cryo-Soins'] = { state: 'maintenance', seed: true };
        try { localStorage.setItem(W5_STORE.status + '_seeded', '1'); } catch (err) { }
    }
    // L'exemple se renouvelle tant qu'aucun agent n'y a touché
    const entry = map['Santé Biotech & Cryo-Soins'];
    if (entry && entry.seed && (!entry.backAt || new Date(entry.backAt).getTime() <= now)) {
        entry.state = 'maintenance';
        entry.reason = 'Mise à jour des biolinks de la clinique : la prise de rendez-vous et les analyses sont suspendues.';
        entry.backAt = w5RoundedLater(3);
        entry.todo = "Pour une urgence vitale, contactez la Sécurité Civile. Pour un renouvellement d'ordonnance, déposez une demande : elle sera traitée dès la reprise.";
        entry.alt = 'Sécurité Civile & Sentinelles';
    }
    w5Save(W5_STORE.status, map);
    return map;
}

// Retourne l'interruption en cours pour un service, ou null (une date de retour passée = service rétabli)
function w5Outage(service) {
    const entry = w5StatusMap()[service];
    if (!entry || !entry.state || entry.state === 'available') return null;
    if (entry.backAt && new Date(entry.backAt).getTime() <= Date.now()) return null;
    return entry;
}

function w5BackText(entry) {
    if (!entry.backAt) return t('Heure de retour non communiquée');
    return t('Retour prévu : {when}', { when: w5ShortStamp(new Date(entry.backAt)) });
}

function w5StatusBlock(service, entry, compact) {
    const alt = entry.alt && entry.alt !== service && !w5Outage(entry.alt) ? entry.alt : '';
    return `
        <div class="tn-svc-status tn-svc-status--${entry.state}" role="group">
            <p class="tn-svc-status-head"><span class="tn-badge tn-badge--pending" data-no-i18n>${escapeHtml(t(W5_STATE_LABEL[entry.state] || 'Indisponible'))}</span>
            <strong data-no-i18n>${escapeHtml(w5BackText(entry))}</strong></p>
            ${entry.reason ? `<p class="tn-hint" data-no-i18n>${escapeHtml(t(entry.reason))}</p>` : ''}
            ${entry.todo && !compact ? `<p class="tn-hint"><strong>${escapeHtml(t('À faire en attendant :'))}</strong> <span data-no-i18n>${escapeHtml(t(entry.todo))}</span></p>` : ''}
            ${alt ? `<p class="tn-hint">${escapeHtml(t('Service à contacter :'))} <button type="button" class="tn-link" data-no-i18n onclick="w5GoToService('${escapeHtml(alt)}')">${escapeHtml(t(alt))}</button></p>` : ''}
        </div>`;
}

function w5GoToService(name) {
    const service = (typeof tnServices !== 'undefined' ? tnServices : []).find(item => item.name === name);
    if (service && service.card) {
        if (typeof goToSection === 'function') goToSection('services-municipaux');
        setTimeout(() => { if (typeof tnFlash === 'function') tnFlash(service.card); else service.card.scrollIntoView({ block: 'center' }); }, 150);
    }
}

function w5RenderStatuses() {
    const map = w5StatusMap();
    const services = typeof tnServices !== 'undefined' ? tnServices : [];

    services.forEach(service => {
        let slot = service.card.querySelector('.tn-svc-slot');
        if (!slot) {
            slot = document.createElement('div');
            slot.className = 'tn-svc-slot';
            const heading = service.card.querySelector('h3');
            (service.flag || heading).after(slot);
        }
        const entry = w5Outage(service.name);
        service.card.classList.toggle('tn-svc-down', !!entry);
        slot.innerHTML = entry ? w5StatusBlock(service.name, entry, false) : '';
    });

    const down = W5_SERVICES.map(name => ({ name, entry: w5Outage(name) })).filter(row => row.entry);
    const grid = document.getElementById('services-grid');
    let banner = document.getElementById('service-status-banner');
    if (!banner && grid) {
        banner = document.createElement('div');
        banner.id = 'service-status-banner';
        banner.setAttribute('role', 'status');
        const strip = document.getElementById('featured-services');
        (strip || grid).before(banner);
    }
    if (banner) {
        banner.hidden = !down.length;
        banner.innerHTML = down.length ? `
            <div class="tn-svc-banner">
                <p class="tn-eyebrow"><i aria-hidden="true" class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(t('Services interrompus'))}</p>
                <ul class="tn-svc-banner-list">${down.map(row => `
                    <li><strong data-no-i18n>${escapeHtml(t(row.name))}</strong> — <span data-no-i18n>${escapeHtml(t(W5_STATE_LABEL[row.entry.state] || 'Indisponible'))}, ${escapeHtml(w5BackText(row.entry))}</span>
                    <button type="button" class="tn-link" onclick="w5GoToService('${escapeHtml(row.name)}')">${escapeHtml(t('Voir le détail'))}</button></li>`).join('')}
                </ul>
            </div>` : '';
    }

    w5RenderContactWarning();
    w5RenderApptServiceState();
}

// Avant de remplir une démarche : l'habitant sait si le service est interrompu
function w5RenderContactWarning() {
    const select = document.getElementById('contact-service');
    if (!select) return;
    let box = document.getElementById('contact-service-status');
    if (!box) {
        box = document.createElement('div');
        box.id = 'contact-service-status';
        box.setAttribute('role', 'status');
        select.parentElement.appendChild(box);
    }
    const entry = w5Outage(select.value);
    box.innerHTML = entry ? w5StatusBlock(select.value, entry, false) + `<p class="tn-hint">${escapeHtml(t('Vous pouvez tout de même envoyer votre demande : elle sera traitée au retour du service.'))}</p>` : '';
}

function initServiceStatus() {
    const select = document.getElementById('contact-service');
    if (select) select.addEventListener('change', () => {
        w5RenderContactWarning();
        const entry = w5Outage(select.value);
        if (entry) announce(t('Attention : {service} est indisponible. {back}', { service: t(select.value), back: w5BackText(entry) }));
    });
    if (typeof updateReportRouting === 'function') {
        const baseRouting = updateReportRouting;
        updateReportRouting = function () { const result = baseRouting.apply(this, arguments); w5RenderContactWarning(); return result; };
    }
    w5RenderStatuses();
    // L'état se met à jour tout seul à l'heure de retour annoncée
    setInterval(w5RenderStatuses, 30000);
    window.addEventListener('storage', event => { if (event.key === W5_STORE.status) w5RenderStatuses(); });
}

function initServiceStatusAdmin() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('service-status-admin')) return;
    const panel = document.createElement('div');
    panel.id = 'service-status-admin';
    panel.className = 'holo-card p-6 relative';
    panel.dataset.crumb = 'Disponibilité des services';
    panel.innerHTML = `
        <div class="tn-eyebrow">Disponibilité des services</div>
        <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">SERVICES INTERROMPUS</h3>
        <p class="tn-hint">Signalez une maintenance ou un incident : les habitants le voient sur le catalogue et avant d'envoyer une démarche. Le service redevient disponible tout seul à l'heure de retour.</p>
        <form id="svc-form" class="tn-dialog-form" onsubmit="return false">
            <div class="tn-account-tools">
                <div><label class="tn-field-label" for="svc-name">Service</label>
                    <select id="svc-name" class="cyber-input">${W5_SERVICES.map(name => `<option value="${escapeHtml(name)}" data-no-i18n>${escapeHtml(t(name))}</option>`).join('')}</select></div>
                <div><label class="tn-field-label" for="svc-state">État</label>
                    <select id="svc-state" class="cyber-input">
                        <option value="available">Disponible</option>
                        <option value="maintenance">En maintenance</option>
                        <option value="incident">Incident en cours</option>
                    </select></div>
            </div>
            <div><label class="tn-field-label" for="svc-reason">Raison affichée aux habitants</label>
                <input id="svc-reason" class="cyber-input" maxlength="160" placeholder="ex: mise à jour des biolinks"></div>
            <div class="tn-account-tools">
                <div><label class="tn-field-label" for="svc-back">Retour prévu</label>
                    <input id="svc-back" type="datetime-local" class="cyber-input"></div>
                <div><label class="tn-field-label" for="svc-alt">Service à contacter en attendant</label>
                    <select id="svc-alt" class="cyber-input"><option value="">Aucun</option>${W5_SERVICES.map(name => `<option value="${escapeHtml(name)}" data-no-i18n>${escapeHtml(t(name))}</option>`).join('')}</select></div>
            </div>
            <div><label class="tn-field-label" for="svc-todo">Que faire en attendant</label>
                <input id="svc-todo" class="cyber-input" maxlength="200" placeholder="ex: en cas d'urgence, appelez la Sécurité Civile"></div>
            <p id="svc-error" class="tn-form-error" role="alert"></p>
            <div class="tn-dialog-actions"><button type="button" id="svc-save" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">Enregistrer l'état</button></div>
        </form>
        <ul id="svc-current" class="tn-audit"></ul>
    `;
    workspace.appendChild(panel);

    const nameSelect = panel.querySelector('#svc-name');
    const fill = () => {
        const entry = w5StatusMap()[nameSelect.value] || {};
        panel.querySelector('#svc-state').value = entry.state || 'available';
        panel.querySelector('#svc-reason').value = entry.reason || '';
        panel.querySelector('#svc-back').value = entry.backAt || '';
        panel.querySelector('#svc-alt').value = entry.alt || '';
        panel.querySelector('#svc-todo').value = entry.todo || '';
    };
    nameSelect.addEventListener('change', fill);
    fill();

    panel.querySelector('#svc-save').addEventListener('click', () => {
        const error = panel.querySelector('#svc-error');
        const service = nameSelect.value;
        const state = panel.querySelector('#svc-state').value;
        const reason = panel.querySelector('#svc-reason').value.trim();
        const back = panel.querySelector('#svc-back').value;
        const alt = panel.querySelector('#svc-alt').value;
        const todo = panel.querySelector('#svc-todo').value.trim();
        error.textContent = '';
        if (state !== 'available') {
            if (!reason) { error.textContent = t('Indiquez la raison affichée aux habitants.'); return; }
            if (back && new Date(back).getTime() <= Date.now()) { error.textContent = t('Le retour prévu doit être dans le futur.'); return; }
            if (alt === service) { error.textContent = t('Le service à contacter doit être un autre service.'); return; }
        }
        const map = w5StatusMap();
        if (state === 'available') delete map[service];
        else map[service] = { state, reason, backAt: back, alt, todo, since: new Date().toISOString() };
        w5Save(W5_STORE.status, map);
        if (typeof w4Audit === 'function') w4Audit(`Disponibilité de « ${service} » : ${state === 'available' ? 'rétabli' : state}`);
        announce(t('État du service enregistré.'));
        w5RenderStatuses();
        w5RenderStatusAdminList();
    });
    w5RenderStatusAdminList();
}

function w5RenderStatusAdminList() {
    const list = document.getElementById('svc-current');
    if (!list) return;
    const down = W5_SERVICES.map(name => ({ name, entry: w5Outage(name) })).filter(row => row.entry);
    list.innerHTML = down.length
        ? down.map(row => `<li data-no-i18n><strong>${escapeHtml(t(row.name))}</strong> — ${escapeHtml(t(W5_STATE_LABEL[row.entry.state]))} · ${escapeHtml(w5BackText(row.entry))}</li>`).join('')
        : `<li>${escapeHtml(t('Tous les services sont disponibles.'))}</li>`;
}

// ==========================================================
// F39 — Prise de rendez-vous avec un agent
// F40 — Rappel avant le rendez-vous
// ==========================================================
const W5_APPT = {
    'Atmosphère & Biosphère': {
        place: 'Anneau Zéro, Secteur A — Tour de régulation, accueil',
        motifs: [
            ['Analyse de la qualité de l\'air de mon dôme', ['Matricule colonial', 'Relevé de votre capteur domestique (si vous en avez un)']],
            ['Signalement d\'une fuite ou d\'une odeur suspecte', ['Matricule colonial', 'Photos ou notes sur l\'heure et le lieu de la fuite']]
        ]
    },
    'Transports & Hyper-Tubes': {
        place: 'Hub Central des Hyper-Tubes — quai 1, guichet des abonnements',
        motifs: [
            ['Abonnement ou renouvellement de pass', ['Matricule colonial', 'Photo d\'identité numérique']],
            ['Objet perdu dans une navette', ['Matricule colonial', 'Ligne, heure et station approximatives']]
        ]
    },
    'Énergie Plasma & Réacteur Zéro': {
        place: 'Réacteur Zéro — bâtiment d\'accueil des habitants',
        motifs: [
            ['Dépassement de quota énergétique', ['Matricule colonial', 'Dernier relevé de consommation du dôme']],
            ['Raccordement ou changement de compteur', ['Matricule colonial', 'Justificatif de dôme de résidence']]
        ]
    },
    'Santé Biotech & Cryo-Soins': {
        place: 'Clinique Biotech — aile Cryo-Soins, accueil 2',
        motifs: [
            ['Consultation de suivi', ['Matricule colonial', 'Carnet de santé ou biolink à jour', 'Liste de vos traitements en cours']],
            ['Renouvellement d\'ordonnance', ['Matricule colonial', 'Ancienne ordonnance']]
        ]
    },
    'Sécurité Civile & Sentinelles': {
        place: 'Poste Central des Sentinelles — accueil du public',
        motifs: [
            ['Déclaration d\'incident non urgent', ['Matricule colonial', 'Récit daté de l\'incident, preuves éventuelles']],
            ['Formation aux gestes de première urgence', ['Matricule colonial', 'Tenue souple']]
        ]
    },
    'Mairie & État Civil Spatial': {
        place: 'Hôtel de la Colonie — Anneau Zéro, guichet 4',
        motifs: [
            ['Renouvellement du matricule colonial', ['Ancien passeport colonial', 'Justificatif de dôme de résidence']],
            ['Déclaration de naissance ou d\'union', ['Passeport colonial de chaque personne concernée', 'Acte ou attestation du médecin ou du témoin']],
            ['Attestation de résidence', ['Matricule colonial', 'Justificatif de dôme de résidence']]
        ]
    }
};

const W5_SLOT_MINUTES = 30;
const W5_DAYS_AHEAD = 14;
const W5_MORNING = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30'];
const W5_AFTERNOON = ['14:00', '14:30', '15:00', '15:30', '16:00', '16:30'];
const W5_REMINDERS = [
    { id: '1d', minutes: 1440, label: 'La veille (24 h avant)' },
    { id: '2h', minutes: 120, label: '2 heures avant' },
    { id: '30m', minutes: 30, label: '30 minutes avant' },
    { id: '10m', minutes: 10, label: '10 minutes avant' }
];
const W5_CANCEL_LIMIT = 120; // minutes avant le début

let w5Pick = { service: W5_SERVICES[5], motif: 0, day: '', time: '' };

function w5Appointments() {
    const list = w5Load(W5_STORE.appts, []);
    return Array.isArray(list) ? list : [];
}

function w5SaveAppointments(list) { w5Save(W5_STORE.appts, list); }

function w5Start(appt) { return new Date(`${appt.day}T${appt.time}:00`); }

function w5End(appt) { return new Date(w5Start(appt).getTime() + W5_SLOT_MINUTES * 60000); }

function w5Mine(appt) {
    if (appt.cancelled) return false;
    if (activeCitizen) return appt.owner === activeCitizen.matricule;
    return !appt.owner;
}

// Quelques créneaux sont déjà pris pour que le calendrier soit réaliste (calcul stable, sans hasard)
function w5PreBooked(service, day, time) {
    let hash = 7;
    for (const char of `${service}|${day}|${time}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    return hash % 6 === 0;
}

function w5SlotTaken(service, day, time, ignoreId) {
    if (w5PreBooked(service, day, time)) return true;
    return w5Appointments().some(appt => !appt.cancelled && appt.id !== ignoreId && appt.service === service && appt.day === day && appt.time === time);
}

function w5Days() {
    const days = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    for (let i = 0; i < 40 && days.length < W5_DAYS_AHEAD; i++) {
        const weekday = cursor.getDay();
        if (weekday !== 0 && weekday !== 6) {
            const day = w5Day(cursor);
            if (w5SlotsFor(W5_SERVICES[0], day).length) days.push(new Date(cursor));
        }
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

// Créneaux encore à venir pour un jour (au moins 30 minutes devant nous)
function w5SlotsFor(service, day) {
    const limit = Date.now() + 30 * 60000;
    return W5_MORNING.concat(W5_AFTERNOON).filter(time => new Date(`${day}T${time}:00`).getTime() > limit);
}

function w5Range(appt) {
    const end = w5End(appt);
    return `${appt.time}–${w5Pad(end.getHours())}:${w5Pad(end.getMinutes())}`;
}

function w5ReminderAt(appt) {
    const option = W5_REMINDERS.find(item => item.id === appt.reminder);
    if (!option) return null;
    return new Date(w5Start(appt).getTime() - option.minutes * 60000);
}

function w5Reference() {
    const used = new Set(w5Appointments().map(appt => appt.id));
    let id;
    do { id = 'RV-TN-' + String(Math.floor(1000 + Math.random() * 9000)); } while (used.has(id));
    return id;
}

function initAppointments() {
    const anchor = document.getElementById('demarches');
    if (!anchor || document.getElementById('rendez-vous')) return;

    const section = document.createElement('section');
    section.id = 'rendez-vous';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'rendez-vous-title');
    section.dataset.crumb = 'Rendez-vous';
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1">
                <i aria-hidden="true" class="fa-solid fa-calendar-check"></i>
                <span>Services municipaux</span>
            </div>
            <h2 id="rendez-vous-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">PRENDRE RENDEZ-VOUS</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">Choisissez le service, le motif puis un créneau. Le récapitulatif vous redit le jour, l'heure, le lieu et ce qu'il faut apporter avant de confirmer.</p>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div class="lg:col-span-7 holo-card p-6 relative">
                <div class="corner-tr"></div><div class="corner-bl"></div>
                <form id="appt-form" class="tn-dialog-form" onsubmit="return false" novalidate>
                    <div class="tn-account-tools">
                        <div><label class="tn-field-label" for="appt-service">1. Service</label><select id="appt-service" class="cyber-input"></select></div>
                        <div><label class="tn-field-label" for="appt-motif">2. Motif</label><select id="appt-motif" class="cyber-input"></select></div>
                    </div>
                    <div id="appt-service-status" role="status"></div>
                    <div><label class="tn-field-label" for="appt-day">3. Jour</label><select id="appt-day" class="cyber-input"></select></div>
                    <fieldset class="tn-slots" id="appt-slots-box">
                        <legend class="tn-field-label">4. Créneau (heure de la cité, 24 h)</legend>
                        <div id="appt-slots" class="tn-slot-grid"></div>
                    </fieldset>
                    <div class="tn-account-tools">
                        <div><label class="tn-field-label" for="appt-name">Nom du citoyen</label><input id="appt-name" class="cyber-input" autocomplete="name" maxlength="60" required></div>
                        <div><label class="tn-field-label" for="appt-reminder">Rappel</label><select id="appt-reminder" class="cyber-input"></select></div>
                    </div>
                    <div id="appt-summary" class="tn-appt-summary" role="status" aria-live="polite"></div>
                    <p id="appt-error" class="tn-form-error" role="alert"></p>
                    <div class="tn-dialog-actions"><button type="button" id="appt-confirm" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">Confirmer le rendez-vous</button></div>
                </form>
                <div id="appt-done" hidden></div>
            </div>
            <div class="lg:col-span-5 holo-card p-6 relative">
                <div class="corner-tr"></div><div class="corner-bl"></div>
                <h3 class="font-orbitron font-bold text-base text-[#00B8FF] uppercase mb-1">MES RENDEZ-VOUS</h3>
                <p class="tn-hint">Annulation possible jusqu'à 2 heures avant le rendez-vous.</p>
                <ul id="appt-list" class="tn-appt-list"></ul>
            </div>
        </div>
    `;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'rendez-vous')) {
        TN_SECTIONS.splice(TN_SECTIONS.findIndex(entry => entry.id === 'demarches') + 1, 0, { id: 'rendez-vous', label: 'Rendez-vous' });
    }
    const navLink = document.querySelector('#site-nav a[href="#demarches"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#rendez-vous';
        link.className = navLink.className;
        link.innerHTML = '<i aria-hidden="true" class="fa-solid fa-calendar-check text-[11px] text-[#00B8FF]"></i><span>RENDEZ-VOUS</span>';
        navLink.after(link);
    }

    const serviceSelect = section.querySelector('#appt-service');
    serviceSelect.innerHTML = W5_SERVICES.map(name => `<option value="${escapeHtml(name)}" data-no-i18n>${escapeHtml(t(name))}</option>`).join('');
    serviceSelect.value = w5Pick.service;
    section.querySelector('#appt-reminder').innerHTML = W5_REMINDERS.map(item => `<option value="${item.id}" ${item.id === '2h' ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')
        + '<option value="none">Pas de rappel</option>';

    serviceSelect.addEventListener('change', () => { w5Pick.service = serviceSelect.value; w5Pick.motif = 0; w5Pick.time = ''; w5RenderApptForm(); });
    section.querySelector('#appt-motif').addEventListener('change', event => { w5Pick.motif = Number(event.target.value) || 0; w5RenderApptSummary(); });
    section.querySelector('#appt-day').addEventListener('change', event => { w5Pick.day = event.target.value; w5Pick.time = ''; w5RenderSlots(); w5RenderApptSummary(); });
    section.querySelector('#appt-reminder').addEventListener('change', w5RenderApptSummary);
    section.querySelector('#appt-name').addEventListener('input', () => { section.querySelector('#appt-error').textContent = ''; });
    section.querySelector('#appt-confirm').addEventListener('click', w5ConfirmAppointment);
    section.querySelector('#appt-slots').addEventListener('change', event => {
        if (event.target.name !== 'appt-slot') return;
        w5Pick.time = event.target.value;
        section.querySelector('#appt-error').textContent = '';
        w5RenderApptSummary();
    });
    section.querySelector('#appt-list').addEventListener('click', event => {
        const cancel = event.target.closest('[data-cancel]');
        const ics = event.target.closest('[data-ics]');
        const test = event.target.closest('[data-preview]');
        if (cancel) w5CancelAppointment(cancel.dataset.cancel);
        if (ics) w5DownloadIcs(ics.dataset.ics);
        if (test) w5PreviewReminder(test.dataset.preview);
    });
    section.querySelector('#appt-done').addEventListener('click', event => {
        const ics = event.target.closest('[data-ics]');
        const again = event.target.closest('[data-again]');
        if (ics) w5DownloadIcs(ics.dataset.ics);
        if (again) { w5ResetForm(); }
    });

    w5RenderApptForm();
    w5RenderApptList();
}

function w5ResetForm() {
    const form = document.getElementById('appt-form');
    const done = document.getElementById('appt-done');
    if (!form || !done) return;
    done.hidden = true;
    done.innerHTML = '';
    form.hidden = false;
    w5Pick.time = '';
    w5RenderApptForm();
    const first = document.getElementById('appt-service');
    if (first) first.focus();
}

function w5RenderApptForm() {
    const motifSelect = document.getElementById('appt-motif');
    const daySelect = document.getElementById('appt-day');
    if (!motifSelect || !daySelect) return;
    const info = W5_APPT[w5Pick.service];
    motifSelect.innerHTML = info.motifs.map((motif, index) => `<option value="${index}" ${index === w5Pick.motif ? 'selected' : ''}>${escapeHtml(t(motif[0]))}</option>`).join('');
    motifSelect.querySelectorAll('option').forEach(option => option.setAttribute('data-no-i18n', ''));

    const days = w5Days();
    if (!days.some(date => w5Day(date) === w5Pick.day)) w5Pick.day = days.length ? w5Day(days[0]) : '';
    daySelect.innerHTML = days.map(date => `<option value="${w5Day(date)}" ${w5Day(date) === w5Pick.day ? 'selected' : ''}>${escapeHtml(w5DateLabel(date))}</option>`).join('');
    daySelect.querySelectorAll('option').forEach(option => option.setAttribute('data-no-i18n', ''));

    const name = document.getElementById('appt-name');
    if (name && !name.value && activeCitizen) name.value = activeCitizen.name;

    w5RenderApptServiceState();
    w5RenderSlots();
    w5RenderApptSummary();
}

// Un service interrompu ne propose pas de rendez-vous : l'habitant est prévenu avant de choisir un créneau
function w5RenderApptServiceState() {
    const box = document.getElementById('appt-service-status');
    const confirm = document.getElementById('appt-confirm');
    if (!box) return;
    const entry = w5Outage(w5Pick.service);
    box.innerHTML = entry ? w5StatusBlock(w5Pick.service, entry, false) + `<p class="tn-hint">${escapeHtml(t('Les rendez-vous de ce service sont suspendus jusqu\'à son retour.'))}</p>` : '';
    const slots = document.getElementById('appt-slots-box');
    if (slots) slots.disabled = !!entry;
    if (confirm) confirm.disabled = !!entry;
}

function w5RenderSlots() {
    const grid = document.getElementById('appt-slots');
    if (!grid) return;
    const day = w5Pick.day;
    const free = day ? w5SlotsFor(w5Pick.service, day) : [];
    if (w5Pick.time && !free.includes(w5Pick.time)) w5Pick.time = '';
    const render = (title, times) => `
        <div class="tn-slot-group"><p class="tn-hint">${escapeHtml(title)}</p><div class="tn-slot-row">
            ${times.map(time => {
                const visible = free.includes(time);
                if (!visible) return '';
                const taken = w5SlotTaken(w5Pick.service, day, time);
                const end = new Date(new Date(`${day}T${time}:00`).getTime() + W5_SLOT_MINUTES * 60000);
                return `<label class="tn-slot ${taken ? 'tn-slot--taken' : ''}">
                    <input type="radio" name="appt-slot" value="${time}" ${taken ? 'disabled' : ''} ${w5Pick.time === time ? 'checked' : ''}>
                    <span data-no-i18n>${time}–${w5Pad(end.getHours())}:${w5Pad(end.getMinutes())}${taken ? ' · ' + escapeHtml(t('complet')) : ''}</span>
                </label>`;
            }).join('')}
        </div></div>`;
    grid.innerHTML = free.length ? render(t('Matin'), W5_MORNING) + render(t('Après-midi'), W5_AFTERNOON) : `<p class="tn-empty">${escapeHtml(t('Plus de créneau ce jour-là. Choisissez un autre jour.'))}</p>`;
}

function w5PrepList(service, motifIndex) {
    const info = W5_APPT[service];
    const motif = info.motifs[motifIndex] || info.motifs[0];
    return motif[1];
}

function w5SummaryHtml(appt, withPrep) {
    const start = w5Start(appt);
    const info = W5_APPT[appt.service];
    const motif = info.motifs[appt.motif] || info.motifs[0];
    const reminder = w5ReminderAt(appt);
    return `
        <dl class="tn-appt-dl" data-no-i18n>
            <div><dt>${escapeHtml(t('Date'))}</dt><dd><strong>${escapeHtml(w5DateLabel(start))}</strong></dd></div>
            <div><dt>${escapeHtml(t('Heure'))}</dt><dd><strong>${escapeHtml(w5Range(appt))}</strong> ${escapeHtml(t('(heure de la cité, 24 h)'))}</dd></div>
            <div><dt>${escapeHtml(t('Service'))}</dt><dd>${escapeHtml(t(appt.service))}</dd></div>
            <div><dt>${escapeHtml(t('Motif'))}</dt><dd>${escapeHtml(t(motif[0]))}</dd></div>
            <div><dt>${escapeHtml(t('Lieu'))}</dt><dd>${escapeHtml(t(info.place))}</dd></div>
            <div><dt>${escapeHtml(t('Rappel'))}</dt><dd>${reminder ? escapeHtml(t('{when} ({label})', { when: w5ShortStamp(reminder), label: t(W5_REMINDERS.find(item => item.id === appt.reminder).label) })) : escapeHtml(t('Aucun rappel'))}</dd></div>
        </dl>
        ${withPrep ? `
            <p class="tn-field-label" data-no-i18n>${escapeHtml(t('À apporter'))}</p>
            <ul class="tn-appt-prep" data-no-i18n>${w5PrepList(appt.service, appt.motif).map(item => `<li>${escapeHtml(t(item))}</li>`).join('')}</ul>
            <p class="tn-hint" data-no-i18n>${escapeHtml(t("Présentez-vous 10 minutes avant l'heure, à l'accueil indiqué. Un agent vous reçoit pendant {n} minutes.", { n: W5_SLOT_MINUTES }))}</p>` : ''}
    `;
}

function w5CurrentDraft() {
    const reminder = document.getElementById('appt-reminder');
    return { service: w5Pick.service, motif: w5Pick.motif, day: w5Pick.day, time: w5Pick.time, reminder: reminder && reminder.value !== 'none' ? reminder.value : '' };
}

function w5RenderApptSummary() {
    const box = document.getElementById('appt-summary');
    if (!box) return;
    const draft = w5CurrentDraft();
    if (!draft.day || !draft.time) {
        box.innerHTML = `<p class="tn-hint">${escapeHtml(t('Choisissez un créneau : le récapitulatif de votre rendez-vous apparaît ici.'))}</p>`;
        return;
    }
    box.innerHTML = `<p class="tn-eyebrow">${escapeHtml(t('Votre rendez-vous'))}</p>` + w5SummaryHtml(draft, true);
}

function w5ConfirmAppointment() {
    const error = document.getElementById('appt-error');
    const draft = w5CurrentDraft();
    const name = document.getElementById('appt-name').value.trim();
    error.textContent = '';
    if (w5Outage(draft.service)) { error.textContent = t('Ce service est interrompu : aucun rendez-vous possible pour le moment.'); return; }
    if (!draft.day || !draft.time) { error.textContent = t('Choisissez un créneau avant de confirmer.'); document.querySelector('#appt-slots input:not(:disabled)') && document.querySelector('#appt-slots input:not(:disabled)').focus(); return; }
    if (!name) { error.textContent = t('Indiquez votre nom.'); document.getElementById('appt-name').focus(); return; }
    if (w5SlotTaken(draft.service, draft.day, draft.time)) {
        error.textContent = t("Ce créneau vient d'être pris. Choisissez-en un autre.");
        w5Pick.time = '';
        w5RenderSlots(); w5RenderApptSummary();
        return;
    }
    if (w5Start(draft).getTime() <= Date.now()) { error.textContent = t('Ce créneau est passé. Choisissez-en un autre.'); w5Pick.time = ''; w5RenderSlots(); w5RenderApptSummary(); return; }

    // Un habitant ne peut pas avoir deux rendez-vous au même moment
    const owner = activeCitizen ? activeCitizen.matricule : '';
    const clash = w5Appointments().find(appt => !appt.cancelled && appt.day === draft.day && appt.time === draft.time && (appt.owner || '') === owner && (owner || appt.name === name));
    if (clash) { error.textContent = t('Vous avez déjà un rendez-vous à cette heure : {id}.', { id: clash.id }); return; }

    const appt = Object.assign(draft, { id: w5Reference(), name, owner, createdAt: new Date().toISOString(), cancelled: false, reminded: false });
    const list = w5Appointments();
    list.push(appt);
    w5SaveAppointments(list);
    if (typeof consoleLog === 'function') consoleLog(`[RDV] Rendez-vous ${appt.id} confirmé : ${appt.service}, ${appt.day} ${appt.time}.`);

    const form = document.getElementById('appt-form');
    const done = document.getElementById('appt-done');
    form.hidden = true;
    done.hidden = false;
    done.innerHTML = `
        <div class="tn-appt-done" tabindex="-1">
            <p class="tn-eyebrow"><i aria-hidden="true" class="fa-solid fa-circle-check"></i> ${escapeHtml(t('Rendez-vous confirmé'))}</p>
            <h3 class="font-orbitron font-bold text-lg text-[#E6F1F7] mt-1" data-no-i18n>${escapeHtml(appt.id)}</h3>
            ${w5SummaryHtml(appt, true)}
            <p class="tn-hint">${escapeHtml(t('Vous retrouvez ce rendez-vous, son rappel et son annulation dans « Mes rendez-vous ».'))}</p>
            <div class="tn-dialog-actions">
                <button type="button" class="tn-tab" data-ics="${escapeHtml(appt.id)}">Ajouter à mon agenda</button>
                <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-again>Prendre un autre rendez-vous</button>
            </div>
        </div>`;
    const heading = done.querySelector('.tn-appt-done');
    heading.focus();
    announce(t('Rendez-vous confirmé : {when}, {range}. Référence {id}.', { when: w5DateLabel(w5Start(appt)), range: w5Range(appt), id: appt.id }));
    w5RenderApptList();
    w5RenderSlots();
    renderNotifications();
}

function w5RenderApptList() {
    const list = document.getElementById('appt-list');
    if (!list) return;
    const now = Date.now();
    const mine = w5Appointments().filter(w5Mine).sort((a, b) => w5Start(a) - w5Start(b));
    if (!mine.length) { list.innerHTML = `<li class="tn-empty">${escapeHtml(t('Aucun rendez-vous pour le moment.'))}</li>`; return; }
    list.innerHTML = mine.map(appt => {
        const past = w5End(appt).getTime() < now;
        const canCancel = !past && (w5Start(appt).getTime() - now) / 60000 >= W5_CANCEL_LIMIT;
        const reminder = w5ReminderAt(appt);
        return `<li class="tn-appt-item ${past ? 'tn-appt-item--past' : ''}">
            <p class="tn-appt-head"><span class="tn-badge tn-badge--${past ? 'neutral' : 'progress'}">${escapeHtml(past ? t('Passé') : t('À venir'))}</span> <strong data-no-i18n>${escapeHtml(appt.id)}</strong></p>
            ${w5SummaryHtml(appt, false)}
            ${!past && reminder ? `<p class="tn-hint" data-no-i18n>${appt.reminded ? '✓ ' + escapeHtml(t('Rappel envoyé')) : escapeHtml(t('Rappel prévu : {when}', { when: w5ShortStamp(reminder) }))}</p>` : ''}
            ${past ? '' : `<div class="tn-row-actions">
                <button type="button" class="tn-tab" data-ics="${escapeHtml(appt.id)}">Ajouter à mon agenda</button>
                ${reminder ? `<button type="button" class="tn-tab" data-preview="${escapeHtml(appt.id)}">Voir le rappel</button>` : ''}
                ${canCancel ? `<button type="button" class="tn-tab tn-tab--danger" data-cancel="${escapeHtml(appt.id)}">Annuler</button>` : `<span class="tn-hint">${escapeHtml(t('Annulation fermée : contactez le service.'))}</span>`}
            </div>`}
        </li>`;
    }).join('');
}

function w5CancelAppointment(id) {
    const list = w5Appointments();
    const appt = list.find(item => item.id === id);
    if (!appt || appt.cancelled) return;
    if ((w5Start(appt).getTime() - Date.now()) / 60000 < W5_CANCEL_LIMIT) { announce(t('Annulation fermée : contactez le service.')); return; }
    const dialog = w4OpenDialog(t('Annuler ce rendez-vous ?'), `
        <div data-no-i18n>${w5SummaryHtml(appt, false)}</div>
        <div class="tn-dialog-actions">
            <button type="button" class="tn-tab" data-dialog-close data-autofocus data-no-i18n>${escapeHtml(t('Garder le rendez-vous'))}</button>
            <button type="button" class="tn-btn-danger" id="appt-cancel-yes" data-no-i18n>${escapeHtml(t('Annuler le rendez-vous'))}</button>
        </div>
    `);
    const yes = document.getElementById('appt-cancel-yes');
    if (yes) yes.addEventListener('click', () => {
        appt.cancelled = true;
        w5SaveAppointments(list);
        w4CloseDialog();
        announce(t('Rendez-vous {id} annulé. Le créneau est de nouveau libre.', { id }));
        w5RenderApptList(); w5RenderSlots(); w5RenderApptSummary(); renderNotifications();
    });
}

// Fichier .ics : le rendez-vous entre dans l'agenda de l'habitant, avec une alarme au même délai que le rappel
function w5DownloadIcs(id) {
    const appt = w5Appointments().find(item => item.id === id);
    if (!appt) return;
    const info = W5_APPT[appt.service];
    const stamp = date => `${date.getFullYear()}${w5Pad(date.getMonth() + 1)}${w5Pad(date.getDate())}T${w5Pad(date.getHours())}${w5Pad(date.getMinutes())}00`;
    const option = W5_REMINDERS.find(item => item.id === appt.reminder);
    const prep = w5PrepList(appt.service, appt.motif).join(', ');
    const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Terra Nova//Rendez-vous//FR', 'BEGIN:VEVENT',
        `UID:${appt.id}@terranova`, `DTSTAMP:${stamp(new Date())}`,
        `DTSTART:${stamp(w5Start(appt))}`, `DTEND:${stamp(w5End(appt))}`,
        `SUMMARY:Rendez-vous ${appt.service}`,
        `LOCATION:${info.place}`,
        `DESCRIPTION:Référence ${appt.id}. À apporter : ${prep}.`
    ];
    if (option) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel de rendez-vous', `TRIGGER:-PT${option.minutes}M`, 'END:VALARM');
    lines.push('END:VEVENT', 'END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${appt.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// --- F40 : le rappel ---
function w5ReminderTexts(appt) {
    const start = w5Start(appt);
    const info = W5_APPT[appt.service];
    return {
        title: t('Rappel : rendez-vous {service}', { service: t(appt.service) }),
        text: t('{when}, {range} — {place}. À apporter : {prep}.', { when: w5DateLabel(start), range: w5Range(appt), place: t(info.place), prep: w5PrepList(appt.service, appt.motif).map(item => t(item)).join(', ') })
    };
}

function w5ShowReminder(appt, preview) {
    const texts = w5ReminderTexts(appt);
    const toasts = document.getElementById('tn-toasts');
    if (toasts) {
        const toast = document.createElement('div');
        toast.className = 'tn-toast tn-alert--info';
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <div class="tn-alert-tags"><span class="tn-badge tn-badge--progress">${escapeHtml(t('Rappel'))}</span></div>
            <p class="tn-toast-title" data-no-i18n>${escapeHtml(texts.title)}</p>
            <p class="tn-hint" data-no-i18n>${escapeHtml(texts.text)}</p>
            <div class="tn-alert-actions">
                <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-action="open">Voir mes rendez-vous</button>
                <button type="button" class="tn-link" data-action="close">Fermer</button>
            </div>`;
        toast.querySelector('[data-action="open"]').addEventListener('click', () => { toast.remove(); if (typeof goToSection === 'function') goToSection('rendez-vous'); });
        toast.querySelector('[data-action="close"]').addEventListener('click', () => toast.remove());
        toasts.appendChild(toast);
    }
    announce(`${texts.title}. ${texts.text}`);
    if (!preview && tnLoad('tn_notify_enabled', false) && 'Notification' in window && Notification.permission === 'granted') {
        try { new Notification(texts.title, { body: texts.text, tag: appt.id }); } catch (err) { }
    }
}

function w5PreviewReminder(id) {
    const appt = w5Appointments().find(item => item.id === id);
    if (appt) w5ShowReminder(appt, true);
}

// Vérifie toutes les 15 s ; un rappel manqué pendant que le site était fermé s'affiche à la réouverture tant que le rendez-vous n'a pas eu lieu
function w5CheckReminders() {
    const list = w5Appointments();
    const now = Date.now();
    let changed = false;
    list.forEach(appt => {
        if (appt.cancelled || appt.reminded || !appt.reminder) return;
        const at = w5ReminderAt(appt);
        if (!at || at.getTime() > now || w5End(appt).getTime() < now) return;
        appt.reminded = true;
        appt.remindedAt = new Date(now).toISOString();
        changed = true;
        if (w5Mine(appt)) w5ShowReminder(appt, false);
    });
    if (changed) {
        w5SaveAppointments(list);
        w5RenderApptList();
        renderNotifications();
    }
}

function initReminders() {
    const base = tnNotificationItems;
    tnNotificationItems = function () {
        const items = base();
        const read = new Set(tnLoad('tn_read_items', []));
        w5Appointments().filter(appt => w5Mine(appt) && appt.reminded && w5End(appt).getTime() >= Date.now()).forEach(appt => {
            const texts = w5ReminderTexts(appt);
            const id = 'rdv-' + appt.id;
            items.push({
                id, level: 'info', title: texts.title, text: texts.text, date: appt.remindedAt || appt.createdAt, userText: true,
                action: `goToSection('rendez-vous'); markNotificationRead('${id}')`, read: read.has(id)
            });
        });
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };
    w5CheckReminders();
    setInterval(w5CheckReminders, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) w5CheckReminders(); });
}

// ==========================================================
// Démarrage
// ==========================================================
document.addEventListener('DOMContentLoaded', () => {
    const baseRefresh = refreshPersonalisedViews;
    refreshPersonalisedViews = function () {
        baseRefresh();
        w5RenderApptList();
        const name = document.getElementById('appt-name');
        if (name && activeCitizen) name.value = activeCitizen.name;
        w5RenderSecurity();
    };
    const baseSearch = tnSearchItems;
    tnSearchItems = function () {
        return baseSearch().concat([{
            group: 'Services', title: 'Prendre rendez-vous',
            text: 'rendez-vous rdv agent créneau réserver prendre rappel guichet horaire annuler',
            action: "goToSection('rendez-vous')"
        }, {
            group: 'Services', title: 'Services interrompus',
            text: 'maintenance incident indisponible interruption service panne retour',
            action: "goToSection('services-municipaux')"
        }]);
    };

    initLoginGuard();
    initServiceStatus();
    initAppointments();
    initReminders();
    initSecurityPanel();
    initServiceStatusAdmin();

    document.addEventListener('tn:langchange', () => {
        w5RenderStatuses();
        w5RenderApptForm();
        w5RenderApptList();
        w5RenderSecurity();
        w5RenderStatusAdminList();
        const guard = document.getElementById('login-guard');
        if (guard && !guard.hidden) w5HideGuard();
    });
});
