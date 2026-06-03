/**
 * Dopamine Dystopia: Focus Defense - Main Game Loop & Mechanics
 * Handles rendering, physics, input, and player states.
 */

// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = CANVAS_HEIGHT / 2;

const PLAYER_RADIUS = 28;
const SHIELD_RADIUS = 60;
const SHIELD_THICKNESS = 8;
const BASE_SHIELD_ANGLE_SIZE = Math.PI / 3; // 60 degrees

// Game State Variables
let gameState = 'START'; // START, PLAYING, GAMEOVER
let mentalHealth = 100; // 100 to 0 (Attention)
let dopamineLevel = 0; // 0 to 100 (Overload)
let scoreTime = 0.0;
let blocksCount = 0;
let difficultyLevel = 1.0;
let projectiles = [];
let particles = [];
let shieldAngle = 0;
let mousePos = { x: CENTER_X, y: CENTER_Y };
let lastTime = 0;
let spawnTimer = 0;
let spawnInterval = 2000; // ms between spawns
let isPaused = false;

// Visual FX state
let screenShakeIntensity = 0;
let hitFlashTimer = 0;
let dopamineFlashTimer = 0;
let accessibilityMode = false;

// Projectile Types Definitions
const PROJECTILE_TYPES = {
    TIKTOK: {
        name: 'TikTok Short',
        color: '#ff007f', // neon magenta
        glowColor: '#00f3ff',
        radius: 12,
        damage: 10,
        speed: 2.8,
        draw: (ctx, x, y, size, angle) => {
            // Stylized 'd' logo (music note) representing short-form video
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Draw Tik Tok double shadow offset
            ctx.lineWidth = 3;
            
            // Red/magenta shadow
            ctx.strokeStyle = '#ff007f';
            ctx.beginPath();
            ctx.arc(-1, 2, 4, 0, Math.PI * 2);
            ctx.moveTo(-1, 2);
            ctx.lineTo(-1, -6);
            ctx.bezierCurveTo(-1, -6, 2, -5, 3, -8);
            ctx.stroke();

            // Cyan shadow
            ctx.strokeStyle = '#00f3ff';
            ctx.beginPath();
            ctx.arc(1, -1, 4, 0, Math.PI * 2);
            ctx.moveTo(1, -1);
            ctx.lineTo(1, -9);
            ctx.bezierCurveTo(1, -9, 4, -8, 5, -11);
            ctx.stroke();
            
            ctx.restore();
        }
    },
    INSTAGRAM: {
        name: 'Instagram Scroll',
        color: '#ff8800', // orange/yellow/pink gradient
        glowColor: '#ff00aa',
        radius: 14,
        damage: 8,
        speed: 1.8,
        draw: (ctx, x, y, size, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Gradient fill camera icon
            const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, size);
            grad.addColorStop(0, '#fffb00');
            grad.addColorStop(0.5, '#ff007f');
            grad.addColorStop(1, '#6600ff');
            
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.5;
            
            // Outer camera square
            ctx.beginPath();
            ctx.roundRect(-size/2, -size/2, size, size, 4);
            ctx.stroke();
            
            // Lens circle
            ctx.beginPath();
            ctx.arc(0, 0, size/4, 0, Math.PI*2);
            ctx.stroke();
            
            // Flash dot
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(size/3, -size/3, 1.5, 0, Math.PI*2);
            ctx.fill();
            
            ctx.restore();
        }
    },
    YOUTUBE: {
        name: 'YouTube Loop',
        color: '#ff0000',
        glowColor: '#ff3333',
        radius: 18,
        damage: 15,
        speed: 1.2,
        isLarge: true,
        draw: (ctx, x, y, size, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Rounded red rectangle
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.roundRect(-size * 0.7, -size * 0.5, size * 1.4, size, 6);
            ctx.fill();
            
            // Play button (white triangle)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-size * 0.2, -size * 0.25);
            ctx.lineTo(size * 0.25, 0);
            ctx.lineTo(-size * 0.2, size * 0.25);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }
    },
    SNS: {
        name: 'SNS Alert',
        color: '#39ff14', // neon green
        glowColor: '#00ff66',
        radius: 11,
        damage: 6,
        speed: 0.8, // starts slow, dashes
        isDasher: true,
        draw: (ctx, x, y, size, angle) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            ctx.strokeStyle = '#39ff14';
            ctx.fillStyle = 'rgba(57, 255, 20, 0.1)';
            ctx.lineWidth = 2;
            
            // Speech bubble
            ctx.beginPath();
            ctx.roundRect(-size/2, -size/2 - 2, size, size - 2, 4);
            ctx.fill();
            ctx.stroke();
            
            // Text lines inside bubble
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-size/3, -size/4);
            ctx.lineTo(size/3, -size/4);
            ctx.moveTo(-size/3, 0);
            ctx.lineTo(size/4, 0);
            ctx.stroke();
            
            ctx.restore();
        }
    }
};

