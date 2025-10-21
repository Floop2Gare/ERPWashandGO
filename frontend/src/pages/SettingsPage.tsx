import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { RowActionButton } from '../components/RowActionButton';
import SignatureEditor from '../components/settings/SignatureEditor';
import {
  AuthUser,
  Company,
  EmailSignature,
  EmailSignatureScope,
  Service,
  ServiceOption,
  ServiceCategory,
  SidebarTitlePreference,
  UserProfile,
  useAppData,
} from '../store/useAppData';
import { IconDuplicate, IconEdit, IconPlus, IconTrash } from '../components/icons';
import { BRAND_BASELINE, BRAND_FULL_TITLE, BRAND_NAME } from '../lib/branding';
import { formatCurrency } from '../lib/format';

const sections = [
  { id: 'profile', label: 'Profil utilisateur' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'signatures', label: 'Signatures e-mail' },
  { id: 'catalog', label: 'Services & Produits' },
  { id: 'sidebarTitle', label: 'Titre Sidebar' },
] as const;

type SectionId = (typeof sections)[number]['id'];

type ProfileFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  avatarUrl: string;
};

type CompanyFormState = {
  id: string | null;
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  siret: string;
  vatNumber: string;
  legalNotes: string;
  vatEnabled: boolean;
  website: string;
  isDefault: boolean;
  documentHeaderTitle: string;
  documentHeaderSubtitle: string;
  documentHeaderNote: string;
  logoUrl: string;
};

type SignatureFormState = {
  id: string | null;
  scope: EmailSignatureScope;
  companyId: string | null;
  userId: string | null;
  label: string;
  html: string;
  isDefault: boolean;
};

type SidebarTitleFormState = {
  text: string;
  hidden: boolean;
};

type CatalogServiceFormState = {
  id: string | null;
  name: string;
  category: ServiceCategory;
  description: string;
  active: boolean;
};

type CatalogItemFormState = {
  id: string | null;
  serviceId: string;
  label: string;
  description: string;
  defaultDurationMin: string;
  unitPriceHT: string;
  tvaPct: string;
  active: boolean;
};

const SIGNATURE_VARIABLES = [
  { token: '{nom}', label: 'Nom complet' },
  { token: '{fonction}', label: 'Fonction' },
  { token: '{téléphone}', label: 'Téléphone' },
  { token: '{email}', label: 'E-mail' },
  { token: '{entreprise}', label: 'Entreprise' },
  { token: '{site}', label: 'Site web' },
];

const CATALOG_CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: 'Voiture', label: 'Voiture' },
  { value: 'Canapé', label: 'Canapé' },
  { value: 'Textile', label: 'Textile' },
  { value: 'Autre', label: 'Autre' },
];

const fieldLabelClass =
  'flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500';
const inputClass =
  'rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';
const textareaClass =
  'min-h-[120px] rounded-soft border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30';
const detailFormGridClass = 'grid gap-4 sm:grid-cols-2';

const formatSignatureDate = (iso: string | undefined) => {
  if (!iso) {
    return '—';
  }
  try {
    return format(new Date(iso), "dd MMM yyyy à HH'h'mm", { locale: fr });
  } catch (error) {
    return '—';
  }
};

const buildProfileForm = (profile: UserProfile | null): ProfileFormState => ({
  firstName: profile?.firstName ?? '',
  lastName: profile?.lastName ?? '',
  email: profile?.email ?? '',
  phone: profile?.phone ?? '',
  role: profile?.role ?? '',
  avatarUrl: profile?.avatarUrl ?? '',
});

const buildCompanyForm = (company: Company | null): CompanyFormState => ({
  id: company?.id ?? null,
  name: company?.name ?? '',
  email: company?.email ?? '',
  phone: company?.phone ?? '',
  address: company?.address ?? '',
  postalCode: company?.postalCode ?? '',
  city: company?.city ?? '',
  country: company?.country ?? '',
  siret: company?.siret ?? '',
  vatNumber: company?.vatNumber ?? '',
  legalNotes: company?.legalNotes ?? '',
  vatEnabled: company?.vatEnabled ?? true,
  website: company?.website ?? '',
  isDefault: company?.isDefault ?? false,
  documentHeaderTitle: company?.documentHeaderTitle ?? '',
  documentHeaderSubtitle: company?.documentHeaderSubtitle ?? '',
  documentHeaderNote: company?.documentHeaderNote ?? '',
  logoUrl: company?.logoUrl ?? '',
});

const buildSignatureForm = (
  signature: EmailSignature | null,
  scope: EmailSignatureScope,
  companyId: string | null,
  userId: string | null
): SignatureFormState => ({
  id: signature?.id ?? null,
  scope: signature?.scope ?? scope,
  companyId: signature?.companyId ?? companyId,
  userId: signature?.userId ?? userId,
  label: signature?.label ?? '',
  html: signature?.html ?? '',
  isDefault: signature?.isDefault ?? false,
});

const buildSidebarTitleForm = (preference: SidebarTitlePreference | null): SidebarTitleFormState => ({
  text: preference?.text ?? '',
  hidden: preference?.hidden ?? false,
});

const buildCatalogServiceForm = (service: Service | null): CatalogServiceFormState => ({
  id: service?.id ?? null,
  name: service?.name ?? '',
  category: service?.category ?? 'Voiture',
  description: service?.description ?? '',
  active: service?.active ?? true,
});

const buildCatalogItemForm = (serviceId: string, option: ServiceOption | null): CatalogItemFormState => ({
  id: option?.id ?? null,
  serviceId,
  label: option?.label ?? '',
  description: option?.description ?? '',
  defaultDurationMin:
    option?.defaultDurationMin !== undefined && option?.defaultDurationMin !== null
      ? String(option.defaultDurationMin)
      : '',
  unitPriceHT:
    option?.unitPriceHT !== undefined && option?.unitPriceHT !== null ? String(option.unitPriceHT) : '',
  tvaPct:
    option?.tvaPct !== undefined && option?.tvaPct !== null ? String(option.tvaPct) : '',
  active: option?.active ?? true,
});

const getInitials = (firstName: string, lastName: string) => {
  const first = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const last = lastName?.trim().charAt(0).toUpperCase() ?? '';
  return `${first}${last}`.trim() || '👤';
};

type DetailState =
  | { section: 'profile'; mode: 'edit' }
  | { section: 'companies'; mode: 'create' | 'edit'; companyId: string | null }
  | { section: 'signatures'; mode: 'create' | 'edit'; signatureId: string | null }
  | { section: 'catalog'; mode: 'create-service' }
  | { section: 'catalog'; mode: 'edit-service'; serviceId: string }
  | { section: 'catalog'; mode: 'create-item'; serviceId: string }
  | { section: 'catalog'; mode: 'edit-item'; serviceId: string; itemId: string }
  | { section: 'sidebarTitle'; mode: 'edit' };

const detailAnchors: Record<DetailState['section'], string> = {
  profile: 'profil',
  companies: 'entreprise',
  signatures: 'signature',
  catalog: 'catalogue',
  sidebarTitle: 'sidebar-title',
};

