// ==========================================
// VAGUE 22 — Rapport synthétique de l'activité de la plateforme (F103)
// Pour les responsables : un rapport lisible en une minute (résumé en phrases, ce qu'il faut faire en priorité,
// chiffres clés avec comparaison, tableau par service, incidents), imprimable ou téléchargeable.
// Données : demandes de l'espace agent (citizenTickets), /api/agent/report (usage, sécurité, serveurs, diffusions, incidents, partenaires).
// Réutilise : tnParseStamp, tnFormatAge, w14Urgency, w15Api, w15Unlocked, announce, escapeHtml, t().
// ==========================================

const W22T = (source, params) => escapeHtml(String(t(source, params)));
const w22 = { days: 7, data: null, report: null, loading: false };
const W22_PERIODS = { 1: 'les dernières 24 h', 7: 'les 7 derniers jours', 30: 'les 30 derniers jours' };

function w22Time(iso) { const d = new Date(iso); return isNaN(d) ? '—' : d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function w22Plural(n, one, many) { return `${n} ${n > 1 ? many : one}`; }
function w22Pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : null; }
function w22Trend(now, before) {
    if (!before) return null;
    const pct = Math.round(((now - before) / before) * 100);
    return pct;
}
function w22TrendText(pct, goodWhenUp) {
    if (pct === null || pct === undefined) return { text: t('pas de période précédente'), cls: 'neutral' };
    if (pct === 0) return { text: t('stable'), cls: 'neutral' };
    const up = pct > 0;
    return { text: (up ? '▲ +' : '▼ ') + pct + ' % ' + t('sur la période précédente'), cls: (up === goodWhenUp) ? 'resolved' : 'pending' };
}
function w22Hours(from, to) {
    const a = tnParseStamp(from), b = tnParseStamp(to);
    return a && b ? Math.max(0, (b - a) / 3600000) : null;
}
function w22Duration(hours) {
    if (hours === null || hours === undefined) return '—';
    if (hours < 1) return t('{n} min', { n: Math.round(hours * 60) });
    if (hours < 48) return t('{h} h', { h: Math.round(hours * 10) / 10 });
    return t('{d} j', { d: Math.round(hours / 24) });
}

// ------------------------------------------
// Chiffres tirés des demandes
// ------------------------------------------
function w22Tickets(days) {
    const now = Date.now();
    const span = days * 86400000;
    const all = typeof citizenTickets !== 'undefined' ? citizenTickets : [];
    const inPeriod = [], before = [];
    all.forEach(ticket => {
        const date = tnParseStamp(ticket.date);
        if (!date) return;
        const age = now - date.getTime();
        if (age <= span) inPeriod.push(ticket); else if (age <= 2 * span) before.push(ticket);
    });
    const open = all.filter(ticket => ticket.status !== 'Résolu');
    const urgentOpen = open.filter(ticket => typeof w14Urgency === 'function' && w14Urgency(ticket, 1).rank >= 2);
    const medicalOpen = open.filter(ticket => ticket.medicalUrgent);
    const oldest = open.filter(ticket => ticket.status === 'En attente').reduce((first, ticket) => (!first || String(ticket.date) < String(first.date) ? ticket : first), null);
    const resolvedIn = inPeriod.filter(ticket => ticket.status === 'Résolu');
    const ratings = all.filter(ticket => ticket.feedback && ticket.feedback.rating).map(ticket => ticket.feedback.rating);
    const handling = [];
    all.forEach(ticket => {
        const history = Array.isArray(ticket.history) ? ticket.history : [];
        const done = history.find(entry => entry.status === 'Résolu' && entry.date);
        if (done) { const h = w22Hours(ticket.date, done.date); if (h !== null) handling.push(h); }
    });
    const byService = {};
    all.forEach(ticket => {
        const row = byService[ticket.service] || (byService[ticket.service] = { service: ticket.service, received: 0, resolved: 0, open: 0, ratings: [] });
        const date = tnParseStamp(ticket.date);
        if (date && now - date.getTime() <= span) row.received += 1;
        if (ticket.status === 'Résolu') row.resolved += 1; else row.open += 1;
        if (ticket.feedback && ticket.feedback.rating) row.ratings.push(ticket.feedback.rating);
    });
    const services = Object.values(byService).map(row => Object.assign(row, { avg: row.ratings.length ? Math.round((row.ratings.reduce((a, b) => a + b, 0) / row.ratings.length) * 10) / 10 : null })).sort((a, b) => b.received - a.received || b.open - a.open);
    return {
        total: all.length, received: inPeriod.length, receivedBefore: before.length, resolvedIn: resolvedIn.length,
        open: open.length, pending: open.filter(ticket => ticket.status === 'En attente').length, inProgress: open.filter(ticket => ticket.status === 'En cours').length,
        urgentOpen: urgentOpen.length, medicalOpen: medicalOpen.length, oldest,
        oldestHours: oldest && tnParseStamp(oldest.date) ? (now - tnParseStamp(oldest.date).getTime()) / 3600000 : null,
        satisfaction: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null, ratingCount: ratings.length,
        handlingHours: handling.length ? handling.reduce((a, b) => a + b, 0) / handling.length : null, services
    };
}

