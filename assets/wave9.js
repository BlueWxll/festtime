// ==========================================
// VAGUE 9 — D02 connexion sans mot de passe (clé d'accès), F53 vérification en plus (2FA),
// F54 alerte « nouvel appareil », F55 récupérer mes informations personnelles,
// F56 récapitulatif téléchargeable de mes demandes.
// Chargé après assets/wave8.js ; réutilise t(), announce, escapeHtml, w4OpenDialog, goToSection,
// tnMyTickets, tnTicketHistory, tnNotificationItems, w6Notify, tnAuditRecord, tnHashCode.
// Limite assumée : le site est statique, les comptes vivent dans le navigateur (localStorage).
// Les clés d'accès et les codes à usage unique sont donc vérifiés localement, avec WebCrypto.
// ==========================================

const T = (source, params) => escapeHtml(String(t(source, params)));
function w9Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w9Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }
function w9Stamp(date = new Date()) { return typeof tnLocalStamp === 'function' ? tnLocalStamp(date) : date.toISOString(); }
function w9Fmt(stamp) { return typeof tnFormatStamp === 'function' ? tnFormatStamp(stamp) : String(stamp || ''); }

const W9_STORE = { sec: 'tn_w9_sec', device: 'tn_w9_device', demo: 'tn_w9_demo' };
const W9_VERIFY_MINUTES = 5;
const W9_MAX_FAILS = 5;
const W9_LOCK_SECONDS = 30;

// ---------- Outils binaires et cryptographiques ----------
function w9B64u(buffer) {
    const bytes = new Uint8Array(buffer);
    let text = '';
    bytes.forEach(byte => { text += String.fromCharCode(byte); });
    return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function w9FromB64u(text) {
    const pad = '='.repeat((4 - (text.length % 4)) % 4);
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + pad);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}
async function w9Sha(data) {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}
async function w9ShaHex(text) {
    return Array.from(await w9Sha(text)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function w9Random(length) { return crypto.getRandomValues(new Uint8Array(length)); }
function w9Id(prefix) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return `${prefix}-${Array.from(w9Random(5)).map(n => alphabet[n % alphabet.length]).join('')}`;
}

const W9_B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function w9B32Encode(bytes) {
    let bits = '';
    bytes.forEach(byte => { bits += byte.toString(2).padStart(8, '0'); });
    let out = '';
    for (let i = 0; i < bits.length; i += 5) out += W9_B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
    return out;
}
function w9B32Decode(text) {
    let bits = '';
    String(text).replace(/=+$/, '').toUpperCase().split('').forEach(char => {
        const index = W9_B32.indexOf(char);
        if (index >= 0) bits += index.toString(2).padStart(5, '0');
    });
    const out = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
    return new Uint8Array(out);
}

// TOTP (RFC 6238) : HMAC-SHA1, 6 chiffres, pas de 30 secondes
async function w9TotpAt(secret, step) {
    const key = await crypto.subtle.importKey('raw', w9B32Decode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const counter = new ArrayBuffer(8);
    const view = new DataView(counter);
    view.setUint32(0, Math.floor(step / 4294967296));
    view.setUint32(4, step >>> 0);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
    const offset = mac[mac.length - 1] & 15;
    const value = ((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
    return String(value % 1000000).padStart(6, '0');
}
function w9Step(now = Date.now()) { return Math.floor(now / 30000); }
function w9StepLeft(now = Date.now()) { return 30 - Math.floor((now % 30000) / 1000); }

// ---------- Données de sécurité par compte ----------
function w9All() { return w9Load(W9_STORE.sec, {}) || {}; }
function w9Sec(matricule) {
    const all = w9All();
    const sec = all[matricule] || {};
    sec.totp = sec.totp || null;
    sec.passkeys = sec.passkeys || [];
    sec.devices = sec.devices || [];
    sec.alerts = sec.alerts || [];
    sec.logins = sec.logins || [];
    sec.revoked = sec.revoked || [];
    return sec;
}
function w9SaveSec(matricule, sec) {
    const all = w9All();
    all[matricule] = sec;
    w9Save(W9_STORE.sec, all);
}
function w9Me() { return typeof activeCitizen !== 'undefined' && activeCitizen ? activeCitizen : null; }
function w9Audit(action, label, before, after) {
    const me = w9Me();
    if (typeof tnAuditRecord !== 'function' || !me) return;
    tnAuditRecord({ category: 'securite', action, target: `compte:${me.matricule}`, targetLabel: label || me.matricule, before: before || null, after: after || null });
}

// ---------- Cet appareil ----------
function w9DeviceLabel() {
    const ua = navigator.userAgent || '';
    const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Inconnu';
    const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Navigateur';
    return `${browser} · ${os}`;
}
function w9DeviceId() {
    let id = '';
    try { id = localStorage.getItem(W9_STORE.device) || ''; } catch (err) { }
    if (!id) { id = 'DV-' + w9B64u(w9Random(9)); try { localStorage.setItem(W9_STORE.device, id); } catch (err) { } }
    return id;
}

// À chaque connexion : on retient l'appareil, et on lève une alerte si le compte en connaissait d'autres
function w9OnLogin(citizen, method) {
    const sec = w9Sec(citizen.matricule);
    const id = w9DeviceId();
    const now = w9Stamp();
    let device = sec.devices.find(entry => entry.id === id);
    if (!device) {
        const hadOthers = sec.devices.length > 0;
        device = { id, label: w9DeviceLabel(), first: now, last: now, demo: false };
        sec.devices.push(device);
        if (hadOthers) sec.alerts.unshift({ id: w9Id('AL'), deviceId: id, label: device.label, at: now, method, demo: false, status: 'new' });
    }
    device.last = now;
    sec.logins.unshift({ at: now, method, deviceId: id, label: device.label });
    sec.logins = sec.logins.slice(0, 10);
    w9SaveSec(citizen.matricule, sec);
}

function w9Activate(citizen, method) {
    activeCitizen = citizen;
    localStorage.setItem('tn_active_citizen', JSON.stringify(citizen));
    if (typeof updateCitizenProfileUI === 'function') updateCitizenProfileUI();
    if (typeof refreshPersonalisedViews === 'function') { try { refreshPersonalisedViews(); } catch (err) { } }
    if (typeof closeAuthModal === 'function') closeAuthModal();
    w9OnLogin(citizen, method);
    if (typeof w6Notify === 'function') w6Notify(t('Connexion réussie. Bienvenue, {name}.', { name: citizen.name }));
    w9Refresh();
}

// ==========================================================
// F53 — La vérification en plus à la connexion
// ==========================================================
let w9Fails = {};

function w9LockLeft(matricule) {
    const sec = w9Sec(matricule);
    const until = sec.totp && sec.totp.lockUntil ? sec.totp.lockUntil : 0;
    return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

// Vérifie un code à 6 chiffres (±1 pas, sans rejouer un pas déjà utilisé) ou un code de secours
async function w9CheckSecondFactor(matricule, input) {
    const sec = w9Sec(matricule);
    const totp = sec.totp;
    if (!totp || !totp.enabled) return { ok: true };
    if (w9LockLeft(matricule) > 0) return { ok: false, locked: true };
    const clean = String(input || '').replace(/[\s-]/g, '').toUpperCase();
    let ok = false;
    let used = '';
    if (/^\d{6}$/.test(clean)) {
        const now = w9Step();
        for (const delta of [0, -1, 1]) {
            const step = now + delta;
            if (step <= (totp.lastStep || 0)) continue;
            if ((await w9TotpAt(totp.secret, step)) === clean) { ok = true; totp.lastStep = step; used = 'application'; break; }
        }
    } else if (clean.length >= 8) {
        const hash = await w9ShaHex(`${matricule}|recovery|${clean}`);
        const entry = (totp.recovery || []).find(item => !item.used && item.h === hash);
        if (entry) { entry.used = true; ok = true; used = 'secours'; }
    }
    if (ok) {
        totp.fails = 0; totp.lockUntil = 0;
    } else {
        totp.fails = (totp.fails || 0) + 1;
        if (totp.fails >= W9_MAX_FAILS) { totp.lockUntil = Date.now() + W9_LOCK_SECONDS * 1000; totp.fails = 0; }
    }
    w9SaveSec(matricule, sec);
    return { ok, used, locked: !ok && w9LockLeft(matricule) > 0, left: W9_MAX_FAILS - (totp.fails || 0) };
}

function w9AskSecondFactor(citizen) {
    w4OpenDialog(T('Une vérification en plus'), `
        <p class="tn-hint">${T('Votre code d\'accès est correct. Pour protéger votre compte, saisissez maintenant le code à 6 chiffres de votre application d\'authentification.')}</p>
        <form id="w9-2fa-form" autocomplete="off" novalidate>
            <label class="tn-field-label" for="w9-2fa-code">${T('Code à 6 chiffres, ou code de secours')}</label>
            <input id="w9-2fa-code" class="cyber-input" inputmode="text" autocomplete="one-time-code" maxlength="12" data-autofocus aria-describedby="w9-2fa-msg">
            <p id="w9-2fa-msg" class="tn-w9-msg" role="alert" aria-live="assertive" hidden></p>
            <p class="tn-hint">${T('Vous n\'avez plus votre téléphone ? Utilisez l\'un des codes de secours donnés à l\'activation : chacun ne sert qu\'une fois.')}</p>
            <div class="tn-dialog-actions">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${T('Valider')}</button>
                <button type="button" class="tn-tab" data-dialog-close>${T('Annuler la connexion')}</button>
            </div>
        </form>`);
    const form = document.getElementById('w9-2fa-form');
    const field = document.getElementById('w9-2fa-code');
    const msg = document.getElementById('w9-2fa-msg');
    let timer = null;
    const show = text => { msg.hidden = false; msg.textContent = text; };
    const tick = () => {
        const left = w9LockLeft(citizen.matricule);
        if (left > 0) show(t('Trop d\'essais. Nouvel essai possible dans {n} s.', { n: left }));
        else if (timer) { clearInterval(timer); timer = null; msg.hidden = true; }
    };
    if (w9LockLeft(citizen.matricule) > 0) { tick(); timer = setInterval(tick, 1000); }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (w9LockLeft(citizen.matricule) > 0) { tick(); return; }
        if (!field.value.trim()) { show(t('Saisissez le code affiché dans votre application.')); field.focus(); return; }
        const result = await w9CheckSecondFactor(citizen.matricule, field.value);
        if (result.ok) {
            const how = result.used === 'secours' ? 'code d\'accès + code de secours' : 'code d\'accès + application';
            w4CloseDialog();
            w9Activate(citizen, how);
            if (result.used === 'secours') {
                const left = (w9Sec(citizen.matricule).totp.recovery || []).filter(item => !item.used).length;
                setTimeout(() => w6Notify(t('Code de secours utilisé. Il vous en reste {n}.', { n: left })), 300);
            }
            return;
        }
        field.value = '';
        field.focus();
        if (result.locked) { tick(); timer = timer || setInterval(tick, 1000); }
        else show(t('Ce code n\'est pas valide. Il vous reste {n} essai(s).', { n: Math.max(result.left, 0) }));
        announce(t('Ce code n\'est pas valide.'));
    });
}

function w9GroupSecret(secret) { return secret.replace(/(.{4})/g, '$1 ').trim(); }

function w9OpenEnable2fa() {
    const me = w9Me();
    if (!me) return;
    const secret = w9B32Encode(w9Random(20));
    const uri = `otpauth://totp/Terra%20Nova:${encodeURIComponent(me.matricule)}?secret=${secret}&issuer=Terra%20Nova&algorithm=SHA1&digits=6&period=30`;
    w4OpenDialog(T('Activer la vérification en plus'), `
        <ol class="tn-w9-steps">
            <li>${T('Ouvrez une application d\'authentification (Google Authenticator, Aegis, FreeOTP, 1Password…).')}</li>
            <li>${T('Ajoutez un compte avec cette clé :')}
                <p class="tn-w9-secret" data-no-i18n><code id="w9-secret">${escapeHtml(w9GroupSecret(secret))}</code></p>
                <div class="tn-row-actions"><button type="button" class="tn-tab" id="w9-copy-secret">${T('Copier la clé')}</button>
                <button type="button" class="tn-tab" id="w9-copy-uri">${T('Copier le lien otpauth')}</button></div>
            </li>
            <li>${T('Saisissez le code à 6 chiffres qu\'elle affiche pour confirmer.')}</li>
        </ol>
        <label class="tn-w8-check"><input type="checkbox" id="w9-demo-on"> <span>${T('Démonstration : afficher une application d\'authentification simulée à l\'écran')}</span></label>
        <form id="w9-enable-form" autocomplete="off" novalidate>
            <label class="tn-field-label" for="w9-enable-code">${T('Code à 6 chiffres')}</label>
            <input id="w9-enable-code" class="cyber-input" inputmode="numeric" maxlength="7" autocomplete="one-time-code" data-autofocus aria-describedby="w9-enable-msg">
            <p id="w9-enable-msg" class="tn-w9-msg" role="alert" hidden></p>
            <div class="tn-dialog-actions">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${T('Confirmer et activer')}</button>
                <button type="button" class="tn-tab" data-dialog-close>${T('Annuler')}</button>
            </div>
        </form>`);
    const body = document.getElementById('tn-dialog-body');
    body.addEventListener('click', async event => {
        const copy = event.target.closest('#w9-copy-secret, #w9-copy-uri');
        if (!copy) return;
        try { await navigator.clipboard.writeText(copy.id === 'w9-copy-secret' ? secret : uri); announce(t('Copié.')); } catch (err) { announce(t('Copie impossible : sélectionnez le texte à la main.')); }
    });
    const demo = document.getElementById('w9-demo-on');
    demo.addEventListener('change', () => {
        if (demo.checked) { w9DemoAdd(me.matricule, secret); } else { w9DemoRemove(me.matricule); }
    });
    document.getElementById('w9-enable-form').addEventListener('submit', async event => {
        event.preventDefault();
        const msg = document.getElementById('w9-enable-msg');
        const code = document.getElementById('w9-enable-code').value.replace(/\s/g, '');
        let ok = false;
        const now = w9Step();
        if (/^\d{6}$/.test(code)) {
            for (const delta of [0, -1, 1]) { if ((await w9TotpAt(secret, now + delta)) === code) { ok = true; break; } }
        }
        if (!ok) { msg.hidden = false; msg.textContent = t('Ce code n\'est pas valide. Vérifiez l\'heure de votre téléphone et réessayez.'); return; }
        const codes = w9NewRecoveryCodes();
        const sec = w9Sec(me.matricule);
        sec.totp = { secret, enabled: true, since: w9Stamp(), lastStep: now - 1, fails: 0, lockUntil: 0, recovery: [] };
        for (const code of codes) sec.totp.recovery.push({ h: await w9ShaHex(`${me.matricule}|recovery|${code.replace('-', '')}`), used: false });
        w9SaveSec(me.matricule, sec);
        w9Audit('Vérification en plus activée', me.matricule, { verification: 'inactive' }, { verification: 'active' });
        w9ShowRecovery(codes, true);
        w9Refresh();
    });
}

function w9NewRecoveryCodes() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const make = () => Array.from(w9Random(8)).map(n => alphabet[n % alphabet.length]).join('');
    return Array.from({ length: 8 }, () => { const raw = make(); return `${raw.slice(0, 4)}-${raw.slice(4)}`; });
}

function w9ShowRecovery(codes, fresh) {
    w4OpenDialog(T('Vos codes de secours'), `
        <p class="tn-hint">${T('Notez-les maintenant : ils ne seront plus jamais affichés. Chaque code sert une seule fois si vous perdez votre téléphone.')}</p>
        <ul class="tn-w9-codes" data-no-i18n>${codes.map(code => `<li><code>${escapeHtml(code)}</code></li>`).join('')}</ul>
        <div class="tn-row-actions"><button type="button" class="tn-tab" id="w9-copy-codes">${T('Copier')}</button>
        <button type="button" class="tn-tab" id="w9-save-codes">${T('Télécharger (.txt)')}</button></div>
        <label class="tn-w8-check"><input type="checkbox" id="w9-codes-ok"> <span>${T('J\'ai conservé ces codes en lieu sûr.')}</span></label>
        <div class="tn-dialog-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" id="w9-codes-close" data-dialog-close disabled>${T('Terminer')}</button></div>`);
    const ok = document.getElementById('w9-codes-ok');
    const close = document.getElementById('w9-codes-close');
    ok.addEventListener('change', () => { close.disabled = !ok.checked; });
    document.getElementById('w9-copy-codes').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(codes.join('\n')); announce(t('Copié.')); } catch (err) { announce(t('Copie impossible : sélectionnez le texte à la main.')); }
    });
    document.getElementById('w9-save-codes').addEventListener('click', () => {
        const me = w9Me();
        w9Download(`terra-nova-codes-de-secours-${me ? me.matricule : ''}.txt`, 'text/plain', `Terra Nova — codes de secours (${me ? me.matricule : ''})\n${codes.join('\n')}\n`);
    });
}

