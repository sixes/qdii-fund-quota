import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useTranslation } from '../lib/translations';

export default function Privacy() {
  const router = useRouter();
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const t = useTranslation(language);

  useEffect(() => {
    const langFromUrl = router.query.lang as string;
    if (langFromUrl === 'zh') {
      setLanguage('zh');
    } else {
      setLanguage('en');
    }
  }, [router.query.lang]);

  const handleLanguageChange = (lang: 'en' | 'zh') => {
    setLanguage(lang);
    router.push(`/privacy?lang=${lang}`, undefined, { shallow: true });
  };

  const content = {
    en: {
      title: "Privacy Policy",
      description: "Our privacy policy and data practices",
      heading: "Privacy Policy",
      lastUpdated: "Last Updated: January 2025",
      section1Title: "1. Information We Collect",
      section1Text: "We collect minimal information necessary to provide our services. This may include analytics data about how you use our website.",
      section2Title: "2. How We Use Information",
      section2Text: "We use the collected information to improve our services, understand user preferences, and enhance user experience.",
      section3Title: "3. Data Security",
      section3Text: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
      section4Title: "4. Cookies",
      section4Text: "We use cookies and similar tracking technologies to track activity on our website and hold certain information to improve our services.",
      section5Title: "5. Third-Party Services",
      section5Text: "We may use third-party services such as Google Analytics to collect, monitor, and analyze website usage data.",
      section6Title: "6. Your Rights",
      section6Text: "You have the right to access, update, or delete your information. Please contact us if you wish to exercise these rights.",
      section7Title: "7. Changes to Policy",
      section7Text: "We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page."
    },
    zh: {
      title: "隐私政策",
      description: "我们的隐私政策和数据实践",
      heading: "隐私政策",
      lastUpdated: "最后更新：2025年1月",
      section1Title: "1. 我们收集的信息",
      section1Text: "我们收集提供服务所需的最少信息。这可能包括有关您如何使用我们网站的分析数据。",
      section2Title: "2. 我们如何使用信息",
      section2Text: "我们使用收集的信息来改进我们的服务，了解用户偏好，并增强用户体验。",
      section3Title: "3. 数据安全",
      section3Text: "我们实施适当的技术和组织措施，以保护您的个人信息免受未经授权的访问、更改、披露或破坏。",
      section4Title: "4. Cookie",
      section4Text: "我们使用Cookie和类似的跟踪技术来跟踪我们网站上的活动并保存某些信息以改进我们的服务。",
      section5Title: "5. 第三方服务",
      section5Text: "我们可能使用Google Analytics等第三方服务来收集、监控和分析网站使用数据。",
      section6Title: "6. 您的权利",
      section6Text: "您有权访问、更新或删除您的信息。如果您希望行使这些权利，请与我们联系。",
      section7Title: "7. 政策变更",
      section7Text: "我们可能会不时更新本隐私政策。我们将通过在本页面上发布新政策来通知您任何更改。"
    }
  };

  return (
    <>
      <Head>
        <title>{content[language].title}</title>
        <meta name="description" content={content[language].description} />
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

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
        <Navigation language={language} onLanguageChange={handleLanguageChange} />
        
        <main className="flex-grow py-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h1 className="text-3xl md:text-4xl font-bold text-indigo-700 mb-2">{content[language].heading}</h1>
              <p className="text-gray-500 mb-8">{content[language].lastUpdated}</p>
              
              <div className="space-y-6">
                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section1Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section1Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section2Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section2Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section3Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section3Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section4Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section4Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section5Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section5Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section6Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section6Text}</p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{content[language].section7Title}</h2>
                  <p className="text-gray-700 leading-relaxed">{content[language].section7Text}</p>
                </section>
              </div>
            </div>
          </div>
        </main>

        <Footer language={language} />
      </div>
      <Analytics />
    </>
  );
}
