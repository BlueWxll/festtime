// ==========================================
// VAGUE 13 (suite) — F89 version en langage clair des contenus administratifs, F90 explication simple à la demande.
// Chargé après assets/wave13.js ; réutilise tnServices, openNewsDetail, newsData, W6_LEXICON, w4OpenDialog, announce.
// ==========================================

const W13B_KEY = 'tn_w13_plain';
const W13BT = (source, params) => escapeHtml(String(t(source, params)));

// Versions en langage clair : même sens, mêmes chiffres, phrases courtes
const W13_PLAIN = {
    services: {
        'Atmosphère & Biosphère': {
            plain: 'Ce service s\'occupe de l\'air que vous respirez : 78 % d\'azote (N₂) et 21 % d\'oxygène (O₂). Il retire les poussières venues de l\'espace et il réutilise l\'eau lourde dans les 4 anneaux de la ville.',
            todo: 'Vous pouvez signaler une fuite ou demander une mesure de l\'oxygène (O₂).'
        },
        'Transports & Hyper-Tubes': {
            plain: 'Des capsules roulent très vite (1 200 km/h) dans des tubes sans air. Elles relient les dômes où l\'on habite, le port des vaisseaux (le spatioport) et les zones d\'usines.',
            todo: 'Vous pouvez demander un titre de transport ou envoyer des bagages en cargo.'
        },
        'Énergie Plasma & Réacteur Zéro': {
            plain: 'Ce service produit l\'énergie de la ville. Il l\'envoie aux boucliers qui protègent les dômes, et il donne à chaque foyer sa part de crédits d\'énergie.',
            todo: 'Vous pouvez demander un raccordement ou une hausse de votre quota.'
        },
        'Santé Biotech & Cryo-Soins': {
            plain: 'Ce service soigne et suit votre santé : soins pour réparer les cellules, contrôle de votre implant biolink, aide pour s\'habituer à la gravité de Terra Nova, et soins après un choc lié à l\'espace.',
            todo: 'Vous pouvez prendre une visite médicale ou demander un certificat de colon.'
        },
        'Sécurité Civile & Sentinelles': {
            plain: 'Ce service surveille les sas (les portes entre l\'intérieur et l\'extérieur). Des drones patrouillent, et le service veille à ce que tout reste calme dans les dômes.',
            todo: 'Vous pouvez signaler un incident ou demander un badge pour un sas.'
        },
        'Mairie & État Civil Spatial': {
            plain: 'La mairie vous donne votre matricule (votre numéro d\'habitant). Elle enregistre les naissances et les mariages sous le dôme, et elle s\'occupe des papiers qui prouvent qu\'un logement est à vous.',
            todo: 'Vous pouvez créer un compte ou changer de dôme.'
        }
    },
    news: {
        'Ouverture Officielle du Portail Numérique Citoyen': {
            plain: [
                'Le Haut Conseil ouvre le portail numérique de la ville à tous les habitants. Il fait partie du plan de développement 2842.',
                'Avec ce portail, vous pouvez : créer votre compte et recevoir tout de suite votre matricule unique ; entrer dans les 6 services de la ville (air, transports, énergie, santé, sécurité, mairie) ; envoyer une demande et recevoir aussitôt une preuve de réception.'
            ],
            todo: 'À faire : vérifier dès maintenant votre accréditation biolink (l\'autorisation liée à votre implant).'
        },
        'Passage d\'Orage Ionique : Renforcement des Boucliers': {
            plain: [
                'Une très forte tempête solaire (classe X) passe près de la ville. Par sécurité, les générateurs de l\'Anneau Zéro sont en mode urgence.',
                'Il n\'y a aucun risque de trou dans les dômes : ils sont intacts à 99,8 %. Les navettes Hyper-Tube roulent normalement.'
            ],
            todo: 'À faire : évitez de sortir à l\'extérieur. Si vous devez sortir, portez une combinaison blindée sous pression.'
        },
        'Nouvelle Ligne d\'Hyper-Tube vers les Serres d\'Orion': {
            plain: [
                'Une nouvelle ligne d\'Hyper-Tube express est ouverte : la ligne 6.',
                'Elle relie le centre du Dôme Bêta, où l\'on habite, aux serres d\'Orion en moins de 3 minutes. Elle aide les botanistes et les techniciens de surface à se déplacer chaque jour.'
            ],
            todo: ''
        }
    }
};

