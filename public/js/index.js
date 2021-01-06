const version = 'v0.9.0';
const cacheVersion = `cache-${version}`;
const bookCache = `offline-book-${cacheVersion}`
const opds = '/opds';
const all = '_all';
const new_release = 'new_release'
const subjects = '_subjects'
const CURRENTLYREADING = 'currentlyReading'
const URLLocation = new URL(document.location)
const params = URLLocation.searchParams;
const myHash = URLLocation.hash;
const q = params.get('q')
const updateButton = document.getElementById('update-button')

const standardUrl = `https://standardebooks.org`
const all_url = 'https://standardebooks.org/opds/all';
const new_url = 'https://standardebooks.org/opds/new-releases';
const subjects_url = 'https://standardebooks.org/opds/subjects';
const one_subject_url = `${standardUrl}${q}`
const query_url = `https://standardebooks.org/opds/all?query=${q}`

/**
 * Service Worker
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log("Registered!", reg)
                // registration worked
                updateButton.onclick = function() {
                  registration.update();
                }
            }).catch(err => {
                console.log('Registration failed with ' + err);
            })
    })
}
function unregister() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
            .then((registration) => {
                registration.unregister();
            })
            .catch((error) => {
                console.error(error.message);
            });
    }
}
// https://davidwalsh.name/convert-xml-json
function xmlToJson(xml) {
	
	// Create the return object
	var obj = {};

	if (xml.nodeType == 1) { // element
		// do attributes
		if (xml.attributes.length > 0) {
		obj["@attributes"] = {};
			for (var j = 0; j < xml.attributes.length; j++) {
				var attribute = xml.attributes.item(j);
				obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
			}
		}
	} else if (xml.nodeType == 3) { // text
		obj = xml.nodeValue;
	}

	// do children
	if (xml.hasChildNodes()) {
		for(var i = 0; i < xml.childNodes.length; i++) {
			var item = xml.childNodes.item(i);
			var nodeName = item.nodeName;
			if (typeof(obj[nodeName]) == "undefined") {
				obj[nodeName] = xmlToJson(item);
			} else {
				if (typeof(obj[nodeName].push) == "undefined") {
					var old = obj[nodeName];
					obj[nodeName] = [];
					obj[nodeName].push(old);
				}
				obj[nodeName].push(xmlToJson(item));
			}
		}
	}
	return obj;
};
const populateStorage = (id, value) => {
  window.localStorage.setItem(id, value);
  
}
const getStorage = (id) => {
  return window.localStorage.getItem(id);
}

if(!getStorage(CURRENTLYREADING)) {
    populateStorage(CURRENTLYREADING, JSON.stringify([]))
}

const render = (response) => document
        .getElementById('root')
        .innerHTML = renderApp(response);

const renderError = async (err = 'Error processing request') => document
    .getElementById('root').innerHTML = await renderCachedApp(err);

const finishedLoading = (response) => document
    .getElementById('root')
    .classList.remove('loading')
/**
 * fetch OPDS
 */
function fetchBooks(url) {
    fetch(url).then(res => {
        if(!res.ok) {
            throw Error(res.statusText);
        }
        return res.text()
    })
    .then(str => xmlToJson(new window.DOMParser().parseFromString(str, "text/xml")))
    .then(render)
    .catch(renderError)
    .finally(finishedLoading)
}
const que = q || ''
const isSubjectSearch = que.startsWith(opds)
switch (q) {
    case null: // Home
        // needs all URL for entries in render
        fetchBooks(all_url);
        break;
    case all: // All
        fetchBooks(all_url);
        break;
    case new_release: // New 30
        fetchBooks(new_url);
        break;
    case subjects: // Subjects menu
        fetchBooks(subjects_url);
        break;
    default: // Query OPDS
        isSubjectSearch ?
            fetchBooks(one_subject_url) :
            fetchBooks(query_url)
        break;
}
// ---------------------------------------------------------------------------------

const renderCachedApp = async (err) => {
    const cacheList = await CacheList()
    return (`
        ${cacheList.length === 0 ? `
            <div>${err}</div>
        `:`
            <h3>Cached Books</h3>
            <p>There was an error and we are showing books cached on your device</p>
            ${List(cacheList)}
            <div>${err}</div>
            `
        }
    `)
}

