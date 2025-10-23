import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useTranslation } from '../lib/translations';

export default function About() {
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
    router.push(`/about?lang=${lang}`, undefined, { shallow: true });
  };

  const content = {
    en: {
      title: "About Us",
      description: "Learn more about our platform",
      heading: "About Our Platform",
      mission: "Our Mission",
      missionText: "We provide comprehensive, real-time data on US stock market indices and QDII fund quotas to help investors make informed decisions.",
      whatWeDo: "What We Do",
      whatWeDoText: "Our platform aggregates data from official sources and presents it in an easy-to-use format. We track constituents of major indices like Nasdaq 100, S&P 500, and Dow Jones, along with QDII fund purchase quotas.",
      features: "Key Features",
      feature1: "Real-time index constituent data",
      feature2: "QDII fund quota tracking",
      feature3: "Historical returns analysis",
      feature4: "Bilingual support (English/Chinese)",
      feature5: "Mobile-friendly interface"
    },
    zh: {
      title: "关于我们",
      description: "了解更多关于我们的平台",
      heading: "关于我们的平台",
      mission: "我们的使命",
      missionText: "我们提供全面、实时的美股指数和QDII基金额度数据，帮助投资者做出明智的决策。",
      whatWeDo: "我们做什么",
      whatWeDoText: "我们的平台从官方来源汇总数据，并以易于使用的格式呈现。我们跟踪纳斯达克100、标普500和道琼斯等主要指数的成分股，以及QDII基金申购额度。",
      features: "主要功能",
      feature1: "实时指数成分股数据",
      feature2: "QDII基金额度跟踪",
      feature3: "历史回报分析",
      feature4: "双语支持（英文/中文）",
      feature5: "移动设备友好界面"
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
              <h1 className="text-3xl md:text-4xl font-bold text-indigo-700 mb-6">{content[language].heading}</h1>
              
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{content[language].mission}</h2>
                <p className="text-gray-700 leading-relaxed">{content[language].missionText}</p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{content[language].whatWeDo}</h2>
                <p className="text-gray-700 leading-relaxed">{content[language].whatWeDoText}</p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">{content[language].features}</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  <li>{content[language].feature1}</li>
                  <li>{content[language].feature2}</li>
                  <li>{content[language].feature3}</li>
                  <li>{content[language].feature4}</li>
                  <li>{content[language].feature5}</li>
                </ul>
              </section>
            </div>
          </div>
        </main>

        <Footer language={language} />
      </div>
      <Analytics />
    </>
  );
}
