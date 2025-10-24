import './mobile.css';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { format as formatDateFn } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
  useAppData,
  type Client,
  type ClientContact,
  type CommercialDocumentStatus,
  type DocumentRecord,
  type Engagement,
  type EngagementStatus,
  type Service,
  type ServiceOption,
  type SupportType,
} from '../store/useAppData';
import { formatCurrency, formatDate, formatDateTime, formatDuration } from '../lib/format';
import { generateInvoicePdf } from '../lib/invoice';

const TIMER_STORAGE_KEY = 'washandgo-mobile-timer-state';

type MobileView = 'services' | 'create' | 'details' | 'timer' | 'invoice';

type TimerState = {
  engagementId: string;
  startedAt: number | null;
  elapsedBeforeMs: number;
  running: boolean;
};

const supportTypes: SupportType[] = ['Voiture', 'Canapé', 'Textile'];

type ServiceFilter = 'all' | 'upcoming' | 'done';

const statusLabels: Record<EngagementStatus, string> = {
  brouillon: 'Brouillon',
  envoyé: 'Envoyé',
  planifié: 'Planifié',
  réalisé: 'Réalisé',
  annulé: 'Annulé',
};

const statusIntents: Record<EngagementStatus, 'neutral' | 'info' | 'success' | 'warning'> = {
  brouillon: 'neutral',
  envoyé: 'info',
  planifié: 'info',
  réalisé: 'success',
  annulé: 'warning',
};

const getStatusIntent = (status: EngagementStatus) => statusIntents[status] ?? 'neutral';

const toClock = (elapsedMs: number) => {
  const safe = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const formatPart = (value: number) => value.toString().padStart(2, '0');
  return `${formatPart(hours)}:${formatPart(minutes)}:${formatPart(seconds)}`;
};

const getDefaultOptionIds = (service: Service | undefined) =>
  service ? service.options.filter((option) => option.active).map((option) => option.id) : [];

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const safeVatRate = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

const getNextInvoiceNumber = (engagements: Engagement[], referenceDate: Date) => {
  const monthToken = formatDateFn(referenceDate, 'yyyyMM');
  const prefix = `FAC-${monthToken}-`;
  const invoicePattern = /^FAC-(\d{6})-(\d{4})$/;
  const highestSequence = engagements.reduce((acc, engagement) => {
    if (!engagement.invoiceNumber) {
      return acc;
    }
    const match = invoicePattern.exec(engagement.invoiceNumber.trim());
    if (!match) {
      return acc;
    }
    const [, month, sequenceRaw] = match;
    if (month !== monthToken) {
      return acc;
    }
    const sequence = Number.parseInt(sequenceRaw, 10);
    if (Number.isNaN(sequence)) {
      return acc;
    }
    return Math.max(acc, sequence);
  }, 0);
  const nextSequence = (highestSequence + 1).toString().padStart(4, '0');
  return `${prefix}${nextSequence}`;
};

const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  const kiloBytes = bytes / 1024;
  if (kiloBytes < 1024) {
    return `${kiloBytes < 10 ? kiloBytes.toFixed(1) : Math.round(kiloBytes)} Ko`;
  }
  const megaBytes = kiloBytes / 1024;
  if (megaBytes < 1024) {
    return `${megaBytes < 10 ? megaBytes.toFixed(1) : Math.round(megaBytes)} Mo`;
  }
  const gigaBytes = megaBytes / 1024;
  return `${gigaBytes < 10 ? gigaBytes.toFixed(1) : Math.round(gigaBytes)} Go`;
};

const resolveDefaultContacts = (client: Client) => {
  const preferred = client.contacts.filter((contact) => contact.active && contact.isBillingDefault);
  if (preferred.length) {
    return unique(preferred.map((contact) => contact.id));
  }
  const active = client.contacts.filter((contact) => contact.active);
  if (active.length) {
    return unique(active.map((contact) => contact.id));
  }
  return [];
};

const formatListDate = (isoDate: string) => {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date inconnue';
  }
  return formatDateFn(parsed, 'd MMM yyyy', { locale: fr });
};

const isValidEmail = (value: string) =>
  /^(?:[\w.!#$%&'*+/=?^`{|}~-]+@(?:[\w-]+\.)+[\w-]{2,})$/.test(value.trim());

const MobileLoginView = ({ onLogin }: { onLogin: (username: string, password: string) => boolean }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const success = onLogin(username, password);
    if (!success) {
      setError('Identifiants invalides.');
      return;
    }
    setError(null);
  };

  return (
    <div className="mobile-app mobile-app--auth">
      <header className="mobile-app__header">
        <div className="mobile-app__brand">
          <div className="mobile-app__logo" aria-hidden="true">
            WG
          </div>
          <div>
            <p className="mobile-app__product">Wash&amp;Go</p>
            <p className="mobile-app__subtitle">Interface mobile</p>
          </div>
        </div>
      </header>
      <main className="mobile-app__main mobile-app__main--center">
        <form className="mobile-card mobile-card--auth" onSubmit={handleSubmit}>
          <h1>Connexion</h1>
          <label className="mobile-field">
            <span>Identifiant</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="mobile-field">
            <span>Mot de passe</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="mobile-feedback mobile-feedback--error">{error}</p> : null}
          <button type="submit" className="mobile-button mobile-button--primary">
            Se connecter
          </button>
        </form>
      </main>
      <footer className="mobile-app__footer">© {new Date().getFullYear()} Wash&amp;Go</footer>
    </div>
  );
};

