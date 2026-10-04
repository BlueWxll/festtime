// ==========================================
// VAGUE 13 — Orientation des habitants
// D10 retrouver le bon service même quand la demande est mal formulée, F92 décrire son besoin avec ses mots,
// F91 assistant automatisé, F72 « par où commencer » pour un nouvel arrivant sans refaire l'inscription.
// Chargé après assets/wave12.js ; réutilise tnSearch, tnServices, goToService, goToReport, goToSection, prefillContactForm,
// w7OpenEmergency, w4OpenDialog, announce, t().
// ==========================================

const W13T = (source, params) => escapeHtml(String(t(source, params)));
const W13_KEYS = { arrival: 'tn_w13_arrival' };

function w13Load(key, fallback) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w13Save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }
function w13Session(key, fallback) { try { const raw = sessionStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch (err) { return fallback; } }
function w13SessionSave(key, value) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (err) { } }

// ------------------------------------------
// Outils de texte : accents, fautes de frappe, mots coupés
// ------------------------------------------
function w13Fold(text) {
    return tnFold(String(text || '')).replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/['’`´]/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function w13Words(text) { return w13Fold(text).split(' ').filter(word => word.length > 1); }

// Distance d'édition bornée : s'arrête dès que la limite est dépassée
function w13Dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const row = [i];
        let best = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1] ? 0.5 : 1);
            row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + cost);
            if (row[j] < best) best = row[j];
        }
        if (best > max) return max + 1;
        previous = row;
    }
    return previous[b.length];
}

// 1 = même mot ; 0,85 = pluriel, conjugaison ou mot coupé ; 0,7 = faute de frappe ; 0,6 = même racine
function w13Match(token, keyword) {
    if (token === keyword) return 1;
    const lt = token.length, lk = keyword.length;
    if (lt >= 4 && lk >= 4 && (keyword.startsWith(token) || token.startsWith(keyword))) return 0.85;
    const limit = lk <= 4 ? 0 : lk <= 7 ? 1 : 2;
    if (limit && Math.abs(lt - lk) <= limit && w13Dist(token, keyword, limit) <= limit) return 0.7;
    if (lt >= 6 && lk >= 6 && token.slice(0, 5) === keyword.slice(0, 5)) return 0.6;
    return 0;
}

// ------------------------------------------
// Base de connaissances : besoins courants → service, démarche et réponse
// ------------------------------------------
const W13_SERVICES = {
    atmo: 'Atmosphère & Biosphère', transport: 'Transports & Hyper-Tubes', energie: 'Énergie Plasma & Réacteur Zéro',
    sante: 'Santé Biotech & Cryo-Soins', securite: 'Sécurité Civile & Sentinelles', mairie: 'Mairie & État Civil Spatial'
};

