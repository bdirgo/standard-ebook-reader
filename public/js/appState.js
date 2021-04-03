importScripts(
    '../lib/localforage.js',
    '../lib/tXml.js',
    '../lib/fuse.js',
)
const log = console.log;

const LOAD_TIME = 2000

var myDB = localforage.createInstance({
    name: "myDB"
});

var bookEntires = localforage.createInstance({
    name: "bookEntires"
});

class XMLObject {
    constructor() {
    }

    getTagName(obj) {
        return obj.tagName
    }

    getAttributes(obj) {
        return obj.attributes
    }

    firstChild(arr = []) {
        return arr.children[0]
    }

    filterByTag(name, json) {
        return json.filter(val => this.getTagName(val) === name)[0]
    }

    filterByFirstChildrenTag(name, json) {
        return json.children.filter(val => this.getTagName(val) === name)[0]
    }

    filterByChildrenTag(name, json) {
        return json.children.filter(val => this.getTagName(val) === name)
    }
}

class MyCategory {
    constructor(props) {
        this.term = props.term;
        this.title = props.term;
        this.entries = []
    }

    addEntry(entryId) {
        this.entries.push(entryId)
    }
}

class SubjectFeedLink extends XMLObject {
    constructor(json) {
        super(json)
        this.href = this.filterHref(json)
        this.rel = this.filterRel(json)
        this.title = this.filterTitle(json)
        this.type = this.filterType(json)
    }

    filterHref(json) {
        return this.getAttributes(json).href
    }

    filterRel(json) {
        return this.getAttributes(json).rel
    }

    filterTitle(json) {
        return this.getAttributes(json).title
    }

    filterType(json) {
        return this.getAttributes(json).type
    }
}

class SubjectFeedEntry extends XMLObject {
    constructor(json) {
        super(json)
        this.title = this.filterTitle(json)
        this.link = this.filterLink(json)
        this.updated = new Date(this.filterUpdated(json))
        this.id = this.filterId(json)
        this.content = convertContentToString(this.filterContent(json))
        this.url = this.id
    }

    filterTitle(json) {
        return this.firstChild(json.children.filter(val => this.getTagName(val) === "title")[0])
    }

    filterId(json) {
        return this.firstChild(json.children.filter(val => this.getTagName(val) === "id")[0])
    }

    filterUpdated(json) {
        return this.firstChild(json.children.filter(val => this.getTagName(val) === "updated")[0])
    }

    filterContent(json) {
        return this.firstChild(json.children.filter(val => this.getTagName(val) === "content")[0])
    }

    filterLink(json) {
        return this.getAttributes(json.children.filter(val => this.getTagName(val) === "link")[0]).href
    }
}

class SubjectFeed extends XMLObject {
    constructor(json){
        super(json)
        this.feed = this.filterFeed(json)
        this.id = this.filterId(this.feed)
        this.title = this.filterTitle(this.feed)
        this.subtitle = this.filterSubtitle(this.feed)
        this.linkArray = this.filterLinks(this.feed)
        this.entries = this.filterEntry(this.feed)
        this.icon = this.filterIcon(this.feed)
        this.updated = new Date(this.filterUpdated(this.feed))
    }

    filterFeed(json) {
        return this.filterByTag("feed", json).children
    }

    filterId(json) {
        return this.firstChild(this.filterByTag("id", json))
    }

    filterTitle(json) {
        return this.firstChild(this.filterByTag("title", json))
    }

    filterSubtitle(json) {
        return this.firstChild(this.filterByTag("subtitle", json))
    }

    filterIcon(json) {
        return this.firstChild(this.filterByTag("icon", json))
    }

    filterUpdated(json) {
        return this.firstChild(this.filterByTag("updated", json))
    }

    filterLinks(feed) {
        return feed
            .filter(val => this.getTagName(val) === "link")
            .map(val => new SubjectFeedLink(val))
    }

    filterEntry(feed) {
        return feed
            .filter(val => this.getTagName(val) === "entry")
            .map(val => new SubjectFeedEntry(val))
    }
}

class BookFeedLink extends SubjectFeedLink {
    constructor(json) {
        super(json)
    }
}

class SourceLink extends SubjectFeedLink {
    constructor(json) {
        super(json)
        this.href = this.firstChild(json)
        this.rel = "dc:source"
    }
}

class BookFeedCategory extends XMLObject {
    constructor(json) {
        super(json)
        this.scheme;
        this.term = this.filterTerm(json);
        this.title = this.term;
    }

