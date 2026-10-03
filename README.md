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
