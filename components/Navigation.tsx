import React, { useState } from 'react';
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
  const router = useRouter();
  const t = useTranslation(language);

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    onLanguageChange(lang);
    // Update URL with language parameter on all pages
    const currentPath = router.pathname;
    const currentQuery = { ...router.query, lang };
    
    // Just update the query parameter without redirecting
    router.push({ pathname: currentPath, query: currentQuery }, undefined, { shallow: true });
  };

  return (
    <nav className="bg-white shadow-sm">
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
                  <div className="absolute mt-1 w-44 bg-white border rounded-md shadow-lg z-20">
                    <Link href={`/nasdaq100${language === 'zh' ? '?lang=zh' : ''}`} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {t.nav.indexConstituents}
                    </Link>
                    <Link href={{ pathname: '/nasdaq100', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
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
                  <div className="absolute mt-1 w-44 bg-white border rounded-md shadow-lg z-20">
                    <Link href={`/sp500${language === 'zh' ? '?lang=zh' : ''}`} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {t.nav.indexConstituents}
                    </Link>
                    <Link href={{ pathname: '/sp500', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
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
                  <div className="absolute mt-1 w-44 bg-white border rounded-md shadow-lg z-20">
                    <Link href={`/dow${language === 'zh' ? '?lang=zh' : ''}`} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {t.nav.indexConstituents}
                    </Link>
                    <Link href={{ pathname: '/dow', query: { view: 'returns', ...(language === 'zh' && { lang: 'zh' }) } }} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
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
                        href="/?lang=zh#funds"
                        className="px-3 py-1 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        {t.nav.qdii}
                      </Link>
                      <Link
                        href="/?lang=zh#stocks"
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
      </div>
    </nav>
  );
}
