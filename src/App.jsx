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
import OrderConfirmationPage from './pages/OrderConfirmationPage.jsx';
import MyOrdersPage from './pages/MyOrdersPage.jsx';
import AdminOrdersPage from './pages/AdminOrdersPage.jsx';
import LaboratoriesPage from './pages/LaboratoriesPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import styles from './styles/App.module.css';

function NotFoundPage() {
  return (
    <section className={styles.section}>
      <div className={styles.emptyState}>
        <h1>Sección no encontrada</h1>
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
    '/catalogo': {
      element: <CatalogPage initialLaboratory={route.query.get('laboratory') || ''} />,
      roles: ['client', 'admin'],
    },
    '/laboratorios': { element: <LaboratoriesPage />, roles: ['client', 'admin'] },
    '/carrito': { element: <CartPage />, roles: ['client'] },
    '/resumen': { element: <OrderSummaryPage />, roles: ['client'] },
    '/pedido-confirmado': {
      element: <OrderConfirmationPage orderId={route.query.get('id') || ''} />,
      roles: ['client'],
    },
    '/mis-pedidos': { element: <MyOrdersPage />, roles: ['client'] },
    '/admin/pedidos': { element: <AdminOrdersPage />, roles: ['admin'] },
    '/cuenta': { element: <AccountPage />, roles: ['client', 'admin'] },
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
    const privatePage = privatePages[route.path];
    content = (
      <ProtectedRoute path={route.path} navigate={navigate} allowedRoles={privatePage.roles}>
        {privatePage.element}
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
