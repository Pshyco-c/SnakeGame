let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let scoreText = document.getElementById("Score");
let highScoreText = document.getElementById("HighScore");
let resetBtn = document.getElementById("reset");
let pauseBtn = document.getElementById("pause");
let difficultySelect = document.getElementById("difficulty");
let gameOverScreen = document.getElementById("gameOverScreen");
let finalScoreText = document.getElementById("finalScore");
let restartBtn = document.getElementById("restart");
let leftBtn = document.getElementById("leftBtn");
let rightBtn = document.getElementById("rightBtn");
let upBtn = document.getElementById("upBtn");
let downBtn = document.getElementById("downBtn");
let score = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let size = 20;
// let snakeX=20;
// let snakeY=20;
let foodX;
let foodY;
let canvasW = canvas.width;
let canvasH = canvas.height;
let running = false;
let paused = false;
let speedX = size;
let speedY = 0;
let snake = [
  { x: size * 4, y: 0 },
  { x: size * 3, y: 0 },
  { x: size * 2, y: 0 },
  { x: size, y: 0 },
  { x: 0, y: 0 }
]
let fps = 5;
let lastPressedDirection = "";
let lastRenderTime = 0;
let fullscreenBtn = document.getElementById("fullscreenBtn");
let muteBtn = document.getElementById("muteBtn");
let isMuted = false;
let animationFrameId = null;

// Colors and visual settings
const colors = {
  snakeHead: "#66ff66",
  snakeBody: "#4CAF50",
  food: "#ff4444",
  border: "#333333",
  background: "#000000"
};

// Difficulty settings
const difficulties = {
  easy: { fps: 5, scoreMultiplier: 1 },
  medium: { fps: 10, scoreMultiplier: 2 },
  hard: { fps: 15, scoreMultiplier: 3 }
};

// Sound effects - using simpler sound effects with fallbacks
let foodSound;
let gameOverSound;
let buttonSound;

// Initialize sounds with fallbacks to prevent issues
try {
  foodSound = new Audio("https://www.soundjay.com/misc/sounds/coin-drop-1.mp3");
  gameOverSound = new Audio("https://www.soundjay.com/misc/sounds/fail-buzzer-03.mp3");
  buttonSound = new Audio("https://www.soundjay.com/misc/sounds/button-click-on.mp3");
  
  // Initialize sound effects
  foodSound.volume = 0.3;
  gameOverSound.volume = 0.3;
  buttonSound.volume = 0.2;
  
  // Preload sounds
  foodSound.load();
  gameOverSound.load();
  buttonSound.load();
} catch (error) {
  console.log("Sound initialization failed, continuing without sound");
  // Create dummy sound objects that do nothing when played
  foodSound = gameOverSound = buttonSound = { 
    play: function() {}, 
    currentTime: 0,
    volume: 0,
    load: function() {}
  };
}

// Event Listeners
window.addEventListener("keydown", changeDirection);
resetBtn.addEventListener("click", function() {
  playSound(buttonSound);
  reset();
});
pauseBtn.addEventListener("click", function() {
  playSound(buttonSound);
  togglePause();
});
restartBtn.addEventListener("click", function() {
  playSound(buttonSound);
  hideGameOverScreen();
  reset();
});
difficultySelect.addEventListener("change", function() {
  playSound(buttonSound);
  updateDifficulty();
});

// Mobile controls - updated to prevent default behavior
leftBtn.addEventListener("touchstart", function(e) { e.preventDefault(); handleDirectionBtn("left"); });
rightBtn.addEventListener("touchstart", function(e) { e.preventDefault(); handleDirectionBtn("right"); });
upBtn.addEventListener("touchstart", function(e) { e.preventDefault(); handleDirectionBtn("up"); });
downBtn.addEventListener("touchstart", function(e) { e.preventDefault(); handleDirectionBtn("down"); });
leftBtn.addEventListener("click", function() { handleDirectionBtn("left"); });
rightBtn.addEventListener("click", function() { handleDirectionBtn("right"); });
upBtn.addEventListener("click", function() { handleDirectionBtn("up"); });
downBtn.addEventListener("click", function() { handleDirectionBtn("down"); });

