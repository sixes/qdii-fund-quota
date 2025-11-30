import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from '../lib/translations';

interface NavigationProps {
  language: 'en' | 'zh';
  onLanguageChange: (lang: 'en' | 'zh') => void;
  activeTab?: 'index' | 'funds' | 'stocks';
  onTabChange?: (tab: 'index' | 'funds' | 'stocks') => void;
}

export default function Navigation({ language, onLanguageChange, activeTab, onTabChange }: NavigationProps) {
  const [openMenu, setOpenMenu] = useState<null | 'nasdaq100' | 'sp500' | 'dow'>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const t = useTranslation(language);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking on a link (let the link's onClick handler run first)
      if (target.tagName === 'A' || target.closest('a')) {
        return;
      }

      // Check if click is outside nav
      if (navRef.current && !navRef.current.contains(target)) {
        setOpenMenu(null);
      }
    };

    // Use mousedown to catch the event before click
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenu]);

  // Close menu on route change
  useEffect(() => {
    const handleRouteChange = () => {
      setOpenMenu(null);
      setMobileMenuOpen(false);
    };

    router.events?.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events?.off('routeChangeStart', handleRouteChange);
    };
  }, [router]);

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    onLanguageChange(lang);
    // Update URL with language parameter on all pages
    const currentPath = router.pathname;
    const currentQuery = { ...router.query, lang };

    // Just update the query parameter without redirecting
    router.push({ pathname: currentPath, query: currentQuery }, undefined, { shallow: true });
  };

  return (
    <nav className="bg-white shadow-sm" ref={navRef}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">
                  {t.nav.title}
                </h1>
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-200 focus:outline-none mr-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="hidden md:flex items-baseline space-x-4 relative">
              {/* Nasdaq 100 Dropdown */}
              <div className="relative">
                <button 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${openMenu === 'nasdaq100' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`} 
                  onClick={() => setOpenMenu(openMenu === 'nasdaq100' ? null : 'nasdaq100')}
                >
                  Nasdaq 100 ▾
                </button>
                {openMenu === 'nasdaq100' && (
                  <div className="absolute mt-1 w-44 bg-white border rounded-md shadow-lg z-50">
                    <Link
                      href={`/nasdaq100${language === 'zh' ? '?lang=zh' : ''}`}
                      className="block px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        setOpenMenu(null);
                        // Prevent navigation if already on this exact page
                        if (router.pathname === '/nasdaq100' && !router.query.view) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {t.nav.indexConstituents}
                    </Link>
                    <Link
                      href={{ pathname: '/nasdaq100', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }}
                      className="block px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        setOpenMenu(null);
                        // Prevent navigation if already on this exact page
                        if (router.pathname === '/nasdaq100' && router.query.view === 'returns') {
                          e.preventDefault();
                        }
                      }}
                    >
                      {t.nav.historicalReturns}
                    </Link>
                  </div>
                )}
              </div>

              {/* S&P 500 Dropdown */}
              <div className="relative">
                <button 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${openMenu === 'sp500' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`} 
                  onClick={() => setOpenMenu(openMenu === 'sp500' ? null : 'sp500')}
                >
                  S&P 500 ▾
                </button>
                {openMenu === 'sp500' && (
                  <div className="absolute mt-1 w-44 bg-white border rounded-md shadow-lg z-50">
                    <Link
                      href={`/sp500${language === 'zh' ? '?lang=zh' : ''}`}
                      className="block px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        setOpenMenu(null);
                        if (router.pathname === '/sp500' && !router.query.view) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {t.nav.indexConstituents}
                    </Link>
                    <Link
                      href={{ pathname: '/sp500', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }}
                      className="block px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        setOpenMenu(null);
                        if (router.pathname === '/sp500' && router.query.view === 'returns') {
                          e.preventDefault();
                        }
                      }}
                    >
                      {t.nav.historicalReturns}
                    </Link>
                  </div>
                )}
              </div>

              {/* Dow Jones 30 Dropdown */}
              <div className="relative">
                <button 
                  className={`px-3 py-2 rounded-md text-sm font-medium ${openMenu === 'dow' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`} 
                  onClick={() => setOpenMenu(openMenu === 'dow' ? null : 'dow')}
                >
                  Dow Jones 30 ▾
                </button>
                {openMenu === 'dow' && (
                  <div className="absolute mt-1 w-44 bg-white border rounded-md shadow-lg z-50">
                    <Link
                      href={`/dow${language === 'zh' ? '?lang=zh' : ''}`}
                      className="block px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        setOpenMenu(null);
                        if (router.pathname === '/dow' && !router.query.view) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {t.nav.indexConstituents}
                    </Link>
                    <Link
                      href={{ pathname: '/dow', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }}
                      className="block px-3 py-2 text-sm hover:bg-gray-100"
                      onClick={(e) => {
                        setOpenMenu(null);
                        if (router.pathname === '/dow' && router.query.view === 'returns') {
                          e.preventDefault();
                        }
                      }}
                    >
                      {t.nav.historicalReturns}
                    </Link>
                  </div>
                )}
              </div>

              {/* QDII and Mega 7+ only for Chinese */}
              {language === 'zh' && (
                <>
                  {onTabChange ? (
                    <>
                      <button
                        className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'funds' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => onTabChange('funds')}
                      >
                        {t.nav.qdii}
                      </button>
                      <button
                        className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'stocks' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                        onClick={() => onTabChange('stocks')}
                      >
                        {t.nav.mega7}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/funds?lang=zh"
                        className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        {t.nav.qdii}
                      </Link>
                      <Link
                        href="/mag7?lang=zh"
                        className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        {t.nav.mega7}
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Contact Us Button */}
            <Link
              href={language === 'zh' ? '/contact?lang=zh' : '/contact'}
              className="hidden sm:block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
            >
              {t.nav.contact}
            </Link>

            {/* Language Toggle */}
            <div className="ml-4 flex items-center">
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  className={`px-3 py-1 rounded-md text-sm font-medium transition ${language === 'en' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
                  onClick={() => handleLanguageChange('en')}
                >
                  EN
                </button>
                <button
                  className={`px-3 py-1 rounded-md text-sm font-medium transition ${language === 'zh' ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}
                  onClick={() => handleLanguageChange('zh')}
                >
                  中文
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Nasdaq 100 */}
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">Nasdaq 100</div>
                <Link
                  href={`/nasdaq100${language === 'zh' ? '?lang=zh' : ''}`}
                  className="block pl-6 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.indexConstituents}
                </Link>
                <Link
                  href={{ pathname: '/nasdaq100', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }}
                  className="block pl-6 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.historicalReturns}
                </Link>
              </div>

              {/* S&P 500 */}
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">S&P 500</div>
                <Link
                  href={`/sp500${language === 'zh' ? '?lang=zh' : ''}`}
                  className="block pl-6 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.indexConstituents}
                </Link>
                <Link
                  href={{ pathname: '/sp500', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }}
                  className="block pl-6 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.historicalReturns}
                </Link>
              </div>

              {/* Dow Jones 30 */}
              <div className="space-y-1">
                <div className="px-3 py-2 text-sm font-medium text-gray-900">Dow Jones 30</div>
                <Link
                  href={`/dow${language === 'zh' ? '?lang=zh' : ''}`}
                  className="block pl-6 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.indexConstituents}
                </Link>
                <Link
                  href={{ pathname: '/dow', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }}
                  className="block pl-6 pr-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t.nav.historicalReturns}
                </Link>
              </div>

              {/* QDII and Mega 7+ only for Chinese */}
              {language === 'zh' && (
                <>
                  {onTabChange ? (
                    <>
                      <button
                        className={`block w-full text-left px-3 py-2 text-sm font-medium ${activeTab === 'funds' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => {
                          onTabChange('funds');
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t.nav.qdii}
                      </button>
                      <button
                        className={`block w-full text-left px-3 py-2 text-sm font-medium ${activeTab === 'stocks' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => {
                          onTabChange('stocks');
                          setMobileMenuOpen(false);
                        }}
                      >
                        {t.nav.mega7}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/funds?lang=zh"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t.nav.qdii}
                      </Link>
                      <Link
                        href="/mag7?lang=zh"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {t.nav.mega7}
                      </Link>
                    </>
                  )}
                </>
              )}

              {/* Contact Us */}
              <Link
                href={language === 'zh' ? '/contact?lang=zh' : '/contact'}
                className="block px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t.nav.contact}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
