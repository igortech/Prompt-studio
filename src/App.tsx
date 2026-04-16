/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { useStore } from './store';

export default function App() {
  const { user, isLoadingAuth, checkAuth, theme, setTheme } = useStore();

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme as 'light' | 'dark');
    
    // Check for token in sessionStorage (from OAuth callback)
    const oauthToken = sessionStorage.getItem('oauth_token');
    if (oauthToken) {
      console.log('Found token in sessionStorage from OAuth callback');
      localStorage.setItem('token', oauthToken);
      sessionStorage.removeItem('oauth_token');
    }
    
    checkAuth();
    
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      const currentOrigin = window.location.origin;
      
      console.log('Message received:', {
        type: event.data?.type,
        origin,
        currentOrigin,
        match: origin === currentOrigin
      });
      
      // Only accept messages from the same origin
      if (origin !== currentOrigin) {
        console.log('Origin mismatch, ignoring message');
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log('OAuth success message received');
        if (event.data.token) {
          console.log('Saving token to localStorage');
          localStorage.setItem('token', event.data.token);
        }
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuth]);

  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500 font-medium">Загрузка...</div>;
  }

  return (
    <ErrorBoundary>
      {!user ? <LoginScreen /> : <Layout />}
      <ToastContainer />
    </ErrorBoundary>
  );
}

