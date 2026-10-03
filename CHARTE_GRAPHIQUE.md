# CHARTE GRAPHIQUE — VELKARYS, CITÉ ORBITALE

> Direction artistique : **« Instrument d'observation »**.
> La cité n'est pas un décor de science-fiction : c'est un lieu qui *mesure*, *cartographie* et *signale*. Le site ressemble à l'interface d'un instrument de navigation extraterrestre : données, repères, tracés fins, lumière froide. Pas de dégradés violets, pas de verre dépoli générique, pas de néons bavants.

---

## 1. Principes directeurs

| Principe | Application | Anti-pattern à éviter |
|---|---|---|
| **Précision** | Traits de 1 px, grilles, repères de coordonnées, chiffres tabulaires | Gros blobs, ombres floues |
| **Lumière unique** | Une seule couleur émet de la lumière : le bleu cyber | Arc-en-ciel, dégradé bleu→violet |
| **Matière sombre** | Fonds mats, légèrement bleutés, grain subtil | Noir pur plat, glassmorphism |
| **Asymétrie** | Mises en page décalées, colonnes inégales, marges de « plan technique » | Hero centré + 3 cartes identiques |
| **Langage alien** | Glyphes, numérotation, coordonnées stellaires, unités fictives | Texte « lorem futuriste » générique |

**Signature visuelle (ce qui rend le site reconnaissable)** :
1. Les **marques de repérage** `+` aux coins de chaque bloc (comme un viseur de cartographie).
2. Le **secteur numéroté** : chaque section est préfixée `SECTEUR 03 / 07`.
3. Le **trait de scan** : une ligne bleue de 1 px qui balaie un élément au survol.
4. Les **coins coupés** (chanfrein 45°) au lieu des arrondis.

---

## 2. Palette de couleurs

### 2.1 Couleur principale — Bleu cyber

| Nom | HEX | RGB | Usage |
|---|---|---|---|
| **Cyber 500 (primaire)** | `#00B8FF` | 0, 184, 255 | CTA, liens, tracés actifs, focus |
| Cyber 400 | `#3DCBFF` | 61, 203, 255 | Hover, éclat de lumière |
| Cyber 300 | `#8FE1FF` | 143, 225, 255 | Texte accentué, valeurs de données |
| Cyber 600 | `#0093CC` | 0, 147, 204 | État pressé (active) |
| Cyber 700 | `#006C99` | 0, 108, 153 | Bordures de blocs actifs |
| Cyber 900 | `#06303F` | 6, 48, 63 | Fond de surbrillance / sélection |

### 2.2 Fonds (sombres, teintés bleu-vert profond)

| Nom | HEX | Usage |
|---|---|---|
| **Void 950** | `#05080C` | Fond de page principal |
| Void 900 | `#0A1018` | Fond de sections alternées |
| Void 800 | `#101923` | Cartes, panneaux |
| Void 700 | `#17232F` | Panneaux survolés, champs de formulaire |
| Void 600 | `#22323F` | Séparateurs épais, track de scrollbar |

### 2.3 Lignes & texte

| Nom | HEX | Usage |
|---|---|---|
| Line subtle | `#1B2B38` | Grille de fond, bordures discrètes |
| Line default | `#2A4052` | Bordures de composants |
| Line strong | `#3F6178` | Bordures au survol |
| **Text 100** | `#E6F1F7` | Titres, texte principal |
| Text 300 | `#A9BDC9` | Corps de texte secondaire |
| Text 500 | `#6F8696` | Légendes, métadonnées |
| Text 700 | `#465967` | Texte désactivé |

### 2.4 Couleur d'appoint (rare, < 3 % de la surface)

| Nom | HEX | Usage |
|---|---|---|
| **Ambre signal** | `#FFB347` | Alertes, un seul élément « chaud » par écran (compteur, badge) |

> Cet ambre est le contrepoint chaud qui évite l'effet monochrome « généré ». Il ne sert jamais de décoration.

### 2.5 États sémantiques

| État | HEX | Fond associé |
|---|---|---|
| Succès | `#3DDC97` | `#0B2A1F` |
| Alerte | `#FFB347` | `#2E2008` |
| Erreur | `#FF5470` | `#2E0B14` |
| Info | `#00B8FF` | `#06303F` |

### 2.6 Règles de couleur
- Ratio : **85 % fonds Void · 12 % texte/lignes · 3 % Cyber/Ambre**.
- Le bleu cyber n'est **jamais** utilisé en grande surface pleine (sauf bouton primaire).
- Aucun dégradé décoratif. Seul dégradé autorisé : halo radial `Cyber 500` à 8 % d'opacité derrière un élément clé.
- Contraste minimum WCAG AA : `Text 100` sur `Void 950` = 16:1 ✔ ; `Cyber 500` sur `Void 950` = 8:1 ✔.

