import React from 'react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { fetchAuthConfig } from '../../helpers/oauthConfig';
import {
  appleLoginUrl,
  googleLoginUrl,
  openSystemBrowserForOAuthStart,
} from '../../helpers/authHelpers';
import googleMark from '../../assets/google-g.svg';
import appleMark from '../../assets/apple.svg';

const buttonClass =
  'flex w-full items-center justify-center gap-space-sm border border-primary bg-background px-space-md py-space-sm font-sans text-caption font-bold uppercase tracking-kicker text-primary hover:border-secondary hover:text-secondary';

const openNativeProvider = async (href) => {
  try {
    await openSystemBrowserForOAuthStart(href);
  } catch (err) {
    toast.error(err?.message || 'Could not open sign-in');
  }
};

const ProviderControl = ({ href, isNative, markSrc, children }) => {
  const content = (
    <>
      <img src={markSrc} alt="" aria-hidden="true" className="h-5 w-5" />
      {children}
    </>
  );
  if (isNative) {
    return (
      <button type="button" className={buttonClass} onClick={() => openNativeProvider(href)}>
        {content}
      </button>
    );
  }
  return (
    <a href={href} className={buttonClass}>
      {content}
    </a>
  );
};

const OAuthButtons = () => {
  const [config, setConfig] = React.useState(null);
  const isNative = Capacitor.isNativePlatform();

  React.useEffect(() => {
    let cancelled = false;
    fetchAuthConfig().then((next) => {
      if (!cancelled) setConfig(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!config) {
    return <div className="min-h-16" data-testid="oauth-buttons-loading" aria-hidden="true" />;
  }
  if (!config.googleClientId && !config.appleClientId) return null;

  return (
    <div className="space-y-space-sm" data-testid="oauth-buttons">
      {config.googleClientId ? (
        <ProviderControl href={googleLoginUrl()} isNative={isNative} markSrc={googleMark}>
          Continue with Google
        </ProviderControl>
      ) : null}
      {config.appleClientId ? (
        <ProviderControl href={appleLoginUrl()} isNative={isNative} markSrc={appleMark}>
          Continue with Apple
        </ProviderControl>
      ) : null}
    </div>
  );
};

export default OAuthButtons;