// act : [type, argument, libellé du bouton]
const W13_INTENTS = [
    { id: 'lumiere', service: 'energie', label: 'Une panne de lumière ou d\'électricité', w: 1.1,
        kw: 'lumiere,lampadaire,eclairage,ampoule,noir,obscurite,coupure,electricite,courant,panne de courant,plus de lumiere,lampe,electrique,prise,disjoncteur,power,light,electricity,luz,electricidad',
        answer: 'Pour une lumière en panne dans un lieu public, faites un signalement : il est transmis automatiquement au service Énergie Plasma. Pour votre logement (quota, raccordement), écrivez au même service.',
        act: [['report', 0, 'Signaler un éclairage en panne'], ['contact', 'energie', 'Écrire au service Énergie']] },
    { id: 'quota', service: 'energie', label: 'Mon quota ou mon raccordement d\'énergie',
        kw: 'quota,credit,credits,energie,facture,consommation,raccordement,branchement,compteur,plasma,reacteur,megawatt,extension de quota,augmenter mon quota,trop cher,energy,energia',
        answer: 'Les quotas, les raccordements et les crédits d\'énergie dépendent du service Énergie Plasma & Réacteur Zéro. Vous pouvez lui écrire en décrivant votre besoin.',
        act: [['contact', 'energie', 'Écrire au service Énergie'], ['service', 'energie', 'Voir le service']] },
    { id: 'air', service: 'atmo', label: 'Un problème d\'air, d\'eau ou de température', w: 1.05,
        kw: 'air,respirer,oxygene,o2,pression,fuite,fuite d air,fuite d eau,eau,recyclage,filtre,odeur,mauvaise odeur,sent mauvais,pue,humidite,temperature,trop chaud,trop froid,chaleur,froid,climatisation,pollution,poussiere,ventilation,vapeur,tuyau,conduite,gaz,ca pue,ca pu,ca sent,water,agua,aire,smell',
        answer: 'Les fuites d\'air ou d\'eau, la qualité de l\'air et la température relèvent du service Atmosphère & Biosphère. Signalez le problème avec le lieu précis : il part directement à ce service.',
        act: [['report', 3, 'Signaler une fuite ou un problème d\'air'], ['contact', 'atmo', 'Écrire au service Atmosphère'], ['service', 'atmo', 'Voir le service']] },
    { id: 'proprete', service: 'atmo', label: 'Propreté, déchets ou végétation',
        kw: 'dechets,poubelle,ordures,sale,proprete,vegetation,plantes,jardin,herbe,arbre,serre,nettoyage,encombrants,rats,insectes,garbage,trash',
        answer: 'La propreté, les déchets et les plantes des dômes sont gérés par le service Atmosphère & Biosphère. Faites un signalement en indiquant le lieu.',
        act: [['report', 4, 'Signaler un problème de propreté'], ['service', 'atmo', 'Voir le service']] },
    { id: 'voirie', service: 'transport', label: 'Une passerelle, une coursive ou un sol abîmé',
        kw: 'passerelle,coursive,voirie,trou,sol,escalier,rampe,ascenseur,degrade,casse,abime,fissure,barriere,trottoir,chaussee,route,chemin,porte coincee,abimee,cassee',
        answer: 'Les passerelles, coursives et sols abîmés sont suivis par le service Transports & Hyper-Tubes. Un signalement avec le lieu exact suffit.',
        act: [['report', 1, 'Signaler une voirie dégradée'], ['service', 'transport', 'Voir le service']] },
    { id: 'station', service: 'transport', label: 'Une station ou une capsule Hyper-Tube en difficulté',
        kw: 'station,capsule,cabine,quai,portillon,borne,distributeur,valideur,hyper tube en panne,capsule bloquee,tube bloque',
        answer: 'Pour une station ou une capsule Hyper-Tube, le signalement part au service Transports & Hyper-Tubes.',
        act: [['report', 2, 'Signaler un problème de station'], ['section', 'transports', 'Voir les horaires']] },
    { id: 'horaires', service: 'transport', label: 'Les horaires et les trajets en Hyper-Tube', w: 1.05,
        kw: 'horaire,horaires,prochain,prochaine,passage,depart,arrivee,retard,ligne,correspondance,trajet,itineraire,comment aller,combien de temps,bus,metro,train,transport,transports,deplacer,deplacement,voyager,voyage,spatioport,cargo,bagage,bagages,titre de transport,billet,abonnement,pass,ticket,schedule,timetable,horario,transporte',
        answer: 'La rubrique « Horaires transports » donne les trois prochains passages entre deux stations et l\'état de chaque ligne. Pour un titre de transport ou des bagages cargo, écrivez au service Transports.',
        act: [['section', 'transports', 'Voir les horaires'], ['contact', 'transport', 'Écrire au service Transports']] },
    { id: 'sante', service: 'sante', label: 'Ma santé ou celle d\'un proche', w: 1.05,
        kw: 'sante,medecin,docteur,malade,maladie,fievre,douleur,mal,toux,rhume,grippe,blessure,blesse,hopital,clinique,pharmacie,medicament,ordonnance,vaccin,implant,biolink,certificat medical,visite medicale,gravite,fatigue,stress,anxiete,sommeil,enfant malade,soins,cryo,traumatisme,fracture,allergie,infirmier,generaliste,consultation,doctor,medical,sick,hospital,medico,enfermo,salud',
        answer: 'Les soins, les visites médicales et le suivi des implants biolinks relèvent de Santé Biotech & Cryo-Soins. Vous pouvez prendre rendez-vous avec un agent ou écrire au service. En cas de danger immédiat, appelez le 112.',
        act: [['section', 'rendez-vous', 'Prendre rendez-vous'], ['contact', 'sante', 'Écrire au service Santé'], ['emergency', '', 'Urgences près de moi']] },
    { id: 'securite', service: 'securite', label: 'Un danger ou un incident de sécurité', w: 1.1,
        kw: 'securite,danger,dangereux,vol,voleur,cambriolage,agression,bagarre,menace,violence,incendie,feu,fumee,alarme,sas,decompression,badge,drone,sentinelle,patrouille,police,suspect,intrus,evacuation,evacuer,inondation,montee des eaux,explosion,fuite de gaz,incident,harcelement,fire,safety,seguridad,peligro,fuego',
        answer: 'Les dangers et incidents sont traités par la Sécurité Civile & Sentinelles. Si quelqu\'un est en danger immédiat, appelez le 112 d\'abord, puis faites un signalement.',
        act: [['emergency', '', 'Urgences près de moi'], ['report', 5, 'Signaler un danger ou un incident'], ['service', 'securite', 'Voir le service']] },
    { id: 'papiers', service: 'mairie', label: 'Mes papiers, mon matricule ou mon logement', w: 1.05,
        kw: 'papiers,acte,naissance,mariage,deces,etat civil,matricule,identite,carte d identite,passeport,residence,attestation,justificatif,certificat,citoyennete,nationalite,titre de propriete,propriete,logement,loyer,changer de dome,demenager,demenagement,changement d adresse,adresse,domicile,famille,livret,document officiel,perdu mes papiers,renouveler,papeles,nacimiento,matrimonio,identidad,birth,marriage,paperwork',
        answer: 'Les matricules, les naissances, les mariages, les changements de dôme et les titres de propriété sont gérés par la Mairie & État Civil Spatial. Écrivez-lui en expliquant votre situation, un agent vous répond.',
        act: [['contact', 'mairie', 'Écrire à la Mairie'], ['section', 'rendez-vous', 'Prendre rendez-vous'], ['service', 'mairie', 'Voir le service']] },
    { id: 'compte', label: 'Mon compte, ma connexion ou mon code d\'accès', w: 1.05,
        kw: 'compte,inscription,inscrire,creer un compte,connexion,connecter,identifiant,mot de passe,code d acces,oublie mon code,code oublie,supprimer mon compte,profil,deconnexion,login,se connecter,authentification,cle d acces,account,password,cuenta,contrasena,sign in',
        answer: 'Vous pouvez créer un compte pour recevoir votre matricule, ou vous connecter avec votre matricule et votre code. Si vous avez oublié votre code, il n\'est pas récupérable : un agent peut vous remettre un code temporaire (écrivez à la Mairie). La suppression du compte se fait dans « Mon compte ».',
        act: [['register', '', 'Créer un compte'], ['login', '', 'Me connecter'], ['section', 'compte', 'Mon compte']] },
    { id: 'suivi', label: 'Suivre l\'avancement de ma demande',
        kw: 'suivre,suivi,ou en est,ma demande,mes demandes,ticket,numero de suivi,reference,accuse,statut,etat de ma demande,historique,demarche,demarches,track,status,seguimiento',
        answer: 'Dans l\'espace citoyen, chaque demande affiche son état (En attente, En cours, Résolu) et ses étapes datées. Vous êtes aussi prévenu par la cloche quand l\'état change.',
        act: [['section', 'espace-citoyen', 'Ouvrir mon espace citoyen']] },
    { id: 'rdv', label: 'Prendre un rendez-vous avec un agent',
        kw: 'rendez vous,rdv,creneau,reserver,reservation,voir un agent,guichet,rencontrer,prendre rendez vous,annuler mon rendez vous,rappel,appointment,cita',
        answer: 'La rubrique « Rendez-vous » permet de choisir un service, un jour et un créneau de 30 minutes, puis d\'avoir un rappel. Vous pouvez annuler jusqu\'à 2 h avant.',
        act: [['section', 'rendez-vous', 'Prendre rendez-vous']] },
    { id: 'plan', label: 'Trouver un lieu, une adresse ou un abri',
        kw: 'ou se trouve,lieu,carte,plan,localiser,pres de chez moi,proche,abri,itineraire,partenaire,partenaires,horaires d ouverture,ouvert,ferme,mairie,commerce,boutique,cafe,pharmacie,hopital proche,where,donde,map',
        answer: 'Le plan de la ville liste les hôpitaux, pharmacies, transports, sentinelles et abris, triés selon votre secteur, avec leurs horaires et leur état ouvert ou fermé.',
        act: [['section', 'plan-ville', 'Ouvrir le plan de la ville']] },
    { id: 'alertes', label: 'Les alertes et les annonces officielles',
        kw: 'alerte,alertes,message officiel,annonce,annonces,decret,decrets,actualite,actualites,information,informations,nouvelles,notification,notifications,prevenu,prevenir,canicule,vague de chaleur,orage,news,alert,alertas',
        answer: 'Les alertes en cours apparaissent en haut de la plateforme et dans la cloche de notifications. Les annonces et décrets sont dans « Actualités & décrets ».',
        act: [['section', 'annonces', 'Lire les annonces'], ['notif', '', 'Ouvrir les notifications']] },
    { id: 'participation', label: 'Donner mon avis ou proposer une idée',
        kw: 'idee,idees,avis,consultation,consultations,projet,projets,proposer,suggestion,donner mon avis,participer,vote,commentaire,idea,opinion',
        answer: 'Dans « Projets & idées », vous pouvez lire les projets de la ville, répondre aux consultations (ce n\'est pas un vote officiel) et proposer une idée. Chaque contribution reçoit une référence et un suivi.',
        act: [['section', 'projets-ville', 'Projets & idées']] },
    { id: 'accessibilite', label: 'Rendre la plateforme plus facile à lire ou à utiliser',
        kw: 'malvoyant,vue,aveugle,sourd,handicap,lecteur d ecran,contraste,taille du texte,agrandir,police,lisible,daltonien,couleurs,clavier,accessibilite,difficile a lire,trop petit,accessibility,accesibilidad',
        answer: 'Le panneau d\'accessibilité permet d\'agrandir le texte (jusqu\'à 200 %), de renforcer le contraste, d\'adapter les couleurs et de faciliter la lecture. Tout se fait avec le clavier.',
        act: [['a11y', '', 'Ouvrir l\'accessibilité']] },
    { id: 'langue', label: 'Changer de langue',
        kw: 'langue,francais,english,anglais,espanol,espagnol,traduire,traduction,speak,idioma,language,ayuda,help me,i do not speak,no hablo',
        answer: 'La plateforme existe en français, en anglais et en espagnol. Le sélecteur de langue se trouve dans la barre d\'outils, sous le menu.',
        act: [['language', '', 'Choisir ma langue']] },
    { id: 'donnees', label: 'Mes données personnelles et ma vie privée',
        kw: 'mes donnees,donnees personnelles,vie privee,rgpd,inquietude,confidentialite,telecharger mes donnees,export,privacy,datos',
        answer: 'La section « Participation » explique quelles données sont gardées, pourquoi, par qui et combien de temps. Vous pouvez télécharger vos données ou signaler une inquiétude.',
        act: [['section', 'participation', 'Mes données et mes inquiétudes'], ['section', 'compte', 'Mon compte']] },
    { id: 'lent', label: 'La plateforme est lente ou consomme trop',
        kw: 'lent,lente,connexion lente,internet lent,economiser,mode econome,charge,ecologie,carbone,co2,slow',
        answer: 'Le mode économe réduit les données téléchargées et les animations sans retirer aucune information. La rubrique Sobriété mesure le poids de la page.',
        act: [['section', 'sobriete', 'Ouvrir la sobriété numérique']] },
    { id: 'agent', service: 'mairie', label: 'Écrire à un agent',
        kw: 'parler a un agent,humain,personne,contacter,contact,joindre,ecrire,message,plainte,reclamation,doleance,question,aide,administration,agent,human,contactar',
        answer: 'Vous pouvez écrire à un agent municipal : choisissez le service ou laissez la plateforme vous orienter. Vous recevez un numéro de suivi.',
        act: [['contact', 'mairie', 'Écrire à un agent']] }
];
W13_INTENTS.forEach(intent => { intent.k = intent.kw.split(',').map(word => w13Fold(word)).filter(Boolean); });

