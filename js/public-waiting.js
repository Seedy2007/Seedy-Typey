// Public waiting room functionality
document.addEventListener('DOMContentLoaded', function() {
    const playersList = document.getElementById('players-list');
    const playerCount = document.getElementById('player-count');
    const lobbyStatus = document.getElementById('lobby-status');
    const readyBtn = document.getElementById('ready-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const menuBtn = document.getElementById('menu-btn');

    let socket = null;
    let playerReady = false;

    function connectToServer() {
        socket = io('https://seedy-typey-backend.onrender.com', {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('Connected to server');
            
            // Identify player
            const playerData = JSON.parse(localStorage.getItem('seedyTypeyPlayer') || '{}');
            if (!playerData.id) {
                alert('Please set up your player profile first.');
                window.location.href = 'index.html';
                return;
            }
            
            socket.emit('identify', {
                playerId: playerData.id,
                name: playerData.name,
                character: playerData.character
            });
            
            // Join public race
            socket.emit('joinPublicRace');
        });

        socket.on('publicRoomUpdated', (data) => {
            updatePlayersList(data.room.players);
            updateLobbyStatus(data.room);
        });

        socket.on('publicRaceStarted', (data) => {
            // Store race data and redirect to multiplayer game
            const roomData = {
                roomId: data.room.id,
                players: data.room.players,
                quote: data.quote,
                isPrivate: false,
                startTime: data.room.startTime
            };
            
            localStorage.setItem('multiplayerRace', JSON.stringify(roomData));
            window.location.href = 'multiplayer-game.html';
        });

        socket.on('error', (data) => {
            console.error('Socket error:', data);
            showNotification('Error: ' + data.message);
        });
    }

    function updatePlayersList(players) {
        if (!playersList) return;
        
        playersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            if (player.ready) {
                li.innerHTML += ' <span style="color: #4CAF50;">✓ Ready</span>';
            }
            playersList.appendChild(li);
        });
        
        if (playerCount) {
            playerCount.textContent = `Players: ${players.length}/4`;
        }
    }

    function updateLobbyStatus(room) {
        if (!lobbyStatus) return;
        
        const readyPlayers = room.players.filter(p => p.ready).length;
        const totalPlayers = room.players.length;
        
        if (totalPlayers >= 4) {
            lobbyStatus.textContent = 'Starting soon... (4 players reached)';
        } else if (readyPlayers >= 2 && totalPlayers >= 2) {
            lobbyStatus.textContent = 'Starting soon... (2+ players ready)';
        } else {
            lobbyStatus.textContent = `Waiting for players... (${readyPlayers}/${Math.max(2, totalPlayers)} ready)`;
        }
    }

    function setupEventListeners() {
        readyBtn?.addEventListener('click', () => {
            if (!playerReady && socket) {
                socket.emit('playerReady');
                playerReady = true;
                readyBtn.disabled = true;
                readyBtn.textContent = 'Waiting for others...';
            }
        });

        leaveBtn?.addEventListener('click', () => {
            if (socket) {
                socket.emit('leaveRoom');
            }
            window.location.href = 'index.html';
        });

        menuBtn?.addEventListener('click', () => {
            if (socket) {
                socket.emit('leaveRoom');
            }
            window.location.href = 'index.html';
        });
    }

    function showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            border: 2px solid #fdbb2d;
            z-index: 10000;
            font-size: 16px;
            font-weight: bold;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Initialize
    connectToServer();
    setupEventListeners();
});