import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (orderId, onLocationUpdate, onStatusChange) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // Connect to Server
    const socketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL?.replace(/\/+$/, '') || 'https://hyper-local-delivery-dispatcher-ppc4.onrender.com';
    socketRef.current = io(socketBaseUrl);

    // Join order-specific room
    socketRef.current.emit('join-order-room', orderId);

    // Bind event handlers
    if (onLocationUpdate) {
      socketRef.current.on('agent-location-update', onLocationUpdate);
    }
    if (onStatusChange) {
      socketRef.current.on('order-status-change', onStatusChange);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-order-room', orderId);
        socketRef.current.disconnect();
      }
    };
  }, [orderId, onLocationUpdate, onStatusChange]);

  return socketRef.current;
};