const MobileTestPage = () => {
  const {
    currentUserId,
    login,
    logout,
    userProfile,
    engagements,
    clients,
    services,
    companies,
    activeCompanyId,
    addEngagement,
    updateEngagement,
    computeEngagementTotals,
    vatEnabled,
    vatRate,
    documents,
    addDocument,
    updateDocument,
    theme,
    toggleTheme,
  } = useAppData();

  const [view, setView] = useState<MobileView>('services');
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('all');
  const [createClientId, setCreateClientId] = useState('');
  const [createServiceId, setCreateServiceId] = useState('');
  const [createOptionIds, setCreateOptionIds] = useState<string[]>([]);
  const [createSupportType, setCreateSupportType] = useState<SupportType>('Voiture');
  const [createSupportDetail, setCreateSupportDetail] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreatingService, setIsCreatingService] = useState(false);

  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);

  const [invoiceContactIds, setInvoiceContactIds] = useState<string[]>([]);
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceFeedback, setInvoiceFeedback] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const scheduleScrollTo = (id: string, delay = 60) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, delay);
  };

  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const documentsByEngagementNumber = useMemo(() => {
    const index = new Map<string, string>();
    documents.forEach((document) => {
      if (document.engagementId && document.number) {
        index.set(`${document.engagementId}:${document.number}`, document.id);
      }
    });
    return index;
  }, [documents]);

  const serviceEngagements = useMemo(
    () =>
      engagements
        .filter((engagement) => engagement.kind === 'service')
        .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [engagements]
  );

  const filteredServiceEngagements = useMemo(() => {
    if (serviceFilter === 'upcoming') {
      return serviceEngagements.filter((engagement) => engagement.status === 'planifié' || engagement.status === 'envoyé');
    }
    if (serviceFilter === 'done') {
      return serviceEngagements.filter((engagement) => engagement.status === 'réalisé');
    }
    return serviceEngagements;
  }, [serviceEngagements, serviceFilter]);

  const serviceMetrics = useMemo(() => {
    const planned = serviceEngagements.filter((engagement) => engagement.status === 'planifié').length;
    const inProgress = serviceEngagements.filter((engagement) => engagement.status === 'envoyé').length;
    const completed = serviceEngagements.filter((engagement) => engagement.status === 'réalisé').length;
    return {
      total: serviceEngagements.length,
      planned,
      inProgress,
      completed,
    };
  }, [serviceEngagements]);

  const filterCounts = useMemo(
    () => ({
      all: serviceMetrics.total,
      upcoming: serviceMetrics.planned + serviceMetrics.inProgress,
      done: serviceMetrics.completed,
    }),
    [serviceMetrics]
  );

  const selectedEngagement = selectedEngagementId
    ? engagements.find((engagement) => engagement.id === selectedEngagementId) ?? null
    : null;

  const nextRunnableEngagement = useMemo(
    () =>
      serviceEngagements.find(
        (engagement) => engagement.status === 'planifié' || engagement.status === 'envoyé'
      ) ?? null,
    [serviceEngagements]
  );

  useEffect(() => {
    if (!currentUserId || typeof window === 'undefined') {
      return;
    }
    try {
      const raw = window.localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<TimerState> | null;
      if (!parsed || typeof parsed.engagementId !== 'string') {
        return;
      }
      const restored: TimerState = {
        engagementId: parsed.engagementId,
        startedAt: typeof parsed.startedAt === 'number' ? parsed.startedAt : null,
        elapsedBeforeMs: typeof parsed.elapsedBeforeMs === 'number' ? parsed.elapsedBeforeMs : 0,
        running: Boolean(parsed.running),
      };
      setTimerState(restored);
      setSelectedEngagementId(restored.engagementId);
      setView('timer');
    } catch (error) {
      console.warn('[Wash&Go] Impossible de restaurer le minuteur mobile', error);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!timerState) {
      window.localStorage.removeItem(TIMER_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  useEffect(() => {
    if (!timerState) {
      setDisplayElapsed(0);
      return;
    }
    const update = () => {
      const base = timerState.elapsedBeforeMs;
      const runningContribution = timerState.running && timerState.startedAt ? Date.now() - timerState.startedAt : 0;
      setDisplayElapsed(base + runningContribution);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [timerState]);

  useEffect(() => {
    if (view !== 'create') {
      return;
    }
    const firstClient = clients[0]?.id ?? '';
    const firstService = services[0]?.id ?? '';
    setCreateClientId(firstClient);
    setCreateServiceId(firstService);
    setCreateOptionIds(getDefaultOptionIds(servicesById.get(firstService)));
    setCreateSupportType('Voiture');
    setCreateSupportDetail('');
    setCreateError(null);
  }, [clients, services, servicesById, view]);

  useEffect(() => {
    if (view !== 'invoice' || !selectedEngagement) {
      return;
    }
    const client = clientsById.get(selectedEngagement.clientId);
    if (!client) {
      setInvoiceContactIds([]);
      setInvoiceEmail('');
      return;
    }
    const defaults = selectedEngagement.contactIds.length
      ? selectedEngagement.contactIds
      : resolveDefaultContacts(client);
    setInvoiceContactIds(unique(defaults));
    setInvoiceEmail(client.email ?? '');
    setInvoiceFeedback(null);
  }, [clientsById, selectedEngagement, view]);

  const handleLogin = (username: string, password: string) => login(username, password);

  const handleStartTimer = (engagement: Engagement) => {
    setTimerState({
      engagementId: engagement.id,
      startedAt: Date.now(),
      elapsedBeforeMs: engagement.mobileDurationMinutes ? engagement.mobileDurationMinutes * 60000 : 0,
      running: true,
    });
    setShowCommentForm(false);
    setCommentDraft('');
    setView('timer');
  };

  const handlePauseTimer = () => {
    if (!timerState || !timerState.running || !timerState.startedAt) {
      return;
    }
    const now = Date.now();
    const accumulated = timerState.elapsedBeforeMs + (now - timerState.startedAt);
    setTimerState({
      engagementId: timerState.engagementId,
      startedAt: null,
      elapsedBeforeMs: accumulated,
      running: false,
    });
  };

  const handleResumeTimer = () => {
    if (!timerState || timerState.running) {
      return;
    }
    setTimerState({
      engagementId: timerState.engagementId,
      startedAt: Date.now(),
      elapsedBeforeMs: timerState.elapsedBeforeMs,
      running: true,
    });
  };

  const clearTimer = () => {
    setTimerState(null);
    setDisplayElapsed(0);
    setShowCommentForm(false);
    setCommentDraft('');
  };

  const handleCompleteTimer = () => {
    if (!timerState) {
      return;
    }
    const totalMs =
      timerState.elapsedBeforeMs + (timerState.running && timerState.startedAt ? Date.now() - timerState.startedAt : 0);
    setTimerState({
      engagementId: timerState.engagementId,
      startedAt: null,
      elapsedBeforeMs: totalMs,
      running: false,
    });
    setShowCommentForm(true);
  };

  const handleValidateTimer = (engagement: Engagement) => {
    if (!timerState) {
      return;
    }
    const totalMs = timerState.elapsedBeforeMs + (timerState.running && timerState.startedAt ? Date.now() - timerState.startedAt : 0);
    const minutes = Math.max(1, Math.round(totalMs / 60000));
    const comment = commentDraft.trim();
    updateEngagement(engagement.id, {
      status: 'réalisé',
      mobileDurationMinutes: minutes,
      mobileCompletionComment: comment.length ? comment : null,
    });
    clearTimer();
    setView('details');
  };

  const handleExitTimerView = () => {
    setShowCommentForm(false);
    setCommentDraft('');
    setView('details');
  };

  if (!currentUserId) {
    return <MobileLoginView onLogin={handleLogin} />;
  }

  const activeCompany = activeCompanyId
    ? companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null
    : companies[0] ?? null;

  const now = new Date();
  const todaysLabelRaw = formatDateFn(now, 'EEEE d MMMM', { locale: fr });
  const todaysLabel = todaysLabelRaw.charAt(0).toUpperCase() + todaysLabelRaw.slice(1);
  const timeLabel = formatDateFn(now, 'HH:mm');
  const heroGreeting = userProfile.firstName ? `Bonjour ${userProfile.firstName}` : 'Bonjour';
  const heroSubtitle = activeCompany ? `Équipe ${activeCompany.name}` : 'Wash&Go terrain';
  const isDarkTheme = theme === 'dark';
  const themeToggleGlyph = isDarkTheme ? '☾' : '☀︎';
  const themeToggleLabel = isDarkTheme ? 'Basculer en mode clair' : 'Basculer en mode sombre';
  const canQuickStart = Boolean(
    selectedEngagement ?? nextRunnableEngagement ?? timerState ?? serviceEngagements.length
  );

  const handleQuickCreateTap = () => {
    if (view !== 'create') {
      setView('create');
      scheduleScrollTo('mobile-create-section');
      return;
    }
    scheduleScrollTo('mobile-create-section');
  };

  const handleQuickStartTap = () => {
    const target = selectedEngagement ?? nextRunnableEngagement ?? filteredServiceEngagements[0] ?? null;
    if (!target) {
      setView('services');
      scheduleScrollTo('mobile-services-section');
      return;
    }
    if (timerState && timerState.engagementId === target.id) {
      setView('timer');
      scheduleScrollTo('mobile-timer-section');
      return;
    }
    setSelectedEngagementId(target.id);
    setView('details');
    scheduleScrollTo('mobile-details-section');
  };

  const handleCreateService = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    const client = clientsById.get(createClientId);
    if (!client) {
      setCreateError('Client introuvable.');
      return;
    }
    const service = servicesById.get(createServiceId);
    if (!service) {
      setCreateError('Service introuvable.');
      return;
    }
    const company = activeCompany;
    if (!company) {
      setCreateError('Aucune entreprise active définie.');
      return;
    }
    const selectedOptions = createOptionIds.length ? createOptionIds : getDefaultOptionIds(service);
    if (!selectedOptions.length) {
      setCreateError('Sélectionnez au moins une prestation.');
      return;
    }
    setIsCreatingService(true);
    try {
      const contactIds = resolveDefaultContacts(client);
      const engagement = addEngagement({
        clientId: client.id,
        serviceId: service.id,
        optionIds: selectedOptions,
        optionOverrides: {},
        scheduledAt: new Date().toISOString(),
        status: 'planifié',
        companyId: company.id,
        kind: 'service',
        supportType: createSupportType,
        supportDetail: createSupportDetail.trim(),
        additionalCharge: 0,
        contactIds,
        sendHistory: [],
        invoiceNumber: null,
        invoiceVatEnabled: null,
        quoteNumber: null,
        quoteStatus: null,
        mobileDurationMinutes: null,
        mobileCompletionComment: null,
      });
      setSelectedEngagementId(engagement.id);
      setView('details');
    } finally {
      setIsCreatingService(false);
    }
  };

  const handleToggleOption = (optionId: string) => {
    setCreateOptionIds((previous) =>
      previous.includes(optionId) ? previous.filter((id) => id !== optionId) : [...previous, optionId]
    );
  };

  const handleNavigateBack = () => {
    setView('services');
    setSelectedEngagementId(null);
  };

  const renderServices = () => {
    const filterOptions: { key: ServiceFilter; label: string }[] = [
      { key: 'all', label: 'Tous' },
      { key: 'upcoming', label: 'À venir' },
      { key: 'done', label: 'Terminés' },
    ];

    return (
      <section className="mobile-section mobile-section--stacked" id="mobile-services-section">
        <div className="mobile-intro">
          <div className="mobile-intro__heading">
            <p className="mobile-intro__eyebrow">{todaysLabel}</p>
            <h1 className="mobile-intro__title">{heroGreeting}</h1>
            <p className="mobile-intro__subtitle">{heroSubtitle}</p>
          </div>
          <div className="mobile-intro__actions">
            <span className="mobile-intro__clock" aria-label={`Heure actuelle ${timeLabel}`}>
              {timeLabel}
            </span>
            <button
              type="button"
              className="mobile-button mobile-button--primary mobile-intro__cta"
              onClick={() => setView('create')}
            >
              Nouveau service
            </button>
          </div>
        </div>
        <div className="mobile-filter-row">
          <div className="mobile-filter-row__chips" role="tablist" aria-label="Filtrer les services">
            {filterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                className={`mobile-filter-button${serviceFilter === option.key ? ' mobile-filter-button--active' : ''}`}
                aria-selected={serviceFilter === option.key}
                onClick={() => setServiceFilter(option.key)}
              >
                <span>{option.label}</span>
                <span className="mobile-filter-button__count">{filterCounts[option.key]}</span>
              </button>
            ))}
          </div>
          <span className="mobile-filter-row__count">
            {filterCounts[serviceFilter]} résultat{filterCounts[serviceFilter] > 1 ? 's' : ''}
          </span>
        </div>
        <div className="mobile-service-list mobile-service-list--simple">
          {filteredServiceEngagements.map((engagement) => {
            const client = clientsById.get(engagement.clientId);
            const service = servicesById.get(engagement.serviceId);
            const label = service ? service.name : 'Service inconnu';
            const clientLabel = client ? client.name : 'Client inconnu';
            const optionsCount = engagement.optionIds.length;
            const statusIntent = getStatusIntent(engagement.status);
            const supportLabel = engagement.supportDetail
              ? `${engagement.supportType} · ${engagement.supportDetail}`
              : engagement.supportType;
            return (
              <button
                key={engagement.id}
                type="button"
                className={`mobile-service-card mobile-service-card--${statusIntent}`}
                onClick={() => {
                  setSelectedEngagementId(engagement.id);
                  setView('details');
                }}
              >
                <div className="mobile-service-card__line">
                  <p className="mobile-service-card__client">{clientLabel}</p>
                  <span className={`mobile-status mobile-status--${statusIntent}`}>
                    {statusLabels[engagement.status]}
                  </span>
                </div>
                <p className="mobile-service-card__title">{label}</p>
                <div className="mobile-service-card__details">
                  <span>{formatListDate(engagement.scheduledAt)}</span>
                  <span>
                    {optionsCount} prestation{optionsCount > 1 ? 's' : ''}
                  </span>
                </div>
                <p className="mobile-service-card__note">{supportLabel}</p>
              </button>
            );
          })}
          {!filteredServiceEngagements.length ? (
            <div className="mobile-card mobile-card--empty">
              <h2>Aucun service</h2>
              <p>Adaptez les filtres ou créez votre première intervention.</p>
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  const renderCreate = () => {
    const client = clientsById.get(createClientId);
    const service = servicesById.get(createServiceId);
    const options: ServiceOption[] = service ? service.options : [];

    return (
      <section className="mobile-section" id="mobile-create-section">
        <div className="mobile-section__header mobile-section__header--split">
          <button type="button" className="mobile-button mobile-button--ghost" onClick={() => setView('services')}>
            Retour
          </button>
          <h1>Nouveau service</h1>
        </div>
        <p className="mobile-section__subtitle mobile-section__subtitle--soft">
          Planifiez une intervention terrain en sélectionnant le client, le service catalogue et les prestations
          associées.
        </p>
        <form className="mobile-card mobile-card--form" onSubmit={handleCreateService}>
          <div className="mobile-card__header">
            <div className="mobile-card__title-block">
              <p className="mobile-card__eyebrow">Informations</p>
              <h2 className="mobile-card__title">Détails de la mission</h2>
              <p className="mobile-card__subtitle">Choisissez le client et le service à planifier.</p>
            </div>
          </div>
          <div className="mobile-form-grid">
            <label className="mobile-field">
              <span>Client</span>
              <select value={createClientId} onChange={(event) => setCreateClientId(event.target.value)}>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mobile-field">
              <span>Service catalogue</span>
              <select
                value={createServiceId}
                onChange={(event) => {
                  const nextId = event.target.value;
                  setCreateServiceId(nextId);
                  setCreateOptionIds(getDefaultOptionIds(servicesById.get(nextId)));
                }}
              >
                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mobile-card__section">
            <div className="mobile-section__header mobile-section__header--compact">
              <h3>Prestations incluses</h3>
              <span className="mobile-section__subtitle">
                {options.length ? `${options.length} disponible${options.length > 1 ? 's' : ''}` : 'Aucune prestation active'}
              </span>
            </div>
            <div className="mobile-checkbox-grid">
              {options.map((option) => (
                <label
                  key={option.id}
                  className={`mobile-checkbox-tile${!option.active ? ' mobile-checkbox-tile--disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={createOptionIds.includes(option.id)}
                    onChange={() => handleToggleOption(option.id)}
                    disabled={option.active === false}
                  />
                  <div>
                    <span className="mobile-checkbox-tile__label">{option.label}</span>
                    <span className="mobile-checkbox-tile__meta">
                      {formatDuration(option.defaultDurationMin)} · {formatCurrency(option.unitPriceHT)} HT
                    </span>
                  </div>
                </label>
              ))}
              {!options.length ? (
                <p className="mobile-prestation__empty">Aucune prestation disponible pour ce service.</p>
              ) : null}
            </div>
          </div>
          <div className="mobile-form-grid mobile-form-grid--two">
            <label className="mobile-field">
              <span>Type de support</span>
              <select
                value={createSupportType}
                onChange={(event) => setCreateSupportType(event.target.value as SupportType)}
              >
                {supportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="mobile-field">
              <span>Détail du support</span>
              <input
                type="text"
                value={createSupportDetail}
                placeholder="Ex. SUV hybride"
                onChange={(event) => setCreateSupportDetail(event.target.value)}
              />
            </label>
          </div>
          {createError ? <p className="mobile-feedback mobile-feedback--error">{createError}</p> : null}
          <div className="mobile-card__footer">
            <button type="submit" className="mobile-button mobile-button--primary" disabled={isCreatingService}>
              {isCreatingService ? 'Enregistrement…' : 'Créer le service'}
            </button>
          </div>
        </form>
        {client ? (
          <aside className="mobile-card mobile-card--info">
            <div className="mobile-card__title-block">
              <p className="mobile-card__eyebrow">Contacts</p>
              <h2 className="mobile-card__title">Personnes à prévenir</h2>
            </div>
            <ul className="mobile-info-list">
              {client.contacts.map((contact) => (
                <li key={contact.id}>
                  <span className="mobile-info-list__name">
                    {contact.firstName} {contact.lastName}
                  </span>
                  <span className="mobile-info-list__meta">{contact.email || 'Email manquant'}</span>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </section>
    );
  };

  const renderDetails = (engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    const service = servicesById.get(engagement.serviceId);
    const serviceLabel = service ? service.name : 'Service inconnu';
    const clientLabel = client ? client.name : 'Client introuvable';
    const options = service ? service.options.filter((option) => engagement.optionIds.includes(option.id)) : [];
    const totals = computeEngagementTotals(engagement);
    const vatPercent = safeVatRate(vatRate);
    const vatMultiplier = vatPercent / 100;
    const vatEnabledForInvoice = engagement.invoiceVatEnabled ?? (activeCompany?.vatEnabled ?? vatEnabled);
    const subtotal = totals.price + totals.surcharge;
    const vatAmount = vatEnabledForInvoice ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
    const totalTtc = vatEnabledForInvoice ? subtotal + vatAmount : subtotal;
    const timerRunningElsewhere = !!timerState && timerState.engagementId !== engagement.id;
    const isCurrentServiceTiming = timerState && timerState.engagementId === engagement.id;
    const timerButtonLabel = timerRunningElsewhere
      ? 'Minuteur en cours ailleurs'
      : isCurrentServiceTiming
      ? timerState?.running
        ? 'Voir le minuteur'
        : 'Reprendre le minuteur'
      : 'Démarrer le service';
    const statusIntent = getStatusIntent(engagement.status);

    return (
      <section className="mobile-section" id="mobile-details-section">
        <div className="mobile-section__header mobile-section__header--split">
          <button type="button" className="mobile-button mobile-button--ghost" onClick={handleNavigateBack}>
            Retour
          </button>
          <h1>Détails du service</h1>
        </div>
        <div className="mobile-card mobile-card--details">
          <div className="mobile-card__header">
            <div className="mobile-card__title-block">
              <p className="mobile-card__eyebrow">Service</p>
              <h2 className="mobile-card__title">{serviceLabel}</h2>
              <p className="mobile-card__subtitle">{clientLabel}</p>
            </div>
            <span className={`mobile-status mobile-status--${statusIntent}`}>
              {statusLabels[engagement.status]}
            </span>
          </div>
          <div className="mobile-detail-grid">
            <div className="mobile-detail">
              <span className="mobile-detail__label">Client</span>
              <span className="mobile-detail__value">{clientLabel}</span>
            </div>
            <div className="mobile-detail">
              <span className="mobile-detail__label">Date planifiée</span>
              <span className="mobile-detail__value">{formatDateTime(engagement.scheduledAt)}</span>
            </div>
            <div className="mobile-detail">
              <span className="mobile-detail__label">Support</span>
              <span className="mobile-detail__value">
                {engagement.supportType}
                {engagement.supportDetail ? ` · ${engagement.supportDetail}` : ''}
              </span>
            </div>
            {engagement.mobileDurationMinutes ? (
              <div className="mobile-detail">
                <span className="mobile-detail__label">Durée enregistrée</span>
                <span className="mobile-detail__value">{formatDuration(engagement.mobileDurationMinutes)}</span>
              </div>
            ) : null}
          </div>
          {engagement.mobileCompletionComment ? (
            <div className="mobile-note">
              <span className="mobile-note__label">Commentaire</span>
              <p className="mobile-note__content">{engagement.mobileCompletionComment}</p>
            </div>
          ) : null}
          <div className="mobile-card__section">
            <div className="mobile-section__header mobile-section__header--compact">
              <h3>Prestations</h3>
              <span className="mobile-section__subtitle">
                {options.length ? `${options.length} élément${options.length > 1 ? 's' : ''}` : '—'}
              </span>
            </div>
            <ul className="mobile-prestation-list mobile-prestation-list--surface">
              {options.map((option) => (
                <li key={option.id}>
                  <div>
                    <span className="mobile-prestation__label">{option.label}</span>
                    <span className="mobile-prestation__meta">
                      {formatDuration(option.defaultDurationMin)} · {formatCurrency(option.unitPriceHT)} HT
                    </span>
                  </div>
                </li>
              ))}
              {!options.length ? <li className="mobile-prestation__empty">Aucune prestation sélectionnée.</li> : null}
            </ul>
            <div className="mobile-prestation-summary mobile-prestation-summary--panel">
              <div>
                <span>Total HT</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div>
                <span>TVA</span>
                <strong>{vatEnabledForInvoice ? formatCurrency(vatAmount) : '—'}</strong>
              </div>
              <div>
                <span>Total TTC</span>
                <strong>{formatCurrency(totalTtc)}</strong>
              </div>
            </div>
          </div>
          <div className="mobile-actions">
            <button
              type="button"
              className="mobile-button mobile-button--primary"
              onClick={() => {
                if (timerRunningElsewhere) {
                  return;
                }
                if (isCurrentServiceTiming) {
                  setView('timer');
                  return;
                }
                updateEngagement(engagement.id, { status: 'envoyé' });
                handleStartTimer(engagement);
              }}
              disabled={timerRunningElsewhere}
            >
              {timerButtonLabel}
            </button>
            <button type="button" className="mobile-button mobile-button--ghost" onClick={() => setView('invoice')}>
              Créer une facture
            </button>
          </div>
        </div>
      </section>
    );
  };

  const renderTimerView = (engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    const serviceName = servicesById.get(engagement.serviceId)?.name ?? 'Service';
    return (
      <section className="mobile-section mobile-section--timer" id="mobile-timer-section">
        <div className="mobile-section__header mobile-section__header--split">
          <button type="button" className="mobile-button mobile-button--ghost" onClick={handleExitTimerView}>
            Retour
          </button>
          <h1>Service en cours</h1>
        </div>
        <div className="mobile-card mobile-card--timer">
          <div className="mobile-card__title-block mobile-card__title-block--center">
            <p className="mobile-card__eyebrow">Temps écoulé</p>
            <div className={`mobile-timer__clock-shell${timerState?.running ? ' mobile-timer__clock-shell--running' : ''}`}>
              <span className="mobile-timer__clock">{toClock(displayElapsed)}</span>
            </div>
            <p className="mobile-card__subtitle">{serviceName}</p>
            <p className="mobile-card__meta">{client ? client.name : 'Client introuvable'}</p>
          </div>
          <div className="mobile-timer__controls">
            {timerState?.running ? (
              <button type="button" className="mobile-button mobile-button--ghost" onClick={handlePauseTimer}>
                Pause
              </button>
            ) : (
              <button type="button" className="mobile-button mobile-button--ghost" onClick={handleResumeTimer}>
                Reprendre
              </button>
            )}
            <button
              type="button"
              className="mobile-button mobile-button--primary"
              onClick={handleCompleteTimer}
              disabled={displayElapsed < 1000}
            >
              Terminer
            </button>
          </div>
          {showCommentForm ? (
            <div className="mobile-comment">
              <label className="mobile-field">
                <span>Commentaire de fin</span>
                <textarea
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  rows={3}
                  placeholder="Résumé de l’intervention"
                />
              </label>
              <div className="mobile-comment__actions">
                <button
                  type="button"
                  className="mobile-button mobile-button--primary"
                  onClick={() => handleValidateTimer(engagement)}
                >
                  Valider
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  const renderInvoiceView = (engagement: Engagement) => {
    const client = clientsById.get(engagement.clientId);
    const service = servicesById.get(engagement.serviceId);
    if (!client || !service) {
      return (
        <section className="mobile-section" id="mobile-invoice-section">
          <div className="mobile-section__header">
            <button type="button" className="mobile-button mobile-button--ghost" onClick={() => setView('details')}>
              Retour
            </button>
            <h1>Facturation</h1>
          </div>
          <div className="mobile-card">
            <p>Impossible de retrouver le service ou le client associé.</p>
          </div>
        </section>
      );
    }

    const options = service.options.filter((option) => engagement.optionIds.includes(option.id));
    const totals = computeEngagementTotals(engagement);
    const company = engagement.companyId
      ? companies.find((item) => item.id === engagement.companyId) ?? activeCompany
      : activeCompany;
    const vatPercent = safeVatRate(vatRate);
    const vatMultiplier = vatPercent / 100;
    const vatEnabledForInvoice = engagement.invoiceVatEnabled ?? (company?.vatEnabled ?? vatEnabled);
    const subtotal = totals.price + totals.surcharge;
    const vatAmount = vatEnabledForInvoice ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
    const totalTtc = vatEnabledForInvoice ? subtotal + vatAmount : subtotal;

    const handleToggleContact = (contactId: string) => {
      setInvoiceContactIds((previous) =>
        previous.includes(contactId) ? previous.filter((id) => id !== contactId) : [...previous, contactId]
      );
    };

    const handleGenerateInvoice = () => {
      setInvoiceFeedback(null);
      if (!company) {
        setInvoiceFeedback('Associez une entreprise à la prestation avant de facturer.');
        return;
      }
      if (!options.length && engagement.additionalCharge <= 0) {
        setInvoiceFeedback('Ajoutez au moins une prestation ou un supplément avant de facturer.');
        return;
      }
      const recipientsContacts = client.contacts.filter((contact) => invoiceContactIds.includes(contact.id));
      const emailCandidates = recipientsContacts
        .map((contact) => contact.email)
        .filter((value): value is string => Boolean(value && value.trim().length))
        .map((value) => value.trim());
      if (invoiceEmail && isValidEmail(invoiceEmail)) {
        emailCandidates.push(invoiceEmail.trim());
      }
      const emails = Array.from(new Set(emailCandidates));
      const issueDate = new Date();
      const documentNumber = engagement.invoiceNumber ?? getNextInvoiceNumber(engagements, issueDate);
      const vatEnabledForDocument = vatEnabledForInvoice;

      setIsGeneratingInvoice(true);
      try {
        const documentStatus: CommercialDocumentStatus =
          engagement.status === 'réalisé' ? 'payé' : 'envoyé';
        const pdf = generateInvoicePdf({
          documentNumber,
          issueDate,
          serviceDate: new Date(engagement.scheduledAt),
          company,
          client,
          service,
          options,
          optionOverrides: engagement.optionOverrides ?? {},
          additionalCharge: engagement.additionalCharge,
          vatRate: vatPercent,
          vatEnabled: vatEnabledForDocument,
          status: engagement.status,
          supportType: engagement.supportType,
          supportDetail: engagement.supportDetail,
          paymentMethod: null,
        });
        const pdfDataUri = pdf.output('datauristring');
        const blob = pdf.output('blob');

        const payload: Omit<DocumentRecord, 'id' | 'updatedAt'> & { updatedAt?: string } = {
          title: `${documentNumber} — ${client.name}`,
          category: 'Factures',
          description: `Facture générée le ${formatDate(issueDate.toISOString())} pour ${client.name}.`,
          owner: `${userProfile.firstName} ${userProfile.lastName}`.trim() || 'Wash&Go',
          companyId: company.id,
          tags: ['facture', `engagement:${engagement.id}`, `client:${client.id}`],
          source: 'Archive interne' as const,
          fileType: 'PDF',
          size: formatFileSize(blob.size),
          fileName: `${documentNumber}.pdf`,
          fileData: pdfDataUri,
          kind: 'facture' as const,
          engagementId: engagement.id,
          number: documentNumber,
          status: documentStatus,
          totalHt: subtotal,
          totalTtc: totalTtc,
          vatAmount: vatEnabledForDocument ? vatAmount : 0,
          vatRate: vatEnabledForDocument ? vatPercent : 0,
          issueDate: issueDate.toISOString(),
          recipients: emails.length ? emails : undefined,
        };

        const indexKey = `${engagement.id}:${documentNumber}`;
        const existingDocumentId = documentsByEngagementNumber.get(indexKey);
        if (existingDocumentId) {
          updateDocument(existingDocumentId, { ...payload, updatedAt: new Date().toISOString() });
        } else {
          addDocument(payload);
        }

        pdf.save(`${documentNumber}.pdf`);

        const mergedContactIds = unique([...engagement.contactIds, ...invoiceContactIds]);
        updateEngagement(engagement.id, {
          contactIds: mergedContactIds,
          invoiceNumber: documentNumber,
          invoiceVatEnabled: vatEnabledForDocument,
          kind: 'facture',
          status: 'réalisé',
        });

        setInvoiceFeedback('Facture générée et téléchargée sur votre appareil.');
      } catch (error) {
        console.error('[Wash&Go] Impossible de générer la facture mobile', error);
        setInvoiceFeedback("Impossible de générer la facture. Réessayez plus tard.");
      } finally {
        setIsGeneratingInvoice(false);
      }
    };

    return (
      <section className="mobile-section" id="mobile-invoice-section">
        <div className="mobile-section__header mobile-section__header--split">
          <button type="button" className="mobile-button mobile-button--ghost" onClick={() => setView('details')}>
            Retour
          </button>
          <h1>Facturer le service</h1>
        </div>
        <div className="mobile-card mobile-card--form">
          <div className="mobile-card__header">
            <div className="mobile-card__title-block">
              <p className="mobile-card__eyebrow">Récapitulatif</p>
              <h2 className="mobile-card__title">{service.name}</h2>
              <p className="mobile-card__subtitle">{client.name}</p>
            </div>
            <div className="mobile-prestation-summary mobile-prestation-summary--inline">
              <div>
                <span>HT</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div>
                <span>TVA</span>
                <strong>{vatEnabledForInvoice ? formatCurrency(vatAmount) : '—'}</strong>
              </div>
              <div>
                <span>TTC</span>
                <strong>{formatCurrency(totalTtc)}</strong>
              </div>
            </div>
          </div>
          <div className="mobile-card__section">
            <div className="mobile-section__header mobile-section__header--compact">
              <h3>Destinataires</h3>
              <span className="mobile-section__subtitle">
                {invoiceContactIds.length
                  ? `${invoiceContactIds.length} sélectionné${invoiceContactIds.length > 1 ? 's' : ''}`
                  : 'Sélectionnez les contacts'}
              </span>
            </div>
            <label className="mobile-field">
              <span>Email supplémentaire</span>
              <input
                type="email"
                value={invoiceEmail}
                onChange={(event) => setInvoiceEmail(event.target.value)}
                placeholder="client@example.com"
              />
            </label>
            <div className="mobile-checkbox-grid mobile-checkbox-grid--list">
              {client.contacts.length ? (
                client.contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`mobile-checkbox-tile mobile-checkbox-tile--list${!contact.active ? ' mobile-checkbox-tile--disabled' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={invoiceContactIds.includes(contact.id)}
                      onChange={() => handleToggleContact(contact.id)}
                      disabled={contact.active === false}
                    />
                    <div>
                      <span className="mobile-checkbox-tile__label">
                        {contact.firstName} {contact.lastName}
                      </span>
                      <span className="mobile-checkbox-tile__meta">{contact.email || 'Email manquant'}</span>
                    </div>
                  </label>
                ))
              ) : (
                <p className="mobile-prestation__empty">Aucun contact enregistré pour ce client.</p>
              )}
            </div>
          </div>
          {invoiceFeedback ? (
            <p
              className={`mobile-feedback mobile-feedback--block ${
                invoiceFeedback.includes('Impossible') ? 'mobile-feedback--error' : ''
              }`}
            >
              {invoiceFeedback}
            </p>
          ) : null}
          <div className="mobile-card__footer">
            <button
              type="button"
              className="mobile-button mobile-button--primary"
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
            >
              {isGeneratingInvoice ? 'Génération…' : 'Télécharger la facture'}
            </button>
          </div>
        </div>
        <aside className="mobile-card mobile-card--info">
          <div className="mobile-card__title-block">
            <p className="mobile-card__eyebrow">Prestations</p>
            <h2 className="mobile-card__title">Facturées</h2>
          </div>
          <ul className="mobile-info-list">
            {options.map((option) => (
              <li key={option.id}>
                <span className="mobile-info-list__name">{option.label}</span>
                <span className="mobile-info-list__meta">{formatCurrency(option.unitPriceHT)} HT</span>
              </li>
            ))}
          </ul>
        </aside>
      </section>
    );
  };

  return (
    <div className="mobile-app">
      <header className="mobile-app__header mobile-app__header--condensed">
        <div className="mobile-app__title-row">
          <span className="mobile-app__title">Wash&amp;Go Mobile</span>
          <span className="mobile-app__subtitle">Terrain</span>
        </div>
        <div className="mobile-app__header-actions">
          <button
            type="button"
            className="mobile-icon-button"
            onClick={toggleTheme}
            aria-label={themeToggleLabel}
          >
            <span aria-hidden="true">{themeToggleGlyph}</span>
          </button>
          <div className="mobile-user-chip" aria-live="polite">
            <span className="mobile-user-chip__name">
              {userProfile.firstName} {userProfile.lastName}
            </span>
            <button
              type="button"
              className="mobile-button mobile-button--ghost mobile-button--dense"
              onClick={logout}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <main className="mobile-app__main">
        {view === 'services' && renderServices()}
        {view === 'create' && renderCreate()}
        {view === 'details' && selectedEngagement ? renderDetails(selectedEngagement) : null}
        {view === 'timer' && selectedEngagement && timerState ? renderTimerView(selectedEngagement) : null}
        {view === 'invoice' && selectedEngagement ? renderInvoiceView(selectedEngagement) : null}
        {view !== 'services' && view !== 'create' && !selectedEngagement ? (
          <div className="mobile-card mobile-card--empty">
            <p>Service introuvable.</p>
            <button type="button" className="mobile-button" onClick={handleNavigateBack}>
              Retour à la liste
            </button>
          </div>
        ) : null}
      </main>
      <footer className="mobile-action-bar" role="toolbar" aria-label="Raccourcis rapides">
        <button
          type="button"
          className="mobile-button mobile-button--primary mobile-action-bar__button"
          onClick={handleQuickCreateTap}
        >
          Créer un service
        </button>
        <button
          type="button"
          className="mobile-button mobile-button--secondary mobile-action-bar__button"
          onClick={handleQuickStartTap}
          disabled={!canQuickStart}
        >
          Démarrer un service
        </button>
      </footer>
    </div>
  );
};

export default MobileTestPage;