// Canvas references
let canvas = null;
let ctx = null;

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // Resize setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // UI Event Listeners
    const startBtn = document.getElementById('start-btn');
    const retryBtn = document.getElementById('retry-btn');
    const muteBtn = document.getElementById('audio-mute-btn');
    const accessibilityBtn = document.getElementById('accessibility-btn');
    const accessToggle = document.getElementById('accessibility-toggle');
    const startOverlay = document.getElementById('start-overlay');
    const gameoverOverlay = document.getElementById('gameover-overlay');
    
    // Start game
    startBtn.addEventListener('click', () => {
        audioSystem.init();
        audioSystem.startMusic();
        
        // Synced accessibility checkbox
        accessibilityMode = accessToggle.checked;
        if (accessibilityMode) {
            document.body.classList.add('reduce-glitch');
        } else {
            document.body.classList.remove('reduce-glitch');
        }
        
        startOverlay.classList.add('hidden');
        resetGame();
        gameState = 'PLAYING';
        requestAnimationFrame(gameLoop);
    });
    
    // Retry Game
    retryBtn.addEventListener('click', () => {
        audioSystem.startMusic();
        gameoverOverlay.classList.add('hidden');
        resetGame();
        gameState = 'PLAYING';
        requestAnimationFrame(gameLoop);
    });
    
    // Mute button
    muteBtn.addEventListener('click', () => {
        const isMuted = audioSystem.toggleMute();
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        muteBtn.classList.toggle('active', isMuted);
    });

    // Accessibility togglers
    const toggleAccessibility = (enabled) => {
        accessibilityMode = enabled;
        accessToggle.checked = enabled;
        if (enabled) {
            document.body.classList.add('reduce-glitch');
        } else {
            document.body.classList.remove('reduce-glitch');
        }
    };

    accessibilityBtn.addEventListener('click', () => {
        toggleAccessibility(!accessibilityMode);
    });

    accessToggle.addEventListener('change', (e) => {
        toggleAccessibility(e.target.checked);
    });

    // Setup input tracking on window for maximum responsiveness and edge protection
    window.addEventListener('mousemove', (e) => {
        if (gameState !== 'PLAYING' || isPaused) return;
        
        const rect = canvas.getBoundingClientRect();
        const canvasCenterX = rect.left + rect.width / 2;
        const canvasCenterY = rect.top + rect.height / 2;
        
        const dx = e.clientX - canvasCenterX;
        const dy = e.clientY - canvasCenterY;
        shieldAngle = Math.atan2(dy, dx);
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        mousePos.x = (e.clientX - rect.left) * scaleX;
        mousePos.y = (e.clientY - rect.top) * scaleY;
    });

    // Handle touch support for mobile defense
    window.addEventListener('touchmove', (e) => {
        if (gameState !== 'PLAYING' || isPaused || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const canvasCenterX = rect.left + rect.width / 2;
        const canvasCenterY = rect.top + rect.height / 2;
        
        const dx = touch.clientX - canvasCenterX;
        const dy = touch.clientY - canvasCenterY;
        shieldAngle = Math.atan2(dy, dx);
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        mousePos.x = (touch.clientX - rect.left) * scaleX;
        mousePos.y = (touch.clientY - rect.top) * scaleY;
        
        e.preventDefault();
    }, { passive: false });

    // Spacebar pause toggle listener
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (gameState === 'PLAYING') {
                e.preventDefault();
                togglePause();
            }
        }
    });
});

