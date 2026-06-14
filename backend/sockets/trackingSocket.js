import { Server } from 'socket.io';

let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join-order-room', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} joined room: order:${orderId}`);
    });

    socket.on('leave-order-room', (orderId) => {
      socket.leave(`order:${orderId}`);
      console.log(`Socket ${socket.id} left room: order:${orderId}`);
    });

    socket.on('join-user-room', (userId) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user room: user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  return io;
};

export const emitToOrderRoom = (orderId, event, data) => {
  if (io) {
    io.to(`order:${orderId}`).emit(event, data);
  }
};

export const emitToUserRoom = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};
