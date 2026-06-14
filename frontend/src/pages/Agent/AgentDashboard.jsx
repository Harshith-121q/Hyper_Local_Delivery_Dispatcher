import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as orderService from '../../services/orderService';
import * as dispatchService from '../../services/dispatchService';
import { formatDate } from '../../utils/formatters';
import { CheckCircle, Truck, Package, Play, AlertCircle } from 'lucide-react';

const dashboardCopy = {
  agent: {
    title: 'Agent Delivery Dispatch Console',
    subtitle: 'View assigned routes, update shipping status, and initiate autopilot location runs.',
    empty: 'No active deliveries assigned to you.'
  },
  hub_driver: {
    title: 'Hub Driver Dispatch Console',
    subtitle: 'Handle products from warehouse to warehouse, and from warehouse to godown based on route location.',
    empty: 'No warehouse or godown transfer stages assigned to you.'
  },
  delivery_partner: {
    title: 'Delivery Partner Dispatch Console',
    subtitle: 'Track and move products from your godown to the customer delivery point.',
    empty: 'No godown-to-customer delivery stages assigned to you.'
  }
};

const roleStageFilters = {
  hub_driver: stage => stage.from?.type === 'Warehouse' && ['Warehouse', 'Godown'].includes(stage.to?.type),
  delivery_partner: stage => stage.from?.type === 'Godown' && stage.to?.type === 'Customer',
  agent: () => true
};

const AgentDashboard = ({ mode = 'agent' }) => {
  const [orders, setOrders] = useState([]);
  const [agentId, setAgentId] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const copy = dashboardCopy[mode] || dashboardCopy.agent;
  const stageFilter = roleStageFilters[mode] || roleStageFilters.agent;

  const fetchAgentJobs = useCallback(async () => {
    try {
      const res = await orderService.getAgentOrders();
      if (res.success) {
        setOrders(res.orders || []);
        setAgentId(res.agentId);
      }
    } catch (err) {
      console.error('Error loading agent jobs:', err);
    }
  }, []);

  useEffect(() => {
    fetchAgentJobs();
  }, [fetchAgentJobs]);

  const handleUpdateStatus = async (orderId, stageNumber, nextStatus) => {
    setMessage('');
    setLoading(true);
    try {
      const res = await dispatchService.updateStageStatus(orderId, stageNumber, nextStatus);
      if (res.success) {
        setMessage(`Stage status successfully updated to: ${nextStatus}.`);
        fetchAgentJobs();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating status');
    } finally {
      setLoading(false);
    }
  };

  const assignedJobs = useMemo(() => {
    return orders
      .map(order => {
        const assignedStage = order.stages.find(
          stage => (stage.agentId?.toString() === agentId?.toString() || stage.agentId === agentId) && stageFilter(stage)
        );
        return assignedStage ? { order, assignedStage } : null;
      })
      .filter(Boolean);
  }, [agentId, orders, stageFilter]);

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }} className="gradient-text">{copy.title}</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{copy.subtitle}</p>
      </div>

      {message && (
        <div style={{
          backgroundColor: 'var(--accent-glow)',
          color: 'var(--accent-primary)',
          border: '1px solid rgba(250, 204, 21, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '14px',
          marginBottom: '24px'
        }}>
          {message}
        </div>
      )}

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Package size={20} style={{ color: 'var(--accent-primary)' }} />
          Assigned Shipping Stages
        </h3>

        {assignedJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <p style={{ fontSize: '15px', margin: 0 }}>{copy.empty}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignedJobs.map(({ order, assignedStage }) => {
              const isCurrentActiveStage = order.stages[order.currentStageIndex]?.stageNumber === assignedStage.stageNumber;

              return (
                <div key={order._id} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ margin: 0 }}>Order ID: {order._id.substring(18)}</h4>
                      <span className={`status-badge ${assignedStage.status === 'delivered' ? 'delivered' : assignedStage.status === 'in_transit' ? 'in-transit' : 'pending'}`}>
                        Stage {assignedStage.status}
                      </span>
                    </div>

                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Origin Hub:</span> {assignedStage.from.name} ({assignedStage.from.type})
                    </p>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Destination Hub:</span> {assignedStage.to.name} ({assignedStage.to.type})
                    </p>

                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      <span>Stage Layer: Stage {assignedStage.stageNumber}</span>
                      <span>ETA: {formatDate(assignedStage.eta)}</span>
                    </div>
                  </div>

                  <div>
                    {assignedStage.status === 'assigned' && (
                      <button 
                        disabled={loading}
                        onClick={() => handleUpdateStatus(order._id, assignedStage.stageNumber, 'picked_up')}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <CheckCircle size={16} />
                        Accept Job & Load
                      </button>
                    )}

                    {assignedStage.status === 'picked_up' && (
                      <button 
                        disabled={loading || !isCurrentActiveStage}
                        onClick={() => handleUpdateStatus(order._id, assignedStage.stageNumber, 'in_transit')}
                        className="btn-primary"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          opacity: isCurrentActiveStage ? 1 : 0.5,
                          cursor: isCurrentActiveStage ? 'pointer' : 'not-allowed'
                        }}
                        title={!isCurrentActiveStage ? "Waiting for the previous stage to arrive at origin hub first." : "Start movement"}
                      >
                        <Play size={16} />
                        Start Simulation Drive
                      </button>
                    )}

                    {assignedStage.status === 'in_transit' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontSize: '14px', fontWeight: 600 }}>
                        <Truck size={18} style={{ animation: 'bounce 1s infinite' }} />
                        <span>Autopilot Driving...</span>
                      </div>
                    )}

                    {assignedStage.status === 'delivered' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '14px', fontWeight: 600 }}>
                        <CheckCircle size={18} />
                        <span>Stage Completed</span>
                      </div>
                    )}

                    {!isCurrentActiveStage && assignedStage.status === 'picked_up' && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: 'var(--warning)', textAlign: 'right' }}>
                        Waiting for parent stage cargo...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentDashboard;
