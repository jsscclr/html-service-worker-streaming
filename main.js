let currentRequestId = null;

const iframe = document.getElementById("iframe");
const buttonStartStream = document.getElementById("start-stream");
const buttonSendChunk = document.getElementById("send-chunk");
const buttonCloseStream = document.getElementById("close-stream");
const outputRequestURL = document.getElementById("request-url");
const anchor = document.getElementById("anchor");

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("service-worker.js");
    const registration = await navigator.serviceWorker.ready;

    console.info("Service Worker registration complete:");
    console.info(registration);
  } catch (error) {
    console.error("Registration failed:", error);
  }
}

function sendToServiceWorker(message) {
  if (!navigator.serviceWorker.controller) {
    console.warn("No active SW controller to post message to.");

    return;
  }

  navigator.serviceWorker.controller.postMessage(message);
}

function startStream() {
  currentRequestId = Math.random().toString(36).slice(2);

  // Set the iframe src to /stream?requestId=XYZ
  iframe.src = `stream?requestId=${currentRequestId}`;

  outputRequestURL.innerText = iframe.src;
  anchor.href = iframe.src;
}

function sendChunk() {
  if (!currentRequestId) return;
  const time = new Date().toLocaleTimeString();

  sendToServiceWorker({
    type: "CHUNK",
    requestId: currentRequestId,
    payload: `<p>Chunk sent at ${time}</p>`,
  });
}

function closeStream() {
  if (!currentRequestId) return;

  sendToServiceWorker({
    type: "CLOSE",
    requestId: currentRequestId,
  });
}

registerServiceWorker();

buttonStartStream.addEventListener("click", startStream);
buttonSendChunk.addEventListener("click", sendChunk);
buttonCloseStream.addEventListener("click", closeStream);