function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
        audioSystem.stopMusic();
    } else {
        lastTime = performance.now();
        audioSystem.startMusic();
    }
}

function resizeCanvas() {
    if (!canvas) return;
    
    // To support responsive scaling but keep coordinate systems fixed at 800x600:
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
}

function resetGame() {
    mentalHealth = 100;
    dopamineLevel = 0;
    scoreTime = 0.0;
    blocksCount = 0;
    difficultyLevel = 1.0;
    projectiles = [];
    particles = [];
    spawnTimer = 0;
    spawnInterval = 2000;
    lastTime = performance.now();
    screenShakeIntensity = 0;
    isPaused = false;
    
    updateHUD();
    audioSystem.updateTempoAndTone(mentalHealth, scoreTime);
}

// Particle System Spawner
function spawnParticles(x, y, color, count = 8, speedScale = 1.0) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 2 + 1) * speedScale;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1,
            color: color,
            alpha: 1.0,
            decay: Math.random() * 0.03 + 0.02
        });
    }
}

// Projectile Spawner
function spawnProjectile() {
    // Choose side of screen to spawn
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.7;
    const x = CENTER_X + Math.cos(angle) * distance;
    const y = CENTER_Y + Math.sin(angle) * distance;
    
    // Weighted random selection of projectile type
    const rand = Math.random();
    let typeKey = 'INSTAGRAM';
    
    if (rand < 0.35) {
        typeKey = 'TIKTOK';
    } else if (rand < 0.60) {
        typeKey = 'INSTAGRAM';
    } else if (rand < 0.85) {
        typeKey = 'SNS';
    } else {
        typeKey = 'YOUTUBE';
    }
    
    const typeDef = PROJECTILE_TYPES[typeKey];
    
    // Spawning parameters
    let projSpeed = typeDef.speed * difficultyLevel;
    
    // Wave specific variables for Instagram
    let isSineWave = (typeKey === 'INSTAGRAM');
    
    projectiles.push({
        x: x,
        y: y,
        startX: x,
        startY: y,
        angle: angle,
        type: typeKey,
        radius: typeDef.radius,
        damage: typeDef.damage,
        speed: projSpeed,
        color: typeDef.color,
        glowColor: typeDef.glowColor,
        isSineWave: isSineWave,
        waveFrequency: 0.08 + Math.random() * 0.05,
        waveAmplitude: 40 + Math.random() * 30,
        distanceTraveled: 0,
        // SNS dasher specific variables
        dashState: 'NORMAL', // NORMAL, CHARGING, DASHING
        dashTimer: Math.random() * 60 + 30,
        isSplitChild: false // Flag for YouTube mini splits
    });
}

// Spawner for mini-youtube children (splits)
function spawnYouTubeSplits(x, y) {
    const splitAngles = [
        Math.atan2(y - CENTER_Y, x - CENTER_X) + Math.PI / 6,
        Math.atan2(y - CENTER_Y, x - CENTER_X) - Math.PI / 6
    ];

    splitAngles.forEach(angle => {
        // Fast mini Red particles targeting center
        projectiles.push({
            x: x,
            y: y,
            startX: x,
            startY: y,
            angle: angle,
            type: 'TIKTOK', // Re-uses Tik Tok fast behavior but colors it YouTube Red
            radius: 8,
            damage: 6,
            speed: 4.5 * difficultyLevel,
            color: '#ff0000',
            glowColor: '#ffbbbb',
            isSineWave: false,
            distanceTraveled: 0,
            dashState: 'NORMAL',
            isSplitChild: true
        });
    });
}

