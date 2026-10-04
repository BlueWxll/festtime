// ==========================================
// VAGUE 14 — Espace agents et suivi des demandes
// F75 regrouper les demandes similaires, F80 classer par urgence, F84 répondre depuis l'interface agent,
// F86 urgence médicale signalée sur la plateforme, F79 trier et filtrer ses demandes, F83 accusé de réception signé,
// F76 laisser un commentaire après un service.
// Chargé après assets/wave13b.js ; réutilise citizenTickets, renderAgentTicketsTable, renderTicketCard, renderTrackerList,
// updateTicketStatus, tnNotificationItems, w4OpenDialog, w4SaveTickets, tnMedicalUrgency, w13Words, w13Match, announce, t().
// ==========================================

const W14T = (source, params) => escapeHtml(String(t(source, params)));
const W14_SORT_KEY = 'tn_w14_sort';

function w14Pref(key, fallback) { try { return localStorage.getItem(key) || fallback; } catch (err) { return fallback; } }
function w14SetPref(key, value) { try { localStorage.setItem(key, value); } catch (err) { } }
function w14Persist() { if (typeof w4SaveTickets === 'function') w4SaveTickets(); else { try { localStorage.setItem('tn_tickets', JSON.stringify(citizenTickets)); } catch (err) { } } }
function w14Ticket(id) { return citizenTickets.find(ticket => ticket.id === id); }
function w14IsAgent() { return typeof currentRole !== 'undefined' && currentRole !== 'citizen'; }
function w14Plural(n, one, many) { return n > 1 ? many : one; }

// ------------------------------------------
// F80 — Urgence : score expliqué, jamais une « boîte noire »
// ------------------------------------------
const W14_DANGER = ['fuite', 'incendie', 'feu', 'fumee', 'brule', 'blesse', 'blessure', 'panne', 'coupure', 'breche', 'decompression', 'inondation', 'danger', 'dangereux', 'urgent', 'urgence', 'explosion', 'electrocution', 'intoxication', 'gaz', 'irrespirable', 'effondrement', 'bloque', 'coince', 'enferme'];
const W14_VULNERABLE = ['enfant', 'bebe', 'nourrisson', 'personne agee', 'handicap', 'fauteuil', 'enceinte', 'malade'];
const W14_LEVELS = [
    { rank: 0, id: 'low', label: 'Basse', cls: 'neutral' },
    { rank: 1, id: 'medium', label: 'Moyenne', cls: 'pending' },
    { rank: 2, id: 'high', label: 'Haute', cls: 'progress' },
    { rank: 3, id: 'critical', label: 'Critique', cls: 'danger' }
];

function w14Hours(ticket) {
    const date = tnParseStamp(ticket.date);
    return date ? Math.max(0, (Date.now() - date.getTime()) / 3600000) : 0;
}

function w14Urgency(ticket, groupSize) {
    if (ticket.status === 'Résolu') return { rank: -1, id: 'closed', label: 'Clôturée', cls: 'neutral', score: -1, reasons: [] };
    const text = ' ' + w13Fold([ticket.subject, ticket.message, ticket.kind].join(' ')) + ' ';
    const reasons = [];
    let score = 0;
    if (ticket.medicalUrgent || tnMedicalUrgency(text).urgent) { score += 6; reasons.push('Urgence médicale signalée'); }
    if (ticket.priority === 'Critique') { score += 3; reasons.push('Urgence déclarée par l\'habitant : critique'); }
    else if (ticket.priority === 'Élevé') { score += 1.5; reasons.push('Urgence déclarée par l\'habitant : élevée'); }
    const danger = W14_DANGER.filter(word => text.includes(' ' + word + ' ') || text.includes(' ' + word + 's ') || text.includes(' ' + word + 'e '));
    if (danger.length) { score += 2; reasons.push(t('Mot de danger : {word}', { word: danger[0] })); }
    if (W14_VULNERABLE.some(word => text.includes(' ' + word))) { score += 1; reasons.push('Personne fragile concernée'); }
    if (ticket.status === 'En attente') {
        const hours = w14Hours(ticket);
        if (hours > 48) { score += 2; reasons.push(t('Attend depuis plus de {n} h', { n: 48 })); }
        else if (hours > 24) { score += 1; reasons.push(t('Attend depuis plus de {n} h', { n: 24 })); }
    }
    if (typeof w8SupportCount === 'function' && typeof W8_PRIORITY_SUPPORTS !== 'undefined' && w8SupportCount(ticket) >= W8_PRIORITY_SUPPORTS) { score += 1; reasons.push('Soutenue par de nombreux habitants'); }
    if (groupSize >= 3) { score += 1; reasons.push(t('Même problème signalé {n} fois', { n: groupSize })); }
    if (ticket.status === 'En cours') score -= 1;
    const rank = score >= 6 ? 3 : score >= 3 ? 2 : score >= 1.5 ? 1 : 0;
    return Object.assign({ score, reasons }, W14_LEVELS[rank]);
}

// ------------------------------------------
// F75 — Demandes qui parlent du même problème
// ------------------------------------------
const W14_STOP = new Set(['dans', 'pour', 'avec', 'sans', 'plus', 'tres', 'pas', 'les', 'des', 'une', 'est', 'sont', 'mon', 'mes', 'que', 'qui', 'quoi', 'cette', 'cela', 'depuis', 'tout', 'tous', 'toute', 'sur', 'par', 'aux', 'ont', 'fait', 'faire', 'etre', 'avoir', 'merci', 'bonjour', 'svp', 'besoin', 'souhaite', 'voudrais', 'aimerais', 'avez', 'nous', 'vous', 'elle', 'comme', 'aussi', 'mais', 'donc', 'chaque', 'tres', 'encore', 'toujours', 'jour', 'jours', 'matin', 'soir', 'hier', 'rapidement', 'rapide']);

function w14Tokens(ticket) {
    const place = ticket.location ? [ticket.location.place, ticket.location.sector].join(' ') : '';
    const words = w13Words([ticket.subject, ticket.message, ticket.kind, place].join(' ')).filter(word => word.length >= 4 && !W14_STOP.has(word));
    return Array.from(new Set(words.map(word => word.replace(/(?<=\w{4})[sx]$/, ''))));
}

function w14Overlap(a, b) {
    let inter = 0;
    a.forEach(word => { if (b.some(other => w13Match(word, other) >= 0.7)) inter += 1; });
    const union = a.length + b.length - inter;
    return { inter, jaccard: union ? inter / union : 0, overlap: Math.min(a.length, b.length) ? inter / Math.min(a.length, b.length) : 0 };
}

function w14Similar(a, b) {
    const score = w14Overlap(a.tokens, b.tokens);
    const sameService = a.ticket.service === b.ticket.service;
    return score.inter >= 2 && (sameService ? (score.jaccard >= 0.28 || score.overlap >= 0.6) : score.jaccard >= 0.45);
}

function w14Groups(onlyOpen = true) {
    const items = citizenTickets.filter(ticket => !onlyOpen || ticket.status !== 'Résolu').map(ticket => ({ ticket, tokens: w14Tokens(ticket) }));
    const parent = items.map((_, index) => index);
    const find = index => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            if (w14Similar(items[i], items[j])) parent[find(j)] = find(i);
        }
    }
    const byRoot = new Map();
    items.forEach((item, index) => { const root = find(index); if (!byRoot.has(root)) byRoot.set(root, []); byRoot.get(root).push(item); });
    return Array.from(byRoot.values()).filter(members => members.length >= 2).map(members => {
        const counts = new Map();
        members.forEach(member => member.tokens.forEach(word => counts.set(word, (counts.get(word) || 0) + 1)));
        const keywords = Array.from(counts.entries()).filter(([, count]) => count >= 2).sort((x, y) => y[1] - x[1] || y[0].length - x[0].length).slice(0, 4).map(([word]) => word);
        const tickets = members.map(member => member.ticket).sort((x, y) => String(x.date || '').localeCompare(String(y.date || '')));
        const services = Array.from(new Set(tickets.map(ticket => ticket.service)));
        return { key: tickets[0].id, ids: tickets.map(ticket => ticket.id), tickets, keywords, services };
    }).sort((x, y) => y.ids.length - x.ids.length);
}

