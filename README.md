# ERP Codex

Application SaaS de gestion des prestations pour un atelier de nettoyage. Le projet inclut :

- Un front-end React + TypeScript + Tailwind CSS (dossier `frontend`) avec les écrans principaux : tableau de bord, clients, services, prestations/devis, planning, statistiques et paramètres.
- Un back-end FastAPI (dossier `backend`) exposant des routes REST simples pour l’authentification, les clients, les services, les prestations, le planning et les statistiques.

## Démarrage rapide

### Prérequis

- Node.js 18+
- Python 3.11+

### Lancer le front-end

```bash
npm install
npm run dev
```

Le projet utilise désormais un `package.json` à la racine avec un workspace pointant vers `frontend`. Les commandes ci-dessus installent les dépendances du workspace et démarrent Vite. L’interface est disponible sur [http://localhost:5173](http://localhost:5173).

### Lancer l’API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # ou .venv\\Scripts\\activate sous Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

L’API répond sur [http://localhost:8000](http://localhost:8000) et la documentation interactive est disponible sur `/docs`.

## Données de démonstration

Les deux couches utilisent des données en mémoire pour proposer une expérience de démonstration cohérente :

- Authentification : accéder à `/connexion` et utiliser `adrien / test` (des profils supplémentaires peuvent être créés via le bouton « Créer un profil »).
- Clients, services, prestations et statistiques sont pré-remplis.

## Structure

```
frontend/
  src/
    components/    // composants UI partagés
    layout/        // mise en page globale (sidebar + topbar)
    pages/         // pages principales du SaaS
    store/         // état local et données mockées
backend/
  app/
    api/           // routes FastAPI
    models/        // stockage en mémoire et calculs
    schemas/       // schémas Pydantic
```

## Accessibilité & design

- Palette primaire #0049ac et gris neutres.
- Typographie système sans-serif avec hiérarchie claire.
- Composants sans icône ni animation décorative.
- Focus clavier visibles, contrastes conformes aux recommandations AA.

## Scripts utiles

- `npm run build` (à la racine) pour produire la version optimisée du front-end dans `frontend/dist`.
- `npm run preview` pour lancer un serveur statique local à partir du build.
- `uvicorn app.main:app --reload` dans `backend` pour lancer l’API.

## Déploiement Vercel

Le fichier `vercel.json` configure Vercel pour installer les dépendances, exécuter la commande de build du workspace front-end et exposer le dossier `frontend/dist`. Une réécriture unique renvoie toutes les routes vers `index.html` afin de supporter le routage côté client de React.

### Vérification locale

```bash
# depuis la racine du dépôt
npm install --workspaces --include-workspace-root
npm run build --workspace frontend
```

Ces commandes reproduisent exactement le flux utilisé par Vercel. La sortie optimisée est disponible dans `frontend/dist` et peut être prévisualisée avec `npm run preview`.

## Licence

Projet fourni à titre d’exemple pour l’atelier de démonstration.