const renderApp = (response) => {
    console.log(response.feed)
    const feed = response.feed;
    const feedtitle = feed.title || {}
    const feedtitleText = feedtitle['#text'] || ''
    const entries = feed.entry
    let entriesArray
    if (!Array.isArray(entries)) {
        entriesArray = [entries]
    } else {
        entriesArray = entries
    }
    const recentBook = filterRecentBook(entries)
    console.log(recentBook)
    console.log('entries')
    console.log(entries)
    return (`
        ${
        q === subjects ? (`
            <h2 class="index">${feedtitleText}</h2>
            ${ListNav(entriesArray)}
        `) :
        q === null ? (
            recentBook.length > 0 ? (`
                <h2 class="index">Recent Books</h2>
                ${List(recentBook)}
            `) : ''
        ) :
        q === all ? (`
            <h2 class="index">${feedtitleText}</h2>
            ${List(entriesArray)}
        `) :
        q === new_release ? (`
            <h2 class="index">${feedtitleText}</h2>
            ${List(entriesArray)}
        `) :
        // Else its a Query
        (`
            <h2 class="index">${feedtitleText}</h2>
            ${List(entriesArray)}
        `)}
    `)
}

const filterRecentBook = (entries) => {
    const currentBookUrls = JSON.parse(getStorage(CURRENTLYREADING))
    if(currentBookUrls.length === 0) {
        return []
    }
    const recentBooks = currentBookUrls.slice(0,8)
    const bumpyArray = recentBooks.map((bookUrl) => {
        return entries.filter((entry) => {
            const ebookLink = filterEpubLink(entry.link)[0]
            return bookUrl === dice(ebookLink)
        })
    })
    if (!Array.prototype.flat) {
        return bumpyArray.reduce((acc, val) => acc.concat(val), [])
    }
    return bumpyArray.flat()   
}

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

const filterEpubLink = (linkArray) => {
    const linkorArray = Array.isArray(linkArray) ? linkArray : []
    return linkorArray.filter(val => {
        const attrObj = val ? val["@attributes"] || {} : {}
        return attrObj.title === "Recommended compatible epub"
    })
}

const filterThumbnail = (linkArray) => {
    const linkorArray = Array.isArray(linkArray) ? linkArray : []
    return linkorArray.filter(val => {
        const attrObj = val ? val["@attributes"] || {} : {}
        return attrObj.rel === "http://opds-spec.org/image/thumbnail"
    })
}

const filterCover = (linkArray) => {
    const linkorArray = linkArray || []
    return linkorArray.filter(val => {
        const attrObj = val ? val["@attributes"] || {} : {}
        return attrObj.rel === "http://opds-spec.org/image"
    })
}

const filterSinglePage = (linkArray) => {
    const linkorArray = linkArray || []
    return linkorArray.filter(val => {
        const attrObj = val ? val["@attributes"] || {} : {}
        return attrObj.title === "XHTML"
    })
}

const filterForCollection = (entry) => {
    let hrefArray = []
    const content = entry.content || {}
    const p = content.p || []
    if (Array.isArray(p)) {
        p.map(tag => {
            const a = tag.a || {}
            const attributes = a['@attributes'] || {}
            const href = attributes.href || ''
            if (href.includes('/collection')) {
                hrefArray.push(href)
            }
        })
    }
    return hrefArray
}

const getCachedArticleData = async () => {
    if (!('caches' in self)) return [];
    return (await caches.keys())
      .filter(cacheName => cacheName.startsWith(bookCache))
}

const CacheList = async () => {
    const cachedBooks = await getCachedArticleData()
    console.log(cachedBooks)
    let filteredItems = []
    cachedBooks.forEach(book => {
        const cacheLength = bookCache.length
        const bookUrl = book.slice(cacheLength+1)
        console.log(bookUrl)
        const item = {
            title: {
                '#text': diceUrl(bookUrl)[1].slice(0, -5),
            },
            summary: {
                '#text': 'Cached book'
            },
            link: [
                {
                    "@attributes": {
                        title: "Recommended compatible epub",
                        href: bookUrl,
                    }
                },
                {
                    "@attributes": {
                        rel: "http://opds-spec.org/image/thumbnail",
                        href: `${diceUrl(bookUrl)[0]}/cover-thumbnail.jpg`,
                    }
                }
            ]
        }
        filteredItems.push(item)
    })
    return filteredItems
}
    