function w14GroupOf(id, groups) { return (groups || w14Groups()).find(group => group.ids.includes(id)); }

// ------------------------------------------
// État de l'interface agent
// ------------------------------------------
const w14 = { sort: w14Pref(W14_SORT_KEY, 'urgence'), level: 'all', group: null, groups: [] };

function w14DecorateRows() {
    const body = document.getElementById('agent-tickets-tbody');
    if (!body) return;
    w14.groups = w14Groups();
    const rows = Array.from(body.querySelectorAll('tr[data-ticket]'));
    const info = new Map();
    rows.forEach(row => {
        const ticket = w14Ticket(row.dataset.ticket);
        if (!ticket) return;
        const group = w14GroupOf(ticket.id, w14.groups);
        const urgency = w14Urgency(ticket, group ? group.ids.length : 1);
        info.set(row, { ticket, group, urgency });
        const cell = row.querySelectorAll('td')[3];
        if (cell && !cell.querySelector('.w14-badges')) {
            const box = document.createElement('div');
            box.className = 'w14-badges';
            box.dataset.noI18n = '';
            const parts = [];
            if (urgency.id !== 'closed') parts.push(`<span class="tn-badge tn-badge--${urgency.cls}" title="${escapeHtml(urgency.reasons.map(reason => t(reason)).join(' · ') || t('Aucun signe d\'urgence particulier'))}">${escapeHtml(t('Urgence'))} : ${escapeHtml(t(urgency.label))}</span>`);
            if (ticket.medicalUrgent) parts.push(`<span class="tn-badge tn-badge--danger">${escapeHtml(t('Urgence médicale'))}</span>`);
            if (ticket.demo) parts.push(`<span class="tn-badge tn-badge--neutral">${escapeHtml(t('Exemple'))}</span>`);
            if (group) parts.push(`<button type="button" class="w14-chip" data-w14="show-group" data-key="${escapeHtml(group.key)}">${escapeHtml(t('Similaire à {n} autre(s)', { n: group.ids.length - 1 }))}</button>`);
            if (ticket.replies && ticket.replies.length) parts.push(`<span class="tn-badge tn-badge--neutral">${escapeHtml(t('{n} réponse(s)', { n: ticket.replies.length }))}</span>`);
            box.innerHTML = parts.join(' ');
            cell.appendChild(box);
            if (urgency.reasons.length && urgency.id !== 'closed') {
                const why = document.createElement('div');
                why.className = 'w14-why';
                why.dataset.noI18n = '';
                why.textContent = t('Pourquoi : {r}', { r: urgency.reasons.map(reason => t(reason)).join(' · ') });
                cell.appendChild(why);
            }
        }
        const actions = row.querySelector('td:last-child');
        if (actions && !actions.querySelector('[data-w14="reply"]')) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.w14 = 'reply';
            button.dataset.id = ticket.id;
            button.className = 'px-2 py-1 border border-[#8FE1FF] text-[#8FE1FF] text-[10px] hover:bg-[#8FE1FF] hover:text-black transition';
            button.textContent = t('Répondre');
            actions.prepend(button);
        }
    });

    // Filtres : niveau d'urgence et groupe
    rows.forEach(row => {
        const data = info.get(row);
        if (!data) return;
        let visible = true;
        if (w14.level !== 'all' && data.urgency.id !== w14.level) visible = false;
        if (w14.group && !w14.group.includes(data.ticket.id)) visible = false;
        row.hidden = !visible;
    });

    // Tri
    const dateOf = row => String((info.get(row) || { ticket: {} }).ticket.date || '');
    const sorters = {
        urgence: (a, b) => ((info.get(b) || { urgency: { score: -9 } }).urgency.score - (info.get(a) || { urgency: { score: -9 } }).urgency.score) || dateOf(a).localeCompare(dateOf(b)),
        recent: (a, b) => dateOf(b).localeCompare(dateOf(a)),
        ancien: (a, b) => dateOf(a).localeCompare(dateOf(b))
    };
    rows.sort(sorters[w14.sort] || sorters.urgence).forEach(row => body.appendChild(row));

    w14RenderTools(info);
}

function w14RenderTools(info) {
    const box = document.getElementById('w14-agent-tools');
    if (!box) return;
    const open = citizenTickets.filter(ticket => ticket.status !== 'Résolu');
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    open.forEach(ticket => { const group = w14GroupOf(ticket.id, w14.groups); counts[w14Urgency(ticket, group ? group.ids.length : 1).id] += 1; });
    const shown = Array.from(document.querySelectorAll('#agent-tickets-tbody tr[data-ticket]')).filter(row => !row.hidden).length;
    const hasDemo = citizenTickets.some(ticket => ticket.demo);
    const groupHtml = w14.groups.length ? `<ul class="w14-group-list">${w14.groups.map(group => `
        <li class="w14-group">
            <p class="w14-group-title"><strong data-no-i18n>${group.ids.length}</strong> ${W14T('demandes sur le même sujet')} <span class="tn-hint" data-no-i18n>· ${escapeHtml(group.services.map(service => t(service)).join(', '))}</span></p>
            ${group.keywords.length ? `<p class="tn-hint" data-no-i18n>${W14T('Mots en commun')} : ${escapeHtml(group.keywords.join(', '))}</p>` : ''}
            <p class="w14-ids" data-no-i18n>${group.tickets.map(ticket => `<button type="button" class="w14-chip" data-w14="focus" data-id="${escapeHtml(ticket.id)}">${escapeHtml(ticket.id)}</button>`).join(' ')}</p>
            <div class="tn-row-actions">
                <button type="button" class="tn-tab" data-w14="show-group" data-key="${escapeHtml(group.key)}">${W14T('Voir ce groupe')}</button>
                <button type="button" class="tn-tab" data-w14="take-group" data-key="${escapeHtml(group.key)}">${W14T('Tout prendre en charge')}</button>
                <button type="button" class="tn-tab" data-w14="reply-group" data-key="${escapeHtml(group.key)}">${W14T('Répondre à tout le groupe')}</button>
            </div>
        </li>`).join('')}</ul>` : `<p class="tn-hint">${W14T('Aucun groupe pour le moment : aucune demande en cours ne ressemble à une autre.')}</p>`;
    box.innerHTML = `
        <div class="w14-toolbar" role="group" aria-label="${W14T('Trier et filtrer les demandes')}">
            <label class="tn-field-label" for="w14-sort">${W14T('Trier par')}</label>
            <select id="w14-sort" class="cyber-input" data-w14-change="sort">
                <option value="urgence" ${w14.sort === 'urgence' ? 'selected' : ''}>${W14T('Urgence (la plus haute en premier)')}</option>
                <option value="recent" ${w14.sort === 'recent' ? 'selected' : ''}>${W14T('Les plus récentes')}</option>
                <option value="ancien" ${w14.sort === 'ancien' ? 'selected' : ''}>${W14T('Les plus anciennes')}</option>
            </select>
            <div class="w14-levels" role="group" aria-label="${W14T('Filtrer par niveau d\'urgence')}">
                <button type="button" class="tn-tab" data-w14="level" data-level="all" aria-pressed="${w14.level === 'all'}">${W14T('Toutes')}</button>
                ${W14_LEVELS.slice().reverse().map(level => `<button type="button" class="tn-tab" data-w14="level" data-level="${level.id}" aria-pressed="${w14.level === level.id}"><span data-no-i18n>${counts[level.id]}</span> ${W14T(level.label)}</button>`).join('')}
            </div>
        </div>
        <p class="tn-hint" role="status" data-no-i18n>${escapeHtml(t('{n} demande(s) affichée(s) sur {total}', { n: shown, total: citizenTickets.length }))}${w14.group ? ' · ' : ''}${w14.group ? `<button type="button" class="w14-chip" data-w14="clear-group">${escapeHtml(t('Afficher toutes les demandes'))}</button>` : ''}</p>
        <details class="w14-details" ${w14.groups.length ? 'open' : ''}>
            <summary>${W14T('Demandes similaires')} (<span data-no-i18n>${w14.groups.length}</span>)</summary>
            <p class="tn-hint">${W14T('Le regroupement compare les mots importants du sujet et du message. Il aide à repérer un même problème signalé plusieurs fois ; un agent vérifie toujours avant de traiter un groupe.')}</p>
            ${groupHtml}
        </details>
        <p class="tn-hint">${W14T('L\'urgence est calculée avec l\'urgence déclarée, des mots de danger, la personne concernée, l\'attente et le nombre de signalements. Passez la souris sur le badge pour voir pourquoi.')}</p>
        <div class="tn-row-actions">
            <button type="button" class="tn-tab" data-w14="demo-add">${W14T('Ajouter des demandes d\'exemple')}</button>
            ${hasDemo ? `<button type="button" class="tn-tab tn-tab--danger" data-w14="demo-remove">${W14T('Retirer les exemples')}</button>` : ''}
        </div>`;
    w14RenderMedical();
    w14RenderFeedbackPanel();
}