```css
:root {
  --cyber-300:#8FE1FF; --cyber-400:#3DCBFF; --cyber-500:#00B8FF;
  --cyber-600:#0093CC; --cyber-700:#006C99; --cyber-900:#06303F;
  --void-950:#05080C; --void-900:#0A1018; --void-800:#101923;
  --void-700:#17232F; --void-600:#22323F;
  --line-subtle:#1B2B38; --line:#2A4052; --line-strong:#3F6178;
  --text-100:#E6F1F7; --text-300:#A9BDC9; --text-500:#6F8696; --text-700:#465967;
  --amber:#FFB347; --ok:#3DDC97; --err:#FF5470;
}
```

---

## 3. Typographie

### 3.1 Familles (Google Fonts, gratuites)

| Rôle | Police | Pourquoi |
|---|---|---|
| **Titres / display** | **Chakra Petch** (600, 700) | Angles coupés, caractère technique sans cliché « Orbitron » |
| **Corps de texte** | **IBM Plex Sans** (400, 500) | Très lisible, sobre, aspect instrumental |
| **Données / labels / code** | **JetBrains Mono** (400, 500) | Chiffres tabulaires, coordonnées, étiquettes |

> Éviter : Orbitron, Exo 2, Rajdhani (trop vus dans les designs « sci‑fi IA »).

### 3.2 Échelle typographique (base 16 px, ratio 1.250)

| Style | Police | Taille | Graisse | Interligne | Espacement | Casse |
|---|---|---|---|---|---|---|
| Display XL (hero) | Chakra Petch | `clamp(3rem, 7vw, 6rem)` | 700 | 1.0 | -0.02em | MAJUSCULES |
| H1 | Chakra Petch | 3rem (48) | 700 | 1.1 | -0.01em | MAJUSCULES |
| H2 | Chakra Petch | 2.25rem (36) | 600 | 1.15 | 0 | Majuscules |
| H3 | Chakra Petch | 1.5rem (24) | 600 | 1.25 | 0.02em | Normale |
| H4 | Chakra Petch | 1.25rem (20) | 600 | 1.3 | 0.04em | Majuscules |
| Corps L | IBM Plex Sans | 1.125rem (18) | 400 | 1.65 | 0 | Normale |
| Corps | IBM Plex Sans | 1rem (16) | 400 | 1.6 | 0 | Normale |
| Corps S | IBM Plex Sans | 0.875rem (14) | 400 | 1.5 | 0.005em | Normale |
| Label / eyebrow | JetBrains Mono | 0.75rem (12) | 500 | 1.2 | 0.14em | MAJUSCULES |
| Donnée | JetBrains Mono | 1rem–2.5rem | 500 | 1.1 | 0 | — |
| Légende | JetBrains Mono | 0.6875rem (11) | 400 | 1.3 | 0.08em | MAJUSCULES |

### 3.3 Règles
- Largeur de ligne max : **68 caractères** (`max-width: 68ch`).
- Titres toujours alignés à gauche (jamais centrés sur plusieurs lignes).
- `font-variant-numeric: tabular-nums` sur toutes les données chiffrées.
- Texte d'un mot clé en `Cyber 300` + JetBrains Mono pour les termes propres à la cité (noms de secteurs, unités).
- Un titre peut être précédé d'un eyebrow : `// SECTEUR 02 · PORT D'ARRIMAGE`.

---

## 4. Grille, espacement, formes

### 4.1 Grille
- Desktop : **12 colonnes**, gouttière 24 px, conteneur max **1280 px**, marges latérales 48 px.
- Tablette : 8 colonnes, gouttière 20 px, marges 32 px.
- Mobile : 4 colonnes, gouttière 16 px, marges 20 px.
- Mises en page recommandées : contenus en **7/5** ou **8/4**, jamais 6/6 systématique.
- Fond de page : grille de lignes `--line-subtle` tous les **64 px**, opacité 40 %, masquée en dégradé vers le bas.

### 4.2 Échelle d'espacement (base 4 px)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 144`
Espacement vertical entre sections : **144 px** desktop / **80 px** mobile.

