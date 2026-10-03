# 🚀 TERRA NOVA — Plateforme Numérique Centrale
> **24H By Webcup 2026** — Mégapole Exoplanétaire & Réseau Urbain Aethel-OS

Plateforme officielle de la première colonie spatiale de l'humanité sur un nouveau monde. Développée pour répondre aux besoins évolutifs des habitants, des services municipaux et du Haut Conseil de Terra Nova.

---

## ✨ Fonctionnalités Majeures (Vague Initiale — 10 Demandes / 3750 XP)

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

---

## 🎨 Charte Graphique
* **Fond :** Void Black (`#03070E`)
* **Couleur Principale :** Cyber Blue (`#00F0FF`)
* **Couleur Secondaire :** Plasma Violet (`#9D00FF`)
* **Couleur d'Alerte :** Bio-Amber (`#FFB700`)
* **Typographies :** Orbitron (Titres) & Share Tech Mono (Données & Télémétrie)
