// Private waiting room functionality
document.addEventListener('DOMContentLoaded', function() {
    const playersList = document.getElementById('players-list');
    const roomIdElement = document.getElementById('room-id');
    const roomLink = document.getElementById('room-link');
    const startRaceBtn = document.getElementById('start-race-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const menuBtn = document.getElementById('menu-btn');
    const copyLinkBtn = document.getElementById('copy-link-btn');
    const hostInfo = document.getElementById('host-info');

    let socket = null;
    let isHost = false;
    let roomId = null;

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
            
            // Check if joining existing room or creating new one
            const joinRoomId = localStorage.getItem('joinPrivateRoom');
            if (joinRoomId) {
                // Joining existing room
                socket.emit('joinPrivateRoom', { roomId: joinRoomId });
                localStorage.removeItem('joinPrivateRoom');
            } else {
                // Creating new room
                socket.emit('createPrivateRoom');
            }
        });

        socket.on('privateRoomCreated', (data) => {
            roomId = data.roomId;
            isHost = true;
            updateRoomInfo(data.roomId);
            updatePlayersList(data.room.players);
            if (hostInfo) {
                hostInfo.textContent = 'You are the host. Start the race when ready!';
            }
        });

        socket.on('privateRoomUpdated', (data) => {
            updatePlayersList(data.room.players);
            if (isHost && startRaceBtn) {
                startRaceBtn.disabled = data.room.players.length < 2;
            }
        });

        socket.on('privateRaceStarted', (data) => {
            // Store race data and redirect to private game
            const roomData = {
                roomId: data.room.id,
                players: data.room.players,
                quote: data.quote,
                isPrivate: true,
                startTime: data.room.startTime
            };
            
            localStorage.setItem('multiplayerRace', JSON.stringify(roomData));
            window.location.href = 'private-game.html';
        });

        socket.on('error', (data) => {
            console.error('Socket error:', data);
            showNotification('Error: ' + data.message);
        });
    }

    function updateRoomInfo(roomId) {
        if (roomIdElement) {
            roomIdElement.textContent = `Room: ${roomId}`;
        }
        if (roomLink) {
            const roomUrl = `${window.location.origin}${window.location.pathname.replace('private-waiting.html', '')}index.html?room=${roomId}`;
            roomLink.value = roomUrl;
        }
    }

    function updatePlayersList(players) {
        if (!playersList) return;
        
        playersList.innerHTML = '';
        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            playersList.appendChild(li);
        });
    }

    function setupEventListeners() {
        startRaceBtn?.addEventListener('click', () => {
            if (isHost && socket) {
                socket.emit('startPrivateRace');
            }
        });

        copyLinkBtn?.addEventListener('click', () => {
            if (roomLink) {
                roomLink.select();
                roomLink.setSelectionRange(0, 99999);
                navigator.clipboard.writeText(roomLink.value);
                showNotification('Room link copied to clipboard!');
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