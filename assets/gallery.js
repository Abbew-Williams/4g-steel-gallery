const galleryFeed = document.querySelector("#gallery-feed");
const galleryState = document.querySelector("#gallery-state");
let playbackObserver;
let manuallyPausedVideo = null;

function getFullyVisibleVideo() {
  const feedBounds = galleryFeed.getBoundingClientRect();
  const visibleFrame = [...galleryFeed.querySelectorAll(".gallery-item")].find((frame) => {
    const bounds = frame.getBoundingClientRect();
    return Math.abs(bounds.top - feedBounds.top) < 2 &&
      Math.abs(bounds.bottom - feedBounds.bottom) < 2;
  });
  return visibleFrame?.querySelector("video") || null;
}

function toggleVideoPlayback(video) {
  if (video.paused) {
    manuallyPausedVideo = null;
    video.muted = false;
    video.play().catch(() => {});
  } else {
    manuallyPausedVideo = video;
    video.pause();
  }
}

function navigateMedia(direction) {
  const items = galleryFeed.querySelectorAll(".gallery-item");
  if (!items.length) return;

  const currentIndex = Math.max(0, Math.min(
    items.length - 1,
    Math.round(galleryFeed.scrollTop / galleryFeed.clientHeight)
  ));
  const nextIndex = Math.max(0, Math.min(items.length - 1, currentIndex + direction));
  if (nextIndex === currentIndex) return;

  items[nextIndex].scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "start"
  });
}

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

  const interactiveControls = "input, textarea, select, button, audio, [contenteditable='true']";
  const target = event.target;
  const focusedElement = document.activeElement;
  if (
    (target instanceof Element && target.closest(interactiveControls)) ||
    (focusedElement instanceof Element && focusedElement.closest(interactiveControls))
  ) {
    return;
  }

  if (event.code === "Space") {
    const video = getFullyVisibleVideo();
    if (video) {
      event.preventDefault();
      toggleVideoPlayback(video);
    }
    return;
  }

  if (
    (target instanceof Element && target.closest("video")) ||
    (focusedElement instanceof Element && focusedElement.closest("video"))
  ) {
    return;
  }

  const directionByKey = new Map([
    ["ArrowDown", 1],
    ["PageDown", 1],
    ["ArrowUp", -1],
    ["PageUp", -1]
  ]);
  const direction = directionByKey.get(event.key);
  if (!direction) return;

  event.preventDefault();
  navigateMedia(direction);
});

function showState(message) {
  galleryFeed.replaceChildren();
  galleryFeed.setAttribute("aria-busy", "false");
  galleryState.textContent = message;
  galleryState.hidden = false;
  galleryFeed.append(galleryState);
}

function observePlayback() {
  if (playbackObserver) playbackObserver.disconnect();

  const videoFrames = [...galleryFeed.querySelectorAll(".gallery-item")]
    .filter((frame) => frame.querySelector("video"));
  if (!videoFrames.length) return;

  let activeVideoFrame = null;
  const pendingVideoStarts = new WeakSet();
  const syncVisibleVideo = () => {
    const fullyVisibleVideo = getFullyVisibleVideo();
    const fullyVisibleFrame = fullyVisibleVideo?.closest(".gallery-item") || null;

    activeVideoFrame = fullyVisibleFrame;
    for (const frame of videoFrames) {
      const video = frame.querySelector("video");
      if (frame === fullyVisibleFrame) {
        if (video === manuallyPausedVideo) continue;
        video.muted = false;
        if (video.seeking) {
          if (!pendingVideoStarts.has(video)) {
            pendingVideoStarts.add(video);
            video.addEventListener("seeked", () => {
              pendingVideoStarts.delete(video);
              if (activeVideoFrame === frame && !video.seeking && video !== manuallyPausedVideo) {
                video.muted = false;
                video.play().catch(() => {});
              }
            }, { once: true });
          }
        } else {
          video.play().catch(() => {});
        }
      } else {
        if (video === manuallyPausedVideo) manuallyPausedVideo = null;
        video.pause();
        video.muted = true;
        if (video.readyState > 0 && video.currentTime > 0 && !video.seeking) {
          video.currentTime = 0;
        }
      }
    }
  };

  playbackObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) syncVisibleVideo();
  }, {
    root: galleryFeed,
    threshold: [0, 0.5, 1]
  });

  videoFrames.forEach((frame) => playbackObserver.observe(frame));
  galleryFeed.addEventListener("scroll", syncVisibleVideo, { passive: true });
  syncVisibleVideo();
}

function attemptVisibleVideoPlayback() {
  const video = getFullyVisibleVideo();
  if (!video || video === manuallyPausedVideo) return;

  video.muted = false;
  video.play().catch(() => {});
}

galleryFeed.addEventListener("touchend", attemptVisibleVideoPlayback, { passive: true });
galleryFeed.addEventListener("pointerup", attemptVisibleVideoPlayback, { passive: true });
galleryFeed.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;

  const clickedVideo = event.target.closest("video");
  if (clickedVideo && clickedVideo === getFullyVisibleVideo()) {
    event.preventDefault();
    toggleVideoPlayback(clickedVideo);
  }
});

function renderMedia(items) {
  galleryFeed.replaceChildren();

  if (items.length === 0) {
    showState("The gallery is empty. Check back later for photos and videos.");
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const [index, item] of items.entries()) {
    const frame = document.createElement("section");
    frame.className = "gallery-item";
    frame.setAttribute("aria-label", item.kind === "video" ? "Video" : "Photo");

    const mediaColumn = document.createElement("div");
    mediaColumn.className = "gallery-media-column";
    const mediaElement = item.kind === "image"
      ? document.createElement("img")
      : document.createElement("video");
    mediaElement.className = "gallery-media";
    mediaElement.src = new URL(item.src, document.baseURI).href;
    mediaElement.alt = item.kind === "image" ? item.name : "";
    if (item.kind === "image") {
      mediaElement.loading = "lazy";
      mediaElement.decoding = "async";
    } else {
      mediaElement.controls = false;
      mediaElement.autoplay = true;
      mediaElement.muted = false;
      mediaElement.loop = true;
      mediaElement.playsInline = true;
      mediaElement.preload = "metadata";
      mediaElement.setAttribute("aria-label", item.name || `Video ${index + 1}`);
    }
    mediaColumn.append(mediaElement);
    frame.append(mediaColumn);
    fragment.append(frame);
  }

  galleryFeed.append(fragment);
  galleryFeed.setAttribute("aria-busy", "false");
  observePlayback();
}

function isValidMediaItem(item) {
  return item &&
    (item.kind === "image" || item.kind === "video") &&
    typeof item.name === "string" &&
    typeof item.src === "string" &&
    /^media\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(item.src);
}

async function loadGallery() {
  try {
    const response = await fetch("media/media.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`Media list request failed (${response.status}).`);

    const items = await response.json();
    if (!Array.isArray(items) || !items.every(isValidMediaItem)) {
      throw new Error("The media list is not in the expected format.");
    }
    renderMedia(items);
  } catch (error) {
    showState(`Could not load the gallery. ${error.message || "Please refresh the page."}`);
  }
}

loadGallery();
