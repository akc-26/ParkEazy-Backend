import CustomerApp from './customer/CustomerApp';
import HostApp from '../apps/host/src/App';
import AdminPanelApp from '../apps/admin/src/App';

/** Route each portal from the single same-origin Vite/Express entry point. */
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminPanelApp />;
  if (path === '/host' || path.startsWith('/host/')) return <HostApp />;
  return <CustomerApp />;
}
