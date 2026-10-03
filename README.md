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
- **F59 Connexion lente** : bandeau qui propose le mode économe (connexion 2G/3G, économiseur de données ou chargement long), bouton « Mode économe » dans la barre, `?lite=1` pour le forcer. Aucune requête externe en mode économe.
- **F60 Images et médias légers** : audit des médias de la page (aucune image/vidéo/son à télécharger), chargement différé automatique de toute image ou cadre ajouté, pas de lecture automatique.