// ------------------------------------------
// Synthèse et priorités (règles lisibles)
// ------------------------------------------
function w22Summary(days, tk, server) {
    const lines = [];
    const period = t(W22_PERIODS[days]);
    const rate = w22Pct(tk.resolvedIn, tk.received);
    lines.push(tk.received
        ? t('Sur {period} : {received}, dont {resolved}{rate}.', { period, received: w22Plural(tk.received, t('demande reçue'), t('demandes reçues')), resolved: w22Plural(tk.resolvedIn, t('résolue'), t('résolues')), rate: rate !== null ? ` (${rate} %)` : '' })
        : t("Sur {period}, aucune nouvelle demande n'a été reçue.", { period }));
    if (tk.open) lines.push(t('Reste à traiter : {n} ({p} en attente, {c} en cours){u}.', { n: w22Plural(tk.open, t('demande'), t('demandes')), p: tk.pending, c: tk.inProgress, u: tk.urgentOpen ? t(', dont {n} urgente(s)', { n: tk.urgentOpen }) : '' }));
    else lines.push(t('Aucune demande en attente de traitement.'));
    if (tk.services.length && tk.services[0].received) lines.push(t('Le service le plus sollicité est « {s} » ({n}).', { s: tk.services[0].service, n: w22Plural(tk.services[0].received, t('demande'), t('demandes')) }));
    if (server) {
        const top = server.usage && server.usage.services && server.usage.services[0];
        if (top) lines.push(t("Côté consultation, « {s} » est le service le plus consulté ({n}).", { s: top.service, n: w22Plural(top.total, t('usage'), t('usages')) }));
        const state = { nominal: t('normale'), degraded: t('dégradée'), overload: t('en surcharge') }[server.platform.state] || server.platform.state;
        lines.push(t("La plateforme fonctionne de manière {state} ; {e} % d'erreurs côté serveur sur les dernières minutes.", { state, e: server.platform.requests.errorRatePct }));
        if (server.incidents.total) lines.push(t('Incidents ou exercices déclarés sur la période : {n}.', { n: server.incidents.total }));
    } else lines.push(t("Les données du serveur ne sont pas disponibles : le rapport ne contient que les demandes."));
    return lines;
}

