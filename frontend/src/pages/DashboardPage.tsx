import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  format,
  isWithinInterval,
  startOfWeek,
  subDays,
} from 'date-fns';
import { fr } from 'date-fns/locale';

import { useAppData } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';
import { BRAND_NAME } from '../lib/branding';

const PrestationsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M20 6 10 16l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 20h12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RevenueIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M12 3v18m4-14H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DurationIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const QuoteIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M6 4h9l3 3v13H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 4v3h3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ServicesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M7 7.5V6a2 2 0 0 1 2-2h2m4 4V6a2 2 0 0 0-2-2h-2M4 10h16"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 10v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" />
  </svg>
);

const PurchasesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M6 7h12l-1 11H7L6 7Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DocumentsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M8 4h6l4 4v12H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LeadsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M5 12h6l-2.5 3m2.5-3-2.5-3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5h7v14h-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClientsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M4.5 19a4.5 4.5 0 0 1 9 0M14.5 19a3.5 3.5 0 0 1 7 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlanningIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
  </svg>
);

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M5 20V10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 20V4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M19 20v-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a1.5 1.5 0 0 0 1.06-2.56l-1.12-1.12a1.5 1.5 0 0 1-.35-1.57l.43-1.28A1.5 1.5 0 0 0 18.1 3l-1.28.43a1.5 1.5 0 0 1-1.57-.35L14.13 1.96A1.5 1.5 0 0 0 11.57 3v1.5a1.5 1.5 0 0 1-1.06 1.42l-1.28.43a1.5 1.5 0 0 0-.93 1.93l.43 1.28a1.5 1.5 0 0 1-.35 1.57l-1.12 1.12A1.5 1.5 0 0 0 9 15h1.5a1.5 1.5 0 0 1 1.42 1.06l.43 1.28a1.5 1.5 0 0 0 1.93.93l1.28-.43a1.5 1.5 0 0 1 1.57.35l1.12 1.12A1.5 1.5 0 0 0 21 18.1l-.43-1.28a1.5 1.5 0 0 1 .35-1.57l1.12-1.12A1.5 1.5 0 0 0 19.5 12Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M7 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path d="M17 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    <path d="M3 21v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 21v-1a4 4 0 0 0-3-3.87" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconSend = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="m3 10 14-7-4 7 4 7-14-7Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPhone = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M6 3h-.5a1.5 1.5 0 0 0-1.5 1.6 14.5 14.5 0 0 0 12.4 12.4A1.5 1.5 0 0 0 17 15.5V15a2 2 0 0 0-1.7-2L12.5 12a1 1 0 0 0-1 .3L10 13a11 11 0 0 1-3-3l0 0 1-1.5a1 1 0 0 0 .1-1l-1-2.8A2 2 0 0 0 6 3Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconMail = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M3 5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    <path d="m3 6 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const followUpThresholdDays = 7;

