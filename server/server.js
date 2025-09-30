const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

// UPDATED: Configure CORS for GitHub Pages
app.use(cors({
  origin: [
    "https://seedy2007.github.io",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  credentials: true
}));

const io = socketIo(server, {
  cors: {
    origin: [
      "https://seedy2007.github.io",
      "http://localhost:3000",
      "http://127.0.0.1:3000", 
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Game state storage
const publicRooms = new Map();
const privateRooms = new Map();
const players = new Map();
const playerSessions = new Map();

// Sample quotes for multiplayer
const multiplayerQuotes = [
  "The quick brown fox jumps over the lazy dog while programming amazing games.",
  "Typing speed is not just about fast fingers but also about accuracy and rhythm in coding.",
  "In the world of programming, every keystroke brings us closer to creating something wonderful.",
  "The best way to predict the future of technology is to code it into existence today.",
  "Programming languages are the brushes with which we paint digital masterpieces for the world.",
  "Behind every great application lies thousands of perfectly typed lines of clean code.",
  "The internet connects us all through cables, but code connects us through creativity and innovation.",
  "Fast typing combined with accuracy is the superpower of every successful programmer and writer.",
  "Every word you type brings you closer to mastering the art of communication with machines.",
  "In the race of technology, your typing speed can be the difference between good and great."
];

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Seedy-Typey Multiplayer Server',
    status: 'running',
    publicRoomPlayers: publicRooms.size,
    privateRooms: privateRooms.size,
    connectedPlayers: players.size,
    timestamp: new Date().toISOString()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Generate or retrieve player ID
  socket.on('identify', (data) => {
    const playerId = data.playerId || uuidv4();
    let playerData = playerSessions.get(playerId);
    
    if (!playerData) {
      playerData = {
        id: playerId,
        name: data.name || 'Player',
        character: data.character || 'happy',
        gamesPlayed: 0,
        wins: 0,
        createdAt: new Date().toISOString()
      };
      playerSessions.set(playerId, playerData);
    }
    
    players.set(socket.id, { 
      socketId: socket.id, 
      playerId: playerId,
      ...playerData 
    });
    
    socket.emit('identified', { 
      playerId: playerId, 
      player: playerData 
    });
    
    console.log(`Player identified: ${playerData.name} (${playerId})`);
  });

  // Join public race
  socket.on('joinPublicRace', () => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Please identify first' });
      return;
    }

    // Add player to public room
    const publicRoom = getOrCreatePublicRoom();
    publicRoom.players.push({
      socketId: socket.id,
      playerId: player.playerId,
      name: player.name,
      character: player.character,
      ready: false,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false
    });

    socket.join('public');
    players.set(socket.id, { ...players.get(socket.id), roomId: 'public' });

    // Notify all players in public room
    io.to('public').emit('publicRoomUpdated', { room: publicRoom });

    console.log(`Player ${player.name} joined public race`);

    // Check if we can start the public race
    checkPublicRaceStart(publicRoom);
  });

  // Create a private room
  socket.on('createPrivateRoom', () => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Please identify first' });
      return;
    }

    const roomId = generateRoomCode();
    const room = {
      id: roomId,
      host: socket.id,
      players: [{
        socketId: socket.id,
        playerId: player.playerId,
        name: player.name,
        character: player.character,
        ready: false,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false
      }],
      status: 'waiting',
      quote: getRandomQuote(),
      startTime: null,
      createdAt: new Date().toISOString(),
      isPrivate: true
    };

    privateRooms.set(roomId, room);
    socket.join(roomId);
    players.set(socket.id, { ...players.get(socket.id), roomId });
    
    socket.emit('privateRoomCreated', { roomId, room });
    console.log(`Private room created: ${roomId} by ${player.name}`);
  });

  // Join private room
  socket.on('joinPrivateRoom', (data) => {
    const player = players.get(socket.id);
    if (!player) {
      socket.emit('error', { message: 'Please identify first' });
      return;
    }

    const { roomId } = data;
    const room = privateRooms.get(roomId);

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 4) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    // Add player to room
    room.players.push({
      socketId: socket.id,
      playerId: player.playerId,
      name: player.name,
      character: player.character,
      ready: false,
      progress: 0,
      wpm: 0,
      accuracy: 100,
      finished: false
    });

    socket.join(roomId);
    players.set(socket.id, { ...players.get(socket.id), roomId });

    // Notify all players in the room
    io.to(roomId).emit('privateRoomUpdated', { room });

    console.log(`Player ${player.name} joined private room: ${roomId}`);
  });

  // Player ready status
  socket.on('playerReady', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    if (player.roomId === 'public') {
      handlePublicReady(socket.id);
    } else {
      handlePrivateReady(socket.id);
    }
  });

  // Host starts private race
  socket.on('startPrivateRace', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId || player.roomId === 'public') return;

    const room = privateRooms.get(player.roomId);
    if (!room || room.host !== socket.id) return;

    if (room.players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    startRoomCountdown(room.id, 'private');
  });

  // Player typing progress
  socket.on('typingProgress', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;

    let room;
    if (player.roomId === 'public') {
      room = publicRooms.get('public');
    } else {
      room = privateRooms.get(player.roomId);
    }

    if (!room || room.status !== 'racing') return;

    const playerInRoom = room.players.find(p => p.socketId === socket.id);
    if (playerInRoom && !playerInRoom.finished) {
      playerInRoom.progress = data.progress;
      playerInRoom.wpm = data.wpm;
      playerInRoom.accuracy = data.accuracy;

      // Check if player finished
      if (data.progress >= 100) {
        playerInRoom.finished = true;
        playerInRoom.finishTime = Date.now() - room.startTime;
        
        // Update player stats
        const playerData = playerSessions.get(player.playerId);
        playerData.gamesPlayed = (playerData.gamesPlayed || 0) + 1;
        
        // Check if this player won
        const finishedPlayers = room.players.filter(p => p.finished);
        if (finishedPlayers.length === 1) {
          playerData.wins = (playerData.wins || 0) + 1;
          socket.emit('raceFinished', { position: 1, wpm: data.wpm });
        } else {
          socket.emit('raceFinished', { 
            position: finishedPlayers.length, 
            wpm: data.wpm 
          });
        }

        // Check if all players finished
        if (room.players.every(p => p.finished)) {
          room.status = 'finished';
          if (player.roomId === 'public') {
            io.to('public').emit('raceCompleted', { room });
          } else {
            io.to(room.id).emit('raceCompleted', { room });
          }
        }
      }

      // Update all players
      if (player.roomId === 'public') {
        io.to('public').emit('publicRoomUpdated', { room });
      } else {
        io.to(room.id).emit('privateRoomUpdated', { room });
      }
    }
  });

  // Leave room
  socket.on('leaveRoom', () => {
    handlePlayerLeave(socket.id);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    handlePlayerLeave(socket.id);
  });
});

