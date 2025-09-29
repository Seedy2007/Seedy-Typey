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
        // UPDATED: Connect to your deployed Render backend
        this.socket = io('https://seedy-typey-backend.onrender.com');
        
        this.socket.on('connect', () => {
            this.connected = true;
            console.log('Connected to multiplayer server');
            
            // Identify ourselves to the server
            this.socket.emit('identify', {
                playerId: this.playerId,
                name: this.playerName,
                character: this.playerCharacter
            });
        });

        this.socket.on('identified', (data) => {
            this.playerId = data.playerId;
            console.log('Identified as:', data.player);
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
            this.startCountdown(data.countdown, 'private');
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
            this.startCountdown(data.countdown, 'public');
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
        document.getElementById('save-player-btn').addEventListener('click', () => {
            this.savePlayerInfo();
        });

        // Change name button
        document.getElementById('change-name-btn').addEventListener('click', () => {
            this.showNameModal();
        });

        // Game mode buttons
        document.getElementById('single-player-btn').addEventListener('click', () => {
            window.location.href = 'game.html';
        });

        document.getElementById('public-race-btn').addEventListener('click', () => {
            this.joinPublicRace();
        });

        document.getElementById('private-race-btn').addEventListener('click', () => {
            this.createPrivateRoom();
        });

        // Private room controls
        document.getElementById('start-private-race-btn').addEventListener('click', () => {
            this.startPrivateRace();
        });

        document.getElementById('leave-room-btn').addEventListener('click', () => {
            this.leaveRoom();
        });

        document.getElementById('copy-link-btn').addEventListener('click', () => {
            this.copyRoomLink();
        });

        // Public race controls
        document.getElementById('ready-btn').addEventListener('click', () => {
            this.setPlayerReady();
        });

        document.getElementById('leave-public-btn').addEventListener('click', () => {
            this.leaveRoom();
        });
    }

    showNameModal() {
        const modal = document.getElementById('name-modal');
        const nameInput = document.getElementById('player-name-input');
        
        nameInput.value = this.playerName;
        modal.classList.remove('hidden');
        
        // Set up character selection in modal
        this.setupMiniCharacterSelection();
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
        const name = nameInput.value.trim();
        
        if (name.length < 2) {
            this.showNotification('Please enter a name with at least 2 characters');
            return;
        }
        
        this.savePlayerData(name, this.playerCharacter);
        document.getElementById('name-modal').classList.add('hidden');
        
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
        document.getElementById('public-waiting-modal').classList.remove('hidden');
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
        
        const roomUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        roomLink.value = roomUrl;
        
        this.updatePrivateRoomDisplay(room);
        modal.classList.remove('hidden');
    }

    updatePrivateRoomDisplay(room) {
        const playersList = document.getElementById('players-list');
        playersList.innerHTML = '';
        
        room.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            if (player.ready) {
                li.innerHTML += ' ✓';
            }
            playersList.appendChild(li);
        });

        const startBtn = document.getElementById('start-private-race-btn');
        startBtn.disabled = room.players.length < 2;
    }

    updatePublicRoomDisplay(room) {
        const playersList = document.getElementById('public-players-list');
        playersList.innerHTML = '';
        
        room.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            if (player.ready) {
                li.innerHTML += ' ✓';
            }
            playersList.appendChild(li);
        });
    }

    startPrivateRace() {
        this.socket.emit('startPrivateRace');
    }

    setPlayerReady() {
        this.socket.emit('playerReady');
        document.getElementById('ready-btn').disabled = true;
        document.getElementById('ready-btn').textContent = 'Waiting...';
    }

    leaveRoom() {
        this.socket.emit('leaveRoom');
        this.roomId = null;
        this.isHost = false;
        
        document.getElementById('private-room-modal').classList.add('hidden');
        document.getElementById('public-waiting-modal').classList.add('hidden');
    }

    copyRoomLink() {
        const roomLink = document.getElementById('room-link');
        roomLink.select();
        document.execCommand('copy');
        this.showNotification('Room link copied to clipboard!');
    }

    startCountdown(countdown, type) {
        console.log(`Starting countdown: ${countdown} for ${type} race`);
        // Countdown will be handled in the race interface
    }

    updateCountdown(countdown, type) {
        console.log(`Countdown: ${countdown} for ${type} race`);
        // Countdown will be handled in the race interface
    }

    startMultiplayerRace(room, quote, type) {
        // Redirect to multiplayer game page with room data
        const roomData = {
            roomId: room.id,
            players: room.players,
            quote: quote,
            isPrivate: type === 'private'
        };
        
        localStorage.setItem('multiplayerRace', JSON.stringify(roomData));
        window.location.href = 'multiplayer.html';
    }

    showRaceResults(room) {
        // Show race results modal
        console.log('Race completed:', room);
    }

    showNotification(message) {
        // Simple notification system
        alert(message); // Replace with better UI later
    }
}

// Check for room invitation from URL
function checkRoomInvitation() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');
    
    if (roomId && multiplayer) {
        // Auto-join the room
        multiplayer.socket.emit('joinPrivateRoom', { roomId });
    }
}

// Global multiplayer instance
const multiplayer = new MultiplayerManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    multiplayer.init();
    setTimeout(checkRoomInvitation, 1000); // Check for room invites after a delay
});