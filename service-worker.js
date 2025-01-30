const activeStreams = {};

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const url = new URL(event.request.url);

      // early exit
      if (url.pathname !== "/stream") return fetch(event.request);

      const requestId = url.searchParams.get("requestId");
      // early exit
      if (!requestId) {
        return new Response("Missing requestId", { status: 400 });
      }

      // return if we have a cache hit
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) return cachedResponse;

      // no cache hit -> create transform stream
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      activeStreams[requestId] = {
        writer,
        chunks: [],
        request: event.request,
      };

      const initialHTML = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body>
      `;
      const initBytes = new TextEncoder().encode(initialHTML);
      writer.write(initBytes);

      return new Response(readable, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    })(),
  );
});

self.addEventListener("message", async (event) => {
  const { type, requestId, payload } = event.data || {};
  const streamInfo = activeStreams[requestId];

  if (!streamInfo) return;

  switch (type) {
    case "CHUNK": {
      streamInfo.chunks.push(payload);
      const bytes = new TextEncoder().encode(payload);
      streamInfo.writer.write(bytes);

      break;
    }

    case "CLOSE": {
      const closingHTML = `</body></html>`;
      streamInfo.chunks.push(closingHTML);
      streamInfo.writer.write(new TextEncoder().encode(closingHTML));
      streamInfo.writer.close();

      // assemble everything into one big blob for caching
      const fullHTML = streamInfo.chunks.join("");

      const responseForCache = new Response(fullHTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });

      const cache = await caches.open("local-html-cache");
      cache.put(streamInfo.request, responseForCache);

      delete activeStreams[requestId];

      break;
    }
  }
});
