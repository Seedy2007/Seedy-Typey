// Multiplayer functionality
class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.playerId = null;
        this.playerName = 'Player';
        this.playerCharacter = 'happy';
        this.roomId = null;
        this.connected = false;
        this.isHost = false;
    }

    init() {
        this.loadPlayerData();
        this.connectToServer();
        this.setupEventListeners();
    }

    loadPlayerData() {
        const savedPlayer = localStorage.getItem('seedyTypeyPlayer');
        if (savedPlayer) {
            const playerData = JSON.parse(savedPlayer);
            this.playerId = playerData.id;
            this.playerName = playerData.name;
            this.playerCharacter = playerData.character;
            this.updatePlayerDisplay();
        } else {
            this.showNameModal();
        }
    }

    savePlayerData(name, character) {
        if (!this.playerId) {
            this.playerId = this.generatePlayerId();
        }
        
        const playerData = {
            id: this.playerId,
            name: name,
            character: character,
            lastPlayed: new Date().toISOString()
        };
        
        localStorage.setItem('seedyTypeyPlayer', JSON.stringify(playerData));
        this.playerName = name;
        this.playerCharacter = character;
        this.updatePlayerDisplay();
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    updatePlayerDisplay() {
        const displayElement = document.getElementById('player-display-name');
        if (displayElement) {
            displayElement.textContent = this.playerName;
        }
    }

    connectToServer() {
        console.log('🔄 Connecting to server...');
        
        // UPDATED: Better connection handling
        this.socket = io('https://seedy-typey-backend.onrender.com', {
            transports: ['websocket', 'polling'],
            timeout: 10000
        });
        
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('✅ Connected to multiplayer server');
            
            // Identify ourselves to the server
            this.socket.emit('identify', {
                playerId: this.playerId,
                name: this.playerName,
                character: this.playerCharacter
            });
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection failed:', error);
            this.showNotification('Failed to connect to server. Please refresh and try again.');
        });

        this.socket.on('identified', (data) => {
            this.playerId = data.playerId;
            console.log('👤 Identified as:', data.player);
        });

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        // Private room events
        this.socket.on('privateRoomCreated', (data) => {
            this.roomId = data.roomId;
            this.isHost = true;
            this.showPrivateRoomModal(data.roomId, data.room);
        });

        this.socket.on('privateRoomUpdated', (data) => {
            this.updatePrivateRoomDisplay(data.room);
        });

        this.socket.on('privateCountdownStarted', (data) => {
            this.showCountdown(data.countdown, 'private');
        });

        this.socket.on('privateCountdown', (data) => {
            this.updateCountdown(data.countdown, 'private');
        });

        this.socket.on('privateRaceStarted', (data) => {
            this.startMultiplayerRace(data.room, data.quote, 'private');
        });

        // Public race events
        this.socket.on('publicRoomUpdated', (data) => {
            this.updatePublicRoomDisplay(data.room);
        });

        this.socket.on('publicCountdownStarted', (data) => {
            this.showCountdown(data.countdown, 'public');
        });

        this.socket.on('publicCountdown', (data) => {
            this.updateCountdown(data.countdown, 'public');
        });

        this.socket.on('publicRaceStarted', (data) => {
            this.startMultiplayerRace(data.room, data.quote, 'public');
        });

        // Common events
        this.socket.on('raceCompleted', (data) => {
            this.showRaceResults(data.room);
        });

        this.socket.on('playerLeft', (data) => {
            this.showNotification(`${data.playerName} left the room`);
        });

        this.socket.on('error', (data) => {
            this.showNotification('Error: ' + data.message);
        });
    }

    setupEventListeners() {
        // Name modal
        document.getElementById('save-player-btn')?.addEventListener('click', () => {
            this.savePlayerInfo();
        });

        // Change name button
        document.getElementById('change-name-btn')?.addEventListener('click', () => {
            this.showNameModal();
        });

        // Game mode buttons
        document.getElementById('single-player-btn')?.addEventListener('click', () => {
            window.location.href = 'game.html';
        });

        document.getElementById('public-race-btn')?.addEventListener('click', () => {
            this.joinPublicRace();
        });

        document.getElementById('private-race-btn')?.addEventListener('click', () => {
            this.createPrivateRoom();
        });

        // Private room controls
        document.getElementById('start-private-race-btn')?.addEventListener('click', () => {
            this.startPrivateRace();
        });

        document.getElementById('leave-room-btn')?.addEventListener('click', () => {
            this.leaveRoom();
        });

        document.getElementById('copy-link-btn')?.addEventListener('click', () => {
            this.copyRoomLink();
        });

        // Public race controls
        document.getElementById('ready-btn')?.addEventListener('click', () => {
            this.setPlayerReady();
        });

        document.getElementById('leave-public-btn')?.addEventListener('click', () => {
            this.leaveRoom();
        });
    }

    showNameModal() {
        const modal = document.getElementById('name-modal');
        const nameInput = document.getElementById('player-name-input');
        
        if (modal && nameInput) {
            nameInput.value = this.playerName;
            modal.classList.remove('hidden');
            this.setupMiniCharacterSelection();
        }
    }

    setupMiniCharacterSelection() {
        const charOptions = document.querySelectorAll('.char-option-mini');
        charOptions.forEach(option => {
            option.addEventListener('click', () => {
                charOptions.forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.playerCharacter = option.dataset.char;
            });
            
            if (option.dataset.char === this.playerCharacter) {
                option.classList.add('active');
            }
        });
    }

    savePlayerInfo() {
        const nameInput = document.getElementById('player-name-input');
        const name = nameInput?.value.trim();
        
        if (!name || name.length < 2) {
            this.showNotification('Please enter a name with at least 2 characters');
            return;
        }
        
        this.savePlayerData(name, this.playerCharacter);
        const modal = document.getElementById('name-modal');
        if (modal) modal.classList.add('hidden');
        
        // Re-identify with server if connected
        if (this.connected) {
            this.socket.emit('identify', {
                playerId: this.playerId,
                name: this.playerName,
                character: this.playerCharacter
            });
        }
    }

    joinPublicRace() {
        if (!this.connected) {
            this.showNotification('Not connected to server');
            return;
        }
        
        this.socket.emit('joinPublicRace');
        const modal = document.getElementById('public-waiting-modal');
        if (modal) modal.classList.remove('hidden');
    }

    createPrivateRoom() {
        if (!this.connected) {
            this.showNotification('Not connected to server');
            return;
        }
        
        this.socket.emit('createPrivateRoom');
    }

    showPrivateRoomModal(roomId, room) {
        const modal = document.getElementById('private-room-modal');
        const roomLink = document.getElementById('room-link');
        
        if (modal && roomLink) {
            const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
            roomLink.value = roomUrl;
            
            this.updatePrivateRoomDisplay(room);
            modal.classList.remove('hidden');
        }
    }

    updatePrivateRoomDisplay(room) {
        const playersList = document.getElementById('players-list');
        if (!playersList) return;
        
        playersList.innerHTML = '';
        
        room.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            if (player.ready) {
                li.innerHTML += ' <span style="color: #4CAF50;">✓ Ready</span>';
            }
            playersList.appendChild(li);
        });

        const startBtn = document.getElementById('start-private-race-btn');
        if (startBtn) {
            startBtn.disabled = room.players.length < 2;
            startBtn.textContent = room.players.length < 2 ? 
                'Need 2+ Players' : 'Start Race';
        }
    }

    updatePublicRoomDisplay(room) {
        const playersList = document.getElementById('public-players-list');
        if (!playersList) return;
        
        playersList.innerHTML = '';
        
        room.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            if (player.ready) {
                li.innerHTML += ' <span style="color: #4CAF50;">✓ Ready</span>';
            }
            playersList.appendChild(li);
        });

        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) {
            const playerInRoom = room.players.find(p => p.socketId === this.socket.id);
            if (playerInRoom && playerInRoom.ready) {
                readyBtn.disabled = true;
                readyBtn.textContent = 'Waiting for others...';
            }
        }
    }

    startPrivateRace() {
        this.socket.emit('startPrivateRace');
    }

    setPlayerReady() {
        this.socket.emit('playerReady');
        const readyBtn = document.getElementById('ready-btn');
        if (readyBtn) {
            readyBtn.disabled = true;
            readyBtn.textContent = 'Waiting for others...';
        }
    }

    leaveRoom() {
        this.socket.emit('leaveRoom');
        this.roomId = null;
        this.isHost = false;
        
        const privateModal = document.getElementById('private-room-modal');
        const publicModal = document.getElementById('public-waiting-modal');
        
        if (privateModal) privateModal.classList.add('hidden');
        if (publicModal) publicModal.classList.add('hidden');
    }

    copyRoomLink() {
        const roomLink = document.getElementById('room-link');
        if (roomLink) {
            roomLink.select();
            roomLink.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(roomLink.value);
            this.showNotification('Room link copied to clipboard!');
        }
    }

    showCountdown(countdown, type) {
        console.log(`Starting countdown: ${countdown} for ${type} race`);
        this.showNotification(`Race starting in ${countdown}...`);
    }

    updateCountdown(countdown, type) {
        console.log(`Countdown: ${countdown} for ${type} race`);
        if (countdown <= 3) {
            this.showNotification(countdown);
        }
    }

    startMultiplayerRace(room, quote, type) {
        // Store race data and redirect to multiplayer game
        const roomData = {
            roomId: room.id,
            players: room.players,
            quote: quote,
            isPrivate: type === 'private',
            startTime: room.startTime
        };
        
        localStorage.setItem('multiplayerRace', JSON.stringify(roomData));
        window.location.href = 'multiplayer-game.html';
    }

    showRaceResults(room) {
        const winner = room.players.reduce((prev, current) => 
            (prev.finishTime < current.finishTime) ? prev : current
        );
        
        this.showNotification(`Race finished! Winner: ${winner.name}`);
    }

    showNotification(message) {
        // Create a nice notification instead of alert
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            border-left: 4px solid #fdbb2d;
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Check for room invitation from URL
function checkRoomInvitation() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId && window.multiplayer) {
        window.multiplayer.socket.emit('joinPrivateRoom', { roomId });
    }
}

// Global multiplayer instance
const multiplayer = new MultiplayerManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    multiplayer.init();
    setTimeout(checkRoomInvitation, 1000);
});