# Frontend ERP Wash&Go

Interface React/Vite pour l'ERP Wash&Go.

## Structure

```
frontend/
├── src/                    # Code source
│   ├── components/        # Composants React
│   ├── pages/            # Pages de l'application
│   ├── lib/              # Utilitaires et configurations
│   └── main.tsx          # Point d'entrée
├── public/                # Fichiers statiques
├── package.json          # Dépendances Node.js
└── README.md             # Ce fichier
```

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` à la racine du projet :
```
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anonyme
VITE_API_URL=http://localhost:8000
```

## Développement

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## Build

```bash
npm run build
```

Les fichiers de production seront dans le dossier `dist/`

## Déploiement sur Vercel

Ce frontend peut être déployé sur Vercel en tant que projet séparé.

Dans les paramètres du projet Vercel, configurez :
- **Build Command** : `npm run build`
- **Output Directory** : `dist`
