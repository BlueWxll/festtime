# 🚀 TERRA NOVA — Plateforme Numérique Centrale
> **24H By Webcup 2026** — Mégapole Exoplanétaire & Réseau Urbain Aethel-OS

Plateforme officielle de la première colonie spatiale de l'humanité sur un nouveau monde. Développée pour répondre aux besoins évolutifs des habitants, des services municipaux et du Haut Conseil de Terra Nova.

---

## ✨ Fonctionnalités Majeures (Vagues 0 à 4)

* **D07 (500 XP) — Accueil Immersif & Hiérarchisé :** Matrice télémétrique en direct (boucliers, atmosphère, population), guide des nouveaux arrivants et accès en 1 clic aux modules urbains.
* **D05 (250 XP) — Catalogue des Services Municipaux :** Les 6 directions centrales (Atmosphère, Transports Hyper-Tube, Énergie Plasma, Cryo-Santé, Sécurité Civile, État Civil).
* **D06 (250 XP) — Journal Officiel & Décrets :** Fil d'actualités et décrets du Haut Conseil filtrables avec modale de lecture.
* **D01 (250 XP) — Inscription Colon :** Création de compte avec attribution d'un matricule colonial unique (`TN-2842-XXXX`).
* **D03 (250 XP) — Espace Personnel Citoyen :** Portail habitant sécurisé avec suivi des démarches et quotas.
* **D04 (250 XP) — Saisine Municipale & Doléances :** Formulaire de contact avec accusé de réception officiel et génération de ticket (`TK-TN-XXXX`).
* **D08 & D09 (1000 XP) — Multi-Rôles & Contrôle d'Accès (RBAC) :** Profils Citoyen, Agent et Administrateur avec restriction stricte des zones sensibles.
* **D19 (750 XP) — Espace de Travail Agents (Backoffice) :** Supervision du flux officiel de l'API Webcup (polling automatique toutes les 30s, métriques de session, vagues).
* **F22 (250 XP) — Gestionnaire de Demandes pour Agents :** Traitement des requêtes citoyennes avec changement d'état (En attente, En cours, Résolu).
* **F21 (520 XP) — Compatibilité Lecteur d'Écran :** Lien d'évitement, repères `main`/`nav`, libellés de formulaires associés, boutons nommés, modales (`role="dialog"`, focus piégé, touche Échap), états des filtres annoncés, icônes décoratives masquées.
* **F23 (520 XP) — Contraste Renforcé :** Mode haut contraste activable depuis le panneau d'accessibilité (mémorisé, activé d'office si le système le demande), gris secondaire éclairci et focus clavier visible.
* **F24 (260 XP) — Taille du Texte Réglable :** Quatre paliers de 100 % à 150 % sans chevauchement (mise en page en `rem`, barres qui passent à la ligne).
* **D11 (540 XP) — Suivi des Démarches :** Chaque demande affiche son état et ses étapes datées (envoyée, prise en charge, résolue), avec une chronologie détaillée.
* **F26 (270 XP) — Historique des Demandes :** Onglet « Historique complet » dans l'espace citoyen, avec recherche et filtre par état.
* **D12 (540 XP) — Premiers Pas :** À la première connexion, un guide en trois étapes (compléter son profil, trouver un service, commencer une démarche) avec progression.
* **D14 & F27 (1080 XP) — Multilingue :** Interface, catalogue des services et démarches en français, anglais et espagnol. Dictionnaire dans `assets/i18n.js`.
* **D15 (270 XP) — Fil d'Ariane :** Repère d'emplacement sous la navigation, liens vers les niveaux précédents et section courante mise en évidence.
* **D16 (270 XP) — Confirmation d'Envoi :** Le formulaire laisse place à une confirmation avec numéro de suivi et récapitulatif ; alerte en cas de doublon.
* **D17 (270 XP) — Charge de Travail :** Indicateurs en tête du backoffice (demandes en attente, urgentes, en cours, résolues, plus ancienne en attente).
* **F25 (540 XP) — Signalement :** Formulaire dédié (nature du problème, secteur, repère précis) ; le service compétent est attribué automatiquement.
* **F28 (270 XP) — Services à la Une :** Démarches les plus courantes en tête du catalogue ; agents et administrateurs choisissent les services mis en avant.
* **D18 (840 XP) — Diffusion d'un Message Général :** Depuis l'espace agents, le Haut Conseil publie un message (niveau, ce qu'il se passe, ce qu'il faut faire, secteurs, durée). Il s'affiche en tête de la plateforme, dans les notifications et en annonce à l'écran chez tous les habitants en moins de 30 secondes. Publication protégée par un code de diffusion.
* **F29 (840 XP) — Alerte Ciblée :** Alerte « Montée des eaux dans le Secteur Sud » ; chaque habitant voit si son secteur est concerné, avec des consignes numérotées.
* **F30 (560 XP) — Notifications :** Centre de notifications avec compteur de non-lus, annonce à l'écran des nouveaux messages et notification du navigateur sur demande ; les changements d'état des demandes y figurent aussi.
* **F31 (840 XP) — Recommandations Adaptées par IA :** Pour l'alerte canicule, l'habitant coche sa situation (65 ans ou plus, grossesse, maladie chronique…) et reçoit des recommandations générées par IA (OpenRouter, côté serveur), dans sa langue. Recommandations de référence en secours.
* **F32 (280 XP) — Recherche :** Recherche des services, démarches, annonces, alertes et demandes, insensible aux accents, avec mots courants (« santé », « lampadaire ») ; les éléments à traiter sont listés en premier.
* **F33 (290 XP) — Suppression de Compte :** Bouton « Supprimer mon compte » dans l'espace citoyen. Une fenêtre accessible (focus piégé, Échap) liste ce qui sera effacé ; il faut saisir son matricule et son code de sécurité d'accès (conservé uniquement sous forme d'empreinte SHA-256) avant que le bouton ne s'active. Le compte, le profil et les demandes sont effacés, la session est fermée.
* **F34 (580 XP) — Administration des Comptes (agents) :** Panneau « Comptes citoyens » dans l'espace agents (rôles agent et administrateur seulement) : recherche, filtre par état, modification du profil, suspension / réactivation (un compte suspendu ne peut plus se connecter), remise d'un code temporaire affiché une seule fois, suppression avec confirmation, journal des actions.
* **F35 (290 XP) — Astuces Contextuelles :** Bulles courtes affichées une seule fois la première fois qu'une rubrique reste à l'écran (recherche, services, transports, démarches, espace citoyen, notifications, espace agents). Fermeture par « Compris » ou Échap, « Ne plus afficher les astuces », et bouton « Astuces » de la barre d'outils pour les rappeler ou les réactiver.
* **F36 (580 XP) — Horaires des Transports :** Rubrique « Horaires des transports » : départ et destination au choix, trois prochains passages immédiatement (avec correspondance si besoin), état du trafic de chaque ligne relié aux alertes en cours (ex. montée des eaux dans le Secteur Sud).
* **F37 (900 XP) — Alerte Sécurité (connexions) :** Trois essais libres par compte, puis un délai d'attente qui double (30 s, 1 min, 2 min… jusqu'à 15 min), décompte visible, message identique que le compte existe ou non. Le compteur suit le compte (changer d'identifiant n'aide pas) ; 10 échecs en 10 minutes sur la plateforme déclenchent une alerte qui ralentit toutes les connexions. Les agents voient un panneau « Alerte sécurité » (comptes visés, débloquer). Le titulaire est prévenu à sa prochaine connexion réussie.
* **F38 (600 XP) — Services indisponibles :** Maintenance ou incident affichés sur le catalogue, en bandeau, et avant l'envoi d'une démarche (avec heure de retour, que faire, service à contacter). Les agents les gèrent dans « Services interrompus » ; le service redevient disponible tout seul à l'heure de retour. Un exemple d'interruption (Santé) est présent d'office.
* **F39 (600 XP) — Rendez-vous avec un agent :** Rubrique « Prendre rendez-vous » : service, motif, jour, créneau de 30 min (heure de la cité, 24 h), récapitulatif (jour en toutes lettres, heure de début et de fin, lieu, pièces à apporter) avant confirmation, référence RV-TN-XXXX, créneau déjà pris bloqué, pas de double réservation, annulation jusqu'à 2 h avant, export .ics. Aucun rendez-vous possible sur un service interrompu.
* **F40 (300 XP) — Rappel de rendez-vous :** Délai de rappel au choix (la veille, 2 h, 30 min, 10 min). Le rappel s'affiche à l'écran, dans le centre de notifications et en notification du navigateur si activée ; l'agenda .ics contient la même alarme. « Voir le rappel » permet de le prévisualiser tout de suite.
* **D13 (310 XP) — Mots Simples :** Lexique de 33 mots difficiles (dôme, matricule, quota, biolink…) expliqués en langage courant, en français, anglais et espagnol. Un bouton « ? » suit les titres techniques, sélectionner un mot propose son explication, le bouton « Lexique » de la barre d'outils et la recherche y mènent. « Empreinte cryptographique » devient « Code secret personnel ».
* **D20 (930 XP) — Accessibilité pour tous :** Un seul parcours, les mêmes fonctions pour tous. Panneau d'accessibilité complété (couleurs adaptées, lecture facilitée, aide, réinitialisation), déclaration d'accessibilité avec formulaire de signalement d'un obstacle, lien dans le pied de page.
* **F41 (620 XP) — Navigation au clavier :** Tous les éléments cliquables sont atteignables (Tab) et activables (Entrée, Espace), liens d'évitement supplémentaires, focus visible partout, raccourcis à une touche (`?` aide, `/` recherche, `n` notifications, `a` accessibilité, `l` lexique, `g` puis `h/s/d/r/t/c/a` pour aller à une rubrique) désactivables.
* **F42 (930 XP) — Formulaires accessibles :** Champs reliés à leur libellé, obligatoires signalés (`*` et `aria-required`), `autocomplete`, erreurs écrites sous chaque champ (`aria-invalid`, `aria-describedby`) avec résumé cliquable lu par les lecteurs d'écran et focus sur le premier champ en erreur ; les `alert()` bloquants deviennent des messages dans la page.
* **F43 (310 XP) — Couleurs :** Mode « Couleurs adaptées » (palette Okabe-Ito sûre pour les trois daltonismes) : chaque état a aussi un symbole (▲ ◆ ✔ ●), les liens sont soulignés, les erreurs ont une icône et un texte. Les états restent toujours écrits en toutes lettres.
* **F44 (620 XP) — Agrandissement :** Texte jusqu'à 200 % (six paliers) et affichage jusqu'à 320 px de large (zoom navigateur 400 %) sans défilement horizontal : grilles sur une colonne, rangées à la ligne, marges réduites, mots longs coupés.
* **Console Aethel-OS & Particules Quantiques (Bonus Waouh) :** Terminal interactif et effets audio synthétiques via Web Audio API.