const DashboardPage = () => {
  const {
    engagements,
    computeEngagementTotals,
    leads,
    recordEngagementSend,
    updateEngagement,
    clients,
    services,
    recordLeadActivity,
    updateLead,
  } = useAppData();

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  const completedEngagements = engagements.filter((engagement) => engagement.status === 'réalisé');
  const totalPrestations = completedEngagements.length;
  const totalRevenue = completedEngagements.reduce((sum, engagement) => {
    const totals = computeEngagementTotals(engagement);
    return sum + totals.price + totals.surcharge;
  }, 0);
  const totalDurationMinutes = completedEngagements.reduce((sum, engagement) => {
    const totals = computeEngagementTotals(engagement);
    return sum + totals.duration;
  }, 0);

  const quotesToSend = engagements
    .filter(
      (engagement) =>
        engagement.kind === 'devis' &&
        engagement.status !== 'envoyé' &&
        engagement.status !== 'annulé' &&
        engagement.sendHistory.length === 0
    )
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .map((engagement) => {
      const totals = computeEngagementTotals(engagement);
      const client = clientsById.get(engagement.clientId);
      const service = servicesById.get(engagement.serviceId);
      return {
        id: engagement.id,
        clientName: client?.name ?? 'Client',
        serviceName: service?.name ?? 'Prestation',
        scheduledAt: engagement.scheduledAt,
        amount: totals.price + totals.surcharge,
        contactIds: engagement.contactIds,
      };
    });

  const pendingQuotesTotal = quotesToSend.reduce((sum, quote) => sum + quote.amount, 0);

  const today = new Date();
  const thresholdDate = subDays(today, followUpThresholdDays);

  const leadsToContact = leads
    .filter((lead) => {
      const lastContactDate = lead.lastContact ? new Date(lead.lastContact) : null;
      const needsFollowUp =
        !lastContactDate || differenceInCalendarDays(today, lastContactDate) >= followUpThresholdDays;
      const nextStepDate = lead.nextStepDate ? new Date(lead.nextStepDate) : null;
      const nextStepPassed = nextStepDate ? nextStepDate < today : false;
      return lead.status === 'À contacter' || needsFollowUp || nextStepPassed;
    })
    .sort((a, b) => {
      const priority = (leadStatus: string | undefined) => (leadStatus === 'À contacter' ? 0 : 1);
      const diff = priority(a.status) - priority(b.status);
      if (diff !== 0) {
        return diff;
      }
      const aDate = a.lastContact ? new Date(a.lastContact) : thresholdDate;
      const bDate = b.lastContact ? new Date(b.lastContact) : thresholdDate;
      return aDate.getTime() - bDate.getTime();
    })
    .map((lead) => ({
      id: lead.id,
      company: lead.company || lead.contact || 'Lead',
      contact: lead.contact,
      phone: lead.phone,
      email: lead.email,
      lastContact: lead.lastContact,
      nextStepDate: lead.nextStepDate,
    }));

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  const weeklyEngagements = engagements.filter((engagement) => {
    if (engagement.status === 'annulé') {
      return false;
    }
    const start = new Date(engagement.scheduledAt);
    return isWithinInterval(start, { start: weekStart, end: weekEnd });
  });

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const isoDate = format(date, 'yyyy-MM-dd');
    const events = weeklyEngagements
      .filter((engagement) => engagement.scheduledAt.startsWith(isoDate))
      .map((engagement) => {
        const start = new Date(engagement.scheduledAt);
        const totals = computeEngagementTotals(engagement);
        const end = addMinutes(start, totals.duration);
        const client = clientsById.get(engagement.clientId);
        const service = servicesById.get(engagement.serviceId);
        return {
          id: engagement.id,
          clientName: client?.name ?? 'Client',
          serviceName: service?.name ?? 'Prestation',
          timeRange: `${format(start, 'HH:mm')} – ${format(end, 'HH:mm')}`,
        };
      });
    return {
      date,
      label: format(date, 'EEEE', { locale: fr }),
      shortLabel: format(date, 'd MMM', { locale: fr }),
      events,
    };
  });

  const handleSendQuote = (engagementId: string) => {
    const engagement = engagements.find((item) => item.id === engagementId);
    if (!engagement) {
      return;
    }
    if (engagement.contactIds.length > 0) {
      recordEngagementSend(engagementId, { contactIds: engagement.contactIds });
    }
    updateEngagement(engagementId, { status: 'envoyé' });
  };

  const handleCallLead = (leadId: string, phone: string) => {
    recordLeadActivity(leadId, { type: 'call', content: 'Appel depuis le tableau de bord' });
    updateLead(leadId, { lastContact: new Date().toISOString() });
    if (typeof window !== 'undefined') {
      window.open(`tel:${phone}`, '_self');
    }
  };

  const handleEmailLead = (leadId: string, email: string) => {
    updateLead(leadId, { lastContact: new Date().toISOString() });
    if (typeof window !== 'undefined') {
      window.open(`mailto:${email}`, '_self');
    }
  };

  const kpiCards = [
    {
      label: 'Prestations totales',
      value: new Intl.NumberFormat('fr-FR').format(totalPrestations),
      description: 'Interventions finalisées',
      icon: <PrestationsIcon />,
    },
    {
      label: 'Chiffre d’affaires total',
      value: formatCurrency(totalRevenue),
      description: 'Prestations réalisées',
      icon: <RevenueIcon />,
    },
    {
      label: 'Durée totale',
      value: formatDuration(totalDurationMinutes),
      description: 'Temps passé en intervention',
      icon: <DurationIcon />,
    },
    {
      label: 'Devis en attente',
      value: new Intl.NumberFormat('fr-FR').format(quotesToSend.length),
      description: `${formatCurrency(pendingQuotesTotal)} à relancer`,
      icon: <QuoteIcon />,
    },
  ];

  const quickLinks = [
    {
      label: 'Services',
      to: '/service',
      description: 'Construire une prestation',
      icon: <ServicesIcon />,
    },
    {
      label: 'Achats',
      to: '/achats',
      description: 'Suivi des dépenses',
      icon: <PurchasesIcon />,
    },
    {
      label: 'Documents',
      to: '/documents',
      description: 'Bibliothèque et modèles',
      icon: <DocumentsIcon />,
    },
    {
      label: 'Leads',
      to: '/lead',
      description: 'Relancer vos prospects',
      icon: <LeadsIcon />,
    },
    {
      label: 'Clients',
      to: '/clients',
      description: 'Fiches et historiques',
      icon: <ClientsIcon />,
    },
    {
      label: 'Planning',
      to: '/planning',
      description: 'Vue hebdomadaire complète',
      icon: <PlanningIcon />,
    },
    {
      label: 'Statistiques',
      to: '/stats',
      description: 'Indicateurs détaillés',
      icon: <StatsIcon />,
    },
    {
      label: 'Paramètres',
      to: '/parametres',
      description: 'Personnaliser Wash&Go',
      icon: <SettingsIcon />,
    },
    {
      label: 'Utilisateurs',
      to: '/parametres/utilisateurs',
      description: 'Gérer les accès équipe',
      icon: <UsersIcon />,
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Vue d’ensemble</p>
          <h1 className="text-3xl font-semibold text-text">Tableau de bord</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-muted">
          Surveillez vos indicateurs clés et accédez rapidement aux modules essentiels de {BRAND_NAME}.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-text">Accès rapides</h2>
            <p className="mt-1 text-sm text-muted">Retrouvez vos espaces de travail en un clic.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:mx-auto lg:max-w-5xl">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="quick-link group flex h-full flex-col gap-3 px-3.5 py-4 text-left focus-visible:outline-none"
            >
              <span className="quick-link__icon">{link.icon}</span>
              <div className="space-y-1">
                <p className="quick-link__label text-sm font-semibold">{link.label}</p>
                <p className="text-xs text-muted">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text">Chiffres clés</h2>
          <p className="mt-1 text-sm text-muted">Suivez vos indicateurs consolidés.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-primary">{card.value}</p>
                </div>
                <span className="text-muted">{card.icon}</span>
              </div>
              <p className="mt-2 text-xs text-muted">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">À traiter</h2>
            <p className="mt-1 text-sm text-muted">Vos actions prioritaires du moment.</p>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Devis non envoyés</h3>
            {quotesToSend.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                Tous les devis sont à jour.
              </p>
            ) : (
              <ul className="space-y-3">
                {quotesToSend.map((quote) => (
                  <li
                    key={quote.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{quote.clientName}</p>
                      <p className="text-xs text-muted">
                        {quote.serviceName} · {format(new Date(quote.scheduledAt), 'd MMM', { locale: fr })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-text">{formatCurrency(quote.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleSendQuote(quote.id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        style={{ color: 'var(--inverse-text)' }}
                      >
                        <IconSend />
                        Envoyer
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Prospects à contacter</h3>
            {leadsToContact.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
                Aucun prospect en attente de relance.
              </p>
            ) : (
              <ul className="space-y-3">
                {leadsToContact.map((lead) => (
                  <li
                    key={lead.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-text">{lead.company}</p>
                      <p className="text-xs text-muted">
                        {lead.contact ? `${lead.contact} · ` : ''}
                        {lead.lastContact
                          ? `Dernier contact le ${format(new Date(lead.lastContact), 'd MMM', { locale: fr })}`
                          : 'Aucun contact enregistré'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCallLead(lead.id, lead.phone)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <IconPhone />
                        Appeler
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEmailLead(lead.id, lead.email)}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        <IconMail />
                        Email
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">Planning de la semaine</h2>
            <p className="mt-1 text-sm text-muted">Vue synthétique des interventions du lundi au dimanche.</p>
          </div>
          <Link
            to="/planning"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            Ouvrir le planning
          </Link>
        </div>
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {weekDays.map((day) => (
              <div key={day.shortLabel} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-text">{day.label.charAt(0).toUpperCase() + day.label.slice(1)}</p>
                  <span className="text-xs text-muted">{day.shortLabel}</span>
                </div>
                {day.events.length === 0 ? (
                  <p className="mt-3 text-xs text-muted">Aucun rendez-vous.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {day.events.map((event) => (
                      <li key={event.id} className="rounded-lg border border-border bg-surface px-3 py-2">
                        <p className="text-sm font-medium text-text">{event.clientName}</p>
                        <p className="text-xs text-muted">{event.serviceName}</p>
                        <p className="text-xs text-muted">{event.timeRange}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
