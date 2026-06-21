import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import BranchesSection from './components/BranchesSection.jsx';
import ContactSection from './components/ContactSection.jsx';
import PublicHome from './pages/PublicHome.jsx';
import CompanyPage from './pages/CompanyPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import CartPage from './pages/CartPage.jsx';
import OrderSummaryPage from './pages/OrderSummaryPage.jsx';
import LaboratoriesPage from './pages/LaboratoriesPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import styles from './styles/App.module.css';

function NotFoundPage() {
  return (
    <section className={styles.section}>
      <div className={styles.emptyState}>
        <h1>Seccion no encontrada</h1>
        <p>La ruta solicitada no existe en este portal.</p>
        <a className={styles.primaryButton} href="#/">
          Volver al inicio
        </a>
      </div>
    </section>
  );
}

export default function App() {
  const { route, navigate } = useHashRoute();
  const redirectTo = route.query.get('redirect') || '/catalogo';

  const privatePages = {
    '/catalogo': <CatalogPage initialLaboratory={route.query.get('laboratory') || ''} />,
    '/laboratorios': <LaboratoriesPage />,
    '/carrito': <CartPage />,
    '/resumen': <OrderSummaryPage />,
    '/cuenta': <AccountPage />,
  };

  let content;

  if (route.path === '/') {
    content = <PublicHome />;
  } else if (route.path === '/empresa') {
    content = <CompanyPage />;
  } else if (route.path === '/sucursales') {
    content = <BranchesSection />;
  } else if (route.path === '/contacto') {
    content = <ContactSection />;
  } else if (route.path === '/login') {
    content = <LoginPage redirectTo={redirectTo} navigate={navigate} />;
  } else if (privatePages[route.path]) {
    content = (
      <ProtectedRoute path={route.path} navigate={navigate}>
        {privatePages[route.path]}
      </ProtectedRoute>
    );
  } else {
    content = <NotFoundPage />;
  }

  return (
    <div className={styles.app}>
      <Header />
      <main>{content}</main>
      <Footer />
    </div>
  );
}