function w22Priorities(days, tk, server) {
    const list = [];
    if (tk.medicalOpen) list.push({ level: 'high', text: t('Demandes médicales encore ouvertes : {n}. À traiter immédiatement.', { n: tk.medicalOpen }) });
    if (tk.urgentOpen) list.push({ level: 'high', text: t('Demandes urgentes encore ouvertes : {n}. À traiter en premier.', { n: tk.urgentOpen }) });
    if (tk.oldest && tk.oldestHours !== null && tk.oldestHours > 48) list.push({ level: 'medium', text: t('La plus ancienne demande en attente a {age} ({id}, {service}) : la reprendre.', { age: w22Duration(tk.oldestHours), id: tk.oldest.id, service: tk.oldest.service }) });
    const rate = w22Pct(tk.resolvedIn, tk.received);
    if (tk.received >= 5 && rate !== null && rate < 50) list.push({ level: 'medium', text: t('Moins de la moitié des demandes reçues est résolue ({rate} %) : renforcer le traitement.', { rate }) });
    const low = tk.services.filter(row => row.avg !== null && row.ratings.length >= 2 && row.avg < 3).sort((a, b) => a.avg - b.avg)[0];
    if (low) list.push({ level: 'medium', text: t('Satisfaction basse pour « {s} » ({avg}/5) : lire les avis des habitants.', { s: low.service, avg: low.avg }) });
    if (server) {
        if (server.current.outage) list.push({ level: 'high', text: t('Une alerte panne électrique est en cours : mettre à jour les habitants.') });
        if (server.current.solar) list.push({ level: 'high', text: t('Une alerte tempête solaire est en cours : mettre à jour les habitants.') });
        if (server.current.transport) list.push({ level: 'medium', text: t('{n} ligne(s) de transport sont interrompues.', { n: server.current.transport }) });
        if (server.security.alertsNow) list.push({ level: 'high', text: t('{n} alerte(s) de sécurité ouvertes : voir « Centre de sécurité ».', { n: server.security.alertsNow }) });
        if (server.partners.pending) list.push({ level: 'low', text: t('{n} proposition(s) de partenaire attendent une validation.', { n: server.partners.pending }) });
        if (server.platform.state !== 'nominal') list.push({ level: 'high', text: t('La plateforme est {state} : voir « Centre technique ».', { state: server.platform.state === 'overload' ? t('en surcharge') : t('dégradée') }) });
        else if (server.platform.latency.p95 > 800) list.push({ level: 'medium', text: t('Réponses lentes (95 % sous {ms} ms) : surveiller la charge.', { ms: server.platform.latency.p95 }) });
    }
    if (!list.length) list.push({ level: 'ok', text: t("Rien d'urgent : la situation est normale.") });
    const rank = { high: 0, medium: 1, low: 2, ok: 3 };
    return list.sort((a, b) => rank[a.level] - rank[b.level]);
}

// ------------------------------------------
// Rapport : HTML (affichage, impression, téléchargement)
// ------------------------------------------
function w22Tiles(days, tk, server) {
    const tiles = [];
    const tr = w22TrendText(w22Trend(tk.received, tk.receivedBefore), false);
    tiles.push([t('Demandes reçues'), tk.received, tr.text, tr.cls]);
    const rate = w22Pct(tk.resolvedIn, tk.received);
    tiles.push([t('Demandes résolues'), tk.resolvedIn, rate !== null ? t('{rate} % des demandes reçues', { rate }) : '—', rate !== null && rate >= 70 ? 'resolved' : 'neutral']);
    tiles.push([t('À traiter maintenant'), tk.open, tk.urgentOpen ? t('dont {n} urgentes', { n: tk.urgentOpen }) : t('aucune urgente'), tk.urgentOpen ? 'pending' : 'resolved']);
    tiles.push([t('Délai moyen de résolution'), w22Duration(tk.handlingHours), tk.handlingHours === null ? t('pas encore de demande résolue datée') : '', 'neutral']);
    tiles.push([t('Satisfaction'), tk.satisfaction !== null ? tk.satisfaction + ' / 5' : '—', tk.satisfaction !== null ? t('{n} avis', { n: tk.ratingCount }) : t('aucun avis'), tk.satisfaction !== null && tk.satisfaction < 3 ? 'pending' : 'neutral']);
    if (server) {
        const usageTr = w22TrendText(w22Trend(server.usage.grandTotal, server.usage.services.reduce((sum, row) => sum + row.before, 0)), true);
        tiles.push([t('Consultations des services'), server.usage.grandTotal, usageTr.text, usageTr.cls]);
        tiles.push([t('Messages diffusés'), server.broadcasts.published, t('dont {n} officiels', { n: server.broadcasts.official }), 'neutral']);
        tiles.push([t('Incidents et exercices'), server.incidents.total, Object.entries(server.incidents.byKind).map(([kind, n]) => `${{ power: t('électricité'), solar: t('tempête solaire'), transport: t('transports') }[kind] || kind} ${n}`).join(', ') || '—', server.incidents.total ? 'pending' : 'resolved']);
        tiles.push([t('Disponibilité'), { nominal: t('Normale'), degraded: t('Dégradée'), overload: t('Surcharge') }[server.platform.state] || server.platform.state, t('{e} % d\'erreurs, 95 % des réponses sous {ms} ms', { e: server.platform.requests.errorRatePct, ms: server.platform.latency.p95 }), server.platform.state === 'nominal' ? 'resolved' : 'pending']);
        const sec = server.security.events;
        tiles.push([t('Événements de sécurité'), sec, server.security.alertsNow ? t('{n} alerte(s) ouverte(s)', { n: server.security.alertsNow }) : t('aucune alerte'), server.security.alertsNow ? 'pending' : 'resolved']);
    }
    return tiles;
}

