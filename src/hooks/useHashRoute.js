import { useCallback, useEffect, useState } from 'react';

function parseHash() {
  const rawHash = window.location.hash.replace(/^#/, '') || '/';
  const [pathValue, queryString = ''] = rawHash.split('?');
  const path = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;

  return {
    path,
    query: new URLSearchParams(queryString),
  };
}

export function useHashRoute() {
  const [route, setRoute] = useState(parseHash);

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((path) => {
    window.location.hash = path;
    setRoute(parseHash());
  }, []);

  return { route, navigate };
}