const List = (items) => `
<ol class="parent list">
    ${items.map(v => {
        return (`
        <li class="box list-item">
            ${AptCard(v)}
        </li>
        `)
    }).join("")}
</ol>
`

const ListNav = (items) => `
<ol class="parent list">
    ${items.map(v => {
        return (`
        <li class="box list-item">
            ${NavCard(v)}
        </li>
        `)
    }).join("")}
</ol>
`

const dice = (link) => {
    const linkAttributes = link ? link['@attributes'] || {} : {}
    const linkHref = linkAttributes.href || ''
    return linkHref.slice(0, -5)
}

const diceUrl = (url) => {
    let first, second
    second = url.substring(url.lastIndexOf('/') + 1)
    first = url.substring(0, url.lastIndexOf('/') + 1)
    return [first, second]
}

const NavCard = (nav) => {
    const navTitle = nav.title || {}
    const navTitleText = navTitle['#text'] || ''
    const navLink = nav.link || {}
    const navLinkAttributes = navLink['@attributes'] || {}
    const subjectLink = navLinkAttributes.href || ''
    return (`
        <div class="card">
            <div class="card-body">
                <a class="nav-link" href="?q=${subjectLink}">
                    <b class="card-title">${navTitleText}</b>
                </a>
            </div>
        </div>
    `)

}

const AptCard = (apt) => {
    const title = apt.title || {}
    const titleText = title['#text'] || ''
    const summary = apt.summary || {}
    const summaryText = summary['#text'] || ''
    const aptLink = apt.link || []
    const filteredThumbnail = filterThumbnail(aptLink)
    const image_url = Array.isArray(filteredThumbnail) ? filteredThumbnail[0] : {}
    const imageAttributes = image_url['@attributes'] || {}
    const imageHref = imageAttributes.href || ''
    const filteredEpubLink = filterEpubLink(aptLink)
    const ebookLink = Array.isArray(filteredEpubLink) ? filteredEpubLink[0] : {}
    const dicedEbook = dice(ebookLink)
    const navLink = apt.link || {}
    const navLinkAttributes = navLink['@attributes'] || {}
    const subjectLink = navLinkAttributes.href || ''
    return (`
        <div class="card">
            ${imageHref && `<a class="book-link" href="/ebook.html?book=${dicedEbook}">
                <img
                    width="120"
                    height="180"
                    loading="lazy"
                    src="${standardUrl}${imageHref}"
                    style="object-fit:cover;max-height:180px"
                    class="card-img-top img-fluid"
                    alt="${titleText}">
            </a>`}
            <div class="card-body">
                <a class="book-link" href=${q === subjects ? `?q=${subjectLink}` : `/ebook.html?book=${dicedEbook}`}>
                    <b class="card-title">${titleText}</b>
                </a>
                ${summaryText && `<p class="card-text">${summaryText}</p>`}
            </div>
        </div>
    `)
}


window.addEventListener('unhandledrejection', event => {
    alert("Error: " + event.reason.message);
});
  
window.addEventListener('appinstalled', (evt) => {
    console.log('a2hs installed');
    document.getElementById('install-prompt').classList.add('hide')
    updateButton.classList.remove('hide')
    const versionP = document.createElement('p')
    versionP.innerText = version
    document.getElementById('update-button').parentElement.append(versionP)

});

window.addEventListener('DOMContentLoaded', () => {
    let displayMode = 'browser tab';
    if (navigator.standalone) {
      displayMode = 'standalone-ios';
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
      displayMode = 'standalone';
    }
    console.log('DISPLAY_MODE_LAUNCH:', displayMode);
    if (displayMode !== 'browser tab') {
        document.getElementById('install-prompt').style = 'display:none;'
    }
});