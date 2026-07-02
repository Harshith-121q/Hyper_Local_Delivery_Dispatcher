import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config/apiConfig.js';

export const useSocket = (orderId, onLocationUpdate, onStatusChange) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    socketRef.current = io(SOCKET_BASE_URL);

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