// Game Loop
function gameLoop(time) {
    if (gameState !== 'PLAYING') return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (!isPaused) {
        update(deltaTime);
    }
    
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update Game Physics
function update(dt) {
    if (dt > 100) dt = 16.6; // Clamp large lags
    
    // 1. Update Game Timers & Difficulty
    scoreTime += dt / 1000;
    
    // Stage increases every 15 seconds
    const stage = Math.floor(scoreTime / 15);
    // Speed and frequency scales by 1.5x per stage
    difficultyLevel = Math.pow(1.5, stage);
    
    // Set spawn interval: starting at 2000ms, decreasing by 1.5x each stage
    spawnInterval = Math.max(250, 2000 / difficultyLevel);
    
    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
        spawnProjectile();
        spawnTimer = 0;
    }
    
    // 2. Shield mapping is handled dynamically by window event listeners for responsiveness
    
    // 3. Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    
    // 4. Update Projectiles & Check Collisions
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        // Core trajectory math: angle from projectile to center
        const angleToCenter = Math.atan2(CENTER_Y - proj.y, CENTER_X - proj.x);
        
        // Handle unique trajectories
        if (proj.isSineWave) {
            // Instagram waves side to side perpendicular to path
            proj.distanceTraveled += proj.speed;
            
            // Direction vectors
            const dirX = Math.cos(angleToCenter);
            const dirY = Math.sin(angleToCenter);
            
            // Perpendicular vectors
            const perpX = -dirY;
            const perpY = dirX;
            
            // Calculate base linear move
            proj.x += dirX * proj.speed;
            proj.y += dirY * proj.speed;
            
            // Apply sine wave offset
            const offset = Math.sin(proj.distanceTraveled * proj.waveFrequency) * proj.waveAmplitude * 0.05;
            proj.x += perpX * offset;
            proj.y += perpY * offset;
            
        } else if (PROJECTILE_TYPES[proj.type].isDasher) {
            // Discord/SNS notification dasher logic
            proj.dashTimer -= 1;
            
            if (proj.dashState === 'NORMAL' && proj.dashTimer <= 0) {
                proj.dashState = 'CHARGING';
                proj.dashTimer = 25; // Charge duration
            } else if (proj.dashState === 'CHARGING' && proj.dashTimer <= 0) {
                proj.dashState = 'DASHING';
                proj.dashTimer = 18; // Dash duration
                proj.speed = 4.8 * difficultyLevel; // High burst speed
            } else if (proj.dashState === 'DASHING' && proj.dashTimer <= 0) {
                proj.dashState = 'NORMAL';
                proj.dashTimer = Math.random() * 80 + 40; // Wait to charge again
                proj.speed = 1.0 * difficultyLevel;
            }
            
            // Charges vibrate slightly, normal & dash move linear
            let vx = Math.cos(angleToCenter) * proj.speed;
            let vy = Math.sin(angleToCenter) * proj.speed;
            
            if (proj.dashState === 'CHARGING') {
                vx += (Math.random() - 0.5) * 1.5;
                vy += (Math.random() - 0.5) * 1.5;
            }
            
            proj.x += vx;
            proj.y += vy;
            
        } else {
            // TikTok & Standard linear projectiles
            proj.x += Math.cos(angleToCenter) * proj.speed;
            proj.y += Math.sin(angleToCenter) * proj.speed;
        }
        
        // 5. Collision Checks
        const distFromCenter = Math.hypot(proj.x - CENTER_X, proj.y - CENTER_Y);
        
        // A. SHIELD SHIELD COLLISION (Block test)
        // Check if projectile is entering the active shield boundary zone
        const shieldInner = SHIELD_RADIUS - SHIELD_THICKNESS / 2 - proj.radius;
        const shieldOuter = SHIELD_RADIUS + SHIELD_THICKNESS / 2 + proj.radius;
        
        if (distFromCenter >= shieldInner && distFromCenter <= shieldOuter) {
            // Determine angle of projectile relative to center
            const projAngle = Math.atan2(proj.y - CENTER_Y, proj.x - CENTER_X);
            
            // Check if within shield angular range
            let angleDiff = projAngle - shieldAngle;
            
            // Wrap angle diff within -PI to PI
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            
            if (Math.abs(angleDiff) <= BASE_SHIELD_ANGLE_SIZE / 2) {
                // Shield Hit registered!
                audioSystem.playBlockSFX();
                blocksCount++;
                
                // Explode blocked particles
                const blockX = CENTER_X + SHIELD_RADIUS * Math.cos(projAngle);
                const blockY = CENTER_Y + SHIELD_RADIUS * Math.sin(projAngle);
                spawnParticles(blockX, blockY, proj.color, 12, 1.2);
                
                // YouTube splitting feature
                if (proj.type === 'YOUTUBE' && !proj.isSplitChild) {
                    spawnYouTubeSplits(proj.x, proj.y);
                }
                
                // Block reward: Decrease dopamine slightly (re-focusing behavior)
                dopamineLevel = Math.max(0, dopamineLevel - 3);
                
                // Delete projectile
                projectiles.splice(i, 1);
                updateHUD();
                continue;
            }
        }
        
        // B. BRAIN COLLISION (Attention depletion)
        if (distFromCenter <= PLAYER_RADIUS + proj.radius) {
            // Distraction Hit!
            audioSystem.playHitSFX();
            
            // Attention damage
            mentalHealth = Math.max(0, mentalHealth - proj.damage);
            
            // Overstimulation accumulation
            dopamineLevel = Math.min(100, dopamineLevel + proj.damage * 1.5);
            
            // SFX & UI feedback
            screenShakeIntensity = accessibilityMode ? 0 : Math.min(18, screenShakeIntensity + proj.damage * 0.8);
            triggerScreenFlash('hit-flash');
            
            // Neon red flash on canvas for YouTube/Instagram hits
            if ((proj.type === 'YOUTUBE' || proj.type === 'INSTAGRAM') && !accessibilityMode) {
                hitFlashTimer = 20;
            }
            
            // High dopamine level triggers visual overstimulation flash
            if (dopamineLevel >= 50 && Math.random() > 0.6) {
                triggerScreenFlash('dopamine-flash');
            }
            
            // Splatter particles
            spawnParticles(proj.x, proj.y, '#ff0055', 18, 1.5); // Pink/Red damage splatter
            spawnParticles(CENTER_X, CENTER_Y, proj.color, 8, 1.0); // Logo fragments
            
            // Delete projectile
            projectiles.splice(i, 1);
            
            // Update HUD values
            updateHUD();
            
            // Dynamic music adjustments (increases tempo & filter distortion based on status)
            audioSystem.updateTempoAndTone(mentalHealth, scoreTime);
            
            // Game Over evaluation
            if (mentalHealth <= 0) {
                triggerGameOver();
            }
            continue;
        }
        
        // C. Clean up projectiles that fly wildly outside boundaries (anti-leak)
        if (distFromCenter > Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 1.5) {
            projectiles.splice(i, 1);
        }
    }
    
    // Decay visual FX
    if (screenShakeIntensity > 0.1) {
        screenShakeIntensity *= 0.88;
    } else {
        screenShakeIntensity = 0;
    }
    
    // Dynamic background recovery: Slowly decrease dopamine very slightly when playing perfectly
    if (projectiles.length > 0 && Math.random() < 0.02) {
        dopamineLevel = Math.max(0, dopamineLevel - 0.2);
        updateHUD();
    }
}

