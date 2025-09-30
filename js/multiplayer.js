// Multiplayer functionality for main menu
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
            this.showMainMenu();
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
        this.showMainMenu();
    }

    generatePlayerId() {
        return 'player_' + Math.random().toString(36).substr(2, 9);
    }

    showMainMenu() {
        // Hide name modal
        const nameModal = document.getElementById('name-modal');
        if (nameModal) {
            nameModal.classList.add('hidden');
        }
        
        // Show player info and menu content
        const playerInfo = document.getElementById('player-info-display');
        const menuContent = document.getElementById('menu-content');
        if (playerInfo) {
            playerInfo.classList.remove('hidden');
        }
        if (menuContent) {
            menuContent.classList.remove('hidden');
        }
        
        // Update player display
        this.updatePlayerDisplay();
    }

    updatePlayerDisplay() {
        const displayElement = document.getElementById('player-display-name');
        if (displayElement) {
            displayElement.textContent = this.playerName;
        }
    }

    connectToServer() {
        console.log('🔄 Connecting to server...');
        
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
            window.location.href = 'public-waiting.html';
        });

        document.getElementById('private-race-btn')?.addEventListener('click', () => {
            window.location.href = 'private-waiting.html';
        });
    }

    showNameModal() {
        const modal = document.getElementById('name-modal');
        const nameInput = document.getElementById('player-name-input');
        const playerInfo = document.getElementById('player-info-display');
        const menuContent = document.getElementById('menu-content');
        
        if (modal && nameInput) {
            nameInput.value = this.playerName;
            modal.classList.remove('hidden');
            if (playerInfo) playerInfo.classList.add('hidden');
            if (menuContent) menuContent.classList.add('hidden');
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
        
        // Re-identify with server if connected
        if (this.connected) {
            this.socket.emit('identify', {
                playerId: this.playerId,
                name: this.playerName,
                character: this.playerCharacter
            });
        }
    }

    showNotification(message) {
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
    
    if (roomId) {
        // Store room ID and redirect to private waiting
        localStorage.setItem('joinPrivateRoom', roomId);
        window.location.href = 'private-waiting.html';
    }
}

// Global multiplayer instance
const multiplayer = new MultiplayerManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    multiplayer.init();
    setTimeout(checkRoomInvitation, 1000);
});