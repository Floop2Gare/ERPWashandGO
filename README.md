# ERP Wash&Go 2

ERP Wash&Go 2 est une plateforme SaaS dédiée aux équipes de lavage et de detailing automobile. Elle unifie la prospection, la gestion des clients, la planification des prestations et la facturation au sein d’un écosystème commun front-end React + TypeScript + Tailwind et back-end FastAPI. Depuis 2024, le projet intègre également une expérience mobile terrain pensée pour les techniciens, sans compromettre l’interface bureautique historique.

## Vision & enjeux

- **Vue 360° de l’activité** : centraliser clients, leads, services, achats, documents commerciaux, statistiques et paramètres dans un outil unique.
- **Alignement bureau ↔ terrain** : proposer une interface desktop riche et une interface mobile compacte partageant les mêmes données (services, devis, planning, notifications).
- **Automatisation des documents** : générer devis, factures et exports CSV en un clic, avec mise en page PDF et envoi e-mail / calendrier automatisés.
- **Déploiement cloud simple** : architecture pensée pour Vercel (front + fonctions serverless) et FastAPI côté back-office, avec des flux de build reproductibles localement.

## Architecture globale

```
.
├── frontend/                 # Application React + TypeScript + Tailwind (desktop + mobile)
│   ├── src/
│   │   ├── pages/            # Pages métier (Dashboard, Clients, Services, Planning…)
│   │   ├── layout/           # Shell (sidebar, topbar, mobile shell)
│   │   ├── components/       # UI partagée, cartes, tableaux, icônes
│   │   ├── lib/              # Utilitaires (PDF, CSV, calendrier, notifications…)
│   │   ├── hooks/            # Hooks de données et d’intégration (Google Calendar…)
│   │   └── store/            # Données mockées / cache local synchronisé
│   ├── public/               # Assets statiques + service worker mobile
│   └── index.html            # Point d’entrée Vite
├── backend/                  # API FastAPI (auth, clients, services, documents, planning)
│   └── app/
│       ├── api/              # Routes REST
│       ├── models/           # Modèles métier / stockage en mémoire
│       └── schemas/          # Schémas Pydantic
├── api/                      # Fonctions serverless Vercel (Google Calendar, email)
├── vercel.json               # Configuration déploiement Vercel (build, rewrites, routes API)
└── package.json              # Monorepo npm (workspace `frontend`)
```

### Front-end desktop
- Thème clair/sombre sobre (palette neutre + accent bleu) avec tokens CSS centralisés.
- Tableaux unifiés : en-têtes fixes, actions icônes, exports CSV (Clients, Leads, Services).
- Pages métier : Dashboard compact, Settings (catalogue services & produits), planning mensuel façon Google Agenda, générateur de devis/factures PDF avec envoi e-mail.

### Front-end mobile terrain
- Détection automatique (`?ui=mobile`, user-agent, viewport) sans modifier le desktop.
- Écrans clés : connexion, liste des services du jour, recherche, création de service (client, catalogue, prestations, date planifiée), timer plein écran (pause/reprendre/terminer), facturation mobile, planning 7 jours et synchronisation Google Calendar.
- Notifications locales et service worker : notification persistante lors du démarrage d’une prestation avec actions « Pause » / « Arrêter » directement depuis l’écran verrouillé.

### Back-end FastAPI
- Authentification simple (profils en mémoire pour la démo) et routes CRUD pour clients, leads, services, documents commerciaux et statistiques.
- Calculs de totals, TVA, planning hebdomadaire et liens vers le catalogue Services & Produits.

### Fonctions serverless Vercel
- `api/planning/google-calendar.ts` : agrégation des événements Google Calendar via comptes de service.
- `api/send-document-email.ts` : envoi d’e-mails transactionnels (devis/factures) via SMTP.

## Fonctionnalités phares

