console.log("YouTube Shock Therapy extension is active!");

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

  const video = createElement("video", "shock-video");
  video.setAttribute("playsinline", true);
  video.style.display = "none";

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
  closeTabButton.style.display = "none";

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

        overlay.style.display = "block";
        video.style.display = "block";
        message.style.display = "block";

        // Delay buttons by 5 seconds
        setTimeout(() => {
          closeButton.style.display = "block";
          closeTabButton.style.display = "block";
        }, 5000);
      });
    })
    .catch((error) => {
      console.error("Webcam access failed:", error);
      isWebcamActive = false;
    });

  closeButton.addEventListener("click", () =>
    closeWebcam(video, overlay, message, closeButton, closeTabButton)
  );

  closeTabButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "closeTab" });
  });
}

function getActiveVideo() {
  const videos = document.querySelectorAll("video");

  for (const video of videos) {
    const rect = video.getBoundingClientRect();

    if (
      video.src &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    ) {
      return video;
    }
  }
  return null;
}

// Close webcam and resume video
function closeWebcam(video, overlay, message, closeButton, closeTabButton) {
  const stream = video.srcObject;
  if (stream) {
    // Turn off webcam
    stream.getTracks().forEach((track) => track.stop());
  }

  // Remove elements
  [video, overlay, message, closeButton, closeTabButton].forEach((el) =>
    el.remove()
  );
  isWebcamActive = false;
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
