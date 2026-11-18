/*
 * CineMaster AI service worker — 설치형 웹앱(PWA) + 오프라인 실행.
 *   · 앱 화면(HTML/JS/CSS/아이콘)은 네트워크 우선, 실패하면 캐시 → 한 번 열어 본 뒤에는 인터넷 없이도 열린다.
 *   · /api/ 요청과 다른 출처 요청은 건드리지 않는다 (백엔드가 없으면 앱이 Standalone 모드로 전환한다).
 * 새 버전을 배포하면 네트워크 우선이라 다음 접속 때 최신 파일로 갱신된다. CACHE 이름은 scripts/bump_version.py 가
 * 앱 버전 전체(X.Y.Z)로 바꾸므로, 패치 버전을 깔아도 activate 에서 예전 캐시가 지워진다 (오프라인 때 예전 화면이 뜨지 않게).
 */
const CACHE = "cinemaster-ai-v3.5.1";
const SHELL = ["./", "./index.html", "./manifest.json", "./favicon.ico", "./icon-192.png", "./icon-512.png", "./logo-96.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((hit) => hit || (request.mode === "navigate" ? caches.match("./index.html") : Response.error())),
      ),
  );
});
