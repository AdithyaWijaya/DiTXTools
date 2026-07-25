import { useSyncExternalStore } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ManifestPage from './pages/ManifestPage';
import FixesPage from './pages/FixesPage';
import { getPageFromPath, navigate } from './router';

export default function App() {
  const currentPage = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('popstate', onStoreChange);
      window.addEventListener('router-navigate', onStoreChange);
      return () => {
        window.removeEventListener('popstate', onStoreChange);
        window.removeEventListener('router-navigate', onStoreChange);
      };
    },
    () => getPageFromPath(window.location.pathname),
  );

  return (
    <>
      <Navbar currentPage={currentPage} onNavigate={navigate} />
      <main>
        {currentPage === 'home' && <HomePage onNavigate={navigate} />}
        {currentPage === 'manifest' && <ManifestPage />}
        {currentPage === 'fixes' && <FixesPage />}
      </main>
    </>
  );
}
