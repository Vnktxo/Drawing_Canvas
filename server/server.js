const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));

const opStore = [];
const onlineUsers = {};
const redoStore = [];

io.on('connection', (socket) => {
    console.log(`A user connected : ${socket.id}`);

    onlineUsers[socket.id] = {};
    io.emit('user:update', onlineUsers);
    socket.emit('fullCanvas', opStore);

    socket.on('draw:operation', (op) => {
        op.timestamp = Date.now();
        opStore.push(op);
        redoStore.length = 0;
        io.emit('draw:operation', op);
    });

    socket.on('opStore:undo', () => {
        if(opStore.length > 0){
            const undoneOp =opStore.pop();
            redoStore.push(undoneOp);
            io.emit('opStore:load', opStore);
        }
    });

    socket.on('opStore:redo', () => {
        if(redoStore.length > 0){
            const redoneOp = redoStore.pop();
            opStore.push(redoneOp);
            io.emit('opStore:load', opStore);
        }
    });

    socket.on('opStore:clear', () => { 
        opStore.length = 0;
        redoStore.length = 0;
        io.emit('opStore:load', opStore);
    });
    
    socket.on('cursor:move', (data) => {
        socket.broadcast.emit('cursor:move',{
            ...data,
            socketId: socket.id
        });
    });
    socket.on('disconnect', () => {
        console.log(`User disconnected : ${socket.id}`);
        delete onlineUsers[socket.id];
        io.emit('user:update', onlineUsers);
        io.emit('user:disconnect', socket.id);
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});