// Helper functions
function getOrCreatePublicRoom() {
  let publicRoom = publicRooms.get('public');
  if (!publicRoom) {
    publicRoom = {
      id: 'public',
      players: [],
      status: 'waiting',
      quote: getRandomQuote(),
      startTime: null,
      createdAt: new Date().toISOString(),
      isPrivate: false
    };
    publicRooms.set('public', publicRoom);
  }
  return publicRoom;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRandomQuote() {
  return multiplayerQuotes[Math.floor(Math.random() * multiplayerQuotes.length)];
}

function handlePublicReady(socketId) {
  const publicRoom = publicRooms.get('public');
  if (!publicRoom) return;

  const playerInRoom = publicRoom.players.find(p => p.socketId === socketId);
  if (playerInRoom) {
    playerInRoom.ready = true;
  }

  checkPublicRaceStart(publicRoom);
}

function handlePrivateReady(socketId) {
  const player = players.get(socketId);
  if (!player || !player.roomId || player.roomId === 'public') return;

  const room = privateRooms.get(player.roomId);
  if (!room) return;

  const playerInRoom = room.players.find(p => p.socketId === socketId);
  if (playerInRoom) {
    playerInRoom.ready = true;
  }

  io.to(room.id).emit('privateRoomUpdated', { room });
}

function checkPublicRaceStart(publicRoom) {
  const readyPlayers = publicRoom.players.filter(p => p.ready);
  const totalPlayers = publicRoom.players.length;

  if ((readyPlayers.length >= 2 && totalPlayers >= 2) || totalPlayers === 4) {
    if (publicRoom.status === 'waiting') {
      startRoomCountdown('public', 'public');
    }
  }
}

function startRoomCountdown(roomId, roomType) {
  let room;
  if (roomType === 'public') {
    room = publicRooms.get(roomId);
  } else {
    room = privateRooms.get(roomId);
  }

  if (!room) return;

  room.status = 'counting';
  let countdown = 5;

  const countdownEvent = roomType === 'public' ? 'publicCountdownStarted' : 'privateCountdownStarted';
  io.to(roomId).emit(countdownEvent, { countdown });

  const countdownInterval = setInterval(() => {
    const countdownEvent = roomType === 'public' ? 'publicCountdown' : 'privateCountdown';
    io.to(roomId).emit(countdownEvent, { countdown });
    countdown--;

    if (countdown < 0) {
      clearInterval(countdownInterval);
      startRoomRace(roomId, roomType);
    }
  }, 1000);
}

function startRoomRace(roomId, roomType) {
  let room;
  if (roomType === 'public') {
    room = publicRooms.get(roomId);
  } else {
    room = privateRooms.get(roomId);
  }

  if (!room) return;

  room.status = 'racing';
  room.startTime = Date.now();

  const raceStartedEvent = roomType === 'public' ? 'publicRaceStarted' : 'privateRaceStarted';
  io.to(roomId).emit(raceStartedEvent, { 
    room, 
    quote: room.quote 
  });

  console.log(`Race started in ${roomType} room: ${roomId}`);
}

function handlePlayerLeave(socketId) {
  const player = players.get(socketId);
  
  if (player && player.roomId) {
    if (player.roomId === 'public') {
      const publicRoom = publicRooms.get('public');
      if (publicRoom) {
        publicRoom.players = publicRoom.players.filter(p => p.socketId !== socketId);
        io.to('public').emit('publicRoomUpdated', { room: publicRoom });

        if (publicRoom.players.length === 0) {
          publicRooms.delete('public');
        }
      }
    } else {
      const room = privateRooms.get(player.roomId);
      if (room) {
        room.players = room.players.filter(p => p.socketId !== socketId);
        
        io.to(room.id).emit('playerLeft', { 
          playerName: player.name 
        });

        if (room.players.length === 0) {
          privateRooms.delete(room.id);
        } else {
          io.to(room.id).emit('privateRoomUpdated', { room });
        }
      }
    }
  }
  
  players.delete(socketId);
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Seedy-Typey multiplayer server running on port ${PORT}`);
});

// Add this to the existing server.js in the Socket.io connection handling section:

// Handle character updates
socket.on('updateCharacter', (data) => {
    const player = players.get(socket.id);
    if (player && playerSessions.has(player.playerId)) {
        const playerData = playerSessions.get(player.playerId);
        playerData.character = data.character;
        
        // Update in current room if any
        if (player.roomId) {
            let room;
            if (player.roomId === 'public') {
                room = publicRooms.get('public');
            } else {
                room = privateRooms.get(player.roomId);
            }
            
            if (room) {
                const playerInRoom = room.players.find(p => p.socketId === socket.id);
                if (playerInRoom) {
                    playerInRoom.character = data.character;
                    
                    // Notify all players in the room
                    if (player.roomId === 'public') {
                        io.to('public').emit('publicRoomUpdated', { room });
                    } else {
                        io.to(room.id).emit('privateRoomUpdated', { room });
                    }
                }
            }
        }
    }
});