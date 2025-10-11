import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface NavigationProps {
  language: 'en' | 'zh';
  onLanguageChange: (lang: 'en' | 'zh') => void;
  activeTab?: 'index' | 'funds' | 'stocks';
  onTabChange?: (tab: 'index' | 'funds' | 'stocks') => void;
}

export default function Navigation({ language, onLanguageChange, activeTab, onTabChange }: NavigationProps) {
  const [openMenu, setOpenMenu] = useState<null | 'nasdaq100' | 'sp500' | 'dow'>(null);
  const router = useRouter();

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    onLanguageChange(lang);
    // If switching to Chinese and not on home page, redirect to home with language parameter
    if (lang === 'zh' && router.pathname !== '/') {
      router.push('/?lang=zh');
    }
  };

  const t = {
    en: {
      title: "US Index Constituents",
      qdii: "QDII Funds",
      mega7: "Mega 7+ Stocks"
    },
    zh: {
      title: "QDII基金申购额度查询",
      indexConstituents: "指数成分股",
      qdii: "基金额度",
      mega7: "Mega 7+ 股票"
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">
                  {language === 'en' ? t.en.title : t.zh.title}
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
                    <Link href="/nasdaq100" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {language === 'en' ? 'Index Constituents' : t.zh.indexConstituents}
                    </Link>
                    <Link href={{ pathname: '/nasdaq100', query: { view: 'returns' } }} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {language === 'en' ? 'Historical Returns' : '历史回报'}
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
                    <Link href="/sp500" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {language === 'en' ? 'Index Constituents' : t.zh.indexConstituents}
                    </Link>
                    <Link href={{ pathname: '/sp500', query: { view: 'returns' } }} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {language === 'en' ? 'Historical Returns' : '历史回报'}
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
                    <Link href="/dow" className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {language === 'en' ? 'Index Constituents' : t.zh.indexConstituents}
                    </Link>
                    <Link href={{ pathname: '/dow', query: { view: 'returns' } }} className="block px-3 py-2 text-sm hover:bg-gray-100" onClick={() => setOpenMenu(null)}>
                      {language === 'en' ? 'Historical Returns' : '历史回报'}
                    </Link>
                  </div>
                )}
              </div>

              {/* QDII and Mega 7+ only for Chinese */}
              {language === 'zh' && onTabChange && (
                <>
                  <button
                    className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'funds' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => onTabChange('funds')}
                  >
                    {t.zh.qdii}
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md text-sm font-medium ${activeTab === 'stocks' ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => onTabChange('stocks')}
                  >
                    {t.zh.mega7}
                  </button>
                </>
              )}
            </div>

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
