export type Page = 'home' | 'manifest' | 'fixes';

export const PAGE_PATHS: Record<Page, string> = {
  home: '/',
  manifest: '/manifest',
  fixes: '/fixes',
};

export function getPageFromPath(path: string): Page {
  if (path === '/manifest') return 'manifest';
  if (path === '/fixes') return 'fixes';
  return 'home';
}

export function getPathFromPage(page: Page): string {
  return PAGE_PATHS[page];
}

export const NAV_EVENT = 'router-navigate';

export function navigate(page: Page) {
  const path = getPathFromPage(page);
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(NAV_EVENT));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function subscribeToRouter(onStoreChange: () => void) {
  window.addEventListener('popstate', onStoreChange);
  window.addEventListener(NAV_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('popstate', onStoreChange);
    window.removeEventListener(NAV_EVENT, onStoreChange);
  };
}
