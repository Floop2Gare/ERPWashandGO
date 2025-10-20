import { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
  tone?: 'surface' | 'tint' | 'accent';
  accent?: 'primary' | 'violet' | 'teal' | 'amber';
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
}

const paddingMap = {
  sm: 'p-3 sm:p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

const accentGradientMap: Record<NonNullable<CardProps['accent']>, string> = {
  primary: 'from-[#1848d6] via-[#2f6dff] to-[#8bb5ff] dark:from-[#1c2f66] dark:via-[#162653] dark:to-[#101c3f]',
  violet: 'from-[#6d28d9] via-[#8b5cf6] to-[#c4b5fd] dark:from-[#43237a] dark:via-[#503091] dark:to-[#31155f]',
  teal: 'from-[#0f766e] via-[#14b8a6] to-[#5eead4] dark:from-[#07514a] dark:via-[#0b6c62] dark:to-[#06423d]',
  amber: 'from-[#c2410c] via-[#f97316] to-[#fbbf24] dark:from-[#7c2d12] dark:via-[#9a3412] dark:to-[#78350f]',
};

const toneConfigMap = (
  tone: NonNullable<CardProps['tone']>,
  accent: NonNullable<CardProps['accent']>
) => {
  const accentGradient = accentGradientMap[accent] ?? accentGradientMap.primary;
  return {
    surface: {
      container:
        'border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)] dark:border-slate-700/70 dark:bg-slate-900/60',
      title: 'text-sm font-semibold text-slate-900 dark:text-slate-100',
      description: 'mt-1 text-[12px] text-slate-500 dark:text-slate-400',
      action: 'text-sm text-slate-500 dark:text-slate-300',
    },
    tint: {
      container:
        'border border-slate-200/70 bg-gradient-to-br from-white/96 via-white to-sky-50/70 shadow-[0_16px_38px_rgba(15,23,42,0.12)] dark:border-slate-700/60 dark:from-slate-900/70 dark:via-slate-900/78 dark:to-slate-900/55',
      title: 'text-sm font-semibold text-slate-900 dark:text-slate-100',
      description: 'mt-1 text-[12px] text-slate-600 dark:text-slate-300',
      action: 'text-sm text-slate-500 dark:text-slate-300',
    },
    accent: {
      container: clsx(
        'border border-transparent bg-gradient-to-br text-white shadow-[0_24px_52px_rgba(10,23,55,0.35)] ring-1 ring-white/25 dark:ring-white/15 backdrop-blur-[2px]',
        accentGradient
      ),
      title: 'text-sm font-semibold text-white',
      description: 'mt-1 text-[12px] text-white/80',
      action: 'text-sm text-white/80',
    },
  }[tone];
};

export const Card = ({
  title,
  description,
  action,
  children,
  padding = 'md',
  tone = 'surface',
  accent = 'primary',
  className,
  onClick,
  style,
}: CardProps) => {
  const toneConfig = toneConfigMap(tone, accent);
  const resolvedTitle =
    typeof title === 'string' ? (
      <h2 className={toneConfig.title}>{title}</h2>
    ) : (
      title
    );
  const resolvedDescription =
    typeof description === 'string' ? (
      <p className={toneConfig.description}>{description}</p>
    ) : (
      description
    );

  return (
    <section
      className={clsx(
        'rounded-2xl transition-shadow',
        onClick && 'cursor-pointer hover:shadow-[0_18px_36px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        'focus-within:ring-1 focus-within:ring-primary/25',
        toneConfig.container,
        paddingMap[padding],
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={style}
    >
      {(title || description || action) && (
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && resolvedTitle}
            {description && resolvedDescription}
          </div>
          {action && <div className={clsx('flex-shrink-0 text-right', toneConfig.action)}>{action}</div>}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
};