---

## 🛠 Installation & Lancement

### 1. Cloner le dépôt
```bash
git clone https://github.com/BlueWxll/festtime.git
cd festtime
```

### 2. Configuration
Créez un fichier `.env` à la racine (ou copiez `.env.example`) :
```env
PORT=3000
API_KEY=s45f4ds5fgrtr4hytutyt45y4t54yty
```

### 3. Démarrer le serveur
```bash
npm start
```
L'application est accessible sur [http://localhost:3000](http://localhost:3000).

### 4. Déploiement (Hodifly)
`server.js` tourne sur l'hébergement et sert le proxy `/api/requests` : la clé API reste côté serveur. La commande de build est `sh build.sh` : elle recopie les variables d'environnement dans un fichier `.env` lu par le serveur et enregistre un instantané de l'API dans `api/requests.json`, utilisé en secours si le proxy ne répond pas.

Variables d'environnement :

| Variable | Rôle |
|---|---|
| `API_KEY` | Clé de l'API Webcup. |
| `BROADCAST_CODE` | Code demandé pour diffuser ou lever un message auprès de tous les habitants. Sans lui, les messages restent sur l'appareil qui les crée. |
| `OPENROUTER_API_KEY` | Clé OpenRouter pour les recommandations générées par IA. Sans elle, des recommandations de référence sont affichées. |
| `OPENROUTER_MODEL` | Facultatif. Modèle OpenRouter, par défaut `openrouter/free`. |

