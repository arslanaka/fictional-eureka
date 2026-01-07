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

const calibrationOrder = [4, 0, 1, 2, 3, 5, 6, 7, 8]; // Center first, then TL->BR
let currentCalibrationIndex = 0;

function setupCalibration() {
    calibrationOverlay.classList.remove('hidden');
    mainInterface.classList.add('hidden');

    // Reset state
    currentCalibrationIndex = 0;

    calibrationOverlay.innerHTML = `
        <div class="calibration-instructions" style="position: absolute; top: 20%; text-align: center;">
            <h1>Calibration</h1>
            <p>Click the RED DOT 5 times.</p>
            <p>Keep your head still and look at the dot!</p>
        </div>
    `;

    // Create all dots but only show the first one
    pointPositions.forEach((pos, index) => {
        const dot = document.createElement('div');
        dot.className = 'calibration-point';
        dot.style.left = pos[0] + '%';
        dot.style.top = pos[1] + '%';
        dot.style.display = 'none'; // Force hidden by default
        dot.dataset.clicks = 0;
        dot.id = 'pt-' + index;

        dot.addEventListener('click', (e) => {
            handleCalibrationClick(e.target);
        });

        calibrationOverlay.appendChild(dot);
    });

    showNextCalibrationPoint();
}

function showNextCalibrationPoint() {
    if (currentCalibrationIndex >= calibrationOrder.length) {
        checkCalibrationComplete();
        return;
    }

    const pointIndex = calibrationOrder[currentCalibrationIndex];
    const dot = document.getElementById('pt-' + pointIndex);
    if (dot) {
        dot.style.display = 'block'; // Show current
    }
}

function handleCalibrationClick(dot) {
    let clicks = parseInt(dot.dataset.clicks);
    clicks++;
    dot.dataset.clicks = clicks;

    // Visual feedback opacity
    const opacity = Math.min(1, clicks / REQUIRED_CLICKS_PER_POINT);
    dot.style.opacity = opacity < 0.2 ? 0.2 : opacity;

    if (clicks >= REQUIRED_CLICKS_PER_POINT) {
        dot.style.backgroundColor = '#4CAF50'; // Green
        dot.classList.add('done');

        // Hide this dot and move to next
        dot.style.display = 'none';

        // FIX: Capture Reference Pose when clicking the CENTER point (Index 4)
        if (dot.id === 'pt-4') {
            const pose = FacePoseEstimator.estimate();
            if (pose) {
                referenceHeadPose = pose;
                referenceEyeDist = pose.eyeDist; // Capture Reference Distance (IPD in pixels)
                console.log("Reference Pose Updated (Center Click):", referenceHeadPose);
            }
        }

        currentCalibrationIndex++;
        showNextCalibrationPoint();
    }
}

