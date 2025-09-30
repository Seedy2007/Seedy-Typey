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
    
    // Update player character function
    function updatePlayerCharacter(charType) {
        selectedChar = charType;
        playerChar.textContent = charExpressions[charType] || '•ᴗ•';
        playerChar.className = 'char ' + charType;
        localStorage.setItem('selectedChar', charType);
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
        
        // Set opponent target WPM
        opponentTargetWPM = currentQuote.benchmarkWPM || 60;
        
        // Update progress
        progressElement.textContent = '0%';
        timerElement.textContent = timeLeft;
        wpmElement.textContent = '0';
        accuracyElement.textContent = '100%';
        currentWpmElement.textContent = '0 WPM';
        
        // Reset cars
        playerCar.style.left = '5%';
        opponentCar.style.left = '5%';
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
        
        // Highlight first character
        if (quoteDisplay.firstChild) {
            quoteDisplay.firstChild.classList.add('current');
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
    }
    
    // Start the game with countdown
    function startGame() {
        if (gameActive) return;
        
        // Disable start button during game
        startRaceBtn.disabled = true;
        
        // Disable input during countdown
        typingInput.disabled = true;
        typingInput.placeholder = "Get ready...";
        
        // Show countdown
        countdownElement.classList.remove('hidden');
        
        let count = 3;
        countdownNumber.textContent = count;
        
        countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownNumber.textContent = count;
            } else {
                clearInterval(countdownInterval);
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
            }
        }, 1000);
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
            
            // Move opponent car
            opponentCar.style.left = `${5 + (opponentProgress * 0.85)}%`;
            
            // Check if opponent finished
            if (opponentProgress >= 100 && !opponentFinished) {
                opponentFinished = true;
                // Don't end game immediately - wait for player to finish or time to run out
                if (playerFinished) {
                    determineWinner();
                }
            }
            
            requestAnimationFrame(updateOpponent);
        };
        
        updateOpponent();
    }
    
    // Start the timer
    function startTimer() {
        clearInterval(timer);
        
        timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0 && !gameEnded) {
                endGame(false); // Time's up, player loses
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
                
                // Update WPM display
                wpmElement.textContent = wpm;
                currentWpmElement.textContent = `${wpm} WPM`;
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
            
            if (typedChar == null) {
                // Not typed yet
                if (index === inputArray.length) {
                    char.classList.add('current');
                }
            } else if (typedChar === quoteArray[index]) {
                // Correct character
                char.classList.add('correct');
                if (index === inputArray.length - 1) {
                    char.classList.add('current');
                }
            } else {
                // Incorrect character
                char.classList.add('incorrect');
                if (index === inputArray.length - 1) {
                    char.classList.add('current');
                }
                
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
        
        // Update progress based on correct characters
        const progress = Math.round((correctCharacters / quoteArray.length) * 100);
        progressElement.textContent = `${progress}%`;
        
        // Move player car based on progress
        const playerProgressPercent = Math.min(85, (correctCharacters / quoteArray.length) * 85);
        playerCar.style.left = `${5 + playerProgressPercent}%`;
        
        // Check if quote is completed (with no errors at the end)
        if (inputArray.length === quoteArray.length && !hasErrorsInCurrentAttempt && !playerFinished) {
            // Quote completed correctly
            playerFinished = true;
            determineWinner();
        }
    }
    
    // Determine winner when both players have finished or time is up
    function determineWinner() {
        if (playerFinished && opponentFinished) {
            // Both finished - compare times
            const playerTime = (new Date() - startTime) / 1000;
            const opponentTime = (100 / (100 / (currentQuote.text.length / 5 / opponentTargetWPM * 60))) * 1000;
            winner = playerTime < opponentTime ? 'player' : 'opponent';
            endGame(winner === 'player');
        } else if (playerFinished && !opponentFinished) {
            // Player finished first
            winner = 'player';
            endGame(true);
        } else if (!playerFinished && opponentFinished) {
            // Opponent finished first, but wait for player to finish or time to run out
            // Game will continue until player finishes or time runs out
            return;
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
        
        // Add event listeners to modal buttons
        document.getElementById('play-again-btn').addEventListener('click', () => {
            document.querySelector('.modal').remove();
            restartGame();
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
        
        // Reset UI
        timerElement.textContent = timeLeft;
        wpmElement.textContent = '0';
        accuracyElement.textContent = '100%';
        currentWpmElement.textContent = '0 WPM';
        progressElement.textContent = '0%';
        
        // Reset cars
        playerCar.style.left = '5%';
        opponentCar.style.left = '5%';
        
        // Select a new random quote
        selectRandomQuote();
    }
    
    // Initialize the game
    initGame();
});