// Demandes d'exemple pour essayer le regroupement (marquées « Exemple », retirables en un clic)
function w14DemoTickets() {
    const ago = hours => tnLocalStamp(new Date(Date.now() - hours * 3600000));
    const rows = [
        ['Atmosphère & Biosphère', 'Odeur de brûlé dans la coursive du secteur B', 'Une forte odeur de brûlé vient de la coursive du secteur B depuis ce matin.', 'Élevé', 30],
        ['Atmosphère & Biosphère', 'Fumée et odeur de brûlé secteur B', 'Il y a une odeur de brûlé et un peu de fumée dans la coursive du secteur B.', 'Normal', 5],
        ['Atmosphère & Biosphère', 'Coursive secteur B : odeur de brûlé', 'Odeur de brûlé persistante dans la coursive du secteur B depuis deux jours.', 'Normal', 3],
        ['Énergie Plasma & Réacteur Zéro', 'Lampadaire éteint devant les serres', 'Le lampadaire devant les serres est éteint depuis hier soir.', 'Normal', 18],
        ['Énergie Plasma & Réacteur Zéro', 'Lampadaire des serres éteint la nuit', 'Le lampadaire devant les serres est éteint et il n\'y a plus de lumière la nuit.', 'Normal', 2],
        ['Transports & Hyper-Tubes', 'Retard répété sur la ligne 3', 'La capsule de la ligne 3 a vingt minutes de retard tous les matins.', 'Normal', 8],
        ['Santé Biotech & Cryo-Soins', 'Rendez-vous pour un enfant fiévreux', 'Mon enfant a de la fièvre depuis deux jours, je voudrais un rendez-vous rapidement.', 'Élevé', 1]
    ];
    const used = new Set(citizenTickets.map(ticket => ticket.id));
    return rows.map(([service, subject, message, priority, hours]) => {
        let id;
        do { id = 'TK-TN-' + Math.floor(1000 + Math.random() * 9000); } while (used.has(id));
        used.add(id);
        const date = ago(hours);
        return { id, citizenName: 'Habitant (exemple)', service, category: 'Doléance Urbaine', subject, message, priority, status: 'En attente', date, history: [{ status: 'En attente', date }], demo: true };
    });
}

function w14AddDemo() {
    if (citizenTickets.some(ticket => ticket.demo)) { announce(t('Les demandes d\'exemple sont déjà là.')); return; }
    w14DemoTickets().forEach(ticket => citizenTickets.push(ticket));
    w14Persist();
    renderAgentTicketsTable();
    announce(t('7 demandes d\'exemple ajoutées. Elles sont marquées « Exemple ».'));
}

function w14RemoveDemo() {
    const before = citizenTickets.length;
    for (let i = citizenTickets.length - 1; i >= 0; i--) if (citizenTickets[i].demo) citizenTickets.splice(i, 1);
    w14.group = null;
    w14Persist();
    renderAgentTicketsTable();
    if (typeof renderCitizenTracker === 'function') renderCitizenTracker();
    announce(t('{n} demande(s) d\'exemple retirée(s).', { n: before - citizenTickets.length }));
}

function w14FocusTicket(id) {
    w14.level = 'all'; w14.group = null;
    renderAgentTicketsTable();
    const row = document.querySelector(`#agent-tickets-tbody tr[data-ticket="${id}"]`);
    if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (typeof tnFlash === 'function') tnFlash(row); }
}

function w14TakeGroup(key) {
    const group = w14.groups.find(entry => entry.key === key);
    if (!group) return;
    const pending = group.tickets.filter(ticket => ticket.status === 'En attente');
    if (!pending.length) { announce(t('Toutes les demandes de ce groupe sont déjà prises en charge.')); return; }
    pending.forEach(ticket => updateTicketStatus(ticket.id, 'En cours'));
    if (typeof w4Audit === 'function') w4Audit(`Groupe de demandes pris en charge : ${pending.map(ticket => ticket.id).join(', ')}`);
    announce(t('{n} demande(s) prise(s) en charge.', { n: pending.length }));
}

// ------------------------------------------
// F84 — Répondre directement à une demande
// ------------------------------------------
const W14_QUICK = [
    'Bonjour, nous avons bien pris connaissance de votre demande. Un agent s\'en occupe dès aujourd\'hui.',
    'Merci de nous avoir prévenus. Une équipe est envoyée sur place et le problème sera réglé dans la journée.',
    'Pour traiter votre demande, merci de nous indiquer votre secteur exact et un numéro où vous joindre.',
    'Votre demande est réglée. Si le problème revient, répondez à ce message ou envoyez une nouvelle demande.'
];

let w14ReplyIds = [];
function w14OpenReply(ids) {
    const tickets = ids.map(w14Ticket).filter(Boolean);
    if (!tickets.length) return;
    if (!w14IsAgent()) { announce(t('Seuls les agents peuvent répondre aux demandes.')); return; }
    w14ReplyIds = tickets.map(ticket => ticket.id);
    const summary = tickets.length === 1
        ? `<p class="w14-quote" data-no-i18n><strong>${escapeHtml(tickets[0].id)}</strong> — ${escapeHtml(tnTicketTitle(tickets[0]))}<br>${escapeHtml(tickets[0].message)}</p>`
        : `<p class="w14-quote" data-no-i18n>${escapeHtml(t('La même réponse sera envoyée à {n} demandes :', { n: tickets.length }))} ${escapeHtml(tickets.map(ticket => ticket.id).join(', '))}</p>`;
    w4OpenDialog(W14T('Répondre à l\'habitant'), `
        ${summary}
        <form id="w14-reply-form" class="w13-need-form" novalidate>
            <div role="group" aria-label="${W14T('Réponses rapides')}" class="w14-quick">${W14_QUICK.map((text, index) => `<button type="button" class="w14-chip" data-w14="quick" data-index="${index}">${W14T(text.split(',')[0].split('.')[0])}…</button>`).join('')}</div>
            <label class="tn-field-label" for="w14-reply-text">${W14T('Votre réponse (visible par l\'habitant)')}</label>
            <textarea id="w14-reply-text" class="cyber-input" rows="5" maxlength="600" data-autofocus aria-describedby="w14-reply-error"></textarea>
            <p id="w14-reply-error" class="tn-form-error" role="alert" hidden></p>
            <label class="tn-field-label" for="w14-reply-after">${W14T('Après l\'envoi')}</label>
            <select id="w14-reply-after" class="cyber-input">
                <option value="keep">${W14T('Laisser la demande dans son état')}</option>
                <option value="En cours">${W14T('Passer la demande « En cours »')}</option>
                <option value="Résolu">${W14T('Clôturer la demande')}</option>
            </select>
            <p class="tn-hint">${W14T('L\'habitant est prévenu dans ses notifications et lit votre réponse dans « Mes démarches ». N\'écrivez jamais de mot de passe ni de données de santé.')}</p>
            <div class="w13-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W14T('Envoyer la réponse')}</button><button type="button" class="tn-tab" data-dialog-close>${W14T('Annuler')}</button></div>
        </form>`);
}

