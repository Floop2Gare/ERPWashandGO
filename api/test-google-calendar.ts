import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Vérifier les variables d'environnement Google Calendar
    const googleSaAdrien = process.env.GOOGLE_SA_ADRIEN;
    const googleSaClement = process.env.GOOGLE_SA_CLEMENT;
    const googleCalendarIdAdrien = process.env.GOOGLE_CALENDAR_ID_ADRIEN;
    const googleCalendarIdClement = process.env.GOOGLE_CALENDAR_ID_CLEMENT;

    const configStatus = {
      adrien: {
        serviceAccount: !!googleSaAdrien,
        calendarId: !!googleCalendarIdAdrien,
        serviceAccountValid: false,
        calendarIdValue: googleCalendarIdAdrien
      },
      clement: {
        serviceAccount: !!googleSaClement,
        calendarId: !!googleCalendarIdClement,
        serviceAccountValid: false,
        calendarIdValue: googleCalendarIdClement
      }
    };

    // Tester le parsing des Service Accounts
    if (googleSaAdrien) {
      try {
        JSON.parse(googleSaAdrien);
        configStatus.adrien.serviceAccountValid = true;
      } catch (error) {
        configStatus.adrien.serviceAccountValid = false;
      }
    }

    if (googleSaClement) {
      try {
        JSON.parse(googleSaClement);
        configStatus.clement.serviceAccountValid = true;
      } catch (error) {
        configStatus.clement.serviceAccountValid = false;
      }
    }

    return res.status(200).json({ 
      status: 'success',
      message: 'Configuration Google Calendar vérifiée',
      config: configStatus,
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

