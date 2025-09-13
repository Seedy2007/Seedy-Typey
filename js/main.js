// Main menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('start-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const instructions = document.querySelector('.instructions');
    
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