Les messages diffusés et les recommandations déjà générées sont enregistrés dans un dossier `data/` placé à côté des versions déployées, pour survivre aux déploiements.

---

## 🎨 Charte Graphique
* **Fond :** Void Black (`#03070E`)
* **Couleur Principale :** Cyber Blue (`#00F0FF`)
* **Couleur Secondaire :** Plasma Violet (`#9D00FF`)
* **Couleur d'Alerte :** Bio-Amber (`#FFB700`)
* **Typographies :** Orbitron (Titres) & Share Tech Mono (Données & Télémétrie)

- **F45 Plan de la ville** : section « Plan de la ville » (15 lieux : hôpitaux, pharmacies, mairie, transports, sentinelles, abris), tri par proximité selon le secteur, horaires et état ouvert/fermé, recherche et filtres, lien vers la prise de rendez-vous.
- **F46 Urgences** : bouton « Urgences » toujours visible (raccourci `u`), le lieu d'urgence le plus proche en un écran, numéro 112, note quand un service est interrompu.
- **F47 Journal d'activité** : espace agents, journal chaîné (empreinte SHA-256), filtres qui/quoi/quand, vérification d'intégrité, export CSV. Stocké dans le navigateur (localStorage).
- **F48 Qui a modifié quoi** : valeurs avant/après, dernière modification sur chaque compte et service, historique par élément.