function triggerScreenFlash(type) {
    if (accessibilityMode) return;
    
    const overlay = document.getElementById('glitch-overlay');
    overlay.className = 'glitch-overlay ' + type;
    
    // Reset after animation ends
    setTimeout(() => {
        overlay.className = 'glitch-overlay';
    }, 350);
}

function updateHUD() {
    document.getElementById('mental-bar').style.width = mentalHealth + '%';
    document.getElementById('mental-value').textContent = Math.round(mentalHealth) + '%';
    
    document.getElementById('dopamine-bar').style.width = dopamineLevel + '%';
    document.getElementById('dopamine-value').textContent = Math.round(dopamineLevel) + '%';
    
    document.getElementById('timer-val').textContent = scoreTime.toFixed(2) + 's';
    document.getElementById('blocks-val').textContent = blocksCount;
    const currentStage = Math.floor(scoreTime / 15) + 1;
    document.getElementById('diff-val').textContent = currentStage + '단계 (x' + difficultyLevel.toFixed(1) + ')';
    
    // Switch HUD bar colors based on status
    const mBar = document.getElementById('mental-bar');
    if (mentalHealth < 30) {
        mBar.style.background = 'linear-gradient(90deg, #ff3131, #aa0000)';
        mBar.style.boxShadow = '0 0 12px #ff3131';
    } else if (mentalHealth < 60) {
        mBar.style.background = 'linear-gradient(90deg, #fffb00, #ff8800)';
        mBar.style.boxShadow = '0 0 12px #fffb00';
    } else {
        mBar.style.background = 'linear-gradient(90deg, var(--neon-cyan), #00aaff)';
        mBar.style.boxShadow = '0 0 10px rgba(0, 243, 255, 0.5)';
    }
}

