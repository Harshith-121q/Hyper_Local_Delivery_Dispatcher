import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Truck, LogOut, User, MapPin, Loader2, CheckCircle, Bell, Check } from 'lucide-react';
import LocationPickerModal from './LocationPickerModal';
import { io } from 'socket.io-client';
import * as notificationService from '../../services/notificationService';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res.success) {
        setNotifications(res.notifications);
        setUnreadCount(res.notifications.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const socketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL?.replace(/\/+$/, '')
      || import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
    const socket = socketBaseUrl ? io(socketBaseUrl) : io();

    socket.on('connect', () => {
      socket.emit('join-user-room', user._id);
    });

    socket.on('new-notification', (data) => {
      fetchNotifications();
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification(data.title, { body: data.message });
      }
    });

    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [user, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await notificationService.markAsRead(id);
      if (res.success) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await notificationService.markAllAsRead();
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };
  
  const roleLabels = {
    customer: 'Customer',
    agent: 'Agent',
    hub_driver: 'Hub Driver',
    delivery_partner: 'Delivery Partner',
    warehouse: 'Warehouse',
    godown: 'Godown',
    admin: 'Admin'
  };
  const hasLocation = Number.isFinite(user?.location?.lat) && Number.isFinite(user?.location?.lng) && (user.location.lat !== 0 || user.location.lng !== 0);

  const handleLocationClick = () => {
    setIsMapModalOpen(true);
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px 24px',
      backgroundColor: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Truck size={28} style={{ color: 'var(--accent-primary)' }} />
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }}>
          Hyperlocal <span className="gradient-text">Dispatch</span>
        </h2>
      </div>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={handleLocationClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: hasLocation ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: hasLocation ? 'var(--accent-primary)' : 'var(--text-secondary)',
                padding: '7px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              title={hasLocation ? `Saved Location: ${user.location.lat.toFixed(4)}, ${user.location.lng.toFixed(4)}` : 'Select location'}
            >
              {hasLocation ? <CheckCircle size={15} /> : <MapPin size={15} />}
              Location
            </button>
          </div>

          {/* Bell Icon & Notifications Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: unreadCount > 0 ? 'var(--accent-glow)' : 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.2s',
                padding: 0
              }}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '9px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 6px #EF4444'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '320px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent-primary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        padding: 0
                      }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: '24px',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}>
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-color)',
                          backgroundColor: n.isRead ? 'transparent' : 'rgba(250, 204, 21, 0.02)',
                          cursor: n.isRead ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          transition: 'background-color 0.2s',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => {
                          if (!n.isRead) e.currentTarget.style.backgroundColor = 'rgba(250, 204, 21, 0.04)';
                        }}
                        onMouseLeave={(e) => {
                          if (!n.isRead) e.currentTarget.style.backgroundColor = 'rgba(250, 204, 21, 0.02)';
                        }}
                      >
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: n.isRead ? 'transparent' : 'var(--accent-primary)',
                          marginTop: '6px',
                          flexShrink: 0
                        }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: n.isRead ? 'var(--text-secondary)' : 'var(--text-primary)'
                          }}>{n.title}</span>
                          <p style={{
                            margin: 0,
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            lineHeight: '1.4'
                          }}>{n.message}</p>
                          <span style={{
                            fontSize: '9px',
                            color: 'var(--text-secondary)',
                            marginTop: '2px'
                          }}>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            backgroundColor: 'var(--bg-tertiary)', 
            padding: '6px 12px', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)' 
          }}>
            <User size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{user.name}</span>
            <span style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              backgroundColor: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700
            }}>{roleLabels[user.role] || user.role}</span>
          </div>

          <button onClick={logout} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'color 0.2s'
          }} 
          onMouseEnter={(e) => e.target.style.color = '#EF4444'} 
          onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
      <LocationPickerModal isOpen={isMapModalOpen} onClose={() => setIsMapModalOpen(false)} />
    </nav>
  );
};

export default Navbar;