// Urgences médicales : détectées par motifs précis (la sécurité des personnes ne dépend pas d'un score)
const W13_MEDICAL = [
    /\b(crise|arret) cardiaque\b/, /\binfarctus\b/, /\bavc\b/, /\bne (respire|respirent) (plus|pas)\b/,
    /\b(peut|peux|arrive|arrivent) (plus |pas )?(a )?respirer\b/, /\b(plus de|manque de|difficulte a respirer|difficultes respiratoires)\b.*\b(souffle|respir)/, /\betouff/,
    /\binconscient/, /\bevanoui/, /\bperdu (la )?connaissance\b/, /\bconvulsion/, /\bhemorragie/, /\bsaigne (beaucoup|abondamment)\b/,
    /\bsang (partout|abondant)\b/, /\bempoisonn/, /\bintoxiqu/, /\boverdose\b/, /\bchoc (allergique|anaphylactique)\b/,
    /\bdouleur (forte |violente )?(dans |a |sur )?(la )?poitrine\b/, /\baccident grave\b/, /\bbrulure grave\b/, /\burgence medicale\b/,
    /\bne reagit (plus|pas)\b/, /\bsuicid/, /\b(veut|veux|vais|voudrais) (se )?(mourir|tuer)\b/, /\bau secours\b/, /\bparalys/,
    /\bmedical emergency\b/, /\bcan ?t breathe\b/, /\bunconscious\b/, /\bheart attack\b/, /\bno puede respirar\b/, /\bataque al corazon\b/, /\bpeut pas respirer\b/
];
function tnMedicalUrgency(text) {
    const folded = w13Fold(text);
    const hits = W13_MEDICAL.filter(pattern => pattern.test(folded)).map(pattern => (folded.match(pattern) || [''])[0]);
    return { urgent: hits.length > 0, hits };
}

