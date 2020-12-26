const cacheName = 'cache-v0.8.8d';
const bookCache = `offline-book-${cacheName}`
const resourcesToPrecache = [
    `/`,
    `/index.html`,
    `/index.css`,
    '/ebook.js',
    '/ebook.html',
    '/ebook.css',
    '/jszip.3.5.0',
    '/epub.0.3.88.js',
    '/swiped-events.js',
    '/ebook-styles.css',
    '/dark-ebook-styles.css',
    '/darkMode/darkMode.js',
    '/darkMode/constats.js',
    '/darkMode/utility.js',
]

self.addEventListener('install', event => {
    console.log('Install Event')
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => {
                return cache.addAll(resourcesToPrecache)
            })
    )
})
self.addEventListener('activate', event => {
    console.log('Activate Event')
    var cacheKeeplist = [cacheName];

    event.waitUntil(
        caches.keys().then((keyList) => {
        return Promise.all(keyList.map((key) => {
            if (cacheKeeplist.indexOf(key) === -1) {
                return caches.delete(key);
            }
        }));
        })
    );
})
self.addEventListener('fetch', event => {
    console.log('fetch intercepted for:', event.request.url)
    event.respondWith(caches.match(event.request)
        .then(cachedResponse => {
            return cachedResponse || fetch(event.request).then(async function (response) {
                const clonedRes = response.clone();
                if (event.request.url.endsWith('.epub')) {
                    console.log('caching book for next time', event.request.url)
                    await caches.open(`${bookCache}-${new URL(event.request.url).pathname}`)
                        .then(cache => {
                            cache.put(event.request, clonedRes);
                        })
                } else {
                    console.log('caching for next time', event.request.url)
                    await caches.open(cacheName)
                    .then(cache => {
                        cache.put(event.request, clonedRes);
                    })
                }
                return response;
              })
        })
    )
})