function w13bPref() { try { return localStorage.getItem(W13B_KEY) === '1'; } catch (err) { return false; } }
function w13bSetPref(on) { try { localStorage.setItem(W13B_KEY, on ? '1' : '0'); } catch (err) { } }

// ------------------------------------------
// Vérification : chaque chiffre et chaque date du texte officiel doit se retrouver dans la version claire
// ------------------------------------------
function w13bNormNumbers(text) {
    const folded = w13Fold(String(text).replace(/<[^>]+>/g, ' ')).replace(/(\d)\s+(?=\d{3}\b)/g, '$1').replace(/(\d)\s*[,.]\s*(\d)/g, '$1.$2');
    return Array.from(new Set(folded.match(/\d+(?:\.\d+)?/g) || []));
}
function w13bCheck(official, plain) {
    const wanted = w13bNormNumbers(official);
    const have = new Set(w13bNormNumbers(plain));
    const missing = wanted.filter(value => !have.has(value));
    return { total: wanted.length, kept: wanted.length - missing.length, missing };
}
function w13bFactsHtml(official, plain) {
    const check = w13bCheck(official, plain);
    if (!check.total) return '';
    return check.missing.length
        ? `<p class="w13-facts w13-facts--warn" data-no-i18n>⚠ ${escapeHtml(t('Chiffres à vérifier dans le texte officiel : {list}', { list: check.missing.join(', ') }))}</p>`
        : `<p class="w13-facts" data-no-i18n>✔ ${escapeHtml(t('Chiffres et dates conservés : {kept} sur {total}', { kept: check.kept, total: check.total }))}</p>`;
}

// ------------------------------------------
// F89 — Services en langage clair
// ------------------------------------------
function w13bPlainBlock(service) {
    const entry = W13_PLAIN.services[service.name];
    if (!entry) return '';
    return `<p class="w13-plain-text">${W13BT(entry.plain)}</p>${entry.todo ? `<p class="w13-plain-todo">${W13BT(entry.todo)}</p>` : ''}${w13bFactsHtml(service.description, entry.plain)}`;
}

function w13bDecorateServices() {
    if (typeof tnServices === 'undefined') return;
    tnServices.forEach((service, index) => {
        const description = service.card.querySelector('p');
        if (!description || service.card.querySelector('.w13-plain-block')) return;
        description.classList.add('w13-official');
        const block = document.createElement('div');
        block.className = 'w13-plain-block';
        block.hidden = true;
        block.dataset.noI18n = '';
        block.innerHTML = w13bPlainBlock(service);
        description.after(block);
        const tools = document.createElement('div');
        tools.className = 'w13-card-tools';
        tools.innerHTML = `<button type="button" class="w13-link" data-w13b="card-plain" data-index="${index}" aria-pressed="false">${W13BT('Langage clair')}</button><button type="button" class="w13-link" data-w13b="explain-service" data-index="${index}">${W13BT('Expliquer simplement')}</button>`;
        block.after(tools);
    });
    w13bApplyServices();
}

function w13bApplyServices() {
    const global = w13bPref();
    document.querySelectorAll('#services-grid .service-item').forEach(card => {
        const block = card.querySelector('.w13-plain-block');
        const description = card.querySelector('.w13-official');
        const toggle = card.querySelector('[data-w13b="card-plain"]');
        if (!block || !description) return;
        const on = global || card.dataset.w13Plain === '1';
        block.hidden = !on;
        description.hidden = on;
        if (toggle) toggle.setAttribute('aria-pressed', String(on));
    });
}

