import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppData } from '../store/useAppData';
import { BRAND_BASELINE, BRAND_NAME } from '../lib/branding';
import { formatCurrency, formatDate } from '../lib/format';

interface TopbarProps {
  onMenuToggle: () => void;
}

const IconSun = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <circle cx="10" cy="10" r="3.5" />
    <path d="M10 2.5v2" strokeLinecap="round" />
    <path d="M10 15.5v2" strokeLinecap="round" />
    <path d="M3.5 10h2" strokeLinecap="round" />
    <path d="M14.5 10h2" strokeLinecap="round" />
    <path d="M5.2 5.2l1.4 1.4" strokeLinecap="round" />
    <path d="M13.4 13.4l1.4 1.4" strokeLinecap="round" />
    <path d="M5.2 14.8l1.4-1.4" strokeLinecap="round" />
    <path d="M13.4 6.6l1.4-1.4" strokeLinecap="round" />
  </svg>
);

const IconMoon = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.4}>
    <path
      d="M10.5 17a6.5 6.5 0 0 1-5.9-9.1A6 6 0 0 0 10 16a6 6 0 0 0 4.8-2.4A6.5 6.5 0 0 1 10.5 17z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Topbar = ({ onMenuToggle }: TopbarProps) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const {
    clients,
    leads,
    engagements,
    services,
    computeEngagementTotals,
    documents,
    companies,
    userProfile,
    logout,
    theme,
    toggleTheme,
  } = useAppData();
  const displayName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || 'Utilisateur';
  const displayRole = userProfile.role || BRAND_NAME;
  const initials = `${userProfile.firstName.charAt(0) ?? ''}${userProfile.lastName.charAt(0) ?? ''}`
    .trim()
    .toUpperCase();
  const baseline = BRAND_BASELINE.trim();
  const showBaseline = baseline.length > 0;

  const serviceById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const companyById = useMemo(() => new Map(companies.map((company) => [company.id, company])), [companies]);

  const trimmedQuery = query.trim().toLowerCase();

  type ResultItem = {
    id: string;
    title: string;
    subtitle: string;
    kind: 'client' | 'lead' | 'engagement' | 'document';
    badge?: string;
  };

  const groups = useMemo(() => {
    if (!trimmedQuery) {
      return [] as { label: string; items: ResultItem[] }[];
    }

    const matchText = (value: string | undefined | null) =>
      value ? value.toLowerCase().includes(trimmedQuery) : false;

    const clientItems: ResultItem[] = clients
      .filter((client) => {
        const contactMatch = client.contacts.some((contact) => {
          if (!contact.active) {
            return false;
          }
          const fullName = `${contact.firstName} ${contact.lastName}`.trim();
          return (
            matchText(fullName) ||
            matchText(contact.email) ||
            matchText(contact.mobile) ||
            contact.roles.some((role) => matchText(role))
          );
        });
        return (
          matchText(client.name) ||
          matchText(client.email) ||
          matchText(client.city) ||
          matchText(client.siret) ||
          client.tags.some((tag) => matchText(tag)) ||
          contactMatch
        );
      })
      .slice(0, 6)
      .map((client) => {
        const billingContact = client.contacts.find((contact) => contact.active && contact.isBillingDefault);
        const fallbackContact =
          billingContact ?? client.contacts.find((contact) => contact.active);
        const subtitleParts = [
          client.city || undefined,
          fallbackContact ? `${fallbackContact.firstName} ${fallbackContact.lastName}`.trim() : undefined,
          fallbackContact?.email,
        ].filter(Boolean);
        return {
          id: client.id,
          kind: 'client',
          title: client.name,
          subtitle: subtitleParts.join(' • '),
        } satisfies ResultItem;
      });

    const leadItems: ResultItem[] = leads
      .filter((lead) => matchText(lead.company) || matchText(lead.contact) || matchText(lead.email))
      .slice(0, 6)
      .map((lead) => ({
        id: lead.id,
        kind: 'lead',
        title: lead.company || lead.contact,
        subtitle: [lead.contact || undefined, lead.email].filter(Boolean).join(' • '),
        badge: lead.status,
      }));

    const engagementItems: ResultItem[] = engagements
      .filter((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const optionMatch = service?.options.some((option) => matchText(option.label));
        return (
          matchText(client?.name) ||
          matchText(service?.name) ||
          optionMatch ||
          matchText(engagement.kind === 'facture' ? 'facture' : engagement.kind === 'devis' ? 'devis' : 'service')
        );
      })
      .slice(0, 6)
      .map((engagement) => {
        const client = clientById.get(engagement.clientId);
        const service = serviceById.get(engagement.serviceId);
        const totals = computeEngagementTotals(engagement);
        const kindLabel = engagement.kind === 'facture' ? 'Facture' : engagement.kind === 'devis' ? 'Devis' : 'Service';
        return {
          id: engagement.id,
          kind: 'engagement',
          title: `${kindLabel} · ${client?.name ?? 'Client'}`,
          subtitle: [service?.name, formatDate(engagement.scheduledAt), formatCurrency(totals.price + totals.surcharge)]
            .filter(Boolean)
            .join(' • '),
          badge: engagement.status,
        } satisfies ResultItem;
      });

    const documentItems: ResultItem[] = documents
      .filter((document) => {
        const companyName = document.companyId ? companyById.get(document.companyId)?.name : undefined;
        const tagMatch = document.tags.some((tag) => matchText(tag));
        return (
          matchText(document.title) ||
          matchText(document.category) ||
          matchText(document.owner) ||
          matchText(companyName) ||
          tagMatch
        );
      })
      .slice(0, 6)
      .map((document) => {
        const companyName = document.companyId ? companyById.get(document.companyId)?.name : undefined;
        return {
          id: document.id,
          kind: 'document' as const,
          title: document.title,
          subtitle: [document.category, companyName, document.owner].filter(Boolean).join(' • '),
          badge: document.source,
        } satisfies ResultItem;
      });

    const nextGroups: { label: string; items: ResultItem[] }[] = [];
    if (clientItems.length) {
      nextGroups.push({ label: 'Clients', items: clientItems });
    }
    if (leadItems.length) {
      nextGroups.push({ label: 'Leads', items: leadItems });
    }
    if (engagementItems.length) {
      nextGroups.push({ label: 'Documents & prestations', items: engagementItems });
    }
    if (documentItems.length) {
      nextGroups.push({ label: 'Documents', items: documentItems });
    }
    return nextGroups;
  }, [
    clients,
    leads,
    engagements,
    documents,
    clientById,
    serviceById,
    companyById,
    computeEngagementTotals,
    trimmedQuery,
  ]);

  const flatResults = useMemo(() => groups.flatMap((group) => group.items), [groups]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsFocused(false);
      }
    };

    window.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      window.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (flatResults.length > 0) {
      handleSelect(flatResults[0]);
    }
  };

  const handleSelect = (item: ResultItem) => {
    setQuery('');
    setIsFocused(false);
    if (item.kind === 'client') {
      navigate(`/clients?clientId=${item.id}`);
    } else if (item.kind === 'lead') {
      navigate(`/lead?leadId=${item.id}`);
    } else if (item.kind === 'engagement') {
      navigate(`/service?engagementId=${item.id}`);
    } else if (item.kind === 'document') {
      navigate(`/documents?documentId=${item.id}`);
    }
  };

  const handleResultMouseDown = (event: ReactMouseEvent<HTMLButtonElement>, item: ResultItem) => {
    event.preventDefault();
    handleSelect(item);
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current) {
      window.clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = window.setTimeout(() => {
      setIsFocused(false);
    }, 120);
  };

  const handleMenuNavigate = (path: string) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-gradient-to-r from-white/92 via-sky-50/65 to-white/92 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800/80 dark:from-slate-950/92 dark:via-slate-900/90 dark:to-slate-950/94">
      <div className="grid w-full gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="group inline-flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <span className="sr-only">Ouvrir le menu</span>
            <span className="h-[1.5px] w-5 bg-slate-500 transition group-hover:bg-primary" />
            <span className="h-[1.5px] w-5 bg-slate-500 transition group-hover:bg-primary" />
            <span className="h-[1.5px] w-5 bg-slate-500 transition group-hover:bg-primary" />
          </button>
          <div className="space-y-0.5 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/90 dark:text-slate-200">
              {BRAND_NAME}
            </p>
            {showBaseline && <p className="text-xs text-slate-500 dark:text-slate-400">{baseline}</p>}
          </div>
        </div>
        <form
          onSubmit={handleSubmit}
          className="order-3 w-full lg:order-none lg:mx-auto lg:max-w-2xl"
        >
          <label htmlFor="global-search" className="sr-only">
            Rechercher
          </label>
          <div className="relative">
            <input
              id="global-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              placeholder="Rechercher clients, prestations ou documents"
              className="w-full rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-2.5 text-sm text-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.12)] placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100"
              autoComplete="off"
            />
            {isFocused && trimmedQuery && (
              <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/95 shadow-[0_24px_48px_rgba(15,23,42,0.18)] backdrop-blur-lg dark:border-slate-700/70 dark:bg-slate-900/90">
                {flatResults.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-500">Aucun résultat</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {groups.map((group) => (
                      <div key={group.label} className="py-2">
                        <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                          {group.label}
                        </p>
                        <ul className="space-y-1">
                          {group.items.map((item) => (
                            <li key={item.id}>
                              <button
                                type="button"
                                onMouseDown={(event) => handleResultMouseDown(event, item)}
                                className="group flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm text-slate-700 transition hover:bg-primary/5"
                              >
                                <span>
                                  <span className="block font-medium text-slate-900 group-hover:text-primary">{item.title}</span>
                                  <span className="mt-0.5 block text-xs text-slate-500">{item.subtitle}</span>
                                </span>
                                {item.badge && (
                                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>
        <div className="flex items-center justify-end gap-3">
          <div className="hidden text-right text-[11px] uppercase tracking-[0.28em] text-slate-400 lg:block">
            <p className="text-sm font-semibold text-slate-700">{displayName}</p>
            <p className="text-[10px] text-slate-500">{displayRole}</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-gradient-to-br from-primary/15 via-white/60 to-white/90 text-primary shadow-[0_10px_22px_rgba(15,23,42,0.18)] transition hover:shadow-[0_16px_30px_rgba(15,23,42,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 dark:border-slate-700/60 dark:from-slate-900/60 dark:via-slate-900/70 dark:to-slate-900/40 dark:text-slate-200"
            aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
              aria-label={isUserMenuOpen ? 'Fermer le menu utilisateur' : 'Ouvrir le menu utilisateur'}
            >
              {userProfile.avatarUrl ? (
                <img
                  src={userProfile.avatarUrl}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{initials || 'WA'}</span>
              )}
            </button>
            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl"
              >
                <div className="px-3 pb-2 text-xs uppercase tracking-[0.28em] text-slate-400">
                  {displayName}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleMenuNavigate('/parametres?tab=profil')}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition hover:bg-primary/5 hover:text-primary"
                >
                  Mon profil
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleMenuNavigate('/parametres')}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm transition hover:bg-primary/5 hover:text-primary"
                >
                  Paramètres
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                    navigate('/connexion');
                  }}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
