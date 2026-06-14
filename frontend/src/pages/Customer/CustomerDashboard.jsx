import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import * as orderService from '../../services/orderService';
import { useSocket } from '../../hooks/useSocket';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { 
  ShoppingBag, Package, Map, MapPin, Navigation, Eye, CheckCircle, 
  Smartphone, Laptop, Tablet, Headphones, Sparkles, Plus, Minus, Trash2 
} from 'lucide-react';
import LocationPickerModal from '../../components/common/LocationPickerModal';

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [orderIdToTrack, setOrderIdToTrack] = useState(null);
  
  // Form State & Product Grid Quantities
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [productQuantities, setProductQuantities] = useState({});

  const handleQtyChange = (productId, change) => {
    setProductQuantities(prev => {
      const current = prev[productId] || 1;
      const next = Math.max(1, Math.min(10, current + change));
      return { ...prev, [productId]: next };
    });
  };

  const getProductIcon = (sku) => {
    const s = sku ? sku.toUpperCase() : '';
    if (s.includes('IPHONE')) return <Smartphone size={24} style={{ color: 'var(--accent-primary)' }} />;
    if (s.includes('MACBOOK')) return <Laptop size={24} style={{ color: 'var(--accent-primary)' }} />;
    if (s.includes('IPAD')) return <Tablet size={24} style={{ color: 'var(--accent-primary)' }} />;
    if (s.includes('AIRPODS')) return <Headphones size={24} style={{ color: 'var(--accent-primary)' }} />;
    return <Sparkles size={24} style={{ color: 'var(--accent-primary)' }} />;
  };

  const handlePlaceOrderDirect = async (productId) => {
    const qty = productQuantities[productId] || 1;
    setMessage('');
    setLoading(true);
    try {
      const res = await orderService.createOrder([
        { productId, quantity: qty }
      ]);
      if (res.success) {
        setMessage('Order placed successfully! Automated dispatch constructed 3 stages.');
        fetchOrders();
        selectOrder(res.order);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error placing order');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to remove this order? This will cancel any active dispatches and delete the history.")) {
      return;
    }
    setMessage('');
    try {
      const res = await orderService.deleteOrder(orderId);
      if (res.success) {
        setMessage('Order removed successfully.');
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(null);
          setTracking(null);
          setOrderIdToTrack(null);
        }
        fetchOrders();
      }
    } catch (err) {
      console.error('Error removing order:', err);
      setMessage(err.response?.data?.message || 'Error removing order');
    }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await orderService.getCustomerOrders();
      if (res.success) {
        setOrders(res.data || res.orders || []);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await orderService.getProducts().catch(() => null);
      if (res && res.success && res.products && res.products.length > 0) {
        setProducts(res.products);
        setSelectedProductId(res.products[0]?._id || '');
      } else {
        // Fallback: trigger seed if empty
        const seedRes = await orderService.seedProducts().catch(() => null);
        if (seedRes && seedRes.success && seedRes.created) {
          setProducts(seedRes.created);
          setSelectedProductId(seedRes.created[0]?._id || '');
        } else {
          // Retry fetching after seed
          const retryRes = await orderService.getProducts().catch(() => null);
          if (retryRes && retryRes.success && retryRes.products) {
            setProducts(retryRes.products);
            setSelectedProductId(retryRes.products[0]?._id || '');
          }
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders, fetchProducts]);

  // Load tracking details for selected order
  const selectOrder = async (order) => {
    try {
      const res = await orderService.getOrderDetails(order._id);
      if (res.success) {
        setSelectedOrder(res.order);
        setTracking(res.tracking);
        setOrderIdToTrack(order._id);
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  // Socket event callbacks
  const handleLocationUpdate = useCallback((data) => {
    console.log('Live location update received via Socket:', data);
    setTracking((prev) => {
      if (!prev || prev.stageNumber !== data.stageNumber) return prev;
      return {
        ...prev,
        currentCoordinateIndex: data.index,
        currentLocation: data.currentLocation
      };
    });
  }, []);

  const handleStatusChange = useCallback(async (data) => {
    console.log('Order status update received via Socket:', data);
    // Reload selected order and tracking
    if (orderIdToTrack) {
      const res = await orderService.getOrderDetails(orderIdToTrack);
      if (res.success) {
        setSelectedOrder(res.order);
        setTracking(res.tracking);
      }
      fetchOrders();
    }
  }, [orderIdToTrack, fetchOrders]);

  // Subscribe to live socket updates
  useSocket(orderIdToTrack, handleLocationUpdate, handleStatusChange);

  // Handle Order Submit
  // handlePlaceOrder deprecated in favor of direct card-based order placements

  // SVG Projection helper
  const project = (location) => {
    if (!location) return { x: 0, y: 0 };
    // Indian coordinates box mapping: Lat 8-36, Lng 68-98
    const latMin = 8, latMax = 32;
    const lngMin = 68, lngMax = 90;
    const x = ((location.lng - lngMin) / (lngMax - lngMin)) * 440 + 30;
    const y = 300 - ((location.lat - latMin) / (latMax - latMin)) * 260 - 20;
    return { x, y };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1300px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px 0' }} className="gradient-text">Customer Dispatch Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Place new hyperlocal orders and track dispatch milestones live.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Left Side: Place Order and History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Delivery Destination Card */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '16px' }}>
                <MapPin size={18} style={{ color: 'var(--accent-primary)' }} />
                Delivery Destination
              </h3>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsMapModalOpen(true)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '6px'
                }}
              >
                Change Location
              </button>
            </div>
            {user?.location?.lat && user?.location?.lng ? (
              <div style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>Address: {user.address || 'Saved Location Coords'}</span>
                <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '12px' }}>
                  Coordinates: {user.location.lat.toFixed(5)}, {user.location.lng.toFixed(5)}
                </span>
              </div>
            ) : (
              <div style={{ color: 'var(--warning)', fontSize: '13px' }}>
                ⚠️ No location selected. Please click "Change Location" to set your delivery coordinates.
              </div>
            )}
          </div>

          {/* Product Grid Card */}
          <div className="card">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <ShoppingBag size={20} style={{ color: 'var(--accent-primary)' }} />
              Available Products
            </h3>

            {message && (
              <div style={{
                backgroundColor: message.includes('successfully') ? 'var(--success-glow)' : 'rgba(239, 68, 68, 0.1)',
                color: message.includes('successfully') ? 'var(--success)' : '#EF4444',
                border: `1px solid ${message.includes('successfully') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '16px'
              }}>
                {message}
              </div>
            )}

            {products.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>No products available. Seeding...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {products.map(p => {
                  const qty = productQuantities[p._id] || 1;
                  return (
                    <div 
                      key={p._id}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(250, 204, 21, 0.25)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                        <div style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          padding: '10px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid var(--border-color)'
                        }}>
                          {getProductIcon(p.sku)}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{p.name}</h4>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            alignSelf: 'flex-start'
                          }}>{p.sku}</span>
                          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{p.description}</p>
                          <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>{formatCurrency(p.price)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', minWidth: '110px' }}>
                        {/* Quantity Counter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          <button 
                            type="button"
                            onClick={() => handleQtyChange(p._id, -1)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                          >
                            <Minus size={12} />
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 700, minWidth: '18px', textAlign: 'center', color: 'var(--text-primary)' }}>{qty}</span>
                          <button 
                            type="button"
                            onClick={() => handleQtyChange(p._id, 1)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handlePlaceOrderDirect(p._id)}
                          disabled={loading}
                          className="btn-primary"
                          style={{
                            padding: '8px 16px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            width: '100%',
                            fontWeight: 700
                          }}
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order History Card */}
          <div className="card" style={{ flexGrow: 1, minHeight: '300px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Package size={20} style={{ color: 'var(--accent-primary)' }} />
              Order History
            </h3>

            {orders.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>No orders placed yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {orders.map(o => (
                  <div 
                    key={o._id}
                    onClick={() => selectOrder(o)}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      backgroundColor: selectedOrder?._id === o._id ? 'var(--bg-tertiary)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${selectedOrder?._id === o._id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700 }}>ID: {o._id.substring(18)}</span>
                      <span className={`status-badge ${o.status === 'delivered' ? 'delivered' : o.status === 'in_transit' ? 'in-transit' : 'pending'}`}>
                        {o.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>{o.products[0]?.productId?.name || 'Item'} ({o.products[0]?.quantity})</span>
                      <span>{formatCurrency(o.totalPrice)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(o.createdAt)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveOrder(o._id);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Remove Order"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Map and Timeline */}
        <div>
          {selectedOrder ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Map Simulator */}
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <Map size={20} style={{ color: 'var(--accent-primary)' }} />
                  Live Dispatch Tracking Map (Projected Coordinates)
                </h3>

                <div className="map-canvas-container">
                  <div className="map-grid-overlay" />
                  
                  <svg width="100%" height="100%" viewBox="0 0 500 300" style={{ position: 'relative', zIndex: 5 }}>
                    {/* Render unrouted placeholder if stages are empty */}
                    {selectedOrder.stages.length === 0 && selectedOrder.warehouse && (
                      <g>
                        {(() => {
                          const pWh = project(selectedOrder.warehouse.location);
                          const pCust = project(selectedOrder.customer?.location || { lat: 12.9300, lng: 77.6200 });
                          return (
                            <>
                              <line 
                                x1={pWh.x} y1={pWh.y} x2={pCust.x} y2={pCust.y} 
                                stroke="var(--border-color)"
                                strokeWidth={1.5}
                                strokeDasharray="5, 5"
                              />
                              <circle cx={pWh.x} cy={pWh.y} r={7} fill="#EF4444" stroke="#fff" strokeWidth={1} />
                              <text x={pWh.x} y={pWh.y - 12} textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="bold">
                                {selectedOrder.warehouse.name.split(' ')[0]}
                              </text>
                              <circle cx={pCust.x} cy={pCust.y} r={8} fill="var(--success)" stroke="#fff" strokeWidth={1.5} />
                              <text x={pCust.x} y={pCust.y + 18} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="bold">
                                Destination
                              </text>
                            </>
                          );
                        })()}
                      </g>
                    )}

                    {/* Render the full logistic layout lines */}
                    {selectedOrder.stages.map((stage, idx) => {
                      const p1 = project(stage.from);
                      const p2 = project(stage.to);
                      return (
                        <g key={idx}>
                          <line 
                            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} 
                            stroke={selectedOrder.currentStageIndex === idx ? 'var(--accent-primary)' : 'var(--border-color)'}
                            strokeWidth={selectedOrder.currentStageIndex === idx ? 3 : 1.5}
                            strokeDasharray={selectedOrder.currentStageIndex === idx ? "5, 5" : "none"}
                          />
                        </g>
                      );
                    })}

                    {/* Nodes plotting */}
                    {selectedOrder.stages.map((stage, idx) => {
                      const pFrom = project(stage.from);
                      const isSource = stage.stageNumber === 1;
                      const fromColor = isSource ? '#EF4444' : '#F97316';

                      return (
                        <g key={`node-${idx}`}>
                          <circle cx={pFrom.x} cy={pFrom.y} r={7} fill={fromColor} stroke="#fff" strokeWidth={1} />
                          <text x={pFrom.x} y={pFrom.y - 12} textAnchor="middle" fill="var(--text-secondary)" fontSize="10" fontWeight="bold">
                            {stage.from.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}

                    {/* Customer Destination node */}
                    {(() => {
                      const finalStage = selectedOrder.stages[selectedOrder.stages.length - 1];
                      if (!finalStage) return null;
                      const pCust = project(finalStage.to);
                      return (
                        <g>
                          <circle cx={pCust.x} cy={pCust.y} r={8} fill="var(--success)" stroke="#fff" strokeWidth={1.5} />
                          <text x={pCust.x} y={pCust.y + 18} textAnchor="middle" fill="var(--text-primary)" fontSize="11" fontWeight="bold">
                            Destination
                          </text>
                        </g>
                      );
                    })()}

                    {/* Live Agent marker */}
                    {tracking && tracking.currentLocation && (
                      (() => {
                        const pAgent = project(tracking.currentLocation);
                        return (
                          <g>
                            <circle cx={pAgent.x} cy={pAgent.y} r={10} fill="var(--accent-primary)" opacity={0.3} style={{ animation: 'pulse-glow 1.5s infinite' }} />
                            <circle cx={pAgent.x} cy={pAgent.y} r={5} fill="var(--accent-primary)" stroke="#fff" strokeWidth={1} />
                            <text x={pAgent.x} y={pAgent.y - 12} textAnchor="middle" fill="var(--accent-primary)" fontSize="10" fontWeight="bold">
                              🚚 Agent Moving
                            </text>
                          </g>
                        );
                      })()
                    )}
                  </svg>

                  {/* Absolute overlay details */}
                  <div style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(15, 19, 30, 0.85)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    zIndex: 10
                  }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <span>🔴 Source Warehouse</span>
                      <span>🟠 City Godown</span>
                      <span>🟢 Customer</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Stage Timelines */}
              <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <Navigation size={20} style={{ color: 'var(--accent-primary)' }} />
                  Multi-Level Dispatch Timeline
                </h3>

                <div className="timeline">
                  {selectedOrder.stages.length === 0 ? (
                    <>
                      <div className="timeline-item" style={{ opacity: 1 }}>
                        <div className="timeline-badge active" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Stage 1: Warehouse ➔ Local City Godown</h4>
                            <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                              Origin: {selectedOrder.warehouse?.name || 'Origin Warehouse'}
                            </p>
                            <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              🚚 Hub Hauler Truck
                            </p>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              <span>Status: Awaiting driver to select order and route to godown</span>
                            </div>
                          </div>
                          <div>
                            <span className="status-badge pending">
                              Awaiting Route
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="timeline-item" style={{ opacity: 0.5 }}>
                        <div className="timeline-badge" />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Stage 2: City Godown ➔ Customer Doorstep</h4>
                            <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                              🛵 Last-Mile Doorstep Delivery
                            </p>
                          </div>
                          <div>
                            <span className="status-badge pending">
                              pending
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    selectedOrder.stages.map((stage, idx) => {
                      const isActive = selectedOrder.currentStageIndex === idx;
                      const isCompleted = selectedOrder.currentStageIndex > idx;
                      let badgeClass = 'timeline-badge';
                      if (isActive) badgeClass += ' active';
                      if (isCompleted) badgeClass += ' completed';

                      let title = '';
                      let vehicle = '';
                      if (stage.stageNumber === 1) {
                        title = 'Stage 1: Warehouse ➔ Local City Godown';
                        vehicle = '🚚 Hub Hauler Truck';
                      } else if (stage.stageNumber === 2) {
                        title = 'Stage 2: City Godown ➔ Customer Doorstep';
                        vehicle = '🛵 Last-Mile Doorstep Delivery';
                      }

                      return (
                        <div className="timeline-item" key={idx} style={{ opacity: isCompleted || isActive ? 1 : 0.5 }}>
                          <div className={badgeClass}>
                            {isCompleted && <CheckCircle size={14} style={{ color: 'white' }} />}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>{title}</h4>
                              <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                From: {stage.from.name} ➔ To: {stage.to.name}
                              </p>
                              <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                {vehicle}
                              </p>
                              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                <span>Agent: {stage.agentId?.name || 'Pre-Allocated'}</span>
                                <span>ETA: {formatDate(stage.eta)}</span>
                              </div>
                            </div>
                            <div>
                              <span className={`status-badge ${stage.status === 'delivered' ? 'delivered' : stage.status === 'in_transit' ? 'in-transit' : 'pending'}`}>
                                {stage.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
              </div>
            </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}>
              <Eye size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
              <h3>No Order Selected</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Select an order from the list on the left to start tracking real-time movement.</p>
            </div>
          )}
        </div>
      </div>
      <LocationPickerModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
    </div>
  );
};

export default CustomerDashboard;