- **F49 Être prévenu quand une demande change d'état** : bandeau visible dans toutes les sections, encart « Du nouveau dans vos démarches », message à l'écran, notification (cloche) avec le sens de l'état, ce qu'il faut faire et le message libre de l'agent.
- **F50 Tableau de bord des agents** : en tête de l'espace agents, indicateurs (à prendre en charge, en cours, résolues, délais), demandes à traiter en premier, points d'attention, charge par service, activité sur 7 jours.
- **F51 Mes données et mes inquiétudes** : section « Participation » (quelles données, pourquoi, qui, combien de temps, ce que la plateforme ne fait pas), export JSON, suppression du compte, formulaire d'inquiétude avec numéro de suivi, état et réponse des agents.
- **F52 Soutenir une demande** : liste des demandes autorisées au soutien, un soutien par habitant, retrait possible, trace « Mes soutiens », notification des changements d'état, soutien visible des agents (prioritaire dès 5).
- **D02 Connexion sans mot de passe** : clé d'accès (WebAuthn, empreinte/visage/code de l'appareil), ajout et retrait dans « Mon compte », signature vérifiée localement avec WebCrypto, repli sur le code d'accès.
- **F53 Vérification en plus** : code à 6 chiffres (TOTP RFC 6238) + 8 codes de secours à usage unique, blocage après 5 essais, application de démonstration à l'écran.
- **F54 Alerte nouvel appareil** : liste des appareils, bandeau + cloche + panneau, « C'était moi » / « Ce n'était pas moi » (retrait de l'appareil, changement du code d'accès), simulation pour la démonstration.
- **F55 Mes informations personnelles** : dossier lisible (résumé en phrases, tableaux) après confirmation d'identité, téléchargeable en HTML, JSON ou impression.
- **F56 Récapitulatif de mes demandes** : résumé clair, filtres, téléchargement CSV (tableur) ou HTML/impression.
- **F57 Mesurer et alléger** : section « Sobriété numérique » avec mesure en direct (données reçues, requêtes, temps de chargement, note A–E, estimation CO₂e), fichiers les plus lourds, diagnostic .json.
- **F58 Choix de conception sobres** : CSS Tailwind pré-compilé (`assets/tailwind.css`) au lieu du CDN, compression brotli/gzip + ETag côté `server.js`, polices et icônes non bloquantes, rafraîchissements suspendus onglet caché.
- **F59 Connexion lente** : mode économe désactivé par défaut (il ne s'active seul que si l'appareil demande d'économiser les données) ; un bandeau le propose si la connexion est 2G/3G ou le chargement long, bouton « Mode économe » dans la barre, `?lite=1` pour le forcer. Aucune requête externe en mode économe.
- **F60 Images et médias légers** : audit des médias de la page (aucune image/vidéo/son à télécharger), chargement différé automatique de toute image ou cadre ajouté, pas de lecture automatique.
- **F61 Appareils peu puissants** : sur un appareil détecté comme peu puissant (2 cœurs ou moins, 2 Go ou moins), les effets visuels sont réduits automatiquement (fond animé coupé, animations, flous, rendu différé des sections hors écran) sans retirer aucune information ni action ; carte « Fluidité de la page » (section Sobriété) avec mesure des pauses et interrupteur pour rétablir ou réduire les effets. L'animation de fond s'endort aussi quand l'onglet est caché.
- **F62 Versions simples** : bouton « Version simple » sur le Plan de la ville, les Services municipaux et les Actualités : une liste de texte rapide à lire, mémorisée, avec retour à la version complète en un clic.
- **F63 Interrupteurs de service** : l'agent ou l'administrateur désactive un service défectueux en deux clics (raison, retour prévu, service alternatif) ; nouvelles demandes et rendez-vous suspendus, état visible tout de suite par les habitants, annulation possible, inscription au journal d'audit, « Tout rétablir ».
- **F64 État des services avant toute démarche** : tableau « État des services » (disponible / en maintenance / incident / désactivé, icône + texte, heure de vérification, que faire en attendant, service alternatif), pastille d'état sur chaque service et rappel sur les formulaires de demande et de rendez-vous.
- **F65 Avis sur les décisions, avec trace** : chaque avis reçoit une référence et un suivi (Reçu, Lu par un agent, Pris en compte) visible dans « Mes contributions », dans la consultation et dans la cloche ; l'agent marque les avis comme lus puis publie « Ce que la ville a retenu » (avec le motif), ce qui passe tous les avis de la consultation à « Pris en compte » ; chaque action est inscrite au journal d'audit.
- **F66 Répondre à une consultation** : section « Projets & consultations », onglet Consultations : réponse en un choix + un mot facultatif, clairement indiquée comme « pas un vote officiel », une réponse par compte, modifiable ou retirable jusqu'à la clôture, accusé d'enregistrement immédiat avec référence, résultats affichés après la réponse.
- **F67 Projets en cours** : fiches claires (état, avancement, secteur, service responsable, période, budget, prochaine étape), filtres par état et par secteur, lien vers la consultation liée.
- **F68 Boîte à idées** : formulaire court (titre, explication, thème, secteur), référence et suivi (Reçue, À l'étude, Retenue, Non retenue, Réalisée), soutien des autres habitants (un par compte), réponse obligatoire de la ville quand l'idée est retenue ou non retenue.
- **F69 / F70 Registre et contrôle des données réservées** : Centre de sécurité de l'espace agent (déverrouillage par code, jeton signé de 2 h) ; registre des données réservées et « Lancer le contrôle » (en-têtes de sécurité, fichiers privés introuvables, configuration sans clé, 18 vérifications).
- **F71 Accueil de nombreux nouveaux arrivants** : espace agent, « Accueil des nouveaux arrivants » : liste CSV (nom;langue;dôme;profession;e-mail facultatif) ou 500 lignes d'exemple, vérification (lignes refusées, doublons, langues), création des comptes par lots avec matricule et code provisoire, cartes d'accueil imprimables en français, anglais ou espagnol, liste CSV et liste des interprètes à prévoir, annulation de l'import ; à la première connexion, la langue du compte et le guide de premiers pas s'appliquent.
- **F72 Guide d'arrivée** : parcours guidé pour un nouvel habitant (voir `assets/wave13.js`).
- **F73 Messages officiels en temps réel** : flux serveur (`/api/stream`, SSE) ; un message marqué « officiel » par l'agent apparaît en tête du site chez tous les habitants connectés en moins d'une seconde, épinglé jusqu'à ce qu'ils le marquent comme lu ; l'actualisation toutes les 30 s reste en secours.
- **F74 Associations partenaires** : section « Associations partenaires » (5 associations fictives) : filtres par type d'aide, par jour et « Ouvert maintenant », horaires de la semaine, prochaine ouverture, accès, export .ics, présence sur le Plan de la ville et dans la recherche ; l'agent modifie les horaires (validation des plages, remise à l'origine).
- **F75 Demandes semblables regroupées** · **F76 Avis sur le traitement** · **F77 Surcharge détectée** · **F78 Tenue de charge** · **F79 Filtres du suivi** · **F80 Urgence expliquée** · **F81 / F82 Protection contre les robots et les doublons** · **F83 Reçu vérifiable** · **F84 Réponse de l'agent** · **F85 Alertes de sécurité** · **F86 Urgence médicale** · **F87 Sauvegardes vérifiables** · **F88 Transmission du suivi** · **F89 Langage simple** · **F90 Explication à la demande** · **F91 Assistant** · **F92 Décrire son besoin** · **D10 Recherche tolérante** : voir `assets/wave13.js` à `assets/wave17.js` et les panneaux de l'espace agent.
- **F93 / F94 L'essentiel hors ligne** : section « Essentiel » (urgences et 112, alertes, transports, hôpitaux et pharmacies avec horaires, mes demandes, consignes en cas de panne) ; instantané gardé dans l'appareil et service worker (`sw.js`) qui conserve les pages ; bandeau d'incident quand le réseau ou le serveur lâche ; fiche essentielle téléchargeable (un seul fichier HTML), impression, bouton « Tester sans connexion » : voir `assets/wave18.js`, `sw.js`, `/api/essential`.
- **F95 Moins de requêtes** : dictionnaires de langue chargés à la demande, aucun appel agent pour les habitants, état de santé réutilisé depuis les alertes, vérifications suspendues onglet caché, fichiers statiques gardés 60 s ; mesure avant/après avec `m95.js` (51 → 45 requêtes et 358 → 317 Ko au chargement, 5,5 → 3,7 requêtes par minute au repos).
- **F96 Vue essentielle** : bouton « Vue essentielle » dans la barre (proposé seul sur connexion lente) : seules les rubriques vitales restent, mode économe activé, nombre d'éléments affichés mesuré en direct.
- **F97 Interruptions de lignes et remplacement** : un agent signale ou lève l'interruption d'une ligne (`/api/transport`) ; tous les habitants la voient, les itinéraires évitent la ligne, une navette de remplacement et l'autre itinéraire sont proposés : voir `assets/wave19.js`.
- **F98 Usage des services** : compteurs anonymes par service et par jour (consultation, demande, rendez-vous), respect de « Do Not Track », classement 7 ou 30 jours avec tendance, phrase de synthèse, export CSV, exemple chiffré fictif.
- **F99 Partenaires** : section « Partenaires » (4 partenaires fictifs) avec disponibilité, prochaine action (réserver, liste d'attente, être prévenu), proposition de partenaire validée par un agent, mise à jour de la disponibilité par l'agent.
- **F100 Événements de sécurité détaillés** : premier panneau de l'espace agent : alertes en cours, totaux sur 24 h, derniers événements filtrables, actualisation toutes les 15 s, copie en CSV.
