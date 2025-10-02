// Game functionality
document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const quoteDisplay = document.getElementById('quote-display');
    const typingInput = document.getElementById('typing-input');
    const wpmElement = document.getElementById('wpm');
    const timerElement = document.getElementById('timer');
    const accuracyElement = document.getElementById('accuracy');
    const progressElement = document.getElementById('progress');
    const currentWpmElement = document.getElementById('current-wpm');
    const playerCar = document.getElementById('player-car');
    const opponentCar = document.getElementById('opponent-car');
    const restartBtn = document.getElementById('restart-btn');
    const menuBtn = document.getElementById('menu-btn');
    const startRaceBtn = document.getElementById('start-race-btn');
    const countdownElement = document.getElementById('countdown');
    const countdownNumber = document.getElementById('countdown-number');
    const quoteNumberElement = document.getElementById('quote-number');
    const playerChar = document.getElementById('player-char');
    const changeCharBtn = document.getElementById('change-char-btn');
    const charPopup = document.getElementById('char-popup');
    const closeCharPopup = document.getElementById('close-char-popup');
    const charOptions = document.querySelectorAll('.char-option');
    const track = document.querySelector('.track');
    
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
    
    // Load selected character
    let selectedChar = localStorage.getItem('selectedChar') || 'happy';
    updatePlayerCharacter(selectedChar);
    
    // Enhanced track effects
    function startTrackEffects() {
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
        createFloatingParticles();
    }

    function createFloatingParticles() {
        for (let i = 0; i < 6; i++) {
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

    // Update player character function
    function updatePlayerCharacter(charType) {
        selectedChar = charType;
        playerChar.textContent = charExpressions[charType] || '•ᴗ•';
        playerChar.className = 'char ' + charType;
        localStorage.setItem('selectedChar', charType);
        
        // Apply character-specific animation
        applyCharacterAnimation(playerChar, charType);
    }

    function applyCharacterAnimation(charElement, charType) {
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
    
    // Character selection popup
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
            updatePlayerCharacter(charType);
            
            // Update active state
            charOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Close popup after selection
            setTimeout(() => {
                charPopup.classList.add('hidden');
            }, 500);
        });
    });
    
    // Game state
    let quotes = [];
    let currentQuote = {};
    let timer = null;
    let timeLeft = 60;
    let startTime = null;
    let endTime = null;
    let errors = 0;
    let correctCharacters = 0;
    let totalCharactersTyped = 0;
    let gameActive = false;
    let raceInterval = null;
    let countdownInterval = null;
    let opponentProgress = 0;
    let opponentTargetWPM = 0;
    let lastTimestamp = 0;
    let playerFinished = false;
    let opponentFinished = false;
    let gameEnded = false;
    let winner = null;
    let errorPositions = new Set();
    let opponentFinishTime = null;
    let botFinishedFirst = false;
    
    // Initialize game
    async function initGame() {
        try {
            // Load quotes from JSON file
            const response = await fetch('data/quotes.json');
            quotes = await response.json();
            
            if (quotes.length === 0) {
                quoteDisplay.textContent = "No quotes available. Please add quotes to the quotes.json file.";
                return;
            }
            
            // Select a random quote
            selectRandomQuote();
            
            // Set up event listeners
            setupEventListeners();
            
            // Start track effects
            startTrackEffects();
            
        } catch (error) {
            console.error('Error loading quotes:', error);
            quoteDisplay.textContent = "Error loading quotes. Please check the console for details.";
        }
    }
    
    // Select a random quote
    function selectRandomQuote() {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        currentQuote = quotes[randomIndex];
        
        // Update UI
        quoteNumberElement.textContent = `Random Quote`;
        renderQuote();
        
        // Reset typing input
        typingInput.value = '';
        errors = 0;
        correctCharacters = 0;
        totalCharactersTyped = 0;
        errorPositions = new Set();
        playerFinished = false;
        opponentFinished = false;
        gameEnded = false;
        winner = null;
        timeLeft = 60;
        opponentFinishTime = null;
        botFinishedFirst = false;
        
        // Set opponent target WPM
        opponentTargetWPM = currentQuote.benchmarkWPM || 60;
        
        // Update progress
        progressElement.textContent = '0%';
        timerElement.textContent = timeLeft;
        wpmElement.textContent = '0';
        accuracyElement.textContent = '100%';
        currentWpmElement.textContent = '0 WPM';
        
        // Reset cars with enhanced animations
        resetCars();
    }

    function resetCars() {
        playerCar.style.left = '5%';
        playerCar.style.transition = 'left 0.5s ease-out';
        playerCar.style.filter = 'none';
        playerCar.style.animation = '';
        
        opponentCar.style.left = '5%';
        opponentCar.style.transition = 'left 0.5s ease-out';
        opponentCar.style.filter = 'none';
        opponentCar.style.animation = '';
    }
    
    // Render the current quote with styling
    function renderQuote() {
        quoteDisplay.innerHTML = '';
        
        const quoteText = currentQuote.text;
        for (let i = 0; i < quoteText.length; i++) {
            const charSpan = document.createElement('span');
            charSpan.innerText = quoteText[i];
            quoteDisplay.appendChild(charSpan);
        }
        
        // Highlight first character with animation
        if (quoteDisplay.firstChild) {
            quoteDisplay.firstChild.classList.add('current');
            quoteDisplay.firstChild.style.animation = 'pulse 1s infinite';
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Typing input events
        typingInput.addEventListener('input', handleTyping);
        typingInput.addEventListener('keydown', preventCopyPaste);
        typingInput.addEventListener('contextmenu', preventCopyPaste);
        
        // Button events
        startRaceBtn.addEventListener('click', startGame);
        restartBtn.addEventListener('click', restartGame);
        menuBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // Add button hover effects
        [startRaceBtn, restartBtn, menuBtn].forEach(btn => {
            btn.addEventListener('mouseenter', function() {
                this.style.transform = 'translateY(-2px) scale(1.05)';
            });
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) scale(1)';
            });
        });
    }
    
    // Start the game with countdown
    function startGame() {
        if (gameActive) return;
        
        // Disable start button during game
        startRaceBtn.disabled = true;
        startRaceBtn.style.opacity = '0.7';
        
        // Disable input during countdown
        typingInput.disabled = true;
        typingInput.placeholder = "Get ready...";
        
        // Show countdown
        countdownElement.classList.remove('hidden');
        
        let count = 3;
        countdownNumber.textContent = count;
        countdownNumber.style.animation = 'pulse 1s infinite';
        
        countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownNumber.textContent = count;
                // Add scale effect
                countdownNumber.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    countdownNumber.style.transform = 'scale(1)';
                }, 200);
            } else {
                clearInterval(countdownInterval);
                countdownNumber.textContent = 'GO!';
                countdownNumber.style.color = '#4CAF50';
                countdownNumber.style.fontSize = '8rem';
                
                setTimeout(() => {
                    countdownElement.classList.add('hidden');
                    
                    // Start the game
                    gameActive = true;
                    startTime = new Date();
                    timeLeft = 60;
                    errors = 0;
                    correctCharacters = 0;
                    totalCharactersTyped = 0;
                    errorPositions = new Set();
                    opponentProgress = 0;
                    lastTimestamp = performance.now();
                    opponentFinishTime = null;
                    botFinishedFirst = false;
                    
                    // Enable input
                    typingInput.disabled = false;
                    typingInput.placeholder = "Start typing...";
                    typingInput.focus();
                    
                    // Start timer
                    startTimer();
                    
                    // Start opponent movement
                    startOpponentMovement();
                    
                    // Start race animation
                    startRace();
                    
                    // Add race start effects
                    addRaceStartEffects();
                    
                    // Reset countdown styles
                    countdownNumber.style.color = '#fdbb2d';
                    countdownNumber.style.fontSize = '6rem';
                    countdownNumber.style.animation = '';
                }, 500);
            }
        }, 1000);
    }

    function addRaceStartEffects() {
        // Flash effect for both cars
        playerCar.style.animation = 'carStartFlash 0.5s ease-in-out';
        opponentCar.style.animation = 'carStartFlash 0.5s ease-in-out';
        
        setTimeout(() => {
            playerCar.style.animation = '';
            opponentCar.style.animation = '';
        }, 500);
    }
    
    // Start opponent movement based on benchmark WPM
    function startOpponentMovement() {
        const quoteLength = currentQuote.text.length;
        const targetWPM = opponentTargetWPM;
        
        // Calculate how long it should take SEEDY to finish at target WPM
        const wordsInQuote = quoteLength / 5;
        const targetTimeMinutes = wordsInQuote / targetWPM;
        const targetTimeSeconds = targetTimeMinutes * 60;
        
        // Calculate progress per second
        const progressPerSecond = 100 / targetTimeSeconds;
        
        const updateOpponent = () => {
            if (!gameActive || gameEnded) return;
            
            const currentTime = new Date();
            const elapsedSeconds = (currentTime - startTime) / 1000;
            
            opponentProgress = Math.min(100, progressPerSecond * elapsedSeconds);
            
            // Move opponent car with enhanced animation
            opponentCar.style.transition = 'left 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            opponentCar.style.left = `${5 + (opponentProgress * 0.85)}%`;
            
            // Add speed effect based on progress
            if (opponentProgress > 50) {
                opponentCar.style.filter = 'drop-shadow(0 0 8px rgba(255, 69, 0, 0.6))';
            }
            
            // Check if opponent finished
            if (opponentProgress >= 100 && !opponentFinished) {
                opponentFinished = true;
                opponentFinishTime = new Date();
                
                // Victory effect for opponent
                opponentCar.style.animation = 'victoryDance 1s ease-in-out';
                opponentCar.style.filter = 'drop-shadow(0 0 20px rgba(255, 69, 0, 0.8))';
                
                // If opponent finished first, mark that bot finished first but don't end the game
                if (!playerFinished) {
                    botFinishedFirst = true;
                    // Show message that SEEDY finished first
                    showBotFinishedMessage();
                }
            }
            
            requestAnimationFrame(updateOpponent);
        };
        
        updateOpponent();
    }
    
    // Show message when bot finishes first
    function showBotFinishedMessage() {
        // Create a temporary notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(231, 76, 60, 0.9);
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            font-weight: bold;
            z-index: 1000;
            animation: slideDown 0.5s ease-out;
        `;
        notification.textContent = "SEEDY finished first! Keep going to complete the race!";
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.5s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 3000);
    }
    
    // Start the timer
    function startTimer() {
        clearInterval(timer);
        
        timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            // Add warning effect when time is low
            if (timeLeft <= 10) {
                timerElement.style.color = '#e74c3c';
                timerElement.style.animation = 'pulse 0.5s infinite';
            } else {
                timerElement.style.color = '';
                timerElement.style.animation = '';
            }
            
            if (timeLeft <= 0 && !gameEnded) {
                // Time's up - determine winner
                if (playerFinished && opponentFinished) {
                    // Both finished - compare times
                    const playerTime = opponentFinishTime ? (opponentFinishTime - startTime) / 1000 : 60;
                    const opponentTime = (currentQuote.text.length / 5 / opponentTargetWPM * 60);
                    winner = playerTime < opponentTime ? 'player' : 'opponent';
                    endGame(winner === 'player');
                } else if (playerFinished && !opponentFinished) {
                    // Only player finished
                    endGame(true);
                } else if (!playerFinished && opponentFinished) {
                    // Only opponent finished (bot finished first)
                    endGame(false);
                } else {
                    // Neither finished - determine by progress
                    const playerProgressPercent = (correctCharacters / currentQuote.text.length) * 100;
                    endGame(playerProgressPercent > opponentProgress);
                }
            }
        }, 1000);
    }
    
    // Start the race animation
    function startRace() {
        if (raceInterval) cancelAnimationFrame(raceInterval);
        
        const animate = (timestamp) => {
            if (!gameActive) return;
            
            // Calculate WPM based on correct characters only
            if (startTime) {
                const elapsedTime = (new Date() - startTime) / 1000 / 60; // in minutes
                const wordsTyped = correctCharacters / 5;
                const wpm = Math.round(wordsTyped / elapsedTime) || 0;
                
                // Update WPM display with color coding
                wpmElement.textContent = wpm;
                currentWpmElement.textContent = `${wpm} WPM`;
                
                // Color code based on WPM
                if (wpm > 80) {
                    wpmElement.style.color = '#4CAF50';
                    currentWpmElement.style.color = '#4CAF50';
                } else if (wpm > 60) {
                    wpmElement.style.color = '#fdbb2d';
                    currentWpmElement.style.color = '#fdbb2d';
                } else {
                    wpmElement.style.color = '';
                    currentWpmElement.style.color = '';
                }
            }
            
            raceInterval = requestAnimationFrame(animate);
        };
        
        raceInterval = requestAnimationFrame(animate);
    }
    
    // Handle typing input
    function handleTyping() {
        if (!gameActive || gameEnded) return;
        
        const quoteArray = currentQuote.text.split('');
        const inputArray = typingInput.value.split('');
        let hasErrorsInCurrentAttempt = false;
        
        // Reset quote display
        quoteDisplay.querySelectorAll('span').forEach((char, index) => {
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
                errorPositions.add(index);
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
        totalCharactersTyped = inputArray.length;
        
        // Only update correct characters if it increased (prevents going backward when correcting errors)
        if (newCorrectCharacters > correctCharacters) {
            correctCharacters = newCorrectCharacters;
        }
        
        // Calculate accuracy
        const accuracy = totalCharactersTyped > 0 
            ? Math.round(((totalCharactersTyped - errorPositions.size) / totalCharactersTyped) * 100)
            : 100;
        accuracyElement.textContent = `${accuracy}%`;
        
        // Color code accuracy
        if (accuracy >= 95) {
            accuracyElement.style.color = '#4CAF50';
        } else if (accuracy >= 90) {
            accuracyElement.style.color = '#fdbb2d';
        } else {
            accuracyElement.style.color = '#e74c3c';
        }
        
        // Update progress based on correct characters
        const progress = Math.round((correctCharacters / quoteArray.length) * 100);
        progressElement.textContent = `${progress}%`;
        
        // Move player car based on progress with enhanced animation
        const playerProgressPercent = Math.min(85, (correctCharacters / quoteArray.length) * 85);
        playerCar.style.transition = 'left 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        playerCar.style.left = `${5 + playerProgressPercent}%`;
        
        // Add boost effect when progressing quickly
        const currentWpm = parseInt(wpmElement.textContent) || 0;
        if (currentWpm > 80) {
            playerCar.style.filter = 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.8))';
        }
        
        // Check if quote is completed (with no errors at the end)
        if (inputArray.length === quoteArray.length && !hasErrorsInCurrentAttempt && !playerFinished) {
            // Quote completed correctly
            playerFinished = true;
            
            // Victory effect for player
            playerCar.style.animation = 'victoryDance 1s ease-in-out';
            playerCar.style.filter = 'drop-shadow(0 0 20px rgba(76, 175, 80, 0.8))';
            
            // If player finished first, end the game immediately with player as winner
            if (!opponentFinished) {
                endGame(true); // Player wins
            } else {
                // Bot finished first, player finished later - player lost
                endGame(false);
            }
        }
    }
    
    // Prevent copy/paste
    function preventCopyPaste(e) {
        // Allow default behavior for all keys except those used for copy/paste
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) {
                e.preventDefault();
                return false;
            }
        }
        
        // Allow right-click for other purposes
        if (e.type === 'contextmenu') {
            return true;
        }
    }
    
    // End the game
    function endGame(playerWon = false) {
        if (gameEnded) return;
        
        gameEnded = true;
        gameActive = false;
        clearInterval(timer);
        cancelAnimationFrame(raceInterval);
        clearInterval(countdownInterval);
        
        endTime = new Date();
        typingInput.disabled = true;
        
        // Re-enable start button
        startRaceBtn.disabled = false;
        startRaceBtn.style.opacity = '1';
        
        // Calculate final WPM based on correct characters only
        const timeInMinutes = (endTime - startTime) / 1000 / 60;
        const finalWpm = Math.round(correctCharacters / 5 / timeInMinutes) || 0;
        
        // Calculate final accuracy
        const finalAccuracy = totalCharactersTyped > 0 
            ? Math.round(((totalCharactersTyped - errorPositions.size) / totalCharactersTyped) * 100)
            : 100;
        
        // Show results
        showResults(playerWon, finalWpm, finalAccuracy);
    }
    
    // Show results
    function showResults(playerWon = false, finalWpm = 0, finalAccuracy = 100) {
        const resultsHTML = `
            <div class="modal">
                <div class="modal-content">
                    <h2>${playerWon ? 'You Win! 🎉' : 'Game Over'}</h2>
                    <p>${playerWon ? 'Congratulations! You beat SEEDY!' : 'Better luck next time!'}</p>
                    
                    <div class="modal-stats">
                        <div class="modal-stat">
                            <div class="modal-value">${finalWpm}</div>
                            <div class="modal-label">Your WPM</div>
                        </div>
                        <div class="modal-stat">
                            <div class="modal-value">${finalAccuracy}%</div>
                            <div class="modal-label">Accuracy</div>
                        </div>
                        <div class="modal-stat">
                            <div class="modal-value">${currentQuote.benchmarkWPM || 60}</div>
                            <div class="modal-label">SEEDY's WPM</div>
                        </div>
                    </div>
                    
                    <p class="race-comparison">
                        ${playerWon ? 
                            `You typed at <strong>${finalWpm} WPM</strong> while SEEDY was set to <strong>${currentQuote.benchmarkWPM} WPM</strong>` : 
                            `SEEDY was set to <strong>${currentQuote.benchmarkWPM} WPM</strong> while you typed at <strong>${finalWpm} WPM</strong>`
                        }
                    </p>
                    
                    <button class="btn primary" id="play-again-btn">Race Again</button>
                    <button class="btn" id="results-menu-btn">Main Menu</button>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', resultsHTML);
        
        const modal = document.querySelector('.modal');
        modal.style.animation = 'modalEntrance 0.5s ease-out';
        
        // Add event listeners to modal buttons
        document.getElementById('play-again-btn').addEventListener('click', () => {
            modal.style.animation = 'modalExit 0.3s ease-in';
            setTimeout(() => {
                modal.remove();
                restartGame();
            }, 300);
        });
        
        document.getElementById('results-menu-btn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    // Restart the game
    function restartGame() {
        // Reset game state
        clearInterval(timer);
        cancelAnimationFrame(raceInterval);
        clearInterval(countdownInterval);
        
        gameActive = false;
        gameEnded = false;
        timeLeft = 60;
        
        // Re-enable start button
        startRaceBtn.disabled = false;
        startRaceBtn.style.opacity = '1';
        
        // Reset UI
        timerElement.textContent = timeLeft;
        timerElement.style.color = '';
        timerElement.style.animation = '';
        wpmElement.textContent = '0';
        wpmElement.style.color = '';
        accuracyElement.textContent = '100%';
        accuracyElement.style.color = '';
        currentWpmElement.textContent = '0 WPM';
        currentWpmElement.style.color = '';
        progressElement.textContent = '0%';
        
        // Reset cars
        resetCars();
        
        // Select a new random quote
        selectRandomQuote();
    }
    
    // Initialize the game
    initGame();
});