// Fullscreen and Mute buttons
fullscreenBtn.addEventListener("click", toggleFullscreen);
muteBtn.addEventListener("click", toggleMute);

highScoreText.textContent = highScore;
updateDifficulty();

// Make sure canvas is properly set up
function setupCanvas() {
  // Set actual canvas dimensions to match its display size for proper rendering
  const displayWidth = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;
  
  // Only resize if dimensions don't match
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    
    // Recalculate game dimensions
    canvasW = canvas.width;
    canvasH = canvas.height;
    
    // Update size based on canvas dimensions to maintain proper gameplay
    size = Math.floor(canvasW / 20); // 20 cells across
  }
}

// Listen for window resize
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', handleResize);

function handleResize() {
  // Delay to ensure dimensions are updated
  setTimeout(() => {
    setupCanvas();
    // Redraw everything
    if (!paused && running) {
      clearBoard();
      drawFood();
      drawSnake();
    }
  }, 100);
}

// Load initial canvas setup
setupCanvas();
gameStart();

function handleDirectionBtn(direction) {
  playSound(buttonSound);
  const directionMap = {
    left: { keyCode: 37 },
    up: { keyCode: 38 },
    right: { keyCode: 39 },
    down: { keyCode: 40 }
  };
  changeDirection(directionMap[direction]);
}

function updateDifficulty() {
  const difficulty = difficultySelect.value;
  fps = difficulties[difficulty].fps;
}

function togglePause() {
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
  
  if (!paused) {
    // When resuming, update the lastRenderTime to now to prevent multiple updates
    lastRenderTime = performance.now();
    // Cancel any existing animation frame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    nextTick();
  }
}

function gameStart() {
  setupCanvas();
  running = true;
  paused = false;
  pauseBtn.textContent = "Pause";
  score = 0;
  scoreText.textContent = score;
  hideGameOverScreen();
  
  // Cancel any existing animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  
  moveFood();
  drawFood();
  nextTick();
}

function nextTick() {
  if (running && !paused) {
    // Store the animation frame ID so we can cancel it if needed
    animationFrameId = window.requestAnimationFrame((currentTime) => {
      // Calculate time since last frame
      const secondsSinceLastRender = (currentTime - lastRenderTime) / 1000;
      // If not enough time has passed, request another frame and return
      if (secondsSinceLastRender < 1 / fps) {
        animationFrameId = window.requestAnimationFrame(nextTick);
        return;
      }
      
      lastRenderTime = currentTime;
      lastPressedDirection = ""; // Reset direction buffer between frames
      
      clearBoard();
      drawFood();
      moveSnake();
      drawSnake();
      checkGameOver();
      
      if (running && !paused) {
        animationFrameId = window.requestAnimationFrame(nextTick);
      }
    });
  }
}

function clearBoard() {
  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, canvasW, canvasH);
}

function moveFood() {
  function randomFood(min, max) {
    let randomNum = Math.floor((Math.random() * (max - min) + min) / size) * size;
    return randomNum;
  }
  
  // Generate initial food position
  let newFoodX = randomFood(0, canvasW - size);
  let newFoodY = randomFood(0, canvasH - size);
  
  // Make sure food doesn't spawn on snake
  let attempts = 0;
  let foodOnSnake = true;
  while (foodOnSnake && attempts < 50) {  // Add max attempts to prevent infinite loop
    attempts++;
    foodOnSnake = false;
    
    for (let part of snake) {
      if (part.x === newFoodX && part.y === newFoodY) {
        foodOnSnake = true;
        newFoodX = randomFood(0, canvasW - size);
        newFoodY = randomFood(0, canvasH - size);
        break;
      }
    }
  }
  
  foodX = newFoodX;
  foodY = newFoodY;
}

