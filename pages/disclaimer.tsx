import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useTranslation } from '../lib/translations';

export default function Disclaimer() {
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
    router.push(`/disclaimer?lang=${lang}`, undefined, { shallow: true });
  };

  const content = {
    en: {
      title: "Data Disclaimer",
      description: "Important information about our data sources and accuracy",
      heading: "Data Disclaimer",
      lastUpdated: "Last Updated: January 2025",
      section1Title: "1. Data Sources",
      section1Text: "All data on this website is sourced from official public announcements and third-party data providers. We strive to ensure accuracy but cannot guarantee the completeness or timeliness of all information.",
      section2Title: "2. No Investment Advice",
      section2Text: "The information provided on this website is for informational purposes only and should not be considered as investment advice. Always conduct your own research and consult with financial professionals before making investment decisions.",
      section3Title: "3. Data Accuracy",
      section3Text: "While we make every effort to ensure the accuracy of the data presented, errors may occur. We are not responsible for any decisions made based on the information provided on this website.",
      section4Title: "4. Third-Party Data",
      section4Text: "Some data is sourced from third-party providers. We are not responsible for the accuracy or reliability of third-party data.",
      section5Title: "5. Real-Time Data",
      section5Text: "Please note that some data may be delayed. Real-time or near real-time data should not be relied upon for time-sensitive trading decisions.",
      section6Title: "6. Historical Data",
      section6Text: "Historical performance is not indicative of future results. Past performance should not be used as the sole basis for investment decisions.",
      section7Title: "7. Liability Limitation",
      section7Text: "We shall not be liable for any loss or damage arising from the use of information on this website, including but not limited to trading losses, data inaccuracies, or service interruptions."
    },
    zh: {
      title: "数据免责声明",
      description: "关于我们数据来源和准确性的重要信息",
      heading: "数据免责声明",
      lastUpdated: "最后更新：2025年1月",
      section1Title: "1. 数据来源",
      section1Text: "本网站上的所有数据均来自官方公告和第三方数据提供商。我们努力确保准确性，但不能保证所有信息的完整性或及时性。",
      section2Title: "2. 非投资建议",
      section2Text: "本网站提供的信息仅供参考，不应被视为投资建议。在做出投资决策之前，请务必进行自己的研究并咨询金融专业人士。",
      section3Title: "3. 数据准确性",
      section3Text: "虽然我们尽一切努力确保所呈现数据的准确性，但可能会出现错误。我们不对基于本网站提供的信息所做的任何决定负责。",
      section4Title: "4. 第三方数据",
      section4Text: "部分数据来自第三方提供商。我们不对第三方数据的准确性或可靠性负责。",
      section5Title: "5. 实时数据",
      section5Text: "请注意，某些数据可能会延迟。不应依赖实时或近实时数据进行时间敏感的交易决策。",
      section6Title: "6. 历史数据",
      section6Text: "历史表现不代表未来结果。过去的表现不应作为投资决策的唯一依据。",
      section7Title: "7. 责任限制",
      section7Text: "我们不对因使用本网站信息而产生的任何损失或损害承担责任，包括但不限于交易损失、数据不准确或服务中断。"
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