function w14SendReply(text, after) {
    const clean = String(text || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 600);
    const author = currentRole === 'admin' ? 'Administrateur municipal' : 'Agent municipal';
    const stamp = new Date().toISOString();
    const sent = [];
    w14ReplyIds.forEach(id => {
        const ticket = w14Ticket(id);
        if (!ticket) return;
        ticket.replies = Array.isArray(ticket.replies) ? ticket.replies : [];
        ticket.replies.push({ id: 'RP-' + Date.now().toString(36) + sent.length, at: stamp, by: author, text: clean });
        sent.push(id);
    });
    w14Persist();
    if (typeof w4Audit === 'function') w4Audit(`Réponse envoyée : ${sent.join(', ')}`);
    if (after && after !== 'keep') sent.forEach(id => updateTicketStatus(id, after));
    else { renderAgentTicketsTable(); if (typeof renderCitizenTracker === 'function') renderCitizenTracker(); }
    if (typeof renderNotifications === 'function') renderNotifications();
    announce(t('Réponse envoyée pour {n} demande(s).', { n: sent.length }));
    return sent;
}

function w14RepliesHtml(ticket) {
    if (!ticket.replies || !ticket.replies.length) return '';
    return `<section class="w14-replies" aria-label="${W14T('Réponses de la mairie')}">
        <h5 class="tn-w12-sub">${W14T('Réponses de la mairie')}</h5>
        <ul class="w14-reply-list">${ticket.replies.map(reply => `<li><p data-no-i18n>${escapeHtml(reply.text)}</p><p class="tn-hint" data-no-i18n>${escapeHtml(t(reply.by))} · ${tnFormatStamp(tnLocalStamp(new Date(reply.at)))}</p></li>`).join('')}</ul></section>`;
}

// ------------------------------------------
// F86 — Urgence médicale écrite dans une demande
// ------------------------------------------
function w14MedicalBannerHtml(compact) {
    return `<div class="w14-urgent-body">
        <strong><i aria-hidden="true" class="fa-solid fa-triangle-exclamation"></i> ${W14T('Cela peut être une urgence médicale.')}</strong>
        <p>${W14T('Appelez le 112 maintenant (gratuit, 24 h/24). Ne comptez pas sur cette demande : elle n\'est pas lue en temps réel par un agent.')}</p>
        <p>${W14T('Si vous le pouvez, restez auprès de la personne et demandez à un voisin de vous aider.')}</p>
        <div class="w13-actions"><a class="btn-cyber btn-amber px-4 py-2 text-xs font-bold uppercase" href="tel:112">${W14T('Appeler le 112')}</a>${typeof w7OpenEmergency === 'function' ? `<button type="button" class="tn-tab" data-w14="emergency">${W14T('Voir les urgences près de moi')}</button>` : ''}</div>
        ${compact ? '' : `<p class="tn-hint">${W14T('Vous pouvez aussi envoyer la demande : elle est marquée « urgence médicale » et passe en tête de la file des agents.')}</p>`}
    </div>`;
}

function w14InitContactWatch() {
    const form = document.getElementById('contact-municipal-form');
    const message = document.getElementById('contact-message');
    const subject = document.getElementById('contact-subject');
    if (!form || !message || document.getElementById('w14-urgent')) return;
    const banner = document.createElement('div');
    banner.id = 'w14-urgent';
    banner.className = 'w14-urgent';
    banner.setAttribute('role', 'alert');
    banner.hidden = true;
    message.closest('div').after(banner);
    const check = () => {
        const text = [subject ? subject.value : '', message.value].join(' ');
        const detected = text.length > 6 && tnMedicalUrgency(text).urgent;
        if (detected && banner.hidden) {
            banner.innerHTML = w14MedicalBannerHtml(false);
            banner.hidden = false;
            const priority = document.getElementById('contact-priority');
            if (priority) priority.value = 'Critique';
        } else if (!detected && !banner.hidden) { banner.hidden = true; banner.innerHTML = ''; }
    };
    message.addEventListener('input', check);
    if (subject) subject.addEventListener('input', check);
    document.addEventListener('tn:langchange', () => { if (!banner.hidden) banner.innerHTML = w14MedicalBannerHtml(false); });
}

function w14RenderMedical() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace) return;
    let box = document.getElementById('w14-medical');
    const urgent = citizenTickets.filter(ticket => ticket.status !== 'Résolu' && (ticket.medicalUrgent || (ticket.priority === 'Critique' && tnMedicalUrgency([ticket.subject, ticket.message].join(' ')).urgent)));
    if (!box) {
        box = document.createElement('section');
        box.id = 'w14-medical';
        box.className = 'w14-medical';
        box.setAttribute('role', 'region');
        box.setAttribute('aria-label', t('Urgences médicales'));
        workspace.prepend(box);
    }
    box.hidden = !urgent.length;
    if (!urgent.length) { box.innerHTML = ''; return; }
    box.innerHTML = `<h4><i aria-hidden="true" class="fa-solid fa-truck-medical"></i> ${W14T('Urgences médicales à traiter tout de suite')} (<span data-no-i18n>${urgent.length}</span>)</h4>
        <ol class="w14-protocol"><li>${W14T('Joindre l\'habitant immédiatement.')}</li><li>${W14T('En cas de danger pour la vie : faire appeler le 112 et prévenir le poste médical.')}</li><li>${W14T('Prendre la demande en charge et noter ce qui a été fait.')}</li></ol>
        <ul class="w14-medical-list">${urgent.map(ticket => `<li><span data-no-i18n><strong>${escapeHtml(ticket.id)}</strong> — ${escapeHtml(ticket.citizenName)} : ${escapeHtml(String(ticket.message).slice(0, 140))}</span>
            <span class="tn-row-actions">${ticket.status === 'En attente' ? `<button type="button" class="tn-tab" data-w14="take" data-id="${escapeHtml(ticket.id)}">${W14T('Prendre en charge')}</button>` : `<span class="tn-badge tn-badge--progress">${W14T('En cours')}</span>`}<button type="button" class="tn-tab" data-w14="reply" data-id="${escapeHtml(ticket.id)}">${W14T('Répondre')}</button><button type="button" class="tn-tab" data-w14="focus" data-id="${escapeHtml(ticket.id)}">${W14T('Voir dans la liste')}</button></span></li>`).join('')}</ul>`;
}

