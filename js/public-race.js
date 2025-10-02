class PublicRaceGame {
    constructor() {
        this.socket = null;
        this.roomId = null;
        this.players = new Map();
        this.playerId = null;
        this.isReady = false;
        this.isRacing = false;
        this.isCountdown = false;
        this.currentQuote = '';
        this.currentIndex = 0;
        this.startTime = null;
        this.wpm = 0;
        this.accuracy = 100;
        this.progress = 0;
        this.errors = 0;
        this.correctCharacters = 0;
        this.totalCharactersTyped = 0;
        this.timeLeft = 60;
        this.timerInterval = null;
        this.raceInterval = null;
        this.playerFinished = false;
        this.errorPositions = new Set();
        
        // DOM Elements
        this.typingInput = document.getElementById('typing-input');
        this.quoteDisplay = document.getElementById('quote-display');
        this.wpmDisplay = document.getElementById('wpm');
        this.timerDisplay = document.getElementById('timer');
        this.accuracyDisplay = document.getElementById('accuracy');
        this.progressDisplay = document.getElementById('progress');
        this.currentWpmDisplay = document.getElementById('current-wpm');
        this.readyBtn = document.getElementById('ready-btn');
        this.menuBtn = document.getElementById('menu-btn');
        this.countdown = document.getElementById('countdown');
        this.countdownNumber = document.getElementById('countdown-number');
        this.roomStatus = document.getElementById('room-status');
        this.multiplayerTrack = document.getElementById('multiplayer-track');
        this.changeCharBtn = document.getElementById('change-char-btn');
        this.charPopup = document.getElementById('char-popup');
        this.closeCharPopup = document.getElementById('close-char-popup');
        this.charOptions = this.charPopup.querySelectorAll('.char-option');
        
        this.init();
    }

    init() {
        this.connectToServer();
        this.setupEventListeners();
        this.loadPlayerCharacter();
        this.startTrackEffects();
    }

    // Enhanced track effects
    startTrackEffects() {
        const track = this.multiplayerTrack;
        if (!track) return;

        // Add shimmer effect
        const shimmer = document.createElement('div');
        shimmer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.1) 50%, 
                transparent 100%);
            animation: trackShine 3s ease-in-out infinite;
            pointer-events: none;
            z-index: 1;
        `;
        track.appendChild(shimmer);

        // Add floating particles
        this.createFloatingParticles();
    }

    createFloatingParticles() {
        const track = this.multiplayerTrack;
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 3px;
                height: 3px;
                background: rgba(253, 187, 45, 0.6);
                border-radius: 50%;
                animation: floatParticle ${3 + Math.random() * 4}s ease-in-out infinite;
                animation-delay: ${Math.random() * 5}s;
                z-index: 1;
            `;
            
            // Random position along the track
            const left = 10 + Math.random() * 80;
            const top = 10 + Math.random() * 80;
            particle.style.left = `${left}%`;
            particle.style.top = `${top}%`;
            
            track.appendChild(particle);
        }
    }

    connectToServer() {
        // Connect to your Render backend
        const serverUrl = 'https://seedy-typey-backend.onrender.com';
        
        console.log('Connecting to server:', serverUrl);
        this.socket = io(serverUrl, {
            transports: ['websocket', 'polling']
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
            this.playerId = this.socket.id;
            this.joinPublicRoom();
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.roomStatus.textContent = 'Disconnected from server';
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.roomStatus.textContent = 'Connection failed. Please refresh.';
        });

        // Game event handlers
        this.socket.on('playerJoined', (data) => this.handlePlayerJoined(data));
        this.socket.on('playerLeft', (data) => this.handlePlayerLeft(data));
        this.socket.on('playerReady', (data) => this.handlePlayerReady(data));
        this.socket.on('raceStarting', (data) => this.handleRaceStarting(data));
        this.socket.on('raceStarted', (data) => this.handleRaceStarted(data));
        this.socket.on('playerProgress', (data) => this.handlePlayerProgress(data));
        this.socket.on('raceFinished', (data) => this.handleRaceFinished(data));
        this.socket.on('roomInfo', (data) => this.handleRoomInfo(data));
        this.socket.on('roomStatus', (data) => this.handleRoomStatus(data));
        this.socket.on('playerUpdated', (data) => this.handlePlayerUpdated(data));
    }

    joinPublicRoom() {
        const playerData = this.getPlayerData();
        console.log('Joining public room with data:', playerData);
        this.socket.emit('joinPublicRoom', playerData);
    }

    getPlayerData() {
        const savedData = localStorage.getItem('seedyPlayerData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                return {
                    name: data.name || 'Anonymous',
                    character: data.character || 'happy'
                };
            } catch (e) {
                console.error('Error parsing player data:', e);
            }
        }
        return {
            name: 'Anonymous',
            character: 'happy'
        };
    }

    setupEventListeners() {
        this.readyBtn.addEventListener('click', () => this.toggleReady());
        this.menuBtn.addEventListener('click', () => this.leaveRace());
        
        this.typingInput.addEventListener('input', (e) => this.handleInput(e));
        this.typingInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });

        // Character selection
        this.changeCharBtn.addEventListener('click', () => {
            this.charPopup.classList.remove('hidden');
            this.updateCharacterSelection();
        });

        this.closeCharPopup.addEventListener('click', () => {
            this.charPopup.classList.add('hidden');
        });

        this.charOptions.forEach(option => {
            option.addEventListener('click', () => {
                const charType = option.dataset.char;
                this.setPlayerCharacter(charType);
                this.charPopup.classList.add('hidden');
                
                // Update server with new character
                if (this.socket) {
                    this.socket.emit('updatePlayer', { character: charType });
                }
                
                // Update local player display immediately
                this.updateLocalPlayerCharacter(charType);
            });
        });

        // Prevent paste
        this.typingInput.addEventListener('paste', (e) => e.preventDefault());
    }

    updateCharacterSelection() {
        const playerData = this.getPlayerData();
        this.charOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.char === playerData.character) {
                option.classList.add('active');
            }
        });
    }

    loadPlayerCharacter() {
        const playerData = this.getPlayerData();
        this.setPlayerCharacter(playerData.character);
    }

    setPlayerCharacter(charType) {
        // Update local storage
        const savedData = localStorage.getItem('seedyPlayerData');
        let data;
        if (savedData) {
            data = JSON.parse(savedData);
        } else {
            data = this.getPlayerData();
        }
        data.character = charType;
        localStorage.setItem('seedyPlayerData', JSON.stringify(data));
    }

    updateLocalPlayerCharacter(charType) {
        // Update the current player's character display immediately
        if (this.playerId) {
            const playerCar = document.getElementById(`car-${this.playerId}`);
            if (playerCar) {
                const charElement = playerCar.querySelector('.char');
                charElement.className = `char ${charType}`;
                charElement.textContent = this.getCharacterText(charType);
                
                // Add character-specific animation
                this.applyCharacterAnimation(charElement, charType);
            }
        }
    }

    applyCharacterAnimation(charElement, charType) {
        // Remove existing animations
        charElement.style.animation = '';
        
        // Add character-specific animations
        switch(charType) {
            case 'happy':
                charElement.style.animation = 'float 1.8s ease-in-out infinite, glow 3s ease-in-out infinite';
                break;
            case 'speedy':
                charElement.style.animation = 'float 1.5s ease-in-out infinite, speedyPulse 2s ease-in-out infinite';
                break;
            case 'cool':
                charElement.style.animation = 'float 2s ease-in-out infinite, coolSpin 4s linear infinite';
                break;
            case 'seedy':
                charElement.style.animation = 'float 2.2s ease-in-out infinite, shake 0.5s ease-in-out infinite, glow 2.5s ease-in-out infinite alternate';
                break;
            default:
                charElement.style.animation = 'float 2s ease-in-out infinite';
        }
    }

    getCharacterText(charType) {
        const charTexts = {
            happy: '•ᴗ•',
            speedy: '•̀⤙•́',
            cool: '¬‿¬',
            shy: '◕‿◕',
            sleepy: '◕‸◕',
            mad: '≖_≖',
            sad: '˙◠˙',
            nerd: '╭ರ_•́',
            robot: '≖⩊≖',
            ghost: '✿◕‿◕'
        };
        return charTexts[charType] || '•ᴗ•';
    }

    handlePlayerJoined(data) {
        console.log('Player joined:', data);
        this.players.set(data.playerId, data);
        this.createPlayerLane(data);
        this.updateRoomStatus();
    }

    handlePlayerLeft(data) {
        console.log('Player left:', data);
        this.players.delete(data.playerId);
        this.removePlayerLane(data.playerId);
        this.updateRoomStatus();
    }

    handlePlayerReady(data) {
        console.log('Player ready:', data);
        const player = this.players.get(data.playerId);
        if (player) {
            player.isReady = data.isReady;
            this.updatePlayerReadyStatus(data.playerId, data.isReady);
        }
    }

    handlePlayerUpdated(data) {
        console.log('Player updated:', data);
        const player = this.players.get(data.playerId);
        if (player) {
            player.character = data.character;
            this.updatePlayerLane(data.playerId, data);
        }
    }

    handleRoomStatus(data) {
        console.log('Room status:', data);
        const readyPlayers = data.readyPlayers;
        const totalPlayers = data.totalPlayers;
        
        if (totalPlayers < 2) {
            this.roomStatus.textContent = `Waiting for players... (${totalPlayers}/2)`;
            this.readyBtn.disabled = false; // Always enable ready button
        } else if (readyPlayers < totalPlayers) {
            this.roomStatus.textContent = `Players ready: ${readyPlayers}/${totalPlayers}`;
            this.readyBtn.disabled = false; // Always enable ready button
        } else {
            this.roomStatus.textContent = 'All players ready! Starting race...';
        }
    }

    handleRaceStarting(data) {
        console.log('Race starting with countdown:', data);
        this.roomStatus.textContent = 'Race starting in 3 seconds...';
        this.startCountdown();
    }

    handleRaceStarted(data) {
        console.log('Race started with quote:', data.quote);
        this.currentQuote = data.quote;
        this.startRace();
    }

    handlePlayerProgress(data) {
        // Update other players' positions
        if (data.playerId !== this.playerId) {
            this.updatePlayerPosition(data.playerId, data.progress, data.wpm);
        }
    }

    handleRaceFinished(data) {
        console.log('Race finished with results:', data.results);
        this.isRacing = false;
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.raceInterval);
        this.typingInput.disabled = true;
        
        setTimeout(() => {
            this.showResults(data.results);
        }, 1000);
    }

    handleRoomInfo(data) {
        console.log('Room info received:', data);
        this.roomId = data.roomId;
        this.players = new Map(data.players.map(p => [p.playerId, p]));
        this.createAllPlayerLanes();
    }

    createAllPlayerLanes() {
        this.multiplayerTrack.innerHTML = '';
        this.players.forEach((player, playerId) => {
            this.createPlayerLane(player);
        });
        
        // Add enhanced finish line
        const finishLine = document.createElement('div');
        finishLine.className = 'finish-line';
        finishLine.style.animation = 'finishGlow 2s ease-in-out infinite';
        this.multiplayerTrack.appendChild(finishLine);
        
        // Restart track effects
        this.startTrackEffects();
    }

    createPlayerLane(player) {
        const lane = document.createElement('div');
        lane.className = 'track-lane';
        lane.id = `lane-${player.playerId}`;
        
        const isCurrentPlayer = player.playerId === this.playerId;
        // Show player name with (YOU) indicator for current player
        const label = isCurrentPlayer ? `${player.name} (YOU)` : player.name;
        
        lane.innerHTML = `
            <span class="lane-label">${label}</span>
            <div class="car ${isCurrentPlayer ? 'player' : 'opponent'}" id="car-${player.playerId}">
                <div class="char-container">
                    <div class="char ${player.character}">${this.getCharacterText(player.character)}</div>
                </div>
                ${player.isReady ? '<div class="ready-indicator">✓</div>' : ''}
            </div>
        `;
        
        this.multiplayerTrack.appendChild(lane);
        
        // Set initial position
        const car = document.getElementById(`car-${player.playerId}`);
        if (car) {
            car.style.left = '5%';
            // Apply character animation
            const charElement = car.querySelector('.char');
            this.applyCharacterAnimation(charElement, player.character);
        }
    }

    updatePlayerLane(playerId, playerData) {
        const car = document.getElementById(`car-${playerId}`);
        if (car) {
            const charElement = car.querySelector('.char');
            charElement.className = `char ${playerData.character}`;
            charElement.textContent = this.getCharacterText(playerData.character);
            this.applyCharacterAnimation(charElement, playerData.character);
        }
    }

    updatePlayerReadyStatus(playerId, isReady) {
        const car = document.getElementById(`car-${playerId}`);
        if (car) {
            let readyIndicator = car.querySelector('.ready-indicator');
            if (isReady && !readyIndicator) {
                readyIndicator = document.createElement('div');
                readyIndicator.className = 'ready-indicator';
                readyIndicator.textContent = '✓';
                readyIndicator.style.animation = 'pulse 1s infinite';
                car.appendChild(readyIndicator);
            } else if (!isReady && readyIndicator) {
                readyIndicator.remove();
            }
        }
    }

    removePlayerLane(playerId) {
        const lane = document.getElementById(`lane-${playerId}`);
        if (lane) {
            lane.remove();
        }
    }

    updatePlayerPosition(playerId, progress, wpm) {
        const car = document.getElementById(`car-${playerId}`);
        if (car) {
            const progressPercent = Math.min(85, progress * 85);
            
            // Smooth transition with enhanced easing
            car.style.transition = 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            car.style.left = `${5 + progressPercent}%`;
            
            // Add speed effect based on WPM
            if (wpm > 80) {
                car.style.filter = 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.7))';
            } else if (wpm > 60) {
                car.style.filter = 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.5))';
            } else {
                car.style.filter = 'none';
            }
        }
    }

    updateRoomStatus() {
        const readyPlayers = Array.from(this.players.values()).filter(p => p.isReady).length;
        const totalPlayers = this.players.size;
        
        if (totalPlayers < 2) {
            this.roomStatus.textContent = `Waiting for players... (${totalPlayers}/2)`;
        } else if (readyPlayers < totalPlayers) {
            this.roomStatus.textContent = `Players ready: ${readyPlayers}/${totalPlayers}`;
        } else {
            this.roomStatus.textContent = 'All players ready! Starting race...';
        }
    }

    toggleReady() {
        this.isReady = !this.isReady;
        this.readyBtn.textContent = this.isReady ? 'Cancel Ready' : 'I\'m Ready!';
        this.readyBtn.classList.toggle('primary', !this.isReady);
        this.readyBtn.classList.toggle('secondary', this.isReady);
        
        // Add button animation
        this.readyBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            this.readyBtn.style.transform = 'scale(1)';
        }, 150);
        
        if (this.socket) {
            this.socket.emit('playerReady', this.isReady);
        }
        
        // Update local ready status immediately
        this.updatePlayerReadyStatus(this.playerId, this.isReady);
    }

    startCountdown() {
        if (this.isCountdown) return;
        
        this.isCountdown = true;
        this.readyBtn.disabled = true;
        this.countdown.classList.remove('hidden');
        
        let count = 3;
        this.countdownNumber.textContent = count;
        
        // Enhanced countdown animation
        this.countdownNumber.style.animation = 'pulse 1s infinite';
        
        const countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                this.countdownNumber.textContent = count;
                // Add scale effect
                this.countdownNumber.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.countdownNumber.style.transform = 'scale(1)';
                }, 200);
            } else {
                this.countdownNumber.textContent = 'GO!';
                this.countdownNumber.style.color = '#4CAF50';
                this.countdownNumber.style.fontSize = '8rem';
                
                setTimeout(() => {
                    this.countdown.classList.add('hidden');
                    clearInterval(countdownInterval);
                    this.isCountdown = false;
                    // Reset countdown styles
                    this.countdownNumber.style.color = '#fdbb2d';
                    this.countdownNumber.style.fontSize = '6rem';
                    this.countdownNumber.style.animation = '';
                }, 500);
            }
        }, 1000);
    }

    startRace() {
        this.isRacing = true;
        this.typingInput.disabled = false;
        this.typingInput.focus();
        this.typingInput.placeholder = "Start typing the text above...";
        
        this.currentIndex = 0;
        this.errors = 0;
        this.correctCharacters = 0;
        this.totalCharactersTyped = 0;
        this.progress = 0;
        this.timeLeft = 60;
        this.playerFinished = false;
        this.errorPositions = new Set();
        
        this.displayQuote();
        this.startTimer();
        this.startTime = new Date();
        
        // Start race animation
        this.startRaceAnimation();
        
        // Add race start effects
        this.addRaceStartEffects();
    }

    addRaceStartEffects() {
        // Add flash effect to all cars
        this.players.forEach((player, playerId) => {
            const car = document.getElementById(`car-${playerId}`);
            if (car) {
                car.style.animation = 'carStartFlash 0.5s ease-in-out';
                setTimeout(() => {
                    car.style.animation = '';
                }, 500);
            }
        });
    }

    displayQuote() {
        this.quoteDisplay.textContent = this.currentQuote;
        this.quoteDisplay.innerHTML = '';
        
        for (let i = 0; i < this.currentQuote.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.textContent = this.currentQuote[i];
            this.quoteDisplay.appendChild(charSpan);
        }
        
        // Highlight first character with animation
        if (this.quoteDisplay.firstChild) {
            this.quoteDisplay.firstChild.classList.add('current');
            this.quoteDisplay.firstChild.style.animation = 'pulse 1s infinite';
        }
    }

    startTimer() {
        clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timerDisplay.textContent = this.timeLeft;
            
            // Add warning effect when time is low
            if (this.timeLeft <= 10) {
                this.timerDisplay.style.color = '#e74c3c';
                this.timerDisplay.style.animation = 'pulse 0.5s infinite';
            } else {
                this.timerDisplay.style.color = '';
                this.timerDisplay.style.animation = '';
            }
            
            if (this.timeLeft <= 0) {
                this.finishRace();
            }
        }, 1000);
    }

    startRaceAnimation() {
        if (this.raceInterval) cancelAnimationFrame(this.raceInterval);
        
        const animate = (timestamp) => {
            if (!this.isRacing) return;
            
            // Calculate WPM based on correct characters only
            if (this.startTime) {
                const elapsedTime = (new Date() - this.startTime) / 1000 / 60; // in minutes
                const wordsTyped = this.correctCharacters / 5;
                this.wpm = Math.round(wordsTyped / elapsedTime) || 0;
                
                // Update WPM display with color coding
                this.wpmDisplay.textContent = this.wpm;
                this.currentWpmDisplay.textContent = `${this.wpm} WPM`;
                
                // Color code based on WPM
                if (this.wpm > 80) {
                    this.wpmDisplay.style.color = '#4CAF50';
                    this.currentWpmDisplay.style.color = '#4CAF50';
                } else if (this.wpm > 60) {
                    this.wpmDisplay.style.color = '#fdbb2d';
                    this.currentWpmDisplay.style.color = '#fdbb2d';
                } else {
                    this.wpmDisplay.style.color = '';
                    this.currentWpmDisplay.style.color = '';
                }
            }
            
            this.raceInterval = requestAnimationFrame(animate);
        };
        
        this.raceInterval = requestAnimationFrame(animate);
    }

    handleInput(e) {
        if (!this.isRacing) return;
        
        const quoteArray = this.currentQuote.split('');
        const inputArray = e.target.value.split('');
        let hasErrorsInCurrentAttempt = false;
        
        // Reset quote display
        this.quoteDisplay.querySelectorAll('span').forEach((char, index) => {
            const typedChar = inputArray[index];
            
            // Remove all classes
            char.classList.remove('correct', 'incorrect', 'current');
            char.style.animation = '';
            
            if (typedChar == null) {
                // Not typed yet
                if (index === inputArray.length) {
                    char.classList.add('current');
                    char.style.animation = 'pulse 1s infinite';
                }
            } else if (typedChar === quoteArray[index]) {
                // Correct character
                char.classList.add('correct');
                if (index === inputArray.length - 1) {
                    char.classList.add('current');
                    char.style.animation = 'pulse 1s infinite';
                }
            } else {
                // Incorrect character
                char.classList.add('incorrect');
                if (index === inputArray.length - 1) {
                    char.classList.add('current');
                    char.style.animation = 'pulse 1s infinite';
                }
                
                // Add shake animation for errors
                char.style.animation = 'shake 0.5s ease-in-out';
                
                // Mark this position as having an error
                this.errorPositions.add(index);
                hasErrorsInCurrentAttempt = true;
            }
        });
        
        // Count correct characters (consecutive from start)
        let newCorrectCharacters = 0;
        for (let i = 0; i < inputArray.length; i++) {
            if (inputArray[i] === quoteArray[i]) {
                newCorrectCharacters++;
            } else {
                break;
            }
        }
        
        // Update total characters typed for accuracy calculation
        this.totalCharactersTyped = inputArray.length;
        
        // Only update correct characters if it increased (prevents going backward when correcting errors)
        if (newCorrectCharacters > this.correctCharacters) {
            this.correctCharacters = newCorrectCharacters;
        }
        
        // Calculate accuracy
        const accuracy = this.totalCharactersTyped > 0 
            ? Math.round(((this.totalCharactersTyped - this.errorPositions.size) / this.totalCharactersTyped) * 100)
            : 100;
        this.accuracyDisplay.textContent = `${accuracy}%`;
        
        // Color code accuracy
        if (accuracy >= 95) {
            this.accuracyDisplay.style.color = '#4CAF50';
        } else if (accuracy >= 90) {
            this.accuracyDisplay.style.color = '#fdbb2d';
        } else {
            this.accuracyDisplay.style.color = '#e74c3c';
        }
        
        // Update progress based on correct characters
        this.progress = this.correctCharacters / quoteArray.length;
        this.progressDisplay.textContent = `${Math.round(this.progress * 100)}%`;
        
        // Move player car based on progress with enhanced animation
        const playerProgressPercent = Math.min(85, this.progress * 85);
        const playerCar = document.getElementById(`car-${this.playerId}`);
        if (playerCar) {
            playerCar.style.transition = 'left 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            playerCar.style.left = `${5 + playerProgressPercent}%`;
            
            // Add boost effect when progressing quickly
            if (this.wpm > 80) {
                playerCar.style.filter = 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))';
            }
        }
        
        // Send progress to server
        if (this.socket && this.isRacing) {
            this.socket.emit('playerProgress', {
                progress: this.progress,
                wpm: this.wpm,
                accuracy: accuracy
            });
        }
        
        // Check if quote is completed (with no errors at the end)
        if (inputArray.length === quoteArray.length && !hasErrorsInCurrentAttempt && !this.playerFinished) {
            // Quote completed correctly
            this.playerFinished = true;
            this.finishRace();
        }
    }

    finishRace() {
        if (!this.isRacing) return;
        
        this.isRacing = false;
        this.typingInput.disabled = true;
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.raceInterval);
        
        // Add finish effect to player car
        const playerCar = document.getElementById(`car-${this.playerId}`);
        if (playerCar) {
            playerCar.style.animation = 'victoryDance 1s ease-in-out';
            playerCar.style.filter = 'drop-shadow(0 0 20px rgba(76, 175, 80, 0.8))';
        }
        
        // Calculate final stats
        const endTime = new Date();
        const timeInMinutes = (endTime - this.startTime) / 1000 / 60;
        const finalWpm = Math.round(this.correctCharacters / 5 / timeInMinutes) || 0;
        const finalAccuracy = this.totalCharactersTyped > 0 
            ? Math.round(((this.totalCharactersTyped - this.errorPositions.size) / this.totalCharactersTyped) * 100)
            : 100;
        
        if (this.socket) {
            this.socket.emit('raceFinished', {
                wpm: finalWpm,
                accuracy: finalAccuracy,
                progress: this.progress
            });
        }
    }

    showResults(results) {
        const sortedResults = results.sort((a, b) => b.wpm - a.wpm);
        const playerResult = results.find(r => r.playerId === this.playerId);
        const position = sortedResults.findIndex(r => r.playerId === this.playerId) + 1;
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Race Finished! 🏁</h2>
                <p>You finished ${this.getPositionText(position)}</p>
                
                <div class="results-list">
                    <h3>Final Results:</h3>
                    ${sortedResults.map((result, index) => `
                        <div class="result-item ${result.playerId === this.playerId ? 'winner' : ''}">
                            <span class="position">${index + 1}.</span>
                            <span class="player-name">${result.name}</span>
                            <span class="player-stats">${result.wpm} WPM • ${result.accuracy}%</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="modal-stats">
                    <div class="modal-stat">
                        <div class="modal-value">${playerResult.wpm}</div>
                        <div class="modal-label">Your WPM</div>
                    </div>
                    <div class="modal-stat">
                        <div class="modal-value">${playerResult.accuracy}%</div>
                        <div class="modal-label">Accuracy</div>
                    </div>
                    <div class="modal-stat">
                        <div class="modal-value">${position}</div>
                        <div class="modal-label">Position</div>
                    </div>
                </div>
                
                <button class="btn primary" id="play-again-btn">Play Again</button>
                <button class="btn" id="main-menu-btn">Main Menu</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add modal entrance animation
        modal.style.animation = 'modalEntrance 0.5s ease-out';
        
        document.getElementById('play-again-btn').addEventListener('click', () => {
            modal.style.animation = 'modalExit 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(modal);
                this.restartRace();
            }, 300);
        });
        
        document.getElementById('main-menu-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    getPositionText(position) {
        if (position === 1) return '1st 🥇';
        if (position === 2) return '2nd 🥈';
        if (position === 3) return '3rd 🥉';
        return `${position}th`;
    }

    restartRace() {
        this.isRacing = false;
        this.isReady = false;
        this.isCountdown = false;
        this.readyBtn.disabled = false;
        this.readyBtn.textContent = 'I\'m Ready!';
        this.readyBtn.classList.add('primary');
        this.readyBtn.classList.remove('secondary');
        
        this.typingInput.disabled = true;
        this.typingInput.value = '';
        this.typingInput.placeholder = "Race will start when enough players are ready...";
        
        clearInterval(this.timerInterval);
        cancelAnimationFrame(this.raceInterval);
        
        // Reset displays
        this.wpmDisplay.textContent = '0';
        this.wpmDisplay.style.color = '';
        this.timerDisplay.textContent = '60';
        this.timerDisplay.style.color = '';
        this.timerDisplay.style.animation = '';
        this.accuracyDisplay.textContent = '100%';
        this.accuracyDisplay.style.color = '';
        this.progressDisplay.textContent = '0%';
        this.currentWpmDisplay.textContent = '0 WPM';
        this.currentWpmDisplay.style.color = '';
        
        this.quoteDisplay.textContent = 'Waiting for players to join... Need at least 2 players to start.';
        this.roomStatus.textContent = 'Waiting for players...';
        
        // Reset car positions and ready status
        this.players.forEach((player, playerId) => {
            const car = document.getElementById(`car-${playerId}`);
            if (car) {
                car.style.left = '5%';
                car.style.transition = 'left 0.5s ease-out';
                car.style.filter = 'none';
                car.style.animation = '';
                const readyIndicator = car.querySelector('.ready-indicator');
                if (readyIndicator) {
                    readyIndicator.remove();
                }
            }
        });
    }

    leaveRace() {
        if (this.socket) {
            this.socket.disconnect();
        }
        window.location.href = 'index.html';
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PublicRaceGame();
});