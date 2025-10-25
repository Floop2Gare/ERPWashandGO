import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Vérifier toutes les variables d'environnement
    const envStatus = {
      supabase: {
        url: !!process.env.VITE_SUPABASE_URL,
        anonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
        urlValue: process.env.VITE_SUPABASE_URL || 'NON DÉFINIE',
        anonKeyValue: process.env.VITE_SUPABASE_ANON_KEY ? 'DÉFINIE' : 'NON DÉFINIE'
      },
      googleCalendar: {
        adrien: {
          serviceAccount: !!process.env.GOOGLE_SA_ADRIEN,
          calendarId: !!process.env.GOOGLE_CALENDAR_ID_ADRIEN,
          calendarIdValue: process.env.GOOGLE_CALENDAR_ID_ADRIEN || 'NON DÉFINIE'
        },
        clement: {
          serviceAccount: !!process.env.GOOGLE_SA_CLEMENT,
          calendarId: !!process.env.GOOGLE_CALENDAR_ID_CLEMENT,
          calendarIdValue: process.env.GOOGLE_CALENDAR_ID_CLEMENT || 'NON DÉFINIE'
        }
      },
      vercel: {
        url: process.env.VERCEL_URL || 'NON DÉFINIE',
        env: process.env.NODE_ENV || 'NON DÉFINIE'
      }
    };

    // Tester le parsing des Service Accounts
    const serviceAccountTests = {
      adrien: {
        defined: !!process.env.GOOGLE_SA_ADRIEN,
        valid: false,
        error: null
      },
      clement: {
        defined: !!process.env.GOOGLE_SA_CLEMENT,
        valid: false,
        error: null
      }
    };

    if (process.env.GOOGLE_SA_ADRIEN) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_SA_ADRIEN);
        serviceAccountTests.adrien.valid = true;
        serviceAccountTests.adrien.type = parsed.type || 'N/A';
      } catch (error) {
        serviceAccountTests.adrien.error = error instanceof Error ? error.message : 'Erreur inconnue';
      }
    }

    if (process.env.GOOGLE_SA_CLEMENT) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_SA_CLEMENT);
        serviceAccountTests.clement.valid = true;
        serviceAccountTests.clement.type = parsed.type || 'N/A';
      } catch (error) {
        serviceAccountTests.clement.error = error instanceof Error ? error.message : 'Erreur inconnue';
      }
    }

    return res.status(200).json({ 
      status: 'success',
      message: 'Variables d\'environnement vérifiées',
      environment: envStatus,
      serviceAccountTests,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'internal_server_error',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      timestamp: new Date().toISOString()
    });
  }
}

