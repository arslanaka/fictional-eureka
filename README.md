# Real-Time Gaze Tracking App

This application uses your webcam to track where you are looking on the screen in real-time.

## 🛠️ How It Works

### 1. The Engine: WebGazer.js
The core of this app is [WebGazer.js](https://webgazer.cs.brown.edu/), a JavaScript library that runs entirely in your browser. No data is sent to any server; all processing happens locally on your computer.

### 2. Face & Eye Detection
*   **Computer Vision**: It uses pixel-intensity differences to find your face and then locates your eyes.
*   **Feature Extraction**: It extracts the appearance of your eyes (the position of the pupil relative to the eye corners).

### 3. The Math (Regression Model)
To understand *where* you are looking, the app uses a **Ridge Regression** model.
*   **Input**: The image of your eyes.
*   **Output**: Screen coordinates (X, Y).
*   **Mapping**: The model learns a mathematical function that maps the "input gaze vector" to specific pixels on your monitor.

### 4. Why Calibration is Necessary
Because every user has a different webcam position, screen size, and face shape, the model starts "blind".
*   **Calibration Phase**: When you click the red dots, you provide **Ground Truth** data. You are telling the computer: *"I am looking at pixel (100, 100) right now."*
*   **Training**: The model updates its internal weights to match your eyes' appearance to those known locations.
*   **Accuracy**: The more points you calibrate (and the steadier your head is), the more accurate the prediction becomes.

## 🚀 How to Run

1.  **Start a Local Server**:
    Browsers block webcam access for simple file openings (`file://...`) for security. You must run a local server.
    ```bash
    # Run this in the project folder
    python3 -m http.server 8000
    ```

2.  **Open in Browser**:
    Go to [http://localhost:8000](http://localhost:8000)

3.  **Grant Permissions**:
    Click "Allow" when the browser asks for camera access.

4.  **Calibrate**:
    *   Click each of the 9 red dots **5 times**.
    *   **Important**: Look *exactly* at the dot while clicking. Keep your head relatively still.
    *   The dots will turn green when done.

5.  **Track**:
    After calibration, a red ring will appear showing your estimated gaze location.
