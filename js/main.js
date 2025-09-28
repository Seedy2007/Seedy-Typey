// Main menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const toggleCharsBtn = document.getElementById('toggle-chars-btn');
    const instructions = document.querySelector('.instructions');
    const charactersGrid = document.querySelector('.characters-grid');
    const charOptions = document.querySelectorAll('.char-option');
    const playerChar = document.getElementById('player-char');
    
    // Character selection
    let selectedChar = 'happy'; // Default character
    
    // Toggle character selection
    toggleCharsBtn.addEventListener('click', function() {
        charactersGrid.classList.toggle('hidden');
        
        if (charactersGrid.classList.contains('hidden')) {
            toggleCharsBtn.textContent = 'Select Your Character';
        } else {
            toggleCharsBtn.textContent = 'Hide Characters';
        }
    });
    
    // Character selection
    charOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            charOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Update selected character
            selectedChar = this.dataset.char;
            
            // Update player character in demo
            updateCharacterAppearance(playerChar, selectedChar);
            
            // Save selection to localStorage
            localStorage.setItem('selectedChar', selectedChar);
        });
    });
    
        // Function to update character appearance
    function updateCharacterAppearance(charElement, charType) {
        charElement.className = 'char ' + charType;
        
        // Add the appropriate inner elements based on character type
        switch(charType) {
            case 'happy':
                charElement.innerHTML = '<div class="mouth"></div>';
                break;
            case 'speedy':
                charElement.innerHTML = '<div class="goggles"></div><div class="mouth"></div>';
                break;
            case 'cool':
                charElement.innerHTML = '<div class="sunglasses"></div><div class="smirk"></div>';
                break;
            case 'shy':
                charElement.innerHTML = '<div class="eye left"></div><div class="eye right"></div><div class="blush left"></div><div class="blush right"></div><div class="mouth"></div>';
                break;
            case 'sleepy':
                charElement.innerHTML = '<div class="eye left"></div><div class="eye right"></div><div class="zzz">z</div>';
                break;
            case 'mad':
                charElement.innerHTML = '<div class="eyebrow left"></div><div class="eyebrow right"></div><div class="eye left"></div><div class="eye right"></div><div class="mouth"></div>';
                break;
            case 'sad':
                charElement.innerHTML = '<div class="eye left"></div><div class="eye right"></div><div class="mouth"></div>';
                break;
            case 'nerd':
                charElement.innerHTML = '<div class="glasses"><div class="lens left"></div><div class="lens right"></div></div><div class="mouth"></div>';
                break;
            case 'robot':
                charElement.innerHTML = '<div class="antenna"></div><div class="eye left"></div><div class="eye right"></div><div class="mouth"></div>';
                break;
            case 'ghost':
                charElement.innerHTML = '<div class="eye left"></div><div class="eye right"></div><div class="mouth"></div>';
                break;
            case 'seedy':
                charElement.innerHTML = '<div class="face">>⩊<</div>';
                break;
        }
    }
    
    // Load saved character selection
    const savedChar = localStorage.getItem('selectedChar');
    if (savedChar) {
        selectedChar = savedChar;
        charOptions.forEach(option => {
            if (option.dataset.char === savedChar) {
                option.classList.add('active');
                updateCharacterAppearance(playerChar, savedChar);
            }
        });
    }
    
    // Start game button
    startBtn.addEventListener('click', function() {
        window.location.href = 'game.html';
    });
    
    // Toggle instructions
    instructionsBtn.addEventListener('click', function() {
        instructions.classList.toggle('hidden');
        
        if (instructions.classList.contains('hidden')) {
            instructionsBtn.textContent = 'How to Play';
        } else {
            instructionsBtn.textContent = 'Hide Instructions';
        }
    });
    
    // Animate demo cars
    const playerDemo = document.querySelector('.player-demo');
    const opponentDemo = document.querySelector('.opponent-demo');
    
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
});