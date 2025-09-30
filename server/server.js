const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from parent directory (for development)
app.use(express.static(path.join(__dirname, '..')));

// Game state
const publicRooms = new Map();
const players = new Map();

// Quotes for races
const quotes = [
    "The quick brown fox jumps over the lazy dog.",
    "Programming is the art of telling another human what one wants the computer to do.",
    "Type racing is a fun way to improve your typing speed and accuracy.",
    "Practice makes perfect when it comes to typing quickly and accurately.",
    "The only way to learn a new programming language is by writing programs in it.",
    "Computers are good at following instructions, but not at reading your mind.",
    "The best error message is the one that never shows up.",
    "First, solve the problem. Then, write the code.",
    "Any fool can write code that a computer can understand. Good programmers write code that humans can understand."
];

// Helper functions
function getRandomQuote() {
    return quotes[Math.floor(Math.random() * quotes.length)];
}

function createRoom() {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room = {
        id: roomId,
        players: new Map(),
        isRacing: false,
        quote: '',
        startTime: null
    };
    publicRooms.set(roomId, room);
    return room;
}

function findAvailableRoom() {
    // Find a room with less than 4 players that isn't racing
    for (let room of publicRooms.values()) {
        if (room.players.size < 4 && !room.isRacing) {
            return room;
        }
    }
    // If no available room, create a new one
    return createRoom();
}