// Classement des besoins : mots exacts, pluriels, fautes de frappe et expressions
function w13Rank(text) {
    const folded = w13Fold(text);
    const words = w13Words(text);
    if (!words.length) return [];
    return W13_INTENTS.map(intent => {
        let score = 0;
        const hits = [];
        intent.k.forEach(keyword => {
            if (keyword.includes(' ')) {
                if (folded.includes(keyword)) { score += 2; hits.push(keyword); return; }
                const parts = keyword.split(' ');
                const matches = parts.map(part => Math.max(0, ...words.map(word => w13Match(word, part))));
                if (matches.every(value => value >= 0.7)) { score += 1.4; hits.push(keyword); }
                return;
            }
            let best = 0;
            words.forEach(word => { best = Math.max(best, w13Match(word, keyword)); });
            if (best >= 0.6) { score += best; hits.push(keyword); }
        });
        return { intent, score: score * (intent.w || 1), hits };
    }).filter(entry => entry.score >= 0.6).sort((a, b) => b.score - a.score);
}

function w13ServiceName(intent) { return intent.service ? W13_SERVICES[intent.service] : ''; }

// ------------------------------------------
// Actions : ouvrir le bon endroit de la plateforme
// ------------------------------------------
function w13Act(kind, arg, text) {
    if (typeof closeToolPanels === 'function') closeToolPanels();
    if (window.innerWidth < 760) w13ToggleChat(false);
    switch (kind) {
        case 'service': {
            const name = W13_SERVICES[arg] || arg;
            const index = tnServices.findIndex(service => service.name === name);
            if (index >= 0) goToService(index);
            break;
        }
        case 'report': goToReport(Number(arg)); break;
        case 'contact': {
            prefillContactForm(W13_SERVICES[arg] || arg, '');
            const message = document.getElementById('contact-message');
            if (message && text && !message.value) message.value = text;
            break;
        }
        case 'section': goToSection(arg); break;
        case 'emergency': if (typeof w7OpenEmergency === 'function') w7OpenEmergency(); else goToSection('plan-ville'); break;
        case 'register': openAuthModal('register'); break;
        case 'login': openAuthModal('login'); break;
        case 'a11y': if (typeof toggleA11yPanel === 'function') toggleA11yPanel(true); break;
        case 'lexicon': if (typeof w6OpenLexicon === 'function') w6OpenLexicon(); break;
        case 'notif': if (typeof toggleNotifications === 'function') toggleNotifications(true); break;
        case 'language': { const select = document.querySelector('#tn-locbar select'); if (select) { select.scrollIntoView({ block: 'center' }); select.focus(); } break; }
        case 'arrival': w13OpenArrival(); break;
        default: break;
    }
}

function w13ActionButtons(acts, text) {
    return acts.map(([kind, arg, label]) => kind === 'tel'
        ? `<a class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase" href="tel:${escapeHtml(arg)}">${W13T(label)}</a>`
        : `<button type="button" class="tn-tab" data-w13-act="${escapeHtml(kind)}" data-arg="${escapeHtml(String(arg))}" data-text="${escapeHtml(text || '')}">${W13T(label)}</button>`).join('');
}

function w13EmergencyHtml() {
    return `<div class="w13-urgent" role="alert">
        <strong>${W13T('Cela peut être une urgence médicale.')}</strong>
        <p>${W13T('Appelez le 112 tout de suite (gratuit, 24 h/24). Ne restez pas seul : si possible, demandez à un voisin de vous aider.')}</p>
        <div class="w13-actions">${w13ActionButtons([['tel', '112', 'Appeler le 112'], ['emergency', '', 'Voir les urgences près de moi']])}</div>
    </div>`;
}

// ------------------------------------------
// D10 — Recherche tolérante : fautes de frappe, mots simples, formulations approximatives
// ------------------------------------------
function w13FuzzyItems(query) {
    const words = w13Words(query);
    if (!words.length) return [];
    return tnSearchItems().map(item => {
        const tokens = Array.from(new Set(w13Words(`${item.title} ${item.userText ? '' : t(item.title)} ${item.text}`)));
        let matched = 0, score = 0;
        words.forEach(word => {
            const best = tokens.reduce((max, token) => Math.max(max, w13Match(word, token)), 0);
            if (best >= 0.6) { matched += 1; score += best; }
        });
        // une formulation approximative suffit si la moitié des mots retrouvent quelque chose
        if (!matched || matched < Math.ceil(words.length / 2)) return null;
        return Object.assign({}, item, { score: score + (item.attention ? 3 : 0) });
    }).filter(Boolean).sort((a, b) => b.score - a.score);
}