// Rating algorithm based on stats
function calculateRating() {
    if (scoreTime > 90) return 'A+ [FOCUSED CONSCIOUSNESS]';
    if (scoreTime > 60) return 'A [STABLE ATTENTION]';
    if (scoreTime > 45) return 'B [MODERATE OVERFLOW]';
    if (scoreTime > 30) return 'C [DISTRACTED BRAIN]';
    if (scoreTime > 15) return 'D [COGNITIVE FATIGUE]';
    return 'F [BRAIN ROT / ADDICTED]';
}

function triggerGameOver() {
    gameState = 'GAMEOVER';
    audioSystem.stopMusic();
    audioSystem.playGameOverSFX();
    
    // Write statistics to GameOver Screen
    document.getElementById('final-time').textContent = scoreTime.toFixed(2);
    document.getElementById('final-blocks').textContent = blocksCount;
    document.getElementById('final-dopamine-percentage').textContent = Math.round(dopamineLevel);
    
    const ratingEl = document.getElementById('final-rating');
    const ratingStr = calculateRating();
    ratingEl.textContent = ratingStr;
    
    if (scoreTime < 15) {
        ratingEl.style.color = 'var(--neon-red)';
    } else if (scoreTime < 45) {
        ratingEl.style.color = 'var(--neon-yellow)';
    } else {
        ratingEl.style.color = 'var(--neon-cyan)';
    }
    
    // Reveal Overlays
    document.getElementById('gameover-overlay').classList.remove('hidden');
}

