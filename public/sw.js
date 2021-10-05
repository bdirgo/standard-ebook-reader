const cacheName = 'cache-v1.4.1b';
const bookCache = `offline-book-${cacheName}`
const resourcesToPrecache = [
    `/`,
    `/index.html`,
    '/ebook.html',
    '/js/ebook.js',
    '/js/index.js',
    '/js/appState.js',
    '/lib/epub.0.3.88.js',
    '/lib/jszip.3.5.0',
    '/lib/localforage.js',
    '/lib/swiped-events.js',
    `/css/index.css`,
    '/css/styles.css',
    '/css/ebook.css',
    '/css/ebook-styles/',
    '/js/darkMode.js',
    '/js/constats.js',
    '/js/utility.js',
    'https://unpkg.com/lit-html?module',
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
                console.log('caching for next time', event.request.url)
                await caches.open(cacheName)
                .then(cache => {
                    cache.put(event.request, clonedRes);
                })
                return response;
              })
        })
    )
})