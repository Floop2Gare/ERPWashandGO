# Configuration du Planning Google Calendar

## Variables d'environnement requises dans Vercel

Configurez les 4 variables suivantes dans **Settings > Environment Variables** de votre projet Vercel :

1. `CALENDAR_ID_ADRIEN` - ID du calendrier Google d'Adrien
2. `GOOGLE_SA_ADRIEN_JSON` - JSON du compte de service Google pour Adrien
3. `CALENDAR_ID_CLEMENT` - ID du calendrier Google de Clément
4. `GOOGLE_SA_CLEMENT_JSON` - JSON du compte de service Google pour Clément

⚠️ **Important** : Les variables sont déjà configurées dans Vercel. Contactez l'administrateur pour obtenir ces valeurs si nécessaire.

## Test de l'API

Une fois déployé, testez avec :
- https://erp-washand-go-frontend.vercel.app/api/planning-google
- https://erp-washand-go-frontend.vercel.app/api/planning-google?user=adrien
- https://erp-washand-go-frontend.vercel.app/api/planning-google?user=clement

## Accès

- Application : https://erp-washand-go-frontend.vercel.app
- Page Planning : https://erp-washand-go-frontend.vercel.app/planning