// ------------------------------------------
// F83 — Accusé de réception signé
// ------------------------------------------
async function w14Sha256(text) {
    const bytes = new TextEncoder().encode(text);
    if (window.crypto && crypto.subtle) {
        const buffer = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Navigateur sans SubtleCrypto : empreinte locale de repli, 64 caractères hexadécimaux
    let out = '';
    for (let round = 0; round < 8; round++) {
        let h = 0x811c9dc5 ^ (round * 0x9e3779b1);
        for (const b of bytes) { h ^= b; h = Math.imul(h, 16777619) >>> 0; }
        out += h.toString(16).padStart(8, '0');
    }
    return out;
}

function w14Fingerprint(ticket) {
    return [ticket.id, ticket.citizenName, ticket.service, ticket.category || '', ticket.subject, ticket.message, ticket.date].join('\u001f');
}

const w14Pending = new Map();
function w14IssueReceipt(ticket) {
    if (ticket.receipt && ticket.receipt.digest) return Promise.resolve(ticket.receipt);
    if (w14Pending.has(ticket.id)) return w14Pending.get(ticket.id);
    const job = (async () => {
        const digest = await w14Sha256(w14Fingerprint(ticket));
        let receipt = null;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 6000);
            const response = await fetch('/api/receipt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: ticket.id, digest }), signal: controller.signal });
            clearTimeout(timer);
            const data = response.ok ? await response.json() : null;
            if (data && data.signature && data.issuedAt) receipt = { digest, issuedAt: data.issuedAt, signature: data.signature, signed: true };
        } catch (err) { receipt = null; }
        if (!receipt) receipt = { digest, issuedAt: new Date().toISOString(), signature: null, signed: false };
        ticket.receipt = receipt;
        w14Persist();
        w14Pending.delete(ticket.id);
        return receipt;
    })();
    w14Pending.set(ticket.id, job);
    return job;
}

function w14ReceiptText(ticket) {
    const r = ticket.receipt;
    if (!r) return '';
    const local = new Date(r.issuedAt);
    return [
        'ACCUSÉ DE RÉCEPTION — Mairie de Terra Nova',
        '',
        `Référence : ${ticket.id}`,
        `Service destinataire : ${ticket.service}`,
        `Objet : ${tnTicketTitle(ticket)}`,
        `Demande envoyée le : ${ticket.date}`,
        `Reçue par la plateforme le : ${local.toLocaleString('fr-FR')}`,
        `Date de réception (UTC) : ${r.issuedAt}`,
        `Empreinte de la demande (SHA-256) : ${r.digest}`,
        r.signed ? `Signature de la mairie : ${r.signature}` : 'Signature de la mairie : aucune (le serveur n\'a pas répondu au moment de l\'envoi ; cet accusé est seulement enregistré sur cet appareil)',
        '',
        'Cet accusé prouve que la plateforme a bien reçu la demande à cette date. Il ne dit pas que la demande sera acceptée.',
        'Pour le vérifier : « Mes démarches » > « Vérifier un accusé », puis collez ce texte.'
    ].join('\n');
}

function w14ReceiptHtml(ticket) {
    const r = ticket.receipt;
    if (!r) return `<section class="w14-receipt" aria-label="${W14T('Accusé de réception')}"><h5 class="tn-w12-sub">${W14T('Accusé de réception')}</h5><p class="tn-hint">${W14T('Émission de l\'accusé en cours…')}</p></section>`;
    return `<section class="w14-receipt" aria-label="${W14T('Accusé de réception')}">
        <h5 class="tn-w12-sub">${W14T('Accusé de réception')}</h5>
        <dl class="tn-facts" data-no-i18n>
            <dt>${escapeHtml(t('Référence'))}</dt><dd>${escapeHtml(ticket.id)}</dd>
            <dt>${escapeHtml(t('Reçue le'))}</dt><dd>${escapeHtml(new Date(r.issuedAt).toLocaleString(typeof tnLocale === 'function' ? tnLocale() : 'fr-FR'))}</dd>
            <dt>${escapeHtml(t('Empreinte'))}</dt><dd class="w14-mono">${escapeHtml(r.digest.slice(0, 16))}…</dd>
            <dt>${escapeHtml(t('Signature'))}</dt><dd class="w14-mono">${r.signed ? escapeHtml(r.signature) : escapeHtml(t('non signé'))}</dd>
        </dl>
        <p class="tn-hint">${r.signed ? W14T('Signé par le serveur de la mairie : la signature se vérifie à tout moment.') : W14T('Le serveur n\'a pas répondu : cet accusé n\'est pas signé. Vous pouvez demander un nouvel accusé plus tard.')}</p>
        <div class="tn-row-actions">
            <button type="button" class="tn-tab" data-w14="receipt-download" data-id="${escapeHtml(ticket.id)}">${W14T('Télécharger mon accusé')}</button>
            <button type="button" class="tn-tab" data-w14="receipt-copy" data-id="${escapeHtml(ticket.id)}">${W14T('Copier')}</button>
            ${r.signed ? '' : `<button type="button" class="tn-tab" data-w14="receipt-retry" data-id="${escapeHtml(ticket.id)}">${W14T('Réessayer la signature')}</button>`}
        </div></section>`;
}

function w14DownloadReceipt(ticket) {
    const text = w14ReceiptText(ticket);
    if (!text) return;
    const blob = new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accuse-reception-${ticket.id}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    announce(t('Accusé de réception {id} téléchargé.', { id: ticket.id }));
}

function w14OpenVerify(prefill) {
    w4OpenDialog(W14T('Vérifier un accusé de réception'), `
        <form id="w14-verify-form" class="w13-need-form" novalidate>
            <p class="tn-hint">${W14T('Collez le texte de l\'accusé (fichier téléchargé). La plateforme contrôle la signature de la mairie.')}</p>
            <label class="tn-field-label" for="w14-verify-text">${W14T('Texte de l\'accusé')}</label>
            <textarea id="w14-verify-text" class="cyber-input" rows="8" maxlength="3000" data-autofocus>${escapeHtml(prefill || '')}</textarea>
            <div id="w14-verify-result" role="status" aria-live="polite"></div>
            <div class="w13-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W14T('Vérifier')}</button><button type="button" class="tn-tab" data-dialog-close>${W14T('Fermer')}</button></div>
        </form>`);
}

