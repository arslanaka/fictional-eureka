# Smart Eye-Controlled Video Player

This project is a smart video player that "watches you watching it." It uses your webcam to track your eye gaze and head movements in real-time to ensure you are engaged with the content. If you look away, turn your head, or leave your desk, the video automatically pauses.

## Features

### 1. Smart Play/Pause
The video plays **only** when you are looking directly at the screen. 
- **Off-Screen Pause**: If your eyes wander off the screen (e.g., looking at a phone or out the window), the video pauses immediately.
- **On-Screen Play**: As soon as your gaze returns to the screen content, the video resumes efficiently.

### 2. Face Movement Tracking
The system doesn't just track your eyes; it tracks your entire head pose.
- **Rotation Limits**: If you turn your head too far to the Left, Right, Up, or Down (approx. 30 degrees), the system detects this as a distraction and pauses the video.
- **Feedback**: You will see a large notification on the screen telling you exactly what is wrong (e.g., "FACE TURNED RIGHT").

### 3. Adaptive Distance Control
The system is intelligent enough to know how far away you are sitting.
- **Automatic Sensitivity**: If you lean back, the system becomes stricter (because a small head turn means you are looking away). If you lean in, it becomes more lenient.
- **Safety Limits**: It enforces a strict "sweet spot" for viewing distance.
    - **Too Close**: If you lean in too close (closer than your calibrated position), it pauses and warns you to "MOVE BACK".
    - **Too Far**: If you lean back too far, it pauses and warns you to "MOVE CLOSER".

### 4. Sequential Calibration
To ensure high accuracy, the system guides you through a simple "connect-the-dots" setup process.
- You click 9 red dots one by one.
- The **First Dot (Center)** is special: it memorizes your "perfect" sitting position and head angle to use as a reference for the rest of the session.

---

## How It Works

The system typically follows this workflow:
1.  **Calibration**: It builds a custom model of your face and eyes by asking you to look at specific points. It also measures the distance between your eyes to understand your physical depth.
2.  **Tracking Loop**: A high-speed loop constantly analyzes the video feed from your webcam.
    - It calculates where on the screen you are looking (X, Y coordinates).
    - It calculates your head's 3D orientation (Yaw, Pitch, Roll).
    - It calculates your physical distance relative to when you calibrated.
3.  **Decision Making**: It compares your current state to the "Safe Zone." If any condition (Gaze, Head Angle, Distance) is violated, it triggers the Pause event and displays an overlay explaining why.

---

## How to Run This Project

You can run this project locally on your machine with any simple web server.

### Prerequisites
- A computer with a webcam.
- A modern web browser (Chrome, Edge, Firefox).
- Python (pre-installed on most Macs/Linux) or any static file server.

### Steps
1.  Open your terminal or command prompt.
2.  Navigate to the project folder.
3.  Run the following command to start a local server:
    ```bash
    python3 -m http.server 8000
    ```
4.  Open your browser and go to:
    ```
    http://localhost:8000
    ```
5.  Allow Camera permissions when prompted.

---

## How to Integrate With Your Web App

You can easily drop this functionality into any existing website or web application (React, Vue, plain HTML).

### 1. Copy Files
Copy the following two files into your project's asset or script directory:
- `script.js` (Contains all the logic)
- `style.css` (Contains the overlay and feedback styles)

### 2. Add HTML Structure
Paste the following HTML elements into your main page body. These serve as the containers for the calibration and warnings.

```html
<!-- Calibration Overlay -->
<div id="calibration-overlay">
    <div class="calibration-instructions">
        <h1>Calibration</h1>
        <p>Click the RED DOT 5 times.</p>
    </div>
</div>

<!-- Warning & Safe Zone Indicators -->
<div id="safe-zone-indicator" class="hidden"></div>
<div id="warning-overlay" class="hidden"></div>

<!-- Video Player Container (Example) -->
<div id="main-interface" class="hidden">
    <div id="video-container">
        <div id="player"></div> <!-- YouTube Iframe will load here -->
    </div>
    <!-- Debug/Status Panel -->
    <div class="status-panel">
        <p><b>Status:</b> <span id="status-text">Initializing...</span></p>
        <div id="debug-stats"></div>
        <button id="re-calibrate-btn">Recalibrate</button>
    </div>
</div>
```

### 3. Link Scripts & Styles
Add the references to your HTML `<head>` or main entry file.

```html
<!-- Styles -->
<link rel="stylesheet" href="path/to/style.css">

<!-- External Dependency (Required) -->
<script src="https://webgazer.cs.brown.edu/webgazer.js" defer></script>

<!-- Main Logic -->
<script src="path/to/script.js" defer></script>
```

### 4. Initialize
The `script.js` automatically initializes on `window.load`. If you are using a Single Page Application (React/Next.js), you may want to wrap the `init()` call in a `useEffect` hook to ensure it runs only after the component mounts.
