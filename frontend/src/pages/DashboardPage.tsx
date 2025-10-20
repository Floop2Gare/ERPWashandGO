import { Link } from 'react-router-dom';

import { Card } from '../components/Card';
import { useAppData } from '../store/useAppData';
import { formatCurrency, formatDuration } from '../lib/format';
import { BRAND_NAME } from '../lib/branding';

const PrestationsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M20 6 10 16l-4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 20h12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RevenueIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M12 3v18m4-14H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DurationIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ServicesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path
      d="M7 7.5V6a2 2 0 0 1 2-2h2m4 4V6a2 2 0 0 0-2-2h-2M4 10h16"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M6 10v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7" />
  </svg>
);

const PurchasesIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M6 7h12l-1 11H7L6 7Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DocumentsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M8 4h6l4 4v12H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 4v4h4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LeadsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <path d="M5 12h6l-2.5 3m2.5-3-2.5-3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 5h7v14h-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClientsIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M4.5 19a4.5 4.5 0 0 1 9 0M14.5 19a3.5 3.5 0 0 1 7 0" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DashboardPage = () => {
  const { engagements, computeEngagementTotals } = useAppData();

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

  const kpiCards = [
    {
      label: 'Prestations totales réalisées',
      value: new Intl.NumberFormat('fr-FR').format(totalPrestations),
      icon: <PrestationsIcon />,
      accent: 'primary' as const,
    },
    {
      label: 'Chiffre d’affaires total',
      value: formatCurrency(totalRevenue),
      icon: <RevenueIcon />,
      accent: 'violet' as const,
    },
    {
      label: 'Durée totale de travail',
      value: formatDuration(totalDurationMinutes),
      icon: <DurationIcon />,
      accent: 'teal' as const,
    },
  ];

  const quickLinks = [
    {
      label: 'Services',
      to: '/service',
      description: 'Planifiez vos prestations',
      icon: <ServicesIcon />,
      accent: 'primary' as const,
    },
    {
      label: 'Achats',
      to: '/achats',
      description: 'Suivi des dépenses',
      icon: <PurchasesIcon />,
      accent: 'amber' as const,
    },
    {
      label: 'Documents',
      to: '/documents',
      description: 'Bibliothèque centralisée',
      icon: <DocumentsIcon />,
      accent: 'violet' as const,
    },
    {
      label: 'Leads',
      to: '/lead',
      description: 'Développez votre pipeline',
      icon: <LeadsIcon />,
      accent: 'teal' as const,
    },
    {
      label: 'Clients',
      to: '/clients',
      description: 'Gérez vos comptes',
      icon: <ClientsIcon />,
      accent: 'primary' as const,
    },
  ];

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Vue d’ensemble</p>
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Tableau de bord</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-300">
          Surveillez vos indicateurs clés et accédez rapidement aux modules essentiels de {BRAND_NAME}.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {kpiCards.map((card) => (
          <Card
            key={card.label}
            padding="lg"
            tone="accent"
            accent={card.accent}
            className="flex items-center gap-4"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white shadow-[0_12px_28px_rgba(10,23,55,0.3)] backdrop-blur-sm">
              {card.icon}
            </span>
            <div className="space-y-1">
              <p className="text-3xl font-semibold text-white">{card.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {card.label}
              </p>
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Accès rapides</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Retrouvez vos espaces de travail en un clic.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              data-accent={link.accent}
              className="quick-link group flex flex-col items-center gap-3 px-4 py-6 text-center text-slate-700 transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:text-slate-200"
            >
              <span className="quick-link__icon text-xl">
                {link.icon}
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{link.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-300">{link.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
