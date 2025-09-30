document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const nameModal = document.getElementById('name-modal');
    const nameInput = document.getElementById('player-name-input');
    const savePlayerBtn = document.getElementById('save-player-btn');
    const playerInfoDisplay = document.getElementById('player-info-display');
    const playerDisplayName = document.getElementById('player-display-name');
    const changeNameBtn = document.getElementById('change-name-btn');
    const menuContent = document.getElementById('menu-content');
    const selectCharBtn = document.getElementById('select-char-btn');
    const characterSelection = document.querySelector('.character-selection');
    const singlePlayerBtn = document.getElementById('single-player-btn');
    const publicRaceBtn = document.getElementById('public-race-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const instructions = document.querySelector('.instructions');
    const charOptions = document.querySelectorAll('.char-option');
    const charOptionsMini = document.querySelectorAll('.char-option-mini');

    // Player data
    let playerData = {
        name: '',
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

    // Show name modal if no player data exists
    if (!loadPlayerData()) {
        nameModal.classList.remove('hidden');
    } else {
        updatePlayerDisplay();
        menuContent.classList.remove('hidden');
    }

    // Save player name and character
    savePlayerBtn.addEventListener('click', function() {
        const name = nameInput.value.trim();
        if (name) {
            playerData.name = name;
            savePlayerData();
            nameModal.classList.add('hidden');
            menuContent.classList.remove('hidden');
            updatePlayerDisplay();
        } else {
            alert('Please enter a name!');
        }
    });

    // Update player info display
    function updatePlayerDisplay() {
        playerDisplayName.textContent = playerData.name;
        playerInfoDisplay.classList.remove('hidden');
        
        // Update character in demo
        const playerChar = document.getElementById('player-char');
        if (playerChar) {
            playerChar.className = `char ${playerData.character}`;
            playerChar.textContent = getCharacterText(playerData.character);
        }
    }

    // Change name button
    changeNameBtn.addEventListener('click', function() {
        nameInput.value = playerData.name;
        nameModal.classList.remove('hidden');
        menuContent.classList.add('hidden');
    });

    // Character selection
    selectCharBtn.addEventListener('click', function() {
        characterSelection.classList.toggle('hidden');
    });

    // Character selection for mini options (in modal)
    charOptionsMini.forEach(option => {
        option.addEventListener('click', function() {
            charOptionsMini.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            playerData.character = this.dataset.char;
            
            // Update character in modal
            const playerChar = document.getElementById('player-char');
            if (playerChar) {
                playerChar.className = `char ${playerData.character}`;
                playerChar.textContent = getCharacterText(playerData.character);
            }
        });
    });

    // Character selection for main options
    charOptions.forEach(option => {
        option.addEventListener('click', function() {
            charOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            playerData.character = this.dataset.char;
            savePlayerData();
            
            // Update character in demo
            const playerChar = document.getElementById('player-char');
            if (playerChar) {
                playerChar.className = `char ${playerData.character}`;
                playerChar.textContent = getCharacterText(playerData.character);
            }
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

    // Start demo animation
    startDemoAnimation();
});