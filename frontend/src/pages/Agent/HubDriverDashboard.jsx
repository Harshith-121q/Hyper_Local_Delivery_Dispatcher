import React, { useState, useEffect, useCallback } from 'react';
import AgentDashboard from './AgentDashboard';
import * as orderService from '../../services/orderService';
import * as dispatchService from '../../services/dispatchService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Package, MapPin, Truck, HelpCircle, ClipboardList, CheckCircle } from 'lucide-react';

const HubDriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('active_jobs'); // 'active_jobs' or 'browse_warehouse'
  const [availableOrders, setAvailableOrders] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [selectedGodowns, setSelectedGodowns] = useState({}); // orderId -> godownId
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchAvailableWarehouseOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getAvailableHubOrders();
      if (res.success) {
        setAvailableOrders(res.orders || []);
      }
      
      const gdRes = await dispatchService.getGodowns();
      if (gdRes.success) {
        setGodowns(gdRes.godowns || []);
        // Pre-select first godown for orders if not set
        if (gdRes.godowns.length > 0) {
          const initialSelections = {};
          res.orders?.forEach(o => {
            initialSelections[o._id] = gdRes.godowns[0]._id;
          });
          setSelectedGodowns(prev => ({ ...initialSelections, ...prev }));
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load available warehouse bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'browse_warehouse') {
      fetchAvailableWarehouseOrders();
    }
  }, [activeTab, fetchAvailableWarehouseOrders]);

  const handleGodownChange = (orderId, godownId) => {
    setSelectedGodowns(prev => ({
      ...prev,
      [orderId]: godownId
    }));
  };

  const handleAssignOrder = async (orderId) => {
    const godownId = selectedGodowns[orderId];
    if (!godownId) {
      setError('Please select a target godown.');
      return;
    }

    setMessage('');
    setError('');
    setLoading(true);

    try {
      const res = await orderService.assignHubDriverOrder(orderId, godownId);
      if (res.success) {
        setMessage(`Order successfully accepted and routed to selected godown!`);
        fetchAvailableWarehouseOrders();
        // Switch back to active jobs so they can accept and drive
        setTimeout(() => {
          setActiveTab('active_jobs');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error assigning route stage.');
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
          <Truck size={16} />
          My Active Shipping Stages
        </button>
        <button
          onClick={() => {
            setActiveTab('browse_warehouse');
            setMessage('');
            setError('');
          }}
          style={{
            backgroundColor: activeTab === 'browse_warehouse' ? 'var(--accent-glow)' : 'transparent',
            border: activeTab === 'browse_warehouse' ? '1px solid var(--accent-primary)' : '1px solid transparent',
            color: activeTab === 'browse_warehouse' ? 'var(--accent-primary)' : 'var(--text-secondary)',
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
          Browse Warehouse Bookings
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
        <AgentDashboard mode="hub_driver" />
      ) : (
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <ClipboardList size={20} style={{ color: 'var(--accent-primary)' }} />
            Pending Customer Bookings (Warehouse Hubs)
          </h3>

          {availableOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <HelpCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <p>No unassigned customer bookings at source warehouses right now.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {availableOrders.map(order => {
                const targetGodownId = selectedGodowns[order._id] || '';
                return (
                  <div key={order._id} style={{
                    padding: '20px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px' }}>Order: #{order._id.substring(18)}</h4>
                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Origin Hub:</strong> {order.warehouse?.name || 'Warehouse'} ({order.warehouse?.address})
                        </p>
                        <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Products:</strong> {order.products.map(p => `${p.productId?.name} (Qty: ${p.quantity})`).join(', ')}
                        </p>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {order.customer?.name} ({order.customer?.address || 'N/A'})
                        </p>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {formatCurrency(order.totalPrice)}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      borderTop: '1px dashed var(--border-color)',
                      paddingTop: '14px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '250px' }}>
                        <MapPin size={16} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>Select Destination Godown:</span>
                        <select
                          value={targetGodownId}
                          onChange={(e) => handleGodownChange(order._id, e.target.value)}
                          style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '13px',
                            flex: 1
                          }}
                        >
                          {godowns.map(g => (
                            <option key={g._id} value={g._id}>
                              {g.name} ({g.address})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={() => handleAssignOrder(order._id)}
                        disabled={loading}
                        className="btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '10px 20px',
                          fontSize: '13px'
                        }}
                      >
                        <CheckCircle size={16} />
                        Accept Job & Route
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HubDriverDashboard;
