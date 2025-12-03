import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useForm } from '@formspree/react';
import Navigation from '../components/Navigation';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { useTranslation } from '../lib/translations';
import Footer from '../components/Footer';

export default function Contact() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [state, handleSubmit] = useForm("xyzdlpln");
  const t = useTranslation(language);

  // Initialize language from URL query parameter
  useEffect(() => {
    const langFromUrl = router.query.lang as string;
    if (langFromUrl === 'zh') {
      setLanguage('zh');
    } else {
      setLanguage('en');
    }
  }, [router.query.lang]);

  // Handle language change and update URL
  const handleLanguageChange = (lang: 'en' | 'zh') => {
    setLanguage(lang);
    router.push(`/contact?lang=${lang}`, undefined, { shallow: true });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    if (!email.trim()) {
      const confirmed = window.confirm(t.contact.emailWarning);
      if (!confirmed) {
        return;
      }
    }
    handleSubmit(e);
  };

  if (state.succeeded) {
    return (
      <>
        <Head>
          <title>{t.contact.title}</title>
          <meta name="description" content={t.contact.description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>


        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
          <Navigation language={language} onLanguageChange={handleLanguageChange} />
          <main className="py-10">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.contact.successMessage}</h2>
                  <p className="text-gray-600">{t.contact.successSubtext}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  {t.contact.sendAnother}
                </button>
              </div>
            </div>
          </main>
          <Footer language={language} />
        </div>
        <Analytics />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t.contact.title}</title>
        <meta name="description" content={t.contact.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>


      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Navigation language={language} onLanguageChange={handleLanguageChange} />
        
        <main className="flex-grow py-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-indigo-700 mb-2">{t.contact.heading}</h1>
              <p className="text-gray-600 text-lg">{t.contact.subheading}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.nameLabel}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder={t.contact.namePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.emailLabel}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder={t.contact.emailPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.contact.messageLabel}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    placeholder={t.contact.messagePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  />
                </div>

                {state.errors && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {t.contact.errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state.submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition transform hover:scale-105 disabled:hover:scale-100"
                >
                  {state.submitting ? t.contact.submittingButton : t.contact.submitButton}
                </button>
              </form>
            </div>

          </div>
        </main>
        <Footer language={language} />
      </div>
      <Analytics />
    </>
  );
}
