import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect, useState } from 'react';
import App from './App';
import Landing from './Landing';
import './style.css';

function Root() {
  const [route, setRoute] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route.startsWith('#/editor') ? <App /> : <Landing />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);