const SettingsPage = () => {
  const {
    userProfile,
    updateUserProfile,
    updateUserAvatar,
    getCurrentUser,
    authUsers,
    currentUserId,
    companies,
    addCompany,
    updateCompany,
    removeCompany,
    services,
    addService,
    updateService,
    removeService,
    addServiceOption,
    updateServiceOption,
    removeServiceOption,
    activeCompanyId,
    setActiveCompany,
    setVatEnabled,
    vatRate,
    setVatRate,
    emailSignatures,
    createEmailSignature,
    updateEmailSignatureRecord,
    removeEmailSignature,
    setDefaultEmailSignature,
    sidebarTitlePreference,
    setSidebarTitlePreference,
    resetSidebarTitlePreference,
  } = useAppData();

  const currentUser = getCurrentUser();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SectionId) ?? 'profile';
  const [activeSection, setActiveSection] = useState<SectionId>(
    sections.some((section) => section.id === initialTab) ? initialTab : 'profile'
  );

  useEffect(() => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.set('tab', activeSection);
      return next;
    });
  }, [activeSection, setSearchParams]);

  const brandBaseline = BRAND_BASELINE.trim();
  const showBrandBaseline = brandBaseline.length > 0;

  const profileSectionRef = useRef<HTMLDivElement | null>(null);
  const companiesSectionRef = useRef<HTMLDivElement | null>(null);
  const signaturesSectionRef = useRef<HTMLDivElement | null>(null);
  const catalogSectionRef = useRef<HTMLDivElement | null>(null);
  const sidebarTitleSectionRef = useRef<HTMLDivElement | null>(null);
  const detailContainerRef = useRef<HTMLDivElement | null>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const hasAppliedHashRef = useRef(false);

  const [detailState, setDetailState] = useState<DetailState | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>(() => buildProfileForm(userProfile));
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(() =>
    buildCompanyForm(companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null)
  );
  const companyLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [signatureForm, setSignatureForm] = useState<SignatureFormState>(() =>
    buildSignatureForm(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId)
  );
  const [sidebarTitleForm, setSidebarTitleForm] = useState<SidebarTitleFormState>(() =>
    buildSidebarTitleForm(sidebarTitlePreference)
  );
  const [catalogServiceForm, setCatalogServiceForm] = useState<CatalogServiceFormState>(() =>
    buildCatalogServiceForm(null)
  );
  const [catalogItemForm, setCatalogItemForm] = useState<CatalogItemFormState>(() =>
    buildCatalogItemForm(services[0]?.id ?? '', null)
  );
  const [selectedCatalogServiceId, setSelectedCatalogServiceId] = useState<string | null>(
    services[0]?.id ?? null
  );
  const [catalogServiceQuery, setCatalogServiceQuery] = useState('');
  const [catalogItemQuery, setCatalogItemQuery] = useState('');
  const [catalogServiceSort, setCatalogServiceSort] = useState<{
    key: 'name' | 'category' | 'active' | 'count';
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  const [catalogItemSort, setCatalogItemSort] = useState<{
    key: 'label' | 'duration' | 'price' | 'active' | 'tva';
    direction: 'asc' | 'desc';
  }>({ key: 'label', direction: 'asc' });
  useEffect(() => {
    setProfileForm(buildProfileForm(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (!services.length) {
      setSelectedCatalogServiceId(null);
      return;
    }
    setSelectedCatalogServiceId((current) => {
      if (current && services.some((service) => service.id === current)) {
        return current;
      }
      return services[0].id;
    });
  }, [services]);

  useEffect(() => {
    if (detailState?.section !== 'profile' && avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
    if (detailState?.section !== 'companies' && companyLogoFileInputRef.current) {
      companyLogoFileInputRef.current.value = '';
    }
  }, [detailState]);

  useEffect(() => {
    if (detailState?.section !== 'sidebarTitle') {
      setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
    }
  }, [detailState, sidebarTitlePreference]);

  const selectedCatalogService = useMemo(() => {
    if (!services.length) {
      return null;
    }
    if (selectedCatalogServiceId) {
      return services.find((service) => service.id === selectedCatalogServiceId) ?? services[0];
    }
    return services[0];
  }, [selectedCatalogServiceId, services]);

  useEffect(() => {
    if (detailState?.section !== 'catalog') {
      setCatalogServiceForm(buildCatalogServiceForm(null));
      if (selectedCatalogService) {
        setCatalogItemForm((form) => ({
          ...buildCatalogItemForm(selectedCatalogService.id, null),
          serviceId: selectedCatalogService.id,
        }));
      }
      return;
    }

    if (detailState.mode === 'create-service') {
      setCatalogServiceForm(buildCatalogServiceForm(null));
    } else if (detailState.mode === 'edit-service') {
      const targetService = services.find((service) => service.id === detailState.serviceId) ?? null;
      setCatalogServiceForm(buildCatalogServiceForm(targetService));
    }

    if (detailState.mode === 'create-item') {
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, null));
    } else if (detailState.mode === 'edit-item') {
      const parentService = services.find((service) => service.id === detailState.serviceId) ?? null;
      const targetOption = parentService?.options.find((option) => option.id === detailState.itemId) ?? null;
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, targetOption));
    }
  }, [detailState, services, selectedCatalogService]);

  const vatGloballyEnabled = useMemo(
    () => companies.some((company) => company.vatEnabled),
    [companies]
  );

  const normalizedServiceQuery = catalogServiceQuery.trim().toLowerCase();
  const normalizedItemQuery = catalogItemQuery.trim().toLowerCase();

  const sortedCatalogServices = useMemo(() => {
    const filtered = services.filter((service) => {
      if (!normalizedServiceQuery) {
        return true;
      }
      const haystack = [
        service.name,
        service.description ?? '',
        service.category,
      ]
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(normalizedServiceQuery));
    });
    const factor = catalogServiceSort.direction === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (catalogServiceSort.key) {
        case 'name':
          return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }) * factor;
        case 'category':
          return a.category.localeCompare(b.category, 'fr', { sensitivity: 'base' }) * factor;
        case 'active': {
          const aVal = a.active ? 1 : 0;
          const bVal = b.active ? 1 : 0;
          return (bVal - aVal) * factor;
        }
        case 'count':
          return (a.options.length - b.options.length) * factor;
        default:
          return 0;
      }
    });
  }, [services, normalizedServiceQuery, catalogServiceSort]);

  const sortedCatalogItems = useMemo(() => {
    if (!selectedCatalogService) {
      return [] as ServiceOption[];
    }
    const base = selectedCatalogService.options.filter((option) => {
      if (!normalizedItemQuery) {
        return true;
      }
      const haystack = [option.label, option.description ?? ''].map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(normalizedItemQuery));
    });
    const factor = catalogItemSort.direction === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => {
      switch (catalogItemSort.key) {
        case 'label':
          return a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }) * factor;
        case 'duration':
          return ((a.defaultDurationMin ?? 0) - (b.defaultDurationMin ?? 0)) * factor;
        case 'price':
          return (a.unitPriceHT - b.unitPriceHT) * factor;
        case 'active': {
          const aVal = a.active ? 1 : 0;
          const bVal = b.active ? 1 : 0;
          return (bVal - aVal) * factor;
        }
        case 'tva': {
          const aVal = a.tvaPct ?? -1;
          const bVal = b.tvaPct ?? -1;
          return (aVal - bVal) * factor;
        }
        default:
          return 0;
      }
    });
  }, [selectedCatalogService, normalizedItemQuery, catalogItemSort]);

  const toggleCatalogServiceSort = (key: typeof catalogServiceSort.key) => {
    setCatalogServiceSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const toggleCatalogItemSort = (key: typeof catalogItemSort.key) => {
    setCatalogItemSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getListSectionRef = (section: SectionId) => {
    switch (section) {
      case 'profile':
        return profileSectionRef;
      case 'companies':
        return companiesSectionRef;
      case 'signatures':
        return signaturesSectionRef;
      case 'catalog':
        return catalogSectionRef;
      case 'sidebarTitle':
        return sidebarTitleSectionRef;
      default:
        return profileSectionRef;
    }
  };

  useEffect(() => {
    if (selectedCatalogService) {
      setCatalogItemForm((form) => ({
        ...form,
        serviceId: selectedCatalogService.id,
      }));
    }
  }, [selectedCatalogService?.id]);

  const scrollToSection = (section: SectionId) => {
    const ref = getListSectionRef(section);
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        ref.current.focus({ preventScroll: true });
      }
    });
  };

  const updateHash = useCallback((hash: string | null) => {
    const url = new URL(window.location.href);
    url.hash = hash ? `#${hash}` : '';
    window.history.replaceState(null, '', url.toString());
  }, []);

  const closeDetail = (section: DetailState['section']) => {
    if (section === 'catalog') {
      const fallbackServiceId = (() => {
        if (detailState?.section === 'catalog') {
          if (detailState.mode === 'create-item' || detailState.mode === 'edit-item') {
            return detailState.serviceId;
          }
        }
        return selectedCatalogService?.id ?? services[0]?.id ?? '';
      })();
      setCatalogServiceForm(buildCatalogServiceForm(null));
      setCatalogItemForm(buildCatalogItemForm(fallbackServiceId, null));
    }
    setDetailState(null);
    updateHash(null);
    const listSection: SectionId = section;
    scrollToSection(listSection);
  };

  useEffect(() => {
    if (detailState) {
      updateHash(detailAnchors[detailState.section]);
      requestAnimationFrame(() => {
        if (detailContainerRef.current) {
          detailContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        detailHeadingRef.current?.focus({ preventScroll: true });
      });
    } else if (window.location.hash) {
      updateHash(null);
    }
  }, [detailState, updateHash]);

  useEffect(() => {
    if (hasAppliedHashRef.current) {
      return;
    }
    const currentHash = window.location.hash.replace('#', '');
    if (!currentHash) {
      hasAppliedHashRef.current = true;
      return;
    }

    if (currentHash === detailAnchors.profile) {
      setProfileForm(buildProfileForm(userProfile));
      setDetailState({ section: 'profile', mode: 'edit' });
    } else if (currentHash === detailAnchors.companies) {
      const targetCompany = companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null;
      setCompanyForm(buildCompanyForm(targetCompany));
      setDetailState({
        section: 'companies',
        mode: targetCompany ? 'edit' : 'create',
        companyId: targetCompany?.id ?? null,
      });
    } else if (currentHash === detailAnchors.signatures) {
      const targetSignature = emailSignatures[0] ?? null;
      const scope = targetSignature?.scope ?? 'company';
      const defaultCompanyId =
        scope === 'company'
          ? targetSignature?.companyId ?? activeCompanyId ?? companies[0]?.id ?? null
          : targetSignature?.companyId ?? activeCompanyId ?? companies[0]?.id ?? null;
      const defaultUserId =
        scope === 'user'
          ? targetSignature?.userId ?? currentUserId ?? authUsers[0]?.id ?? null
          : currentUserId ?? authUsers[0]?.id ?? null;
      setEditingSignature(targetSignature);
      setSignatureForm(buildSignatureForm(targetSignature, scope, defaultCompanyId, defaultUserId));
      setDetailState({
        section: 'signatures',
        mode: targetSignature ? 'edit' : 'create',
        signatureId: targetSignature?.id ?? null,
      });
    } else if (currentHash === detailAnchors.sidebarTitle) {
      setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
      setDetailState({ section: 'sidebarTitle', mode: 'edit' });
    }

    hasAppliedHashRef.current = true;
  }, [
    activeCompanyId,
    authUsers,
    companies,
    currentUserId,
    emailSignatures,
    setCompanyForm,
    setProfileForm,
    setSignatureForm,
    setSidebarTitleForm,
    sidebarTitlePreference,
    userProfile,
  ]);

  const handleProfileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfileForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClear = () => {
    setProfileForm((prev) => ({ ...prev, avatarUrl: '' }));
    if (avatarFileInputRef.current) {
      avatarFileInputRef.current.value = '';
    }
  };

  const handleAvatarSelect = () => {
    avatarFileInputRef.current?.click();
  };

  const openProfileDetail = () => {
    setProfileForm(buildProfileForm(userProfile));
    setDetailState({ section: 'profile', mode: 'edit' });
  };

  const handleProfileCancel = () => {
    setProfileForm(buildProfileForm(userProfile));
  };

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateUserProfile({
      firstName: profileForm.firstName.trim(),
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim(),
      role: profileForm.role.trim(),
    });
    updateUserAvatar(profileForm.avatarUrl.trim());
    closeDetail('profile');
  };

  useEffect(() => {
    if (detailState?.section !== 'companies') {
      setCompanyForm(
        buildCompanyForm(companies.find((company) => company.id === activeCompanyId) ?? companies[0] ?? null)
      );
    }
  }, [detailState, companies, activeCompanyId]);

  const openCompanyDetail = (company: Company | null = null) => {
    if (company) {
      setCompanyForm(buildCompanyForm(company));
    } else {
      setCompanyForm(() => ({ ...buildCompanyForm(null), isDefault: companies.length === 0 }));
    }
    setDetailState({ section: 'companies', mode: company ? 'edit' : 'create', companyId: company?.id ?? null });
  };

  const handleCompanyCancel = () => {
    const target =
      (detailState?.section === 'companies' && detailState.companyId
        ? companies.find((company) => company.id === detailState.companyId) ?? null
        : null) ?? null;
    setCompanyForm(buildCompanyForm(target));
  };

  const handleCompanyFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setCompanyForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCompanyLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanyForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompanyLogoClear = () => {
    setCompanyForm((prev) => ({ ...prev, logoUrl: '' }));
    if (companyLogoFileInputRef.current) {
      companyLogoFileInputRef.current.value = '';
    }
  };

  const handleCompanyLogoSelect = () => {
    companyLogoFileInputRef.current?.click();
  };

  const handleCompanySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedLogo = companyForm.logoUrl.startsWith('data:image')
      ? companyForm.logoUrl
      : companyForm.logoUrl.trim();
    const payload = {
      name: companyForm.name.trim(),
      email: companyForm.email.trim(),
      phone: companyForm.phone.trim(),
      website: companyForm.website.trim(),
      address: companyForm.address.trim(),
      postalCode: companyForm.postalCode.trim(),
      city: companyForm.city.trim(),
      country: companyForm.country.trim(),
      siret: companyForm.siret.trim(),
      vatNumber: companyForm.vatNumber.trim(),
      legalNotes: companyForm.legalNotes.trim(),
      documentHeaderTitle: companyForm.documentHeaderTitle.trim(),
      documentHeaderSubtitle: companyForm.documentHeaderSubtitle.trim(),
      documentHeaderNote: companyForm.documentHeaderNote.trim(),
      logoUrl: normalizedLogo,
      vatEnabled: companyForm.vatEnabled,
      isDefault: companyForm.isDefault,
    };
    if (companyForm.id) {
      const updatedCompany = updateCompany(companyForm.id, payload);
      if (updatedCompany) {
        if (updatedCompany.id === activeCompanyId || payload.isDefault) {
          setActiveCompany(updatedCompany.id);
          setVatEnabled(updatedCompany.vatEnabled);
        }
      }
    } else {
      const created = addCompany(payload);
      setActiveCompany(created.id);
      setVatEnabled(created.vatEnabled);
    }
    closeDetail('companies');
  };

  const openSidebarTitleDetail = () => {
    setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
    setDetailState({ section: 'sidebarTitle', mode: 'edit' });
  };

  const handleSidebarTitleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setSidebarTitleForm((prev) => ({ ...prev, text: value }));
  };

  const handleSidebarTitleVisibilityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSidebarTitleForm((prev) => ({ ...prev, hidden: event.target.checked }));
  };

  const handleSidebarTitleCancel = () => {
    setSidebarTitleForm(buildSidebarTitleForm(sidebarTitlePreference));
  };

  const handleSidebarTitleReset = () => {
    resetSidebarTitlePreference();
    setSidebarTitleForm(buildSidebarTitleForm({ text: BRAND_FULL_TITLE, hidden: false }));
  };

  const handleSidebarTitleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSidebarTitlePreference({
      text: sidebarTitleForm.text.trim(),
      hidden: sidebarTitleForm.hidden,
    });
    closeDetail('sidebarTitle');
  };

  const handleCompanyVatToggle = (company: Company, enabled: boolean) => {
    updateCompany(company.id, { vatEnabled: enabled });
    if (company.id === activeCompanyId) {
      setVatEnabled(enabled);
    }
  };

  const handleCatalogServiceChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setCatalogServiceForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const openCatalogServiceDetail = (service: Service | null = null) => {
    if (service) {
      setCatalogServiceForm(buildCatalogServiceForm(service));
      setDetailState({ section: 'catalog', mode: 'edit-service', serviceId: service.id });
    } else {
      setCatalogServiceForm(buildCatalogServiceForm(null));
      setDetailState({ section: 'catalog', mode: 'create-service' });
    }
  };

  const handleCatalogServiceCancel = () => {
    if (detailState?.section !== 'catalog') {
      return;
    }
    if (detailState.mode === 'edit-service') {
      const service = services.find((item) => item.id === detailState.serviceId) ?? null;
      setCatalogServiceForm(buildCatalogServiceForm(service));
    } else {
      setCatalogServiceForm(buildCatalogServiceForm(null));
    }
  };

  const handleCatalogServiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: catalogServiceForm.name.trim(),
      category: catalogServiceForm.category,
      description: catalogServiceForm.description.trim(),
      active: catalogServiceForm.active,
    };
    if (catalogServiceForm.id) {
      const updated = updateService(catalogServiceForm.id, payload);
      if (updated) {
        setSelectedCatalogServiceId(updated.id);
        setCatalogServiceForm(buildCatalogServiceForm(updated));
        closeDetail('catalog');
      }
    } else {
      const created = addService({ ...payload, options: [] });
      setSelectedCatalogServiceId(created.id);
      setCatalogServiceForm(buildCatalogServiceForm(created));
      closeDetail('catalog');
    }
  };

  const handleCatalogServiceDelete = (serviceId: string) => {
    removeService(serviceId);
    if (detailState?.section === 'catalog') {
      closeDetail('catalog');
    }
  };

  const handleCatalogServiceDuplicate = (service: Service) => {
    const baseName = service.name.trim();
    const duplicateName = baseName ? `${baseName} (copie)` : 'Service copié';
    const created = addService({
      name: duplicateName,
      category: service.category,
      description: service.description ?? '',
      active: service.active,
      options: [],
    });
    service.options.forEach((option) => {
      addServiceOption(created.id, {
        label: option.label,
        description: option.description,
        defaultDurationMin: option.defaultDurationMin,
        unitPriceHT: option.unitPriceHT,
        tvaPct: option.tvaPct ?? undefined,
        active: option.active,
      });
    });
    setSelectedCatalogServiceId(created.id);
  };

  const openCatalogItemDetail = (serviceId: string, option: ServiceOption | null = null) => {
    setCatalogItemForm(buildCatalogItemForm(serviceId, option));
    if (option) {
      setDetailState({ section: 'catalog', mode: 'edit-item', serviceId, itemId: option.id });
    } else {
      setDetailState({ section: 'catalog', mode: 'create-item', serviceId });
    }
  };

  const handleCatalogItemChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type, checked } = event.target as HTMLInputElement;
    setCatalogItemForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCatalogItemCancel = () => {
    if (detailState?.section !== 'catalog') {
      return;
    }
    if (detailState.mode === 'edit-item') {
      const service = services.find((item) => item.id === detailState.serviceId) ?? null;
      const option = service?.options.find((item) => item.id === detailState.itemId) ?? null;
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, option));
    } else if (detailState.mode === 'create-item') {
      setCatalogItemForm(buildCatalogItemForm(detailState.serviceId, null));
    }
  };

  const handleCatalogItemSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetServiceId = catalogItemForm.serviceId;
    if (!targetServiceId) {
      return;
    }
    const durationValue = Number.parseFloat(catalogItemForm.defaultDurationMin);
    const unitPriceValue = Number.parseFloat(catalogItemForm.unitPriceHT);
    const tvaValue = catalogItemForm.tvaPct.trim().length
      ? Number.parseFloat(catalogItemForm.tvaPct)
      : NaN;
    const payload = {
      label: catalogItemForm.label.trim(),
      description: catalogItemForm.description.trim(),
      defaultDurationMin: Number.isNaN(durationValue) ? 0 : durationValue,
      unitPriceHT: Number.isNaN(unitPriceValue) ? 0 : unitPriceValue,
      tvaPct: Number.isNaN(tvaValue) ? undefined : tvaValue,
      active: catalogItemForm.active,
    };
    if (catalogItemForm.id) {
      const updated = updateServiceOption(targetServiceId, catalogItemForm.id, payload);
      if (updated) {
        setSelectedCatalogServiceId(targetServiceId);
        setCatalogItemForm(buildCatalogItemForm(targetServiceId, updated));
        closeDetail('catalog');
      }
    } else {
      const created = addServiceOption(targetServiceId, payload);
      if (created) {
        setSelectedCatalogServiceId(targetServiceId);
        setCatalogItemForm(buildCatalogItemForm(targetServiceId, created));
        closeDetail('catalog');
      }
    }
  };

  const handleCatalogItemDelete = (serviceId: string, itemId: string) => {
    removeServiceOption(serviceId, itemId);
    if (detailState?.section === 'catalog') {
      closeDetail('catalog');
    }
  };

  const handleCompanyRemove = (companyId: string) => {
    removeCompany(companyId);
  };

  const handleCompanySetDefault = (company: Company) => {
    const updated = updateCompany(company.id, { isDefault: true });
    if (updated) {
      setActiveCompany(updated.id);
      setVatEnabled(updated.vatEnabled);
    }
  };

  useEffect(() => {
    if (detailState?.section !== 'signatures') {
      setEditingSignature(null);
      setSignatureForm(buildSignatureForm(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId));
    }
  }, [detailState, activeCompanyId, companies, currentUserId]);

  const openSignatureDetail = (
    signature: EmailSignature | null,
    scope: EmailSignatureScope,
    companyId: string | null,
    userId: string | null
  ) => {
    setEditingSignature(signature);
    setSignatureForm(buildSignatureForm(signature, scope, companyId, userId));
    setDetailState({ section: 'signatures', mode: signature ? 'edit' : 'create', signatureId: signature?.id ?? null });
  };

  const handleSignatureCancel = () => {
    if (detailState?.section === 'signatures' && detailState.signatureId) {
      const original = emailSignatures.find((item) => item.id === detailState.signatureId) ?? null;
      const originalScope = original?.scope ?? signatureForm.scope;
      const companyId =
        originalScope === 'company'
          ? original?.companyId ?? signatureForm.companyId ?? activeCompanyId ?? companies[0]?.id ?? null
          : original?.companyId ?? signatureForm.companyId ?? activeCompanyId ?? companies[0]?.id ?? null;
      const userId =
        originalScope === 'user'
          ? original?.userId ?? signatureForm.userId ?? currentUserId ?? authUsers[0]?.id ?? null
          : null;
      setEditingSignature(original);
      setSignatureForm(buildSignatureForm(original, originalScope, companyId, userId));
    } else {
      setEditingSignature(null);
      setSignatureForm(buildSignatureForm(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId));
    }
  };

  const closeSignatureDetail = () => {
    setEditingSignature(null);
    closeDetail('signatures');
  };

  const handleSignatureScopeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const scope = event.target.value as EmailSignatureScope;
    setSignatureForm((prev) => ({
      ...prev,
      scope,
      companyId:
        scope === 'company'
          ? prev.companyId ?? activeCompanyId ?? companies[0]?.id ?? null
          : prev.companyId,
      userId: scope === 'user' ? prev.userId ?? currentUserId ?? authUsers[0]?.id ?? null : null,
    }));
  };

  const handleSignatureInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSignatureForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignatureCompanyChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSignatureForm((prev) => ({ ...prev, companyId: value || null }));
  };

  const handleSignatureUserChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    setSignatureForm((prev) => ({ ...prev, userId: value || null }));
  };

  const handleSignatureHtmlChange = (html: string) => {
    setSignatureForm((prev) => ({ ...prev, html }));
  };

  const signaturePreviewHtml =
    signatureForm.html ||
    `<p>${userProfile.firstName} ${userProfile.lastName}<br/>${userProfile.role}<br/>${userProfile.email}</p>`;

  const handleSignatureSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signatureForm.label.trim()) {
      return;
    }
    if (signatureForm.scope === 'company' && !signatureForm.companyId) {
      return;
    }
    if (signatureForm.scope === 'user' && !signatureForm.userId) {
      return;
    }

    const targetCompanyId = signatureForm.scope === 'company' ? signatureForm.companyId : signatureForm.companyId ?? null;
    const targetUserId = signatureForm.scope === 'user' ? signatureForm.userId : signatureForm.userId ?? null;

    if (editingSignature) {
      const scopeChanged =
        signatureForm.scope !== editingSignature.scope ||
        (signatureForm.scope === 'company' && editingSignature.companyId !== targetCompanyId) ||
        (signatureForm.scope === 'user' && editingSignature.userId !== targetUserId);

      if (scopeChanged) {
        removeEmailSignature(editingSignature.id);
        const created = createEmailSignature({
          scope: signatureForm.scope,
          companyId: targetCompanyId,
          userId: targetUserId,
          label: signatureForm.label.trim(),
          html: signatureForm.html,
          isDefault: signatureForm.isDefault,
        });
        if (created.isDefault) {
          setDefaultEmailSignature(created.id);
        }
      } else {
        updateEmailSignatureRecord(editingSignature.id, {
          label: signatureForm.label.trim(),
          html: signatureForm.html,
          companyId: targetCompanyId,
          userId: targetUserId,
          isDefault: signatureForm.isDefault,
        });
        if (signatureForm.isDefault) {
          setDefaultEmailSignature(editingSignature.id);
        }
      }
    } else {
      const created = createEmailSignature({
        scope: signatureForm.scope,
        companyId: targetCompanyId,
        userId: targetUserId,
        label: signatureForm.label.trim(),
        html: signatureForm.html,
        isDefault: signatureForm.isDefault,
      });
      if (created.isDefault) {
        setDefaultEmailSignature(created.id);
      }
    }

    closeSignatureDetail();
  };

  const detailTitle = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Modifier mon profil';
      case 'companies':
        return detailState.mode === 'edit' ? "Modifier l’entreprise" : 'Ajouter une entreprise';
      case 'signatures':
        return detailState.mode === 'edit' ? 'Modifier la signature' : 'Créer une signature';
      case 'catalog':
        switch (detailState.mode) {
          case 'create-service':
            return 'Ajouter un service au catalogue';
          case 'edit-service':
            return 'Modifier le service du catalogue';
          case 'create-item':
            return 'Ajouter une prestation au service';
          case 'edit-item':
            return 'Modifier la prestation du service';
          default:
            return '';
        }
      case 'sidebarTitle':
        return 'Personnaliser le titre de la sidebar';
      default:
        return '';
    }
  })();

  const detailDescription = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Actualisez vos informations personnelles et votre photo de profil.';
      case 'companies':
        return 'Complétez les informations légales, TVA et visuels utilisés pour vos documents.';
      case 'signatures':
        return 'Définissez le contenu HTML et la portée de la signature jointe à vos e-mails.';
      case 'catalog':
        switch (detailState.mode) {
          case 'create-service':
            return 'Créez un service réutilisable pour accélérer la préparation de vos interventions.';
          case 'edit-service':
            return 'Mettez à jour les informations du service sans impacter les interventions existantes.';
          case 'create-item':
            return 'Ajoutez une prestation associée pour préparer rapidement les devis et ordres de mission.';
          case 'edit-item':
            return 'Ajustez la prestation sélectionnée tout en conservant l’historique des dossiers.';
          default:
            return '';
        }
      case 'sidebarTitle':
        return 'Adaptez le titre affiché dans la navigation latérale pour refléter votre identité.';
      default:
        return '';
    }
  })();

  const detailModeLabel = (() => {
    if (!detailState) {
      return '';
    }
    switch (detailState.section) {
      case 'profile':
        return 'Profil';
      case 'companies':
      case 'signatures':
      case 'sidebarTitle':
        return detailState.mode === 'edit' ? 'Modification' : 'Création';
      case 'catalog':
        return detailState.mode === 'create-service' || detailState.mode === 'create-item'
          ? 'Création'
          : 'Modification';
      default:
        return '';
    }
  })();
  return (
    <div className="space-y-10">
      <header className="space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{BRAND_FULL_TITLE}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Paramètres</h1>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">
          Configurez votre profil, vos entreprises, vos signatures e-mail et personnalisez le titre de la navigation pour offrir
          une expérience cohérente. Les factures reprennent automatiquement les informations de l’entreprise active.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row">
        <nav className="lg:w-64">
          <div className="rounded-soft border border-slate-200/70 bg-white p-3 shadow-sm">
            <ul className="space-y-1 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={clsx(
                      'flex w-full items-center justify-between rounded-soft px-3 py-2 text-left font-medium transition',
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700'
                    )}
                  >
                    <span>{section.label}</span>
                    {activeSection === section.id && (
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Actif</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex-1 space-y-12">
          {activeSection === 'profile' && (
            <div
              ref={profileSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Card
                padding="lg"
                className="space-y-6"
                title="Profil utilisateur"
                description="Gérez vos informations personnelles et assurez-vous qu’elles restent alignées avec vos communications."
                action={
                  <Button variant="secondary" size="sm" onClick={openProfileDetail}>
                    Modifier mon profil
                  </Button>
                }
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl font-semibold text-slate-500 shadow-inner">
                      {userProfile.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        <span>{getInitials(userProfile.firstName, userProfile.lastName)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {userProfile.firstName} {userProfile.lastName}
                      </p>
                      <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                        {userProfile.role || 'Rôle non défini'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                    <div>
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-400">E-mail</span>
                      <p className="mt-1 font-medium text-slate-700">{userProfile.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Téléphone</span>
                      <p className="mt-1 font-medium text-slate-700">{userProfile.phone || '—'}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeSection === 'companies' && (
            <div
              ref={companiesSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Entreprises</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    Centralisez vos entités légales, ajustez vos préférences TVA et laissez {BRAND_NAME} générer automatiquement
                    les factures selon l’entreprise active.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    TVA (%)
                    <input
                      type="number"
                      value={vatRate}
                      min={0}
                      max={100}
                      onChange={(event) => setVatRate(Number(event.target.value) || 0)}
                      className={`${inputClass} h-9 w-24 text-right`}
                    />
                  </label>
                  <Button onClick={() => openCompanyDetail(null)}>
                    <IconPlus />
                    Ajouter une entreprise
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {companies.map((company) => {
                  const contactSummary = [company.email, company.phone, company.website].filter(Boolean).join(' · ');
                  const addressSummaryLines = [
                    company.address,
                    [company.postalCode, company.city].filter(Boolean).join(' ').trim(),
                    company.country,
                  ].filter((value) => value && value.length > 0);
                  return (
                    <Card
                      key={company.id}
                      padding="lg"
                      className={clsx(
                        'space-y-4 border-slate-200/80 shadow-sm transition-shadow',
                        activeCompanyId === company.id && 'border-primary/50 shadow-md'
                      )}
                    >
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                              {company.logoUrl ? (
                                <img src={company.logoUrl} alt={`Logo ${company.name}`} className="h-full w-full object-contain" />
                              ) : (
                                <span>Logo</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-slate-900">{company.name}</p>
                                {company.isDefault && (
                                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                    Défaut
                                  </span>
                                )}
                                {activeCompanyId === company.id && (
                                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">SIRET {company.siret}</p>
                              {company.website && <p className="text-xs text-slate-500">{company.website}</p>}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {!company.isDefault && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompanySetDefault(company)}
                                className="px-2.5"
                              >
                                Définir par défaut
                              </Button>
                            )}
                            {activeCompanyId !== company.id && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveCompany(company.id)}
                                className="px-2.5"
                              >
                                Activer
                              </Button>
                            )}
                            <RowActionButton label="Modifier" onClick={() => openCompanyDetail(company)}>
                              <IconEdit />
                            </RowActionButton>
                            <RowActionButton label="Supprimer" tone="danger" onClick={() => handleCompanyRemove(company.id)}>
                              <IconTrash />
                            </RowActionButton>
                          </div>
                        </div>
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Coordonnées</span>
                            <span className="text-right text-slate-600">{contactSummary || '—'}</span>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Adresse</span>
                            <div className="text-right text-slate-600">
                              {addressSummaryLines.length ? (
                                addressSummaryLines.map((line, index) => (
                                  <p key={`${company.id}-address-${index}`} className="whitespace-pre">
                                    {line}
                                  </p>
                                ))
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">TVA</span>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={company.vatEnabled}
                                onChange={(event) => handleCompanyVatToggle(company, event.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                              />
                              {company.vatEnabled ? 'Activée' : 'Désactivée'}
                            </label>
                          </div>
                        </div>
                        {company.legalNotes && (
                          <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Mentions légales</p>
                            <div className="mt-2 max-h-32 overflow-hidden rounded-soft border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="whitespace-pre-line text-xs text-slate-600">{company.legalNotes}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {!companies.length && (
                  <div className="rounded-soft border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                    Ajoutez votre première entreprise pour commencer à générer des documents officiels.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'signatures' && (
            <div
              ref={signaturesSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Signatures</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Centralisez vos signatures e-mail par entreprise ou par utilisateur et définissez celles à appliquer par défaut.
                  </p>
                </div>
                <Button onClick={() => openSignatureDetail(null, 'company', activeCompanyId ?? companies[0]?.id ?? null, currentUserId)}>
                  <IconPlus />
                  Créer une signature
                </Button>
              </div>

              <div className="space-y-4">
                {emailSignatures.map((signature) => {
                  const company = signature.companyId ? companies.find((item) => item.id === signature.companyId) : null;
                  const user = signature.userId ? authUsers.find((item) => item.id === signature.userId) : null;
                  const previewHtml = signature.html || signaturePreviewHtml;
                  return (
                    <Card key={signature.id} padding="lg" className="space-y-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">{signature.label}</span>
                            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {signature.scope === 'company' ? 'Entreprise' : signature.scope === 'user' ? 'Utilisateur' : 'Globale'}
                            </span>
                            {signature.isDefault && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                                Défaut
                              </span>
                            )}
                          </div>
                          <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
                            {signature.scope === 'company' && company ? company.name : null}
                            {signature.scope === 'user' && user ? user.fullName : null}
                          </p>
                          <p className="text-xs text-slate-500">Mis à jour {formatSignatureDate(signature.updatedAt)}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={signature.isDefault ? 'subtle' : 'ghost'}
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDefaultEmailSignature(signature.id);
                            }}
                          >
                            {signature.isDefault ? 'Par défaut' : 'Définir par défaut'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openSignatureDetail(
                                signature,
                                signature.scope,
                                signature.scope === 'company'
                                  ? signature.companyId
                                  : signature.companyId ?? activeCompanyId ?? companies[0]?.id ?? null,
                                signature.scope === 'user' ? signature.userId : currentUserId
                              )
                            }
                          >
                            Modifier
                          </Button>
                          <RowActionButton label="Supprimer" tone="danger" onClick={() => removeEmailSignature(signature.id)}>
                            <IconTrash />
                          </RowActionButton>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-soft border border-slate-200 bg-white p-3">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Aperçu clair</h4>
                          <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                        <div className="rounded-soft border border-slate-800 bg-slate-900 p-3 text-slate-200">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Aperçu sombre</h4>
                          <div className="prose prose-sm max-w-none text-slate-200" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {!emailSignatures.length && (
                  <div className="rounded-soft border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                    Créez votre première signature pour accélérer vos envois de documents.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'catalog' && (
            <div
              ref={catalogSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-base font-semibold text-slate-900">Services & Produits</h2>
                <p className="text-sm text-slate-500">
                  Constituez un catalogue unifié pour accélérer la création d’interventions, devis et factures.
                </p>
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <Card padding="lg" className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900">Catalogue services</h3>
                      <p className="text-xs text-slate-500">
                        Sélectionnez un service pour afficher ses prestations associées.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => openCatalogServiceDetail(null)}>
                      <IconPlus />
                      Nouveau service
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      value={catalogServiceQuery}
                      onChange={(event) => setCatalogServiceQuery(event.target.value)}
                      placeholder="Rechercher un service…"
                      className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div className="data-table__outer">
                    <div className="data-table__scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th className="data-table__header-cell">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('name')}
                                className="data-table__sort"
                              >
                                Nom
                                {catalogServiceSort.key === 'name' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('category')}
                                className="data-table__sort"
                              >
                                Catégorie
                                {catalogServiceSort.key === 'category' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('active')}
                                className="data-table__sort"
                              >
                                Statut
                                {catalogServiceSort.key === 'active' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell data-table__header-cell--numeric">
                              <button
                                type="button"
                                onClick={() => toggleCatalogServiceSort('count')}
                                className="data-table__sort"
                              >
                                Prestations
                                {catalogServiceSort.key === 'count' && (
                                  <span className="data-table__sort-indicator">
                                    {catalogServiceSort.direction === 'asc' ? '▲' : '▼'}
                                  </span>
                                )}
                              </button>
                            </th>
                            <th className="data-table__header-cell data-table__header-cell--actions">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCatalogServices.map((service) => (
                            <tr
                              key={service.id}
                              onClick={() => setSelectedCatalogServiceId(service.id)}
                              className={clsx(
                                'data-table__row',
                                'data-table__row--selectable',
                                selectedCatalogService?.id === service.id && 'data-table__row--active'
                              )}
                            >
                              <td className="data-table__cell data-table__cell--primary">
                                <div>
                                  <span>{service.name}</span>
                                  {service.description && (
                                    <span className="data-table__meta">{service.description}</span>
                                  )}
                                </div>
                              </td>
                              <td className="data-table__cell">{service.category}</td>
                              <td className="data-table__cell data-table__cell--status">
                                <span
                                  className={clsx('status-pill', !service.active && 'status-pill--inactive')}
                                >
                                  {service.active ? 'Actif' : 'Inactif'}
                                </span>
                              </td>
                              <td className="data-table__cell data-table__cell--numeric">
                                {service.options.length}
                              </td>
                              <td className="data-table__cell data-table__cell--actions">
                                <div className="flex items-center justify-end gap-1.5">
                                  <RowActionButton
                                    label="Modifier"
                                    onClick={() => {
                                      openCatalogServiceDetail(service);
                                    }}
                                  >
                                    <IconEdit />
                                  </RowActionButton>
                                  <RowActionButton
                                    label="Dupliquer"
                                    onClick={() => {
                                      handleCatalogServiceDuplicate(service);
                                    }}
                                  >
                                    <IconDuplicate />
                                  </RowActionButton>
                                  <RowActionButton
                                    label="Supprimer"
                                    tone="danger"
                                    onClick={() => {
                                      handleCatalogServiceDelete(service.id);
                                    }}
                                  >
                                    <IconTrash />
                                  </RowActionButton>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!sortedCatalogServices.length && (
                            <tr>
                              <td colSpan={5} className="data-table__empty">
                                Aucun service enregistré pour le moment.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
                <Card padding="lg" className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-900">
                        {selectedCatalogService ? selectedCatalogService.name : 'Prestations'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedCatalogService
                          ? 'Réglez les durées et tarifs par défaut de chaque prestation.'
                          : 'Sélectionnez un service pour configurer ses prestations.'}
                      </p>
                    </div>
                    {selectedCatalogService && (
                      <Button size="sm" onClick={() => openCatalogItemDetail(selectedCatalogService.id)}>
                        <IconPlus />
                        Ajouter prestation
                      </Button>
                    )}
                  </div>
                  {selectedCatalogService ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          value={catalogItemQuery}
                          onChange={(event) => setCatalogItemQuery(event.target.value)}
                          placeholder="Rechercher une prestation…"
                          className="w-full rounded-soft border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        />
                      </div>
                      <div className="data-table__outer">
                        <div className="data-table__scroll">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th className="data-table__header-cell">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('label')}
                                    className="data-table__sort"
                                  >
                                    Libellé
                                    {catalogItemSort.key === 'label' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="data-table__header-cell data-table__header-cell--numeric">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('duration')}
                                    className="data-table__sort"
                                  >
                                    Durée
                                    {catalogItemSort.key === 'duration' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="data-table__header-cell data-table__header-cell--numeric">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('price')}
                                    className="data-table__sort"
                                  >
                                    Prix HT
                                    {catalogItemSort.key === 'price' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                {vatGloballyEnabled && (
                                  <th className="data-table__header-cell data-table__header-cell--numeric">
                                    <button
                                      type="button"
                                      onClick={() => toggleCatalogItemSort('tva')}
                                      className="data-table__sort"
                                    >
                                      TVA %
                                      {catalogItemSort.key === 'tva' && (
                                        <span className="data-table__sort-indicator">
                                          {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                        </span>
                                      )}
                                    </button>
                                  </th>
                                )}
                                <th className="data-table__header-cell">
                                  <button
                                    type="button"
                                    onClick={() => toggleCatalogItemSort('active')}
                                    className="data-table__sort"
                                  >
                                    Actif
                                    {catalogItemSort.key === 'active' && (
                                      <span className="data-table__sort-indicator">
                                        {catalogItemSort.direction === 'asc' ? '▲' : '▼'}
                                      </span>
                                    )}
                                  </button>
                                </th>
                                <th className="data-table__header-cell data-table__header-cell--actions">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedCatalogItems.map((option) => (
                                <tr key={option.id} className="data-table__row">
                                  <td className="data-table__cell data-table__cell--primary">
                                    <div>
                                      <span>{option.label}</span>
                                      {option.description && (
                                        <span className="data-table__meta">{option.description}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="data-table__cell data-table__cell--numeric">
                                    {option.defaultDurationMin ? `${option.defaultDurationMin} min` : '—'}
                                  </td>
                                  <td className="data-table__cell data-table__cell--numeric">
                                    {formatCurrency(option.unitPriceHT)}
                                  </td>
                                  {vatGloballyEnabled && (
                                    <td className="data-table__cell data-table__cell--numeric">
                                      {option.tvaPct !== undefined && option.tvaPct !== null ? `${option.tvaPct} %` : '—'}
                                    </td>
                                  )}
                                  <td className="data-table__cell data-table__cell--status">
                                    <span
                                      className={clsx('status-pill', !option.active && 'status-pill--inactive')}
                                    >
                                      {option.active ? 'Actif' : 'Inactif'}
                                    </span>
                                  </td>
                                  <td className="data-table__cell data-table__cell--actions">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <RowActionButton
                                        label="Modifier"
                                        onClick={() => {
                                          openCatalogItemDetail(selectedCatalogService.id, option);
                                        }}
                                      >
                                        <IconEdit />
                                      </RowActionButton>
                                      <RowActionButton
                                        label="Supprimer"
                                        tone="danger"
                                        onClick={() => {
                                          handleCatalogItemDelete(selectedCatalogService.id, option.id);
                                        }}
                                      >
                                        <IconTrash />
                                      </RowActionButton>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {!sortedCatalogItems.length && (
                                <tr>
                                  <td colSpan={vatGloballyEnabled ? 6 : 5} className="data-table__empty">
                                    Aucune prestation enregistrée pour ce service.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-soft border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                      Ajoutez un service pour configurer vos prestations.
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'sidebarTitle' && (
            <div
              ref={sidebarTitleSectionRef}
              tabIndex={-1}
              className="space-y-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Card padding="lg" className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900">Titre de la sidebar</p>
                    <p className="text-xs text-slate-500">
                      Personnalisez l’en-tête affiché au-dessus de la navigation principale.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={openSidebarTitleDetail}>
                    Modifier
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-soft border border-slate-200 bg-white/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Texte affiché
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {sidebarTitlePreference.text.trim() || '—'}
                    </p>
                  </div>
                  <div className="rounded-soft border border-slate-200 bg-white/60 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Visibilité
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {sidebarTitlePreference.hidden ? 'Masquée' : 'Visible'}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
      {detailState && (
        <div
          ref={detailContainerRef}
          id={detailAnchors[detailState.section]}
          className="mt-12"
        >
          <div className="rounded-soft border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  ref={(node) => {
                    detailHeadingRef.current = node;
                  }}
                  tabIndex={-1}
                  className="text-base font-semibold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {detailTitle}
                </h2>
                <p className="text-sm text-slate-500">{detailDescription}</p>
              </div>
              <span className="self-start rounded-full border border-primary/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {detailModeLabel}
              </span>
            </div>
            {detailState.section === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Prénom</span>
                      <input
                        name="firstName"
                        value={profileForm.firstName}
                        onChange={handleProfileChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Nom</span>
                      <input
                        name="lastName"
                        value={profileForm.lastName}
                        onChange={handleProfileChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  </div>
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>E-mail</span>
                      <input
                        type="email"
                        name="email"
                        value={profileForm.email}
                        onChange={handleProfileChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Téléphone</span>
                      <input name="phone" value={profileForm.phone} onChange={handleProfileChange} className={inputClass} />
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Rôle</span>
                    <input name="role" value={profileForm.role} onChange={handleProfileChange} className={inputClass} />
                  </label>
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Photo de profil</span>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-500 shadow-inner">
                        {profileForm.avatarUrl ? (
                          <img src={profileForm.avatarUrl} alt="Aperçu avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span>{getInitials(profileForm.firstName, profileForm.lastName)}</span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleAvatarSelect}>
                            Choisir une image
                          </Button>
                          {profileForm.avatarUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleAvatarClear}>
                              Retirer
                            </Button>
                          )}
                        </div>
                        <input
                          ref={avatarFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <label className={fieldLabelClass}>
                          <span>Lien externe (optionnel)</span>
                          <input
                            name="avatarUrl"
                            value={profileForm.avatarUrl}
                            onChange={handleProfileChange}
                            className={inputClass}
                            placeholder="https://…"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Les fichiers importés sont convertis en data URL et conservés pour vos prochaines connexions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleProfileCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('profile')}>
                    Fermer
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
            {detailState.section === 'companies' && (
              <form onSubmit={handleCompanySubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Nom de l’entreprise</span>
                      <input
                        name="name"
                        value={companyForm.name}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>SIRET</span>
                      <input
                        name="siret"
                        value={companyForm.siret}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  </div>
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>E-mail</span>
                      <input
                        type="email"
                        name="email"
                        value={companyForm.email}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        placeholder="contact@entreprise.fr"
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Téléphone</span>
                      <input
                        name="phone"
                        value={companyForm.phone}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        placeholder="+33 …"
                      />
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Site web (optionnel)</span>
                    <input
                      type="url"
                      name="website"
                      value={companyForm.website}
                      onChange={handleCompanyFormChange}
                      className={inputClass}
                      placeholder="https://…"
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    <span>Adresse complète</span>
                    <textarea
                      name="address"
                      value={companyForm.address}
                      onChange={handleCompanyFormChange}
                      rows={3}
                      className={textareaClass}
                      required
                    />
                  </label>
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Code postal</span>
                      <input
                        name="postalCode"
                        value={companyForm.postalCode}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Ville</span>
                      <input
                        name="city"
                        value={companyForm.city}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                        required
                      />
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Pays</span>
                    <input
                      name="country"
                      value={companyForm.country}
                      onChange={handleCompanyFormChange}
                      className={inputClass}
                      required
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    <span>Numéro de TVA intracommunautaire</span>
                    <input
                      name="vatNumber"
                      value={companyForm.vatNumber}
                      onChange={handleCompanyFormChange}
                      className={inputClass}
                      placeholder="FR…"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="vatEnabled"
                        checked={companyForm.vatEnabled}
                        onChange={handleCompanyFormChange}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      <span>Activer la TVA pour cette entreprise</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="isDefault"
                        checked={companyForm.isDefault}
                        onChange={handleCompanyFormChange}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      <span>Définir comme entreprise par défaut</span>
                    </label>
                  </div>
                  <label className={fieldLabelClass}>
                    <span>Mentions légales</span>
                    <textarea
                      name="legalNotes"
                      value={companyForm.legalNotes}
                      onChange={handleCompanyFormChange}
                      rows={4}
                      className={textareaClass}
                      placeholder="Mentions affichées sur vos devis et factures"
                    />
                  </label>
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Logo</span>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {companyForm.logoUrl ? (
                          <img src={companyForm.logoUrl} alt="Logo entreprise" className="h-full w-full object-contain" />
                        ) : (
                          <span>Logo</span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 text-xs text-slate-500">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={handleCompanyLogoSelect}>
                            Importer un fichier
                          </Button>
                          {companyForm.logoUrl && (
                            <Button type="button" variant="ghost" size="sm" onClick={handleCompanyLogoClear}>
                              Retirer
                            </Button>
                          )}
                        </div>
                        <input
                          ref={companyLogoFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/svg+xml"
                          className="hidden"
                          onChange={handleCompanyLogoUpload}
                        />
                        <label className={fieldLabelClass}>
                          <span>Lien externe (optionnel)</span>
                          <input
                            name="logoUrl"
                            value={companyForm.logoUrl}
                            onChange={handleCompanyFormChange}
                            className={inputClass}
                            placeholder="https://…"
                          />
                        </label>
                        <p className="text-[11px] text-slate-400">Les logos importés sont stockés en local pour accélérer vos exports.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className={fieldLabelClass}>
                      <span>Titre d’en-tête</span>
                      <input
                        name="documentHeaderTitle"
                        value={companyForm.documentHeaderTitle}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Sous-titre</span>
                      <input
                        name="documentHeaderSubtitle"
                        value={companyForm.documentHeaderSubtitle}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Note d’en-tête</span>
                      <input
                        name="documentHeaderNote"
                        value={companyForm.documentHeaderNote}
                        onChange={handleCompanyFormChange}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleCompanyCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('companies')}>
                    Fermer
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
            {detailState.section === 'catalog' &&
              (detailState.mode === 'create-service' || detailState.mode === 'edit-service') && (
                <form onSubmit={handleCatalogServiceSubmit} className="text-sm text-slate-600">
                  <div className="space-y-5 px-6 py-6">
                    <div className={detailFormGridClass}>
                      <label className={fieldLabelClass}>
                        <span>Nom du service</span>
                        <input
                          name="name"
                          value={catalogServiceForm.name}
                          onChange={handleCatalogServiceChange}
                          className={inputClass}
                          required
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>Catégorie</span>
                        <select
                          name="category"
                          value={catalogServiceForm.category}
                          onChange={handleCatalogServiceChange}
                          className={inputClass}
                        >
                          {CATALOG_CATEGORIES.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className={fieldLabelClass}>
                      <span>Description courte</span>
                      <textarea
                        name="description"
                        value={catalogServiceForm.description}
                        onChange={handleCatalogServiceChange}
                        rows={3}
                        className={textareaClass}
                        placeholder="Décrivez en quelques mots l’intervention proposée"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name="active"
                        checked={catalogServiceForm.active}
                        onChange={handleCatalogServiceChange}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                      />
                      <span>Service actif et sélectionnable dans la page Services</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <Button type="button" variant="ghost" onClick={handleCatalogServiceCancel}>
                      Annuler
                    </Button>
                    <Button type="button" variant="outline" onClick={() => closeDetail('catalog')}>
                      Fermer
                    </Button>
                    <Button type="submit">Enregistrer</Button>
                  </div>
                </form>
              )}
            {detailState.section === 'catalog' &&
              (detailState.mode === 'create-item' || detailState.mode === 'edit-item') &&
              (() => {
                const parentService =
                  services.find((service) => service.id === detailState.serviceId) ?? null;
                return (
                  <form onSubmit={handleCatalogItemSubmit} className="text-sm text-slate-600">
                    <div className="space-y-5 px-6 py-6">
                      <div className="rounded-soft border border-slate-200 bg-white/60 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Service rattaché
                        </p>
                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {parentService ? parentService.name : 'Service introuvable'}
                        </p>
                      </div>
                      <label className={fieldLabelClass}>
                        <span>Libellé de la prestation</span>
                        <input
                          name="label"
                          value={catalogItemForm.label}
                          onChange={handleCatalogItemChange}
                          className={inputClass}
                          required
                        />
                      </label>
                      <label className={fieldLabelClass}>
                        <span>Description</span>
                        <textarea
                          name="description"
                          value={catalogItemForm.description}
                          onChange={handleCatalogItemChange}
                          rows={3}
                          className={textareaClass}
                          placeholder="Détails visibles lors du chiffrage"
                        />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={fieldLabelClass}>
                          <span>Durée par défaut (min)</span>
                          <input
                            type="number"
                            name="defaultDurationMin"
                            min={0}
                            step={5}
                            value={catalogItemForm.defaultDurationMin}
                            onChange={handleCatalogItemChange}
                            className={inputClass}
                          />
                        </label>
                        <label className={fieldLabelClass}>
                          <span>Prix unitaire HT (€)</span>
                          <input
                            type="number"
                            name="unitPriceHT"
                            min={0}
                            step={0.01}
                            value={catalogItemForm.unitPriceHT}
                            onChange={handleCatalogItemChange}
                            className={inputClass}
                          />
                        </label>
                        {vatGloballyEnabled && (
                          <label className={fieldLabelClass}>
                            <span>TVA %</span>
                            <input
                              type="number"
                              name="tvaPct"
                              min={0}
                              step={0.1}
                              value={catalogItemForm.tvaPct}
                              onChange={handleCatalogItemChange}
                              className={inputClass}
                            />
                          </label>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          name="active"
                          checked={catalogItemForm.active}
                          onChange={handleCatalogItemChange}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                        />
                        <span>Prestation active et suggérée lors de la sélection du service</span>
                      </label>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                      <Button type="button" variant="ghost" onClick={handleCatalogItemCancel}>
                        Annuler
                      </Button>
                      <Button type="button" variant="outline" onClick={() => closeDetail('catalog')}>
                        Fermer
                      </Button>
                      <Button type="submit">Enregistrer</Button>
                    </div>
                  </form>
                );
              })()}
            {detailState.section === 'signatures' && (
              <form onSubmit={handleSignatureSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <div className={detailFormGridClass}>
                    <label className={fieldLabelClass}>
                      <span>Libellé</span>
                      <input
                        name="label"
                        value={signatureForm.label}
                        onChange={handleSignatureInputChange}
                        className={inputClass}
                        required
                      />
                    </label>
                    <label className={fieldLabelClass}>
                      <span>Type</span>
                      <select value={signatureForm.scope} onChange={handleSignatureScopeChange} className={inputClass}>
                        <option value="company">Entreprise</option>
                        <option value="user">Utilisateur</option>
                      </select>
                    </label>
                  </div>
                  {signatureForm.scope === 'company' && (
                    <label className={fieldLabelClass}>
                      <span>Entreprise</span>
                      <select
                        value={signatureForm.companyId ?? ''}
                        onChange={handleSignatureCompanyChange}
                        className={inputClass}
                        required
                      >
                        <option value="" disabled>
                          Sélectionnez une entreprise
                        </option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {signatureForm.scope === 'user' && (
                    <label className={fieldLabelClass}>
                      <span>Utilisateur</span>
                      <select
                        value={signatureForm.userId ?? ''}
                        onChange={handleSignatureUserChange}
                        className={inputClass}
                        required
                      >
                        <option value="" disabled>
                          Sélectionnez un utilisateur
                        </option>
                        {authUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="rounded-soft border border-slate-200 bg-slate-50 p-4">
                    <SignatureEditor
                      value={signatureForm.html}
                      onChange={handleSignatureHtmlChange}
                      useDefault={signatureForm.isDefault}
                      onToggleDefault={(next) => setSignatureForm((prev) => ({ ...prev, isDefault: next }))}
                      variables={SIGNATURE_VARIABLES}
                      lightPreviewHtml={signaturePreviewHtml}
                      darkPreviewHtml={signaturePreviewHtml}
                      defaultLabel={`Définir comme signature par défaut pour les envois ${BRAND_NAME}`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleSignatureCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={closeSignatureDetail}>
                    Fermer
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
            {detailState.section === 'sidebarTitle' && (
              <form onSubmit={handleSidebarTitleSubmit} className="text-sm text-slate-600">
                <div className="space-y-5 px-6 py-6">
                  <label className={fieldLabelClass}>
                    <span>Titre affiché</span>
                    <input
                      value={sidebarTitleForm.text}
                      onChange={handleSidebarTitleTextChange}
                      className={inputClass}
                      placeholder={BRAND_FULL_TITLE}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-soft border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Masquer complètement l’en-tête
                    </span>
                    <input
                      type="checkbox"
                      checked={sidebarTitleForm.hidden}
                      onChange={handleSidebarTitleVisibilityChange}
                      className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
                    />
                  </label>
                  <div className="rounded-soft border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                    <p className="font-semibold text-slate-600">Aperçu</p>
                    {!sidebarTitleForm.hidden ? (
                      <div className="mt-3 space-y-1 rounded-soft border border-slate-200 bg-white p-4 text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">{BRAND_NAME}</p>
                        {sidebarTitleForm.text.trim() && (
                          <p className="text-base font-semibold text-slate-900">{sidebarTitleForm.text.trim()}</p>
                        )}
                        {showBrandBaseline && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">{brandBaseline}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-slate-400">Zone masquée</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <Button type="button" variant="ghost" onClick={handleSidebarTitleCancel}>
                    Annuler
                  </Button>
                  <Button type="button" variant="outline" onClick={() => closeDetail('sidebarTitle')}>
                    Fermer
                  </Button>
                  <Button type="button" variant="subtle" onClick={handleSidebarTitleReset}>
                    Réinitialiser
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