// Désactiver, ou renouveler les codes de secours : on redemande un code valide
function w9OpenConfirmSecond(action) {
    const me = w9Me();
    if (!me) return;
    const title = action === 'disable' ? 'Désactiver la vérification en plus' : 'Renouveler les codes de secours';
    w4OpenDialog(T(title), `
        <p class="tn-hint">${T(action === 'disable' ? 'Votre compte sera protégé par le seul code d\'accès. Confirmez avec un code de votre application.' : 'Les anciens codes ne fonctionneront plus. Confirmez avec un code de votre application.')}</p>
        <form id="w9-confirm-form" autocomplete="off" novalidate>
            <label class="tn-field-label" for="w9-confirm-code">${T('Code à 6 chiffres, ou code de secours')}</label>
            <input id="w9-confirm-code" class="cyber-input" maxlength="12" autocomplete="one-time-code" data-autofocus>
            <p id="w9-confirm-msg" class="tn-w9-msg" role="alert" hidden></p>
            <div class="tn-dialog-actions">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${T('Confirmer')}</button>
                <button type="button" class="tn-tab" data-dialog-close>${T('Annuler')}</button>
            </div>
        </form>`);
    document.getElementById('w9-confirm-form').addEventListener('submit', async event => {
        event.preventDefault();
        const msg = document.getElementById('w9-confirm-msg');
        const result = await w9CheckSecondFactor(me.matricule, document.getElementById('w9-confirm-code').value);
        if (!result.ok) {
            msg.hidden = false;
            msg.textContent = result.locked ? t('Trop d\'essais. Nouvel essai possible dans {n} s.', { n: w9LockLeft(me.matricule) }) : t('Ce code n\'est pas valide.');
            return;
        }
        const sec = w9Sec(me.matricule);
        if (action === 'disable') {
            sec.totp = null;
            w9SaveSec(me.matricule, sec);
            w9DemoRemove(me.matricule);
            w9Audit('Vérification en plus désactivée', me.matricule, { verification: 'active' }, { verification: 'inactive' });
            w4CloseDialog();
            w6Notify(t('La vérification en plus est désactivée.'));
        } else {
            const codes = w9NewRecoveryCodes();
            sec.totp.recovery = [];
            for (const code of codes) sec.totp.recovery.push({ h: await w9ShaHex(`${me.matricule}|recovery|${code.replace('-', '')}`), used: false });
            w9SaveSec(me.matricule, sec);
            w9Audit('Codes de secours renouvelés', me.matricule);
            w9ShowRecovery(codes, false);
        }
        w9Refresh();
    });
}

