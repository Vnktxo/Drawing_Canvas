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

io.on('connection', (socket) => {
    console.log(`A user connected : ${socket.id}`);

    socket.on('requestFullCanvas', () => {
        socket.emit('fullCanvas', opStore);
    });

    socket.on('draw:operation', (op) => {
        op.timestamp = Date.now();
        opStore.push(op);
        io.emit('draw:operation', op);
    });

    socket.on('opStore:undo', () => {
        if(opStore.length > 0){
            opStore.pop();
            io.emit('opStore:load', opStore);
        }
    });

    socket.on('opStore:clear', () => {
        
        opStore.length = 0;
        io.emit('opStore:load', opStore);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected : ${socket.id}`);
    });
});


server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});