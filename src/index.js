const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMessage, generateLocationMessage } = require('./utils/messages.js');
const { addUser, removeUser, getUser, getUserInRoom } = require('./utils/users.js');

const app = express();
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))



io.on('connection', (socket) => {
    console.log('New Websocket connection');

    // socket.emit('message', generateMessage('Welcome!')); //Send message to the person who joined (To that particular connection)

    //socket.broadcast.emit('message', generateMessage('A new user has joined!')) // Send message to everyone who has connected

    socket.on('join', (options, callback) => {

        const { error, user } = addUser({ id: socket.id, ...options });

        if (error) {
            return callback(error)
        }

        socket.join(user.room); // Join room
        socket.emit('message', generateMessage("Chat Cafe", 'Welcome to chat cafe!'));

        socket.broadcast.to(user.room).emit('message', generateMessage("Chat Cafe", `${user.username} has joined the chat!`)) //Send message to all in that particular room
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUserInRoom(user.room)
        })


        callback()
    })

    socket.on('sendMessage', (message, callback) => {

        const user = getUser(socket.id)

        // if (message === " ") {
        //     socket.emit('message', generateMessage(user.username, "Please enter a text to send!"))
        //     return callback("Please enter a text to send!")
        // }
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback("Profanity is not allowed!")
        }

        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback()
    })

    socket.on('sendLocation', (position, callback) => {

        const user = getUser(socket.id)

        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${position.latitude},${position.longitude}`));
        callback();
    })

    // socket.on('increment', () => {
    //     count++;
    //     socket.emit('countUpdated', count)
    //     io.emit('countUpdated', count)
    // })

    socket.on('disconnect', () => {

        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage("Chat cafe", `${user.username} has left the chat!`));

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUserInRoom(user.room)
            })
        }


    })
})

server.listen(port, () => {
    console.log(`server is up and running on port ${port}`)
});