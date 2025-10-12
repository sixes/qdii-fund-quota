import React, { useState } from 'react';
import Head from 'next/head';
import { useForm } from '@formspree/react';
import Navigation from '../components/Navigation';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';

export default function Contact() {
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [state, handleSubmit] = useForm("xyzdlpln");
  const [message, setMessage] = useState('');

  const t = {
    en: {
      title: "Contact Us",
      description: "Send us your feedback, questions, or suggestions",
      heading: "Get in Touch",
      subheading: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
      nameLabel: "Your Name",
      namePlaceholder: "John Doe",
      emailLabel: "Your Email",
      emailPlaceholder: "john@example.com",
      messageLabel: "Your Message",
      messagePlaceholder: "Tell us what's on your mind...",
      submitButton: "Send Message",
      submittingButton: "Sending...",
      successMessage: "Thank you! Your message has been sent successfully.",
      errorMessage: "Oops! Something went wrong. Please try again.",
      emailWarning: "You haven't provided an email. We won't be able to respond. Continue anyway?",
    },
    zh: {
      title: "联系我们",
      description: "发送您的反馈、问题或建议",
      heading: "联系我们",
      subheading: "我们很乐意听取您的意见。请给我们留言，我们会尽快回复。",
      nameLabel: "您的姓名",
      namePlaceholder: "张三",
      emailLabel: "您的邮箱",
      emailPlaceholder: "zhangsan@example.com",
      messageLabel: "留言内容",
      messagePlaceholder: "告诉我们您的想法...",
      submitButton: "发送留言",
      submittingButton: "发送中...",
      successMessage: "感谢您！您的留言已成功发送。",
      errorMessage: "哎呀！出了点问题。请重试。",
      emailWarning: "您未提供邮箱，我们无法回复您的留言。确定要继续提交吗？",
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    if (!email.trim()) {
      const confirmed = window.confirm(t[language].emailWarning);
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
          <title>{t[language].title}</title>
          <meta name="description" content={t[language].description} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Script src="https://www.googletagmanager.com/gtag/js?id=G-KYCK18CLKM" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'G-KYCK18CLKM');
        `}</Script>

        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Navigation language={language} onLanguageChange={setLanguage} />
          <main className="py-10">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{t[language].successMessage}</h2>
                  <p className="text-gray-600">{language === 'en' ? "We'll get back to you soon!" : "我们会尽快回复您！"}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition"
                >
                  {language === 'en' ? 'Send Another Message' : '发送另一条留言'}
                </button>
              </div>
            </div>
          </main>
        </div>
        <Analytics />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t[language].title}</title>
        <meta name="description" content={t[language].description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Script src="https://www.googletagmanager.com/gtag/js?id=G-KYCK18CLKM" strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);} 
          gtag('js', new Date());
          gtag('config', 'G-KYCK18CLKM');
        `}</Script>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navigation language={language} onLanguageChange={setLanguage} />
        
        <main className="py-10">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-indigo-700 mb-2">{t[language].heading}</h1>
              <p className="text-gray-600 text-lg">{t[language].subheading}</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].nameLabel}
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder={t[language].namePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].emailLabel}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder={t[language].emailPlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].messageLabel}
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    required
                    placeholder={t[language].messagePlaceholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  />
                </div>

                {state.errors && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {t[language].errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={state.submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition transform hover:scale-105 disabled:hover:scale-100"
                >
                  {state.submitting ? t[language].submittingButton : t[language].submitButton}
                </button>
              </form>
            </div>

          </div>
        </main>
      </div>
      <Analytics />
    </>
  );
}