function w13bToggleCard(index) {
    const service = tnServices[index];
    if (!service) return;
    const card = service.card;
    card.dataset.w13Plain = card.dataset.w13Plain === '1' ? '0' : '1';
    if (w13bPref() && card.dataset.w13Plain === '0') { w13bSetPref(false); w13bRenderToolbar(); }
    const block = card.querySelector('.w13-plain-block');
    block.hidden = card.dataset.w13Plain !== '1';
    card.querySelector('.w13-official').hidden = card.dataset.w13Plain === '1';
    card.querySelector('[data-w13b="card-plain"]').setAttribute('aria-pressed', String(card.dataset.w13Plain === '1'));
}

// ------------------------------------------
// F89 — Actualités et décrets en langage clair
// ------------------------------------------
function w13bNewsHtml(article, plainMode) {
    const entry = W13_PLAIN.news[article.title];
    if (!entry) return null;
    const officialText = String(article.content).replace(/<[^>]+>/g, ' ');
    const plainText = entry.plain.join(' ') + ' ' + entry.todo;
    return plainMode
        ? `<div class="w13-plain-block w13-plain-block--news">${entry.plain.map(paragraph => `<p>${W13BT(paragraph)}</p>`).join('')}${entry.todo ? `<p class="w13-plain-todo">${W13BT(entry.todo)}</p>` : ''}${w13bFactsHtml(officialText + ' ' + article.badge + ' ' + article.date, plainText + ' ' + article.badge + ' ' + article.date)}</div>`
        : article.content;
}

let w13bNewsIndex = -1;
function w13bDecorateNews(index) {
    const article = newsData[index];
    const body = document.getElementById('news-modal-content');
    if (!article || !body) return;
    w13bNewsIndex = index;
    const known = Boolean(W13_PLAIN.news[article.title]);
    const plainMode = known && (w13bPref() || body.dataset.w13Plain === '1');
    body.dataset.w13Plain = plainMode ? '1' : '0';
    const toolbar = `<div class="w13-news-tools">
        ${known ? `<button type="button" class="tn-tab" data-w13b="news-toggle" aria-pressed="${plainMode}">${W13BT('Langage clair')}</button>` : ''}
        <button type="button" class="tn-tab" data-w13b="explain-news">${W13BT('Expliquer simplement')}</button></div>`;
    body.innerHTML = toolbar + `<div id="w13-news-body">${known ? w13bNewsHtml(article, plainMode) : article.content}</div>`;
}

