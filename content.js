// content.js
console.log("YouTube Self-Regulation is active!");

let youtubeVideo = null;
let isOnShorts = false;
let timer = 0;
let isWebcamActive = false;

// --- startup ---
preloadWebcamPermissions();
startShortsTimer();
observeUrlChanges(); // robust SPA detection

function startShortsTimer() {
  setInterval(() => {
    checkShorts();
    if (isWebcamActive || !isOnShorts) return;
    timer++;
    // console.log("Shorts dwell:", timer);
    if (timer >= 5) activateWebcamShock();
  }, 1000);
}

// --- detection ---
function checkShorts() {
  const onShorts = location.href.includes("youtube.com/shorts");
  if (onShorts) {
    if (!isOnShorts) timer = 0; // reset when entering Shorts
    isOnShorts = true;
  } else {
    isOnShorts = false;
    timer = 0;
  }
}

// Observe navigation changes on SPA
function observeUrlChanges() {
  let last = location.href;
  const notify = () => {
    if (location.href !== last) {
      last = location.href;
      timer = 0; // reset dwell when URL changes
      checkShorts();
    }
  };
  // Patch history methods
  ["pushState", "replaceState"].forEach((m) => {
    const orig = history[m];
    history[m] = function (...args) {
      const ret = orig.apply(this, args);
      window.dispatchEvent(new Event("locationchange"));
      return ret;
    };
  });
  window.addEventListener("popstate", () =>
    window.dispatchEvent(new Event("locationchange"))
  );
  window.addEventListener("locationchange", notify);

  // Fallback: DOM changes often accompany nav on YT
  const mo = new MutationObserver(() => notify());
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

// --- permissions ---
function preloadWebcamPermissions() {
  navigator.mediaDevices
    .getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 320 },
        height: { ideal: 240 },
      },
    })
    .then((stream) => stream.getTracks().forEach((t) => t.stop()))
    .catch((err) =>
      console.warn("Webcam preload failed (expected if denied once):", err)
    );
}

// --- UI helpers ---
function createOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "shock-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    background: "rgba(0,0,0,0.6)",
    zIndex: "2147483647", // max it out
    display: "none",
  });
  return overlay;
}

function createCenteredBox(id, tag = "div") {
  const box = document.createElement(tag);
  box.id = id;
  Object.assign(box.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "rgba(0,0,0,0.9)",
    color: "#fff",
    padding: "16px 20px",
    borderRadius: "10px",
    zIndex: "2147483647",
    display: "none",
    textAlign: "center",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  });
  return box;
}

function createButton(id, label) {
  const btn = document.createElement("button");
  btn.id = id;
  btn.textContent = label;
  Object.assign(btn.style, {
    margin: "8px",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "0",
    cursor: "pointer",
    fontWeight: "600",
  });
  return btn;
}

function getActiveVideo() {
  // Prefer the largest on-screen <video>
  let best = null;
  let bestArea = 0;
  document.querySelectorAll("video").forEach((v) => {
    const r = v.getBoundingClientRect();
    const visible =
      r.width > 0 &&
      r.height > 0 &&
      r.bottom > 0 &&
      r.right > 0 &&
      r.top < window.innerHeight &&
      r.left < window.innerWidth;
    if (!visible) return;
    const area =
      Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) *
      Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
    if (area > bestArea) {
      best = v;
      bestArea = area;
    }
  });
  return best;
}

// --- main flow ---
function activateWebcamShock() {
  timer = 0;
  if (isWebcamActive) return;
  isWebcamActive = true;

  const overlay = createOverlay();
  const video = createCenteredBox("shock-video", "video");
  video.setAttribute("playsinline", "true");
  video.setAttribute("autoplay", "true");
  video.muted = true; // avoid autoplay policy snags if audio track appears
  video.style.width = "320px";
  video.style.height = "240px";
  video.style.objectFit = "cover";

  const panel = createCenteredBox("shock-panel", "div");
  panel.innerHTML = `<div style="font-size:16px;margin-bottom:10px">Caught in 4K! Reflect on your habits.</div>`;

  const closeBtn = createButton("shock-close-button", "Close Popup");
  const closeTabBtn = createButton("shock-close-tab-button", "Close Tab");
  closeBtn.style.background = "#e5e7eb";
  closeBtn.style.color = "#111";
  closeTabBtn.style.background = "#ef4444";
  closeTabBtn.style.color = "#fff";

  panel.appendChild(closeBtn);
  panel.appendChild(closeTabBtn);

  document.body.appendChild(overlay);
  document.body.appendChild(video);
  document.body.appendChild(panel);

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

      video.addEventListener("loadedmetadata", () => {
        youtubeVideo = getActiveVideo();
        try {
          youtubeVideo?.pause();
        } catch {}
        overlay.style.display = "block";
        video.style.display = "block";
        panel.style.display = "block";

        // Stagger buttons if you want a delay:
        // setTimeout(() => { closeBtn.style.opacity = "1"; closeTabBtn.style.opacity = "1"; }, 5000);
      });
    })
    .catch((error) => {
      console.error("Webcam access failed:", error);
      teardown();
    });

  closeBtn.addEventListener("click", teardown);
  closeTabBtn.addEventListener("click", () => {
    chrome.runtime?.sendMessage?.({ action: "closeTab" });
    teardown();
  });

  function teardown() {
    stopStream(video);
    [overlay, video, panel].forEach((el) => el && el.remove());
    isWebcamActive = false;
  }
}

function stopStream(videoEl) {
  const stream = videoEl?.srcObject;
  if (stream && typeof stream.getTracks === "function") {
    stream.getTracks().forEach((t) => t.stop());
  }
}