    filterTerm(json) {
        return  this.getAttributes(json).term
    }
}

class EbookLink {
    constructor(obj) {
        this.href = obj.href.slice(0, -5)
        this.rel = obj.rel
        this.title = obj.title
        this.type = obj.type
    }
}

class Author extends XMLObject {
    constructor(json) {
        super(json)
        this.name = this.filterName(json);
        // TODO: these arn't working? edge case is throwing
        this.uri = this.filterURI(json);
        this.alternateName = this.filterAltName(json);
        this.sameAs = this.filterSameAs(json);
    }

    filterName(json) {
        return this.firstChild(this.filterByFirstChildrenTag("name", json))
    }

    filterURI(json) {
        return this.filterByFirstChildrenTag("uri", json)
    }

    filterAltName(json) {
        return this.filterByFirstChildrenTag("schema:alternateName", json)
    }

    filterSameAs(json) {
        return this.filterByFirstChildrenTag("schema:sameAs", json)
    }
}

class BookFeedEntry extends SubjectFeedEntry {
    constructor(json) {
        super(json)
        this.issued = this.filterIssued(json);
        this.language = this.filterLanguage(json);
        this.publisher = this.filterPublisher(json);
        this.sources = this.filterSources(json);
        this.rights = this.filterRights(json);
        this.summary = this.filterSummary(json);
        // this.content;
        this.categories = this.filterCategories(json);
        this.hasOneCategory = this.categories.length === 1
        this.authorArray = this.filterAuthors(json);
        this.link = this.id;
        this.linkArray = this.filterLinks(json);
        this.epubLink = this.findEpubLink(this.linkArray);
        this.ebookLink = new EbookLink(this.epubLink)
        this.thumbnail = this.findThumbnailLink(this.linkArray);
        this.cover = this.findCoverLink(this.linkArray);
        this.inUserLibrary = false;
    }

    static getIdFromEbookLink(href) {
        const searchTerm = '/download';
        const indexOfFirst = href.indexOf(searchTerm);
        const str = href.substring(0,indexOfFirst)
        return standard_url + str
    }

    filterIssued(json) {
        return this.firstChild(this.filterByFirstChildrenTag("dc:issued", json))
    }

    filterLanguage(json) {
        return this.firstChild(this.filterByFirstChildrenTag("dc:language", json))
    }

    filterPublisher(json) {
        return this.firstChild(this.filterByFirstChildrenTag("dc:publisher", json))
    }

    filterSources(json) {
        return this.filterByChildrenTag("dc:source", json).map(val => new SourceLink(val))
    }

    filterRights(json) {
        return this.firstChild(this.filterByFirstChildrenTag("rights", json))
    }

    filterSummary(json) {
        return this.firstChild(this.filterByFirstChildrenTag("summary", json))
    }

    filterCategories(json) {
        return this.filterByChildrenTag("category", json).map(val => new BookFeedCategory(val))
    }

    filterAuthors(json) {
        return this.filterByChildrenTag("author", json)?.map(val => new Author(val))
    }

    filterLinks(json) {
        return this.filterByChildrenTag("link", json)
            .map(val => new SubjectFeedLink(val))
    }

    findEpubLink(arr = []) {
        return arr.filter(val => val.title === "Recommended compatible epub")[0]
    }

    findThumbnailLink(arr = []) {
        return arr.filter(val => val.rel === "http://opds-spec.org/image/thumbnail")[0]
    }

    findCoverLink(arr = []) {
        return arr.filter(val => val.rel === "http://opds-spec.org/image")[0]
    }
}

class BookFeed extends SubjectFeed {
    constructor(json) {
        super(json)
        // TODO: fill this out...content???
        this.entries = this.filterEntry(this.feed)
    }

    filterEntry(feed) {
        return feed
            .filter(val => this.getTagName(val) === "entry")
            .map(val => new BookFeedEntry(val))
    }
}

class MyLibrary extends MyCategory {
    constructor(props) {
        super(props)
        this.currentlyReading = []
    }
}

class SECollection extends MyCategory {
    constructor(given) {
        super(given)
    }
}

class BelongsToCollection {
    constructor(text) {
        const textArray = text.match(/>[\S ]*?</gm)

        this.title = this.filterTitle(textArray)
        this.term = this.title
        this.type = this.filterType(textArray)
        this.position = parseInt(this.filterPosition(textArray))
    }