// ---------- Application d'authentification simulée (démonstration) ----------
function w9Demo() { return w9Load(W9_STORE.demo, {}) || {}; }
function w9DemoAdd(matricule, secret) { const demo = w9Demo(); demo[matricule] = secret; w9Save(W9_STORE.demo, demo); w9DemoRender(); }
function w9DemoRemove(matricule) { const demo = w9Demo(); delete demo[matricule]; w9Save(W9_STORE.demo, demo); w9DemoRender(); }

async function w9DemoRender() {
    let box = document.getElementById('w9-demo');
    const demo = w9Demo();
    const ids = Object.keys(demo);
    if (!ids.length) { if (box) box.remove(); return; }
    if (!box) {
        box = document.createElement('div');
        box.id = 'w9-demo';
        box.className = 'tn-w9-demo';
        box.setAttribute('role', 'complementary');
        document.body.appendChild(box);
    }
    const step = w9Step();
    const rows = [];
    for (const id of ids) {
        const code = await w9TotpAt(demo[id], step);
        rows.push(`<li><span class="tn-w9-demo-id" data-no-i18n>${escapeHtml(id)}</span><strong class="tn-w9-demo-code" data-no-i18n>${code.slice(0, 3)} ${code.slice(3)}</strong></li>`);
    }
    box.innerHTML = `
        <div class="tn-w9-demo-head"><span>${T('Application d\'authentification (démo)')}</span>
        <button type="button" class="tn-w9-demo-x" data-w9="demo-close" aria-label="${T('Masquer l\'application de démonstration')}"><i aria-hidden="true" class="fa-solid fa-xmark"></i></button></div>
        <ul>${rows.join('')}</ul>
        <p class="tn-w9-demo-foot" data-no-i18n>${T('Nouveau code dans {n} s. Sur un vrai compte, ce code n\'est visible que sur votre téléphone.', { n: w9StepLeft() })}</p>`;
}

// ==========================================================
// D02 — Clés d'accès (WebAuthn) : connexion sans mot de passe
// ==========================================================
function w9PasskeySupported() { return !!(window.PublicKeyCredential && navigator.credentials && window.crypto && crypto.subtle); }

function w9DerToRaw(der) {
    let pos = 2;
    if (der[1] & 0x80) pos = 2 + (der[1] & 0x7f);
    const read = () => {
        pos++;
        const length = der[pos++];
        let part = der.slice(pos, pos + length);
        pos += length;
        while (part.length > 32 && part[0] === 0) part = part.slice(1);
        const out = new Uint8Array(32);
        out.set(part, 32 - part.length);
        return out;
    };
    const r = read();
    const s = read();
    const raw = new Uint8Array(64);
    raw.set(r, 0); raw.set(s, 32);
    return raw;
}

async function w9CreatePasskey() {
    const me = w9Me();
    if (!me) return;
    if (!w9PasskeySupported()) { announce(t('Ce navigateur ne gère pas les clés d\'accès.')); w9Msg('signin', t('Ce navigateur ne gère pas les clés d\'accès. Utilisez votre code d\'accès.')); return; }
    const challenge = w9Random(32);
    try {
        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { name: 'Terra Nova', id: location.hostname },
                user: { id: new TextEncoder().encode(me.matricule), name: me.matricule, displayName: me.name },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
                timeout: 60000,
                attestation: 'none'
            }
        });
        const client = JSON.parse(new TextDecoder().decode(credential.response.clientDataJSON));
        if (client.type !== 'webauthn.create' || client.challenge !== w9B64u(challenge)) throw new Error('challenge');
        const spki = credential.response.getPublicKey ? credential.response.getPublicKey() : null;
        if (!spki) throw new Error('publickey');
        const sec = w9Sec(me.matricule);
        sec.passkeys.push({ id: w9B64u(credential.rawId), pub: w9B64u(spki), label: w9DeviceLabel(), created: w9Stamp(), last: null, counter: 0 });
        w9SaveSec(me.matricule, sec);
        w9Audit('Clé d\'accès ajoutée', me.matricule, { cles: sec.passkeys.length - 1 }, { cles: sec.passkeys.length });
        w6Notify(t('Clé d\'accès enregistrée. Vous pouvez maintenant vous connecter sans mot de passe.'));
        w9Refresh();
    } catch (err) {
        w9Msg('signin', err && err.name === 'NotAllowedError' ? t('Création annulée ou refusée. Rien n\'a été enregistré.') : t('La clé d\'accès n\'a pas pu être créée sur cet appareil.'));
    }
}

async function w9VerifyAssertion(passkey, challenge, assertion) {
    const client = JSON.parse(new TextDecoder().decode(assertion.response.clientDataJSON));
    if (client.type !== 'webauthn.get' || client.challenge !== w9B64u(challenge) || client.origin !== location.origin) return { ok: false };
    const authData = new Uint8Array(assertion.response.authenticatorData);
    const rpHash = await w9Sha(location.hostname);
    for (let i = 0; i < 32; i++) if (authData[i] !== rpHash[i]) return { ok: false };
    const flags = authData[32];
    if (!(flags & 1) || !(flags & 4)) return { ok: false };   // présence + vérification de l'utilisateur
    const counter = new DataView(authData.buffer, authData.byteOffset + 33, 4).getUint32(0);
    if (counter !== 0 && passkey.counter && counter <= passkey.counter) return { ok: false };
    const key = await crypto.subtle.importKey('spki', w9FromB64u(passkey.pub), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const hash = await w9Sha(new Uint8Array(assertion.response.clientDataJSON));
    const signed = new Uint8Array(authData.length + 32);
    signed.set(authData, 0); signed.set(hash, authData.length);
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, w9DerToRaw(new Uint8Array(assertion.response.signature)), signed);
    return { ok: valid, counter };
}

async function w9PasskeyLogin() {
    const msg = text => { const box = document.getElementById('w9-login-msg'); if (box) { box.hidden = !text; box.textContent = text || ''; } };
    msg('');
    if (!w9PasskeySupported()) { msg(t('Ce navigateur ne gère pas les clés d\'accès. Utilisez votre code d\'accès.')); return; }
    const field = document.getElementById('login-matricule');
    const query = field ? field.value.trim().toLowerCase() : '';
    const accounts = registeredCitizens.filter(c => !query || c.matricule.toLowerCase() === query || c.name.toLowerCase().includes(query));
    let allow = [];
    accounts.forEach(account => w9Sec(account.matricule).passkeys.forEach(key => allow.push({ account, key })));
    if (query && !allow.length) { msg(t('Aucune clé d\'accès n\'est enregistrée pour ce compte sur cet appareil. Utilisez votre code d\'accès, puis ajoutez une clé dans « Mon compte ».')); return; }
    if (!query) allow = [];
    const challenge = w9Random(32);
    try {
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge, rpId: location.hostname, userVerification: 'required', timeout: 60000,
                allowCredentials: allow.map(item => ({ type: 'public-key', id: w9FromB64u(item.key.id) }))
            }
        });
        const id = w9B64u(assertion.rawId);
        let hit = null;
        registeredCitizens.forEach(account => { const key = w9Sec(account.matricule).passkeys.find(entry => entry.id === id); if (key) hit = { account, key }; });
        if (!hit) { msg(t('Cette clé d\'accès n\'est liée à aucun compte connu ici.')); return; }
        if (hit.account.suspended) { msg(t('Ce compte est suspendu. Contactez les services municipaux.')); return; }
        const result = await w9VerifyAssertion(hit.key, challenge, assertion);
        if (!result.ok) { msg(t('La clé d\'accès n\'a pas pu être vérifiée. Réessayez ou utilisez votre code d\'accès.')); return; }
        const sec = w9Sec(hit.account.matricule);
        const stored = sec.passkeys.find(entry => entry.id === id);
        stored.last = w9Stamp(); stored.counter = result.counter || 0;
        w9SaveSec(hit.account.matricule, sec);
        w9Activate(hit.account, 'clé d\'accès');
        w9Audit('Connexion par clé d\'accès', hit.account.matricule);
    } catch (err) {
        msg(err && err.name === 'NotAllowedError' ? t('Connexion annulée. Vous pouvez réessayer ou utiliser votre code d\'accès.') : t('La connexion par clé d\'accès a échoué. Utilisez votre code d\'accès.'));
    }
}

function w9InitLoginForm() {
    const form = document.getElementById('form-login');
    if (!form || document.getElementById('w9-passkey-login')) return;
    const submit = form.querySelector('button[type="submit"]');
    const box = document.createElement('div');
    box.className = 'tn-w9-login';
    box.innerHTML = `
        <p class="tn-w9-or" aria-hidden="true"><span>${T('ou')}</span></p>
        <button type="button" id="w9-passkey-login" class="btn-cyber px-4 py-2.5 text-xs font-bold uppercase w-full"><i aria-hidden="true" class="fa-solid fa-fingerprint"></i> ${T('Me connecter sans mot de passe')}</button>
        <p class="tn-hint">${T('Avec la clé d\'accès de cet appareil : empreinte, visage ou code de l\'appareil. Indiquez votre matricule d\'abord, ou laissez vide pour choisir une clé.')}</p>
        <p id="w9-login-msg" class="tn-w9-msg" role="alert" hidden></p>`;
    if (submit) submit.after(box); else form.appendChild(box);
    document.getElementById('w9-passkey-login').addEventListener('click', w9PasskeyLogin);
}

