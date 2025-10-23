import React from 'react';
import Link from 'next/link';
import { useTranslation } from '../lib/translations';

interface FooterProps {
  language: 'en' | 'zh';
}

export default function Footer({ language }: FooterProps) {
  const t = useTranslation(language);

  return (
    <footer className="bg-gray-800 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.about}</h3>
            <p className="text-sm text-gray-400">
              {t.footer.aboutText}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.quickLinks}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/about${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  {t.footer.aboutUs}
                </Link>
              </li>
              <li>
                <Link href={`/contact${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  {t.footer.contactUs}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.legal}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/terms${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  {t.footer.termsOfUse}
                </Link>
              </li>
              <li>
                <Link href={`/privacy${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  {t.footer.privacyPolicy}
                </Link>
              </li>
              <li>
                <Link href={`/disclaimer${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  {t.footer.dataDisclaimer}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t.footer.resources}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/nasdaq100${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  Nasdaq 100
                </Link>
              </li>
              <li>
                <Link href={`/sp500${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  S&P 500
                </Link>
              </li>
              <li>
                <Link href={`/dow${language === 'zh' ? '?lang=zh' : ''}`} className="hover:text-white transition">
                  Dow Jones
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} {t.footer.copyright}</p>
          <p className="mt-2">
            <a href="/sitemap.xml" className="text-gray-400 hover:text-white transition" target="_blank" rel="noopener noreferrer">
              {t.footer.sitemap}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
