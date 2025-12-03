import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';
import { useTranslation } from '../lib/translations';

export default function Terms() {
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
    router.push(`/terms?lang=${lang}`, undefined, { shallow: true });
  };

  const content = {
    en: {
      title: "Terms of Use",
      description: "Terms and conditions for using our platform",
      heading: "Terms of Use",
      lastUpdated: "Last Updated: January 2025",
      section1Title: "1. Acceptance of Terms",
      section1Text: "By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.",
      section2Title: "2. Use of Service",
      section2Text: "This service is provided for informational purposes only. You agree to use the service only for lawful purposes and in accordance with these Terms.",
      section3Title: "3. Intellectual Property",
      section3Text: "The content, organization, graphics, design, and other matters related to this website are protected under applicable copyrights and other proprietary laws.",
      section4Title: "4. Disclaimer",
      section4Text: "The information provided on this website is for general informational purposes only. We make no warranties about the completeness, reliability, and accuracy of this information.",
      section5Title: "5. Limitation of Liability",
      section5Text: "In no event shall we be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in any way connected with the use of this website.",
      section6Title: "6. Changes to Terms",
      section6Text: "We reserve the right to modify these terms at any time. Your continued use of the website following any changes indicates your acceptance of the new terms."
    },
    zh: {
      title: "使用条款",
      description: "使用我们平台的条款和条件",
      heading: "使用条款",
      lastUpdated: "最后更新：2025年1月",
      section1Title: "1. 接受条款",
      section1Text: "通过访问和使用本网站，您接受并同意受本协议条款和规定的约束。",
      section2Title: "2. 服务使用",
      section2Text: "本服务仅供参考。您同意仅将本服务用于合法目的，并遵守这些条款。",
      section3Title: "3. 知识产权",
      section3Text: "本网站的内容、组织、图形、设计和其他事项受适用的版权和其他专有法律的保护。",
      section4Title: "4. 免责声明",
      section4Text: "本网站提供的信息仅供一般参考。我们不对此信息的完整性、可靠性和准确性做任何保证。",
      section5Title: "5. 责任限制",
      section5Text: "在任何情况下，我们不对因使用本网站而产生的任何直接、间接、附带、特殊或后果性损害承担责任。",
      section6Title: "6. 条款变更",
      section6Text: "我们保留随时修改这些条款的权利。您在任何更改后继续使用本网站表示您接受新条款。"
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
