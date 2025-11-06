const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));

io.on('connection', (socket) => {
    console.log(`A user connected : ${socket.id}`);

    socket.on('draw:start', (data) => {
        socket.broadcast.emit('draw:start', data);
    });

    socket.on('draw:move', (data) => {
        socket.broadcast.emit('draw:move', data);
    });

    socket.on('draw:stop', (data) => {
        socket.broadcast.emit('draw:stop', data);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected : ${socket.id}`);
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});