// ==========================================================
// F54 — Alerte « nouvel appareil »
// ==========================================================
const W9_DEMO_DEVICES = ['Chrome · Android', 'Safari · iOS', 'Edge · Windows', 'Firefox · Linux'];

function w9PendingAlerts() {
    const me = w9Me();
    return me ? w9Sec(me.matricule).alerts.filter(alert => alert.status === 'new') : [];
}

function w9SimulateDevice() {
    const me = w9Me();
    if (!me) return;
    const sec = w9Sec(me.matricule);
    const label = W9_DEMO_DEVICES.filter(name => !sec.devices.some(device => device.label === name && device.demo))[0] || W9_DEMO_DEVICES[0];
    const id = 'DV-' + w9B64u(w9Random(9));
    const now = w9Stamp();
    sec.devices.push({ id, label, first: now, last: now, demo: true });
    sec.alerts.unshift({ id: w9Id('AL'), deviceId: id, label, at: now, method: 'code d\'accès', demo: true, status: 'new' });
    sec.logins.unshift({ at: now, method: 'code d\'accès', deviceId: id, label });
    sec.logins = sec.logins.slice(0, 10);
    w9SaveSec(me.matricule, sec);
    w9Refresh();
    if (typeof renderNotifications === 'function') renderNotifications();
    announce(t('Nouvelle connexion à votre compte depuis {device}.', { device: label }));
}

function w9AlertAnswer(id, mine) {
    const me = w9Me();
    if (!me) return;
    const sec = w9Sec(me.matricule);
    const alert = sec.alerts.find(entry => entry.id === id);
    if (!alert) return;
    if (mine) {
        alert.status = 'ok';
        w9SaveSec(me.matricule, sec);
        w9Audit('Nouvel appareil confirmé', alert.label, null, { appareil: alert.label });
        w6Notify(t('Merci, cet appareil est marqué comme le vôtre.'));
    } else {
        alert.status = 'revoked';
        sec.devices = sec.devices.filter(device => device.id !== alert.deviceId);
        sec.revoked.unshift({ id: alert.deviceId, label: alert.label, at: w9Stamp() });
        w9SaveSec(me.matricule, sec);
        w9Audit('Connexion inconnue signalée', alert.label, { appareil: alert.label }, { appareil: 'retiré' });
        w9OpenSecure(alert);
    }
    w9Refresh();
    if (typeof renderNotifications === 'function') renderNotifications();
}

function w9RemoveDevice(id) {
    const me = w9Me();
    if (!me || id === w9DeviceId()) return;
    const sec = w9Sec(me.matricule);
    const device = sec.devices.find(entry => entry.id === id);
    if (!device) return;
    sec.devices = sec.devices.filter(entry => entry.id !== id);
    sec.revoked.unshift({ id, label: device.label, at: w9Stamp() });
    w9SaveSec(me.matricule, sec);
    w9Audit('Appareil retiré', device.label, { appareil: device.label }, { appareil: 'retiré' });
    w6Notify(t('Appareil retiré : il devra de nouveau s\'identifier.'));
    w9Refresh();
}

// « Ce n'était pas moi » : l'appareil est retiré, puis on guide vers les deux gestes utiles
function w9OpenSecure(alert) {
    const me = w9Me();
    const sec = w9Sec(me.matricule);
    const hasTotp = !!(sec.totp && sec.totp.enabled);
    const min = (document.getElementById('reg-pwd') && document.getElementById('reg-pwd').minLength > 0) ? document.getElementById('reg-pwd').minLength : 6;
    w4OpenDialog(T('Sécurisons votre compte'), `
        <p class="tn-hint"><strong>${T('Fait :')}</strong> ${T('l\'appareil « {device} » est retiré de votre compte.', { device: alert.label })}</p>
        <p class="tn-hint"><strong>${T('À faire maintenant :')}</strong> ${T('changez votre code d\'accès, puis activez la vérification en plus si ce n\'est pas déjà fait.')}</p>
        <form id="w9-pwd-form" autocomplete="off" novalidate>
            ${me.pwdHash ? `<label class="tn-field-label" for="w9-pwd-old">${T('Code d\'accès actuel')}</label><input id="w9-pwd-old" type="password" class="cyber-input" autocomplete="current-password" data-autofocus>` : ''}
            <label class="tn-field-label" for="w9-pwd-new">${T('Nouveau code d\'accès')}</label>
            <input id="w9-pwd-new" type="password" class="cyber-input" autocomplete="new-password" minlength="${min}" ${me.pwdHash ? '' : 'data-autofocus'}>
            <p id="w9-pwd-msg" class="tn-w9-msg" role="alert" hidden></p>
            <div class="tn-dialog-actions">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${T('Changer mon code d\'accès')}</button>
                ${hasTotp ? '' : `<button type="button" class="tn-tab" id="w9-go-2fa">${T('Activer la vérification en plus')}</button>`}
                <button type="button" class="tn-tab" data-dialog-close>${T('Plus tard')}</button>
            </div>
        </form>`);
    const go = document.getElementById('w9-go-2fa');
    if (go) go.addEventListener('click', () => { w4CloseDialog(); w9OpenEnable2fa(); });
    document.getElementById('w9-pwd-form').addEventListener('submit', async event => {
        event.preventDefault();
        const msg = document.getElementById('w9-pwd-msg');
        const next = document.getElementById('w9-pwd-new').value;
        const fail = text => { msg.hidden = false; msg.textContent = text; };
        if (me.pwdHash) {
            const old = document.getElementById('w9-pwd-old').value;
            if ((await tnHashCode(old, me.matricule)) !== me.pwdHash) { fail(t('Code de sécurité incorrect.')); return; }
        }
        if (next.length < min) { fail(t('Le nouveau code doit compter au moins {n} caractères.', { n: min })); return; }
        const account = w4Account(me.matricule) || me;
        account.pwdHash = await tnHashCode(next, me.matricule);
        if (account !== me) me.pwdHash = account.pwdHash;
        w4SaveCitizens();
        localStorage.setItem('tn_active_citizen', JSON.stringify(me));
        w9Audit('Code d\'accès changé', me.matricule);
        w4CloseDialog();
        w6Notify(t('Votre code d\'accès a été changé.'));
        w9Refresh();
    });
}

// ---------- Bandeau « nouvelle connexion » : visible tout de suite, avec les deux réponses possibles ----------
function w9RenderBanner() {
    let strip = document.getElementById('w9-strip');
    const pending = w9PendingAlerts();
    if (!pending.length) { if (strip) strip.hidden = true; return; }
    if (!strip) {
        strip = document.createElement('div');
        strip.id = 'w9-strip';
        strip.className = 'tn-w9-strip';
        strip.setAttribute('role', 'alert');
        const anchor = document.getElementById('w8-strip') || document.getElementById('tn-locbar');
        if (anchor) anchor.after(strip); else document.body.prepend(strip);
    }
    const first = pending[0];
    strip.hidden = false;
    strip.innerHTML = `
        <p><i aria-hidden="true" class="fa-solid fa-shield-halved"></i>
        <strong>${T('Nouvelle connexion à votre compte')}</strong> — <span data-no-i18n>${escapeHtml(first.label)}${first.demo ? ' (' + escapeHtml(t('simulation')) + ')' : ''}, ${escapeHtml(w9Fmt(first.at))}</span>.
        ${pending.length > 1 ? `<span data-no-i18n>${escapeHtml(t('{n} autre(s) en attente.', { n: pending.length - 1 }))}</span>` : ''}</p>
        <div class="tn-w9-strip-actions">
            <button type="button" class="tn-tab" data-w9="alert-mine" data-id="${escapeHtml(first.id)}">${T('C\'était moi')}</button>
            <button type="button" class="tn-btn-danger" data-w9="alert-notme" data-id="${escapeHtml(first.id)}">${T('Ce n\'était pas moi')}</button>
        </div>`;
}

// ==========================================================
// La section « Mon compte »
// ==========================================================
function w9Msg(card, text) {
    const box = document.querySelector(`#w9-${card} .tn-w9-msg`);
    if (box) { box.hidden = !text; box.textContent = text || ''; }
}

function w9LoggedOut(what) {
    return `<div class="tn-empty"><p>${T(what)}</p>
        <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w9="login">${T('Me connecter')}</button></div>`;
}

function w9RenderSignin() {
    const body = document.getElementById('w9-signin-body');
    if (!body) return;
    const me = w9Me();
    if (!me) { body.innerHTML = w9LoggedOut('Connectez-vous pour gérer vos clés d\'accès.'); return; }
    const sec = w9Sec(me.matricule);
    body.innerHTML = `
        <p class="tn-w9-lead">${T('Connectez-vous avec votre empreinte, votre visage ou le code de votre appareil, sans retenir de mot de passe. La clé reste sur l\'appareil : personne ne peut la copier ni la deviner.')}</p>
        ${sec.passkeys.length ? `<ul class="tn-w9-list">${sec.passkeys.map(key => `
            <li><div><strong data-no-i18n>${escapeHtml(key.label)}</strong>
                <span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('Ajoutée le {d}', { d: w9Fmt(key.created) }))} · ${escapeHtml(key.last ? t('Dernière connexion : {d}', { d: w9Fmt(key.last) }) : t('Jamais utilisée'))}</span></div>
                <button type="button" class="tn-tab" data-w9="key-remove" data-id="${escapeHtml(key.id)}">${T('Retirer')}</button></li>`).join('')}</ul>`
        : `<p class="tn-hint">${T('Aucune clé d\'accès pour l\'instant.')}</p>`}
        <div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w9="key-add"><i aria-hidden="true" class="fa-solid fa-fingerprint"></i> ${T('Ajouter une clé d\'accès sur cet appareil')}</button></div>
        <p class="tn-w9-msg" role="alert" hidden></p>
        <p class="tn-hint">${T('Si vous perdez l\'appareil, votre code d\'accès continue de fonctionner. Retirez ensuite la clé perdue ici.')}</p>`;
}

