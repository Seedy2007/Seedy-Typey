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
    const quoteNumberElement = document.getElementById('quote-number');
    
    // Game state
    let quotes = [];
    let currentQuote = {};
    let currentQuoteIndex = 0;
    let timer = null;
    let timeLeft = 60;
    let startTime = null;
    let endTime = null;
    let errors = 0;
    let typedCharacters = 0;
    let gameActive = false;
    let raceInterval = null;
    
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
            
            // Start with first quote
            loadQuote(0);
            
            // Set up event listeners
            setupEventListeners();
            
        } catch (error) {
            console.error('Error loading quotes:', error);
            quoteDisplay.textContent = "Error loading quotes. Please check the console for details.";
        }
    }
    
    // Load a specific quote
    function loadQuote(index) {
        if (index >= quotes.length) {
            // All quotes completed, show results
            showResults();
            return;
        }
        
        currentQuoteIndex = index;
        currentQuote = quotes[index];
        
        // Update UI
        quoteNumberElement.textContent = `Quote ${index + 1}/${quotes.length}`;
        renderQuote();
        
        // Reset typing input
        typingInput.value = '';
        errors = 0;
        typedCharacters = 0;
        
        // Update progress
        updateProgress();
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
        countdownElement.querySelector('span').textContent = count;
        
        const countdownInterval = setInterval(() => {
            count--;
            
            if (count > 0) {
                countdownElement.querySelector('span').textContent = count;
            } else {
                clearInterval(countdownInterval);
                countdownElement.classList.add('hidden');
                
                // Start the game
                gameActive = true;
                startTime = new Date();
                timeLeft = 60;
                errors = 0;
                typedCharacters = 0;
                
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
        clearInterval(raceInterval);
        
        raceInterval = setInterval(() => {
            if (!gameActive) return;
            
            // Calculate WPM
            const elapsedTime = (new Date() - startTime) / 1000 / 60; // in minutes
            const wpm = Math.round(typedCharacters / 5 / elapsedTime) || 0;
            
            // Update WPM display
            wpmElement.textContent = wpm;
            currentWpmElement.textContent = `${wpm} WPM`;
            
            // Move player car based on WPM
            const playerProgress = Math.min(85, (wpm / 100) * 85);
            playerCar.style.left = `${5 + playerProgress}%`;
            
            // Move opponent car based on predefined WPM
            const opponentWpm = currentQuote.benchmarkWPM || 60;
            const opponentProgress = Math.min(85, (opponentWpm / 100) * 85);
            opponentCar.style.left = `${5 + opponentProgress}%`;
            
            // Check if someone won
            if (playerProgress >= 85) {
                // Player wins
                endGame(true);
            } else if (opponentProgress >= 85) {
                // Opponent wins
                endGame(false);
            }
        }, 100);
    }
    
    // Handle typing input
    function handleTyping() {
        if (!gameActive) return;
        
        const quoteArray = currentQuote.text.split('');
        const inputArray = typingInput.value.split('');
        
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
                
                // Count error if not already counted for this character
                if (index >= inputArray.length - 1) {
                    errors++;
                }
            }
        });
        
        // Update typed characters
        typedCharacters = inputArray.length;
        
        // Calculate accuracy
        const accuracy = typedCharacters > 0 
            ? Math.round(((typedCharacters - errors) / typedCharacters) * 100) 
            : 100;
        accuracyElement.textContent = `${accuracy}%`;
        
        // Check if quote is completed
        if (inputArray.length === quoteArray.length) {
            // Quote completed, load next one
            setTimeout(() => {
                loadQuote(currentQuoteIndex + 1);
            }, 500);
        }
    }
    
    // Prevent copy/paste
    function preventCopyPaste(e) {
        e.preventDefault();
        return false;
    }
    
    // Update progress
    function updateProgress() {
        const progress = Math.round((currentQuoteIndex / quotes.length) * 100);
        progressElement.textContent = `${progress}%`;
    }
    
    // End the game
    function endGame(playerWon = false) {
        gameActive = false;
        clearInterval(timer);
        clearInterval(raceInterval);
        
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
                            <div class="modal-value">${currentQuoteIndex}</div>
                            <div class="modal-label">Quotes</div>
                        </div>
                    </div>
                    
                    <button class="btn primary" id="play-again-btn">Play Again</button>
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
        clearInterval(raceInterval);
        
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
        
        // Load first quote
        loadQuote(0);
        
        // Enable input for new game
        typingInput.disabled = false;
    }
    
    // Initialize the game
    initGame();
});