function checkCalibrationComplete() {
    // With sequential logic, this is called at the end
    finishCalibration();
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

        // 1. Screen Edge Limitation (Asymmetric margins for better vertical tracking)
        const w = window.innerWidth;
        const h = window.innerHeight;
        const marginX = w * 0.15;  // 15% margin for left/right (works well)
        const marginY = h * 0.28;  // 28% margin for top/bottom (stricter for reliability)

        // "On Screen" now means "On Safe Screen Area"
        const inSafeZone = (x >= marginX && x <= (w - marginX) && y >= marginY && y <= (h - marginY));

        // 2. Face Movement Tracking (approx 30 degrees)
        const currentPose = FacePoseEstimator.estimate();
        let isFaceAligned = true;
        let faceErrorMsg = "";

        if (currentPose && referenceHeadPose) {
            // Check Yaw (Left/Right)
            const yawDiff = Math.abs(currentPose.yaw - referenceHeadPose.yaw);
            // Check Pitch (Up/Down)
            const pitchDiff = Math.abs(currentPose.pitch - referenceHeadPose.pitch);
            // Check Roll (Tilt)
            const rollDiff = Math.abs(currentPose.roll - referenceHeadPose.roll);

            // --- Adaptive Distance Compensation ---
            let distanceRatio = 1.0;
            if (referenceEyeDist && currentPose.eyeDist) {
                // If current eye dist is smaller, user is farther -> Ratio < 1.0
                // If current eye dist is larger, user is closer -> Ratio > 1.0
                distanceRatio = currentPose.eyeDist / referenceEyeDist;

                // --- Strict Distance Limits (User Request) ---
                // Allow +/- 20% variation. Pause if outside.
                if (distanceRatio < 0.8) {
                    isFaceAligned = false;
                    faceErrorMsg = "Too Far! Move Closer";
                } else if (distanceRatio > 1.2) {
                    isFaceAligned = false;
                    faceErrorMsg = "Too Close! Move Back";
                }

                // Clamp ratio to avoid extreme values (e.g. 0.5x to 2.0x) for threshold scaling
                // even if we pause, we still calc expected thresholds for debug
                distanceRatio = Math.max(0.5, Math.min(2.0, distanceRatio));
            }

            // Base Thresholds (at calibrated distance)
            const BASE_YAW_THRESHOLD = 0.15;   // Left/Right head turn
            const BASE_PITCH_THRESHOLD = 0.12; // Up/Down head movement (reduced from 0.20 for stricter detection)
            const BASE_ROLL_THRESHOLD = 0.5;   // Head tilt

            // Effective Thresholds (Scaled by Distance)
            // If user is Farther (Ratio 0.5), we need STRICTOR loop (0.15 * 0.5 = 0.075)
            // Wait, logic check:
            // Farther = Smaller Angle subtended by screen = Smaller Rotation needed to look away.
            // YES. We should SCALE DOWN the threshold.
            const EFFECTIVE_YAW = BASE_YAW_THRESHOLD * distanceRatio;
            const EFFECTIVE_PITCH = BASE_PITCH_THRESHOLD * distanceRatio;

            // Debug Stats
            let debugEl = document.getElementById('debug-stats');
            if (!debugEl) {
                debugEl = document.createElement('div');
                debugEl.id = 'debug-stats';
                debugEl.style.position = 'fixed';
                debugEl.style.bottom = '10px';
                debugEl.style.left = '10px';
                debugEl.style.background = 'rgba(0,0,0,0.7)';
                debugEl.style.color = '#fff';
                debugEl.style.padding = '10px';
                debugEl.style.zIndex = '9999';
                debugEl.style.fontSize = '12px';
                document.body.appendChild(debugEl);
            }
            debugEl.innerHTML = `
                DIST RATIO: ${distanceRatio.toFixed(2)}x<br>
                YAW: ${yawDiff.toFixed(3)} / ${EFFECTIVE_YAW.toFixed(3)}<br>
                PITCH: ${pitchDiff.toFixed(3)} / ${EFFECTIVE_PITCH.toFixed(3)}<br>
                ROLL: ${rollDiff.toFixed(3)}
            `;

            if (yawDiff > EFFECTIVE_YAW) {
                isFaceAligned = false;
                faceErrorMsg = "Face turned too far";
            }
            if (pitchDiff > EFFECTIVE_PITCH) {
                isFaceAligned = false;
                faceErrorMsg = "Face looked up/down too far";
            }
            if (rollDiff > BASE_ROLL_THRESHOLD) {
                isFaceAligned = false;
                faceErrorMsg = "Head tilted too far";
            }
        }

        // Combined Decision
        const shouldPlay = inSafeZone && isFaceAligned;
        const safeZoneInd = document.getElementById('safe-zone-indicator');
        const warningOverlay = document.getElementById('warning-overlay');

        // Show indicator when tracking
        if (safeZoneInd) {
            safeZoneInd.classList.remove('hidden');
            if (!inSafeZone) safeZoneInd.classList.add('violation');
            else safeZoneInd.classList.remove('violation');
        }

        if (shouldPlay) {
            // PLAY
            if (warningOverlay) warningOverlay.classList.add('hidden');

            if (!isVideoPlaying) player.playVideo();

            statusText.innerText = "Active - Watching";
            statusText.style.color = "green";
            statusPanel.classList.remove('status-bad');
            statusPanel.classList.add('status-good');

            lookingEl.innerText = "SAFE ZONE";
            lookingEl.className = "on-screen-text";
        } else {
            // PAUSE
            if (isVideoPlaying) player.pauseVideo();

            statusPanel.classList.remove('status-good');
            statusPanel.classList.add('status-bad');
            statusText.style.color = "red";

            let warningText = "PAUSED";

            if (!inSafeZone) {
                warningText = "EYE GAZE OFF SCREEN";
                statusText.innerText = "Paused: Gaze outside safe zone";
                lookingEl.innerText = "OFF LIMITS";
                lookingEl.className = "off-screen-text";
            } else if (!isFaceAligned) {
                warningText = (faceErrorMsg || "BAD POSE").toUpperCase();
                statusText.innerText = "Paused: " + faceErrorMsg;
                lookingEl.innerText = "BAD POSE";
                lookingEl.className = "off-screen-text";
            }

            if (warningOverlay) {
                warningOverlay.innerText = warningText;
                warningOverlay.classList.remove('hidden');
            }
        }
    }
}

