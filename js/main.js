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

    // Check if player data exists in localStorage
    function loadPlayerData() {
        const savedData = localStorage.getItem('seedyPlayerData');
        if (savedData) {
            playerData = JSON.parse(savedData);
            return true;
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
        }
    });

    // Character selection
    selectCharBtn.addEventListener('click', function() {
        characterSelection.classList.toggle('hidden');
    });

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

    // Demo animation
    function startDemoAnimation() {
        const playerDemo = document.querySelector('.player-demo');
        const opponentDemo = document.querySelector('.opponent-demo');
        
        if (playerDemo && opponentDemo) {
            // Reset positions
            playerDemo.style.left = '10px';
            opponentDemo.style.left = '10px';
            
            // Animate player
            setTimeout(() => {
                playerDemo.style.transition = 'left 3s linear';
                playerDemo.style.left = 'calc(100% - 100px)';
            }, 500);
            
            // Animate opponent with some variation
            setTimeout(() => {
                opponentDemo.style.transition = 'left 3.5s linear';
                opponentDemo.style.left = 'calc(100% - 120px)';
            }, 1000);
            
            // Reset and restart animation
            setTimeout(() => {
                playerDemo.style.transition = 'none';
                opponentDemo.style.transition = 'none';
                playerDemo.style.left = '10px';
                opponentDemo.style.left = '10px';
                
                setTimeout(startDemoAnimation, 1000);
            }, 4500);
        }
    }

    // Initialize
    initPlayerData();
    startDemoAnimation();
});