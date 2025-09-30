// Main menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const instructionsBtn = document.getElementById('instructions-btn');
    const selectCharBtn = document.getElementById('select-char-btn');
    const instructions = document.querySelector('.instructions');
    const characterSelection = document.querySelector('.character-selection');
    const charOptions = document.querySelectorAll('.char-option');
    const playerChar = document.getElementById('player-char');
    
    // Character selection
    let selectedChar = localStorage.getItem('selectedChar') || 'happy';
    
    // Toggle character selection
    selectCharBtn?.addEventListener('click', function() {
        if (characterSelection) {
            characterSelection.classList.toggle('hidden');
            
            if (characterSelection.classList.contains('hidden')) {
                selectCharBtn.textContent = 'Select Your Character';
            } else {
                selectCharBtn.textContent = 'Hide Character Selection';
            }
        }
    });
    
    charOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            charOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update selected character
            selectedChar = this.dataset.char;
            
            // Update player character in demo
            const charExpression = this.querySelector('.char').textContent;
            if (playerChar) {
                playerChar.textContent = charExpression;
                playerChar.className = 'char ' + selectedChar;
            }
            
            // Save selection to localStorage
            localStorage.setItem('selectedChar', selectedChar);
            
            // Update multiplayer character if exists
            if (window.multiplayer) {
                window.multiplayer.playerCharacter = selectedChar;
                window.multiplayer.savePlayerData(window.multiplayer.playerName, selectedChar);
            }
        });
    });
    
    // Load saved character selection
    const savedChar = localStorage.getItem('selectedChar');
    if (savedChar) {
        selectedChar = savedChar;
        charOptions.forEach(option => {
            if (option.dataset.char === savedChar) {
                option.classList.add('active');
                const charExpression = option.querySelector('.char').textContent;
                if (playerChar) {
                    playerChar.textContent = charExpression;
                    playerChar.className = 'char ' + savedChar;
                }
            }
        });
    }
    
    // Toggle instructions
    instructionsBtn?.addEventListener('click', function() {
        if (instructions) {
            instructions.classList.toggle('hidden');
            
            if (instructions.classList.contains('hidden')) {
                instructionsBtn.textContent = 'How to Play';
            } else {
                instructionsBtn.textContent = 'Hide Instructions';
            }
        }
    });
    
    // Animate demo cars
    const playerDemo = document.querySelector('.player-demo');
    const opponentDemo = document.querySelector('.opponent-demo');
    
    if (playerDemo && opponentDemo) {
        let playerPosition = 5;
        let opponentPosition = 5;
        
        // Demo animation
        function animateDemo() {
            playerPosition += Math.random() * 0.8;
            opponentPosition += Math.random() * 0.7;
            
            if (playerPosition > 85) playerPosition = 5;
            if (opponentPosition > 85) opponentPosition = 5;
            
            playerDemo.style.left = playerPosition + '%';
            opponentDemo.style.left = opponentPosition + '%';
            
            requestAnimationFrame(animateDemo);
        }
        
        animateDemo();
    }
});