importScripts(
    '../lib/localforage.js',
    '../lib/tXml.js',
    '../lib/fuse.js',
)
const log = console.log;

function toTitleCase(str) {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

const LOAD_TIME = 650

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

class SubjectFeedEntryId extends XMLObject {
    constructor(json) {
        super(json)
        this.id = this.filterId(json)
    }

    filterId(json) {
        return this.firstChild(json.children.filter(val => this.getTagName(val) === "id")[0])
    }
}

class SubjectFeedEntry extends SubjectFeedEntryId {
    constructor(json) {
        super(json)
        this.title = this.filterTitle(json)
        this.link = this.filterLink(json)
        this.updated = new Date(this.filterUpdated(json))
        this.content = this.filterContent(json)
        this.url = this.id
    }

    filterTitle(json) {
        return this.firstChild(json.children.filter(val => this.getTagName(val) === "title")[0])
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
        this.entries = this.filterEntry(this.feed)
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

    filterUpdated(json) {
        return this.firstChild(this.filterByTag("updated", json))
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
        this.linkArray = this.filterLinks(this.feed)
    }

    filterEntry(feed) {
        return feed
            .filter(val => this.getTagName(val) === "entry")
            .map(val => new BookFeedEntry(val))
    }

    filterLinks(feed) {
        return feed
            .filter(val => this.getTagName(val) === "link")
            .map(val => new SubjectFeedLink(val))
    }
}
class BookFeedForEntries extends SubjectFeed {
    constructor(json) {
        super(json)
        // TODO: fill this out...content???
        this.entries = this.filterEntry(this.feed)
    }

    filterEntry(feed) {
        return feed
            .filter(val => this.getTagName(val) === "entry")
            .map(val => new SubjectFeedEntryId(val)?.id)
    }
}

class MyLibrary extends MyCategory {
    constructor(props) {
        super(props)
        this.currentlyReading = []
        this.followedCategories = [
            // "Historical fiction",
            // "War stories"
        ]
        this.followedCollections = [
            // "Sherlock Holmes",
            // "The Guardian’s Best 100 Novels in English (2015)",
        ]
        this.followedSubjects = [
            // "https://standardebooks.org/opds/subjects/adventure",
            // "https://standardebooks.org/opds/subjects/mystery",
        ]
        this.followedSearchResults = [

        ]
    }
}

class SECollection extends MyCategory {
    constructor(given) {
        super(given)
        this.type = given.type
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
        // https://api.github.com/repos/standardebooks/ford-madox-ford_no-more-parades
        const entryId = createEntryId(item.repository.url);
        // https://standardebooks.org/ebooks/ford-madox-ford/no-more-parades
        const entry = await bookEntires.getItem(entryId);
        if (entry !== null) {
            // https://github.com/standardebooks/ford-madox-ford_some-do-not/blob/532dc230d19205b5821abe009de0efd9ba469bf8/src/epub/content.opf
            const opfUrl = RawGithubURL(item.html_url);
            // https://raw.githubusercontent.com/standardebooks/ford-madox-ford_some-do-not/532dc230d19205b5821abe009de0efd9ba469bf8/src/epub/content.opf
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
                const entryInCollection = foundCollection.entries.findIndex(val => val?.id === entryId)
                if (entryInCollection === -1) {
                    foundCollection.addEntry(entry)
                }
                const arr = entry?.collection || []
                arr.push(collection)
                entry.collection = arr
            })
            if (entry !== undefined && entry !== null && entry?.id !== null) {
                await bookEntires.setItem(entryId, entry);
            }
        } else {
            console.log(entryId);
        }
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
    const entry = new BookFeedForEntries(json)
    myDB.setItem('entriesNew', entry)
    return entry
}

async function fetchEntriesBySubject(subjects) {
    let bookFeedEntries = []
    await Promise.all(subjects.entries.map(async (subject) => {
        const url = subject.id
        const res = await fetch(url)
        const text = await res.text()
        const json = xmlConverter.parse(text)
        const entry = new BookFeedForEntries(json)
        bookFeedEntries.push(entry)
    }));
    const updated = new Date()
    const rv = {subjects:bookFeedEntries, updated}
    myDB.setItem('entriesBySubject', rv)
    return rv
}

async function createCategroiesFrom(entriesBySubject) {
    // TODO: fix this... localforage has an empty array???
    // console.log('finding categories')
    let categoriesFound = []
    await Promise.all(entriesBySubject.subjects.map(async subject => {
        await Promise.all(subject.entries.map(async subjectFeedEntryId => {
            const entry = await bookEntires.getItem(subjectFeedEntryId);
            const catArray = entry.categories
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
                    foundCategory.addEntry(entry.id)
                }
            }
        }))
    }))
    categoriesFound
        .map(category => {
            category.entries = [...new Set(category.entries)];
        })
        .sort((a, b) => b.entries.length - a.entries.length)
    await myDB.setItem('entriesByCategory', {categories: categoriesFound, updated: new Date()})
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
            const userLibrary = await getUserLibrary();
            const reading = JSON.parse(currentlyReading || '[]')
            const currentlyReadingEntires = await Promise.all(reading.map(async curr => {
                if (curr?.length > 0) {
                    const id = BookFeedEntry.getIdFromEbookLink(curr)
                    return await bookEntires.getItem(id)
                }
            }))
            userLibrary.currentlyReading = currentlyReadingEntires
            const query = currentlyReadingEntires?.[0]?.authorArray?.[0]?.name
            const authorEntries = await addAuthorToUserLibrary(`${query}`, false);
            if (authorEntries.length > 1) {
                userLibrary.moreByThisAuthor = authorEntries;
            } else {
                userLibrary.moreByThisAuthor = {}
            }
            const hasCollection = currentlyReadingEntires?.[0]?.collection !== undefined;
            if (hasCollection) {
                const collectionArray = currentlyReadingEntires[0].collection;
                const entriesByCollection = await myDB.getItem('entriesByCollection');
                const seriesName = collectionArray.filter(val => {
                    return val.type === 'series';
                })?.[0]?.title
                if (seriesName !== undefined) {
                    const series = entriesByCollection.collections.filter(val => {
                        return val.title === seriesName;
                    })
                    userLibrary.series = series;
                } else {
                    userLibrary.series = [];
                }
            }
            await myDB.setItem('userLibrary', userLibrary)
            return userLibrary
        }

        case('click-add-to-library'): {
            let userLibrary = await getUserLibrary();
            const newEntry = await bookEntires.getItem(entryId);
            const alreadyInLibrary = userLibrary.entries.filter(v => {
                return v.id === entryId
            })
            if (alreadyInLibrary.length === 0) {
                // console.log('adding entry to library')
                newEntry.inUserLibrary = true;
                try {
                    userLibrary.entries.push(newEntry) 
                } catch (error) {
                    userLibrary.entries = [newEntry]
                }
                await bookEntires.setItem(entryId, {...newEntry, inUserLibrary: true});
                await myDB.setItem('userLibrary', userLibrary)
            }
            return userLibrary;
        }
        case('click-remove-from-library'): {
            let userLibrary = await getUserLibrary();
            const newEntry = await bookEntires.getItem(entryId);
            const entryIndex = userLibrary.entries.findIndex(v => v.id === entryId);
            if (entryIndex >= 0) {
                userLibrary.entries.splice(entryIndex, 1)
            }
            const currIndex = userLibrary.currentlyReading.findIndex(v => v.id === entryId);
            if (currIndex >= 0) {
                userLibrary.currentlyReading.splice(currIndex, 1)
            }
            // Remove book out of library
            newEntry.inUserLibrary = false;
            await bookEntires.setItem(entryId, {...newEntry, inUserLibrary: false});
            await myDB.setItem('userLibrary', userLibrary);
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
    switch (action.type) {
        case('browse-tab'): {
            const entriesBySubject = await myDB.getItem('entriesBySubject')
            const isOld = lastUpdated(entriesBySubject)
            let bookLibrary = {
                subjects: [],
            }
            if (isOld || action?.shouldForceRefresh) {
                // console.log('fetching new subjects')
                bookLibrary = await fetchStandardBooks();
            } else {
                // console.log('subjects in storage')
                bookLibrary = entriesBySubject
            }
            bookLibrary = await Promise.all(bookLibrary.subjects
                .map(async val => {
                    const books = await getEntriesFrom(val?.entries ?? [])
                    return {
                        title: val.title,
                        entries: books,
                        length: val.entries.length,
                    }
                }));
            bookLibrary.sort(function(a, b) {
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
            let newEntries = await myDB.getItem('entriesNew')
            const isOld = lastUpdated(newEntries, 1.5)
            // console.log(isOld)
            if (isOld) {
                try {
                    // console.log('checking for new realeases...')
                    let entriesNew = await fetchNewReleases(new_url)
                    newEntries = {
                        ...entriesNew,
                        length: 30,
                        updated: new Date(),
                    }
                } catch (err) {
                    console.log('trouble fetching new releases, ', err)
                }
            }
            const books = await getEntriesFrom(newEntries?.entries ?? [])
            return {
                ...newEntries,
                entries: books,
            }
        }
        case('collection-tab'): {
            const entriesByCollection = await myDB.getItem('entriesByCollection')
            const isOld = lastUpdated(entriesByCollection)
            if (isOld || action?.shouldForceRefresh) {
                // console.log('repopulating collections')
                bookLibrary = await fetchCollections()
            } else {
                let shouldUpdateBookEntires = false
                const firstEntryId = entriesByCollection?.collections?.[0]?.entries?.[0]?.id
                const firstBookEntry = await bookEntires.getItem(firstEntryId)
                if (firstBookEntry?.collection === undefined || firstBookEntry?.collection?.length === 0) {
                    shouldUpdateBookEntires = true
                }
                if (shouldUpdateBookEntires) {
                    await Promise.all(entriesByCollection?.collections?.map(async collection => {
                        return await Promise.all(collection?.entries?.map(async entry => {
                            if (entry !== undefined && entry !== null && entry?.id !== null) {
                                await bookEntires.setItem(entry.id, entry)
                            }
                        }))
                    }))
                }
                // console.log('collections in storage')
                bookLibrary = entriesByCollection
            }
            bookLibrary = bookLibrary.collections
                .map(val => {
                    return {
                        title: val.title,
                        entries: val.entries,
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
        case('search-query'):
        case('search-tab'): {
            return tab;
        }
        default:
            return state
    }
}

const getUserLibrary = async () => {
    let userLibrary = await myDB.getItem('userLibrary')
    if (!userLibrary) {
        console.log('creating Library')
        userLibrary = await createUserLibrary()
    }
    
    return userLibrary;
}

const addAuthorToUserLibrary = async (query, shouldAddFollowedSearchResults = true) => {
    const books = await getAllBookEntires();
    let userLibrary = await getUserLibrary();
    const alreadyInLibrary = userLibrary.followedSearchResults.filter(v => {
        return v.title === query
    })
    if (alreadyInLibrary.length === 0) {
        const fuse = new Fuse(books, {
            keys: ['authorArray.name'],
            threshold: 0.1,
        })
        const searchResults = fuse.search(query)
        const entries = searchResults
            .map(val => {
                return val.item
            })
        const collection = {
            term: toTitleCase(query),
            title: toTitleCase(query),
            entries,
            length: entries.length,
            inUserLibrary: true,
        }
        if (shouldAddFollowedSearchResults) {
            try {
                userLibrary.followedSearchResults.push(collection) 
            } catch (error) {
                userLibrary.followedSearchResults = [collection]
            }
            await myDB.setItem('userLibrary', userLibrary)
            return userLibrary.followedSearchResults;
        } else {
            return collection
        }
    }
}

async function followedSearchResultsReducer(state = [], action) {
    const {
        type,
        query,
    } = action;
    switch(type) {
        case('library-tab'): {
            let userLibrary = await getUserLibrary();

            return userLibrary.followedSearchResults ?? [];
        }
        case('click-add-search-results-to-library'): {
            return await addAuthorToUserLibrary(query);
        }
        case('click-remove-search-results-from-library'): {
            let userLibrary = await getUserLibrary();
            const newCollections = userLibrary.followedSearchResults.filter(v => {
                return v.title !== query
            })
            userLibrary.followedSearchResults = newCollections
            await myDB.setItem('userLibrary', userLibrary)

            // // // Remove results from library
            // const results = await myDB.getItem('entriesByresults')
            // const res = results.collections.filter(val => val.title === query)[0];
            // res.inUserLibrary = false;
            return userLibrary.followedSearchResults
        }
        default:
            return state
    }
}

async function followedCollectionsReducer(state = [], action) {
    const {
        type,
        collectionName,
    } = action
    // console.log(collectionName);
    switch (type) {
        case('library-tab'): {
            let userLibrary = await getUserLibrary();
            return userLibrary.followedCollections ?? [];
            // const followedCollections = userLibrary.followedCollections ?? [];
            // return await Promise.all(followedCollections.map(async collection => {
            //     return {
            //         ...collection,
            //         entries: await getEntriesFrom(collection?.entries)
            //     }
            // }));
        }
        case('click-add-collection-to-library'): {
            let userLibrary = await getUserLibrary();
            const alreadyInLibrary = userLibrary.followedCollections.filter(v => {
                return v.title === collectionName
            })
            // console.log(alreadyInLibrary);
            if (alreadyInLibrary.length === 0) {
                // console.log('adding collection to library')
                const entriesByCollection = await myDB.getItem('entriesByCollection')
                const isOld = lastUpdated(entriesByCollection)
                if (isOld || action?.shouldForceRefresh) {
                    // console.log('repopulating collections')
                    bookLibrary = await fetchCollections()
                } else {
                    // console.log('collections in storage')
                    bookLibrary = entriesByCollection
                }
                collection = bookLibrary.collections
                    .filter(val => {
                        return val.title === collectionName;
                    })
                    .map(val => {
                        return {
                            title: val.title,
                            // entries: val.entries.slice(0, previewLength),
                            entries: val.entries,
                            length: val.entries.length,
                            inUserLibrary: true,
                        }
                    })[0]
                // console.log(bookLibrary)
                // console.log(collection)
                // console.log(userLibrary)
                let newEntry = collection
                try {
                    userLibrary.followedCollections.push(newEntry) 
                } catch (error) {
                    userLibrary.followedCollections = [newEntry]
                }
                await myDB.setItem('userLibrary', userLibrary)
            }
            return userLibrary.followedCollections;
        }
        case('click-remove-collection-from-library'): {
            let userLibrary = await getUserLibrary();
            const newCollections = userLibrary.followedCollections
                .filter(v => v.title !== collectionName)
            // console.log(newCollections);
            userLibrary.followedCollections = newCollections
            await myDB.setItem('userLibrary', userLibrary)

            // // Remove subject out of library
            const collection = await myDB.getItem('entriesByCollection')
            const col = collection.collections.filter(val => val.title === collectionName)[0];
            col.inUserLibrary = false;
            return userLibrary.followedCollections
        }
        default:
            return state
    }
}
async function followedSubjectsReducer(state = [], action) {
    const {
        type,
        subjectName,
    } = action
    const previewLength = 8;
    switch (type) {
        case('library-tab'): {
            let userLibrary = await getUserLibrary();
            const followedSubjects = userLibrary.followedSubjects ?? [];
            return await Promise.all(followedSubjects.map(async subject => {
                return {
                    ...subject,
                    entries: await getEntriesFrom(subject?.entries)
                }
            }));
        }
        case('click-add-subject-to-library'): {
            let userLibrary = await getUserLibrary();
            const alreadyInLibrary = userLibrary.followedSubjects.filter(v => {
                return v.title === subjectName
            })
            if (alreadyInLibrary.length === 0) {
                // console.log('adding subjects to library')
                const entriesBySubject = await myDB.getItem('entriesBySubject')
                const isOld = lastUpdated(entriesBySubject)
                let subject = {
                    subjects: [],
                };
                if (isOld || action?.shouldForceRefresh) {
                    // console.log('fetching new subjects')
                    subject = await fetchStandardBooks();
                } else {
                    // console.log('subjects in storage')
                    subject = entriesBySubject
                }
                subject = subject.subjects
                    .filter(val => {
                        return val.title === subjectName;
                    })
                    .map(val => {
                        return {
                            title: val.title,
                            // entries: val.entries.slice(0, previewLength),
                            entries: val.entries,
                            length: val.entries.length,
                            inUserLibrary: true,
                        }
                    })[0]
                // console.log(subject)
                // console.log(userLibrary)
                let newEntry = subject
                try {
                    userLibrary.followedSubjects.push(newEntry) 
                } catch (error) {
                    userLibrary.followedSubjects = [newEntry]
                }
                await myDB.setItem('userLibrary', userLibrary)
            }
            return userLibrary.followedSubjects;
        }
        case('click-remove-subject-from-library'):  {
            let userLibrary = await getUserLibrary();
            const newCollections = userLibrary.followedSubjects.filter(v => {
                return v.title !== subjectName
            })
            userLibrary.followedSubjects = newCollections
            await myDB.setItem('userLibrary', userLibrary)

            // // Remove subject out of library
            const subject = await myDB.getItem('entriesBySubject')
            const sub = subject.subjects.filter(val => val.title === subjectName)[0];
            sub.inUserLibrary = false;
            return userLibrary.followedSubjects
        }
        default:
            return state
    }
}

const getEntriesFrom = async (entryIdArray = []) => {
    return await Promise.all(entryIdArray.map(async (id) => {
        return await bookEntires.getItem(id)
    }))
}

async function followedCategoriesReducer(state = [], action) {
    const {
        type,
        categoryName,
    } = action
    switch (type) {
        case('library-tab'): {
            let userLibrary = await getUserLibrary();
            const followedCategories = userLibrary.followedCategories ?? []
            const cats = await myDB.getItem('entriesByCategory')
            return await Promise.all(followedCategories.map(async category => {
                const categoryTerm = category.term
                const currentCategory = cats.categories.filter(val => val.term === categoryTerm)[0];
                currentCategory.entries = await getEntriesFrom(currentCategory?.entries);
                return {
                    ...currentCategory,
                }
            }));
        }
        case('click-add-category-to-library'): {
            let userLibrary = await getUserLibrary();
            const alreadyInLibrary = userLibrary.followedCategories.filter(v => {
                return v.title === categoryName
            })
            if (alreadyInLibrary.length === 0) {
                // console.log('adding subjects to library')
                const cats = await myDB.getItem('entriesByCategory')
                const category = cats.categories.filter(val => val.term === categoryName)[0];
                category.inUserLibrary = true;
                // console.log(category)
                // console.log(userLibrary)
                let newEntry = category
                try {
                    userLibrary.followedCategories.push(newEntry) 
                } catch (error) {
                    userLibrary.followedCategories = [newEntry]
                }
                await myDB.setItem('userLibrary', userLibrary)
            }

            return userLibrary.followedCategories;
        }
        case('click-remove-category-from-library'): {
            let userLibrary = await getUserLibrary();
            const newCollections = userLibrary.followedCategories.filter(v => {
                return v.title !== categoryName
            })
            userLibrary.followedCategories = newCollections
            await myDB.setItem('userLibrary', userLibrary);
            // Remove category out of library
            const cats = await myDB.getItem('entriesByCategory')
            const category = cats.categories.filter(val => val.term === categoryName)[0];
            category.inUserLibrary = false;
            return userLibrary.followedCategories
        }
        default:
            return state
    }
}

const hasFollowedCollection = async (arrayName, name = '', key = 'title') => {
    let userLibrary = await getUserLibrary();
    const filteredElement = userLibrary?.[arrayName]?.filter(v => {
        return v?.[key] === name
    })
    if (filteredElement && filteredElement?.length > 0) {
        return true
    } else {
        return false
    }
}

const isCollectionInUserLibrary = async (collectionName) => {
    return await hasFollowedCollection('followedCollections', collectionName)
}

const isCategoryInUserLibrary = async (collectionName) => {
    return await hasFollowedCollection('followedCategories', collectionName)
}

const isSubjectInUserLibrary = async (collectionName) => {
    return await hasFollowedCollection('followedSubjects', collectionName)
}

const isResultInUserLibrary = async (query) => {
    return await hasFollowedCollection('followedSearchResults', query)
}


async function activeCategoryReducer(state = null, action) {
    const {
        type,
        categoryTerm,
    } = action
    switch (type) {
        case('click-add-collection-to-library'): {
            return {
                ...state,
                inUserLibrary: true,
            }
        }
        case('click-add-category-to-library'): {
            return {
                ...state,
                inUserLibrary: true,
            }
        }
        case('click-add-subject-to-library'): {
            return {
                ...state,
                inUserLibrary: true,
            }
        }
        case('click-collection'): {
            const colls = await myDB.getItem('entriesByCollection')
            const rv = colls.collections.filter(val => val.term === categoryTerm)[0];
            const inUserLibrary = await isCollectionInUserLibrary(categoryTerm);
            return {
                ...rv,
                inUserLibrary
            }
        }
        case('click-category'): {
            const cats = await myDB.getItem('entriesByCategory')
            const currentCategory = cats.categories.filter(val => val.term === categoryTerm)[0];
            currentCategory.entries = await getEntriesFrom(currentCategory?.entries);
            const inUserLibrary = await isCategoryInUserLibrary(categoryTerm);
            return {
                ...currentCategory,
                inUserLibrary
            }
        }
        case('click-subject'): {
            const subs = await myDB.getItem('entriesBySubject')
            const subject = subs.subjects.filter(val => val.title === categoryTerm)[0];
            const entries = await getEntriesFrom(subject?.entries)
            const inUserLibrary = await isSubjectInUserLibrary(categoryTerm);
            return {
                ...subject,
                entries: entries,
                inUserLibrary
            }
        }
        case('click-new'): {
            let newEntries = await myDB.getItem('entriesNew')
            // const isOld = lastUpdated(newEntries, 1.5)
            // if (isOld) {
                try {
                    console.log('checking for new realeases...')
                    let entriesNew = await fetchNewReleases(new_url)
                    newEntries = {
                        ...entriesNew,
                        length: 30,
                        updated: new Date(),
                    }
                } catch (err) {
                    console.log('trouble fetching new releases, ', err)
                }
            // }
            const books = await getEntriesFrom(newEntries?.entries ?? [])
            return {
                ...newEntries,
                entries: books,
            }
        }
        default: {
            let isSubject = await isSubjectInUserLibrary(categoryTerm)
            let isCat = await isCategoryInUserLibrary(categoryTerm) 
            let isColl = await isCollectionInUserLibrary(categoryTerm);
            let inUserLibrary = isSubject || isCat || isColl;
            return {
                ...state,
                inUserLibrary
            };
        }
    }
}

async function activeEntryReducer(state = null, action) {
    const {
        type,
        entryId,
    } = action
    switch (type) {
        case('click-add-to-library'): 
        case('click-remove-from-library'): 
        case('click-title'): {
            const entry = await bookEntires.getItem(entryId);
            const isInLibrary = 
                await hasFollowedCollection('entries', entryId, 'id') ||
                await hasFollowedCollection('currentlyReading', entryId, 'id') 
            return {
                ...entry,
                inUserLibrary: isInLibrary,
            };
        }
        case('click-copied-share-url'): {
            const entry = await bookEntires.getItem(entryId);
            entry.wasCopySuccessfull = true;
            return entry;
        }
        default:
            return state
    }
}

const getAllBookEntires = async () => {
    const books = [];
    await bookEntires.iterate(val => {
        books.push(val)
    })
    return books
}

async function searchReducer(state = {}, action) {
    const {
        type,
        query,
    } = action;
    const books = await getAllBookEntires()
    switch(type) {
        case('search-query'):{
            const fuse = new Fuse(books, {
                keys: ['title', 'authorArray.name', 'content.children', 'categories.title', 'summary']
            })
            return {
                ...state,
                results:fuse.search(query),
                query,
            }
        }
        case('click-remove-search-results-from-library'): {
            // console.log('searchReducer click remove results');
            return {
                ...state,
                query,
                inUserLibrary: false,
            }
        }
        case('search-author'):{
            // console.log('search-author');
            const fuse = new Fuse(books, {
                keys: ['authorArray.name'],
                threshold: 0.1,
            })
            const inUserLibrary = await isResultInUserLibrary(query);
            return {
                ...state,
                results:fuse.search(query),
                query,
                inUserLibrary,
            }
            
        }
        default:
            const inUserLibrary = await isResultInUserLibrary(query);
            // console.log('searchReducer default');
            return {
                ...state,
                inUserLibrary,
            }
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
let collectionWorker;

async function initApp(state, action) {
    const {
        currentlyReading,
    } = action;

    let userLibrary = await myDB.getItem('userLibrary');
    let entriesBySubject = await myDB.getItem('entriesBySubject');
    let entriesByCategory = await myDB.getItem('entriesByCategory');
    let entriesByCollection = await myDB.getItem('entriesByCollection');

    if (
        !userLibrary ||
        !entriesByCategory ||
        !entriesBySubject
    ) {
        const bookLibrary = await fetchStandardBooks();
        await createCategroiesFrom(bookLibrary);
    }

    if (!entriesByCollection) {
        collectionWorker = new Worker("./appState.js");
        const payload = {
          action: {
            type: 'collection-tab',
            tab: 'COLLECTIONS',
            currentlyReading:'[]'
          },
        }
        collectionWorker.postMessage({type:'click', payload:JSON.stringify(payload)});
    }

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
        case('click-copied-share-url'): 
        case('click-add-to-library'):
        case('click-remove-from-library'):
        case('click-title'):{
            return true
        }
        default: 
        return false
    }
}

async function app(state = {}, action) {
    // TODO: User Created collections
    return {
        userLibrary: await userLibraryReducer(state.userLibrary, action),
        bookLibrary: await bookLibraryReducer(state.bookLibrary, action),
        activeTab: activeTabReducer(state.activeTab, action),
        activeEntry: await activeEntryReducer(state.activeEntry, action),
        activeCategory: await activeCategoryReducer(state.activeCategory, action),
        followedCollections: await followedCollectionsReducer(state.followedCollections, action),
        followedSubjects: await followedSubjectsReducer(state.followedSubjects, action),
        followedCategories: await followedCategoriesReducer(state.followedCategories, action),
        followedSearchResults: await followedSearchResultsReducer(state.followedSearchResults, action),
        isLoading: false,
        showDetailModal: showDetailModalReducer(state.showDetailModal, action),
        showSideBarMenu: sideBarReducer(state.showSideBarMenu, action),
        searchResults: await searchReducer(state.searchResults, action)
    }
}

async function populateBookEntires(subjects) {
    let bookFeedEntries = []
    await Promise.all(subjects.entries.map(async (subject) => {
        const url = subject.id
        const res = await fetch(url)
        const text = await res.text()
        const json = xmlConverter.parse(text)
        const entry = new BookFeed(json)
        bookFeedEntries.push(entry)
    }));
    const updated = new Date()
    const entriesBySubject = {subjects:bookFeedEntries, updated}
    await Promise.all(entriesBySubject.subjects.map(async bookFeed => {
        await Promise.all(bookFeed.entries.map(async entry => {
            if (entry !== undefined && entry !== null && entry?.id !== null) {
                await bookEntires.setItem(entry.id, entry)
            }
        }))
    }))
}

async function fetchStandardBooks() {
    const subjects = await fetchSubjects(subjects_url)
    const entriesBySubject = await fetchEntriesBySubject(subjects)
    await populateBookEntires(subjects)
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

    let i = 1
    const postLoading = () => {
        i = Math.min(i+4, 98);
        self.postMessage({
            type:'state',
            payload: JSON.stringify({
                isLoading: true,
                showSideBarMenu: !!state?.showSideBarMenu,
                loadingMessageindex: i,
            })
        })
    }
    if (loadingInterval !== null) {
        clearInterval(loadingInterval)
    }
    loadingInterval = setInterval(() => {
        postLoading()
    }, LOAD_TIME + (150 * Math.random()));
    switch (type) {
        case 'init': {
            console.log('init')
            state = {
                userLibrary: {},
                bookLibrary: {},
                activeTab: 'LIBRARY',
                activeEntry: null,
                activeCategory: null,
            }
            state = await initApp(state, parsedPayload.action)
            if (
                (
                    state?.userLibrary?.currentlyReading?.length === 0 &&
                    state?.userLibrary?.entries?.length === 0
                ) ||
                (
                    state?.userLibrary?.currentlyReading === undefined &&
                    state?.userLibrary?.entries === undefined
                )
            ) {
                state = await app(state, {
                    tab: 'NEW',
                    type: 'new-tab',
                    currentlyReading: state?.userLibrary?.currentlyReading,
                }) 
            }
            clearInterval(loadingInterval)
            self.postMessage({type:"initial-state", payload:JSON.stringify(state)});
            break;
        }
        case "click": {
            if (parsedPayload.action?.type === 'COLLECTION') {
                collectionWorker.terminate();
            }
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