function cleanupRoom(roomId) {
    const room = publicRooms.get(roomId);
    if (room && room.players.size === 0) {
        publicRooms.delete(roomId);
        console.log(`Room ${roomId} cleaned up`);
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    let currentRoom = null;
    let playerData = null;

    // Join public room
    socket.on('joinPublicRoom', (data) => {
        playerData = {
            playerId: socket.id,
            name: data.name || 'Anonymous',
            character: data.character || 'happy',
            isReady: false,
            progress: 0,
            wpm: 0,
            accuracy: 100
        };
        
        players.set(socket.id, playerData);
        
        const room = findAvailableRoom();
        currentRoom = room;
        
        room.players.set(socket.id, playerData);
        socket.join(room.id);
        
        console.log(`Player ${playerData.name} joined room ${room.id}`);
        
        // Send room info to the joining player
        socket.emit('roomInfo', {
            roomId: room.id,
            players: Array.from(room.players.values())
        });
        
        // Notify other players in the room
        socket.to(room.id).emit('playerJoined', playerData);
        
        // Update room status for all players
        updateRoomStatus(room.id);
    });

    // Player ready status
    socket.on('playerReady', (isReady) => {
        if (!currentRoom || !playerData) return;
        
        playerData.isReady = isReady;
        currentRoom.players.set(socket.id, playerData);
        
        console.log(`Player ${playerData.name} ${isReady ? 'is ready' : 'is not ready'}`);
        
        // Notify all players in the room
        io.to(currentRoom.id).emit('playerReady', {
            playerId: socket.id,
            isReady: isReady
        });
        
        // Check if we can start the race
        checkRaceStart(currentRoom);
        
        updateRoomStatus(currentRoom.id);
    });

    // Player progress update
    socket.on('playerProgress', (data) => {
        if (!currentRoom || !playerData || !currentRoom.isRacing) return;
        
        playerData.progress = data.progress;
        playerData.wpm = data.wpm;
        currentRoom.players.set(socket.id, playerData);
        
        // Broadcast progress to other players
        socket.to(currentRoom.id).emit('playerProgress', {
            playerId: socket.id,
            progress: data.progress,
            wpm: data.wpm
        });
    });

    // Player finished race
    socket.on('raceFinished', (data) => {
        if (!currentRoom || !playerData || !currentRoom.isRacing) return;
        
        playerData.wpm = data.wpm;
        playerData.accuracy = data.accuracy;
        playerData.progress = data.progress;
        playerData.finished = true;
        currentRoom.players.set(socket.id, playerData);
        
        console.log(`Player ${playerData.name} finished with ${data.wpm} WPM`);
        
        // Check if all players have finished
        checkRaceFinish(currentRoom);
    });

    // Update player data (character, etc.)
    socket.on('updatePlayer', (data) => {
        if (!playerData) return;
        
        if (data.character) {
            playerData.character = data.character;
        }
        
        if (currentRoom) {
            currentRoom.players.set(socket.id, playerData);
            
            // Notify other players
            socket.to(currentRoom.id).emit('playerUpdated', playerData);
        }
    });

    // Disconnection handling
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        if (currentRoom) {
            // Remove player from room
            currentRoom.players.delete(socket.id);
            
            // Notify other players
            socket.to(currentRoom.id).emit('playerLeft', {
                playerId: socket.id,
                name: playerData?.name
            });
            
            // Update room status
            updateRoomStatus(currentRoom.id);
            
            // Clean up empty rooms
            cleanupRoom(currentRoom.id);
        }
        
        players.delete(socket.id);
    });

    // Helper function to update room status
    function updateRoomStatus(roomId) {
        const room = publicRooms.get(roomId);
        if (room) {
            const readyCount = Array.from(room.players.values()).filter(p => p.isReady).length;
            const totalPlayers = room.players.size;
            
            io.to(roomId).emit('roomStatus', {
                readyPlayers: readyCount,
                totalPlayers: totalPlayers,
                canStart: readyCount >= 2 && readyCount === totalPlayers
            });
        }
    }

    // Helper function to check if race can start
    function checkRaceStart(room) {
        const readyPlayers = Array.from(room.players.values()).filter(p => p.isReady);
        const totalPlayers = room.players.size;
        
        if (readyPlayers.length >= 2 && readyPlayers.length === totalPlayers && !room.isRacing) {
            startRace(room);
        }
    }

    // Start the race
    function startRace(room) {
        room.isRacing = true;
        room.quote = getRandomQuote();
        room.startTime = new Date();
        
        // Reset player progress
        room.players.forEach(player => {
            player.progress = 0;
            player.wpm = 0;
            player.finished = false;
        });
        
        console.log(`Starting race in room ${room.id} with ${room.players.size} players`);
        
        // Notify players that race is starting
        io.to(room.id).emit('raceStarting', {
            countdown: 3
        });
        
        // Start the race after countdown
        setTimeout(() => {
            io.to(room.id).emit('raceStarted', {
                quote: room.quote,
                startTime: room.startTime
            });
            console.log(`Race started in room ${room.id}`);
        }, 3000);
    }

    // Check if all players have finished
    function checkRaceFinish(room) {
        const allFinished = Array.from(room.players.values()).every(player => player.finished);
        const timeElapsed = new Date() - room.startTime;
        
        // Also finish if 60 seconds have passed
        if (allFinished || timeElapsed > 60000) {
            finishRace(room);
        }
    }

    // Finish the race and send results
    function finishRace(room) {
        room.isRacing = false;
        
        const results = Array.from(room.players.values()).map(player => ({
            playerId: player.playerId,
            name: player.name,
            wpm: player.wpm,
            accuracy: player.accuracy,
            progress: player.progress
        })).sort((a, b) => b.wpm - a.wpm);
        
        console.log(`Race finished in room ${room.id}`);
        
        io.to(room.id).emit('raceFinished', {
            results: results
        });
        
        // Reset player ready status for next race
        room.players.forEach(player => {
            player.isReady = false;
            player.progress = 0;
            player.wpm = 0;
            player.finished = false;
        });
        
        // Notify players of reset ready status
        room.players.forEach((player, playerId) => {
            io.to(playerId).emit('playerReady', {
                playerId: playerId,
                isReady: false
            });
        });
        
        updateRoomStatus(room.id);
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/api/rooms', (req, res) => {
    const roomInfo = Array.from(publicRooms.values()).map(room => ({
        id: room.id,
        playerCount: room.players.size,
        isRacing: room.isRacing
    }));
    res.json(roomInfo);
});

app.get('/api/stats', (req, res) => {
    res.json({
        totalRooms: publicRooms.size,
        totalPlayers: players.size,
        activeRaces: Array.from(publicRooms.values()).filter(room => room.isRacing).length
    });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Seedy-Typey server running on port ${PORT}`);
    console.log(`Access the game at http://localhost:${PORT}`);
});