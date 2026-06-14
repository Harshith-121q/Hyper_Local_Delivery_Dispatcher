import React, { useContext, useState } from 'react';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import CustomerDashboard from './pages/Customer/CustomerDashboard';
import AgentDashboard from './pages/Agent/AgentDashboard';
import HubDriverDashboard from './pages/Agent/HubDriverDashboard';
import DeliveryPartnerDashboard from './pages/Agent/DeliveryPartnerDashboard';
import WarehouseDashboard from './pages/Warehouse/WarehouseDashboard';
import GodownDashboard from './pages/Godown/GodownDashboard';
import AdminDashboard from './pages/Admin/AdminDashboard';

const MainApp = () => {
  const { user, loading } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: 'var(--bg-primary)'
      }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif' }} className="gradient-text">Initializing Logistics Portal...</h2>
      </div>
    );
  }

  if (!user) {
    return isRegister ? (
      <Register onToggleAuth={() => setIsRegister(false)} />
    ) : (
      <Login onToggleAuth={() => setIsRegister(true)} />
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <Navbar />
      {user.role === 'customer' && <CustomerDashboard />}
      {user.role === 'agent' && <AgentDashboard />}
      {user.role === 'hub_driver' && <HubDriverDashboard />}
      {user.role === 'delivery_partner' && <DeliveryPartnerDashboard />}
      {user.role === 'warehouse' && <WarehouseDashboard />}
      {user.role === 'godown' && <GodownDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