function drawFood() {
  ctx.fillStyle = colors.food;
  ctx.shadowColor = colors.food;
  ctx.shadowBlur = 10;
  ctx.fillRect(foodX, foodY, size, size);
  ctx.shadowBlur = 0;
}

function moveSnake() {
  let head = { x: snake[0].x + speedX, y: snake[0].y + speedY };
  snake.unshift(head);
  
  // Check if snake eats food
  if (snake[0].x === foodX && snake[0].y === foodY) {
    // Play sound
    playSound(foodSound);
    
    // Calculate score based on difficulty
    const difficulty = difficultySelect.value;
    score += difficulties[difficulty].scoreMultiplier;
    scoreText.textContent = score;
    
    // Update high score if needed
    if (score > highScore) {
      highScore = score;
      highScoreText.textContent = highScore;
      localStorage.setItem("snakeHighScore", highScore);
    }
    
    moveFood();
  } else {
    snake.pop();
  }
}

function drawSnake() {
  snake.forEach((unit, index) => {
    // Different color for head
    if (index === 0) {
      ctx.fillStyle = colors.snakeHead;
    } else {
      ctx.fillStyle = colors.snakeBody;
    }
    
    ctx.strokeStyle = colors.border;
    ctx.fillRect(unit.x, unit.y, size, size);
    ctx.strokeRect(unit.x, unit.y, size, size);
    
    // Add eyes to snake head
    if (index === 0) {
      ctx.fillStyle = "#000000";
      
      // Determine eyes position based on direction
      if (speedX === size) { // Moving right
        ctx.fillRect(unit.x + size - 5, unit.y + 5, 3, 3);
        ctx.fillRect(unit.x + size - 5, unit.y + size - 8, 3, 3);
      } else if (speedX === -size) { // Moving left
        ctx.fillRect(unit.x + 2, unit.y + 5, 3, 3);
        ctx.fillRect(unit.x + 2, unit.y + size - 8, 3, 3);
      } else if (speedY === size) { // Moving down
        ctx.fillRect(unit.x + 5, unit.y + size - 5, 3, 3);
        ctx.fillRect(unit.x + size - 8, unit.y + size - 5, 3, 3);
      } else { // Moving up
        ctx.fillRect(unit.x + 5, unit.y + 2, 3, 3);
        ctx.fillRect(unit.x + size - 8, unit.y + 2, 3, 3);
      }
    }
  });
}

function changeDirection(e) {
  if (paused) return;
  
  // Get key code, handle both object passed from button and keyboard event
  const keyPress = e.keyCode || e;
  const left = 37;
  const up = 38;
  const right = 39;
  const down = 40;
  
  // Prevent scrolling when using arrow keys
  if (e.preventDefault && [left, up, right, down].includes(keyPress)) {
    e.preventDefault();
  }
  
  const goingLeft = (speedX === -size);
  const goingRight = (speedX === size);
  const goingUp = (speedY === -size);
  const goingDown = (speedY === size);
  
  // Prevent multiple key presses in the same tick
  // Only check if this is a keyboard event (has a keyCode property)
  if (e.keyCode && lastPressedDirection === keyPress) return;
  lastPressedDirection = keyPress;
  
  switch (true) {
    case (keyPress === left && !goingRight):
      speedX = -size;
      speedY = 0;
      break;
    case (keyPress === right && !goingLeft):
      speedX = size;
      speedY = 0;
      break;
    case (keyPress === up && !goingDown):
      speedX = 0;
      speedY = -size;
      break;
    case (keyPress === down && !goingUp):
      speedX = 0;
      speedY = size;
      break;
  }
}

