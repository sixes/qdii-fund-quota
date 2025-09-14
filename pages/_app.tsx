import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { Analytics } from '@vercel/analytics/react'
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.error('SW registration failed: ', registrationError);
          });
      });
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;