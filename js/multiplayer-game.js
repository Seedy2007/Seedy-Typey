// Multiplayer game functionality
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
    const roomIdElement = document.getElementById('room-id');
    const menuBtn = document.getElementById('menu-btn');
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
        
        console.log('Starting multiplayer race:', raceData);
        
        // Update UI
        roomIdElement.textContent = `Room: ${raceData.roomId}`;
        renderQuote();
        createPlayerLanes();
        
        // Connect to socket
        connectToSocket();
        setupEventListeners();
        
        // Show waiting message
        quoteDisplay.textContent = 'Waiting for race to start...';
        typingInput.placeholder = 'Race will start soon...';
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
                character: playerData.character
            });
            
            // Join the room
            if (raceData.isPrivate) {
                socket.emit('joinPrivateRoom', { roomId: raceData.roomId });
            } else {
                socket.emit('joinPublicRace');
            }
        });

        // Listen for player updates
        socket.on('privateRoomUpdated', handleRoomUpdate);
        socket.on('publicRoomUpdated', handleRoomUpdate);
        
        // Listen for race events
        socket.on('privateRaceStarted', startRace);
        socket.on('publicRaceStarted', startRace);

        socket.on('raceCompleted', showResults);
        
        socket.on('error', (data) => {
            console.error('Socket error:', data);
            showNotification('Error: ' + data.message);
        });
    }

    function handleRoomUpdate(data) {
        updatePlayerProgress(data.room.players);
    }

    function createPlayerLanes() {
        trackElement.innerHTML = '';
        
        raceData.players.forEach((player, index) => {
            const lane = document.createElement('div');
            lane.className = 'track-lane';
            lane.innerHTML = `
                <span class="lane-label">${player.name}</span>
                <div class="car player" id="player-${player.socketId}" style="left: 5%">
                    <div class="char-container">
                        <div class="char ${player.character}">${getCharExpression(player.character)}</div>
                    </div>
                </div>
            `;
            trackElement.appendChild(lane);
        });
        
        const finishLine = document.createElement('div');
        finishLine.className = 'finish-line';
        trackElement.appendChild(finishLine);
    }

    function getCharExpression(charType) {
        const expressions = {
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
        return expressions[charType] || '•ᴗ•';
    }

    function updatePlayerProgress(players) {
        players.forEach(player => {
            const carElement = document.getElementById(`player-${player.socketId}`);
            if (carElement) {
                carElement.style.left = `${5 + (player.progress * 0.85)}%`;
            }
            
            // Update player list
            updatePlayersList(players);
        });
    }

    function updatePlayersList(players) {
        playersContainer.innerHTML = '';
        players.forEach(player => {
            const playerElement = document.createElement('div');
            playerElement.className = 'player-item';
            playerElement.innerHTML = `
                <span class="player-name">${player.name}</span>
                <span class="player-stats">
                    WPM: ${player.wpm} | Acc: ${player.accuracy}% 
                    ${player.finished ? '🏁' : `Progress: ${player.progress}%`}
                </span>
            `;
            playersContainer.appendChild(playerElement);
        });
    }

    function renderQuote() {
        quoteDisplay.innerHTML = '';
        
        for (let i = 0; i < currentQuote.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.innerText = currentQuote[i];
            quoteDisplay.appendChild(charSpan);
        }
        
        if (quoteDisplay.firstChild) {
            quoteDisplay.firstChild.classList.add('current');
        }
    }

    function startRace(data) {
        console.log('Race starting!', data);
        currentQuote = data.quote;
        renderQuote();
        
        // Start countdown
        startCountdown();
    }

    function startCountdown() {
        countdownElement.classList.remove('hidden');
        typingInput.disabled = true;
        
        let count = 3;
        countdownNumber.textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                clearInterval(countdownInterval);
                countdownElement.classList.add('hidden');
                startGame();
            }
        }, 1000);
    }

    function startGame() {
        gameActive = true;
        startTime = new Date();
        timeLeft = 60;
        correctCharacters = 0;
        errorPositions = new Set();
        playerProgress = 0;
        
        // Enable input
        typingInput.disabled = false;
        typingInput.placeholder = "Start typing...";
        typingInput.focus();
        typingInput.value = '';
        
        // Start timer
        startTimer();
        
        // Start progress reporting
        progressInterval = setInterval(reportProgress, 1000);
    }

    function startTimer() {
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function setupEventListeners() {
        // Typing input
        typingInput.addEventListener('input', handleTyping);
        typingInput.addEventListener('keydown', preventCopyPaste);
        
        // Menu button
        menuBtn.addEventListener('click', () => {
            if (socket) {
                socket.emit('leaveRoom');
            }
            window.location.href = 'index.html';
        });
    }

    function handleTyping() {
        if (!gameActive) return;
        
        const inputArray = typingInput.value.split('');
        const quoteArray = currentQuote.split('');
        
        // Update character styling
        quoteDisplay.querySelectorAll('span').forEach((char, index) => {
            const typedChar = inputArray[index];
            
            char.classList.remove('correct', 'incorrect', 'current');
            
            if (typedChar == null) {
                if (index === inputArray.length) {
                    char.classList.add('current');
                }
            } else if (typedChar === quoteArray[index]) {
                char.classList.add('correct');
                if (index === inputArray.length - 1) {
                    char.classList.add('current');
                }
            } else {
                char.classList.add('incorrect');
                if (index === inputArray.length - 1) {
                    char.classList.add('current');
                }
                errorPositions.add(index);
            }
        });
        
        // Count correct characters
        correctCharacters = 0;
        for (let i = 0; i < inputArray.length; i++) {
            if (inputArray[i] === quoteArray[i]) {
                correctCharacters++;
            } else {
                break;
            }
        }
        
        // Calculate stats
        const elapsedTime = (new Date() - startTime) / 1000 / 60;
        playerWPM = Math.round(correctCharacters / 5 / elapsedTime) || 0;
        playerAccuracy = Math.max(0, Math.round(((currentQuote.length - errorPositions.size) / currentQuote.length) * 100));
        playerProgress = Math.min(100, Math.round((correctCharacters / currentQuote.length) * 100));
        
        // Update UI
        wpmElement.textContent = playerWPM;
        accuracyElement.textContent = `${playerAccuracy}%`;
        progressElement.textContent = `${playerProgress}%`;
        currentWpmElement.textContent = `${playerWPM} WPM`;
        
        // Update player car
        const playerData = JSON.parse(localStorage.getItem('seedyTypeyPlayer') || '{}');
        const playerCar = document.getElementById(`player-${socket.id}`);
        if (playerCar) {
            playerCar.style.left = `${5 + (playerProgress * 0.85)}%`;
        }
        
        // Check if finished
        if (inputArray.length === quoteArray.length && !hasErrors()) {
            finishRace();
        }
    }

    function hasErrors() {
        const inputArray = typingInput.value.split('');
        const quoteArray = currentQuote.split('');
        
        for (let i = 0; i < inputArray.length; i++) {
            if (inputArray[i] !== quoteArray[i]) {
                return true;
            }
        }
        return false;
    }

    function reportProgress() {
        if (socket && gameActive) {
            socket.emit('typingProgress', {
                progress: playerProgress,
                wpm: playerWPM,
                accuracy: playerAccuracy
            });
        }
    }

    function finishRace() {
        if (!gameActive) return;
        
        gameActive = false;
        typingInput.disabled = true;
        clearInterval(timerInterval);
        clearInterval(progressInterval);
        
        // Report final progress
        reportProgress();
        
        // Show temporary message
        const finishTime = (new Date() - startTime) / 1000;
        showNotification(`You finished in ${finishTime.toFixed(1)} seconds! Waiting for others...`);
    }

    function endGame() {
        if (!gameActive) return;
        
        gameActive = false;
        typingInput.disabled = true;
        clearInterval(timerInterval);
        clearInterval(progressInterval);
        
        showNotification("Time's up! Race finished.");
        
        // Return to menu after delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 5000);
    }

    function showResults(data) {
        const winner = data.room.players.reduce((prev, current) => 
            (prev.finishTime < current.finishTime) ? prev : current
        );
        
        const playerData = JSON.parse(localStorage.getItem('seedyTypeyPlayer') || '{}');
        const isWinner = winner.playerId === playerData.id;
        
        showNotification(isWinner ? 
            '🎉 You won the race!' : 
            `🏁 Race finished! Winner: ${winner.name}`
        );
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 4000);
    }

    function preventCopyPaste(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'c' || e.key === 'v' || e.key === 'x') {
                e.preventDefault();
                return false;
            }
        }
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

    // Initialize the game
    initGame();
});