async function w14Verify(text) {
    const box = document.getElementById('w14-verify-result');
    const grab = label => { const m = String(text).match(new RegExp(label + '\\s*:\\s*(.+)')); return m ? m[1].trim() : ''; };
    const ref = grab('Référence');
    const issuedAt = grab('Date de réception \\(UTC\\)');
    const digest = grab('Empreinte de la demande \\(SHA-256\\)').toLowerCase();
    const signature = grab('Signature de la mairie');
    if (!/^TK-TN-\d{4}$/.test(ref) || !issuedAt || !/^[a-f0-9]{64}$/.test(digest)) {
        box.innerHTML = `<p class="tn-form-error">${W14T('Ce texte ne ressemble pas à un accusé de réception. Collez le fichier en entier.')}</p>`;
        return;
    }
    if (!/^[A-F0-9]{32}$/i.test(signature)) {
        box.innerHTML = `<p class="tn-form-error">${W14T('Cet accusé n\'est pas signé : la mairie ne peut pas confirmer qu\'il est authentique.')}</p>`;
        return;
    }
    box.innerHTML = `<p class="tn-hint">${W14T('Vérification en cours…')}</p>`;
    try {
        const response = await fetch('/api/receipt/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref, digest, issuedAt, signature }) });
        const data = await response.json();
        if (data && data.valid) {
            const ticket = w14Ticket(ref);
            let extra = '';
            if (ticket) { const now = await w14Sha256(w14Fingerprint(ticket)); extra = now === digest ? t('La demande enregistrée sur cet appareil correspond à l\'accusé.') : t('La demande enregistrée sur cet appareil a changé depuis cet accusé.'); }
            box.innerHTML = `<p class="w14-ok" data-no-i18n>✔ ${escapeHtml(t('Accusé authentique : la plateforme a bien reçu la demande {ref} le {date}.', { ref, date: new Date(issuedAt).toLocaleString('fr-FR') }))}${extra ? ' ' + escapeHtml(extra) : ''}</p>`;
            announce(t('Accusé authentique.'));
        } else {
            box.innerHTML = `<p class="tn-form-error">${W14T('Accusé non reconnu : le texte a été modifié ou il n\'a pas été émis par cette plateforme.')}</p>`;
            announce(t('Accusé non reconnu.'));
        }
    } catch (err) {
        box.innerHTML = `<p class="tn-form-error">${W14T('Vérification impossible pour le moment. Réessayez dans quelques minutes.')}</p>`;
    }
}

// ------------------------------------------
// F76 — Commentaire après un service
// ------------------------------------------
const W14_RATINGS = ['Très insatisfait', 'Insatisfait', 'Moyen', 'Satisfait', 'Très satisfait'];

function w14FeedbackHtml(ticket) {
    if (ticket.status !== 'Résolu') return '';
    const fb = ticket.feedback;
    if (!fb) return `<section class="w14-feedback"><h5 class="tn-w12-sub">${W14T('Votre avis sur ce service')}</h5><p class="tn-hint">${W14T('Votre demande est résolue. Dites-nous comment cela s\'est passé : le service lit votre commentaire.')}</p><button type="button" class="tn-tab" data-w14="feedback" data-id="${escapeHtml(ticket.id)}">${W14T('Laisser un commentaire')}</button></section>`;
    return `<section class="w14-feedback"><h5 class="tn-w12-sub">${W14T('Votre avis sur ce service')}</h5>
        <p data-no-i18n><span class="w14-stars" aria-label="${escapeHtml(t('{n} sur 5', { n: fb.rating }))}">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</span> ${escapeHtml(t(W14_RATINGS[fb.rating - 1]))}</p>
        ${fb.comment ? `<p class="w14-quote" data-no-i18n>${escapeHtml(fb.comment)}</p>` : ''}
        <p class="tn-hint">${W14T('Merci. Votre avis est transmis au service concerné.')}</p>
        <div class="tn-row-actions"><button type="button" class="tn-tab" data-w14="feedback" data-id="${escapeHtml(ticket.id)}">${W14T('Modifier mon avis')}</button><button type="button" class="tn-tab tn-tab--danger" data-w14="feedback-delete" data-id="${escapeHtml(ticket.id)}">${W14T('Supprimer mon avis')}</button></div></section>`;
}

function w14OpenFeedback(id) {
    const ticket = w14Ticket(id);
    if (!ticket || ticket.status !== 'Résolu') return;
    const fb = ticket.feedback || {};
    w4OpenDialog(W14T('Votre avis sur ce service'), `
        <form id="w14-fb-form" class="w13-need-form" data-id="${escapeHtml(id)}" novalidate>
            <p class="tn-hint" data-no-i18n>${escapeHtml(ticket.id)} — ${escapeHtml(tnTicketTitle(ticket))}</p>
            <fieldset class="w13-needs"><legend class="tn-field-label">${W14T('Êtes-vous satisfait du service ?')}</legend>
                ${W14_RATINGS.map((label, index) => `<label class="w13-need-opt"><input type="radio" name="rating" value="${index + 1}" ${fb.rating === index + 1 ? 'checked' : ''}> <span data-no-i18n>${index + 1} — ${escapeHtml(t(label))}</span></label>`).join('')}
            </fieldset>
            <label class="tn-field-label" for="w14-fb-comment">${W14T('Votre commentaire (facultatif)')}</label>
            <textarea id="w14-fb-comment" class="cyber-input" rows="4" maxlength="500" data-autofocus>${escapeHtml(fb.comment || '')}</textarea>
            <p id="w14-fb-error" class="tn-form-error" role="alert" hidden></p>
            <p class="tn-hint">${W14T('Votre nom n\'est pas montré aux autres habitants. Ne mettez pas de données de santé.')}</p>
            <div class="w13-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W14T('Envoyer mon avis')}</button><button type="button" class="tn-tab" data-dialog-close>${W14T('Annuler')}</button></div>
        </form>`);
}

function w14SaveFeedback(id, rating, comment) {
    const ticket = w14Ticket(id);
    if (!ticket) return;
    ticket.feedback = { rating, comment: String(comment || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, 500), at: new Date().toISOString(), seen: false };
    w14Persist();
    if (typeof renderCitizenTracker === 'function') renderCitizenTracker();
    w14RenderFeedbackPanel();
    announce(t('Merci, votre avis est enregistré.'));
}

function w14RenderFeedbackPanel() {
    const box = document.getElementById('w14-feedback-panel');
    if (!box) return;
    const rated = citizenTickets.filter(ticket => ticket.feedback);
    if (!rated.length) { box.innerHTML = `<h4 class="tn-w12-sub">${W14T('Avis des habitants après un service')}</h4><p class="tn-hint">${W14T('Aucun avis pour le moment. Quand une demande est résolue, l\'habitant peut laisser une note et un commentaire.')}</p>`; return; }
    const byService = new Map();
    rated.forEach(ticket => { if (!byService.has(ticket.service)) byService.set(ticket.service, []); byService.get(ticket.service).push(ticket); });
    box.innerHTML = `<h4 class="tn-w12-sub">${W14T('Avis des habitants après un service')}</h4>
        <ul class="w14-fb-list">${Array.from(byService.entries()).map(([service, list]) => {
            const avg = list.reduce((sum, ticket) => sum + ticket.feedback.rating, 0) / list.length;
            const latest = list.filter(ticket => ticket.feedback.comment).sort((a, b) => String(b.feedback.at).localeCompare(String(a.feedback.at))).slice(0, 3);
            return `<li><p><strong>${escapeHtml(t(service))}</strong> — <span data-no-i18n>${avg.toFixed(1).replace('.', ',')} / 5 · ${escapeHtml(t('{n} avis', { n: list.length }))}</span></p>${latest.map(ticket => `<p class="w14-quote" data-no-i18n>« ${escapeHtml(ticket.feedback.comment)} » <span class="tn-hint">— ${'★'.repeat(ticket.feedback.rating)} ${escapeHtml(ticket.id)}</span></p>`).join('')}</li>`;
        }).join('')}</ul>`;
}

// ------------------------------------------
// F79 — Trier et filtrer ses demandes et ses signalements
// ------------------------------------------
const w14F = { q: '', service: 'all', type: 'all', status: 'all', sort: 'recent' };

function w14FilterBar() {
    const mine = tnMyTickets();
    const services = Array.from(new Set(mine.map(ticket => ticket.service))).sort();
    const statuses = ['En attente', 'En cours', 'Résolu'];
    return `<div class="tn-tracker-tools w14-filters" role="search" aria-label="${W14T('Trier et filtrer mes demandes')}">
        <div><label for="w14-f-q" class="tn-field-label">${W14T('Rechercher')}</label><input type="search" id="w14-f-q" class="cyber-input" data-w14-change="f-q" value="${escapeHtml(w14F.q)}" placeholder="${W14T('N° de suivi, objet, lieu…')}"></div>
        <div><label for="w14-f-service" class="tn-field-label">${W14T('Sujet (service)')}</label><select id="w14-f-service" class="cyber-input" data-w14-change="f-service"><option value="all">${W14T('Tous les sujets')}</option>${services.map(service => `<option value="${escapeHtml(service)}" ${w14F.service === service ? 'selected' : ''}>${W14T(service)}</option>`).join('')}</select></div>
        <div><label for="w14-f-type" class="tn-field-label">${W14T('Type')}</label><select id="w14-f-type" class="cyber-input" data-w14-change="f-type"><option value="all">${W14T('Demandes et signalements')}</option><option value="request" ${w14F.type === 'request' ? 'selected' : ''}>${W14T('Demandes')}</option><option value="report" ${w14F.type === 'report' ? 'selected' : ''}>${W14T('Signalements')}</option></select></div>
        <div><label for="w14-f-status" class="tn-field-label">${W14T('État')}</label><select id="w14-f-status" class="cyber-input" data-w14-change="f-status"><option value="all">${W14T('Tous les états')}</option>${statuses.map(status => `<option value="${status}" ${w14F.status === status ? 'selected' : ''}>${W14T(status)}</option>`).join('')}</select></div>
        <div><label for="w14-f-sort" class="tn-field-label">${W14T('Trier par')}</label><select id="w14-f-sort" class="cyber-input" data-w14-change="f-sort"><option value="recent" ${w14F.sort === 'recent' ? 'selected' : ''}>${W14T('Les plus récentes')}</option><option value="ancien" ${w14F.sort === 'ancien' ? 'selected' : ''}>${W14T('Les plus anciennes')}</option><option value="etat" ${w14F.sort === 'etat' ? 'selected' : ''}>${W14T('État (en attente d\'abord)')}</option><option value="sujet" ${w14F.sort === 'sujet' ? 'selected' : ''}>${W14T('Sujet (A → Z)')}</option></select></div>
        <div class="w14-filter-actions"><button type="button" class="tn-tab" data-w14="f-reset">${W14T('Tout réinitialiser')}</button><button type="button" class="tn-tab" data-w14="verify">${W14T('Vérifier un accusé')}</button></div>
    </div>`;
}

function w14ListTickets() {
    let list = tnMyTickets();
    if (trackerView === 'active') list = list.filter(ticket => ticket.status !== 'Résolu');
    const total = list.length;
    const q = w13Fold(w14F.q);
    list = list.filter(ticket => {
        if (w14F.service !== 'all' && ticket.service !== w14F.service) return false;
        if (w14F.type === 'report' && !ticket.kind) return false;
        if (w14F.type === 'request' && ticket.kind) return false;
        if (w14F.status !== 'all' && ticket.status !== w14F.status) return false;
        if (q && !w13Fold([ticket.id, tnTicketTitle(ticket), ticket.service, t(ticket.service), ticket.message, tnTicketPlace(ticket)].join(' ')).includes(q)) return false;
        return true;
    });
    const order = { 'En attente': 0, 'En cours': 1, 'Résolu': 2 };
    const sorters = {
        recent: (a, b) => String(b.date || '').localeCompare(String(a.date || '')),
        ancien: (a, b) => String(a.date || '').localeCompare(String(b.date || '')),
        etat: (a, b) => (order[a.status] - order[b.status]) || String(b.date || '').localeCompare(String(a.date || '')),
        sujet: (a, b) => String(t(a.service)).localeCompare(String(t(b.service))) || String(b.date || '').localeCompare(String(a.date || ''))
    };
    return { shown: list.sort(sorters[w14F.sort] || sorters.recent), total };
}

function w14RenderTrackerList() {
    const list = document.getElementById('tracker-list');
    const count = document.getElementById('tracker-count');
    if (!list) return;
    const { shown, total } = w14ListTickets();
    if (count) count.textContent = shown.length ? t('{n} demande(s) affichée(s) sur {total}', { n: shown.length, total }) : '';
    if (!shown.length) {
        const empty = !tnMyTickets().length
            ? 'Aucune demande pour le moment. Utilisez le formulaire pour transmettre votre premier besoin.'
            : trackerView === 'active' && !total
                ? 'Aucune démarche en cours. Vos demandes résolues restent disponibles dans l\'historique.'
                : 'Aucune demande ne correspond à ces filtres.';
        list.innerHTML = `<li class="tn-empty">${t(empty)} ${total ? `<button type="button" class="w13-link" data-w14="f-reset">${W14T('Tout réinitialiser')}</button>` : ''}</li>`;
        return;
    }
    list.innerHTML = shown.map(renderTicketCard).join('');
}

// ------------------------------------------
// Événements
// ------------------------------------------
document.addEventListener('click', event => {
    const el = event.target.closest('[data-w14]');
    if (!el) return;
    const id = el.dataset.id;
    switch (el.dataset.w14) {
        case 'reply': w14OpenReply([id]); break;
        case 'reply-group': { const group = w14.groups.find(entry => entry.key === el.dataset.key); if (group) w14OpenReply(group.ids); break; }
        case 'quick': { const field = document.getElementById('w14-reply-text'); if (field) { field.value = W14_QUICK[Number(el.dataset.index)]; field.focus(); } break; }
        case 'take': updateTicketStatus(id, 'En cours'); break;
        case 'take-group': w14TakeGroup(el.dataset.key); break;
        case 'focus': w14FocusTicket(id); break;
        case 'show-group': { const group = w14.groups.find(entry => entry.key === el.dataset.key); if (group) { w14.group = group.ids; w14.level = 'all'; renderAgentTicketsTable(); announce(t('{n} demandes du même sujet affichées.', { n: group.ids.length })); const table = document.getElementById('agent-tickets-tbody'); if (table) table.scrollIntoView({ block: 'center', behavior: 'smooth' }); } break; }
        case 'clear-group': w14.group = null; renderAgentTicketsTable(); break;
        case 'level': w14.level = el.dataset.level; renderAgentTicketsTable(); break;
        case 'demo-add': w14AddDemo(); break;
        case 'demo-remove': w14RemoveDemo(); break;
        case 'emergency': if (typeof w7OpenEmergency === 'function') w7OpenEmergency(); break;
        case 'receipt-download': { const ticket = w14Ticket(id); if (ticket) w14DownloadReceipt(ticket); break; }
        case 'receipt-copy': { const ticket = w14Ticket(id); if (ticket && navigator.clipboard) navigator.clipboard.writeText(w14ReceiptText(ticket)).then(() => announce(t('Accusé copié.')), () => announce(t('Copie impossible : utilisez « Télécharger ».'))); break; }
        case 'receipt-retry': { const ticket = w14Ticket(id); if (ticket) { delete ticket.receipt; w14IssueReceipt(ticket).then(() => { if (typeof renderCitizenTracker === 'function') renderCitizenTracker(); if (tnConfirmedTicket === ticket) renderSubmissionConfirmation(); }); } break; }
        case 'receipt-make': { const ticket = w14Ticket(id); if (ticket) w14IssueReceipt(ticket).then(() => { if (typeof renderCitizenTracker === 'function') renderCitizenTracker(); const card = document.getElementById(`ticket-${id}`); if (card) { const details = card.querySelector('details'); if (details) details.open = true; } }); break; }
        case 'verify': w14OpenVerify(''); break;
        case 'feedback': w14OpenFeedback(id); break;
        case 'feedback-delete': { const ticket = w14Ticket(id); if (ticket) { delete ticket.feedback; w14Persist(); renderCitizenTracker(); w14RenderFeedbackPanel(); announce(t('Votre avis est supprimé.')); } break; }
        case 'f-reset': Object.assign(w14F, { q: '', service: 'all', type: 'all', status: 'all', sort: 'recent' }); renderCitizenTracker(); break;
        default: break;
    }
});

document.addEventListener('change', event => {
    const el = event.target.closest('[data-w14-change]');
    if (!el) return;
    switch (el.dataset.w14Change) {
        case 'sort': w14.sort = el.value; w14SetPref(W14_SORT_KEY, el.value); renderAgentTicketsTable(); announce(t('Liste triée.')); break;
        case 'f-service': w14F.service = el.value; w14RenderTrackerList(); break;
        case 'f-type': w14F.type = el.value; w14RenderTrackerList(); break;
        case 'f-status': w14F.status = el.value; w14RenderTrackerList(); break;
        case 'f-sort': w14F.sort = el.value; w14RenderTrackerList(); break;
        default: break;
    }
});

document.addEventListener('input', event => {
    if (event.target.matches('[data-w14-change="f-q"]')) { w14F.q = event.target.value; w14RenderTrackerList(); }
});

document.addEventListener('submit', event => {
    const form = event.target;
    if (form.id === 'w14-reply-form') {
        event.preventDefault();
        const text = document.getElementById('w14-reply-text').value.trim();
        const error = document.getElementById('w14-reply-error');
        if (text.length < 10) { error.hidden = false; error.textContent = t('Écrivez une réponse d\'au moins 10 caractères.'); document.getElementById('w14-reply-text').focus(); return; }
        const after = document.getElementById('w14-reply-after').value;
        w4CloseDialog();
        w14SendReply(text, after);
    } else if (form.id === 'w14-fb-form') {
        event.preventDefault();
        const chosen = form.querySelector('input[name="rating"]:checked');
        const error = document.getElementById('w14-fb-error');
        if (!chosen) { error.hidden = false; error.textContent = t('Choisissez une note de 1 à 5.'); return; }
        const comment = document.getElementById('w14-fb-comment').value;
        const id = form.dataset.id;
        w4CloseDialog();
        w14SaveFeedback(id, Number(chosen.value), comment);
    } else if (form.id === 'w14-verify-form') {
        event.preventDefault();
        w14Verify(document.getElementById('w14-verify-text').value);
    }
});

// ------------------------------------------
// Branchements sur l'existant
// ------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Zone d'outils agents, au-dessus du tableau des demandes
    const body = document.getElementById('agent-tickets-tbody');
    if (body && !document.getElementById('w14-agent-tools')) {
        const wrapper = body.closest('.overflow-x-auto') || body.closest('table');
        const tools = document.createElement('div');
        tools.id = 'w14-agent-tools';
        tools.className = 'w14-agent-tools';
        const feedback = document.createElement('div');
        feedback.id = 'w14-feedback-panel';
        feedback.className = 'w14-panel';
        wrapper.before(tools);
        wrapper.after(feedback);
    }

    if (typeof renderAgentTicketsTable === 'function') {
        const baseAgent = renderAgentTicketsTable;
        renderAgentTicketsTable = function () { const result = baseAgent.apply(this, arguments); try { w14DecorateRows(); } catch (err) { console.warn('[w14]', err); } return result; };
    }

    if (typeof renderTicketCard === 'function') {
        const baseCard = renderTicketCard;
        renderTicketCard = function (ticket) {
            const html = baseCard.apply(this, arguments);
            const extra = (ticket.receipt ? w14ReceiptHtml(ticket) : `<section class="w14-receipt"><h5 class="tn-w12-sub">${W14T('Accusé de réception')}</h5><button type="button" class="tn-tab" data-w14="receipt-make" data-id="${escapeHtml(ticket.id)}">${W14T('Obtenir mon accusé de réception')}</button></section>`)
                + w14RepliesHtml(ticket) + w14FeedbackHtml(ticket);
            const end = html.lastIndexOf('</li>');
            return end < 0 ? html + extra : html.slice(0, end) + extra + html.slice(end);
        };
    }

    if (typeof renderCitizenTracker === 'function') {
        const baseTracker = renderCitizenTracker;
        renderCitizenTracker = function () {
            const result = baseTracker.apply(this, arguments);
            const box = document.getElementById('citizen-tracker');
            if (box && typeof activeCitizen !== 'undefined' && activeCitizen) {
                const old = box.querySelector('.tn-tracker-tools');
                if (old) old.remove();
                const count = document.getElementById('tracker-count');
                if (count) count.insertAdjacentHTML('beforebegin', w14FilterBar());
                w14RenderTrackerList();
            }
            return result;
        };
    }

    if (typeof renderTrackerList === 'function') renderTrackerList = w14RenderTrackerList;

    // Confirmation après l'envoi : urgence médicale et accusé de réception
    if (typeof renderSubmissionConfirmation === 'function') {
        const baseConfirm = renderSubmissionConfirmation;
        renderSubmissionConfirmation = function () {
            const result = baseConfirm.apply(this, arguments);
            const receipt = document.getElementById('contact-receipt');
            const ticket = tnConfirmedTicket;
            if (receipt && ticket) {
                const anchor = receipt.querySelector('.tn-confirm-actions');
                const html = (ticket.medicalUrgent ? `<div class="w14-urgent" role="alert">${w14MedicalBannerHtml(true)}</div>` : '') + w14ReceiptHtml(ticket);
                if (anchor) anchor.insertAdjacentHTML('beforebegin', html); else receipt.insertAdjacentHTML('beforeend', html);
            }
            return result;
        };
    }

    if (typeof handleContactMunicipal === 'function') {
        const baseSubmit = handleContactMunicipal;
        handleContactMunicipal = function (event) {
            const before = citizenTickets[0];
            const result = baseSubmit.apply(this, arguments);
            const created = citizenTickets[0] !== before ? citizenTickets[0] : null;
            if (created) {
                if (tnMedicalUrgency([created.subject, created.message].join(' ')).urgent) {
                    created.medicalUrgent = true;
                    created.priority = 'Critique';
                    w14Persist();
                    if (typeof renderAgentTicketsTable === 'function') renderAgentTicketsTable();
                    announce(t('Cela peut être une urgence médicale : appelez le 112. Votre demande est marquée urgente.'));
                }
                const banner = document.getElementById('w14-urgent');
                if (banner) { banner.hidden = true; banner.innerHTML = ''; }
                if (tnConfirmedTicket === created) renderSubmissionConfirmation();
                w14IssueReceipt(created).then(() => { if (tnConfirmedTicket === created) renderSubmissionConfirmation(); if (typeof renderCitizenTracker === 'function') renderCitizenTracker(); });
            }
            return result;
        };
    }

    // Notifications : réponses reçues (habitant) et urgences médicales (agent)
    if (typeof tnNotificationItems === 'function') {
        const baseItems = tnNotificationItems;
        tnNotificationItems = function () {
            const items = baseItems.apply(this, arguments);
            try {
                const read = new Set(typeof tnLoad === 'function' ? tnLoad('tn_read_items', []) : []);
                if (typeof activeCitizen !== 'undefined' && activeCitizen && !(activeCitizen.profile && activeCitizen.profile.notify === false)) {
                    tnMyTickets().forEach(ticket => (ticket.replies || []).forEach(reply => items.push({
                        id: reply.id, level: 'info', date: reply.at, userText: true, read: read.has(reply.id),
                        title: t('Réponse à la demande {id}', { id: ticket.id }), text: String(reply.text).slice(0, 90),
                        action: `goToMyTicket('${escapeHtml(ticket.id)}'); markNotificationRead('${escapeHtml(reply.id)}')`
                    })));
                }
                if (w14IsAgent()) {
                    citizenTickets.filter(ticket => ticket.status === 'En attente' && ticket.medicalUrgent).forEach(ticket => items.push({
                        id: 'med-' + ticket.id, level: 'urgence', date: new Date().toISOString(), userText: true, read: read.has('med-' + ticket.id),
                        title: t('Urgence médicale : demande {id}', { id: ticket.id }), text: t('À traiter tout de suite.'),
                        action: `goToAgentTicket('${escapeHtml(ticket.id)}'); markNotificationRead('med-${escapeHtml(ticket.id)}')`
                    }));
                }
                items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            } catch (err) { console.warn('[w14]', err); }
            return items;
        };
    }

    w14InitContactWatch();
    if (typeof renderAgentTicketsTable === 'function') renderAgentTicketsTable();
    if (typeof renderCitizenTracker === 'function') renderCitizenTracker();
    document.addEventListener('tn:langchange', () => { try { renderAgentTicketsTable(); renderCitizenTracker(); } catch (err) { } });
});
