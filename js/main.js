document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const playerNameInput = document.getElementById('player-display-name');
    const playerInfoDisplay = document.getElementById('player-info-display');
    const menuContent = document.getElementById('menu-content');
    const selectCharBtn = document.getElementById('select-char-btn');
    const characterSelection = document.querySelector('.character-selection');
    const singlePlayerBtn = document.getElementById('single-player-btn');
    const publicRaceBtn = document.getElementById('public-race-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const instructions = document.querySelector('.instructions');
    const charOptions = document.querySelectorAll('.char-option');

    // Player data
    let playerData = {
        name: 'Player',
        character: 'happy',
        wpm: 0,
        accuracy: 0,
        races: 0
    };

    // Animation cleanup function
    let cleanupDemo = null;

    // Check if player data exists in localStorage
    function loadPlayerData() {
        const savedData = localStorage.getItem('seedyPlayerData');
        if (savedData) {
            try {
                playerData = JSON.parse(savedData);
                return true;
            } catch (e) {
                console.error('Error parsing player data:', e);
            }
        }
        return false;
    }

    // Save player data to localStorage
    function savePlayerData() {
        localStorage.setItem('seedyPlayerData', JSON.stringify(playerData));
    }

    // Initialize player data
    function initPlayerData() {
        if (loadPlayerData()) {
            playerNameInput.value = playerData.name;
        } else {
            savePlayerData();
        }
        updatePlayerDisplay();
    }

    // Update player info display
    function updatePlayerDisplay() {
        // Update character in demo
        const playerChar = document.getElementById('player-char');
        if (playerChar) {
            playerChar.className = `char ${playerData.character}`;
            playerChar.textContent = getCharacterText(playerData.character);
        }
    }

    // Save player name when input changes
    playerNameInput.addEventListener('change', function() {
        const name = playerNameInput.value.trim();
        if (name) {
            playerData.name = name;
            savePlayerData();
        } else {
            playerNameInput.value = playerData.name; // Restore previous name
        }
    });

    playerNameInput.addEventListener('blur', function() {
        const name = playerNameInput.value.trim();
        if (!name) {
            playerNameInput.value = playerData.name; // Restore previous name if empty
        } else if (name !== playerData.name) {
            // Save if name changed
            playerData.name = name;
            savePlayerData();
        }
    });

    // Character selection
    selectCharBtn.addEventListener('click', function() {
        characterSelection.classList.toggle('hidden');
        updateCharacterSelection();
    });

    function updateCharacterSelection() {
        charOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.char === playerData.character) {
                option.classList.add('active');
            }
        });
    }

    // Character selection for main options
    charOptions.forEach(option => {
        option.addEventListener('click', function() {
            charOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            playerData.character = this.dataset.char;
            savePlayerData();
            
            // Update character in demo
            updatePlayerDisplay();
        });
    });

    // Get character display text
    function getCharacterText(charType) {
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

    // Navigation buttons
    singlePlayerBtn.addEventListener('click', function() {
        window.location.href = 'game.html';
    });

    publicRaceBtn.addEventListener('click', function() {
        window.location.href = 'public-race.html';
    });

    instructionsBtn.addEventListener('click', function() {
        instructions.classList.toggle('hidden');
    });

    // Enhanced demo animation
    function startDemoAnimation() {
        const playerDemo = document.querySelector('.player-demo');
        const opponentDemo = document.querySelector('.opponent-demo');
        
        if (playerDemo && opponentDemo) {
            let playerAnimationId, opponentAnimationId;
            
            function animatePlayer() {
                const trackWidth = document.querySelector('.track').offsetWidth;
                const charWidth = 60; // Approximate character width
                
                // Random speed between 2-4 seconds
                const duration = 2000 + Math.random() * 2000;
                const startTime = Date.now();
                
                function updatePlayerPosition() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Ease-out function for smooth deceleration at the end
                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    const newPosition = 10 + (trackWidth - charWidth - 20) * easeProgress;
                    
                    playerDemo.style.left = `${newPosition}px`;
                    
                    if (progress < 1) {
                        playerAnimationId = requestAnimationFrame(updatePlayerPosition);
                    } else {
                        // Immediately reset and restart with new random speed
                        playerDemo.style.left = '10px';
                        setTimeout(animatePlayer, 100); // Small delay before restarting
                    }
                }
                
                playerAnimationId = requestAnimationFrame(updatePlayerPosition);
            }
            
            function animateOpponent() {
                const trackWidth = document.querySelector('.track').offsetWidth;
                const charWidth = 60; // Approximate character width
                
                // Random speed between 1.5-3.5 seconds (slightly faster variations)
                const duration = 1500 + Math.random() * 2000;
                const startTime = Date.now();
                
                function updateOpponentPosition() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Different easing for opponent
                    const easeProgress = progress < 0.8 ? 
                        progress * (2 - progress) : // ease-out quad for most of the race
                        0.96 + 0.04 * ((progress - 0.8) / 0.2); // slow finish
                    
                    const newPosition = 10 + (trackWidth - charWidth - 20) * easeProgress;
                    
                    opponentDemo.style.left = `${newPosition}px`;
                    
                    if (progress < 1) {
                        opponentAnimationId = requestAnimationFrame(updateOpponentPosition);
                    } else {
                        // Immediately reset and restart with new random speed
                        opponentDemo.style.left = '10px';
                        setTimeout(animateOpponent, 150); // Small delay before restarting
                    }
                }
                
                opponentAnimationId = requestAnimationFrame(updateOpponentPosition);
            }
            
            // Start both animations
            animatePlayer();
            setTimeout(animateOpponent, 500); // Staggered start
            
            // Cleanup function
            return () => {
                if (playerAnimationId) cancelAnimationFrame(playerAnimationId);
                if (opponentAnimationId) cancelAnimationFrame(opponentAnimationId);
            };
        }
    }

    // Initialize
    initPlayerData();
    cleanupDemo = startDemoAnimation();

    // Clean up animation when leaving page
    window.addEventListener('beforeunload', () => {
        if (cleanupDemo) cleanupDemo();
    });
});