// ------------------------------------------
// F90 — Explication simple, uniquement à la demande
// ------------------------------------------
const W13_JARGON = [
    [/conformément à/gi, 'selon'], [/afin de/gi, 'pour'], [/au sein de/gi, 'dans'], [/dans les meilleurs délais/gi, 'le plus vite possible'],
    [/sans délai/gi, 'tout de suite'], [/est invitée? à/gi, 'doit'], [/sont invitée?s à/gi, 'doivent'], [/est tenue? de/gi, 'doit'], [/sont tenue?s de/gi, 'doivent'],
    [/s'acquitter de/gi, 'payer'], [/acquitter/gi, 'payer'], [/dépôt/gi, 'remise'], [/déposer/gi, 'remettre'], [/allocation/gi, 'attribution'],
    [/attribution/gi, 'remise'], [/régulation/gi, 'contrôle'], [/filtration/gi, 'nettoyage'], [/recyclage/gi, 'réutilisation'], [/protocoles/gi, 'méthodes'],
    [/protocole/gi, 'méthode'], [/traumatismes/gi, 'chocs'], [/pérennité/gi, 'durée'], [/desserte/gi, 'ligne'], [/inauguration/gi, 'ouverture'],
    [/accréditation/gi, 'autorisation'], [/résidents?/gi, match => /s$/i.test(match) ? 'habitants' : 'habitant'], [/requêtes?/gi, match => /s$/i.test(match) ? 'demandes' : 'demande'],
    [/doléances?/gi, match => /s$/i.test(match) ? 'plaintes' : 'plainte'], [/ci-après/gi, 'plus bas'], [/néanmoins/gi, 'mais'], [/toutefois/gi, 'mais'],
    [/par conséquent/gi, 'donc'], [/en outre/gi, 'de plus'], [/préalablement/gi, 'avant'], [/ultérieurement/gi, 'plus tard'], [/dès lors que/gi, 'quand'],
    [/à l'issue de/gi, 'à la fin de'], [/faire l'objet de/gi, 'être'], [/dans le cadre de/gi, 'pour'], [/mettre en œuvre/gi, 'faire'], [/procéder à/gi, 'faire'],
    [/effectuer/gi, 'faire'], [/s'agissant de/gi, 'pour'], [/il convient de/gi, 'il faut'], [/afférent(e?s?)/gi, 'lié$1'], [/dispositifs?/gi, match => /s$/i.test(match) ? 'systèmes' : 'système'],
    [/modalités/gi, 'façons de faire'], [/habilitations?/gi, 'droit d\'accès'], [/justificatifs?/gi, match => /s$/i.test(match) ? 'papiers qui prouvent' : 'papier qui prouve'],
    [/au titre de/gi, 'pour'], [/en vue de/gi, 'pour'], [/à titre gratuit/gi, 'sans payer'], [/ladite?/gi, 'cette'], [/ledit/gi, 'ce'], [/sus-?mentionné(e?s?)/gi, 'dont on a parlé'],
    [/notamment/gi, 'par exemple'], [/ainsi que/gi, 'et'], [/au préalable/gi, 'avant'], [/à compter de/gi, 'à partir de'], [/émetteur/gi, 'auteur'],
    [/micro-fusion quantique/gi, 'production d\'énergie'], [/mégawatts/gi, 'unités d\'énergie'], [/surveillance automatisée/gi, 'surveillance par des machines'],
    [/maintien de la paix/gi, 'calme et sécurité'], [/gestion/gi, 'suivi'], [/enregistrement/gi, 'inscription'], [/titres de propriété/gi, 'papiers du logement']
];

function w13bSentences(text) {
    return String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?;:])\s+(?=[A-ZÀ-ÖØ-Þ«"(])/);
}

function w13bBreak(sentence) {
    const words = sentence.split(' ').length;
    if (words <= 20) return [sentence];
    const parts = sentence.split(/,\s+(?=(?:et|ou|mais|car|donc|qui|que|afin|pour|lorsque|alors que|dont|où|puis)\b)|\s+(?=(?:afin de|pour que|lorsque|alors que)\b)|;\s*/);
    if (parts.length < 2) return [sentence];
    const merged = [];
    parts.forEach(part => {
        if (merged.length && part.split(' ').length < 5) merged[merged.length - 1] += ', ' + part;
        else merged.push(part);
    });
    return merged;
}

function w13bCapital(text) { return text.replace(/^[\s«"(]*[a-zà-öø-ÿ]/, match => match.toUpperCase()); }

function w13bFacts(text) {
    const found = String(text).match(/(?:N°\s?[\d-]+|Cycle\s[A-Z]+-\d+|\d[\d\s.,]*\s?(?:%|km\/h|minutes?|min|heures?|h|jours?|mois|ans|crédits?|anneaux|dômes?|services?)\b|\d{1,2}\/\d{1,2}\/\d{2,4})/gi) || [];
    return Array.from(new Set(found.map(item => item.trim()))).slice(0, 8);
}

function w13bTerms(text) {
    if (typeof W6_LEXICON === 'undefined') return [];
    const folded = ' ' + w13Fold(text) + ' ';
    return W6_LEXICON.filter(entry => entry.terms.some(term => folded.includes(' ' + w13Fold(term) + ' '))).slice(0, 6).map(entry => ({ title: entry.title, plain: entry.plain }));
}

function w13bSimplify(text) {
    let work = String(text).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    let changes = 0;
    W13_JARGON.forEach(([pattern, replacement]) => {
        work = work.replace(pattern, match => {
            changes += 1;
            const value = typeof replacement === 'function' ? replacement(match) : replacement.replace('$1', '');
            return /^[A-ZÀ-Ö]/.test(match) ? value.charAt(0).toUpperCase() + value.slice(1) : value;
        });
    });
    const sentences = [];
    w13bSentences(work).forEach(sentence => w13bBreak(sentence).forEach(part => {
        const clean = w13bCapital(part.replace(/[;,]\s*$/, '').trim());
        if (clean) sentences.push(/[.!?:]$/.test(clean) ? clean : clean + '.');
    }));
    return { simple: sentences.join(' '), sentences, facts: w13bFacts(text), terms: w13bTerms(text), changes };
}

function w13bKnown(text) {
    const folded = w13Fold(text);
    for (const service of (typeof tnServices !== 'undefined' ? tnServices : [])) {
        const entry = W13_PLAIN.services[service.name];
        if (entry && w13Fold(service.description) === folded) return entry.plain + (entry.todo ? ' ' + entry.todo : '');
    }
    return '';
}

let w13bLast = '';
function w13bOpenExplain(text) {
    const source = String(text || '').trim();
    w13bLast = source;
    const body = `<div id="w13b-explain">${w13bExplainHtml(source)}</div>`;
    w4OpenDialog(W13BT('Expliquer simplement'), body);
}

function w13bExplainHtml(source) {
    if (!source) {
        return `<p class="tn-hint">${W13BT('Collez ou écrivez le passage que vous ne comprenez pas. Rien ne change sur le reste de la plateforme.')}</p>
            <form id="w13b-form" class="w13-need-form"><label class="tn-field-label" for="w13b-text">${W13BT('Texte à expliquer')}</label>
            <textarea id="w13b-text" class="cyber-input" rows="5" maxlength="1200" data-autofocus></textarea>
            <div class="w13-actions"><button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W13BT('Expliquer')}</button><button type="button" class="tn-tab" data-dialog-close>${W13BT('Fermer')}</button></div></form>`;
    }
    const known = w13bKnown(source);
    const result = w13bSimplify(source);
    const lines = known ? [known] : result.sentences;
    return `
        <h4 class="tn-w12-sub">${W13BT('Texte d\'origine')}</h4>
        <blockquote class="w13-original" data-no-i18n>${escapeHtml(source)}</blockquote>
        <h4 class="tn-w12-sub">${W13BT('En mots simples')}</h4>
        <div class="w13-simple" id="w13b-simple" data-no-i18n tabindex="-1">${lines.map(line => `<p>${escapeHtml(line)}</p>`).join('')}</div>
        ${result.facts.length ? `<h4 class="tn-w12-sub">${W13BT('À retenir')}</h4><p class="w13-chips-row" data-no-i18n>${result.facts.map(fact => `<span class="w13-fact">${escapeHtml(fact)}</span>`).join('')}</p>` : ''}
        ${result.terms.length ? `<h4 class="tn-w12-sub">${W13BT('Mots expliqués')}</h4><dl class="w13-terms">${result.terms.map(term => `<div><dt>${W13BT(term.title)}</dt><dd>${W13BT(term.plain)}</dd></div>`).join('')}</dl>` : ''}
        <div id="w13b-ai" aria-live="polite"></div>
        <div class="w13-actions">
            <button type="button" class="tn-tab" data-w13b="ai">${W13BT('Reformuler autrement')}</button>
            <button type="button" class="tn-tab" data-w13b="another">${W13BT('Expliquer un autre texte')}</button>
            <button type="button" class="tn-tab" data-dialog-close>${W13BT('Fermer')}</button>
        </div>
        <p class="tn-hint">${W13BT('Explication automatique : elle simplifie les mots et les phrases mais ne remplace pas le texte officiel. En cas de doute, demandez à un agent.')}</p>`;
}

async function w13bAskAi() {
    const box = document.getElementById('w13b-ai');
    if (!box || !w13bLast) return;
    box.innerHTML = `<p class="tn-hint">${W13BT('Reformulation en cours…')}</p>`;
    let text = null;
    try {
        const response = await fetch('/api/simplify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: w13bLast, lang: typeof tnLang === 'string' ? tnLang : 'fr' }) });
        const data = response.ok ? await response.json() : null;
        text = data && data.text ? data.text : null;
    } catch (err) { text = null; }
    box.innerHTML = text
        ? `<h4 class="tn-w12-sub">${W13BT('Autre formulation')}</h4><p class="w13-simple" data-no-i18n>${escapeHtml(text)}</p><p class="tn-hint">${W13BT('Reformulation générée par une IA : vérifiez les chiffres dans le texte officiel.')}</p>`
        : `<p class="tn-hint">${W13BT('La reformulation automatique n\'est pas disponible pour le moment. L\'explication ci-dessus reste valable.')}</p>`;
}

// Bouton flottant près d'une sélection de texte
let w13bSelection = '';
function w13bSelectionUpdate() {
    const button = document.getElementById('w13b-selbtn');
    if (!button) return;
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';
    const node = selection && selection.anchorNode ? (selection.anchorNode.nodeType === 1 ? selection.anchorNode : selection.anchorNode.parentElement) : null;
    const blocked = !node || node.closest('input, textarea, select, #w13-assistant, #w13b-explain, .w13-selbtn, #tn-locbar, #a11y-panel');
    if (!selection || selection.isCollapsed || text.length < 15 || text.length > 1200 || blocked) { button.hidden = true; return; }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    w13bSelection = text;
    button.hidden = false;
    button.style.top = Math.min(window.innerHeight - 44, rect.bottom + 8) + 'px';
    button.style.left = Math.max(8, Math.min(window.innerWidth - 190, rect.left)) + 'px';
}

// ------------------------------------------
// Barre d'outils
// ------------------------------------------
function w13bRenderToolbar() {
    const tools = document.querySelector('#tn-locbar .tn-tools');
    if (!tools) return;
    let plain = document.getElementById('w13b-plain-btn');
    if (!plain) {
        plain = document.createElement('button');
        plain.type = 'button';
        plain.id = 'w13b-plain-btn';
        plain.className = 'tn-tool';
        plain.dataset.w13b = 'plain';
        tools.appendChild(plain);
        const explain = document.createElement('button');
        explain.type = 'button';
        explain.id = 'w13b-explain-btn';
        explain.className = 'tn-tool';
        explain.dataset.w13b = 'explain-tool';
        explain.innerHTML = `<i aria-hidden="true" class="fa-solid fa-lightbulb"></i> <span class="tn-tool-label">${W13BT('Expliquer')}</span>`;
        explain.title = t('Expliquer simplement un texte');
        tools.appendChild(explain);
    }
    const on = w13bPref();
    plain.setAttribute('aria-pressed', String(on));
    plain.innerHTML = `<i aria-hidden="true" class="fa-solid fa-feather"></i> <span class="tn-tool-label">${W13BT('Langage clair')}</span><span class="sr-only"> : ${W13BT(on ? 'activé' : 'désactivé')}</span>`;
    plain.title = t('Afficher les textes administratifs en langage clair');
}

function w13bSetPlain(on) {
    w13bSetPref(on);
    document.querySelectorAll('#services-grid .service-item').forEach(card => { delete card.dataset.w13Plain; });
    w13bApplyServices();
    w13bRenderToolbar();
    const body = document.getElementById('news-modal-content');
    if (body && body.dataset.w13Plain !== undefined && w13bNewsIndex >= 0 && !document.getElementById('news-modal').classList.contains('hidden')) { body.dataset.w13Plain = on ? '1' : '0'; w13bDecorateNews(w13bNewsIndex); }
    announce(t(on ? 'Langage clair activé : les textes administratifs sont réécrits avec des mots simples.' : 'Langage clair désactivé.'));
}

document.addEventListener('click', event => {
    const el = event.target.closest('[data-w13b]');
    if (!el) return;
    switch (el.dataset.w13b) {
        case 'plain': w13bSetPlain(!w13bPref()); break;
        case 'card-plain': w13bToggleCard(Number(el.dataset.index)); break;
        case 'explain-service': { const service = tnServices[Number(el.dataset.index)]; if (service) w13bOpenExplain(service.description); break; }
        case 'explain-tool': w13bOpenExplain(w13bSelection || ''); break;
        case 'explain-news': {
            const article = newsData[w13bNewsIndex];
            const plain = document.getElementById('w13-news-body');
            w13bOpenExplain(article ? String(article.content).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : (plain ? plain.innerText : ''));
            break;
        }
        case 'news-toggle': {
            const body = document.getElementById('news-modal-content');
            body.dataset.w13Plain = body.dataset.w13Plain === '1' ? '0' : '1';
            w13bDecorateNews(w13bNewsIndex);
            const again = body.querySelector('[data-w13b="news-toggle"]');
            if (again) again.focus();
            break;
        }
        case 'ai': w13bAskAi(); break;
        case 'another': { const box = document.getElementById('w13b-explain'); if (box) { w13bLast = ''; box.innerHTML = w13bExplainHtml(''); const field = document.getElementById('w13b-text'); if (field) field.focus(); } break; }
        case 'selection': { const button = document.getElementById('w13b-selbtn'); if (button) button.hidden = true; w13bOpenExplain(w13bSelection); break; }
        default: break;
    }
});

document.addEventListener('submit', event => {
    if (event.target.id !== 'w13b-form') return;
    event.preventDefault();
    const value = document.getElementById('w13b-text').value.trim();
    if (!value) return;
    const box = document.getElementById('w13b-explain');
    w13bLast = value;
    box.innerHTML = w13bExplainHtml(value);
    const result = document.getElementById('w13b-simple');
    if (result) result.focus();
});

document.addEventListener('DOMContentLoaded', () => {
    w13bDecorateServices();
    w13bRenderToolbar();

    // Le bouton flottant ne sert que sur demande : sélectionner un passage difficile le fait apparaître
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'w13b-selbtn';
    button.className = 'w13-selbtn';
    button.dataset.w13b = 'selection';
    button.hidden = true;
    button.innerHTML = `<i aria-hidden="true" class="fa-solid fa-lightbulb"></i> ${W13BT('Expliquer simplement')}`;
    button.addEventListener('mousedown', event => event.preventDefault());
    document.body.appendChild(button);
    let timer = null;
    document.addEventListener('selectionchange', () => { clearTimeout(timer); timer = setTimeout(w13bSelectionUpdate, 200); });
    document.addEventListener('scroll', () => { button.hidden = true; }, { passive: true });

    if (typeof openNewsDetail === 'function') {
        const baseOpen = openNewsDetail;
        openNewsDetail = function (index) {
            const body = document.getElementById('news-modal-content');
            if (body) delete body.dataset.w13Plain;
            const result = baseOpen.apply(this, arguments);
            w13bDecorateNews(index);
            return result;
        };
    }
    document.addEventListener('tn:langchange', () => {
        w13bRenderToolbar();
        document.querySelectorAll('#services-grid .w13-card-tools').forEach(node => node.remove());
        document.querySelectorAll('#services-grid .w13-plain-block').forEach(node => node.remove());
        w13bDecorateServices();
    });
});
