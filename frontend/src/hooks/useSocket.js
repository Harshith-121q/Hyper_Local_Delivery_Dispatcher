import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (orderId, onLocationUpdate, onStatusChange) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!orderId) return;

    // Connect to server with either socket URL or API base URL.
    const socketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL?.replace(/\/+$/, '')
      || import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '');
    socketRef.current = socketBaseUrl ? io(socketBaseUrl) : io();

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
