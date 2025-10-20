import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
  SidebarTitlePreference,
  UserProfile,
  useAppData,
} from '../store/useAppData';
import { IconEdit, IconPlus, IconTrash } from '../components/icons';
import { BRAND_BASELINE, BRAND_FULL_TITLE, BRAND_NAME } from '../lib/branding';

const sections = [
  { id: 'profile', label: 'Profil utilisateur' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'signatures', label: 'Signatures e-mail' },
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

const SIGNATURE_VARIABLES = [
  { token: '{nom}', label: 'Nom complet' },
  { token: '{fonction}', label: 'Fonction' },
  { token: '{téléphone}', label: 'Téléphone' },
  { token: '{email}', label: 'E-mail' },
  { token: '{entreprise}', label: 'Entreprise' },
  { token: '{site}', label: 'Site web' },
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

const getInitials = (firstName: string, lastName: string) => {
  const first = firstName?.trim().charAt(0).toUpperCase() ?? '';
  const last = lastName?.trim().charAt(0).toUpperCase() ?? '';
  return `${first}${last}`.trim() || '👤';
};

type DetailState =
  | { section: 'profile'; mode: 'edit' }
  | { section: 'companies'; mode: 'create' | 'edit'; companyId: string | null }
  | { section: 'signatures'; mode: 'create' | 'edit'; signatureId: string | null }
  | { section: 'sidebarTitle'; mode: 'edit' };

const detailAnchors: Record<DetailState['section'], string> = {
  profile: 'profil',
  companies: 'entreprise',
  signatures: 'signature',
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
  useEffect(() => {
    setProfileForm(buildProfileForm(userProfile));
  }, [userProfile]);

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

  const getListSectionRef = (section: SectionId) => {
    switch (section) {
      case 'profile':
        return profileSectionRef;
      case 'companies':
        return companiesSectionRef;
      case 'signatures':
        return signaturesSectionRef;
      case 'sidebarTitle':
        return sidebarTitleSectionRef;
      default:
        return profileSectionRef;
    }
  };

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