// --- Face Pose Helper ---
let referenceHeadPose = null;
let referenceEyeDist = null;

const FacePoseEstimator = {
    estimate: function () {
        const tracker = webgazer.getTracker();
        const positions = tracker ? tracker.getPositions() : null;
        if (!positions || positions.length === 0) return null;

        // Check if using standard CLM (71 points) or FaceMesh (468 points)
        // FaceMesh usually returns huge array
        const isFaceMesh = positions.length > 100;

        if (isFaceMesh) {
            // FaceMesh Keypoints (approximate)
            // 1: Nose Tip
            // 33: Left Eye Outer
            // 263: Right Eye Outer
            // 152: Chin
            // 10: Top Head

            // Note: Indices in array might be different if it's the raw flat array vs object
            // WebGazer's getPositions usually returns Array of [x, y] or [x, y, z]

            // Let's assume standard MediaPipe mesh indices
            const nose = positions[1];
            const leftEye = positions[33];
            const rightEye = positions[263];
            const chin = positions[152];
            const top = positions[10];

            if (!nose || !leftEye || !rightEye) return null;

            // Simple geometry for relative rotation 

            // YAW: Relative horizontal position of nose between eyes
            // 0.5 = center. < 0.5 left, > 0.5 right
            const eyeDist = Math.hypot(rightEye[0] - leftEye[0], rightEye[1] - leftEye[1]);
            const noseToLeft = Math.hypot(nose[0] - leftEye[0], nose[1] - leftEye[1]);

            // Project LN onto LR
            const vecLR = { x: rightEye[0] - leftEye[0], y: rightEye[1] - leftEye[1] };
            const vecLN = { x: nose[0] - leftEye[0], y: nose[1] - leftEye[1] };
            const proj = (vecLN.x * vecLR.x + vecLN.y * vecLR.y) / (eyeDist * eyeDist);
            const yaw = proj - 0.5; // Center should be near 0

            // PITCH: Refined.
            // Old method used chin, which moves with mouth.
            // New method: Vertical distance of Nose from Eye Line, normalized by Face Width (Eye Distance).
            // When looking UP, nose gets closer to eyes (smaller dy).
            // When looking DOWN, nose gets further (larger dy).
            const eyeMidY = (leftEye[1] + rightEye[1]) / 2;
            const noseDy = nose[1] - eyeMidY; // Positive (nose is below eyes usually)

            // Normalized Pitch ratio
            const pitch = noseDy / eyeDist;

            // ROLL: Angle of eye line
            const roll = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]);

            return { yaw, pitch, roll, eyeDist };

        } else {
            // CLM Trackr (71 points)
            // 62: Nose Tip
            // 27: Left Eye Outer
            // 32: Right Eye Outer
            // 7: Chin

            // Fallback if older tracker (unlikely given previous inspection, but safety first)
            return null;
        }
    }
};