function w13IntentItems(query) {
    return w13Rank(query).slice(0, 3).map(entry => {
        const intent = entry.intent;
        const first = intent.act[0];
        const service = w13ServiceName(intent);
        return {
            group: 'Pour vous orienter',
            title: service ? `${t(intent.label)} → ${t(service)}` : t(intent.label),
            userText: true, text: '', score: entry.score,
            action: `w13Act('${first[0]}', '${String(first[1]).replace(/'/g, "\\'")}')`
        };
    });
}

let w13BaseSearch = null;
function w13InstallSearch() {
    if (typeof tnSearch !== 'function' || w13BaseSearch) return;
    w13BaseSearch = tnSearch;
    tnSearch = function (query) {
        const base = w13BaseSearch(query);
        const text = String(query || '').trim();
        if (!text) return base;
        const seen = new Set(base.map(item => item.title));
        const extra = [];
        // le besoin le plus probable passe en tête, même si le mot saisi ne figure nulle part tel quel
        w13IntentItems(text).forEach(item => { if (!seen.has(item.title)) { seen.add(item.title); extra.push(item); } });
        if (base.length < 4) w13FuzzyItems(text).forEach(item => { if (!seen.has(item.title)) { seen.add(item.title); extra.push(item); } });
        const intents = extra.filter(item => item.group === 'Pour vous orienter').slice(0, 2);
        const others = extra.filter(item => item.group !== 'Pour vous orienter');
        return intents.concat(base, others).slice(0, 14);
    };
}

// ------------------------------------------
// F92 — Décrire son besoin avec ses mots
// ------------------------------------------
const W13_EXAMPLES = ['Il n\'y a plus de lumière dans ma coursive', 'Je dois changer de dôme', 'Mon enfant a de la fièvre', 'Je n\'arrive plus à me connecter'];

function w13InitNeed() {
    const grid = document.getElementById('services-grid');
    if (!grid || document.getElementById('w13-need')) return;
    const card = document.createElement('div');
    card.id = 'w13-need';
    card.className = 'holo-card p-6 mb-8 relative';
    card.dataset.crumb = 'Décrire mon besoin';
    card.innerHTML = `
        <h3 class="w13-title"><i aria-hidden="true" class="fa-solid fa-compass"></i> ${W13T('Je ne sais pas quel service choisir')}</h3>
        <p class="tn-hint">${W13T('Décrivez votre besoin avec vos mots, même sans connaître le bon terme. La plateforme vous indique le service compétent et la démarche.')}</p>
        <form id="w13-need-form" class="w13-need-form" autocomplete="off">
            <label for="w13-need-text" class="tn-field-label">${W13T('Mon besoin, avec mes mots')}</label>
            <textarea id="w13-need-text" class="cyber-input" rows="3" maxlength="500" required placeholder="${escapeHtml(t('ex : plus de lumière dans ma coursive depuis deux jours'))}"></textarea>
            <div class="w13-actions">
                <button type="submit" class="btn-cyber px-4 py-2 text-xs font-bold uppercase">${W13T('Trouver le bon service')}</button>
                <button type="button" class="tn-tab" data-w13="arrival">${W13T('Je viens d\'arriver : par où commencer ?')}</button>
            </div>
            <p class="tn-hint">${W13T('Exemples :')} ${W13_EXAMPLES.map(example => `<button type="button" class="w13-example" data-w13-example="${escapeHtml(example)}">${W13T(example)}</button>`).join(' ')}</p>
        </form>
        <div id="w13-need-result" aria-live="polite" tabindex="-1"></div>`;
    grid.before(card);
}

function w13RenderPick(entry, primary, text) {
    const intent = entry.intent;
    const service = w13ServiceName(intent);
    const why = entry.hits.slice(0, 4).map(hit => `« ${escapeHtml(hit)} »`).join(', ');
    return `<article class="w13-pick${primary ? ' w13-pick--main' : ''}">
        <h4>${W13T(intent.label)}</h4>
        ${service ? `<p><strong>${W13T('Service compétent :')}</strong> <span data-no-i18n>${escapeHtml(t(service))}</span></p>` : ''}
        ${primary ? `<p>${W13T(intent.answer)}</p>` : ''}
        ${why ? `<p class="tn-hint">${W13T('Pourquoi : votre texte contient')} <span data-no-i18n>${why}</span>.</p>` : ''}
        <div class="w13-actions">${w13ActionButtons(primary ? intent.act : intent.act.slice(0, 1), text)}</div>
    </article>`;
}

function w13DescribeNeed(text) {
    const box = document.getElementById('w13-need-result');
    if (!box) return;
    const clean = String(text || '').trim();
    if (!clean) return;
    const medical = tnMedicalUrgency(clean);
    const ranked = w13Rank(clean).filter(entry => entry.intent.id !== 'agent' || entry.score > 1.5);
    let html = medical.urgent ? w13EmergencyHtml() : '';
    if (!ranked.length) {
        html += `<div class="w13-result"><p><strong>${W13T('Je n\'ai pas trouvé de service sûr pour ce texte.')}</strong></p>
            <p class="tn-hint">${W13T('Reformulez avec d\'autres mots, ou choisissez un service :')}</p>
            <div class="w13-actions">${Object.keys(W13_SERVICES).map(key => `<button type="button" class="tn-tab" data-w13-act="service" data-arg="${key}"><span data-no-i18n>${escapeHtml(t(W13_SERVICES[key]))}</span></button>`).join('')}</div>
            <div class="w13-actions">${w13ActionButtons([['contact', 'mairie', 'Écrire à un agent']], clean)}</div></div>`;
    } else {
        const [top, ...rest] = ranked;
        html += `<div class="w13-result"><p class="tn-hint">${W13T('Voici ce que je comprends de votre besoin :')}</p>
            ${w13RenderPick(top, true, clean)}
            ${rest.length ? `<h5 class="tn-w12-sub">${W13T('Autres pistes')}</h5><div class="w13-others">${rest.slice(0, 2).map(entry => w13RenderPick(entry, false, clean)).join('')}</div>` : ''}
            <p class="tn-hint">${W13T('Ce n\'est pas ça ? Reformulez votre besoin ou')} <button type="button" class="w13-link" data-w13-act="contact" data-arg="mairie" data-text="${escapeHtml(clean)}">${W13T('écrivez à un agent')}</button>.</p></div>`;
    }
    box.innerHTML = html;
    box.focus();
    announce(t('Besoin analysé : {label}.', { label: ranked.length ? t(ranked[0].intent.label) : t('aucun service trouvé') }));
}

