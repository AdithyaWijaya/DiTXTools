import { useState } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import ManifestPage from './pages/ManifestPage';
import FixesPage from './pages/FixesPage';

type Page = 'home' | 'manifest' | 'fixes';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
