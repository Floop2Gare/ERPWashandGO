import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { format as formatDateToken } from 'date-fns';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Table } from '../components/Table';
import { StatusPill } from '../components/StatusPill';
import { Tag } from '../components/Tag';
import { RowActionButton } from '../components/RowActionButton';
import {
  IconArchive,
  IconDocument,
  IconDuplicate,
  IconEdit,
  IconPaperPlane,
  IconPrinter,
  IconReceipt,
} from '../components/icons';
import type jsPDF from 'jspdf';
import {
  useAppData,
  Client,
  ClientContact,
  ClientContactRole,
  Company,
  Engagement,
  EngagementKind,
  EngagementStatus,
  EngagementOptionOverride,
  Service,
  ServiceOption,
  SupportType,
  DocumentRecord,
} from '../store/useAppData';
import { formatCurrency, formatDate, formatDuration, mergeBodyWithSignature } from '../lib/format';
import { generateInvoicePdf, generateQuotePdf } from '../lib/invoice';
import { BRAND_NAME } from '../lib/branding';
import { openEmailComposer, sendDocumentEmail, SendDocumentEmailResult } from '../lib/email';

type EngagementDraft = {
  clientId: string;
  companyId: string | '';
  scheduledAt: string;
  serviceId: string;
  optionIds: string[];
  optionOverrides: Record<string, EngagementOptionOverride>;
  status: EngagementStatus;
  supportType: SupportType;
  supportDetail: string;
  additionalCharge: number;
  contactIds: string[];
};

type QuickClientDraft = {
  name: string;
  siret: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: Client['status'];
};

type ServiceEmailPrompt = {
  engagementId: string;
  serviceName: string;
};

type InvoiceEmailContext = {
  engagement: Engagement;
  client: Client;
  company: Company;
  service: Service;
  documentNumber: string;
  issueDate: Date;
  optionsSelected: ServiceOption[];
  optionOverrides?: Record<string, EngagementOptionOverride>;
  totals: { price: number; duration: number; surcharge: number };
  vatEnabled: boolean;
};

type OptionOverrideResolved = {
  quantity: number;
  durationMin: number;
  unitPriceHT: number;
};

const sanitizeDraftOverrides = (
  optionIds: string[],
  overrides?: Record<string, EngagementOptionOverride>
): Record<string, EngagementOptionOverride> => {
  if (!overrides) {
    return {};
  }
  const allowed = new Set(optionIds);
  const next: Record<string, EngagementOptionOverride> = {};
  for (const [optionId, value] of Object.entries(overrides)) {
    if (!allowed.has(optionId)) {
      continue;
    }
    const quantity = value.quantity && Number.isFinite(value.quantity) ? Math.max(1, value.quantity) : 1;
    const unitPrice =
      value.unitPriceHT !== undefined && Number.isFinite(value.unitPriceHT)
        ? Math.max(0, value.unitPriceHT)
        : undefined;
    const duration =
      value.durationMin !== undefined && Number.isFinite(value.durationMin)
        ? Math.max(0, value.durationMin)
        : undefined;
    next[optionId] = {
      quantity,
      unitPriceHT: unitPrice,
      durationMin: duration,
    };
  }
  return next;
};

const resolveOptionOverride = (
  option: ServiceOption,
  override: EngagementOptionOverride | undefined
): OptionOverrideResolved => ({
  quantity: override?.quantity && override.quantity > 0 ? override.quantity : 1,
  durationMin:
    override?.durationMin !== undefined && override.durationMin >= 0
      ? override.durationMin
      : option.defaultDurationMin,
  unitPriceHT:
    override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
      ? override.unitPriceHT
      : option.unitPriceHT,
});

const toLocalInputValue = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const fromLocalInputValue = (value: string) => {
  if (!value) {
    return new Date().toISOString();
  }
  const [yearString, monthString, dayString] = value.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date().toISOString();
  }
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
};

const buildInitialDraft = (
  clients: Client[],
  services: Service[],
  companies: Company[],
  activeCompanyId: string | null
): EngagementDraft => ({
  clientId: clients[0]?.id ?? '',
  companyId: activeCompanyId ?? companies[0]?.id ?? '',
  scheduledAt: toLocalInputValue(new Date().toISOString()),
  serviceId: services[0]?.id ?? '',
  optionIds: [],
  optionOverrides: {},
  status: 'planifié',
  supportType: 'Voiture',
  supportDetail: '',
  additionalCharge: 0,
  contactIds:
    clients[0]?.contacts.find((contact) => contact.active && contact.isBillingDefault)?.id
      ? [clients[0]!.contacts.find((contact) => contact.active && contact.isBillingDefault)!.id]
      : [],
});

const buildDraftFromEngagement = (engagement: Engagement): EngagementDraft => ({
  clientId: engagement.clientId,
  companyId: engagement.companyId ?? '',
  scheduledAt: toLocalInputValue(engagement.scheduledAt),
  serviceId: engagement.serviceId,
  optionIds: engagement.optionIds,
  optionOverrides: sanitizeDraftOverrides(engagement.optionIds, engagement.optionOverrides),
  status: engagement.status,
  supportType: engagement.supportType,
  supportDetail: engagement.supportDetail,
  additionalCharge: engagement.additionalCharge,
  contactIds: [...engagement.contactIds],
});

const buildPreviewEngagement = (draft: EngagementDraft, kind: EngagementKind): Engagement => ({
  id: 'preview',
  clientId: draft.clientId,
  serviceId: draft.serviceId,
  optionIds: draft.optionIds,
  scheduledAt: fromLocalInputValue(draft.scheduledAt),
  status: draft.status,
  companyId: draft.companyId ? draft.companyId : null,
  kind,
  supportType: draft.supportType,
  supportDetail: draft.supportDetail.trim(),
  additionalCharge: draft.additionalCharge,
  contactIds: [...draft.contactIds],
  sendHistory: [],
  invoiceNumber: null,
  invoiceVatEnabled: null,
  quoteNumber: null,
  quoteStatus: kind === 'devis' ? 'brouillon' : null,
  optionOverrides: sanitizeDraftOverrides(draft.optionIds, draft.optionOverrides),
});

const documentLabels: Record<EngagementKind, string> = {
  service: 'Service',
  devis: 'Devis',
  facture: 'Facture',
};

const documentTypeFromKind = (kind: EngagementKind): 'Service' | 'Devis' | 'Facture' => {
  if (kind === 'facture') return 'Facture';
  if (kind === 'devis') return 'Devis';
  return 'Service';
};

const buildLegacyDocumentNumber = (id: string, type: 'Service' | 'Devis' | 'Facture') => {
  const numeric = parseInt(id.replace(/\D/g, ''), 10);
  const prefix = type === 'Facture' ? 'FAC' : type === 'Devis' ? 'DEV' : 'SRV';
  if (Number.isNaN(numeric)) {
    return `${prefix}-${id.toUpperCase()}`;
  }
  return `${prefix}-${numeric.toString().padStart(4, '0')}`;
};

const getEngagementDocumentNumber = (engagement: Engagement) => {
  if (engagement.kind === 'facture') {
    return engagement.invoiceNumber ?? buildLegacyDocumentNumber(engagement.id, 'Facture');
  }
  if (engagement.kind === 'devis') {
    return engagement.quoteNumber ?? buildLegacyDocumentNumber(engagement.id, 'Devis');
  }
  const type = documentTypeFromKind(engagement.kind);
  return buildLegacyDocumentNumber(engagement.id, type);
};