function checkGameOver() {
  let isGameOver = false;
  
  // Check wall collision
  if (snake[0].x < 0 || 
      snake[0].x >= canvasW || 
      snake[0].y < 0 || 
      snake[0].y >= canvasH) {
    isGameOver = true;
  }
  
  // Check self collision
  for (let i = 1; i < snake.length; i++) {
    if (snake[i].x === snake[0].x && snake[i].y === snake[0].y) {
      isGameOver = true;
      break;
    }
  }
  
  if (isGameOver) {
    running = false;
    gameOver();
  }
}

function gameOver() {
  // Ensure the game is stopped
  running = false;
  paused = false;
  
  // Cancel any existing animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Clear the board one last time and draw final state
  clearBoard();
  drawFood();
  drawSnake();
  
  // Play game over sound
  playSound(gameOverSound);
  
  // Update high score if needed
  if (score > highScore) {
    highScore = score;
    highScoreText.textContent = highScore;
    localStorage.setItem("snakeHighScore", highScore);
  }
  
  // Display game over screen
  gameOverScreen.style.display = "block";
  finalScoreText.textContent = score;
  
  // Reset game state
  lastPressedDirection = "";
  speedX = size;
  speedY = 0;
}

function reset() {
  // Cancel any existing animation frame
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Reset game state
  score = 0;
  speedX = size;
  speedY = 0;
  snake = [
    { x: size * 4, y: 0 },
    { x: size * 3, y: 0 },
    { x: size * 2, y: 0 },
    { x: size, y: 0 },
    { x: 0, y: 0 }
  ];
  
  // Reset timing and input state
  lastPressedDirection = "";
  lastRenderTime = performance.now();
  
  // Hide game over screen if visible
  hideGameOverScreen();
  
  // Start new game
  gameStart();
}

function hideGameOverScreen() {
  gameOverScreen.style.display = "none";
}

// Function to toggle fullscreen
function toggleFullscreen() {
  playSound(buttonSound);
  
  const gameContainer = document.querySelector('.game-container');
  const body = document.body;
  
  try {
    if (!document.fullscreenElement) {
      if (gameContainer.requestFullscreen) {
        gameContainer.requestFullscreen();
      } else if (gameContainer.mozRequestFullScreen) { // Firefox
        gameContainer.mozRequestFullScreen();
      } else if (gameContainer.webkitRequestFullscreen) { // Chrome, Safari, Opera
        gameContainer.webkitRequestFullscreen();
      } else if (gameContainer.msRequestFullscreen) { // IE/Edge
        gameContainer.msRequestFullscreen();
      }
      body.classList.add('is-fullscreen');
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      body.classList.remove('is-fullscreen');
    }
  } catch (err) {
    console.log("Fullscreen error: ", err);
  }
}

// Function to toggle mute
function toggleMute() {
  // We need to let the button sound play before muting
  const wasAlreadyMuted = isMuted;
  
  // If we're currently muted and about to unmute, play the sound after setting isMuted to false
  if (isMuted) {
    isMuted = false;
    playSound(buttonSound);
  } else {
    // If we're about to mute, play the sound first
    playSound(buttonSound);
    isMuted = true;
  }
  
  muteBtn.textContent = isMuted ? "Unmute Sound" : "Mute Sound";
  
  foodSound.volume = isMuted ? 0 : 0.3;
  gameOverSound.volume = isMuted ? 0 : 0.3;
  buttonSound.volume = isMuted ? 0 : 0.2;
}

// Listen for fullscreen change
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);

function handleFullscreenChange() {
  const body = document.body;
  if (!document.fullscreenElement && 
      !document.webkitFullscreenElement && 
      !document.mozFullScreenElement && 
      !document.msFullscreenElement) {
    body.classList.remove('is-fullscreen');
  } else {
    body.classList.add('is-fullscreen');
  }
}

// Helper function to play sounds only if not muted
function playSound(sound) {
  if (!isMuted && sound) {
    // Reset the sound to beginning and play
    sound.currentTime = 0;
    
    // Use a promise to handle sound playing
    const playPromise = sound.play();
    
    // Catch and suppress errors from autoplay restrictions
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log("Sound play error:", error);
      });
    }
  }
}