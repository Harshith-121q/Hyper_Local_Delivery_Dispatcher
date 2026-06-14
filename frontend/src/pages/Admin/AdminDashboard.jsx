import React, { useState, useEffect, useCallback } from 'react';
import * as orderService from '../../services/orderService';
import * as dispatchService from '../../services/dispatchService';
import * as agentService from '../../services/agentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Database, Package, Layers, MapPin } from 'lucide-react';

const AdminDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [godowns, setGodowns] = useState([]);
  const [agents, setAgents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const ordRes = await orderService.getAllOrders();
      if (ordRes.success) setOrders(ordRes.orders || []);

      const whRes = await dispatchService.getWarehouses();
      if (whRes.success) setWarehouses(whRes.warehouses || []);

      const gdRes = await dispatchService.getGodowns();
      if (gdRes.success) setGodowns(gdRes.godowns || []);

      const agRes = await agentService.getAgents();
      if (agRes.success) setAgents(agRes.agents || []);
    } catch (err) {
      console.error('Error loading admin details:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSeedSystem = async () => {
    setMessage('');
    setLoading(true);
    try {
      await dispatchService.seedWarehouses().catch(() => null);
      await dispatchService.seedGodowns().catch(() => null);
      await agentService.seedAgents().catch(() => null);
      await orderService.seedProducts().catch(() => null);

      setMessage('System successfully seeded with Warehouses, State Hubs, Godowns, Agents, and Products.');
      loadData();
    } catch (err) {
      setMessage('Error seeding logistics hubs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeOrders = orders.filter(o => ['dispatched', 'in_transit'].includes(o.status)).length;
  const busyAgents = agents.filter(a => a.availability === 'busy').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }} className="gradient-text">Logistics Command Center</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Administrator dashboard for managing hubs, products, and tracking dispatches.</p>
        </div>
        <button 
          onClick={handleSeedSystem}
          disabled={loading || (warehouses.length > 0 && agents.length > 0)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Database size={16} />
          {loading ? 'Seeding...' : (warehouses.length > 0 && agents.length > 0) ? 'System Seeding Verified' : 'One-Click Demo Seed'}
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

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Dispatches</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)' }}>{activeOrders}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Logistic Hubs (Warehouses)</span>
          <span style={{ fontSize: '28px', fontWeight: 800 }}>{warehouses.length}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>City Godowns</span>
          <span style={{ fontSize: '28px', fontWeight: 800 }}>{godowns.length}</span>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Active Agents (Busy)</span>
          <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--warning)' }}>{agents.length} ({busyAgents})</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Package size={20} style={{ color: 'var(--accent-primary)' }} />
            E2E Dispatch Monitoring
          </h3>

          {orders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>No orders placed yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {orders.map(o => (
                <div key={o._id} style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0', fontSize: '15px' }}>Order: {o._id.substring(18)}</h4>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Customer: {o.customer?.name} ({o.customer?.email})</span>
                    </div>
                    <span className={`status-badge ${o.status === 'delivered' ? 'delivered' : o.status === 'in_transit' ? 'in-transit' : 'pending'}`}>
                      {o.status}
                    </span>
                  </div>

                  <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {o.stages.map((stage, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: o.currentStageIndex === idx ? 1 : 0.6 }}>
                        <span>Stage {stage.stageNumber}: {stage.from.name.split(' ')[0]} ➔ {stage.to.name.split(' ')[0]}</span>
                        <span style={{ 
                          fontWeight: 600, 
                          color: stage.status === 'delivered' ? 'var(--success)' : stage.status === 'in_transit' ? 'var(--accent-primary)' : 'var(--warning)' 
                        }}>
                          {stage.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Layers size={20} style={{ color: 'var(--accent-primary)' }} />
              Active Delivery Agents
            </h3>

            {agents.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Seed the system to load agent registries.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                {agents.map(a => (
                  <div key={a._id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    fontSize: '13px', 
                    padding: '10px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.01)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px' 
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{a.role.replace('_', ' ')}</div>
                    </div>
                    <span style={{
                      alignSelf: 'center',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      backgroundColor: a.availability === 'busy' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: a.availability === 'busy' ? 'var(--warning)' : 'var(--success)'
                    }}>{a.availability}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <MapPin size={20} style={{ color: 'var(--accent-primary)' }} />
              Logistics Network Hubs
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
              <div>🏢 Source Hubs: {warehouses.filter(w => w.type === 'source').length}</div>
              <div>🏠 Regional Hubs: {warehouses.filter(w => w.type === 'state').length}</div>
              <div>📍 Godowns (City): {godowns.length}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
