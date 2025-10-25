# ERP Wash&Go

Système ERP pour la gestion de l'entreprise Wash&Go.

## 📁 Structure du Projet

Ce projet est organisé en deux parties indépendantes :

```
ERPWashandGO2/
├── backend/          # API Python FastAPI
│   ├── app/         # Code source du backend
│   ├── database/    # Schémas SQL
│   └── README.md    # Documentation du backend
│
└── frontend/        # Interface React/Vite
    ├── src/        # Code source du frontend
    ├── public/     # Fichiers statiques
    └── README.md   # Documentation du frontend
```

## 🚀 Démarrage Rapide

### Backend

1. Aller dans le dossier backend :
```bash
cd backend
```

2. Créer un environnement virtuel :
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

3. Installer les dépendances :
```bash
pip install -r requirements.txt
```

4. Lancer le serveur :
```bash
uvicorn app.main:app --reload
```

Le backend sera accessible sur `http://localhost:8000`

### Frontend

1. Aller dans le dossier frontend :
```bash
cd frontend
```

2. Installer les dépendances :
```bash
npm install
```

3. Lancer le serveur de développement :
```bash
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

## 📦 Déploiement

### Backend (Vercel)

Le backend peut être déployé sur Vercel en tant que projet séparé.

### Frontend (Vercel)

Le frontend peut être déployé sur Vercel en tant que projet séparé.

## 📝 Documentation

- [Documentation Backend](./backend/README.md)
- [Documentation Frontend](./frontend/README.md)

## 🔧 Technologie

- **Backend** : FastAPI (Python)
- **Frontend** : React + Vite + TypeScript
- **Base de données** : Supabase (PostgreSQL)
- **Déploiement** : Vercel

## 📄 Licence

Propriétaire - Wash&Go
