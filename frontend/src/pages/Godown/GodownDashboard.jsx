import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import * as orderService from '../../services/orderService';
import * as notificationService from '../../services/notificationService';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { io } from 'socket.io-client';
import { CheckCircle, AlertCircle, RefreshCw, Layers, ShieldCheck, MapPin } from 'lucide-react';

const GodownDashboard = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [godown, setGodown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [latestDeliverySuccess, setLatestDeliverySuccess] = useState(null);

  const fetchOrdersAndNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getGodownOrders();
      if (res.success) {
        setOrders(res.orders || []);
        setGodown(res.godown);
      }

      // Fetch notifications to see if there is a recent delivery success message
      const notifRes = await notificationService.getNotifications();
      if (notifRes.success) {
        const completedNotif = notifRes.notifications.find(
          n => n.message.toLowerCase().includes('successfully completed')
        );
        if (completedNotif) {
          setLatestDeliverySuccess(completedNotif.message);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load godown registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrdersAndNotifications();

    if (!user) return;
    const socketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL?.replace(/\/+$/, '')
      || import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
      || 'http://localhost:5000';
    const socket = io(socketBaseUrl);

    socket.on('connect', () => {
      socket.emit('join-user-room', user._id);
    });

    socket.on('new-notification', (data) => {
      fetchOrdersAndNotifications();
      if (data.message.toLowerCase().includes('successfully completed')) {
        setLatestDeliverySuccess(data.message);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, fetchOrdersAndNotifications]);

  const incomingCount = orders.filter(o => o.status === 'dispatched' && o.currentStageIndex === 0).length;
  const deliveryPendingCount = orders.filter(o => o.status === 'dispatched' && o.currentStageIndex === 1).length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {latestDeliverySuccess && (
        <div className="card" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
          padding: '16px 20px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          animation: 'pulse-glow 2s infinite'
        }}>
          <CheckCircle size={24} style={{ color: 'var(--success)' }} />
          <div>
            <h4 style={{ margin: '0 0 2px 0', color: 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px' }}>
              Live System Dispatch Complete
            </h4>
            <p style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {latestDeliverySuccess}
            </p>
          </div>
          <button 
            onClick={() => setLatestDeliverySuccess(null)}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }} className="gradient-text">
            {godown ? godown.name : 'Godown Console'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {godown?.address || 'Accept incoming hub deliveries, allocate last-mile drivers, and oversee local doorstep distribution.'}
          </p>
        </div>
        <button 
          onClick={fetchOrdersAndNotifications} 
          disabled={loading} 
          className="btn-secondary" 
          style={{ fontSize: '13px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} />
          Refresh Registry
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Incoming Hub Transfers</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)' }}>{incomingCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Last-Mile Doorstep Shipments</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--warning)' }}>{deliveryPendingCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Completed Distributions</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)' }}>{completedCount}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
        {/* Main Orders List */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
            Godown Product Distribution Log
          </h3>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <p>No product dispatches mapped to this local godown yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.map(o => (
                <div key={o._id} style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px' }}>Order: #{o._id.substring(18)}</h4>
                      {o.status === 'delivered' && (
                        <span style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                          <CheckCircle size={12} /> Success
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {o.customer?.name} ({o.customer?.address || 'N/A'})
                      </span>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Products:</strong> {o.products.map(p => `${p.productId?.name || 'Item'} (Qty: ${p.quantity})`).join(', ')}
                      </span>
                      {o.warehouse && (
                        <span>
                          <strong style={{ color: 'var(--text-primary)' }}>Dispatched From:</strong> {o.warehouse?.name || 'Warehouse'}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', marginTop: '4px' }}>Last updated: {formatDate(o.updatedAt)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge ${o.status === 'delivered' ? 'delivered' : o.status === 'in_transit' || o.status === 'dispatched' ? 'in-transit' : 'pending'}`}>
                      {o.currentStageIndex === 0 ? 'Incoming Transfer' : o.status === 'delivered' ? 'Completed Doorstep' : 'In Last-Mile'}
                    </span>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '8px' }}>
                      {formatCurrency(o.totalPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary)' }} />
              Distribution Network
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <MapPin size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px' }} />
                <div>
                  <strong>Associated Regional Hub:</strong>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {godown?.associatedStateWarehouse?.name || 'NCR State Warehouse'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GodownDashboard;
