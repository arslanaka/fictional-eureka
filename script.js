// script.js

// State
let calibrationClicks = 0;
const REQUIRED_CLICKS_PER_POINT = 5; // User must click each point 5 times for better accuracy
const TOTAL_CALIBRATION_POINTS = 9;
let isCalibrated = false;

// YouTube Player State
let player;
let isVideoPlaying = false;
let isPlayerReady = false;

// DOM Elements
const calibrationOverlay = document.getElementById('calibration-overlay');
const mainInterface = document.getElementById('main-interface');
const gazePlot = document.getElementById('gaze-plot');
const statusText = document.getElementById('status-text');
const gazeXEl = document.getElementById('gaze-x');
const gazeYEl = document.getElementById('gaze-y');
const lookingEl = document.getElementById('looking-at-screen');
const recalibrateBtn = document.getElementById('re-calibrate-btn');

// Calibration Points (Percentage based: [left, top])
const pointPositions = [
    [10, 10], [50, 10], [90, 10],
    [10, 50], [50, 50], [90, 50],
    [10, 90], [50, 90], [90, 90]
];

window.addEventListener('load', async function () {
    init();
    loadYouTubeAPI();

    recalibrateBtn.addEventListener('click', restartCalibration);
});

// YouTube API
function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: 'I-j_SMn8RRc',
        playerVars: {
            'playsinline': 1,
            'controls': 1, // Allow manual controls too
            'rel': 0
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    isPlayerReady = true;
    console.log("YouTube Player Ready");
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        isVideoPlaying = true;
    } else {
        isVideoPlaying = false;
    }
}

async function init() {
    // 1. Initialize WebGazer
    await webgazer.setRegression('ridge') // 'ridge' is often good for general webcam
        .setGazeListener(function (data, clock) {
            if (data == null) {
                // If no face/eye detected
                handleNoGaze();
                return;
            }
            // If gaze detected
            handleGaze(data);
        })
        .saveDataAcrossSessions(true)
        .begin();

    // 2. Hide specific webgazer UI elements if we want custom UI (optional customization)
    webgazer.showVideoPreview(true) // Keep it for feedback on positioning
        .showPredictionPoints(false) // We will draw our own
        .applyKalmanFilter(true); // Smooths the data

    // 3. Setup Calibration UI
    setupCalibration();
}

function setupCalibration() {
    calibrationOverlay.classList.remove('hidden');
    mainInterface.classList.add('hidden');
    calibrationOverlay.innerHTML = `
        <div class="calibration-instructions" style="position: absolute; top: 20%; text-align: center;">
            <h1>Calibration</h1>
            <p>Click each red dot 5 times until it turns green.</p>
            <p>Look exactly at the dot while clicking!</p>
        </div>
    `;

    pointPositions.forEach((pos, index) => {
        const dot = document.createElement('div');
        dot.className = 'calibration-point';
        dot.style.left = pos[0] + '%';
        dot.style.top = pos[1] + '%';
        dot.dataset.clicks = 0;
        dot.id = 'pt-' + index;

        dot.addEventListener('click', (e) => {
            handleCalibrationClick(e.target);
        });

        calibrationOverlay.appendChild(dot);
    });
}

function handleCalibrationClick(dot) {
    let clicks = parseInt(dot.dataset.clicks);
    clicks++;
    dot.dataset.clicks = clicks;

    // Visual feedback opacity
    const opacity = Math.min(1, clicks / REQUIRED_CLICKS_PER_POINT);
    dot.style.opacity = opacity < 0.2 ? 0.2 : opacity; // keep partially visible

    if (clicks >= REQUIRED_CLICKS_PER_POINT) {
        dot.style.backgroundColor = '#4CAF50'; // Green
        dot.classList.add('done');
    }

    checkCalibrationComplete();
}

function checkCalibrationComplete() {
    const allDots = document.querySelectorAll('.calibration-point');
    const doneDots = document.querySelectorAll('.calibration-point.done');

    if (doneDots.length === allDots.length) {
        finishCalibration();
    }
}

function finishCalibration() {
    isCalibrated = true;
    calibrationOverlay.classList.add('hidden');
    mainInterface.classList.remove('hidden');
    gazePlot.style.display = 'block';
    console.log("Calibration complete!");
    statusText.innerText = "Tracking Active";
    statusText.style.color = "green";
}

function restartCalibration() {
    isCalibrated = false;
    webgazer.clearData(); // Clear old calibration model
    setupCalibration();
}

function handleNoGaze() {
    statusText.innerText = "Face not found / Eyes closed";
    statusText.style.color = "red";
    lookingEl.innerText = "No";
    lookingEl.style.color = "red";
    gazePlot.style.display = 'none';
}

function handleGaze(data) {
    if (!isCalibrated) return;

    const x = data.x;
    const y = data.y;

    // Update debug text
    statusText.innerText = "Tracking";
    statusText.style.color = "green";
    gazeXEl.innerText = Math.round(x);
    gazeYEl.innerText = Math.round(y);

    // Check bounds
    // Using window.innerWidth / innerHeight ensures we check against the actual viewport
    const onScreen = (x >= 0 && x <= window.innerWidth && y >= 0 && y <= window.innerHeight);

    const statusPanel = document.querySelector('.status-panel');

    if (onScreen) {
        // ON SCREEN STATUS
        lookingEl.innerText = "ON SCREEN";
        lookingEl.className = "on-screen-text"; // Add prominent class

        // Panel styling
        statusPanel.classList.remove('status-bad');
        statusPanel.classList.add('status-good');

        // Show Pointer
        gazePlot.style.display = 'block';
        gazePlot.style.left = x + 'px';
        gazePlot.style.top = y + 'px';
    } else {
        // OFF SCREEN STATUS
        lookingEl.innerText = "OFF SCREEN";
        lookingEl.className = "off-screen-text"; // Add prominent class

        // Panel styling
        statusPanel.classList.remove('status-good');
        statusPanel.classList.add('status-bad');

        gazePlot.style.display = 'none';
    }

    // Video Control Logic
    if (isPlayerReady && isCalibrated) {
        if (onScreen) {
            // Eye is on screen -> Play
            if (!isVideoPlaying) {
                // only play if it's currently paused/stopped and we haven't just triggered it
                // We can simply call playVideo(), YouTube API handles the rest.
                // To avoid spamming the API, we check the local state we track via events
                player.playVideo();
            }
        } else {
            // Eye is OFF screen -> Pause
            if (isVideoPlaying) {
                player.pauseVideo();
            }
        }
    }
}
