// backend/src/websocket/socketHandler.ts - WebSocket Handler

export function setupWebSocket(io: any) {
  io.on('connection', (socket: any) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}
