import { useEffect, useRef, useState } from 'react';
import { LogOut } from 'lucide-react';

type GoogleUser = { name: string; email: string; picture?: string };

type CredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: CredentialResponse) => void }): void;
          renderButton(element: HTMLElement, options: Record<string, unknown>): void;
          disableAutoSelect(): void;
        };
      };
    };
  }
}

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const STORAGE_KEY = 'forma.user';
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Falha ao carregar o Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// The token is only decoded for display; it is not verified without a backend.
function decodeCredential(credential: string): GoogleUser | null {
  try {
    const payload = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(payload), (char) => char.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (typeof data.email !== 'string') return null;
    return {
      name: typeof data.name === 'string' ? data.name : data.email,
      email: data.email,
      picture: typeof data.picture === 'string' && data.picture.startsWith('https://') ? data.picture : undefined,
    };
  } catch {
    return null;
  }
}

function readStoredUser(): GoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data.email === 'string' && typeof data.name === 'string' ? data : null;
  } catch {
    return null;
  }
}

export default function GoogleAuth() {
  const [user, setUser] = useState<GoogleUser | null>(readStoredUser);
  const [failed, setFailed] = useState(false);
  const buttonHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user || !clientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        const google = window.google;
        if (cancelled || !google || !buttonHost.current) return;
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            const profile = decodeCredential(credential);
            if (!profile) return;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
            setUser(profile);
          },
        });
        google.accounts.id.renderButton(buttonHost.current, {
          type: 'standard',
          theme: 'outline',
          size: 'medium',
          text: 'signin_with',
          shape: 'rectangular',
          locale: 'pt-BR',
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [user]);

  function signOut() {
    window.google?.accounts.id.disableAutoSelect();
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  if (user) {
    return (
      <div className="auth-user">
        {user.picture
          ? <img className="auth-avatar" src={user.picture} alt="" referrerPolicy="no-referrer" />
          : <span className="auth-avatar auth-initial">{user.name.charAt(0).toUpperCase()}</span>}
        <span className="auth-name" title={user.email}>{user.name}</span>
        <button className="auth-signout" onClick={signOut} title="Sair" aria-label="Sair da conta Google"><LogOut size={15} /></button>
      </div>
    );
  }

  if (!clientId) {
    return (
      <button className="auth-fallback" disabled title="Defina VITE_GOOGLE_CLIENT_ID no arquivo .env">
        Entrar com Google
      </button>
    );
  }

  if (failed) {
    return <span className="auth-error">Google indisponível</span>;
  }

  return <div className="auth-button" ref={buttonHost} />;
}