| Domaine | Capacités |
| --- | --- |
| **CRM** | Gestion clients, leads, recherches rapides, actions « Appeler/Email », exports CSV. |
| **Catalogue** | Paramétrage Services & Prestations, catégories, TVA, règles d’intégration avec la page Services. |
| **Services** | Création desktop/mobile, sélection des prestations du catalogue, calculs automatiques (durée, HT/TTC), suivi des statuts. |
| **Documents** | Génération de devis & factures (DEV-YYYYMM-XXXX / FAC-YYYYMM-XXXX), PDF, envoi e-mail, téléversement. |
| **Planning** | Vue mensuelle (desktop) inspirée de Google Agenda + vue mobile 7 jours filtrée par technicien, synchronisée avec Google Calendar. |
| **Notifications** | Service worker mobile pour notifier le technicien lorsqu’un service est en cours, avec actions rapides depuis l’écran verrouillé. |
| **Exports** | CSV Clients/Leads/Services incluant contacts multiples, totaux, TVA et contexte d’engagement. |

## Prérequis

- Node.js **18+**
- npm **9+** (fourni avec Node 18)
- Python **3.11+** (pour FastAPI)
- Accès à un serveur SMTP (pour l’envoi d’e-mails) et, optionnellement, à Google Workspace pour la synchro planning.

## Installation & lancement locaux

1. **Installer les dépendances front-end**
   ```bash
   npm install
   npm run dev
   ```
   L’interface desktop est servie sur `http://localhost:5173`. L’interface mobile est accessible via `http://localhost:5173/?ui=mobile` ou automatiquement sur un viewport < 768px.

2. **Démarrer l’API FastAPI**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate   # Windows : .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload
   ```
   L’API répond sur `http://localhost:8000` (documentation interactive sur `/docs`).

3. **Tester les fonctions serverless** (optionnel)
   ```bash
   npm install -g vercel
   vercel dev
   ```
   Cette commande réplique l’environnement Vercel (fonctions `api/*.ts`).

## Variables d’environnement

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | URL de l’API FastAPI en local (si absent, le front appelle les fonctions Vercel `/api/*`). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Paramètres SMTP pour l’envoi de devis/factures. |
| `CALENDAR_ID_<TECHNICIEN>` | Identifiants Google Calendar synchronisés avec le planning (ex. `CALENDAR_ID_ADRIEN`). |
| `GOOGLE_SA_<TECHNICIEN>_JSON` | JSON du compte de service Google autorisé à lire le calendrier correspondant. |
| `VERCEL_URL` (déploiement) | Utilisé par certaines redirections/URLs absolues. |

Les variables Google et SMTP doivent être configurées dans le dashboard Vercel (ou via un `.env` local) sans jamais exposer de secrets en clair dans le dépôt.

## Données de démonstration

- Profil par défaut : `adrien / test`.
- Clients, leads, services, prestations, statistiques et documents sont générés à chaud via le store front-end pour simplifier la prise en main.
- Le planning mobile affiche uniquement les services assignés au technicien connecté, filtrés sur la journée courante ; la vue planifiée couvre 7 jours.

## Commandes utiles

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre le front-end Vite avec hot reload. |
| `npm run build` | Compile le front-end pour la production (utilisé par Vercel). |
| `npm run preview` | Servez le build optimisé localement. |
| `uvicorn app.main:app --reload` | Lance l’API FastAPI en mode dev. |

## Déploiement sur Vercel

- `vercel.json` pilote l’installation (`npm install`), le build (`npm run vercel-build`) et publie le dossier `dist` généré depuis `frontend`.
- Le dossier `frontend/dist/` est régénéré à chaque build Vite ; il n’est plus versionné pour éviter toute divergence entre l’artefact et le code source.
- Les routes `api/**/*.ts` sont traitées comme fonctions serverless (Google Calendar, e-mails) en Node 18.
- Toutes les routes front (`/*`) sont réécrites vers `index.html` pour supporter le routing React.
- Pour reproduire le build Vercel en local :
  ```bash
  npm install --workspaces --include-workspace-root
  npm run vercel-build
  ```

## Contributions & bonnes pratiques

- Respecter la palette sobre (tokens CSS) et la typographie compacte.
- Préserver la séparation desktop/mobile : toute nouvelle fonctionnalité mobile doit rester derrière l’enveloppe `?ui=mobile` sans casser l’expérience bureautique.
- Lors de l’ajout d’intégrations externes, centraliser les appels dans `frontend/src/lib` ou `api/` pour simplifier la maintenance et la configuration.

---

Ce README constitue le point d’entrée du projet et doit être tenu à jour à chaque évolution majeure (nouvelles intégrations, flux métier, procédures d’installation). N’hésitez pas à documenter les cas d’usage clés supplémentaires au fur et à mesure du déploiement terrain.