// Render Logic
function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Handle Canvas screen shake
    const cContainer = document.querySelector('.canvas-container');
    if (screenShakeIntensity > 0) {
        cContainer.classList.add('shake');
        // Random slight visual offsets applied directly to ctx
        ctx.save();
        const dx = (Math.random() - 0.5) * screenShakeIntensity;
        const dy = (Math.random() - 0.5) * screenShakeIntensity;
        ctx.translate(dx, dy);
    } else {
        cContainer.classList.remove('shake');
    }
    
    // Render game elements
    drawBackgroundGrid();
    
    // Render Chromatic Aberration in high dopamine states
    const errorOffset = (dopamineLevel / 100) * 5; // offset scale (0px -> 5px)
    
    if (errorOffset > 0.5 && !accessibilityMode) {
        // Red Layer offset
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowBlur = 0; // disable heavy glows for offsets to speed up
        ctx.translate(-errorOffset, 0);
        ctx.fillStyle = 'rgba(255, 0, 127, 0.4)';
        drawActiveScene(true, '#ff007f');
        ctx.restore();
        
        // Cyan Layer offset
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.shadowBlur = 0;
        ctx.translate(errorOffset, 0);
        ctx.fillStyle = 'rgba(0, 243, 255, 0.4)';
        drawActiveScene(true, '#00f3ff');
        ctx.restore();
    }
    
    // Draw normal default layer
    drawActiveScene(false);
    
    // Draw canvas overlay scanlines for aesthetic decay
    drawScanlines();
    
    // Render custom neon-red canvas flash overlay for YouTube/Instagram hits
    if (hitFlashTimer > 0) {
        ctx.save();
        const opacity = (hitFlashTimer / 20) * 0.55;
        ctx.fillStyle = `rgba(255, 0, 85, ${opacity})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.strokeStyle = `rgba(255, 0, 85, ${hitFlashTimer / 20})`;
        ctx.lineWidth = 16;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0055';
        ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
        
        hitFlashTimer--;
    }
    
    // Render Pause screen overlay
    if (isPaused) {
        ctx.fillStyle = 'rgba(5, 5, 14, 0.75)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = '#00f3ff';
        ctx.font = "bold 32px 'Share Tech Mono', sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("PAUSE SYSTEM ENGAGED", CENTER_X, CENTER_Y - 20);
        
        ctx.shadowColor = '#ff007f';
        ctx.fillStyle = '#ff007f';
        ctx.font = "16px 'Outfit', sans-serif";
        ctx.fillText("PRESS [SPACE] TO RE-SYNC CONSCIOUSNESS", CENTER_X, CENTER_Y + 20);
        ctx.restore();
    }
    
    if (screenShakeIntensity > 0) {
        ctx.restore();
    }
}

// Helper to draw active sprites (so we can double draw them for chromatic aberration)
function drawActiveScene(isMonochrome = false, monoColor = '') {
    // 1. Draw central Brain (Mental sphere)
    drawBrain(isMonochrome, monoColor);
    
    // 2. Draw Shield
    drawShield(isMonochrome, monoColor);
    
    // 3. Draw Projectiles
    projectiles.forEach(p => {
        if (isMonochrome) {
            ctx.fillStyle = monoColor;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            const def = PROJECTILE_TYPES[p.type];
            def.draw(ctx, p.x, p.y, p.radius * 1.2, p.angle);
        }
    });
    
    // 4. Draw Particles (not chromatic-aberration offset for clarity/performance)
    if (!isMonochrome) {
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
}

// Draw static technical radar grid in background
function drawBackgroundGrid() {
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
    ctx.lineWidth = 1.0;
    
    // Orthogonal grids
    const gridSize = 40;
    for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
    }
    
    // Radial radar markings
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.02)';
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, SHIELD_RADIUS, 0, Math.PI * 2);
    ctx.arc(CENTER_X, CENTER_Y, SHIELD_RADIUS * 2, 0, Math.PI * 2);
    ctx.arc(CENTER_X, CENTER_Y, SHIELD_RADIUS * 3, 0, Math.PI * 2);
    ctx.stroke();
}

// Draw the mental brain in the center
function drawBrain(isMonochrome, monoColor) {
    const pulseScale = 1.0 + Math.sin(performance.now() * (audioSystem.bpm / 60) * 0.005) * 0.05;
    const currentRadius = PLAYER_RADIUS * pulseScale;
    
    ctx.save();
    
    // Select color based on mental gauge
    let color = 'var(--neon-cyan)';
    let glow = 'rgba(0, 243, 255, 0.6)';
    
    if (mentalHealth < 30) {
        color = 'var(--neon-red)';
        glow = 'rgba(255, 49, 49, 0.6)';
    } else if (mentalHealth < 60) {
        color = 'var(--neon-yellow)';
        glow = 'rgba(255, 251, 0, 0.6)';
    }
    
    if (isMonochrome) {
        ctx.fillStyle = monoColor;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // High glow blur
        ctx.shadowBlur = accessibilityMode ? 0 : 25;
        ctx.shadowColor = color === 'var(--neon-cyan)' ? '#00f3ff' : (color === 'var(--neon-yellow)' ? '#fffb00' : '#ff3131');
        
        // Gradient core
        const grad = ctx.createRadialGradient(CENTER_X, CENTER_Y, 1, CENTER_X, CENTER_Y, currentRadius);
        
        if (color === 'var(--neon-cyan)') {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#00f3ff');
            grad.addColorStop(1, 'rgba(0, 100, 255, 0.2)');
        } else if (color === 'var(--neon-yellow)') {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#fffb00');
            grad.addColorStop(1, 'rgba(150, 150, 0, 0.2)');
        } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, '#ff3131');
            grad.addColorStop(1, 'rgba(150, 0, 0, 0.2)');
        }
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw cybermatic inner neural structures (dots and linking lines)
        ctx.shadowBlur = 0; // turn off glow for fine details
        ctx.strokeStyle = color === 'var(--neon-cyan)' ? 'rgba(0, 243, 255, 0.6)' : (color === 'var(--neon-yellow)' ? 'rgba(255, 251, 0, 0.6)' : 'rgba(255, 49, 49, 0.6)');
        ctx.lineWidth = 1.0;
        
        // Left brain lobe drawing path
        ctx.beginPath();
        ctx.arc(CENTER_X - currentRadius * 0.4, CENTER_Y, currentRadius * 0.6, -Math.PI/2, Math.PI/2);
        ctx.stroke();
        
        // Right brain lobe drawing path
        ctx.beginPath();
        ctx.arc(CENTER_X + currentRadius * 0.4, CENTER_Y, currentRadius * 0.6, Math.PI/2, -Math.PI/2);
        ctx.stroke();
        
        // Central linking line (stem)
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y - currentRadius * 0.85);
        ctx.lineTo(CENTER_X, CENTER_Y + currentRadius * 0.85);
        ctx.stroke();
    }
    
    ctx.restore();
}

// Draw rotating defense shield
function drawShield(isMonochrome, monoColor) {
    ctx.save();
    
    // Shield spans base arc centered around shieldAngle
    const startAngle = shieldAngle - BASE_SHIELD_ANGLE_SIZE / 2;
    const endAngle = shieldAngle + BASE_SHIELD_ANGLE_SIZE / 2;
    
    if (isMonochrome) {
        ctx.strokeStyle = monoColor;
        ctx.lineWidth = SHIELD_THICKNESS;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, SHIELD_RADIUS, startAngle, endAngle);
        ctx.stroke();
    } else {
        // High glow cyan shield
        ctx.shadowBlur = accessibilityMode ? 0 : 20;
        ctx.shadowColor = '#00f3ff';
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.lineWidth = SHIELD_THICKNESS;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, SHIELD_RADIUS, startAngle, endAngle);
        ctx.stroke();
        
        // Thin glowing edge lines inside shield for futuristic effect
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(CENTER_X, CENTER_Y, SHIELD_RADIUS, startAngle + 0.05, endAngle - 0.05);
        ctx.stroke();
        
        // Subtle connecting link from center brain to shield angle to help user align
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(CENTER_X, CENTER_Y);
        ctx.lineTo(CENTER_X + SHIELD_RADIUS * Math.cos(shieldAngle), CENTER_Y + SHIELD_RADIUS * Math.sin(shieldAngle));
        ctx.stroke();
    }
    
    ctx.restore();
}

// Overlay horizontal crt scanlines to enhance visual retro design
function drawScanlines() {
    if (accessibilityMode) return;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.007)';
    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
        ctx.fillRect(0, y, CANVAS_WIDTH, 1.5);
    }
    
    // Vignette shadow around canvas corners
    const grad = ctx.createRadialGradient(CENTER_X, CENTER_Y, CANVAS_WIDTH * 0.4, CENTER_X, CENTER_Y, CANVAS_WIDTH * 0.7);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(3, 3, 10, 0.6)');
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