    filterTitle(textArray) {
        const textWithBrackets = textArray[0]
        return textWithBrackets.substr(1 , textWithBrackets.length - 2)
    }

    filterType(textArray) {
        const textWithBrackets = textArray[1]
        return textWithBrackets.substr(1 , textWithBrackets.length - 2)
    }

    filterPosition(textArray) {
        const textWithBrackets = textArray[2]
        return textWithBrackets.substr(1 , textWithBrackets.length - 2)
    }
}

function convertContentToString(content) {
    const createAttributes = (attributes) => {
        if (attributes?.href ?? false) {
            return ` href=${attributes?.href}`
        } else if (attributes?.lang ?? false) {
            return ` lang=${attributes?.lang}`
        } else {
            return ''
        }
    }
    if (content?.tagName ?? false) {
        return `${content?.children.map((child) => convertContentToString(child)).join('')}`
        // return `<${content?.tagName}${content?.attributes ? createAttributes(content?.attributes) : ''}>${content?.children.map((child) => convertContentToString(child))}</${content?.tagName}>`
    } else {
        return `${content}`
    }
}

async function fetchSubjects(subjects_url) {
    const response = await fetch(subjects_url)
    const text = await response.text()
    const json = xmlConverter.parse(text)
    const subjects = new SubjectFeed(json)
    myDB.setItem('subjects', subjects)
    return subjects
}

function RawGithubURL(url) {
    const newUrl = new URL(url)
    newUrl.host = `raw.githubusercontent.com`
    newUrl.pathname = newUrl.pathname.replace('/blob', '') 
    return newUrl
}

function createEntryId(url) {
    const newUrl = new URL(url)
    newUrl.host = `standardebooks.org`
    newUrl.pathname = newUrl.pathname.replace('/repos', '/ebooks').replace('/standardebooks', '').replaceAll('_', '/')
    return `${newUrl}`
}

