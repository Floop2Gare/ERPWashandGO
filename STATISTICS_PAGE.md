# Page Statistiques

La page **Statistiques** concentre le pilotage analytique dans un environnement minimaliste : fond blanc, typographies fines, bleu primaire #0049ac en accent et espacements serrés. Elle permet de filtrer rapidement la donnée, d’isoler des segments et d’exporter un reporting multi-feuilles sans quitter l’interface.

## En-tête & réglages globaux
- Bandeau « Pilotage analytique » avec un court texte introductif et le bouton **Exporter Excel**.
- Barre de filtres compacte : période (semaine/mois/trimestre), date de départ, filtres globaux (catégorie, ville, collaborateur) et sélection des projets focus/comparaison.
- Les états vides signalent clairement l’absence de données et proposent d’élargir la période.

## Chiffres clés instantanés
- Grille de KPI (prestations, chiffre d’affaires estimé, durée totale, panier moyen, taux d’annulation).
- Chaque carte affiche la valeur de la période, le rappel du jour et permet, lorsque pertinent, d’activer un filtre contextuel (ex. focus sur une catégorie en un clic).

## Tendances graphiques
- Section centrale avec un **toggle Superposer / Séparer** :
  - mode superposé = combo chart (barres de volume + ligne de CA) avec tooltips détaillant variation vs période précédente.
  - mode séparé = courbe de CA et histogramme de volume affichés côte à côte.
- La légende reste discrète, les axes sont épurés et la fenêtre temporelle est rappelée sous forme de libellé.

## Services & catégories
- Tableau « Top services » dense : CA, volume, durée cumulée, panier moyen. Un clic sur une ligne concentre toute la page sur le service choisi.
- Carte synthèse par catégories (Voiture/Canapé/Textile) avec mini-barres horizontales proportionnelles, volumes et durées moyennes. Chaque catégorie peut devenir un filtre global.

## Performance géographique
- Tableau compact des villes avec interventions, CA, durée totale, ticket moyen.
- Commandes Top 5/10/25 + recherche instantanée + clic pour filtrer la page sur une ville donnée.

## Suivi projets & comparaisons
- Sélection du projet focus et du projet comparé, affichage des durées planifiées, progression observée et écart en points.
- Bloc synthétique rappelant l’avance ou le retard et table finale listant tous les projets actifs (statut, période, % d’avancement, écart temps) enrichie d’une sparkline de progression.

## Export analytique
- Le bouton « Exporter Excel » génère un classeur multi-feuilles respectant les filtres actifs :
  1. KPIs
  2. CA_journalier
  3. Volume_journalier
  4. Top_services
  5. Catégories
  6. Villes
  7. Projets
- Les valeurs monétaires et durées sont préparées pour une lecture immédiate (€, hh:mm).

L’ensemble conserve la sobriété du SaaS : bordures 1 px gris très clair, ombres quasi invisibles, interactions textuelles sans icônes, responsive avec colonnes empilées sur mobile.