function w9Render2fa() {
    const body = document.getElementById('w9-2fa-body');
    if (!body) return;
    const me = w9Me();
    if (!me) { body.innerHTML = w9LoggedOut('Connectez-vous pour gérer la vérification en plus.'); return; }
    const totp = w9Sec(me.matricule).totp;
    if (!totp || !totp.enabled) {
        body.innerHTML = `
            <p class="tn-w9-lead">${T('En plus de votre code d\'accès, un code à 6 chiffres change toutes les 30 secondes sur votre téléphone. Même si quelqu\'un connaît votre code d\'accès, il ne peut pas entrer sans lui.')}</p>
            <p><span class="tn-badge tn-badge--pending">${T('Non activée')}</span></p>
            <div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w9="2fa-on"><i aria-hidden="true" class="fa-solid fa-mobile-screen"></i> ${T('Activer la vérification en plus')}</button></div>`;
        return;
    }
    const left = (totp.recovery || []).filter(item => !item.used).length;
    body.innerHTML = `
        <p><span class="tn-badge tn-badge--resolved">${T('Activée')}</span> <span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('depuis le {d}', { d: w9Fmt(totp.since) }))}</span></p>
        <p class="tn-w9-lead">${T('À chaque connexion par code d\'accès, un code de votre application est demandé.')}</p>
        <p class="tn-hint" data-no-i18n>${escapeHtml(t('Codes de secours restants : {n} sur 8.', { n: left }))}${left <= 2 ? ' ' + escapeHtml(t('Pensez à les renouveler.')) : ''}</p>
        <div class="tn-row-actions">
            <button type="button" class="tn-tab" data-w9="2fa-codes">${T('Renouveler les codes de secours')}</button>
            <button type="button" class="tn-tab" data-w9="2fa-off">${T('Désactiver')}</button>
            <button type="button" class="tn-tab" data-w9="demo-show">${T('Afficher l\'application de démonstration')}</button>
        </div>`;
}

function w9RenderDevices() {
    const body = document.getElementById('w9-devices-body');
    if (!body) return;
    const me = w9Me();
    if (!me) { body.innerHTML = w9LoggedOut('Connectez-vous pour voir les appareils de votre compte.'); return; }
    const sec = w9Sec(me.matricule);
    const here = w9DeviceId();
    const pending = sec.alerts.filter(alert => alert.status === 'new');
    body.innerHTML = `
        <p class="tn-w9-lead">${T('Quand votre compte est utilisé depuis un appareil jamais vu, vous êtes prévenu(e) ici, dans la cloche et dans un bandeau en haut de page. Vous répondez en un clic.')}</p>
        ${pending.length ? `<ul class="tn-w9-alerts">${pending.map(alert => `
            <li class="tn-w9-alert"><p><strong>${T('Nouvelle connexion')}</strong> — <span data-no-i18n>${escapeHtml(alert.label)}${alert.demo ? ' (' + escapeHtml(t('simulation')) + ')' : ''}, ${escapeHtml(w9Fmt(alert.at))}</span></p>
            <div class="tn-row-actions"><button type="button" class="tn-tab" data-w9="alert-mine" data-id="${escapeHtml(alert.id)}">${T('C\'était moi')}</button>
            <button type="button" class="tn-btn-danger" data-w9="alert-notme" data-id="${escapeHtml(alert.id)}">${T('Ce n\'était pas moi')}</button></div></li>`).join('')}</ul>`
        : `<p class="tn-hint">${T('Aucune alerte en attente.')}</p>`}
        <h4 class="tn-w8-sub">${T('Appareils connus')}</h4>
        <ul class="tn-w9-list">${sec.devices.map(device => `
            <li><div><strong data-no-i18n>${escapeHtml(device.label)}</strong>${device.id === here ? ` <span class="tn-badge tn-badge--progress">${T('Cet appareil')}</span>` : ''}${device.demo ? ` <span class="tn-badge tn-badge--pending">${T('Simulation')}</span>` : ''}
                <span class="tn-w9-meta" data-no-i18n>${escapeHtml(t('Vu pour la première fois : {d}', { d: w9Fmt(device.first) }))} · ${escapeHtml(t('Dernière activité : {d}', { d: w9Fmt(device.last) }))}</span></div>
                ${device.id === here ? '' : `<button type="button" class="tn-tab" data-w9="device-remove" data-id="${escapeHtml(device.id)}">${T('Retirer')}</button>`}</li>`).join('') || `<li>${T('Aucun appareil enregistré. Il apparaîtra à votre prochaine connexion.')}</li>`}</ul>
        <h4 class="tn-w8-sub">${T('Dernières connexions')}</h4>
        <ul class="tn-w9-list">${sec.logins.map(entry => `<li><div><strong data-no-i18n>${escapeHtml(w9Fmt(entry.at))}</strong> <span class="tn-w9-meta" data-no-i18n>${escapeHtml(entry.label)} · ${escapeHtml(t(entry.method))}</span></div></li>`).join('') || `<li>${T('Aucune connexion enregistrée.')}</li>`}</ul>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-w9="simulate"><i aria-hidden="true" class="fa-solid fa-flask"></i> ${T('Démonstration : simuler une connexion depuis un autre appareil')}</button></div>
        <p class="tn-hint">${T('Les comptes de ce site vivent dans votre navigateur : une vraie connexion depuis un autre appareil ne peut pas être vue ici. La simulation montre ce que vous verriez.')}</p>`;
}

// ---------- F55 : mes informations personnelles ----------
let w9Verified = { matricule: '', until: 0 };
function w9IsVerified() { const me = w9Me(); return !!(me && w9Verified.matricule === me.matricule && w9Verified.until > Date.now()); }