function w22Html(days, tk, server, opts) {
    const e = escapeHtml;
    const summary = w22Summary(days, tk, server);
    const prios = w22Priorities(days, tk, server);
    const tiles = w22Tiles(days, tk, server);
    const icon = { high: '▲', medium: '●', low: '○', ok: '✓' };
    const levelLabel = { high: t('Urgent'), medium: t('À surveiller'), low: t('Plus tard'), ok: t('OK') };
    return `
    <header class="w22-head"><h4 class="w22-title">${W22T("Rapport d'activité de la plateforme")}</h4>
        <p class="w22-sub" data-no-i18n>${e(t('Période'))} : ${e(t(W22_PERIODS[days]))} · ${e(t('établi le'))} ${e(w22Time(new Date().toISOString()))}</p></header>
    <section class="w22-block"><h5 class="w22-h">${W22T('En bref')}</h5><ul class="w22-summary" data-no-i18n>${summary.map(line => `<li>${e(line)}</li>`).join('')}</ul></section>
    <section class="w22-block"><h5 class="w22-h">${W22T('À faire en priorité')}</h5><ul class="w22-prios" data-no-i18n>${prios.map(item => `<li class="w22-prio w22-prio--${item.level}"><span class="w22-prio-tag"><span aria-hidden="true">${icon[item.level]}</span> ${e(levelLabel[item.level])}</span> ${e(item.text)}</li>`).join('')}</ul></section>
    <section class="w22-block"><h5 class="w22-h">${W22T('Chiffres clés')}</h5><div class="w22-tiles" data-no-i18n>${tiles.map(([label, value, note, cls]) => `<div class="w22-tile w22-tile--${cls}"><div class="w22-tile-label">${e(label)}</div><div class="w22-tile-value">${e(value)}</div><div class="w22-tile-note">${e(note)}</div></div>`).join('')}</div></section>
    <section class="w22-block"><h5 class="w22-h">${W22T('Demandes par service')}</h5>${tk.services.length ? `<div class="w22-wrap"><table class="w22-table"><caption class="sr-only">${W22T('Demandes par service')}</caption><thead><tr><th scope="col">${W22T('Service')}</th><th scope="col">${W22T('Reçues')}</th><th scope="col">${W22T('Résolues')}</th><th scope="col">${W22T('À traiter')}</th><th scope="col">${W22T('Satisfaction')}</th></tr></thead><tbody data-no-i18n>${tk.services.map(row => `<tr><th scope="row">${e(row.service)}</th><td>${row.received}</td><td>${row.resolved}</td><td>${row.open}</td><td>${row.avg !== null ? row.avg + ' / 5' : '—'}</td></tr>`).join('')}</tbody></table></div>` : `<p class="tn-hint">${W22T('Aucune demande enregistrée.')}</p>`}</section>
    ${server && server.incidents.recent.length ? `<section class="w22-block"><h5 class="w22-h">${W22T('Derniers incidents')}</h5><ul class="w22-incidents" data-no-i18n>${server.incidents.recent.map(item => `<li><strong>${e(w22Time(item.at))}</strong> · ${e(item.action)} · ${e(item.detail)}</li>`).join('')}</ul></section>` : ''}
    <section class="w22-block w22-notes"><h5 class="w22-h">${W22T('Comment lire ce rapport')}</h5><ul class="tn-hint">
        <li>${W22T("Les demandes viennent du suivi de cet appareil (données de démonstration comprises) ; les consultations, diffusions, incidents et la sécurité viennent du serveur.")}</li>
        <li>${W22T("La sécurité couvre les 300 derniers événements du journal ; les requêtes serveur comptent depuis son dernier démarrage.")}</li>
        <li>${W22T("Les priorités suivent des règles simples : urgences ouvertes, attente de plus de 48 h, résolution sous 50 %, satisfaction sous 3/5, alertes et état des serveurs.")}</li></ul></section>`;
}

