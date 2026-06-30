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
import AdminProductsPage from './pages/AdminProductsPage.jsx';
import AdminOffersPage from './pages/AdminOffersPage.jsx';
import LaboratoriesPage from './pages/LaboratoriesPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import OffersPage from './pages/OffersPage.jsx';
import ClientDashboardPage from './pages/ClientDashboardPage.jsx';
import AdminReportsPage from './pages/AdminReportsPage.jsx';
import AdminSalesProjectionPage from './pages/AdminSalesProjectionPage.jsx';
import AdminAuditPage from './pages/AdminAuditPage.jsx';
import AdminCustomersPage from './pages/AdminCustomersPage.jsx';
import AdminProductImportPage from './pages/AdminProductImportPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useTheme } from './context/ThemeContext.jsx';
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
  const { theme } = useTheme();
  const redirectTo = route.query.get('redirect') || '';

  const privatePages = {
    '/catalogo': {
      element: <CatalogPage initialLaboratory={route.query.get('laboratory') || ''} initialCategory={route.query.get('category') || ''} />,
      roles: ['client', 'admin'],
    },
    '/inicio-cliente': { element: <ClientDashboardPage />, roles: ['client'] },
    '/laboratorios': { element: <LaboratoriesPage />, roles: ['client', 'admin'] },
    '/ofertas': { element: <OffersPage />, roles: ['client'] },
    '/carrito': { element: <CartPage />, roles: ['client'] },
    '/resumen': { element: <OrderSummaryPage />, roles: ['client'] },
    '/checkout': { element: <OrderSummaryPage />, roles: ['client'] },
    '/pedido-confirmado': {
      element: (
        <OrderConfirmationPage
          orderId={route.query.get('id') || ''}
          sessionId={route.query.get('session_id') || ''}
        />
      ),
      roles: ['client'],
    },
    '/mis-pedidos': { element: <MyOrdersPage />, roles: ['client'] },
    '/admin/pedidos': { element: <AdminOrdersPage />, roles: ['admin'] },
    '/admin/productos': { element: <AdminProductsPage />, roles: ['admin'] },
    '/admin/ofertas': { element: <AdminOffersPage />, roles: ['admin'] },
    '/admin/reportes': { element: <AdminReportsPage />, roles: ['admin'] },
    '/admin/auditoria': { element: <AdminAuditPage />, roles: ['admin'] },
    '/admin/clientes': { element: <AdminCustomersPage />, roles: ['admin'] },
    '/admin/usuarios': { element: <AdminUsersPage />, roles: ['admin'] },
    '/admin/importar-productos': { element: <AdminProductImportPage />, roles: ['admin'] },
    '/admin/proyeccion-ventas': { element: <AdminSalesProjectionPage />, roles: ['admin'] },
    '/cuenta': { element: <AccountPage />, roles: ['client', 'admin', 'sales', 'supervisor'] },
    // Accessible to all authenticated roles, including when forcePasswordChange is true.
    '/cambiar-contrasena': { element: <ChangePasswordPage />, roles: ['client', 'admin', 'sales', 'supervisor'] },
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
  } else if (route.path === '/privacidad') {
    content = <PrivacyPage />;
  } else if (route.path === '/terminos') {
    content = <TermsPage />;
  } else if (route.path === '/olvide-mi-contrasena') {
    content = <ForgotPasswordPage />;
  } else if (route.path === '/restablecer-contrasena') {
    content = <ResetPasswordPage token={route.query.get('token') || ''} />;
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
    <div className={styles.app} data-theme={theme}>
      <Header />
      <main>{content}</main>
      <Footer />
    </div>
  );
}
