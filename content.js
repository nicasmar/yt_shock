console.log("YouTube Shock Therapy extension is active!");

// State variables
let isOnShorts = false;
let timer = 0;
let isWebcamActive = false;

// Preload camera permissions without caching streams
function preloadWebcamPermissions() {
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 320 },
        height: { ideal: 240 },
      },
    })
    .then((stream) => {
      // Close stream immediately, only keep permissions
      stream.getTracks().forEach((track) => track.stop());
      console.log("Webcam permissions preloaded!");
    })
    .catch((error) => console.error("Webcam preload failed:", error));
}

// Periodically check if user is on Shorts
setInterval(() => {
  checkShorts();
  if (isWebcamActive || !isOnShorts) return; // Skip checks if active
  timer++;
  console.log(timer);
  if (timer >= 5) {
    activateWebcamShock();
  }
}, 1000);

// Check if user is watching Shorts
function checkShorts() {
  if (window.location.href.includes("youtube.com/shorts") && !isWebcamActive) {
    isOnShorts = true;
  } else {
    isOnShorts = false;
  }
}

function activateWebcamShock() {
  timer = 0; // Reset timer
  if (isWebcamActive) return; // Prevent multiple activations

  isWebcamActive = true;

  // Select the Shorts video

  // Create DOM elements
  const video = createElement("video", "shock-video");
  video.setAttribute("playsinline", true); // Faster inline rendering
  video.style.display = "none"; // Hide initially

  const overlay = createElement("div", "shock-overlay");
  overlay.style.display = "none";

  const message = createElement(
    "div",
    "shock-message",
    "Caught in 4K! Reflect on your habits."
  );
  message.style.display = "none";

  const closeButton = createElement(
    "button",
    "shock-close-button",
    "Close Popup"
  );
  closeButton.style.display = "none";

  const closeTabButton = createElement(
    "button",
    "shock-close-tab-button",
    "Close Tab"
  );
  closeTabButton.style.display = "none"; // Hidden initially

  // Append elements
  appendToBody([overlay, video, message, closeButton, closeTabButton]);

  // Fetch a fresh stream
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 320 },
        height: { ideal: 240 },
      },
    })
    .then((stream) => {
      video.srcObject = stream;

      // Wait until video metadata is loaded (camera ready)
      video.addEventListener("loadedmetadata", () => {
        // console.log(!!youtubeVideo);
        youtubeVideo = getActiveVideo();
        if (youtubeVideo) youtubeVideo.pause();
        console.log(youtubeVideo.paused);

        video.play(); // Start webcam

        // Reveal UI elements once webcam is ready
        overlay.style.display = "block";
        video.style.display = "block";
        message.style.display = "block";

        // Delay buttons by 5 seconds
        setTimeout(() => {
          closeButton.style.display = "block";
          closeTabButton.style.display = "block"; // Reveal Close Tab button
        }, 5000);
      });
    })
    .catch((error) => {
      console.error("Webcam access failed:", error);
      isWebcamActive = false; // Reset state
    });

  // Close Popup button functionality
  closeButton.addEventListener("click", () =>
    closeWebcam(video, overlay, message, closeButton, closeTabButton)
  );

  // Close Tab button functionality
  closeTabButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "closeTab" }); // Sends a message to background.js
  });
}

function getActiveVideo() {
  const videos = document.querySelectorAll("video"); // Get all video elements

  for (const video of videos) {
    const rect = video.getBoundingClientRect(); // Get position on screen

    // Check for visible video with a `src` tag
    if (
      video.src && // Must have a `src` attribute
      rect.top >= 0 && // Visible on screen
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    ) {
      return video; // Return the first matching video
    }
  }
  return null; // No visible video found
}

// Close webcam and resume video
function closeWebcam(video, overlay, message, closeButton, closeTabButton) {
  const stream = video.srcObject;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop()); // Turn off webcam
  }

  // Remove elements
  [video, overlay, message, closeButton, closeTabButton].forEach((el) =>
    el.remove()
  );
  isWebcamActive = false;

  // Resume YouTube Shorts video
  // if (youtubeVideo) {
  //   youtubeVideo.play(); // Resume playback
  // }
}

// Utility function to create elements
function createElement(tag, id, text = "") {
  const el = document.createElement(tag);
  el.id = id;
  el.innerText = text;
  return el;
}

// Utility function to append elements to body
function appendToBody(elements) {
  elements.forEach((el) => document.body.appendChild(el));
}