function w22Standalone(days, tk, server) {
    const css = 'body{font:15px/1.5 system-ui,sans-serif;max-width:52rem;margin:0 auto;padding:1rem;color:#111}h4{font-size:1.4rem;margin:.2rem 0}.w22-sub{color:#444;margin:0 0 1rem}.w22-h{font-size:1rem;border-bottom:2px solid #0a6;padding-bottom:.2rem;margin:1.4rem 0 .5rem}ul{padding-left:1.2rem}li{margin:.3rem 0}.w22-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));gap:.5rem}.w22-tile{border:1px solid #999;padding:.5rem}.w22-tile-label{font-size:.75rem;text-transform:uppercase;color:#444}.w22-tile-value{font-size:1.5rem;font-weight:800}.w22-tile-note{font-size:.8rem;color:#333}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #bbb;padding:.3rem .5rem;text-align:left}ul.w22-prios,ul.w22-summary{list-style:none;padding:0}.w22-prio-tag{font-weight:800;margin-right:.4rem}.sr-only{display:none}';
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rapport d'activité — Terra Nova</title><style>${css}</style></head><body>${w22Html(days, tk, server)}</body></html>`;
}

function w22Text(days, tk, server) {
    const summary = w22Summary(days, tk, server);
    const prios = w22Priorities(days, tk, server);
    return `RAPPORT D'ACTIVITÉ — TERRA NOVA (${t(W22_PERIODS[days])})\n\nEN BREF\n${summary.map(line => '- ' + line).join('\n')}\n\nÀ FAIRE EN PRIORITÉ\n${prios.map(item => '- ' + item.text).join('\n')}\n`;
}

