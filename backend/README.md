# Backend ERP Wash&Go

API FastAPI pour l'ERP Wash&Go.

## Structure

```
backend/
├── app/                    # Code source de l'application
│   ├── api/               # Routes API
│   ├── models/            # Modèles de données
│   └── main.py            # Point d'entrée
├── database/              # Schémas SQL
├── requirements.txt       # Dépendances Python
└── README.md             # Ce fichier
```

## Installation

1. Créer un environnement virtuel :
```bash
python -m venv venv
```

2. Activer l'environnement virtuel :
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Installer les dépendances :
```bash
pip install -r requirements.txt
```

## Configuration

Créer un fichier `.env` avec les variables d'environnement :
```
CALENDAR_ID_ADRIEN=...
CALENDAR_ID_CLEMENT=...
GOOGLE_SA_ADRIEN_JSON=...
GOOGLE_SA_CLEMENT_JSON=...
```

## Lancement

```bash
uvicorn app.main:app --reload
```

L'API sera accessible sur `http://localhost:8000`

## Endpoints

- `GET /health` - Health check
- `GET /planning/google-calendar` - Récupération des événements Google Calendar
- `GET /auth/*` - Authentification
- `GET /clients/*` - Gestion des clients
- `GET /services/*` - Gestion des services
- `GET /prestations/*` - Gestion des prestations
- `GET /stats/*` - Statistiques

## Déploiement sur Vercel

Ce backend peut être déployé sur Vercel en tant que projet séparé.
