import React, { useState, useEffect, useCallback } from 'react';
import * as orderService from '../../services/orderService';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { Package, AlertCircle, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';

const WarehouseDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [warehouse, setWarehouse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getWarehouseOrders();
      if (res.success) {
        setOrders(res.orders || []);
        setWarehouse(res.warehouse);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load warehouse dispatches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const dispatchedCount = orders.filter(o => ['dispatched', 'in_transit'].includes(o.status)).length;
  const completedCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }} className="gradient-text">
            {warehouse ? warehouse.name : 'Warehouse Console'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {warehouse?.address || 'Monitor incoming customer bookings, verify inventory, and await hub driver routing.'}
          </p>
        </div>
        <button 
          onClick={fetchOrders} 
          disabled={loading} 
          className="btn-secondary" 
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          {loading ? 'Refreshing...' : 'Refresh Hub Data'}
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
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Awaiting Hub Driver pickup</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--warning)' }}>{pendingCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Dispatches</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)' }}>{dispatchedCount}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Completed Shipments</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--success)' }}>{completedCount}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px' }}>
        {/* Main Orders Table */}
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Package size={20} style={{ color: 'var(--accent-primary)' }} />
            Warehouse Booking History
          </h3>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <AlertCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <p>No customer bookings recorded at this warehouse location yet.</p>
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
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '15px' }}>Order: #{o._id.substring(18)}</h4>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Customer:</strong> {o.customer?.name} ({o.customer?.email})
                      </span>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>Products:</strong> {o.products.map(p => `${p.productId?.name || 'Item'} (Qty: ${p.quantity})`).join(', ')}
                      </span>
                      {o.godown && (
                        <span>
                          <strong style={{ color: 'var(--text-primary)' }}>Destination Godown:</strong> {o.godown?.name || 'Godown'}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', marginTop: '4px' }}>Booked on: {formatDate(o.createdAt)}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span className={`status-badge ${o.status === 'delivered' ? 'delivered' : o.status === 'in_transit' || o.status === 'dispatched' ? 'in-transit' : 'pending'}`}>
                      {o.status === 'pending' ? 'Awaiting Hub Driver' : o.status}
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

        {/* Info/Stats sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
              Hub Inventory Status
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600 }}>Warehouse Status</div>
                <div style={{ color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Operational
                </div>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600 }}>Active Shipments</div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Currently supplying {dispatchedCount} in-transit deliveries.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseDashboard;
