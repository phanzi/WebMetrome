if ("serviceWorker" in navigator) {
  // 거의 대부분은 여기에서 걸러짐
  navigator.serviceWorker.ready.then((sw) => sw.unregister());

  // 삼성 브라우저, 네이버 웨일 브라우저
  navigator.serviceWorker
    .getRegistrations()
    .then((sws) => sws.forEach((sw) => sw.unregister()))
    .catch((error) => console.warn("SW unregistration failed:", error));
}

if ("caches" in window) {
  caches.keys().then((keyList) => {
    return Promise.all(keyList.map((key) => caches.delete(key)));
  });
}
