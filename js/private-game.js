// Private game functionality (same as multiplayer-game.js but for private rooms)
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const quoteDisplay = document.getElementById('quote-display');
    const typingInput = document.getElementById('typing-input');
    const wpmElement = document.getElementById('wpm');
    const timerElement = document.getElementById('timer');
    const accuracyElement = document.getElementById('accuracy');
    const progressElement = document.getElementById('progress');
    const currentWpmElement = document.getElementById('current-wpm');
    const countdownElement = document.getElementById('countdown');
    const countdownNumber = document.getElementById('countdown-number');
    const roomInfoElement = document.getElementById('room-info');
    const roomLinkDisplay = document.getElementById('room-link-display');
    const menuBtn = document.getElementById('menu-btn');
    const changeCharBtn = document.getElementById('change-char-btn');
    const charPopup = document.getElementById('char-popup');
    const closeCharPopup = document.getElementById('close-char-popup');
    const charOptions = document.querySelectorAll('.char-option');
    const trackElement = document.getElementById('multiplayer-track');
    const playersContainer = document.getElementById('players-container');

    // Game state
    let socket = null;
    let raceData = null;
    let currentQuote = '';
    let gameActive = false;
    let startTime = null;
    let timeLeft = 60;
    let timerInterval = null;
    let correctCharacters = 0;
    let errorPositions = new Set();
    let playerProgress = 0;
    let playerWPM = 0;
    let playerAccuracy = 100;
    let progressInterval = null;
    let selectedChar = localStorage.getItem('selectedChar') || 'happy';

    // Character expressions mapping
    const charExpressions = {
        'happy': '•ᴗ•',
        'speedy': '•̀⤙•́',
        'cool': '¬‿¬',
        'shy': '◕‿◕',
        'sleepy': '◕‸◕',
        'mad': '≖_≖',
        'sad': '˙◠˙',
        'nerd': '╭ರ_•́',
        'robot': '≖⩊≖',
        'ghost': '✿◕‿◕'
    };

    // Initialize game
    async function initGame() {
        // Load race data
        const savedRace = localStorage.getItem('multiplayerRace');
        if (!savedRace) {
            alert('No race data found. Returning to menu.');
            window.location.href = 'index.html';
            return;
        }

        raceData = JSON.parse(savedRace);
        currentQuote = raceData.quote;
        
        console.log('Starting private race:', raceData);
        
        // Update UI
        roomInfoElement.textContent = `Private Room: ${raceData.roomId}`;
        roomLinkDisplay.textContent = `Share: ${window.location.origin}?room=${raceData.roomId}`;
        renderQuote();
        createPlayerLanes();
        setupCharacterSelection();
        
        // Connect to socket
        connectToSocket();
        setupEventListeners();
        
        // Show waiting message
        quoteDisplay.textContent = 'Waiting for race to start...';
        typingInput.placeholder = 'Race will start soon...';
    }

    function setupCharacterSelection() {
        changeCharBtn.addEventListener('click', function() {
            charPopup.classList.remove('hidden');
            
            // Update active state in popup
            charOptions.forEach(option => {
                option.classList.remove('active');
                if (option.dataset.char === selectedChar) {
                    option.classList.add('active');
                }
            });
        });
        
        closeCharPopup.addEventListener('click', function() {
            charPopup.classList.add('hidden');
        });
        
        charOptions.forEach(option => {
            option.addEventListener('click', function() {
                const charType = this.dataset.char;
                selectedChar = charType;
                localStorage.setItem('selectedChar', charType);
                
                // Update character on server
                if (socket) {
                    const playerData = JSON.parse(localStorage.getItem('seedyTypeyPlayer') || '{}');
                    socket.emit('identify', {
                        playerId: playerData.id,
                        name: playerData.name,
                        character: charType
                    });
                }
                
                // Update active state
                charOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Close popup after selection
                setTimeout(() => {
                    charPopup.classList.add('hidden');
                }, 500);
            });
        });
    }

    function connectToSocket() {
        socket = io('https://seedy-typey-backend.onrender.com', {
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('Connected to race server');
            // Re-identify
            const playerData = JSON.parse(localStorage.getItem('seedyTypeyPlayer') || '{}');
            socket.emit('identify', {
                playerId: playerData.id,
                name: playerData.name,
                character: selectedChar
            });
            
            // Join the private room
            socket.emit('joinPrivateRoom', { roomId: raceData.roomId });
        });

        // Listen for player updates
        socket.on('privateRoomUpdated', handleRoomUpdate);
        
        // Listen for race events
        socket.on('privateRaceStarted', startRace);

        socket.on('raceCompleted', showResults);
        
        socket.on('error', (data) => {
            console.error('Socket error:', data);
            showNotification('Error: ' + data.message);
        });
    }

    // All other functions are the same as multiplayer-game.js
    // ... (copy all the functions from multiplayer-game.js here)

    // Initialize the game
    initGame();
});