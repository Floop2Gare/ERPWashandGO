# Wash&Go App UI Guideline

Cette charte décrit le langage visuel retenu après la refonte colorée de l’ERP Wash&Go App. Elle sert de référence pour répliquer le nouveau thème sur toutes les pages.

## Palette principale
- **Bleu signature** `#0049ac` (logos, accents, liens actifs)
- **Dégradé primaire** : `#1848d6 → #2f6dff → #8bb5ff`
- **Accents complémentaires**
  - Violet : `#6d28d9 → #8b5cf6`
  - Turquoise : `#0f766e → #14b8a6`
  - Ambre : `#c2410c → #f97316`
- **Surfaces claires**
  - Fond global : `#f7f8fa`
  - Cartes neutres : `#ffffff`
  - Surfaces atténuées : `#f2f4f9`
- **Surfaces sombres**
  - Fond global : `#0b1120`
  - Surfaces : `#111c2f`
- **Texte**
  - Principal : `#1c1c1c` (clair) / `#e2e8f0` (sombre)
  - Secondaire : `#6c757d` (clair) / `#cbd5f5` (sombre)
  - Subtil : `#8d96a0` (clair) / `#9ca9c9` (sombre)

## Gradients et atmosphère
- **App shell** : combinaison de deux gradients radiaux bleus + turquoise, fond crème en clair / bleu nuit en sombre.
- **Sidebar** : gradient vertical du bleu signature vers le blanc, halo radial en tête. Variante sombre : bleu profond vers gris anthracite.
- **Topbar & Mobile nav** : gradient horizontal blanc → bleu ciel, avec `backdrop-blur` et ombres douces.
- **Cartes KPI** : variantes `tone="accent"` utilisant les dégradés primaire, violet et turquoise ; contenu en blanc.
- **Tuiles rapides** : classe `quick-link` + `data-accent` (`primary`, `violet`, `teal`, `amber`) pour appliquer les fonds et bordures colorés.

## Typographie
- Police : **Inter** (fallback system-ui).
- Titres : 24–32 px, semi-bold.
- Corps : 14–15 px.
- Meta / labels : 11–12 px uppercase, tracking 0.18–0.32 em.

## Espacements
- Marges horizontales : `px-6` desktop, `px-4` mobile.
- Sections verticales : `space-y-8` à `space-y-12`.
- Cartes : padding `p-5` ou `p-6`.
- Tableaux : cellules `px-4`, `py-2.5` / `py-3`.

## Composants clés
### Cartes (`<Card />`)
- Variantes :
  - `tone="surface"` : fond blanc, bord `#d9dee8`, ombre douce.
  - `tone="tint"` : gradient blanc → bleu clair, bordure atténuée.
  - `tone="accent"` : gradient coloré + texte blanc, anneau `ring-white/25`.
- Icône KPI : disque `bg-white/20`, ombre `0 12px 28px rgba(10,23,55,0.3)`.

### Tableaux
- En-tête : gradient `rgba(0,73,172,0.16) → 100% blanc`, texte uppercase `tracking-[0.24em]`.
- Lignes : alternance `#ffffff` / `#f7f8fa`, survol `rgba(0,73,172,0.06)`.
- Mode sombre : gradient bleu lumineux → marine, bordures `#253140`.
- Actions : boutons ronds `row-action-button`, fond translucide, hover coloré.

### Sidebar
- Conteneur : classe `sidebar-surface`, gradient bleu → blanc, ombre latérale.
- Nav : classes `sidebar-link`, `sidebar-link--active`, `sidebar-link--idle` pour gérer l’état (gradient actif + halo).
- Logo : capsule gradient bleu, texte “WA” blanc, halo `ring-white/40`.

### Boutons
- Primaire : `bg-[#0049ac]`, texte blanc, hover `#003b91`, ombre `0 10px 24px rgba(0,73,172,0.24)`.
- Secondaire : fond translucide, bord `rgba(217,222,232,0.9)`, hover `border-primary/40`.
- Danger : bord `rgba(225,29,72,0.45)`, hover texte `#e11d48`.

### Statuts
- Pastille neutre : `rgba(232,236,244,0.8)` / texte `#475467`.
- Pastille primaire : `rgba(0,73,172,0.12)` / texte `#0049ac`.
- Pastille succès : `rgba(22,163,74,0.15)` / texte `#166534`.
- Sombre : couleurs désaturées (`#4ade80`, `#9bbdff`, etc.).

## Responsivité & interactions
- Mobile : cartes empilées, quick nav horizontale, sidebar repliée.
- Animations : transitions 200–250 ms (`transform`, `box-shadow`, `background`).
- Accessibilité : focus visible (anneau primaire), contrastes ≥ 4.5:1 en clair & sombre.

## Thème
- Classe `washingo-dark` appliquée à `<body>` et `<html>` pour le mode sombre.
- Persistance en `localStorage` (`washandgo-theme`).
- Accent personnalisable via `applyBrandingColorToDocument` (palette radio dans Paramètres).

Respectez ces directives pour prolonger l’interface colorée et sobre de Wash&Go App sur l’ensemble de l’ERP.