// ------------------------------------------
// F72 — Par où commencer (sans refaire l'inscription)
// ------------------------------------------
const W13_NEEDS = [
    { id: 'papiers', icon: 'fa-id-card', label: 'Mes papiers et mon matricule', steps: [['Créer mon compte pour recevoir mon matricule (facultatif)', 'register', ''], ['Voir les démarches de la Mairie & État Civil', 'service', 'mairie']] },
    { id: 'sante', icon: 'fa-heart-pulse', label: 'Ma santé', steps: [['Repérer la clinique ou la pharmacie la plus proche', 'section', 'plan-ville'], ['Prendre rendez-vous avec un agent', 'section', 'rendez-vous']] },
    { id: 'deplacer', icon: 'fa-train-subway', label: 'Me déplacer', steps: [['Consulter les horaires des Hyper-Tubes', 'section', 'transports'], ['Voir les titres de transport', 'service', 'transport']] },
    { id: 'logement', icon: 'fa-house', label: 'Mon logement, l\'énergie et l\'air', steps: [['Comprendre mon quota d\'énergie et mon raccordement', 'service', 'energie'], ['Savoir signaler un problème dans ma coursive', 'report', 0]] },
    { id: 'alerte', icon: 'fa-bell', label: 'Être prévenu en cas d\'alerte', steps: [['Lire les alertes en cours', 'section', 'annonces'], ['Activer les notifications', 'notif', '']] },
    { id: 'langue', icon: 'fa-language', label: 'Je parle une autre langue', steps: [['Choisir ma langue : français, English ou Español', 'language', '']] },
    { id: 'avis', icon: 'fa-comments', label: 'Donner mon avis sur la colonie', steps: [['Voir les projets et répondre à une consultation', 'section', 'projets-ville']] }
];

function w13ArrivalState() { return Object.assign({ needs: [], done: [] }, w13Load(W13_KEYS.arrival, {})); }

function w13ArrivalSteps(state) {
    const steps = [{ key: 'urgence', label: 'Repérer le bouton « Urgences » et le 112', act: ['emergency', ''] }];
    W13_NEEDS.filter(need => state.needs.includes(need.id)).forEach(need => need.steps.forEach((step, index) => steps.push({ key: `${need.id}-${index}`, label: step[0], act: [step[1], step[2]], need: need.label })));
    steps.push({ key: 'compte', label: activeCitizen ? 'Compléter mon espace citoyen' : 'Créer mon compte quand je le souhaite (rien n\'est obligatoire pour commencer)', act: activeCitizen ? ['section', 'espace-citoyen'] : ['register', ''] });
    return steps;
}

function w13ArrivalHtml() {
    const state = w13ArrivalState();
    const steps = w13ArrivalSteps(state);
    const done = steps.filter(step => state.done.includes(step.key)).length;
    const percent = Math.round(done * 100 / steps.length);
    return `
        <p class="tn-hint">${W13T('Vous n\'avez pas besoin de compte pour commencer. Cochez ce qui vous concerne : la plateforme vous propose vos premières étapes, dans l\'ordre.')}</p>
        <fieldset class="w13-needs"><legend class="tn-field-label">${W13T('Qu\'est-ce qui vous concerne ?')}</legend>
            ${W13_NEEDS.map(need => `<label class="w13-need-opt"><input type="checkbox" data-w13-need="${need.id}" ${state.needs.includes(need.id) ? 'checked' : ''}> <i aria-hidden="true" class="fa-solid ${need.icon}"></i> <span>${W13T(need.label)}</span></label>`).join('')}
        </fieldset>
        <h4 class="tn-w12-sub">${W13T('Vos premières étapes')} — <span data-no-i18n>${done}/${steps.length}</span></h4>
        <div class="tn-w12-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-label="${W13T('Avancement')}"><span style="width:${percent}%"></span></div>
        <ol class="w13-steps">${steps.map(step => `<li class="${state.done.includes(step.key) ? 'is-done' : ''}">
            <label><input type="checkbox" data-w13-step="${step.key}" ${state.done.includes(step.key) ? 'checked' : ''}> <span>${W13T(step.label)}</span></label>
            <button type="button" class="tn-tab" data-w13-act="${step.act[0]}" data-arg="${escapeHtml(String(step.act[1]))}" data-w13-close="1">${W13T('Y aller')}</button></li>`).join('')}</ol>
        <div class="w13-actions"><button type="button" class="tn-tab" data-dialog-close>${W13T('Fermer')}</button></div>`;
}

function w13OpenArrival() {
    w4OpenDialog(W13T('Par où commencer ?'), `<div id="w13-arrival">${w13ArrivalHtml()}</div>`);
    const first = document.querySelector('#w13-arrival input');
    if (first) first.setAttribute('data-autofocus', '');
}

function w13RefreshArrival() {
    const box = document.getElementById('w13-arrival');
    if (box) box.innerHTML = w13ArrivalHtml();
}

// ------------------------------------------
// F91 — Assistant automatisé
// ------------------------------------------
const W13_CHIPS = ['Plus de lumière dans ma coursive', 'Prendre un rendez-vous', 'Où en est ma demande ?', 'Je viens d\'arriver', 'Parler à un agent'];

function w13ChatHistory() { return w13Session('tn_w13_chat', []); }