function w9OpenStepUp() {
    const me = w9Me();
    if (!me) return;
    const sec = w9Sec(me.matricule);
    const needPwd = !!me.pwdHash;
    const needTotp = !!(sec.totp && sec.totp.enabled);
    const hasKey = sec.passkeys.length > 0 && w9PasskeySupported();
    w4OpenDialog(T('Confirmez que c\'est bien vous'), `
        <p class="tn-hint">${T('Votre dossier contient des informations personnelles. Avant de l\'afficher, nous vérifions votre identité. La confirmation reste valable {n} minutes.', { n: W9_VERIFY_MINUTES })}</p>
        ${hasKey ? `<button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase w-full" id="w9-step-key"><i aria-hidden="true" class="fa-solid fa-fingerprint"></i> ${T('Confirmer avec ma clé d\'accès')}</button><p class="tn-w9-or"><span>${T('ou')}</span></p>` : ''}
        <form id="w9-step-form" autocomplete="off" novalidate>
            ${needPwd ? `<label class="tn-field-label" for="w9-step-pwd">${T('Code d\'accès')}</label><input id="w9-step-pwd" type="password" class="cyber-input" autocomplete="current-password" ${hasKey ? '' : 'data-autofocus'}>` : ''}
            ${needTotp ? `<label class="tn-field-label" for="w9-step-code">${T('Code à 6 chiffres, ou code de secours')}</label><input id="w9-step-code" class="cyber-input" maxlength="12" autocomplete="one-time-code">` : ''}
            <p id="w9-step-msg" class="tn-w9-msg" role="alert" hidden></p>
            <div class="tn-dialog-actions">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" ${hasKey ? 'data-autofocus' : ''}>${T(needPwd || needTotp ? 'Confirmer' : 'Afficher mon dossier')}</button>
                <button type="button" class="tn-tab" data-dialog-close>${T('Annuler')}</button>
            </div>
        </form>`);
    const msg = document.getElementById('w9-step-msg');
    const fail = text => { msg.hidden = false; msg.textContent = text; };
    const pass = method => {
        w9Verified = { matricule: me.matricule, until: Date.now() + W9_VERIFY_MINUTES * 60000 };
        w9Audit('Dossier personnel consulté', me.matricule, null, { verification: method });
        w4CloseDialog();
        w9RenderDossier();
    };
    const keyButton = document.getElementById('w9-step-key');
    if (keyButton) keyButton.addEventListener('click', async () => {
        const challenge = w9Random(32);
        try {
            const assertion = await navigator.credentials.get({ publicKey: { challenge, rpId: location.hostname, userVerification: 'required', timeout: 60000, allowCredentials: sec.passkeys.map(key => ({ type: 'public-key', id: w9FromB64u(key.id) })) } });
            const key = sec.passkeys.find(entry => entry.id === w9B64u(assertion.rawId));
            const result = key ? await w9VerifyAssertion(key, challenge, assertion) : { ok: false };
            if (result.ok) { key.counter = result.counter || 0; key.last = w9Stamp(); w9SaveSec(me.matricule, sec); pass('clé d\'accès'); } else fail(t('La clé d\'accès n\'a pas pu être vérifiée.'));
        } catch (err) { fail(t('Confirmation annulée.')); }
    });
    document.getElementById('w9-step-form').addEventListener('submit', async event => {
        event.preventDefault();
        if (needPwd && (await tnHashCode(document.getElementById('w9-step-pwd').value, me.matricule)) !== me.pwdHash) { fail(t('Code de sécurité incorrect.')); return; }
        if (needTotp) {
            const result = await w9CheckSecondFactor(me.matricule, document.getElementById('w9-step-code').value);
            if (!result.ok) { fail(result.locked ? t('Trop d\'essais. Nouvel essai possible dans {n} s.', { n: w9LockLeft(me.matricule) }) : t('Ce code n\'est pas valide.')); return; }
        }
        pass(needTotp ? 'code d\'accès + application' : needPwd ? 'code d\'accès' : 'session');
    });
}

function w9Appointments(me) {
    const list = w9Load('tn_appointments', []) || [];
    return list.filter(appt => appt && (appt.owner === me.matricule || (!appt.owner && appt.name === me.name)));
}

// Données du dossier : jamais de secret ni d'empreinte (code d'accès, clés, codes de secours)
function w9DossierData() {
    const me = w9Me();
    const account = (typeof w4Account === 'function' ? w4Account(me.matricule) : null) || me;
    const tickets = tnMyTickets();
    const sec = w9Sec(me.matricule);
    const supports = typeof w8Supports === 'function' ? w8Supports() : {};
    const concerns = typeof w8Concerns === 'function' ? w8Concerns().filter(item => item.owner === me.matricule) : [];
    const open = tickets.filter(ticket => ticket.status !== 'Résolu').length;
    return {
        exporte_le: new Date().toISOString(),
        identite: { nom: me.name, matricule: me.matricule, dome: me.dome || '', profil: account.role || me.role || '', inscrit_le: account.joined || me.joined || '' },
        demandes: tickets.map(ticket => ({ numero: ticket.id, objet: tnTicketTitle(ticket), service: ticket.service || '', statut: ticket.status, depose_le: ticket.date, priorite: ticket.priority || '', message: ticket.message || '' })),
        rendez_vous: w9Appointments(me).map(appt => ({ numero: appt.id, service: appt.service, jour: appt.day, heure: appt.time, annule: !!appt.cancelled })),
        inquietudes: concerns.map(item => ({ numero: item.id, sujet: item.topic || '', statut: (item.history[item.history.length - 1] || {}).status || '' })),
        soutiens: Object.keys(supports).filter(id => supports[id].some(entry => entry.key === me.matricule)).map(id => ({ demande: id })),
        securite: {
            verification_en_plus: !!(sec.totp && sec.totp.enabled),
            cles_d_acces: sec.passkeys.map(key => ({ appareil: key.label, ajoutee_le: key.created })),
            appareils: sec.devices.map(device => ({ appareil: device.label, premiere_vue: device.first, derniere_activite: device.last })),
            dernieres_connexions: sec.logins
        },
        resume: { demandes_total: tickets.length, demandes_en_cours: open, demandes_resolues: tickets.length - open }
    };
}

function w9DossierHtmlBody(data, forFile) {
    const e = escapeHtml;
    const rows = (headers, list) => list.length
        ? `<div class="tn-w9-tablewrap"><table class="tn-w9-table"><thead><tr>${headers.map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>${list.map(r => `<tr>${r.map(c => `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
        : `<p class="tn-hint">${e(t('Rien à afficher.'))}</p>`;
    const s = data.resume;
    const sentence = [
        t('Vous avez {n} demande(s) enregistrée(s) : {open} en cours, {done} résolue(s).', { n: s.demandes_total, open: s.demandes_en_cours, done: s.demandes_resolues }),
        data.rendez_vous.length ? t('{n} rendez-vous sont notés à votre nom.', { n: data.rendez_vous.length }) : t('Aucun rendez-vous n\'est noté à votre nom.'),
        data.securite.verification_en_plus ? t('La vérification en plus est activée sur votre compte.') : t('La vérification en plus n\'est pas activée : nous vous la recommandons.'),
        t('{n} appareil(s) connu(s) et {k} clé(s) d\'accès.', { n: data.securite.appareils.length, k: data.securite.cles_d_acces.length })
    ];
    const id = data.identite;
    return `
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('En bref'))}</h4>
            <ul class="tn-w9-brief">${sentence.map(line => `<li>${e(line)}</li>`).join('')}</ul></section>
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('Votre identité'))}</h4>
            <dl class="tn-w9-dl"><div><dt>${e(t('Nom'))}</dt><dd>${e(id.nom)}</dd></div><div><dt>${e(t('Matricule'))}</dt><dd>${e(id.matricule)}</dd></div>
            <div><dt>${e(t('Dôme'))}</dt><dd>${e(id.dome || '—')}</dd></div><div><dt>${e(t('Profil'))}</dt><dd>${e(id.profil || '—')}</dd></div>
            <div><dt>${e(t('Inscrit le'))}</dt><dd>${e(id.inscrit_le || '—')}</dd></div></dl></section>
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('Vos demandes'))}</h4>
            ${rows([t('Numéro'), t('Objet'), t('Service'), t('Statut'), t('Déposée le')], data.demandes.map(d => [d.numero, d.objet, t(d.service), t(d.statut), w9Fmt(d.depose_le)]))}</section>
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('Vos rendez-vous'))}</h4>
            ${rows([t('Numéro'), t('Service'), t('Jour'), t('Heure'), t('Annulé')], data.rendez_vous.map(d => [d.numero, d.service, d.jour, d.heure, d.annule ? t('Oui') : t('Non')]))}</section>
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('Vos inquiétudes et soutiens'))}</h4>
            ${rows([t('Numéro'), t('Sujet'), t('Statut')], data.inquietudes.map(d => [d.numero, d.sujet, t(d.statut)]))}
            <p class="tn-hint">${e(t('{n} demande(s) d\'autres habitants soutenue(s).', { n: data.soutiens.length }))}</p></section>
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('Sécurité de votre compte'))}</h4>
            ${rows([t('Appareil'), t('Première vue'), t('Dernière activité')], data.securite.appareils.map(d => [d.appareil, w9Fmt(d.premiere_vue), w9Fmt(d.derniere_activite)]))}</section>
        <section class="tn-w9-block"><h4 class="tn-w8-sub">${e(t('Ce que la ville ne garde pas'))}</h4>
            <ul class="tn-w9-brief"><li>${e(t('Votre code d\'accès : seule une empreinte irréversible est conservée.'))}</li>
            <li>${e(t('Vos clés d\'accès privées : elles ne quittent jamais votre appareil.'))}</li>
            <li>${e(t('Votre position en continu : aucune.'))}</li></ul></section>`;
}

function w9RenderDossier() {
    const body = document.getElementById('w9-dossier-body');
    if (!body) return;
    const me = w9Me();
    if (!me) { body.innerHTML = w9LoggedOut('Connectez-vous pour récupérer vos informations personnelles.'); return; }
    if (!w9IsVerified()) {
        body.innerHTML = `
            <p class="tn-w9-lead">${T('Récupérez en un clic tout ce que la ville possède sur vous, présenté en phrases simples, avec des tableaux lisibles. Pour votre sécurité, nous vous demandons d\'abord de confirmer votre identité.')}</p>
            <div class="tn-row-actions"><button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w9="dossier-open"><i aria-hidden="true" class="fa-solid fa-folder-open"></i> ${T('Afficher mon dossier')}</button></div>`;
        return;
    }
    const data = w9DossierData();
    const left = Math.max(1, Math.ceil((w9Verified.until - Date.now()) / 60000));
    body.innerHTML = `
        <p class="tn-hint" data-no-i18n>${escapeHtml(t('Dossier généré le {d}. Il se verrouille dans {n} min.', { d: w9Fmt(w9Stamp()), n: left }))}</p>
        <div class="tn-row-actions" role="group" aria-label="${T('Récupérer mon dossier')}">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w9="dossier-html"><i aria-hidden="true" class="fa-solid fa-file-lines"></i> ${T('Télécharger (lisible, .html)')}</button>
            <button type="button" class="tn-tab" data-w9="dossier-json">${T('Télécharger (.json)')}</button>
            <button type="button" class="tn-tab" data-w9="dossier-print">${T('Imprimer / PDF')}</button>
            <button type="button" class="tn-tab" data-w9="dossier-lock">${T('Verrouiller')}</button>
        </div>
        ${w9DossierHtmlBody(data, false)}`;
}

// ---------- F56 : récapitulatif de mes demandes ----------
let w9RecapFilter = { status: 'all', period: 'all', service: '' };

function w9TicketDays(ticket) {
    const history = tnTicketHistory(ticket);
    const start = tnParseStamp(history[0] && history[0].date ? history[0].date : ticket.date);
    if (!start) return null;
    const done = history.slice().reverse().find(step => step.status === 'Résolu' && step.date);
    const end = ticket.status === 'Résolu' ? (done ? tnParseStamp(done.date) : null) : new Date();
    if (!end) return null;
    return Math.max(0, Math.round((end - start) / 86400000));
}

function w9RecapRows() {
    const now = Date.now();
    const days = { '30': 30, '90': 90, 'all': 0 }[w9RecapFilter.period] || 0;
    return tnMyTickets().filter(ticket => {
        if (w9RecapFilter.status === 'open' && ticket.status === 'Résolu') return false;
        if (w9RecapFilter.status === 'done' && ticket.status !== 'Résolu') return false;
        if (w9RecapFilter.service && ticket.service !== w9RecapFilter.service) return false;
        if (days) { const start = tnParseStamp(ticket.date); if (!start || now - start.getTime() > days * 86400000) return false; }
        return true;
    }).map(ticket => {
        const history = tnTicketHistory(ticket);
        const last = history[history.length - 1] || {};
        const next = typeof W8_STATE !== 'undefined' && W8_STATE[ticket.status] ? t(W8_STATE[ticket.status].todo) : '';
        return {
            id: ticket.id, objet: tnTicketTitle(ticket), service: ticket.service || '', lieu: tnTicketPlace(ticket),
            statut: ticket.status, depose: ticket.date, maj: last.date || ticket.date, jours: w9TicketDays(ticket), etape: next
        };
    });
}

function w9RecapSummary(rows) {
    const byStatus = {};
    const byService = {};
    rows.forEach(row => { byStatus[row.statut] = (byStatus[row.statut] || 0) + 1; byService[row.service] = (byService[row.service] || 0) + 1; });
    const done = rows.filter(row => row.statut === 'Résolu' && row.jours !== null).map(row => row.jours).sort((a, b) => a - b);
    const median = done.length ? done[Math.floor(done.length / 2)] : null;
    const openRows = rows.filter(row => row.statut !== 'Résolu' && row.jours !== null).sort((a, b) => b.jours - a.jours);
    return { total: rows.length, byStatus, byService, median, oldest: openRows[0] || null };
}

function w9RecapText(summary) {
    if (!summary.total) return t('Aucune demande ne correspond à ces critères.');
    const parts = [t('{n} demande(s) au total.', { n: summary.total })];
    const states = Object.keys(summary.byStatus).map(status => `${summary.byStatus[status]} ${t(status).toLowerCase()}`);
    parts.push(states.join(', ') + '.');
    if (summary.median !== null) parts.push(t('Les demandes résolues l\'ont été en {n} jour(s) (valeur médiane).', { n: summary.median }));
    if (summary.oldest) parts.push(t('La plus ancienne demande encore ouverte a {n} jour(s) : {id}.', { n: summary.oldest.jours, id: summary.oldest.id }));
    return parts.join(' ');
}

function w9Csv(rows) {
    const head = [t('Numéro'), t('Objet'), t('Service'), t('Lieu'), t('Statut'), t('Déposée le'), t('Dernière mise à jour'), t('Durée (jours)'), t('Prochaine étape')];
    const cell = value => { const text = String(value === null || value === undefined ? '' : value); return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; };
    // Un texte qui commencerait par = + - @ serait lu comme une formule par un tableur : on le neutralise
    const safe = value => /^[=+\-@]/.test(String(value)) ? `'${value}` : value;
    const lines = [head.map(cell).join(';')].concat(rows.map(row => [row.id, safe(row.objet), t(row.service), row.lieu, t(row.statut), row.depose, row.maj, row.jours === null ? '' : row.jours, row.etape].map(cell).join(';')));
    return '﻿' + lines.join('\r\n') + '\r\n';
}

function w9RecapHtml(rows, summary) {
    const e = escapeHtml;
    return `<h4 class="tn-w8-sub">${e(t('En bref'))}</h4><p class="tn-w9-lead">${e(w9RecapText(summary))}</p>
        ${rows.length ? `<div class="tn-w9-tablewrap"><table class="tn-w9-table"><caption class="sr-only">${e(t('Récapitulatif de mes demandes'))}</caption><thead><tr>${[t('Numéro'), t('Objet'), t('Service'), t('Statut'), t('Déposée le'), t('Durée (jours)'), t('Prochaine étape')].map(h => `<th scope="col">${e(h)}</th>`).join('')}</tr></thead><tbody>
        ${rows.map(row => `<tr><td>${e(row.id)}</td><td>${e(row.objet)}</td><td>${e(t(row.service))}</td><td>${e(t(row.statut))}</td><td>${e(w9Fmt(row.depose))}</td><td>${e(row.jours === null ? '—' : row.jours)}</td><td>${e(row.etape)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
}

function w9RenderRecap() {
    const body = document.getElementById('w9-recap-body');
    if (!body) return;
    const me = w9Me();
    if (!me) { body.innerHTML = w9LoggedOut('Connectez-vous pour télécharger le récapitulatif de vos demandes.'); return; }
    const all = tnMyTickets();
    const services = Array.from(new Set(all.map(ticket => ticket.service).filter(Boolean)));
    const rows = w9RecapRows();
    const summary = w9RecapSummary(rows);
    const select = (id, label, options, value) => `<div><label class="tn-field-label" for="${id}">${T(label)}</label><select id="${id}" class="cyber-input">${options.map(o => `<option value="${escapeHtml(o[0])}"${o[0] === value ? ' selected' : ''}>${escapeHtml(o[2] ? o[1] : t(o[1]))}</option>`).join('')}</select></div>`;
    body.innerHTML = `
        <div class="tn-w8-filters">
            ${select('w9-recap-status', 'Statut', [['all', 'Toutes'], ['open', 'En cours'], ['done', 'Résolues']], w9RecapFilter.status)}
            ${select('w9-recap-period', 'Période', [['all', 'Depuis le début'], ['30', '30 derniers jours'], ['90', '90 derniers jours']], w9RecapFilter.period)}
            ${select('w9-recap-service', 'Service', [['', 'Tous les services']].concat(services.map(name => [name, t(name), true])), w9RecapFilter.service)}
        </div>
        <div class="tn-row-actions" role="group" aria-label="${T('Télécharger')}">
            <button type="button" class="btn-cyber px-4 py-2 text-xs font-bold uppercase" data-w9="recap-csv" ${rows.length ? '' : 'disabled'}><i aria-hidden="true" class="fa-solid fa-file-csv"></i> ${T('Télécharger (tableur, .csv)')}</button>
            <button type="button" class="tn-tab" data-w9="recap-html" ${rows.length ? '' : 'disabled'}>${T('Télécharger (lisible, .html)')}</button>
            <button type="button" class="tn-tab" data-w9="recap-print" ${rows.length ? '' : 'disabled'}>${T('Imprimer / PDF')}</button>
        </div>
        ${w9RecapHtml(rows, summary)}`;
}

// ---------- Téléchargements ----------
function w9Download(name, mime, content) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

const W9_DOC_CSS = 'body{font:15px/1.55 system-ui,sans-serif;color:#10222c;max-width:56rem;margin:2rem auto;padding:0 1rem}h1{font-size:1.5rem}h4{margin:1.5rem 0 .5rem;font-size:1.05rem;border-bottom:2px solid #00B8FF;padding-bottom:.2rem}table{border-collapse:collapse;width:100%;font-size:.875rem}th,td{border:1px solid #9bb;padding:.35rem .5rem;text-align:left;vertical-align:top}th{background:#e6f3f9}dl div{display:flex;gap:.5rem;margin:.15rem 0}dt{font-weight:700;min-width:8rem}.tn-w9-tablewrap{overflow-x:auto}.sr-only{position:absolute;left:-9999px}@media print{body{margin:0}}';

function w9DocHtml(title, inner) {
    const me = w9Me();
    return `<!doctype html><html lang="${typeof tnLang !== 'undefined' ? tnLang : 'fr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${W9_DOC_CSS}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(me ? `${me.name} — ${me.matricule}` : '')} · ${escapeHtml(w9Fmt(w9Stamp()))}</p>${inner}</body></html>`;
}

function w9Print(html) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(frame);
    frame.srcdoc = html;
    frame.onload = () => {
        try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (err) { announce(t('Impression impossible : téléchargez le fichier lisible.')); }
        setTimeout(() => frame.remove(), 60000);
    };
}

function w9Slug() { const me = w9Me(); return me ? me.matricule : 'compte'; }

// ---------- Construction de la section ----------
function w9Refresh() {
    w9RenderSignin(); w9Render2fa(); w9RenderDevices(); w9RenderDossier(); w9RenderRecap(); w9RenderBanner();
    w9DemoRender();
}

function initCompte() {
    const anchor = document.getElementById('participation') || document.getElementById('espace-citoyen');
    if (!anchor || document.getElementById('compte')) return;
    const section = document.createElement('section');
    section.id = 'compte';
    section.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-cyan-900/40';
    section.setAttribute('aria-labelledby', 'compte-title');
    section.dataset.crumb = 'Mon compte';
    const card = (id, eyebrow, title) => `
        <div class="holo-card p-6 relative" id="w9-${id}" role="region" aria-labelledby="w9-${id}-title">
            <div class="tn-eyebrow">${T(eyebrow)}</div>
            <h3 id="w9-${id}-title" class="font-orbitron font-bold text-lg text-[#E6F1F7] uppercase mt-1">${T(title)}</h3>
            <div id="w9-${id}-body" class="mt-3"></div>
        </div>`;
    section.innerHTML = `
        <div class="mb-8">
            <div class="inline-flex items-center space-x-2 text-xs text-[#00B8FF] uppercase tracking-widest mb-1">
                <i aria-hidden="true" class="fa-solid fa-shield-halved"></i><span>${T('Protéger et récupérer')}</span>
            </div>
            <h2 id="compte-title" class="text-3xl font-black font-orbitron text-[#00B8FF] uppercase tracking-wider">${T('MON COMPTE')}</h2>
            <p class="text-xs text-[#6F8696] mt-1 max-w-xl">${T('Se connecter sans mot de passe, ajouter une vérification, être prévenu(e) d\'une connexion inconnue, et récupérer vos informations ou le récapitulatif de vos demandes.')}</p>
            <div class="tn-row-actions mt-3" role="group" aria-label="${T('Aller à')}">
                <button type="button" class="tn-tab" data-w9-jump="w9-signin">${T('Clé d\'accès')}</button>
                <button type="button" class="tn-tab" data-w9-jump="w9-2fa">${T('Vérification en plus')}</button>
                <button type="button" class="tn-tab" data-w9-jump="w9-devices">${T('Appareils et alertes')}</button>
                <button type="button" class="tn-tab" data-w9-jump="w9-dossier">${T('Mes informations')}</button>
                <button type="button" class="tn-tab" data-w9-jump="w9-recap">${T('Mes demandes')}</button>
            </div>
        </div>
        <div class="space-y-8">
            ${card('signin', 'Sans mot de passe', 'CONNEXION PAR CLÉ D\'ACCÈS')}
            ${card('2fa', 'Sécurité renforcée', 'VÉRIFICATION EN PLUS')}
            ${card('devices', 'Vous gardez la main', 'APPAREILS ET ALERTES DE CONNEXION')}
            ${card('dossier', 'Vos droits', 'MES INFORMATIONS PERSONNELLES')}
            ${card('recap', 'Pour garder une trace', 'RÉCAPITULATIF DE MES DEMANDES')}
        </div>`;
    anchor.after(section);

    if (!TN_SECTIONS.some(entry => entry.id === 'compte')) {
        const index = TN_SECTIONS.findIndex(entry => entry.id === 'participation');
        TN_SECTIONS.splice(index >= 0 ? index + 1 : TN_SECTIONS.length, 0, { id: 'compte', label: 'Mon compte' });
    }
    const navLink = document.querySelector('#site-nav a[href="#participation"]') || document.querySelector('#site-nav a[href="#espace-citoyen"]');
    if (navLink) {
        const link = document.createElement('a');
        link.href = '#compte';
        link.className = navLink.className;
        link.innerHTML = `<i aria-hidden="true" class="fa-solid fa-shield-halved text-[11px] text-[#00B8FF]"></i><span>${T('MON COMPTE')}</span>`;
        navLink.after(link);
    }

    document.addEventListener('click', event => {
        const jump = event.target.closest('[data-w9-jump]');
        if (jump) { const target = document.getElementById(jump.dataset.w9Jump); if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); const heading = target.querySelector('h3'); if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); } } return; }
        const button = event.target.closest('[data-w9]');
        if (!button || button.disabled) return;
        const id = button.dataset.id;
        switch (button.dataset.w9) {
            case 'login': if (typeof openAuthModal === 'function') openAuthModal('login'); break;
            case 'key-add': w9CreatePasskey(); break;
            case 'key-remove': {
                const me = w9Me(); if (!me) break;
                const sec = w9Sec(me.matricule);
                sec.passkeys = sec.passkeys.filter(key => key.id !== id);
                w9SaveSec(me.matricule, sec);
                w9Audit('Clé d\'accès retirée', me.matricule, { cles: sec.passkeys.length + 1 }, { cles: sec.passkeys.length });
                w9Refresh(); announce(t('Clé d\'accès retirée.')); break;
            }
            case '2fa-on': w9OpenEnable2fa(); break;
            case '2fa-off': w9OpenConfirmSecond('disable'); break;
            case '2fa-codes': w9OpenConfirmSecond('codes'); break;
            case 'demo-show': {
                const me = w9Me(); const totp = me ? w9Sec(me.matricule).totp : null;
                if (totp) { w9DemoAdd(me.matricule, totp.secret); announce(t('Application de démonstration affichée.')); }
                break;
            }
            case 'demo-close': w9Save(W9_STORE.demo, {}); w9DemoRender(); break;
            case 'alert-mine': w9AlertAnswer(id, true); break;
            case 'alert-notme': w9AlertAnswer(id, false); break;
            case 'device-remove': w9RemoveDevice(id); break;
            case 'simulate': w9SimulateDevice(); break;
            case 'dossier-open': w9OpenStepUp(); break;
            case 'dossier-lock': w9Verified = { matricule: '', until: 0 }; w9RenderDossier(); announce(t('Dossier verrouillé.')); break;
            case 'dossier-json': if (w9IsVerified()) w9Download(`terra-nova-mon-dossier-${w9Slug()}.json`, 'application/json', JSON.stringify(w9DossierData(), null, 2)); break;
            case 'dossier-html': if (w9IsVerified()) w9Download(`terra-nova-mon-dossier-${w9Slug()}.html`, 'text/html', w9DocHtml(t('Mes informations personnelles'), w9DossierHtmlBody(w9DossierData(), true))); break;
            case 'dossier-print': if (w9IsVerified()) w9Print(w9DocHtml(t('Mes informations personnelles'), w9DossierHtmlBody(w9DossierData(), true))); break;
            case 'recap-csv': { const rows = w9RecapRows(); if (rows.length) { w9Download(`terra-nova-mes-demandes-${w9Slug()}.csv`, 'text/csv', w9Csv(rows)); announce(t('Récapitulatif téléchargé.')); } break; }
            case 'recap-html': { const rows = w9RecapRows(); if (rows.length) w9Download(`terra-nova-mes-demandes-${w9Slug()}.html`, 'text/html', w9DocHtml(t('Récapitulatif de mes demandes'), w9RecapHtml(rows, w9RecapSummary(rows)))); break; }
            case 'recap-print': { const rows = w9RecapRows(); if (rows.length) w9Print(w9DocHtml(t('Récapitulatif de mes demandes'), w9RecapHtml(rows, w9RecapSummary(rows)))); break; }
        }
    });
    section.addEventListener('change', event => {
        if (event.target.id === 'w9-recap-status') w9RecapFilter.status = event.target.value;
        else if (event.target.id === 'w9-recap-period') w9RecapFilter.period = event.target.value;
        else if (event.target.id === 'w9-recap-service') w9RecapFilter.service = event.target.value;
        else return;
        w9RenderRecap();
        const again = document.getElementById(event.target.id);
        if (again) again.focus();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initCompte();
    w9InitLoginForm();

    // Connexion : la vérification en plus s'insère entre le code d'accès et l'ouverture de la session
    if (typeof handleLoginSubmit === 'function') {
        const base = handleLoginSubmit;
        handleLoginSubmit = async function (event) {
            event.preventDefault();
            const query = (document.getElementById('login-matricule').value || '').trim().toLowerCase();
            const found = registeredCitizens.find(c => c.matricule.toLowerCase() === query || c.name.toLowerCase().includes(query));
            const sec = found ? w9Sec(found.matricule) : null;
            const hadSession = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
            if (!found || !sec || !sec.totp || !sec.totp.enabled || hadSession === found) {
                const result = await base(event);
                const now = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
                if (now && now !== hadSession) w9AfterPlainLogin(now);
                return result;
            }
            const nativeAlert = window.alert;
            const captured = [];
            window.alert = message => { captured.push(String(message)); };
            try { await base(event); } finally { window.alert = nativeAlert; }
            if (activeCitizen && activeCitizen !== hadSession && activeCitizen.matricule === found.matricule) {
                // Code d'accès correct, mais la session ne s'ouvre pas avant le second contrôle
                activeCitizen = hadSession;
                localStorage.setItem('tn_active_citizen', hadSession ? JSON.stringify(hadSession) : 'null');
                if (typeof updateCitizenProfileUI === 'function') updateCitizenProfileUI();
                const pwd = document.getElementById('login-pwd'); if (pwd) pwd.value = '';
                w9AskSecondFactor(found);
            } else {
                captured.forEach(message => nativeAlert.call(window, message));
            }
        };
    }

    // Inscription : le premier appareil est retenu dès la création du compte
    if (typeof handleRegisterSubmit === 'function') {
        const baseRegister = handleRegisterSubmit;
        handleRegisterSubmit = async function (event) {
            const before = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
            const result = await baseRegister.apply(this, arguments);
            const now = typeof activeCitizen !== 'undefined' ? activeCitizen : null;
            if (now && now !== before) { w9OnLogin(now, 'inscription'); w9Refresh(); }
            return result;
        };
    }

    // La cloche : alertes de connexion en attente
    if (typeof tnNotificationItems === 'function') {
        const baseItems = tnNotificationItems;
        tnNotificationItems = function () {
            const items = baseItems.apply(this, arguments);
            const read = new Set(tnLoad('tn_read_items', []));
            w9PendingAlerts().forEach(alert => items.push({
                id: `W9-${alert.id}`, level: 'warning', date: String(alert.at).replace(' ', 'T'), userText: true, read: read.has(`W9-${alert.id}`),
                title: t('Nouvelle connexion à votre compte'),
                text: `${alert.label}${alert.demo ? ' (' + t('simulation') + ')' : ''} — ${w9Fmt(alert.at)}. ${t('Si ce n\'était pas vous, retirez cet appareil.')}`,
                action: "goToSection('compte')"
            }));
            return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        };
    }

    if (typeof updateCitizenProfileUI === 'function') {
        const baseUi = updateCitizenProfileUI;
        updateCitizenProfileUI = function () { const result = baseUi.apply(this, arguments); w9Verified = w9IsVerified() ? w9Verified : { matricule: '', until: 0 }; w9Refresh(); if (typeof renderNotifications === 'function') { try { renderNotifications(); } catch (err) { } } return result; };
    }

    window.addEventListener('storage', event => { if (event.key === W9_STORE.sec || event.key === 'tn_active_citizen' || event.key === 'tn_tickets') { w9Refresh(); if (typeof renderNotifications === 'function') renderNotifications(); } });
    document.addEventListener('tn:langchange', () => { w9Refresh(); const old = document.getElementById('w9-passkey-login'); if (old) { old.closest('.tn-w9-login').remove(); w9InitLoginForm(); } });
    setInterval(() => {
        if (document.hidden) return;
        w9DemoRender();
        if (w9Verified.until && !w9IsVerified()) { w9Verified = { matricule: '', until: 0 }; w9RenderDossier(); }
    }, 1000);
    w9Refresh();
});

// Une connexion par code d'accès simple (sans second contrôle) est elle aussi retenue pour la liste des appareils
function w9AfterPlainLogin(citizen) {
    w9OnLogin(citizen, 'code d\'accès');
    w9Refresh();
    if (typeof renderNotifications === 'function') { try { renderNotifications(); } catch (err) { } }
}