const getNextInvoiceNumber = (engagementList: Engagement[], referenceDate: Date) => {
  const monthToken = formatDateToken(referenceDate, 'yyyyMM');
  const prefix = `FAC-${monthToken}-`;
  const invoicePattern = /^FAC-(\d{6})-(\d{4})$/;
  const highestSequenceForMonth = engagementList.reduce((acc, engagement) => {
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
  const nextSequence = (highestSequenceForMonth + 1).toString().padStart(4, '0');
  return `${prefix}${nextSequence}`;
};

const getNextQuoteNumber = (engagementList: Engagement[], referenceDate: Date) => {
  const monthToken = formatDateToken(referenceDate, 'yyyyMM');
  const prefix = `DEV-${monthToken}-`;
  const quotePattern = /^DEV-(\d{6})-(\d{4})$/;
  const highestSequenceForMonth = engagementList.reduce((acc, engagement) => {
    if (!engagement.quoteNumber) {
      return acc;
    }
    const match = quotePattern.exec(engagement.quoteNumber.trim());
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
  const nextSequence = (highestSequenceForMonth + 1).toString().padStart(4, '0');
  return `${prefix}${nextSequence}`;
};

const sanitizeVatRate = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

const computeVatMultiplier = (value: number) => sanitizeVatRate(value) / 100;

const formatVatRateLabel = (value: number) => {
  const safe = sanitizeVatRate(value);
  if (Number.isInteger(safe)) {
    return safe.toString();
  }
  return safe.toFixed(2).replace(/\.00$/, '');
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

const ServicePage = () => {
  const {
    engagements,
    clients,
    services,
    companies,
    activeCompanyId,
    userProfile,
    currentUserId,
    documents,
    addClient,
    addClientContact,
    addEngagement,
    updateEngagement,
    removeEngagement,
    setClientBillingContact,
    recordEngagementSend,
    computeEngagementTotals,
    pendingEngagementSeed,
    setPendingEngagementSeed,
    vatEnabled,
    vatRate,
    getClient,
    resolveSignatureHtml,
    addDocument,
    updateDocument,
    hasPermission,
  } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EngagementStatus | 'Tous'>('Tous');
  const [kindFilter, setKindFilter] = useState<EngagementKind | 'Tous'>('Tous');
  const [companyFilter, setCompanyFilter] = useState<'Toutes' | string>('Toutes');
  const [feedback, setFeedback] = useState<string | null>(null);

  const baseDraft = useMemo(
    () => buildInitialDraft(clients, services, companies, activeCompanyId),
    [clients, services, companies, activeCompanyId]
  );

  const [creationMode, setCreationMode] = useState<'service' | 'facture' | null>(null);
  const [creationDraft, setCreationDraft] = useState<EngagementDraft>(baseDraft);
  const [quickClientDraft, setQuickClientDraft] = useState<QuickClientDraft>({
    name: '',
    siret: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    status: 'Actif',
  });
  const [isAddingClient, setIsAddingClient] = useState(false);

  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null);
  const [selectedEngagementIds, setSelectedEngagementIds] = useState<string[]>([]);
  const selectedEngagement = useMemo(
    () => engagements.find((engagement) => engagement.id === selectedEngagementId) ?? null,
    [engagements, selectedEngagementId]
  );
  const [editDraft, setEditDraft] = useState<EngagementDraft | null>(
    selectedEngagement ? buildDraftFromEngagement(selectedEngagement) : null
  );
  const [highlightQuote, setHighlightQuote] = useState(false);
  const [mailPrompt, setMailPrompt] = useState<ServiceEmailPrompt | null>(null);
  const [mailPromptClientId, setMailPromptClientId] = useState('');

  const clientsWithEmail = useMemo(
    () => clients.filter((client) => client.contacts.some((contact) => contact.active && contact.email)),
    [clients]
  );

  const clientsById = useMemo<Map<string, Client>>(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const companiesById = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies]
  );
  const buildSignatureReplacements = (companyContext?: Company | null) => {
    const fallbackCompany =
      companyContext ??
      (activeCompanyId ? companiesById.get(activeCompanyId) ?? null : null) ??
      companies[0] ??
      null;
    return {
      nom: `${userProfile.firstName} ${userProfile.lastName}`.trim(),
      fonction: userProfile.role,
      telephone: userProfile.phone ?? '',
      téléphone: userProfile.phone ?? '',
      email: userProfile.email ?? '',
      entreprise: fallbackCompany?.name ?? BRAND_NAME,
      site: fallbackCompany?.website || fallbackCompany?.email || 'washandgo.fr',
    };
  };

  const persistEngagementDocument = useCallback(
    (
      pdf: jsPDF,
      context: {
        engagement: Engagement;
        documentNumber: string;
        documentType: 'Service' | 'Devis' | 'Facture';
        client?: Client | null;
        company?: Company | null;
        totals: { subtotal: number; vatAmount: number; total: number };
        vatEnabled: boolean;
        vatRate: number;
        issueDate: Date;
        recipients?: string[];
        pdfDataUri?: string;
      }
    ) => {
      if (context.documentType === 'Service') {
        return;
      }
      try {
        const dataUrl = context.pdfDataUri ?? pdf.output('datauristring');
        if (!dataUrl) {
          console.warn('[Wash&Go] Document généré sans contenu exploitable', {
            engagementId: context.engagement.id,
            documentNumber: context.documentNumber,
            documentType: context.documentType,
          });
          return;
        }
        const blob = pdf.output('blob');
        const ownerName = `${userProfile.firstName} ${userProfile.lastName}`.trim() || BRAND_NAME;
        const kindTag = context.documentType === 'Facture' ? 'facture' : 'devis';
        const tags = [
          kindTag,
          `engagement:${context.engagement.id}`,
          context.client?.id ? `client:${context.client.id}` : null,
        ].filter((value): value is string => Boolean(value && value.length));

        const category = context.documentType === 'Facture' ? 'Factures' : 'Devis';
        const payload = {
          title: `${context.documentNumber} — ${context.client?.name ?? 'Client non défini'}`,
          category,
          description: `${context.documentType} généré le ${formatDate(context.issueDate.toISOString())} pour ${
            context.client?.name ?? 'client non défini'
          }.`,
          owner: ownerName,
          companyId: context.company?.id ?? null,
          tags,
          source: 'Archive interne' as const,
          fileType: 'PDF',
          size: formatFileSize(blob.size),
          fileName: `${context.documentNumber}.pdf`,
          fileData: dataUrl,
          kind: context.documentType === 'Facture' ? 'facture' : 'devis',
          engagementId: context.engagement.id,
          number: context.documentNumber,
          status:
            context.documentType === 'Facture'
              ? (context.engagement.status === 'réalisé' ? 'payé' : 'envoyé')
              : context.engagement.quoteStatus ?? 'brouillon',
          totalHt: context.totals.subtotal,
          totalTtc: context.totals.total,
          vatAmount: context.vatEnabled ? context.totals.vatAmount : 0,
          vatRate: context.vatEnabled ? context.vatRate : 0,
          issueDate: context.issueDate.toISOString(),
          recipients: context.recipients && context.recipients.length ? context.recipients : undefined,
        } satisfies Omit<DocumentRecord, 'id' | 'updatedAt'> & { updatedAt?: string };

        const existing: DocumentRecord | undefined = documents.find((document) =>
          tags.every((tag) => document.tags.includes(tag))
        );

        if (existing) {
          updateDocument(existing.id, payload);
        } else {
          addDocument(payload);
        }
      } catch (error) {
        console.error('[Wash&Go] Impossible de persister le document généré', {
          error,
          engagementId: context.engagement.id,
          documentNumber: context.documentNumber,
          documentType: context.documentType,
        });
      }
    },
    [addDocument, documents, updateDocument, userProfile.firstName, userProfile.lastName]
  );
  const creationClient: Client | null = creationDraft.clientId
    ? clientsById.get(creationDraft.clientId) ?? null
    : null;


  useEffect(() => {
    setCreationDraft(baseDraft);
  }, [baseDraft]);

  useEffect(() => {
    const targetClient = creationClient;
    if (!targetClient) {
      if (creationDraft.contactIds.length) {
        setCreationDraft((draft) => ({ ...draft, contactIds: [] }));
      }
      return;
    }
    const preferred =
      targetClient.contacts.find((contact) => contact.active && contact.isBillingDefault) ??
      targetClient.contacts.find((contact) => contact.active);
    if (preferred && !creationDraft.contactIds.includes(preferred.id)) {
      setCreationDraft((draft) => ({ ...draft, contactIds: [preferred.id] }));
    } else if (!preferred && creationDraft.contactIds.length) {
      setCreationDraft((draft) => ({ ...draft, contactIds: [] }));
    }
  }, [creationClient, creationDraft.contactIds]);

  useEffect(() => {
    if (!pendingEngagementSeed) {
      return;
    }
    const {
      clientId,
      companyId,
      kind,
      supportType,
      supportDetail,
      serviceId,
      optionIds,
      contactIds,
    } = pendingEngagementSeed;
    setCreationMode(kind === 'facture' ? 'facture' : 'service');
    setCreationDraft((draft) => {
      const nextServiceId = serviceId ?? draft.serviceId;
      const nextOptionIds = optionIds ?? draft.optionIds;
      return {
        ...draft,
        clientId: clientId || draft.clientId,
        companyId: companyId ?? draft.companyId,
        supportType: supportType ?? draft.supportType,
        supportDetail: supportDetail ?? draft.supportDetail,
        serviceId: nextServiceId,
        optionIds: nextOptionIds,
        optionOverrides: sanitizeDraftOverrides(nextOptionIds, draft.optionOverrides),
        status: kind === 'facture' ? 'réalisé' : kind === 'devis' ? 'envoyé' : draft.status,
        contactIds: contactIds && contactIds.length ? contactIds : draft.contactIds,
      };
    });
    setIsAddingClient(false);
    setHighlightQuote(kind === 'devis');
    setPendingEngagementSeed(null);
  }, [pendingEngagementSeed, setPendingEngagementSeed]);

  useEffect(() => {
    if (selectedEngagement) {
      setEditDraft(buildDraftFromEngagement(selectedEngagement));
    } else {
      setEditDraft(null);
    }
  }, [selectedEngagement]);

  useEffect(() => {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const targetClient = clientsById.get(draft.clientId);
      if (!targetClient) {
        if (draft.contactIds.length) {
          return { ...draft, contactIds: [] };
        }
        return draft;
      }
      const activeIds = targetClient.contacts.filter((contact) => contact.active).map((contact) => contact.id);
      let nextIds = draft.contactIds.filter((id) => activeIds.includes(id));
      if (!nextIds.length) {
        const preferred =
          targetClient.contacts.find((contact) => contact.active && contact.isBillingDefault) ??
          targetClient.contacts.find((contact) => contact.active);
        if (preferred) {
          nextIds = [preferred.id];
        }
      }
      const unchanged =
        nextIds.length === draft.contactIds.length &&
        nextIds.every((id, index) => id === draft.contactIds[index]);
      if (unchanged) {
        return draft;
      }
      return { ...draft, contactIds: nextIds };
    });
  }, [clientsById]);

  const creationSectionRef = useRef<HTMLDivElement | null>(null);
  const editSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!creationMode) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const container = creationSectionRef.current;
    if (!container) {
      return;
    }
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const focusable = container.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 180);
  }, [creationMode]);

  useEffect(() => {
    if (!creationMode) {
      setHighlightQuote(false);
    }
  }, [creationMode]);

  useEffect(() => {
    if (!selectedEngagement || !editDraft) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const container = editSectionRef.current;
    if (!container) {
      return;
    }
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      const focusable = container.querySelector<HTMLElement>('input, select, textarea');
      focusable?.focus({ preventScroll: true });
    }, 180);
  }, [selectedEngagement, editDraft]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const engagementId = params.get('engagementId');
    if (!engagementId) {
      return;
    }

    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('engagementId');
    navigate({ pathname: location.pathname, search: nextParams.toString() ? `?${nextParams}` : '' }, { replace: true });

    if (engagements.some((engagement) => engagement.id === engagementId)) {
      setCreationMode(null);
      setSelectedEngagementId(engagementId);
    }
  }, [location.pathname, location.search, engagements, navigate]);

  const servicesById = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);

  useEffect(() => {
    setCreationDraft((draft) => {
      if (!draft.serviceId) {
        return draft;
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const allowed = new Set(service.options.map((option) => option.id));
      const filtered = draft.optionIds.filter((id) => allowed.has(id));
      const unchanged =
        filtered.length === draft.optionIds.length &&
        filtered.every((id, index) => id === draft.optionIds[index]);
      if (unchanged) {
        return draft;
      }
      return {
        ...draft,
        optionIds: filtered,
        optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
      };
    });
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const allowed = new Set(service.options.map((option) => option.id));
      const filtered = draft.optionIds.filter((id) => allowed.has(id));
      const unchanged =
        filtered.length === draft.optionIds.length &&
        filtered.every((id, index) => id === draft.optionIds[index]);
      if (unchanged) {
        return draft;
      }
      return {
        ...draft,
        optionIds: filtered,
        optionOverrides: sanitizeDraftOverrides(filtered, draft.optionOverrides),
      };
    });
  }, [servicesById]);

  const searchValue = search.trim().toLowerCase();

  const filteredEngagements = useMemo(() => {
    return engagements.filter((engagement) => {
      const client = clientsById.get(engagement.clientId);
      const company = engagement.companyId ? companiesById.get(engagement.companyId) : undefined;
      const service = servicesById.get(engagement.serviceId);
      const options = service?.options.filter((option) => engagement.optionIds.includes(option.id)) ?? [];
      const matchesSearch =
        searchValue.length === 0 ||
        [
          client?.name,
          company?.name,
          service?.name,
          engagement.supportDetail,
          ...options.map((option) => option.label),
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchValue));
      const matchesStatus = statusFilter === 'Tous' || engagement.status === statusFilter;
      const matchesKind = kindFilter === 'Tous' || engagement.kind === kindFilter;
      const matchesCompany = companyFilter === 'Toutes' || engagement.companyId === companyFilter;
      return matchesSearch && matchesStatus && matchesKind && matchesCompany;
    });
  }, [
    engagements,
    clientsById,
    companiesById,
    servicesById,
    searchValue,
    statusFilter,
    kindFilter,
    companyFilter,
  ]);

  useEffect(() => {
    setSelectedEngagementIds((current) =>
      current.filter((id) => engagements.some((engagement) => engagement.id === id))
    );
  }, [engagements]);

  const allEngagementsSelected =
    filteredEngagements.length > 0 &&
    filteredEngagements.every((engagement) => selectedEngagementIds.includes(engagement.id));

  const toggleEngagementSelection = (engagementId: string) => {
    setSelectedEngagementIds((current) =>
      current.includes(engagementId)
        ? current.filter((id) => id !== engagementId)
        : [...current, engagementId]
    );
  };

  const toggleSelectAllEngagements = () => {
    if (allEngagementsSelected) {
      setSelectedEngagementIds((current) =>
        current.filter((id) => !filteredEngagements.some((engagement) => engagement.id === id))
      );
    } else {
      setSelectedEngagementIds((current) => [
        ...new Set([...current, ...filteredEngagements.map((engagement) => engagement.id)]),
      ]);
    }
  };

  const clearSelectedEngagements = () => setSelectedEngagementIds([]);

  const selectedEngagementsForBulk = () =>
    engagements.filter((engagement) => selectedEngagementIds.includes(engagement.id));

  const handleBulkPrintEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    targets.forEach((engagement) => {
      void handleGenerateInvoice(engagement, 'print');
    });
  };

  const handleBulkSendEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    targets.forEach((engagement) => {
      void handleGenerateInvoice(engagement, 'email');
    });
  };

  const handleBulkArchiveEngagements = () => {
    const targets = selectedEngagementsForBulk();
    if (!targets.length) {
      return;
    }
    targets.forEach((engagement) => {
      removeEngagement(engagement.id);
      if (selectedEngagementId === engagement.id) {
        setSelectedEngagementId(null);
        setEditDraft(null);
      }
    });
    setSelectedEngagementIds([]);
    setFeedback(`${targets.length} prestation(s) archivées.`);
  };

  useEffect(() => {
    if (!selectedEngagementId) {
      return;
    }
    if (!filteredEngagements.some((item) => item.id === selectedEngagementId)) {
      setSelectedEngagementId(null);
    }
  }, [filteredEngagements, selectedEngagementId]);

  const creationSelectedService = servicesById.get(creationDraft.serviceId) ?? null;
  const editSelectedService = editDraft ? servicesById.get(editDraft.serviceId) ?? null : null;
  const creationContacts: ClientContact[] = creationClient
    ? creationClient.contacts.filter((contact) => contact.active)
    : [];
  const editClient = editDraft ? clientsById.get(editDraft.clientId) ?? null : null;
  const editContacts: ClientContact[] = editClient
    ? editClient.contacts.filter((contact) => contact.active)
    : [];
  const creationCompany =
    creationDraft.companyId && creationDraft.companyId !== ''
      ? companiesById.get(creationDraft.companyId) ?? null
      : activeCompanyId
      ? companiesById.get(activeCompanyId) ?? null
      : null;
  const editCompany =
    editDraft && editDraft.companyId
      ? companiesById.get(editDraft.companyId) ?? null
      : selectedEngagement?.companyId
      ? companiesById.get(selectedEngagement.companyId) ?? null
      : activeCompanyId
      ? companiesById.get(activeCompanyId) ?? null
      : null;

  const vatPercent = sanitizeVatRate(vatRate);
  const vatMultiplier = computeVatMultiplier(vatRate);

  const creationTotals = useMemo(() => {
    if (!creationDraft.serviceId) {
      return { price: 0, duration: 0, surcharge: creationDraft.additionalCharge };
    }
    const preview = buildPreviewEngagement(
      {
        ...creationDraft,
        status: 'planifié',
      },
      'service'
    );
    return computeEngagementTotals(preview);
  }, [creationDraft, creationMode, computeEngagementTotals]);

  const editTotals = useMemo(() => {
    if (!editDraft || !selectedEngagement) {
      return { price: 0, duration: 0, surcharge: 0 };
    }
    const preview = buildPreviewEngagement(editDraft, selectedEngagement.kind);
    return computeEngagementTotals(preview);
  }, [editDraft, selectedEngagement, computeEngagementTotals]);

  const creationVatEnabled = creationCompany?.vatEnabled ?? vatEnabled;
  const creationVatAmount = creationVatEnabled ? creationTotals.price * vatMultiplier : 0;
  const creationTotalTtc = creationTotals.price + creationVatAmount + creationTotals.surcharge;
  const companyVatDefault = editCompany?.vatEnabled ?? vatEnabled;
  const editVatEnabled = selectedEngagement
    ? selectedEngagement.invoiceVatEnabled ?? companyVatDefault
    : companyVatDefault;
  const editVatAmount = editVatEnabled ? editTotals.price * vatMultiplier : 0;
  const editTotalTtc = editTotals.price + editVatAmount + editTotals.surcharge;
  const invoiceVatOverride = selectedEngagement?.invoiceVatEnabled ?? null;
  const vatLabel = `TVA (${formatVatRateLabel(vatPercent)} %)`;

  const summary = useMemo(
    () =>
      engagements.reduce(
        (acc, engagement) => {
          const totals = computeEngagementTotals(engagement);
          acc.count += 1;
          acc.revenue += totals.price;
          acc.duration += totals.duration;
          acc.surcharge += totals.surcharge;
          if (['planifié', 'envoyé', 'brouillon'].includes(engagement.status)) {
            acc.pipeline += 1;
          }
          return acc;
        },
        { count: 0, revenue: 0, duration: 0, pipeline: 0, surcharge: 0 }
      ),
    [engagements, computeEngagementTotals]
  );

  const handleInvoiceVatToggle = () => {
    if (!selectedEngagement) {
      return;
    }
    const nextValue = !editVatEnabled;
    const normalized = nextValue === companyVatDefault ? null : nextValue;
    const updated = updateEngagement(selectedEngagement.id, {
      invoiceVatEnabled: normalized,
    });
    if (updated) {
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
      setFeedback(
        nextValue ? 'TVA activée pour cette facture.' : 'TVA désactivée pour cette facture.'
      );
    }
  };

  const handleInvoiceVatReset = () => {
    if (!selectedEngagement) {
      return;
    }
    const updated = updateEngagement(selectedEngagement.id, { invoiceVatEnabled: null });
    if (updated) {
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
      setFeedback('TVA réinitialisée sur le paramètre entreprise.');
    }
  };

  const toggleCreationOption = (optionId: string) => {
    setCreationDraft((draft) => {
      const alreadySelected = draft.optionIds.includes(optionId);
      if (alreadySelected) {
        const nextIds = draft.optionIds.filter((id) => id !== optionId);
        const nextOverrides = { ...draft.optionOverrides };
        delete nextOverrides[optionId];
        return {
          ...draft,
          optionIds: nextIds,
          optionOverrides: nextOverrides,
        };
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const option = service.options.find((item) => item.id === optionId);
      if (!option) {
        return draft;
      }
      return {
        ...draft,
        optionIds: [...draft.optionIds, optionId],
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: {
            quantity: 1,
            durationMin: option.defaultDurationMin,
            unitPriceHT: option.unitPriceHT,
          },
        },
      };
    });
  };

  const toggleCreationContact = (contactId: string) => {
    setCreationDraft((draft) => ({
      ...draft,
      contactIds: draft.contactIds.includes(contactId)
        ? draft.contactIds.filter((id) => id !== contactId)
        : [...draft.contactIds, contactId],
    }));
  };

  const updateCreationOverride = (
    optionId: string,
    updates: Partial<OptionOverrideResolved>
  ) => {
    setCreationDraft((draft) => {
      if (!draft.optionIds.includes(optionId)) {
        return draft;
      }
      const current = draft.optionOverrides[optionId] ?? {};
      const next: EngagementOptionOverride = { ...current };
      if (updates.quantity !== undefined) {
        const value = Number.isFinite(updates.quantity) ? Math.max(1, updates.quantity) : 1;
        next.quantity = value;
      }
      if (updates.durationMin !== undefined) {
        const value = Number.isFinite(updates.durationMin) ? Math.max(0, updates.durationMin) : 0;
        next.durationMin = value;
      }
      if (updates.unitPriceHT !== undefined) {
        const value = Number.isFinite(updates.unitPriceHT) ? Math.max(0, updates.unitPriceHT) : 0;
        next.unitPriceHT = value;
      }
      return {
        ...draft,
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: next,
        },
      };
    });
  };

  const toggleEditOption = (optionId: string) => {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const alreadySelected = draft.optionIds.includes(optionId);
      if (alreadySelected) {
        const nextIds = draft.optionIds.filter((id) => id !== optionId);
        const nextOverrides = { ...draft.optionOverrides };
        delete nextOverrides[optionId];
        return {
          ...draft,
          optionIds: nextIds,
          optionOverrides: nextOverrides,
        };
      }
      const service = servicesById.get(draft.serviceId);
      if (!service) {
        return draft;
      }
      const option = service.options.find((item) => item.id === optionId);
      if (!option) {
        return draft;
      }
      return {
        ...draft,
        optionIds: [...draft.optionIds, optionId],
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: {
            quantity: 1,
            durationMin: option.defaultDurationMin,
            unitPriceHT: option.unitPriceHT,
          },
        },
      };
    });
  };

  const toggleEditContact = (contactId: string) => {
    setEditDraft((draft) => {
      if (!draft) {
        return draft;
      }
      const contactIds = draft.contactIds.includes(contactId)
        ? draft.contactIds.filter((id) => id !== contactId)
        : [...draft.contactIds, contactId];
      return { ...draft, contactIds };
    });
  };

  const updateEditOverride = (
    optionId: string,
    updates: Partial<OptionOverrideResolved>
  ) => {
    setEditDraft((draft) => {
      if (!draft || !draft.optionIds.includes(optionId)) {
        return draft;
      }
      const current = draft.optionOverrides[optionId] ?? {};
      const next: EngagementOptionOverride = { ...current };
      if (updates.quantity !== undefined) {
        const value = Number.isFinite(updates.quantity) ? Math.max(1, updates.quantity) : 1;
        next.quantity = value;
      }
      if (updates.durationMin !== undefined) {
        const value = Number.isFinite(updates.durationMin) ? Math.max(0, updates.durationMin) : 0;
        next.durationMin = value;
      }
      if (updates.unitPriceHT !== undefined) {
        const value = Number.isFinite(updates.unitPriceHT) ? Math.max(0, updates.unitPriceHT) : 0;
        next.unitPriceHT = value;
      }
      return {
        ...draft,
        optionOverrides: {
          ...draft.optionOverrides,
          [optionId]: next,
        },
      };
    });
  };

  const handleQuickClientSubmit = () => {
    if (!quickClientDraft.name.trim() || !quickClientDraft.siret.trim()) {
      setFeedback('Renseignez au minimum le nom et le SIRET.');
      return;
    }
    const created = addClient({
      type: 'company',
      name: quickClientDraft.name.trim(),
      companyName: quickClientDraft.name.trim(),
      firstName: '',
      lastName: '',
      siret: quickClientDraft.siret.trim(),
      email: quickClientDraft.email.trim() || 'contact@client.fr',
      phone: quickClientDraft.phone.trim() || '+33 6 00 00 00 00',
      address: quickClientDraft.address.trim(),
      city: quickClientDraft.city.trim() || '—',
      status: quickClientDraft.status,
      tags: [],
    });
    const [firstName, ...restName] = quickClientDraft.name.trim().split(' ');
    const defaultContact = addClientContact(created.id, {
      firstName: firstName || 'Contact',
      lastName: restName.join(' ') || 'Facturation',
      email: quickClientDraft.email.trim() || 'contact@client.fr',
      mobile: quickClientDraft.phone.trim() || '+33 6 00 00 00 00',
      roles: ['facturation'],
      isBillingDefault: true,
    });
    const refreshedClient = getClient(created.id);
    const nextContactId = defaultContact?.id
      ?? refreshedClient?.contacts.find((contact) => contact.active && contact.isBillingDefault)?.id
      ?? refreshedClient?.contacts.find((contact) => contact.active)?.id
      ?? '';
    setCreationDraft((draft) => ({
      ...draft,
      clientId: created.id,
      contactIds: nextContactId ? [nextContactId] : draft.contactIds,
    }));
    setQuickClientDraft({ name: '', siret: '', email: '', phone: '', address: '', city: '', status: 'Actif' });
    setIsAddingClient(false);
    setFeedback(`Client « ${created.name} » ajouté.`);
  };

  const resolveEngagementRecipients = (engagement: Engagement, clientOverride?: Client | null) => {
    const targetClient = clientOverride ?? clientsById.get(engagement.clientId) ?? null;
    if (!targetClient) {
      return { emails: [] as string[], contactIds: [] as string[] };
    }
    const fallbackIds = targetClient.contacts
      .filter((contact) => contact.active && contact.isBillingDefault)
      .map((contact) => contact.id);
    const preferredIds = engagement.contactIds.length ? engagement.contactIds : fallbackIds;
    const uniqueIds = Array.from(new Set(preferredIds)).filter((id) =>
      targetClient.contacts.some((contact) => contact.id === id && contact.active)
    );
    const emails = uniqueIds
      .map((contactId) =>
        targetClient.contacts.find((contact) => contact.id === contactId && contact.active)?.email?.trim() ?? ''
      )
      .filter((email): email is string => email.length > 0);
    return { emails: Array.from(new Set(emails)), contactIds: uniqueIds };
  };

  const openMailForService = (engagement: Engagement, serviceName: string, client: Client | undefined) => {
    const targetClient = client ?? clientsById.get(engagement.clientId) ?? null;
    const recipients = resolveEngagementRecipients(engagement, targetClient);
    if (recipients.emails.length && recipients.contactIds.length) {
      const subject = `${BRAND_NAME} – Info service ${serviceName}`;
      const baseBody = `Bonjour,\n\nVoici les informations concernant le service "${serviceName}".\nSouhaitez-vous que je vous envoie un devis ?\n\nCordialement,\n${BRAND_NAME}`;
      const companyContext = engagement.companyId
        ? companiesById.get(engagement.companyId) ?? null
        : companiesById.get(activeCompanyId ?? '') ?? null;
      const signatureHtml = resolveSignatureHtml(
        companyContext?.id ?? engagement.companyId ?? activeCompanyId ?? null,
        currentUserId
      );
      const mergedBody = mergeBodyWithSignature(
        baseBody,
        signatureHtml,
        buildSignatureReplacements(companyContext)
      );
      if (typeof window !== 'undefined') {
        window.location.href = `mailto:${recipients.emails.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mergedBody)}`;
      }
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return;
    }
    setMailPrompt({ engagementId: engagement.id, serviceName });
    setMailPromptClientId(clientsWithEmail[0]?.id ?? '');
  };

  const submitMailPrompt = () => {
    if (!mailPrompt) {
      return;
    }
    const targetClient = clients.find((client) => client.id === mailPromptClientId);
    if (!targetClient) {
      return;
    }
    const recipients = targetClient.contacts
      .filter((contact) => contact.active && contact.email)
      .map((contact) => contact.email);
    const contactIds = targetClient.contacts
      .filter((contact) => contact.active && contact.email)
      .map((contact) => contact.id);
    if (!recipients.length) {
      return;
    }
    const subject = `${BRAND_NAME} – Info service ${mailPrompt.serviceName}`;
    const companyContext = companiesById.get(activeCompanyId ?? '') ?? null;
    const baseBody = `Bonjour,\n\nVoici les informations concernant le service "${mailPrompt.serviceName}".\nSouhaitez-vous que je vous envoie un devis ?\n\nCordialement,\n${BRAND_NAME}`;
    const signatureHtml = resolveSignatureHtml(companyContext?.id ?? activeCompanyId ?? null, currentUserId);
    const mergedBody = mergeBodyWithSignature(
      baseBody,
      signatureHtml,
      buildSignatureReplacements(companyContext)
    );
    if (typeof window !== 'undefined') {
      window.location.href = `mailto:${recipients.join(',')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mergedBody)}`;
    }
    if (contactIds.length) {
      recordEngagementSend(mailPrompt.engagementId, { contactIds, subject });
    }
    setMailPrompt(null);
    setMailPromptClientId('');
  };

  const cancelMailPrompt = () => {
    setMailPrompt(null);
    setMailPromptClientId('');
  };

  const openQuoteFromEngagement = (engagement: Engagement) => {
    setFeedback(null);
    const draft = buildDraftFromEngagement(engagement);
    setCreationDraft({
      ...draft,
      companyId: draft.companyId || activeCompanyId || '',
      optionIds: [...engagement.optionIds],
      status: 'planifié',
    });
    setHighlightQuote(true);
    setCreationMode('service');
  };

  const handleCreateService = async (options?: { sendAsQuote?: boolean }) => {
    setFeedback(null);
    if (!creationDraft.clientId || !creationDraft.serviceId) {
      setFeedback('Sélectionnez un client et un service.');
      return;
    }
    if (!creationDraft.companyId) {
      setFeedback('Sélectionnez l’entreprise associée au document.');
      return;
    }
    if (!creationDraft.contactIds.length) {
      setFeedback('Sélectionnez au moins un contact destinataire.');
      return;
    }
    const service = servicesById.get(creationDraft.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la création de la prestation', {
        serviceId: creationDraft.serviceId,
      });
      setFeedback('Le service sélectionné est introuvable. Veuillez réessayer.');
      return;
    }

    const client = clientsById.get(creationDraft.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la création de la prestation', {
        clientId: creationDraft.clientId,
      });
      setFeedback('Le client sélectionné est introuvable.');
      return;
    }

    const selectedCompany = creationDraft.companyId ? companiesById.get(creationDraft.companyId) ?? null : null;
    if (!selectedCompany) {
      setFeedback('Impossible de retrouver l’entreprise associée.');
      return;
    }

    const engagement = addEngagement({
      clientId: creationDraft.clientId,
      serviceId: creationDraft.serviceId,
      optionIds: creationDraft.optionIds,
      optionOverrides: creationDraft.optionOverrides,
      scheduledAt: fromLocalInputValue(creationDraft.scheduledAt),
      status: options?.sendAsQuote ? 'brouillon' : creationDraft.status,
      companyId: selectedCompany.id,
      kind: options?.sendAsQuote ? 'devis' : 'service',
      supportType: creationDraft.supportType,
      supportDetail: creationDraft.supportDetail.trim(),
      additionalCharge: creationDraft.additionalCharge,
      contactIds: creationDraft.contactIds,
      sendHistory: [],
      invoiceNumber: null,
      invoiceVatEnabled: null,
      quoteNumber: null,
      quoteStatus: options?.sendAsQuote ? 'brouillon' : null,
    });
    setHighlightQuote(false);
    setIsAddingClient(false);
    setSelectedEngagementId(engagement.id);
    setEditDraft(buildDraftFromEngagement(engagement));

    if (options?.sendAsQuote) {
      await handleGenerateQuote(engagement, 'email', { autoCreated: true });
    } else {
      setFeedback('Service enregistré.');
    }
    setCreationMode(null);
  };

  const sendInvoiceEmail = async ({
    engagement,
    client,
    company,
    service,
    documentNumber,
    issueDate,
    optionsSelected,
    optionOverrides,
    totals,
    vatEnabled,
    pdfDataUri,
  }: InvoiceEmailContext & {
    optionsSelected: ServiceOption[];
    pdfDataUri: string;
    totals: { price: number; duration: number; surcharge: number };
  }): Promise<{ status: 'sent' | 'fallback' | 'error'; message?: string }> => {
    const recipients = resolveEngagementRecipients(engagement, client);
    if (!recipients.emails.length || !recipients.contactIds.length) {
      return {
        status: 'error',
        message: 'Ajoutez un contact facturation avec une adresse e-mail pour envoyer la facture.',
      };
    }

    const contact = client.contacts.find((item) => recipients.contactIds.includes(item.id)) ?? null;
    const candidateFirstNames = [contact?.firstName, client.firstName].map((value) => value?.trim()).filter(Boolean);
    const candidateLastNames = [contact?.lastName, client.lastName, client.name]
      .map((value) => value?.trim())
      .filter(Boolean);
    const greetingName = `${candidateFirstNames[0] ?? ''} ${candidateLastNames[0] ?? ''}`.trim() || client.name;

    const supportDetail = engagement.supportDetail?.trim();
    const supportLine = supportDetail
      ? `${engagement.supportType} – ${supportDetail}`
      : engagement.supportType || 'Support';

    const subtotal = totals.price + totals.surcharge;
    const vatAmount = vatEnabled ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
    const totalTtc = vatEnabled ? subtotal + vatAmount : subtotal;
    const vatSuffix = vatEnabled
      ? ` (TVA ${formatVatRateLabel(vatPercent)} % : ${formatCurrency(vatAmount)})`
      : '';

    const prestationEntries = optionsSelected.map((option) => {
      const override = optionOverrides?.[option.id];
      const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
      const durationValue =
        override?.durationMin !== undefined && override.durationMin >= 0
          ? override.durationMin
          : option.defaultDurationMin;
      const unitPrice =
        override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
          ? override.unitPriceHT
          : option.unitPriceHT;
      const quantityLabel = quantity !== 1 ? `${quantity} × ` : '';
      const durationLabel = durationValue ? ` (${formatDuration(durationValue)})` : '';
      const lineTotal = formatCurrency(unitPrice * quantity);
      return `• ${quantityLabel}${option.label}${durationLabel} – ${lineTotal}`;
    });
    if (totals.surcharge > 0) {
      prestationEntries.push(`• Majoration – ${formatCurrency(totals.surcharge)}`);
    }
    const prestationsBlock = prestationEntries.length
      ? `\n  ${prestationEntries.join('\n  ')}`
      : ' Voir le détail dans la facture';

    const subject = `Facture ${documentNumber} – ${client.name}`;
    const baseBody = [
      `Bonjour ${greetingName},`,
      '',
      `Veuillez trouver ci-joint la facture ${documentNumber} relative au service « ${service.name} ».`,
      '',
      'Détails principaux :',
      `- Client : ${client.name}`,
      `- Support : ${supportLine}`,
      `- Prestations :${prestationsBlock}`,
      `- Total HT : ${formatCurrency(subtotal)}${vatSuffix}`,
      `- Total TTC : ${formatCurrency(totalTtc)}`,
      `- Date : ${issueDate.toLocaleDateString('fr-FR')}`,
      '',
      'Restant à votre disposition,',
    ].join('\n');

    const signatureHtml = resolveSignatureHtml(company.id, currentUserId);
    let bodyWithSignature = mergeBodyWithSignature(baseBody, signatureHtml, buildSignatureReplacements(company));
    if (!signatureHtml) {
      const fallbackName = `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || BRAND_NAME;
      const fallbackSignature = `Cordialement,\n${fallbackName}`;
      bodyWithSignature = `${bodyWithSignature}\n\n${fallbackSignature}`.trim();
    }

    const sendResult: SendDocumentEmailResult = await sendDocumentEmail({
      to: recipients.emails,
      subject,
      body: bodyWithSignature,
      attachment: { filename: `${documentNumber}.pdf`, dataUri: pdfDataUri },
    });

    if (sendResult.ok) {
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'sent' };
    }

    if (sendResult.reason === 'not-configured') {
      openEmailComposer({ to: recipients.emails, subject, body: bodyWithSignature });
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'fallback', message: 'SMTP non configuré – e-mail ouvert dans votre messagerie.' };
    }

    return {
      status: 'error',
      message: sendResult.message ?? "Impossible d'envoyer la facture par e-mail.",
    };
  };

  const sendQuoteEmail = async ({
    engagement,
    client,
    company,
    service,
    documentNumber,
    issueDate,
    optionsSelected,
    optionOverrides,
    totals,
    vatEnabled,
    pdfDataUri,
  }: InvoiceEmailContext & {
    optionsSelected: ServiceOption[];
    pdfDataUri: string;
    totals: { price: number; duration: number; surcharge: number };
  }): Promise<{ status: 'sent' | 'fallback' | 'error'; message?: string }> => {
    const recipients = resolveEngagementRecipients(engagement, client);
    if (!recipients.emails.length || !recipients.contactIds.length) {
      return {
        status: 'error',
        message: 'Ajoutez un contact destinataire avec une adresse e-mail pour envoyer le devis.',
      };
    }

    const subtotal = totals.price + totals.surcharge;
    const vatAmount = vatEnabled ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
    const totalTtc = vatEnabled ? subtotal + vatAmount : subtotal;
    const vatSuffix = vatEnabled
      ? ` (TVA ${formatVatRateLabel(vatPercent)} % : ${formatCurrency(vatAmount)})`
      : '';

    const prestationEntries = optionsSelected.map((option) => {
      const override = optionOverrides?.[option.id];
      const quantity = override?.quantity && override.quantity > 0 ? override.quantity : 1;
      const durationValue =
        override?.durationMin !== undefined && override.durationMin >= 0
          ? override.durationMin
          : option.defaultDurationMin;
      const unitPrice =
        override?.unitPriceHT !== undefined && override.unitPriceHT >= 0
          ? override.unitPriceHT
          : option.unitPriceHT;
      const quantityLabel = quantity !== 1 ? `${quantity} × ` : '';
      const durationLabel = durationValue ? ` (${formatDuration(durationValue)})` : '';
      const lineTotal = formatCurrency(unitPrice * quantity);
      return `• ${quantityLabel}${option.label}${durationLabel} – ${lineTotal}`;
    });
    if (totals.surcharge > 0) {
      prestationEntries.push(`• Majoration – ${formatCurrency(totals.surcharge)}`);
    }
    const prestationsBlock = prestationEntries.length
      ? `\n  ${prestationEntries.join('\n  ')}`
      : ' Voir le détail dans le devis';

    const subject = `Devis ${documentNumber} – ${client.name}`;
    const baseBody = [
      `Bonjour ${client.name},`,
      '',
      `Veuillez trouver ci-joint le devis ${documentNumber} pour le service « ${service.name} ».`,
      '',
      'Détails principaux :',
      `- Client : ${client.name}`,
      `- Support : ${
        engagement.supportDetail?.trim()
          ? `${engagement.supportType} – ${engagement.supportDetail}`
          : engagement.supportType || 'Support'
      }`,
      `- Prestations :${prestationsBlock}`,
      `- Total HT estimé : ${formatCurrency(subtotal)}${vatSuffix}`,
      `- Total TTC estimé : ${formatCurrency(totalTtc)}`,
      `- Date d’émission : ${issueDate.toLocaleDateString('fr-FR')}`,
      '',
      'Validité du devis : 30 jours.',
      '',
      'Restant à votre disposition pour toute précision,',
    ].join('\n');

    const signatureHtml = resolveSignatureHtml(company.id, currentUserId);
    let bodyWithSignature = mergeBodyWithSignature(baseBody, signatureHtml, buildSignatureReplacements(company));
    if (!signatureHtml) {
      const fallbackName = `${userProfile.firstName ?? ''} ${userProfile.lastName ?? ''}`.trim() || BRAND_NAME;
      const fallbackSignature = `Cordialement,\n${fallbackName}`;
      bodyWithSignature = `${bodyWithSignature}\n\n${fallbackSignature}`.trim();
    }

    const sendResult: SendDocumentEmailResult = await sendDocumentEmail({
      to: recipients.emails,
      subject,
      body: bodyWithSignature,
      attachment: { filename: `${documentNumber}.pdf`, dataUri: pdfDataUri },
    });

    if (sendResult.ok) {
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'sent' };
    }

    if (sendResult.reason === 'not-configured') {
      openEmailComposer({ to: recipients.emails, subject, body: bodyWithSignature });
      recordEngagementSend(engagement.id, { contactIds: recipients.contactIds, subject });
      return { status: 'fallback', message: 'SMTP non configuré – e-mail ouvert dans votre messagerie.' };
    }

    return {
      status: 'error',
      message: sendResult.message ?? "Impossible d'envoyer le devis par e-mail.",
    };
  };

  const handleGenerateInvoice = async (
    engagement: Engagement,
    mode: 'download' | 'email' | 'print' = 'download'
  ) => {
    setFeedback(null);
    const service = servicesById.get(engagement.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la génération de facture', {
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Service introuvable pour cette prestation.');
      return;
    }
    const client = clientsById.get(engagement.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la génération de facture', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
      });
      setFeedback('Client introuvable pour cette prestation.');
      return;
    }
    const preferredCompany = engagement.companyId ? companiesById.get(engagement.companyId) ?? null : null;
    const company = preferredCompany ?? (activeCompanyId ? companiesById.get(activeCompanyId) ?? null : null);
    if (!company) {
      setFeedback('Associez une entreprise avant de générer une facture.');
      return;
    }
    const optionsSelected = service.options.filter((option) => engagement.optionIds.includes(option.id));
    if (!optionsSelected.length && engagement.additionalCharge <= 0) {
      setFeedback('Sélectionnez au moins une prestation à facturer.');
      return;
    }

    if (!company.name.trim() || !company.siret.trim()) {
      setFeedback('Complétez le nom et le SIRET de l’entreprise avant de générer une facture.');
      return;
    }
    if (!client.name.trim()) {
      setFeedback('Le client doit avoir un nom pour générer une facture.');
      return;
    }

    const totals = computeEngagementTotals(engagement);
    const issueDate = new Date();
    const vatEnabledForInvoice = engagement.invoiceVatEnabled ?? (company.vatEnabled ?? vatEnabled);
    const documentNumber = engagement.invoiceNumber ?? getNextInvoiceNumber(engagements, issueDate);

    try {
      const pdf = generateInvoicePdf({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt),
        company,
        client,
        service,
        options: optionsSelected,
        optionOverrides: engagement.optionOverrides ?? {},
        additionalCharge: engagement.additionalCharge,
        vatRate: vatPercent,
        vatEnabled: vatEnabledForInvoice,
        status: engagement.status,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail,
        paymentMethod: undefined,
      });
      const subtotal = totals.price + totals.surcharge;
      const vatAmount = vatEnabledForInvoice ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
      const totalTtc = vatEnabledForInvoice ? subtotal + vatAmount : subtotal;
      const pdfDataUri = pdf.output('datauristring');

      const recipients = resolveEngagementRecipients(engagement, client);

      persistEngagementDocument(pdf, {
        engagement,
        documentNumber,
        documentType: 'Facture',
        client,
        company,
        totals: { subtotal, vatAmount, total: totalTtc },
        vatEnabled: vatEnabledForInvoice,
        vatRate: vatPercent,
        issueDate,
        recipients: recipients.emails.length ? recipients.emails : undefined,
        pdfDataUri,
      });

      if (mode === 'download') {
        pdf.save(`${documentNumber}.pdf`);
      } else if (mode === 'print' && typeof window !== 'undefined') {
        pdf.autoPrint?.();
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }

      const updated = updateEngagement(engagement.id, {
        status: 'réalisé',
        kind: 'facture',
        companyId: company.id,
        invoiceNumber: documentNumber,
        invoiceVatEnabled: vatEnabledForInvoice,
      });
      const nextEngagement = updated ?? engagement;
      setSelectedEngagementId(nextEngagement.id);
      setEditDraft(buildDraftFromEngagement(nextEngagement));

      if (mode === 'email') {
        const emailResult = await sendInvoiceEmail({
          engagement: nextEngagement,
          client,
          company,
          service,
          documentNumber,
          issueDate,
          optionsSelected,
          optionOverrides: nextEngagement.optionOverrides ?? {},
          totals,
          vatEnabled: vatEnabledForInvoice,
          pdfDataUri,
        });
        if (emailResult.status === 'error') {
          setFeedback(emailResult.message ?? "Impossible d'envoyer la facture par e-mail.");
          return;
        }
        if (emailResult.status === 'fallback') {
          pdf.save(`${documentNumber}.pdf`);
          setFeedback(
            emailResult.message ??
              'SMTP indisponible – le PDF a été téléchargé et votre messagerie a été ouverte.'
          );
        } else {
          setFeedback('Facture envoyée par e-mail.');
        }
      } else if (mode === 'print') {
        setFeedback('Facture générée et prête pour impression.');
      } else {
        setFeedback('Facture générée et téléchargée.');
      }
    } catch (error) {
      console.error('[Wash&Go] Échec de génération de la facture', {
        error,
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Impossible de générer la facture. Vérifiez les informations et réessayez.');
    }
  };

  const handleGenerateQuote = async (
    engagement: Engagement,
    mode: 'download' | 'email' = 'download',
    options?: { autoCreated?: boolean }
  ) => {
    setFeedback(null);
    const service = servicesById.get(engagement.serviceId) ?? null;
    if (!service) {
      console.error('[Wash&Go] Service introuvable lors de la génération de devis', {
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Service introuvable pour cette prestation.');
      return;
    }
    const client = clientsById.get(engagement.clientId) ?? null;
    if (!client) {
      console.error('[Wash&Go] Client introuvable lors de la génération de devis', {
        engagementId: engagement.id,
        clientId: engagement.clientId,
      });
      setFeedback('Client introuvable pour cette prestation.');
      return;
    }
    const preferredCompany = engagement.companyId ? companiesById.get(engagement.companyId) ?? null : null;
    const company = preferredCompany ?? (activeCompanyId ? companiesById.get(activeCompanyId) ?? null : null);
    if (!company) {
      setFeedback('Associez une entreprise avant de générer un devis.');
      return;
    }

    const optionsSelected = service.options.filter((option) => engagement.optionIds.includes(option.id));
    if (!optionsSelected.length && engagement.additionalCharge <= 0) {
      setFeedback('Sélectionnez au moins une prestation à inclure dans le devis.');
      return;
    }

    if (!company.name.trim() || !company.siret.trim()) {
      setFeedback("Complétez le nom et le SIRET de l’entreprise avant de générer un devis.");
      return;
    }
    if (!client.name.trim()) {
      setFeedback('Le client doit avoir un nom pour générer un devis.');
      return;
    }

    const totals = computeEngagementTotals(engagement);
    const issueDate = new Date();
    const vatEnabledForQuote = company.vatEnabled ?? vatEnabled;
    const documentNumber = engagement.quoteNumber ?? getNextQuoteNumber(engagements, issueDate);

    try {
      const pdf = generateQuotePdf({
        documentNumber,
        issueDate,
        serviceDate: new Date(engagement.scheduledAt),
        company,
        client,
        service,
        options: optionsSelected,
        optionOverrides: engagement.optionOverrides ?? {},
        additionalCharge: engagement.additionalCharge,
        vatRate: vatPercent,
        vatEnabled: vatEnabledForQuote,
        status: engagement.status,
        supportType: engagement.supportType,
        supportDetail: engagement.supportDetail,
        validityNote: '30 jours',
      });

      const subtotal = totals.price + totals.surcharge;
      const vatAmount = vatEnabledForQuote ? Math.round(subtotal * vatMultiplier * 100) / 100 : 0;
      const totalTtc = vatEnabledForQuote ? subtotal + vatAmount : subtotal;
      const pdfDataUri = pdf.output('datauristring');

      const recipients = resolveEngagementRecipients(engagement, client);

      persistEngagementDocument(pdf, {
        engagement,
        documentNumber,
        documentType: 'Devis',
        client,
        company,
        totals: { subtotal, vatAmount, total: totalTtc },
        vatEnabled: vatEnabledForQuote,
        vatRate: vatPercent,
        issueDate,
        recipients: recipients.emails.length ? recipients.emails : undefined,
        pdfDataUri,
      });

      if (mode === 'download') {
        if (typeof window !== 'undefined') {
          const blobUrl = pdf.output('bloburl');
          window.open(blobUrl, '_blank', 'noopener,noreferrer');
        }
        pdf.save(`${documentNumber}.pdf`);
      }

      const updated = updateEngagement(engagement.id, {
        status: mode === 'email' ? 'envoyé' : engagement.status ?? 'brouillon',
        kind: 'devis',
        companyId: company.id,
        quoteNumber: documentNumber,
        quoteStatus: mode === 'email' ? 'envoyé' : engagement.quoteStatus ?? 'brouillon',
      });
      const nextEngagement = updated ?? engagement;
      setSelectedEngagementId(nextEngagement.id);
      setEditDraft(buildDraftFromEngagement(nextEngagement));

      if (mode === 'email') {
        const emailResult = await sendQuoteEmail({
          engagement: nextEngagement,
          client,
          company,
          service,
          documentNumber,
          issueDate,
          optionsSelected,
          optionOverrides: nextEngagement.optionOverrides ?? {},
          totals,
          vatEnabled: vatEnabledForQuote,
          pdfDataUri,
        });

        if (emailResult.status === 'error') {
          setFeedback(emailResult.message ?? "Impossible d'envoyer le devis par e-mail.");
          return;
        }
        if (emailResult.status === 'fallback') {
          if (typeof window !== 'undefined') {
            const blobUrl = pdf.output('bloburl');
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
          }
          pdf.save(`${documentNumber}.pdf`);
          setFeedback(
            emailResult.message ??
              'SMTP indisponible – le devis a été téléchargé et un brouillon d’e-mail a été ouvert.'
          );
        } else {
          const successMessage = options?.autoCreated
            ? 'Devis préparé et e-mail envoyé.'
            : 'Devis envoyé par e-mail.';
          setFeedback(successMessage);
        }
      } else {
        setFeedback('Devis généré et téléchargé.');
      }
    } catch (error) {
      console.error('[Wash&Go] Échec de génération du devis', {
        error,
        engagementId: engagement.id,
        serviceId: engagement.serviceId,
      });
      setFeedback('Impossible de générer le devis. Vérifiez les informations et réessayez.');
    }
  };

const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEngagement || !editDraft) {
      return;
    }
    if (!editDraft.contactIds.length) {
      setFeedback('Sélectionnez au moins un contact destinataire.');
      return;
    }
    const updated = updateEngagement(selectedEngagement.id, {
      clientId: editDraft.clientId,
      serviceId: editDraft.serviceId,
      optionIds: editDraft.optionIds,
      optionOverrides: editDraft.optionOverrides,
      scheduledAt: fromLocalInputValue(editDraft.scheduledAt),
      status: editDraft.status,
      companyId: editDraft.companyId ? editDraft.companyId : null,
      supportType: editDraft.supportType,
      supportDetail: editDraft.supportDetail.trim(),
      additionalCharge: editDraft.additionalCharge,
      contactIds: editDraft.contactIds,
    });
    if (updated) {
      setFeedback('Prestation mise à jour.');
      setSelectedEngagementId(updated.id);
      setEditDraft(buildDraftFromEngagement(updated));
    }
  };

  const handleRemove = (engagementId: string) => {
    removeEngagement(engagementId);
    setFeedback('Prestation supprimée.');
    setSelectedEngagementIds((current) => current.filter((id) => id !== engagementId));
    if (selectedEngagementId === engagementId) {
      setSelectedEngagementId(null);
      setEditDraft(null);
    }
  };

  const openCreation = () => {
    setFeedback(null);
    setCreationMode('service');
    setCreationDraft({
      ...baseDraft,
      status: 'planifié',
    });
    setIsAddingClient(false);
    setSelectedEngagementId(null);
    setEditDraft(null);
  };

  const closeCreation = () => {
    setCreationMode(null);
    setHighlightQuote(false);
  };

  const anyVatEnabled = engagements.some((engagement) => {
    const companyRef = engagement.companyId ? companiesById.get(engagement.companyId) : null;
    const resolvedVat = engagement.invoiceVatEnabled ?? (companyRef ? companyRef.vatEnabled : vatEnabled);
    return resolvedVat;
  });
  const totalColumnLabel = anyVatEnabled ? 'Total TTC' : 'Total';
  const columns = [
    <div key="engagement-select" className="flex items-center gap-2">
      <input
        type="checkbox"
        className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
        aria-label="Sélectionner toutes les prestations"
        checked={allEngagementsSelected}
        onChange={toggleSelectAllEngagements}
      />
      <span>Document</span>
    </div>,
    'Client & entreprise',
    'Support',
    'Service & prestations',
    'Durée totale',
    'Montant HT',
    ...(anyVatEnabled ? ['TVA'] : []),
    totalColumnLabel,
    'Statut',
    'Actions',
  ];

  const rows = filteredEngagements.map((engagement) => {
    const client = clientsById.get(engagement.clientId);
    const company = engagement.companyId ? companiesById.get(engagement.companyId) : undefined;
    const service = servicesById.get(engagement.serviceId);
    const optionsSelected =
      service?.options.filter((option) => engagement.optionIds.includes(option.id)) ?? ([] as ServiceOption[]);
    const totals = computeEngagementTotals(engagement);
    const vatEnabledForRow = engagement.invoiceVatEnabled ?? (company?.vatEnabled ?? vatEnabled);
    const vatAmount = vatEnabledForRow ? totals.price * vatMultiplier : 0;
    const totalWithVat = totals.price + vatAmount;
    const finalTotal = totalWithVat + totals.surcharge;
    const documentNumber = getEngagementDocumentNumber(engagement);
    const isSelected = selectedEngagementIds.includes(engagement.id);

    return [
      <div key={`${engagement.id}-doc`} className="flex items-start gap-3">
        <input
          type="checkbox"
          className="table-checkbox mt-0.5 h-4 w-4 flex-shrink-0 rounded focus:ring-primary/40"
          checked={isSelected}
          onChange={() => toggleEngagementSelection(engagement.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Sélectionner ${documentLabels[engagement.kind]} ${documentNumber}`}
        />
        <div className="space-y-1 text-[11px] text-slate-600">
          <p className="truncate text-sm font-semibold text-slate-900" title={documentLabels[engagement.kind]}>
            {documentLabels[engagement.kind]}
          </p>
          <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">{documentNumber}</p>
          <p className="text-[10px] text-slate-500">{formatDate(engagement.scheduledAt)}</p>
        </div>
      </div>,
      <div key={`${engagement.id}-client`} className="space-y-1 text-[11px] text-slate-600">
        <p className="truncate font-semibold text-slate-900" title={client?.name ?? 'Client inconnu'}>
          {client?.name ?? 'Client inconnu'}
        </p>
        <p className="truncate text-[10px] text-slate-500" title={company?.name ?? '—'}>
          {company?.name ?? '—'}
        </p>
      </div>,
      <div key={`${engagement.id}-support`} className="space-y-1 text-[11px] text-slate-600">
        <p>{engagement.supportType}</p>
        {engagement.supportDetail && <p className="text-[11px] text-slate-500">{engagement.supportDetail}</p>}
      </div>,
      <div key={`${engagement.id}-service`} className="space-y-1 text-[11px] text-slate-600">
        <p className="truncate font-semibold text-slate-900" title={service?.name ?? 'Service archivé'}>
          {service?.name ?? 'Service archivé'}
        </p>
        <p className="text-[10px] text-slate-500" title={
          optionsSelected.length > 0
            ? optionsSelected.map((option) => option.label).join(' • ')
            : 'Aucune prestation sélectionnée'
        }>
          {optionsSelected.length > 0
            ? optionsSelected.map((option) => option.label).join(' • ')
            : 'Aucune prestation sélectionnée'}
        </p>
      </div>,
      <span key={`${engagement.id}-duration`} className="text-[11px] font-medium text-slate-700">
        {totals.duration ? formatDuration(totals.duration) : '—'}
      </span>,
      <span key={`${engagement.id}-ht`} className="text-[11px] font-semibold text-slate-800">
        {formatCurrency(totals.price)}
      </span>,
      ...(vatEnabledForRow
        ? [
            <span key={`${engagement.id}-vat`} className="text-[11px] text-slate-700">
              {formatCurrency(vatAmount)}
            </span>,
          ]
        : []),
      <div key={`${engagement.id}-ttc`} className="text-[11px] font-semibold text-slate-900">
        <p>{formatCurrency(finalTotal)}</p>
        {totals.surcharge > 0 && (
          <p className="text-[10px] font-normal text-slate-500">
            Majoration incluse : {formatCurrency(totals.surcharge)}
          </p>
        )}
      </div>,
      <div key={`${engagement.id}-status`} className="text-[11px]">
        <StatusPill status={engagement.status} />
      </div>,
      <div key={`${engagement.id}-actions`} className="flex flex-wrap items-center gap-1.5">
        {hasPermission('service.edit') && (
          <RowActionButton
            label="Modifier"
            onClick={() => {
              setCreationMode(null);
              setSelectedEngagementId(engagement.id);
              setEditDraft(buildDraftFromEngagement(engagement));
            }}
          >
            <IconEdit />
          </RowActionButton>
        )}
        {hasPermission('service.duplicate') && (
          <RowActionButton label="Dupliquer" onClick={() => openQuoteFromEngagement(engagement)}>
            <IconDuplicate />
          </RowActionButton>
        )}
        <RowActionButton
          label={engagement.kind === 'devis' ? 'Télécharger devis' : 'Créer devis'}
          onClick={() => {
            void handleGenerateQuote(engagement);
          }}
        >
          <IconDocument />
        </RowActionButton>
        {hasPermission('service.invoice') && (
          <RowActionButton
            label={engagement.kind === 'facture' ? 'Télécharger facture' : 'Créer facture'}
            onClick={() => {
              void handleGenerateInvoice(engagement);
            }}
          >
            <IconReceipt />
          </RowActionButton>
        )}
        {hasPermission('service.print') && (
          <RowActionButton
            label="Imprimer"
            onClick={() => {
              void handleGenerateInvoice(engagement, 'print');
            }}
          >
            <IconPrinter />
          </RowActionButton>
        )}
        {hasPermission('service.email') && (
          <RowActionButton
            label={engagement.kind === 'devis' ? 'Envoyer devis' : 'Envoyer facture'}
            onClick={() => {
              if (engagement.kind === 'devis') {
                void handleGenerateQuote(engagement, 'email');
              } else {
                void handleGenerateInvoice(engagement, 'email');
              }
            }}
          >
            <IconPaperPlane />
          </RowActionButton>
        )}
        {hasPermission('service.archive') && (
          <RowActionButton label="Archiver" tone="danger" onClick={() => handleRemove(engagement.id)}>
            <IconArchive />
          </RowActionButton>
        )}
      </div>,
    ];
  });

  const engagementRowClassName = (index: number) => {
    const engagement = filteredEngagements[index];
    if (!engagement) {
      return '';
    }
    const isSelected = selectedEngagementIds.includes(engagement.id);
    const isActive = selectedEngagementId === engagement.id;
    return clsx(
      'border-l-2 border-transparent',
      (isSelected || isActive) && 'border-primary/60 bg-primary/5'
    );
  };

  const creationSelectedOptions =
    creationSelectedService?.options
      .filter((option) => creationDraft.optionIds.includes(option.id))
      .map((option) => ({
        option,
        override: resolveOptionOverride(option, creationDraft.optionOverrides[option.id]),
      })) ?? [];
  const editSelectedOptions =
    editSelectedService?.options
      .filter((option) => (editDraft?.optionIds.includes(option.id) ?? false))
      .map((option) => ({
        option,
        override: resolveOptionOverride(option, editDraft?.optionOverrides?.[option.id]),
      })) ?? [];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Prestations suivies</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.count}</p>
          <p className="text-xs text-slate-500">{summary.pipeline} en cours de traitement</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">CA HT cumulé</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatCurrency(summary.revenue)}</p>
          <p className="text-xs text-slate-500">
            HT hors majorations — Majoration cumulée{' '}
            <span className="font-medium text-slate-700">
              {summary.surcharge ? formatCurrency(summary.surcharge) : '—'}
            </span>
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Durée planifiée</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{formatDuration(summary.duration)}</p>
          <p className="text-xs text-slate-500">Somme des interventions programmées</p>
        </Card>
      </div>

      <Card
        title="Service"
        description="Visualisez et pilotez chaque prestation"
        action={
          hasPermission('service.create') ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => openCreation()}>
                Créer un service
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="service-search">
              Recherche
            </label>
            <input
              id="service-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Client, service, prestation..."
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="service-status">
              Statut
            </label>
            <select
              id="service-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as EngagementStatus | 'Tous')}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Tous">Tous</option>
              <option value="brouillon">Brouillon</option>
              <option value="envoyé">Envoyé</option>
              <option value="planifié">Planifié</option>
              <option value="réalisé">Réalisé</option>
              <option value="annulé">Annulé</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="service-kind">
              Type
            </label>
            <select
              id="service-kind"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as EngagementKind | 'Tous')}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Tous">Tous</option>
              <option value="service">Service</option>
              <option value="devis">Devis</option>
              <option value="facture">Facture</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="service-company">
              Entreprise
            </label>
            <select
              id="service-company"
              value={companyFilter}
              onChange={(event) => setCompanyFilter(event.target.value as 'Toutes' | string)}
              className="mt-1 w-full rounded-soft border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="Toutes">Toutes</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedback && <p className="mt-4 text-xs font-medium text-primary">{feedback}</p>}

        {mailPrompt && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-semibold text-slate-700">
                Envoyer les informations du service « {mailPrompt.serviceName} »
              </span>
              {clientsWithEmail.length ? (
                <select
                  value={mailPromptClientId}
                  onChange={(event) => setMailPromptClientId(event.target.value)}
                  className="rounded-soft border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  {clientsWithEmail.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-400">Aucun contact avec e-mail disponible.</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="xs" type="button" onClick={cancelMailPrompt}>
                Annuler
              </Button>
              <Button
                size="xs"
                type="button"
                onClick={submitMailPrompt}
                disabled={!mailPromptClientId || !clientsWithEmail.length}
              >
                Ouvrir le mail
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="table-checkbox h-4 w-4 rounded focus:ring-primary/40"
                checked={allEngagementsSelected}
                onChange={toggleSelectAllEngagements}
              />
              <span>Sélectionner tout</span>
            </div>
            {!!selectedEngagementIds.length && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-400">|</span>
                <span>{selectedEngagementIds.length} sélectionnées</span>
                {hasPermission('service.print') && (
                  <Button variant="ghost" size="xs" onClick={handleBulkPrintEngagements}>
                    Imprimer
                  </Button>
                )}
                {hasPermission('service.email') && (
                  <Button variant="ghost" size="xs" onClick={handleBulkSendEngagements}>
                    Envoyer
                  </Button>
                )}
                {hasPermission('service.archive') && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleBulkArchiveEngagements}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    Archiver
                  </Button>
                )}
                <button
                  type="button"
                  onClick={clearSelectedEngagements}
                  className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
                >
                  Vider la sélection
                </button>
              </div>
            )}
          </div>

          <Table
            columns={columns}
            rows={rows}
            tone="plain"
            density="compact"
            striped={false}
            bordered={false}
            dividers={false}
            footer={<p>{rows.length} prestations</p>}
            rowClassName={engagementRowClassName}
          />
        </div>
      </Card>

      {creationMode && (
        <div ref={creationSectionRef}>
          <Card
            title="Nouveau service"
            description="Sélectionnez client, prestations et support"
            action={
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
                onClick={closeCreation}
              >
                Fermer
              </button>
            }
          >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await handleCreateService();
            }}
            className="space-y-5 text-sm text-slate-700"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:gap-x-3 md:gap-y-2">
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="create-client">
                  Client
                </label>
                <select
                  id="create-client"
                  value={creationDraft.clientId}
                  onChange={(event) => setCreationDraft((draft) => ({ ...draft, clientId: event.target.value }))}
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Sélectionner…</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsAddingClient((value) => !value)}
                  className="self-start text-[11px] font-semibold tracking-[0.2em] text-slate-500 underline decoration-slate-300 decoration-1 underline-offset-4 hover:text-slate-800"
                >
                  {isAddingClient ? 'Annuler l’ajout' : 'Ajouter un client'}
                </button>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="create-company">
                  Entreprise
                </label>
                <select
                  id="create-company"
                  value={creationDraft.companyId}
                  onChange={(event) =>
                    setCreationDraft((draft) => ({ ...draft, companyId: event.target.value as string | '' }))
                  }
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Sélectionner…</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="create-status">
                  Statut
                </label>
                <select
                  id="create-status"
                  value={creationDraft.status}
                  onChange={(event) =>
                    setCreationDraft((draft) => ({ ...draft, status: event.target.value as EngagementStatus }))
                  }
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="envoyé">Envoyé</option>
                  <option value="planifié">Planifié</option>
                  <option value="réalisé">Réalisé</option>
                  <option value="annulé">Annulé</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="create-date">
                  Date prévue
                </label>
                <input
                  id="create-date"
                  type="date"
                  value={creationDraft.scheduledAt}
                  onChange={(event) =>
                    setCreationDraft((draft) => ({ ...draft, scheduledAt: event.target.value }))
                  }
                  className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {isAddingClient && (
                <div className="md:col-span-12 rounded-soft border border-dashed border-slate-300 bg-white/80 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <input
                      required
                      value={quickClientDraft.name}
                      onChange={(event) =>
                        setQuickClientDraft((draft) => ({ ...draft, name: event.target.value }))
                      }
                      placeholder="Nom de l’organisation"
                      className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      required
                      value={quickClientDraft.siret}
                      onChange={(event) =>
                        setQuickClientDraft((draft) => ({ ...draft, siret: event.target.value }))
                      }
                      placeholder="SIRET"
                      className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={quickClientDraft.email}
                      onChange={(event) =>
                        setQuickClientDraft((draft) => ({ ...draft, email: event.target.value }))
                      }
                      placeholder="Email"
                      className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={quickClientDraft.phone}
                      onChange={(event) =>
                        setQuickClientDraft((draft) => ({ ...draft, phone: event.target.value }))
                      }
                      placeholder="Téléphone"
                      className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={quickClientDraft.address}
                      onChange={(event) =>
                        setQuickClientDraft((draft) => ({ ...draft, address: event.target.value }))
                      }
                      placeholder="Adresse"
                      className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={quickClientDraft.city}
                      onChange={(event) =>
                        setQuickClientDraft((draft) => ({ ...draft, city: event.target.value }))
                      }
                      placeholder="Ville"
                      className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <div className="col-span-full flex flex-wrap gap-3 text-[11px]">
                      {(['Actif', 'Prospect'] as Client['status'][]).map((status) => (
                        <label key={status} className="inline-flex items-center gap-2 text-slate-500">
                          <input
                            type="radio"
                            name="client-status"
                            value={status}
                            checked={quickClientDraft.status === status}
                            onChange={(event) =>
                              setQuickClientDraft((draft) => ({
                                ...draft,
                                status: event.target.value as Client['status'],
                              }))
                            }
                            className="accent-primary"
                          />
                          {status}
                        </label>
                      ))}
                    </div>
                    <div className="col-span-full flex justify-end">
                      <Button type="button" size="xs" onClick={handleQuickClientSubmit}>
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="md:col-span-12 rounded-soft border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Contacts destinataires
                </p>
                {creationContacts.length ? (
                  <div className="mt-2 space-y-1.5">
                    {creationContacts.map((contact) => {
                      const fullName = `${contact.firstName} ${contact.lastName}`.trim();
                      const isChecked = creationDraft.contactIds.includes(contact.id);
                      return (
                        <label
                          key={contact.id}
                          className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600 transition hover:border-primary/40"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold text-slate-800">
                              {fullName || contact.email}
                            </span>
                            {contact.isBillingDefault && (
                              <span className="text-[10px] uppercase tracking-[0.18em] text-primary">
                                Facturation par défaut
                              </span>
                            )}
                            {contact.roles.length > 0 && (
                              <span className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                                {contact.roles.map((role) => (
                                  <Tag key={`${contact.id}-${role}`}>{role}</Tag>
                                ))}
                              </span>
                            )}
                            <span className="text-[12px] text-slate-500">
                              {contact.email} {contact.mobile ? `• ${contact.mobile}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {!contact.isBillingDefault && (
                              <button
                                type="button"
                                onClick={() => setClientBillingContact(creationDraft.clientId, contact.id)}
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 hover:text-primary"
                              >
                                Défaut
                              </button>
                            )}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCreationContact(contact.id)}
                              className="h-4 w-4 accent-primary"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Ajoutez un contact sur la fiche client pour sélectionner les destinataires.
                  </p>
                )}
              </div>
              <div className="md:col-span-12 flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Support
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['Voiture', 'Canapé', 'Textile'] as SupportType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCreationDraft((draft) => ({ ...draft, supportType: type }))}
                      className={clsx(
                        'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        creationDraft.supportType === type
                          ? 'border-slate-600 text-slate-900'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input
                  value={creationDraft.supportDetail}
                  onChange={(event) =>
                    setCreationDraft((draft) => ({ ...draft, supportDetail: event.target.value }))
                  }
                  placeholder="Détail du support (ex. SUV, 3 places…)"
                  className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="md:col-span-12 flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="create-service">
                  Service
                </label>
                <select
                  id="create-service"
                  value={creationDraft.serviceId}
                  onChange={(event) =>
                    setCreationDraft((draft) => ({
                      ...draft,
                      serviceId: event.target.value,
                      optionIds: [],
                      optionOverrides: {},
                    }))
                  }
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Sélectionner…</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-12 space-y-3 rounded-soft border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Prestations</p>
                  <div className="text-right text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <p>Durée estimée</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {creationTotals.duration ? formatDuration(creationTotals.duration) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {creationVatEnabled
                        ? `${formatCurrency(creationTotals.price)} HT · ${formatCurrency(creationTotalTtc)} TTC`
                        : `${formatCurrency(creationTotals.price)} HT`}
                    </p>
                  </div>
                </div>
                {creationSelectedService ? (
                  creationSelectedService.options.map((option) => {
                    const selected = creationDraft.optionIds.includes(option.id);
                    const override = resolveOptionOverride(option, creationDraft.optionOverrides[option.id]);
                    return (
                      <div
                        key={option.id}
                        className={clsx(
                          'rounded border px-3 py-2 transition',
                          selected
                            ? 'border-primary/40 bg-white text-slate-700 shadow-sm'
                            : 'border-slate-200 bg-white/70 text-slate-600'
                        )}
                      >
                        <label className="flex items-center justify-between gap-3 text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleCreationOption(option.id)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="text-slate-800">{option.label}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatCurrency(option.unitPriceHT)} HT · {formatDuration(option.defaultDurationMin)}
                          </span>
                        </label>
                        {option.description && (
                          <p className="ml-6 mt-1 text-[11px] text-slate-500">{option.description}</p>
                        )}
                        {selected && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Quantité
                              </span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={override.quantity}
                                onChange={(event) =>
                                  updateCreationOverride(option.id, {
                                    quantity: Number.parseFloat(event.target.value) || 1,
                                  })
                                }
                                className="rounded-soft border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Durée (min)
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={override.durationMin}
                                onChange={(event) =>
                                  updateCreationOverride(option.id, {
                                    durationMin: Number.parseFloat(event.target.value) || 0,
                                  })
                                }
                                className="rounded-soft border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Prix HT (€)
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={override.unitPriceHT}
                                onChange={(event) =>
                                  updateCreationOverride(option.id, {
                                    unitPriceHT: Number.parseFloat(event.target.value) || 0,
                                  })
                                }
                                className="rounded-soft border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-slate-400">Sélectionnez un service pour afficher les prestations.</p>
                )}
              </div>
            </div>



            <div
              className={clsx(
                'grid gap-3 rounded-soft border border-slate-200 bg-slate-50/60 p-3 text-[11px] uppercase tracking-[0.2em] text-slate-500',
                creationVatEnabled ? 'md:grid-cols-4' : 'md:grid-cols-3'
              )}
            >
              <div>
                <p className="text-slate-400">Durée totale</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {creationTotals.duration ? formatDuration(creationTotals.duration) : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Montant HT</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(creationTotals.price)}</p>
              </div>
              {creationVatEnabled && (
                <div>
                  <p className="text-slate-400">{vatLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(creationVatAmount)}</p>
                </div>
              )}
              <div>
                <label className="text-slate-400" htmlFor="creation-surcharge">
                  Majoration (TTC)
                </label>
                <input
                  id="creation-surcharge"
                  type="number"
                  min="0"
                  step="0.5"
                  value={creationDraft.additionalCharge}
                  onChange={(event) => {
                    const value = Number.parseFloat(event.target.value);
                    setCreationDraft((draft) => ({
                      ...draft,
                      additionalCharge: Number.isNaN(value) ? 0 : Math.max(0, value),
                    }));
                  }}
                  className="mt-1 w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
              <div>
                {creationSelectedOptions.length > 0 ? (
                  <p>
                    Prestations sélectionnées :{' '}
                    <span className="font-medium text-slate-700">
                      {creationSelectedOptions
                        .map(({ option, override }) =>
                          `${override.quantity.toFixed(0)} × ${option.label}`
                        )
                        .join(' • ')}
                    </span>
                  </p>
                ) : (
                  <p>Aucune prestation sélectionnée pour le moment.</p>
                )}
                {creationTotals.surcharge > 0 && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Majoration incluse : {formatCurrency(creationTotals.surcharge)}
                  </p>
                )}
              </div>
              <div className="text-right text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {creationVatEnabled ? 'Total TTC' : 'Total'}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(creationTotalTtc)}</p>
              </div>
            </div>

            {highlightQuote && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                Ce lead attend un devis – utilisez « Créer et envoyer un devis ».
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit" size="sm">
                Créer le service
              </Button>
            </div>
          </form>
        </Card>
        </div>
      )}

      {selectedEngagement && editDraft && (
        <div ref={editSectionRef}>
          <Card
            title="Détails de la prestation"
            description="Modifier les informations avant validation"
            padding="sm"
            action={
              <button
                type="button"
                className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
                onClick={() => {
                  setSelectedEngagementId(null);
                  setEditDraft(null);
                }}
              >
                Fermer
              </button>
            }
          >
          <form onSubmit={handleEditSubmit} className="space-y-5 text-sm text-slate-700">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:gap-x-3 md:gap-y-2">
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-client">
                  Client
                </label>
                <select
                  id="edit-client"
                  value={editDraft.clientId}
                  onChange={(event) => setEditDraft((draft) => (draft ? { ...draft, clientId: event.target.value } : draft))}
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Sélectionner…</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-company">
                  Entreprise
                </label>
                <select
                  id="edit-company"
                  value={editDraft.companyId}
                  onChange={(event) =>
                    setEditDraft((draft) => (draft ? { ...draft, companyId: event.target.value as string | '' } : draft))
                  }
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Sélectionner…</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-status">
                  Statut
                </label>
                <select
                  id="edit-status"
                  value={editDraft.status}
                  onChange={(event) =>
                    setEditDraft((draft) => (draft ? { ...draft, status: event.target.value as EngagementStatus } : draft))
                  }
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="brouillon">Brouillon</option>
                  <option value="envoyé">Envoyé</option>
                  <option value="planifié">Planifié</option>
                  <option value="réalisé">Réalisé</option>
                  <option value="annulé">Annulé</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-6">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-date">
                  Date prévue
                </label>
                <input
                  id="edit-date"
                  type="date"
                  value={editDraft.scheduledAt}
                  onChange={(event) => setEditDraft((draft) => (draft ? { ...draft, scheduledAt: event.target.value } : draft))}
                  className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="md:col-span-12 rounded-soft border border-slate-200 bg-slate-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Contacts destinataires
                </p>
                {editContacts.length ? (
                  <div className="mt-2 space-y-1.5">
                    {editContacts.map((contact) => {
                      const fullName = `${contact.firstName} ${contact.lastName}`.trim();
                      const isChecked = editDraft.contactIds.includes(contact.id);
                      return (
                        <label
                          key={contact.id}
                          className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-600 transition hover:border-primary/40"
                        >
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-semibold text-slate-800">{fullName || contact.email}</span>
                            {contact.isBillingDefault && (
                              <span className="text-[10px] uppercase tracking-[0.18em] text-primary">Facturation par défaut</span>
                            )}
                            {contact.roles.length > 0 && (
                              <span className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                                {contact.roles.map((role) => (
                                  <Tag key={`${contact.id}-${role}`}>{role}</Tag>
                                ))}
                              </span>
                            )}
                            <span className="text-[12px] text-slate-500">
                              {contact.email} {contact.mobile ? `• ${contact.mobile}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {!contact.isBillingDefault && (
                              <button
                                type="button"
                                onClick={() => setClientBillingContact(editDraft.clientId, contact.id)}
                                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 hover:text-primary"
                              >
                                Défaut
                              </button>
                            )}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleEditContact(contact.id)}
                              className="h-4 w-4 accent-primary"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Aucun contact actif pour cette organisation.
                  </p>
                )}
              </div>
              <div className="md:col-span-12 flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                  Support
                </span>
                <div className="flex flex-wrap gap-2">
                  {(['Voiture', 'Canapé', 'Textile'] as SupportType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditDraft((draft) => (draft ? { ...draft, supportType: type } : draft))}
                      className={clsx(
                        'rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        editDraft.supportType === type
                          ? 'border-slate-600 text-slate-900'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800'
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <input
                  value={editDraft.supportDetail}
                  onChange={(event) => setEditDraft((draft) => (draft ? { ...draft, supportDetail: event.target.value } : draft))}
                  placeholder="Détail du support"
                  className="w-full rounded-soft border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="md:col-span-12 flex flex-col gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400" htmlFor="edit-service">
                  Service
                </label>
                <select
                  id="edit-service"
                  value={editDraft.serviceId}
                  onChange={(event) =>
                    setEditDraft((draft) =>
                      draft
                        ? {
                            ...draft,
                            serviceId: event.target.value,
                            optionIds: [],
                            optionOverrides: {},
                          }
                        : draft
                    )
                  }
                  className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Sélectionner…</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-12 space-y-3 rounded-soft border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Prestations</p>
                  <div className="text-right text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <p>Durée estimée</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {editTotals.duration ? formatDuration(editTotals.duration) : '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {editVatEnabled
                        ? `${formatCurrency(editTotals.price)} HT · ${formatCurrency(editTotalTtc)}`
                        : `${formatCurrency(editTotals.price)} HT`}
                    </p>
                  </div>
                </div>
                {editSelectedService ? (
                  editSelectedService.options.map((option) => {
                    const selected = editDraft.optionIds.includes(option.id);
                    const override = resolveOptionOverride(option, editDraft.optionOverrides?.[option.id]);
                    return (
                      <div
                        key={option.id}
                        className={clsx(
                          'rounded border px-3 py-2 transition',
                          selected
                            ? 'border-primary/40 bg-white text-slate-700 shadow-sm'
                            : 'border-slate-200 bg-white/70 text-slate-600'
                        )}
                      >
                        <label className="flex items-center justify-between gap-3 text-xs font-medium">
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleEditOption(option.id)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="text-slate-800">{option.label}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {formatCurrency(option.unitPriceHT)} HT · {formatDuration(option.defaultDurationMin)}
                          </span>
                        </label>
                        {option.description && (
                          <p className="ml-6 mt-1 text-[11px] text-slate-500">{option.description}</p>
                        )}
                        {selected && (
                          <div className="mt-3 grid gap-2 sm:grid-cols-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Quantité
                              </span>
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={override.quantity}
                                onChange={(event) =>
                                  updateEditOverride(option.id, {
                                    quantity: Number.parseFloat(event.target.value) || 1,
                                  })
                                }
                                className="rounded-soft border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Durée (min)
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="5"
                                value={override.durationMin}
                                onChange={(event) =>
                                  updateEditOverride(option.id, {
                                    durationMin: Number.parseFloat(event.target.value) || 0,
                                  })
                                }
                                className="rounded-soft border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Prix HT (€)
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={override.unitPriceHT}
                                onChange={(event) =>
                                  updateEditOverride(option.id, {
                                    unitPriceHT: Number.parseFloat(event.target.value) || 0,
                                  })
                                }
                                className="rounded-soft border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[11px] text-slate-400">Choisissez un service pour afficher les prestations.</p>
                )}
              </div>
            </div>



            <div
              className={clsx(
                'grid gap-3 rounded-soft border border-slate-200 bg-slate-50/60 p-3 text-[11px] uppercase tracking-[0.2em] text-slate-500',
                editVatEnabled ? 'md:grid-cols-4' : 'md:grid-cols-3'
              )}
            >
              <div>
                <p className="text-slate-400">Durée totale</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {editTotals.duration ? formatDuration(editTotals.duration) : '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Montant HT</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(editTotals.price)}</p>
              </div>
              {editVatEnabled && (
                <div>
                  <p className="text-slate-400">{vatLabel}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(editVatAmount)}</p>
                </div>
              )}
              <div>
                <label className="text-slate-400" htmlFor="edit-surcharge">
                  Majoration (TTC)
                </label>
                <input
                  id="edit-surcharge"
                  type="number"
                  min="0"
                  step="0.5"
                  value={editDraft.additionalCharge}
                  onChange={(event) => {
                    const value = Number.parseFloat(event.target.value);
                    setEditDraft((draft) =>
                      draft
                        ? {
                            ...draft,
                            additionalCharge: Number.isNaN(value) ? 0 : Math.max(0, value),
                          }
                        : draft
                    );
                  }}
                  className="mt-1 w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <div>
                <p className="text-sm font-semibold text-slate-800">TVA pour la facture</p>
                <p className="text-[10px] text-slate-500">
                  {invoiceVatOverride === null
                    ? 'Paramètre entreprise appliqué'
                    : 'Valeur personnalisée pour cette facture'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInvoiceVatToggle}
                  className={clsx(
                    'relative h-6 w-11 rounded-full border transition',
                    editVatEnabled ? 'border-primary bg-primary/90' : 'border-slate-300 bg-slate-200'
                  )}
                  aria-pressed={editVatEnabled}
                  aria-label={
                    editVatEnabled
                      ? 'Désactiver la TVA pour cette facture'
                      : 'Activer la TVA pour cette facture'
                  }
                >
                  <span
                    className={clsx(
                      'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition',
                      editVatEnabled ? 'right-1' : 'left-1'
                    )}
                  />
                </button>
                <span className="text-[11px] font-medium text-slate-700">
                  {editVatEnabled ? 'TVA activée' : 'TVA désactivée'}
                </span>
              </div>
            </div>
            {invoiceVatOverride !== null && (
              <button
                type="button"
                onClick={handleInvoiceVatReset}
                className="text-left text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400 transition hover:text-slate-600"
              >
                Revenir au paramètre entreprise
              </button>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white/70 px-3 py-2 text-xs text-slate-600">
              <div>
                {editSelectedOptions.length > 0 ? (
                  <p>
                    Prestations sélectionnées :{' '}
                    <span className="font-medium text-slate-700">
                      {editSelectedOptions
                        .map(({ option, override }) => `${override.quantity.toFixed(0)} × ${option.label}`)
                        .join(' • ')}
                    </span>
                  </p>
                ) : (
                  <p>Aucune prestation sélectionnée pour le moment.</p>
                )}
                {editTotals.surcharge > 0 && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Majoration incluse : {formatCurrency(editTotals.surcharge)}
                  </p>
                )}
              </div>
              <div className="text-right text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {editVatEnabled ? 'Total TTC' : 'Total'}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(editTotalTtc)}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="submit" size="sm">
                Mettre à jour
              </Button>
            </div>
          </form>
        </Card>
        </div>
      )}
    </div>
  );
};

export default ServicePage;