function w13InitAssistant() {
    if (document.getElementById('w13-assistant')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'w13-assistant-btn';
    button.className = 'w13-fab';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'w13-assistant');
    button.innerHTML = `<i aria-hidden="true" class="fa-solid fa-robot"></i><span>${W13T('Assistant')}</span>`;
    const panel = document.createElement('section');
    panel.id = 'w13-assistant';
    panel.className = 'w13-chat';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', t('Assistant automatique'));
    panel.innerHTML = `
        <header class="w13-chat-head"><strong>${W13T('Assistant Aethel')}</strong> <span class="tn-badge tn-badge--neutral">${W13T('Réponses automatiques')}</span>
            <button type="button" class="w13-chat-close" data-w13="chat-close" aria-label="${escapeHtml(t('Fermer l\'assistant'))}">×</button></header>
        <div id="w13-chat-log" class="w13-chat-log" role="log" aria-live="polite" aria-relevant="additions"></div>
        <div id="w13-chat-chips" class="w13-chips"></div>
        <form id="w13-chat-form" class="w13-chat-form" autocomplete="off">
            <label for="w13-chat-input" class="sr-only">${W13T('Votre question')}</label>
            <input id="w13-chat-input" class="cyber-input" type="text" maxlength="400" placeholder="${escapeHtml(t('Écrivez votre question…'))}">
            <button type="submit" class="btn-cyber px-3 py-1.5 text-xs font-bold uppercase">${W13T('Envoyer')}</button>
        </form>`;
    document.body.append(button, panel);
    w13RenderChat();
}

function w13ToggleChat(force) {
    const panel = document.getElementById('w13-assistant');
    const button = document.getElementById('w13-assistant-btn');
    if (!panel || !button) return;
    const open = typeof force === 'boolean' ? force : panel.hidden;
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    if (open) {
        if (!w13ChatHistory().length) w13Say('bot', { html: `<p>${W13T('Bonjour, je suis l\'assistant automatique de Terra Nova. Dites-moi ce dont vous avez besoin avec vos mots : je vous indique le bon service ou la bonne démarche. Je ne remplace pas un agent.')}</p>` });
        w13RenderChat();
        const input = document.getElementById('w13-chat-input');
        if (input) input.focus();
    }
}

function w13Say(who, message) {
    const history = w13ChatHistory();
    history.push(Object.assign({ who, at: Date.now() }, message));
    w13SessionSave('tn_w13_chat', history.slice(-30));
    w13RenderChat();
}

function w13RenderChat() {
    const log = document.getElementById('w13-chat-log');
    if (!log) return;
    log.innerHTML = w13ChatHistory().map(message => message.who === 'user'
        ? `<div class="w13-msg w13-msg--user"><span data-no-i18n>${escapeHtml(message.text)}</span></div>`
        : `<div class="w13-msg w13-msg--bot">${message.html}</div>`).join('');
    log.scrollTop = log.scrollHeight;
    const chips = document.getElementById('w13-chat-chips');
    if (chips) chips.innerHTML = W13_CHIPS.map(chip => `<button type="button" class="w13-chip" data-w13-chip="${escapeHtml(chip)}">${W13T(chip)}</button>`).join('');
}

const W13_GREETINGS = /\b(bonjour|bonsoir|salut|coucou|hello|hi|hola|hey)\b/;
const W13_THANKS = /\b(merci|thanks|thank you|gracias)\b/;

async function w13AskAi(text) {
    const history = w13ChatHistory().filter(message => message.who === 'user').slice(-4).map(message => message.text);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
        const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history, lang: typeof tnLang === 'string' ? tnLang : 'fr' }), signal: controller.signal });
        if (!response.ok) return null;
        const data = await response.json();
        return data && data.reply ? data : null;
    } catch (err) { return null; } finally { clearTimeout(timer); }
}

async function w13Answer(text) {
    const medical = tnMedicalUrgency(text);
    if (medical.urgent) return { html: w13EmergencyHtml() };
    const folded = w13Fold(text);
    const ranked = w13Rank(text);
    if (W13_GREETINGS.test(folded) && (!ranked.length || ranked[0].score < 1.2)) return { html: `<p>${W13T('Bonjour ! De quoi avez-vous besoin ? Vous pouvez écrire avec vos mots, par exemple « plus de lumière dans ma coursive ».')}</p>` };
    if (W13_THANKS.test(folded) && !ranked.length) return { html: `<p>${W13T('Avec plaisir. Je reste là si vous avez une autre question.')}</p>` };
    if (/\b(j arrive|arrive en ville|viens d arriver|nouvel arrivant|nouvelle arrivante|par ou commencer|just arrived|new here|recien llegad)/.test(folded)) {
        return { html: `<p>${W13T('Bienvenue ! Je peux vous proposer vos premières étapes selon votre situation, sans créer de compte.')}</p><div class="w13-actions">${w13ActionButtons([['arrival', '', 'Par où commencer ?']])}</div>` };
    }
    if (ranked.length && ranked[0].score >= 0.65) {
        const [top, ...rest] = ranked;
        const intent = top.intent;
        const service = w13ServiceName(intent);
        let html = `<p><strong>${W13T(intent.label)}</strong></p>${service ? `<p>${W13T('Service compétent :')} <span data-no-i18n>${escapeHtml(t(service))}</span></p>` : ''}<p>${W13T(intent.answer)}</p><div class="w13-actions">${w13ActionButtons(intent.act, text)}</div>`;
        const others = rest.filter(entry => entry.score >= 0.7 && entry.intent.id !== 'agent').slice(0, 2);
        if (others.length) html += `<p class="tn-hint">${W13T('Cela peut aussi concerner :')} ${others.map(entry => `<button type="button" class="w13-link" data-w13-act="${entry.intent.act[0][0]}" data-arg="${escapeHtml(String(entry.intent.act[0][1]))}" data-text="${escapeHtml(text)}">${W13T(entry.intent.label)}</button>`).join(', ')}</p>`;
        return { html };
    }
    const ai = await w13AskAi(text);
    if (ai) return { html: `<p data-no-i18n>${escapeHtml(ai.reply)}</p><p class="tn-hint">${W13T('Réponse générée par une IA : vérifiez l\'information auprès d\'un agent en cas de doute.')}</p><div class="w13-actions">${w13ActionButtons([['contact', 'mairie', 'Écrire à un agent']], text)}</div>` };
    return { html: `<p>${W13T('Je n\'ai pas bien compris votre demande. Pouvez-vous la dire autrement, avec d\'autres mots ? Vous pouvez aussi choisir un sujet ci-dessous, ou écrire à un agent qui vous répondra.')}</p><div class="w13-actions">${w13ActionButtons([['contact', 'mairie', 'Écrire à un agent'], ['arrival', '', 'Par où commencer ?']], text)}</div>` };
}

