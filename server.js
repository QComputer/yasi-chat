const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://yasi-chat.vercel.app"],
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('message', (msg) => {
    console.log('message: ' + msg);
    io.emit('message', msg);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3001, () => {
  console.log('listening on *:3001');
});