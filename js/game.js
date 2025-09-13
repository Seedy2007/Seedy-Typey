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
    const countdownElement = document.getElementById('countdown');
    const countdownNumber = document.getElementById('countdown-number');
    const quoteNumberElement = document.getElementById('quote-number');
    
    // Game state
    let quotes = [];
    let currentQuote = {};
    let timer = null;
    let timeLeft = 60;
    let startTime = null;
    let endTime = null;
    let errors = 0;
    let typedCharacters = 0;
    let gameActive = false;
    let raceInterval = null;
    let countdownInterval = null;
    let opponentProgress = 0;
    let opponentTargetWPM = 0;
    let lastTimestamp = 0;
    
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
        typedCharacters = 0;
        
        // Set opponent target WPM
        opponentTargetWPM = currentQuote.benchmarkWPM || 60;
        
        // Update progress
        progressElement.textContent = '0%';
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
        restartBtn.addEventListener('click', restartGame);
        menuBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Start the game when user focuses on input
        typingInput.addEventListener('focus', startGame);
    }
    
    // Start the game with countdown
    function startGame() {
        if (gameActive) return;
        
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
                typedCharacters = 0;
                opponentProgress = 0;
                lastTimestamp = performance.now();
                
                // Enable input
                typingInput.disabled = false;
                typingInput.placeholder = "Start typing...";
                typingInput.focus();
                
                // Start timer
                startTimer();
                
                // Start race animation
                startRace();
            }
        }, 1000);
    }
    
    // Start the timer
    function startTimer() {
        clearInterval(timer);
        
        timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }
    
    // Start the race animation
    function startRace() {
        if (raceInterval) cancelAnimationFrame(raceInterval);
        
        const animate = (timestamp) => {
            if (!gameActive) return;
            
            const deltaTime = timestamp - lastTimestamp;
            lastTimestamp = timestamp;
            
            // Calculate WPM
            const elapsedTime = (new Date() - startTime) / 1000 / 60; // in minutes
            const wpm = Math.round(typedCharacters / 5 / elapsedTime) || 0;
            
            // Update WPM display
            wpmElement.textContent = wpm;
            currentWpmElement.textContent = `${wpm} WPM`;
            
            // Move player car based on WPM
            const playerProgress = Math.min(85, (wpm / 100) * 85);
            playerCar.style.left = `${5 + playerProgress}%`;
            
            // Move opponent car based on predefined WPM (smooth progression)
            const opponentIncrement = (opponentTargetWPM / 100) * (deltaTime / 100);
            opponentProgress = Math.min(85, opponentProgress + opponentIncrement);
            opponentCar.style.left = `${5 + opponentProgress}%`;
            
            // Check if someone won
            if (playerProgress >= 85) {
                // Player wins
                endGame(true);
            } else if (opponentProgress >= 85) {
                // Opponent wins
                endGame(false);
            }
            
            raceInterval = requestAnimationFrame(animate);
        };
        
        raceInterval = requestAnimationFrame(animate);
    }
    
    // Handle typing input
    function handleTyping() {
        if (!gameActive) return;
        
        const quoteArray = currentQuote.text.split('');
        const inputArray = typingInput.value.split('');
        
        // Reset quote display
        let hasErrors = false;
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
                
                // Count error
                errors++;
                hasErrors = true;
            }
        });
        
        // Update typed characters
        typedCharacters = inputArray.length;
        
        // Calculate accuracy
        const accuracy = typedCharacters > 0 
            ? Math.round(((typedCharacters - errors) / typedCharacters) * 100) 
            : 100;
        accuracyElement.textContent = `${accuracy}%`;
        
        // Update progress
        const progress = Math.round((typedCharacters / quoteArray.length) * 100);
        progressElement.textContent = `${progress}%`;
        
        // Check if quote is completed (with no errors)
        if (inputArray.length === quoteArray.length && !hasErrors) {
            // Quote completed correctly, player wins
            endGame(true);
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
        gameActive = false;
        clearInterval(timer);
        cancelAnimationFrame(raceInterval);
        clearInterval(countdownInterval);
        
        endTime = new Date();
        typingInput.disabled = true;
        
        // Calculate final WPM
        const timeInMinutes = (endTime - startTime) / 1000 / 60;
        const finalWpm = Math.round(typedCharacters / 5 / timeInMinutes) || 0;
        
        // Calculate final accuracy
        const finalAccuracy = typedCharacters > 0 
            ? Math.round(((typedCharacters - errors) / typedCharacters) * 100) 
            : 100;
        
        // Show results
        showResults(playerWon, finalWpm, finalAccuracy);
    }
    
    // Show results
    function showResults(playerWon = false, finalWpm = 0, finalAccuracy = 100) {
        const resultsHTML = `
            <div class="modal">
                <div class="modal-content">
                    <h2>${playerWon ? 'You Win!' : 'Game Over'}</h2>
                    <p>${playerWon ? 'Congratulations! You beat SEEDY!' : 'Better luck next time!'}</p>
                    
                    <div class="modal-stats">
                        <div class="modal-stat">
                            <div class="modal-value">${finalWpm}</div>
                            <div class="modal-label">WPM</div>
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
        timeLeft = 60;
        
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
        
        // Enable input for new game
        typingInput.disabled = false;
        typingInput.placeholder = "Click here to start typing...";
    }
    
    // Initialize the game
    initGame();
});