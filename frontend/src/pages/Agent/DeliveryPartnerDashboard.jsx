import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import AgentDashboard from './AgentDashboard';
import * as orderService from '../../services/orderService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { io } from 'socket.io-client';
import { Bike, ClipboardList, HelpCircle, UserCheck } from 'lucide-react';

const DeliveryPartnerDashboard = () => {
  const [activeTab, setActiveTab] = useState('active_jobs'); // 'active_jobs' or 'browse_godown'
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { user } = useContext(AuthContext);

  const fetchAvailableGodownOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getAvailablePartnerOrders();
      if (res.success) {
        setAvailableOrders(res.orders || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load available godown orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'browse_godown') {
      fetchAvailableGodownOrders();
    }
  }, [activeTab, fetchAvailableGodownOrders]);

  useEffect(() => {
    if (!user) return;

    const socketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL?.replace(/\/+$/, '')
      || import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
      || 'http://localhost:5000';
    const socket = io(socketBaseUrl);

    socket.on('connect', () => {
      socket.emit('join-user-room', user._id);
    });

    socket.on('new-notification', (data) => {
      if (activeTab === 'browse_godown') {
        fetchAvailableGodownOrders();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user, activeTab, fetchAvailableGodownOrders]);

  const handleClaimOrder = async (orderId) => {
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await orderService.claimDeliveryPartnerOrder(orderId);
      if (res.success) {
        setMessage('The delivery is out for the customer.');
        fetchAvailableGodownOrders();
        setTimeout(() => {
          setActiveTab('active_jobs');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error claiming order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '12px'
      }}>
        <button
          onClick={() => {
            setActiveTab('active_jobs');
            setMessage('');
            setError('');
          }}
          style={{
            backgroundColor: activeTab === 'active_jobs' ? 'var(--accent-glow)' : 'transparent',
            border: activeTab === 'active_jobs' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            color: activeTab === 'active_jobs' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Bike size={16} />
          My Doorstep Deliveries
        </button>
        <button
          onClick={() => {
            setActiveTab('browse_godown');
            setMessage('');
            setError('');
          }}
          style={{
            backgroundColor: activeTab === 'browse_godown' ? 'var(--accent-glow)' : 'transparent',
            border: activeTab === 'browse_godown' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            color: activeTab === 'browse_godown' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ClipboardList size={16} />
          Claim Godown Deliveries
        </button>
      </div>

      {message && (
        <div style={{
          backgroundColor: 'var(--success-glow)',
          color: 'var(--success)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {message}
        </div>
      )}

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

      {activeTab === 'active_jobs' ? (
        <AgentDashboard mode="delivery_partner" />
      ) : (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ClipboardList size={20} style={{ color: 'var(--accent-primary)' }} />
            Arrived Godown Shipments (Awaiting Doorstep Allocation)
          </h3>

          {availableOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <HelpCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <p>No new shipments arrived at local godowns waiting for delivery partners.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {availableOrders.map(order => (
                <div key={order._id} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Order: #{order._id.substring(18)}</h4>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Origin Godown:</strong> {order.godown?.name || 'Local Godown'} ({order.godown?.address})
                      </span>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Products:</strong> {order.products.map(p => `${p.productId?.name} (Qty: ${p.quantity})`).join(', ')}
                      </span>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Customer Address:</strong> {order.customer?.address || 'N/A'} (Name: {order.customer?.name})
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {formatCurrency(order.totalPrice)}
                    </div>
                    <button
                      onClick={() => handleClaimOrder(order._id)}
                      disabled={loading}
                      className="btn-primary"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        fontSize: '12px'
                      }}
                    >
                      <UserCheck size={14} />
                      Claim Doorstep Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryPartnerDashboard;