function findWordCount(text) {
    return text.match(/<meta property="se:word-count">[\s\S]*?<\/meta>/g)[0]
}
function findReadingEase(text) {
    return text.match(/<meta property="se:reading-ease.flesch">[\s\S]*?<\/meta>/g)[0]
}
function findCollectionTitles(text) {
    return text.match(/<meta id="collection[\s\S]*? property="belongs-to-collection">[\s\S]*?<\/meta>([\s\S]*?<\/meta>){1,2}/gm)
}

async function fetchCollections() {
    const fetchGithubSearchResults = async (page = 1) => {
        // Super hacky, I wish they gave this info on the OPDS fead
        // Rate limit
        // The Search API has a custom rate limit. For requests using Basic Authentication, OAuth, or client ID and secret,
        // you can make up to 30 requests per minute. For unauthenticated requests, the rate limit allows you to make up
        // to 10 requests per minute.
        // See the rate limit documentation for details on determining your current rate limit status.

        const result_limit = 100
        const github_search_url = `https://api.github.com/search/code?q=belongs-to-collection+in:file+filename:content+org:standardebooks&per_page=${result_limit}&page=${page}`
        const response = await fetch(github_search_url);
        const json = await response.json();

        if (json.total_count - (result_limit * page) >= 1) {
            return json.items.concat(await fetchGithubSearchResults(page+1))
        } else {
            return json.items
        }
    }

    const items = await fetchGithubSearchResults();
    let collections = [];
    await Promise.all(items.map(async (item) => {
        // url: "https://api.github.com/repos/standardebooks/ford-madox-ford_no-more-parades"
        const entryId = createEntryId(item.repository.url);
        // "https://standardebooks.org/ebooks/ford-madox-ford/no-more-parades"
        const entry = await bookEntires.getItem(entryId);
        const opfUrl = RawGithubURL(item.html_url);
        const res = await fetch(opfUrl);
        const text = await res.text();
        // TODO: books out of a collection have an ease score
        // const readingEaseText = findReadingEase(text);
        // entry.readingEase = readingEaseText;
        const collectionTextArray = findCollectionTitles(text);
        if (collectionTextArray === null) {
            console.warn(text)
        }
        collectionTextArray.forEach(async collectionText => {
            const collection = new BelongsToCollection(collectionText);
            let foundIndex = collections.findIndex(val => val?.term === collection.term)
            if (foundIndex === -1) {
                collections.push(new SECollection(collection))
                foundIndex = collections.findIndex(val => val?.term === collection.term)
            }
            const foundCollection = collections[foundIndex]
            const entryInCollection = foundCollection.entries.findIndex(val => val.id === entryId)
            if (entryInCollection === -1) {
                foundCollection.addEntry(entry)
            }
            const arr = entry.collection || []
            arr.push(collection)
            entry.collection = arr
        })
        await bookEntires.setItem(entryId, entry);
    }))
    const updated = new Date()
    const rv =  {collections, updated}
    await myDB.setItem('entriesByCollection', rv)
    return rv
}

async function fetchNewReleases(new_url) {
    const response = await fetch(new_url)
    const text = await response.text()
    const json = xmlConverter.parse(text)
    const entry = new BookFeed(json)
    myDB.setItem('entriesNew', entry)
    return entry
}

async function fetchEntries(subjects) {
    let entries = []
    await Promise.all(subjects.entries.map(async (subject) => {
        const url = subject.id
        const res = await fetch(url)
        const text = await res.text()
        const json = xmlConverter.parse(text)
        const entry = new BookFeed(json)
        entries.push(entry)
    }));
    const updated = new Date()
    const rv = {subjects:entries, updated}
    myDB.setItem('entriesBySubject', rv)
    return rv
}

async function createCategroiesFrom(entriesBySubject) {
    // TODO: fix this... localforage has an empty array???
    console.log('finding categories')
    let categoriesFound = []
    await Promise.all(entriesBySubject.subjects.map(async bookFeed => {
        await Promise.all(bookFeed.entries.map(async entry => {
            const catArray = entry.categories
            // IS this where we are populating the `bookEntires` db???
            await bookEntires.setItem(entry.id, entry)
            for (let index = 0; index < catArray.length; index++) {
                const cat = catArray[index];
                let foundIndex = categoriesFound.findIndex(val => val?.term === cat.term)
                if (foundIndex === -1) {
                    categoriesFound.push(new MyCategory(cat))
                    foundIndex = categoriesFound.findIndex(val => val?.term === cat.term)
                }
                const foundCategory = categoriesFound[foundIndex]
                const entryInCategory = foundCategory.entries.findIndex(val => val.id === entry.id)
                if (entryInCategory > -1) {
                    continue;
                } else {
                    foundCategory.addEntry(entry)
                }
            }
        }))
    }))
    categoriesFound.sort((a, b) => b.entries.length - a.entries.length)
    console.log('categoriesFound')
    console.log(categoriesFound)
    const updated = new Date()
    const rv = {categories: categoriesFound, updated}
    await myDB.setItem('entriesByCategory', rv)
    return rv
}

async function createUserLibrary() {
    const userLibrary = new MyLibrary({term: "My Library"})
    await myDB.setItem('userLibrary', userLibrary)
    return userLibrary
}

const standard_url = 'https://standardebooks.org';
const all_url = 'https://standardebooks.org/opds/all';
const new_url = 'https://standardebooks.org/opds/new-releases';
const subjects_url = 'https://standardebooks.org/opds/subjects';
// TODO: query the local database... use theirs if all else fails.
// const query_url = `https://standardebooks.org/opds/all?query=${q}`

async function userLibraryReducer(state = [], action) {
    const {
        type,
        entryId,
        currentlyReading,
    } = action;
    switch (type) {
        case('library-tab'): {
            const userLibrary = await myDB.getItem('userLibrary')
            if (!userLibrary) {
                return {}
            } else {
                const reading = JSON.parse(currentlyReading || '[]')
                const currentlyReadingEntires = await Promise.all(reading.map(async curr => {
                    if (curr?.length > 0) {
                        const id = BookFeedEntry.getIdFromEbookLink(curr)
                        return await bookEntires.getItem(id)
                    }
                }))
                userLibrary.currentlyReading = currentlyReadingEntires
                myDB.setItem('userLibrary',userLibrary)
                return userLibrary
            }
        }
        case('click-add-to-library'): {
            // Doesn't work , not sure why
            let userLibrary = await myDB.getItem('userLibrary')
            console.log(userLibrary)
            if (!userLibrary) {
                console.log('creating Library')
                userLibrary = await createUserLibrary(entryId)
            }
            let newEntry = await bookEntires.getItem(entryId);
            newEntry.inUserLibrary = true;
            userLibrary.entries.push(newEntry)
            await bookEntires.setItem(entryId, newEntry)
            myDB.setItem('userLibrary', userLibrary)
            return userLibrary;
        }
        case('click-remove-from-library'): {
            let userLibrary = await myDB.getItem('userLibrary')
            const index = userLibrary.entries.findIndex(val => val.id === entryId)
            userLibrary.entries.splice(index, 1)
            console.log(userLibrary)
            let oldEntry = await bookEntires.getItem(entryId);
            oldEntry.inUserLibrary = false;
            await bookEntires.setItem(entryId, oldEntry)
            myDB.setItem('userLibrary', userLibrary)
            return userLibrary;
        }
        default:
            return state
    }
}

const lastUpdated = (db, h = 24) => {
    if (!db) {
        return true
    }
    if (!db.updated) {
        return true
    }
    // New entries should be checked more often then the others
    const now = new Date();
    const lastUpdated = new Date(`${db.updated}`);
    const isOld = now - lastUpdated > (h*60*60*1000)
    return isOld
}

async function bookLibraryReducer(state = [], action) {
    const previewLength = 8;
    switch (action.type) {
        case('browse-tab'): {
            const entriesBySubject = await myDB.getItem('entriesBySubject')
            const isOld = lastUpdated(entriesBySubject)
            if (isOld) {
                console.log('fetching new subjects')
                bookLibrary = await fetchStandardBooks();
                await createCategroiesFrom(bookLibrary)
            } else {
                console.log('subjects in storage')
                bookLibrary = entriesBySubject
            }
            bookLibrary = bookLibrary.subjects
                .map(val => {
                    return {
                        title: val.title,
                        entries: val.entries.slice(0, previewLength),
                        length: val.entries.length,
                    }
                })
                .sort(function(a, b) {
                    var nameA = a.title.toUpperCase(); // ignore upper and lowercase
                    var nameB = b.title.toUpperCase(); // ignore upper and lowercase
                    if (nameA < nameB) {
                      return -1;
                    }
                    if (nameA > nameB) {
                      return 1;
                    }
                  
                    // names must be equal
                    return 0;
                });
            return bookLibrary;
        }
        case('new-tab'): {
            let entriesNew = await myDB.getItem('entriesNew')
            const isOld = lastUpdated(entriesNew, 1.5)
            if (isOld) {
                console.log('checking for new realeases...')
                entriesNew = await fetchNewReleases(new_url)
            } 
            entriesNew = {
                title: entriesNew.title,
                entries: entriesNew.entries.slice(0, previewLength),
                length: 30,
            }
            return entriesNew
        }
        case('collection-tab'): {
            const entriesByCollection = await myDB.getItem('entriesByCollection')
            const isOld = lastUpdated(entriesByCollection)
            if (isOld) {
                console.log('repopulating collections')
                bookLibrary = await fetchCollections()
            } else {
                console.log('collections in storage')
                bookLibrary = entriesByCollection
            }
            bookLibrary = bookLibrary.collections
                .map(val => {
                    return {
                        title: val.title,
                        entries: val.entries.slice(0, previewLength),
                        length: val.entries.length,
                    }
                })
            return bookLibrary;
        }
        default:
            return state
    }
}

function sideBarReducer(state = 'show',action) {
    const {
        type,
    } = action;
    switch(type) {
        case('click-close-main-menu'):{
            return 'show'
        }
        case('click-open-main-menu'):{
            return 'hide'
        }
        default: 
            return state
    }
}

function activeTabReducer(state = 'LIBRARY', action) {
    const {
        type,
        tab,
    } = action;
    switch (type) {
        case('browse-tab'): 
        case('click-new'): 
        case('click-author'): 
        case('click-subject'): 
        case('click-category'): 
        case('click-collection'): 
        case('collection-tab'): 
        case('library-tab'): 
        case('new-tab'): 
        case('help-tab'):
        case('search-author'):
        case('search-tab'): {
            return tab;
        }
        default:
            return state
    }
}

async function activeCategoryReducer(state = null, action) {
    const {
        type,
        categoryTerm,
    } = action
    switch (type) {
        case('click-collection'): {
            const colls = await myDB.getItem('entriesByCollection')
            return colls.collections.filter(val => val.term === categoryTerm)[0];
        }
        case('click-category'): {
            const cats = await myDB.getItem('entriesByCategory')
            return cats.categories.filter(val => val.term === categoryTerm)[0];
        }
        case('click-subject'): {
            const subs = await myDB.getItem('entriesBySubject')
            return subs.subjects.filter(val => val.title === categoryTerm)[0];
        }
        case('click-new'): {
            const newEntries = await myDB.getItem('entriesNew')
            entriesNew = {
                title: newEntries.title,
                entries: newEntries.entries
            }
            return entriesNew
        }
        default:
            return state
    }
}

async function activeEntryReducer(state = null, action) {
    const {
        type,
        entryId,
    } = action
    switch (type) {
        case('click-remove-from-library'): 
        case('click-title'): {
            const entry = await bookEntires.getItem(entryId);
            return entry;
        }
        default:
            return state
    }
}

async function searchReducer(state, action) {
    const {
        type,
        query,
    } = action;
    const subjects = await myDB.getItem('entriesBySubject')
    const dupBooks = subjects.subjects.flatMap(sub => {
        return sub.entries
    })
    const books = Array.from(new Set(dupBooks.map(a => a.id)))
        .map(id => dupBooks.find(a => a.id === id))
    switch(type) {
        case('search-query'):{
            const fuse = new Fuse(books, {
                keys: ['title', 'authorArray.name', 'content.children', 'categories.title', 'summary']
            })
            return fuse.search(query)
        }
        case('search-author'):{
            const fuse = new Fuse(books, {
                keys: ['authorArray.name'],
                threshold: 0.1,
            })
            return fuse.search(query)

        }
        default:
            return state
    }
}

function setInitialState(
    userLibrary = {},
    bookLibrary = {},
    activeTab = 'LIBRARY',
    activeEntry = null,
    activeCategory = null,
) {
    return {
        userLibrary,
        bookLibrary,
        activeTab,
        activeEntry,
        activeCategory,
    }
}

const initialLoadTime = Date.now();

async function initApp(state, action) {
    const {
        currentlyReading,
    } = action
    await app(state, {
        type: 'browse-tab',
        tab: 'BROWSE'
    });
    return await app(state, {
        tab: 'LIBRARY',
        type: 'library-tab',
        currentlyReading,
    })
    // populate database if it doesnt exist ?? Maybe only whent he user clicks browse?? if they first click search then, fallback on SE search and not myDB
    
}

function showDetailModalReducer(state = false, action) {
    const {
        type,
    } = action;
    switch(type) {
        case('click-close-details-modal'): {
            return false
        }
        case('click-title'):{
            return true
        }
        default: 
        return false
    }
}

async function app(state = {}, action) {
    return {
        userLibrary: await userLibraryReducer(state.userLibrary, action),
        bookLibrary: await bookLibraryReducer(state.bookLibrary, action),
        activeTab: activeTabReducer(state.activeTab, action),
        activeEntry: await activeEntryReducer(state.activeEntry, action),
        activeCategory: await activeCategoryReducer(state.activeCategory, action),
        isLoading: false,
        showDetailModal: showDetailModalReducer(state.showDetailModal, action),
        showSideBarMenu: sideBarReducer(state.showSideBarMenu, action),
        searchResults: await searchReducer(state.searchResults, action)
    }
}

async function fetchStandardBooks() {
    const subjects = await fetchSubjects(subjects_url)
    const entriesBySubject = await fetchEntries(subjects)
    return entriesBySubject
}

let state;
let loadingInterval = null;

self.onmessage = async function(event) {
    const {
        type,
        payload,
    } = event.data;
    const parsedPayload = JSON.parse(payload)
    console.log(parsedPayload)

    let i = 0
    const postLoading = () => {
        self.postMessage({
            type:'state',
            payload: JSON.stringify({
                isLoading: true,
                showSideBarMenu: !!state.showSideBarMenu,
                loadingMessageindex: i++ % 13
            })
        })
    }
    if (loadingInterval !== null) {
        clearInterval(loadingInterval)
    }
    loadingInterval = setInterval(() => {
        console.log('loading...')
        postLoading()
    }, LOAD_TIME);
    switch (type) {
        case "init": {
            console.log('init')
            state = {
                userLibrary: {},
                bookLibrary: {},
                activeTab: 'LIBRARY',
                activeEntry: null,
                activeCategory: null,
            }
            state = await initApp(state, parsedPayload.action)
            clearInterval(loadingInterval)
            self.postMessage({type:"state", payload:JSON.stringify(state)});
            break;
        }
        case "click": {
            state = await app(state, parsedPayload.action)
            clearInterval(loadingInterval)
            self.postMessage({type:"state", payload:JSON.stringify(state)});
            break;
        }
        default: {
            break;
        }
    }
}
