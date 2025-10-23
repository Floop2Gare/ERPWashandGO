import './mobile.css';
import { useMemo } from 'react';

const detectTouchSupport = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window ||
    (navigator as any).maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0);

const MobileTestPage = () => {
  const isTouchDevice = useMemo(() => detectTouchSupport(), []);
  const currentYear = new Date().getFullYear();

  return (
    <div className="mobile-shell">
      <header className="mobile-shell__header">
        <div className="mobile-shell__brand">
          <div className="mobile-shell__logo" aria-hidden="true">
            WG
          </div>
          <div className="mobile-shell__titles">
            <p className="mobile-shell__product">Wash&Go</p>
            <p className="mobile-shell__tagline">Interface mobile test</p>
          </div>
        </div>
      </header>
      <main className="mobile-shell__main" role="main">
        <section className="mobile-shell__card">
          <h1>Bienvenue sur la version mobile en bêta</h1>
          <p>
            Cette page est un aperçu de la future expérience mobile. Toutes les
            fonctionnalités principales restent disponibles sur la version
            bureau.
          </p>
          <ul className="mobile-shell__list">
            <li>Design responsive et épuré</li>
            <li>Navigation principale en cours de conception</li>
            <li>Actions rapides bientôt disponibles</li>
          </ul>
          <div className="mobile-shell__cta-group">
            <a className="mobile-shell__cta" href="/?ui=desktop">
              Ouvrir la version bureau
            </a>
            <a className="mobile-shell__cta mobile-shell__cta--secondary" href="mailto:support@washandgo.app">
              Contacter le support
            </a>
          </div>
        </section>
        <section className="mobile-shell__card mobile-shell__status">
          <h2>État du test</h2>
          <p>
            {isTouchDevice
              ? 'Vous utilisez un appareil tactile, la navigation est adaptée.'
              : 'Cette vue mobile peut être testée sur ordinateur via ?ui=mobile.'}
          </p>
        </section>
      </main>
      <footer className="mobile-shell__footer">
        <small>© {currentYear} Wash&Go – Version mobile en préparation</small>
      </footer>
    </div>
  );
};

export default MobileTestPage;