### 4.3 Formes
- **Rayon : 0** par défaut. Utiliser des **chanfreins** :
```css
--cut: 12px;
clip-path: polygon(var(--cut) 0, 100% 0, 100% calc(100% - var(--cut)),
                   calc(100% - var(--cut)) 100%, 0 100%, 0 var(--cut));
```
- Bordures : **1 px** (2 px uniquement pour l'élément actif/focus).
- Ombres : **aucune ombre portée**. La profondeur vient des niveaux de Void et des lignes.
- Glow autorisé uniquement sur l'élément actif : `box-shadow: 0 0 0 1px var(--cyber-500), 0 0 24px rgba(0,184,255,.25)`.

### 4.4 Marques de repérage (signature)
Petits `+` de 10 px, couleur `Line strong`, placés aux 4 coins extérieurs des cartes et du hero ; passent en `Cyber 500` au survol.

---

## 5. Composants

### 5.1 Boutons

| Variante | Fond | Bordure | Texte | Hover | Active | Disabled |
|---|---|---|---|---|---|---|
| **Primaire** | `Cyber 500` | aucune | `Void 950`, Chakra Petch 600, 14 px, MAJ, 0.1em | Fond `Cyber 400` + trait de scan | `Cyber 600` | `Void 600` / texte `Text 700` |
| **Secondaire** | transparent | 1 px `Cyber 500` | `Cyber 500` | Fond `Cyber 900` | Fond `Cyber 700` | bordure `Line` / texte `Text 700` |
| **Tertiaire (lien)** | — | soulignement 1 px pointillé | `Text 100` | Soulignement plein `Cyber 400` | — | — |

- Hauteur : 48 px (L), 40 px (M), 32 px (S). Padding horizontal : 28 / 24 / 16 px.
- Forme : chanfrein 8 px sur le coin **haut-droit et bas-gauche** uniquement.
- Icône flèche `→` en JetBrains Mono, qui glisse de 4 px au hover.
- Transition : 160 ms `cubic-bezier(.2,.8,.2,1)`.

### 5.2 Navigation (header)
- Hauteur 72 px, fond `Void 950` à 88 % + `backdrop-filter: blur(6px)`, bordure basse 1 px `Line subtle`.
- Logo à gauche ; liens à droite en JetBrains Mono 13 px MAJ, 0.12em, `Text 300`.
- Numérotation devant chaque lien : `01 PORT` `02 ARCHIVES`… en `Text 500`.
- Lien actif : texte `Cyber 300`, trait de 2 px `Cyber 500` sous le lien, avec petit carré de 4 px à gauche.
- Mobile : menu plein écran fond `Void 950`, liens en Display 40 px.

### 5.3 Cartes / panneaux
- Fond `Void 800`, bordure 1 px `Line`, chanfrein 12 px haut-gauche, repères `+` aux coins.
- Padding 32 px. En-tête : eyebrow mono (`ID-0347`) + titre H3.
- Hover : bordure `Line strong`, trait de scan vertical de 1 px `Cyber 500` (opacité 60 %) traversant la carte en 600 ms.
- Image : filtre `grayscale(.6) contrast(1.1)` + overlay `Cyber 900` à 35 % en `mix-blend-mode: multiply`; couleur pleine au hover.

### 5.4 Formulaires
- Champ : fond `Void 700`, bordure basse 1 px `Line` (pas de cadre complet), hauteur 52 px, texte `Text 100`.
- Label : mono 11 px MAJ au-dessus, `Text 500`.
- Focus : bordure basse 2 px `Cyber 500` + label passe en `Cyber 300`.
- Erreur : bordure basse `#FF5470` + message mono 12 px.
- Case à cocher : carré 18 px chanfreiné, coché = remplissage `Cyber 500` avec coche `Void 950`.
- Placeholder : `Text 700`.

### 5.5 Badges / étiquettes
Mono 11 px MAJ, padding 4×10, bordure 1 px, fond transparent. Variantes : `Cyber` (info), `Ambre` (alerte), `Line` (neutre). Précédés d'un point de 6 px.

### 5.6 Tableaux de données
En-tête mono 11 px MAJ `Text 500`, lignes séparées par 1 px `Line subtle`, ligne survolée `Void 700`, valeurs numériques alignées à droite en `Cyber 300`.

### 5.7 Modales
Fond overlay `rgba(5,8,12,.82)`, panneau `Void 800`, bordure 1 px `Cyber 700`, chanfrein 16 px, apparition : ouverture verticale (scaleY 0.96→1 + fade, 220 ms).

### 5.8 Pied de page
Fond `Void 900`, bordure haute `Line`, 4 colonnes, grande coordonnée en Display (ex. `α 47.201 · β 12.884`) en `Void 600` comme filigrane. Mention légale en mono 11 px.

---

## 6. Iconographie & illustration

- Style : **trait uniquement**, 1.5 px, extrémités carrées (`stroke-linecap: square`), angles à 45°/90°, grille de 24 px.
- Couleur : `Text 300` ; actif `Cyber 500`. Jamais d'icônes pleines ni multicolores.
- Bibliothèque de base : Phosphor (thin/light) ou Lucide, **retouchée** (coins coupés) pour la cohérence.
- **Glyphes alien** : alphabet maison de ~26 symboles géométriques (traits + points), utilisés en décor (filigranes de titres, séparateurs), toujours accompagnés d'une traduction lisible à proximité.
- Illustrations : vues techniques de l'architecture (plans, coupes, orbites) en lignes bleues fines sur `Void`, annotations en mono. Pas de rendu 3D lisse « générique ».
- Photographie / rendu : bleu froid désaturé, contraste fort, source lumineuse unique cyan, silhouettes architecturales massives.

---

## 7. Logo

- **Nom** : VELKARYS (Chakra Petch 700, espacement 0.32em).
- **Symbole** : cercle orbital de 1.5 px interrompu en 3 segments, avec un carré plein `Cyber 500` de 6 px placé sur l'orbite (la station).
- Variantes : horizontal (symbole + nom), compact (symbole seul), monochrome `Text 100`.
- Zone de protection : hauteur du carré × 4 tout autour. Taille mini : 24 px (symbole), 96 px (horizontal).
- Interdits : dégradé, glow, déformation, fond clair.

---

## 8. Effets & mouvement

| Effet | Détail |
|---|---|
| **Trait de scan** | Ligne 1 px `Cyber 500` qui traverse un élément, 600 ms, ease-out |
| **Apparition de texte** | Titres révélés lettre par lettre en « décodage » mono → police finale, 400 ms max, une seule fois |
| **Grain** | Bruit SVG à 4 % d'opacité sur `Void 950`, fixe |
| **Halo radial** | Un seul par page, `Cyber 500` @ 8 %, rayon 600 px, derrière le hero |
| **Parallaxe** | Max 24 px, uniquement sur les illustrations de fond |
| **Curseur** | Viseur `+` de 16 px qui suit la souris sur desktop, retour au curseur natif sur éléments de texte/formulaires |

- Durées : micro 120–160 ms · composants 220 ms · sections 500–700 ms.
- Easing standard : `cubic-bezier(.2,.8,.2,1)`.
- Respecter `prefers-reduced-motion` : désactiver scan, décodage, parallaxe et curseur.

---

## 9. Structure de page type (Accueil)

1. **Hero** — colonne gauche 7/12 : eyebrow `// COORD 47.201 · α`, titre Display XL, texte 2 lignes, 2 boutons. Colonne droite 5/12 : plan orbital en traits fins animé lentement (rotation 120 s).
2. **Bandeau de données** — 4 compteurs mono (population, secteurs, cycles, signaux) séparés par 1 px.
3. **Secteurs** — liste verticale numérotée plutôt que grille de cartes ; l'aperçu image apparaît au survol.
4. **Archives / Chronologie** — axe vertical décalé à gauche, dates en mono.
5. **Appel à l'action** — bloc encadré avec repères `+`, un seul bouton primaire.
6. **Footer**.

---

## 10. Ton éditorial

- Voix : sobre, observatrice, légèrement détachée. Phrases courtes. Pas d'exclamation.
- Vocabulaire : *secteur, cycle, signal, arrimage, relevé, anneau*.
- Unités fictives : **cycle** (jour), **pulse** (heure), **km‑lumière** (distance).
- Exemple : « Secteur 03. 41 200 habitants. Dernier relevé : cycle 8 412. »

---

## 11. Accessibilité & responsive

- Contrastes AA minimum ; focus visible 2 px `Cyber 500` + offset 3 px sur tout élément interactif.
- Taille tactile ≥ 44 px.
- Animations désactivables, aucune information portée par la couleur seule.
- Breakpoints : `640 · 960 · 1280 · 1600 px`.
- Alt obligatoire ; les glyphes décoratifs en `aria-hidden="true"`.

---

## 12. Checklist anti « look IA »

- [ ] Pas de dégradé violet/bleu ni de glassmorphism généralisé
- [ ] Pas de cartes arrondies identiques en grille de 3
- [ ] Pas de titre centré avec sous-titre centré
- [ ] Une seule couleur lumineuse + un ambre rare
- [ ] Détails propres à la cité (coordonnées, glyphes, unités)
- [ ] Mises en page asymétriques
- [ ] Textes réels, jamais de « Lorem ipsum » ni de slogans génériques