async function w13SubmitChat(text) {
    const clean = String(text || '').trim();
    if (!clean) return;
    w13Say('user', { text: clean });
    const typing = document.getElementById('w13-chat-log');
    if (typing) typing.setAttribute('aria-busy', 'true');
    const reply = await w13Answer(clean);
    if (typing) typing.removeAttribute('aria-busy');
    w13Say('bot', reply);
}

// ------------------------------------------
// Événements
// ------------------------------------------
document.addEventListener('click', event => {
    const act = event.target.closest('[data-w13-act]');
    if (act) {
        const close = act.hasAttribute('data-w13-close');
        if (close && typeof w4CloseDialog === 'function') w4CloseDialog();
        w13Act(act.dataset.w13Act, act.dataset.arg, act.dataset.text);
        return;
    }
    const example = event.target.closest('[data-w13-example]');
    if (example) {
        const field = document.getElementById('w13-need-text');
        field.value = example.dataset.w13Example;
        w13DescribeNeed(field.value);
        return;
    }
    const chip = event.target.closest('[data-w13-chip]');
    if (chip) {
        const value = chip.dataset.w13Chip;
        if (value === 'Je viens d\'arriver') { w13Say('user', { text: t(value) }); w13Say('bot', { html: `<p>${W13T('Bienvenue ! Je peux vous proposer vos premières étapes selon votre situation, sans créer de compte.')}</p><div class="w13-actions">${w13ActionButtons([['arrival', '', 'Par où commencer ?']])}</div>` }); }
        else w13SubmitChat(t(value));
        return;
    }
    const el = event.target.closest('[data-w13]');
    if (!el) return;
    if (el.dataset.w13 === 'arrival') w13OpenArrival();
    if (el.dataset.w13 === 'chat-close') { w13ToggleChat(false); const button = document.getElementById('w13-assistant-btn'); if (button) button.focus(); }
});

document.addEventListener('change', event => {
    const need = event.target.closest('[data-w13-need]');
    if (need) {
        const state = w13ArrivalState();
        state.needs = need.checked ? Array.from(new Set(state.needs.concat(need.dataset.w13Need))) : state.needs.filter(id => id !== need.dataset.w13Need);
        w13Save(W13_KEYS.arrival, state);
        w13RefreshArrival();
        const again = document.querySelector(`[data-w13-need="${need.dataset.w13Need}"]`);
        if (again) again.focus();
        return;
    }
    const step = event.target.closest('[data-w13-step]');
    if (step) {
        const state = w13ArrivalState();
        state.done = step.checked ? Array.from(new Set(state.done.concat(step.dataset.w13Step))) : state.done.filter(key => key !== step.dataset.w13Step);
        w13Save(W13_KEYS.arrival, state);
        w13RefreshArrival();
        const again = document.querySelector(`[data-w13-step="${step.dataset.w13Step}"]`);
        if (again) again.focus();
    }
});

document.addEventListener('submit', event => {
    if (event.target.id === 'w13-need-form') { event.preventDefault(); w13DescribeNeed(document.getElementById('w13-need-text').value); }
    else if (event.target.id === 'w13-chat-form') {
        event.preventDefault();
        const input = document.getElementById('w13-chat-input');
        const value = input.value;
        input.value = '';
        if (value.trim()) w13SubmitChat(value);
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        const panel = document.getElementById('w13-assistant');
        if (panel && !panel.hidden && panel.contains(document.activeElement)) { w13ToggleChat(false); const button = document.getElementById('w13-assistant-btn'); if (button) button.focus(); }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    w13InstallSearch();
    w13InitNeed();
    w13InitAssistant();
    const fab = document.getElementById('w13-assistant-btn');
    if (fab) fab.addEventListener('click', () => w13ToggleChat());

    // Le guide d'arrivée est aussi proposé dans le bandeau d'accueil
    const register = document.querySelector('#accueil button[onclick*="openAuthModal(\'register\')"]');
    if (register && !document.getElementById('w13-arrival-btn')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'w13-arrival-btn';
        button.className = 'tn-tab';
        button.dataset.w13 = 'arrival';
        button.textContent = t('Par où commencer ?');
        register.after(button);
    }
    document.addEventListener('tn:langchange', () => {
        const need = document.getElementById('w13-need');
        const result = document.getElementById('w13-need-result');
        const keep = result ? result.innerHTML : '';
        if (need) { need.remove(); w13InitNeed(); const again = document.getElementById('w13-need-result'); if (again && keep) again.innerHTML = keep; }
        const old = document.getElementById('w13-assistant');
        const oldBtn = document.getElementById('w13-assistant-btn');
        const wasOpen = old && !old.hidden;
        if (old) old.remove();
        if (oldBtn) oldBtn.remove();
        w13InitAssistant();
        const newBtn = document.getElementById('w13-assistant-btn');
        if (newBtn) newBtn.addEventListener('click', () => w13ToggleChat());
        if (wasOpen) w13ToggleChat(true);
    });
});