function w22Csv(tk) {
    const rows = [['Service', 'Reçues', 'Résolues', 'À traiter', 'Satisfaction']].concat(tk.services.map(row => [row.service, row.received, row.resolved, row.open, row.avg === null ? '' : row.avg]));
    return '﻿' + rows.map(row => row.map(cell => /[";\n,]/.test(String(cell)) ? '"' + String(cell).replace(/"/g, '""') + '"' : cell).join(';')).join('\n');
}

// ------------------------------------------
// Panneau
// ------------------------------------------
async function w22Load() {
    const box = document.getElementById('w22-body');
    if (!box) return;
    if (!w15Unlocked()) {
        w22.report = null;
        box.innerHTML = `<p class="tn-hint"><i aria-hidden="true" class="fa-solid fa-lock"></i> ${W22T('Réservé aux agents connectés.')} <a class="tn-link" href="#w15-security">${W22T("Ouvrir le centre de sécurité pour s'identifier")}</a></p>`;
        return;
    }
    if (w22.loading) return;
    w22.loading = true;
    box.setAttribute('aria-busy', 'true');
    const result = await w15Api('/api/agent/report?days=' + w22.days);
    w22.loading = false;
    box.removeAttribute('aria-busy');
    w22.report = result.ok ? result.data : null;
    w22Render();
}

function w22Render() {
    const box = document.getElementById('w22-body');
    if (!box || !w15Unlocked()) return;
    const tk = w22Tickets(w22.days);
    box.innerHTML = `
        <div class="w19-toolbar" role="group" aria-label="${escapeHtml(t('Période du rapport'))}">
            ${[1, 7, 30].map(d => `<button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w22="period" data-days="${d}" aria-pressed="${w22.days === d}">${W22T(d === 1 ? '24 h' : d + ' jours')}</button>`).join('')}
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w22="refresh">${W22T('Actualiser')}</button>
        </div>
        <article id="w22-report" class="w22-report">${w22Html(w22.days, tk, w22.report)}</article>
        <div class="w19-toolbar">
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w22="print">${W22T('Imprimer / enregistrer en PDF')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w22="download">${W22T('Télécharger (HTML)')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w22="copy">${W22T('Copier le résumé')}</button>
            <button type="button" class="btn-cyber px-3 py-1 text-xs font-bold uppercase" data-w22="csv">${W22T('Exporter le tableau (CSV)')}</button>
        </div>
        <p id="w22-msg" class="tn-hint" role="status"></p>`;
}

function w22Download(name, text, type) {
    const blob = new Blob([text], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
}

function w22Print() {
    const tk = w22Tickets(w22.days);
    const root = document.createElement('div');
    root.id = 'w22-print-root';
    root.innerHTML = w22Html(w22.days, tk, w22.report);
    document.body.appendChild(root);
    document.documentElement.classList.add('w22-printing');
    const done = () => { document.documentElement.classList.remove('w22-printing'); root.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
    setTimeout(() => { if (document.getElementById('w22-print-root')) done(); }, 3000);
}

document.addEventListener('click', async event => {
    const el = event.target.closest('[data-w22]');
    if (!el) return;
    const msg = () => document.getElementById('w22-msg');
    switch (el.dataset.w22) {
        case 'period': w22.days = Number(el.dataset.days); w22Load(); break;
        case 'refresh': w22Load(); break;
        case 'print': w22Print(); break;
        case 'download': w22Download(`rapport-activite-terra-nova-${w22.days}j.html`, w22Standalone(w22.days, w22Tickets(w22.days), w22.report), 'text/html;charset=utf-8'); if (msg()) msg().textContent = t('Rapport téléchargé : un seul fichier lisible sans connexion.'); break;
        case 'csv': w22Download(`rapport-par-service-${w22.days}j.csv`, w22Csv(w22Tickets(w22.days)), 'text/csv;charset=utf-8'); break;
        case 'copy': {
            const text = w22Text(w22.days, w22Tickets(w22.days), w22.report);
            try { await navigator.clipboard.writeText(text); if (msg()) msg().textContent = t('Résumé copié : vous pouvez le coller dans un message.'); }
            catch (err) { w22Download('resume-activite.txt', text, 'text/plain;charset=utf-8'); if (msg()) msg().textContent = t('Copie impossible : le résumé a été téléchargé.'); }
            break;
        }
    }
});

function w22Build() {
    const workspace = document.getElementById('agent-workspace-content');
    if (!workspace || document.getElementById('w22-panel')) return;
    const panel = document.createElement('section');
    panel.id = 'w22-panel';
    panel.className = 'w15-panel';
    panel.setAttribute('aria-labelledby', 'w22-panel-title');
    panel.innerHTML = `<h3 id="w22-panel-title" class="w13-title"><i aria-hidden="true" class="fa-solid fa-file-lines"></i> ${W22T("Rapport d'activité")}</h3>
        <p class="tn-hint">${W22T("Un rapport clair pour les responsables : l'essentiel en quelques phrases, ce qu'il faut faire en priorité, les chiffres qui comptent et leur évolution.")}</p>
        <div id="w22-body"></div>`;
    workspace.prepend(panel);
    w22Load();
}

document.addEventListener('DOMContentLoaded', () => {
    w22Build();
    document.addEventListener('tn:agent-session', w22Load);
    document.addEventListener('tn:langchange', () => { const p = document.getElementById('w22-panel'); if (p) { p.remove(); w22Build(); } });
});
