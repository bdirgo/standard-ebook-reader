importScripts(
    '../lib/localforage.js',
    '../lib/tXml.js',
)
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
        this.content = this.filterContent(json)
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
        // TODO: fill this out
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
    }
}

async function fetchSubjects(subjects_url) {
    const response = await fetch(subjects_url)
    const text = await response.text()
    const rawJSON = xmlConverter.parse(text)
    const subjects = new SubjectFeed(rawJSON)
    localforage.setItem('subjects', subjects)
    return subjects
}

async function fetchNewReleases(new_url) {
    const response = await fetch(new_url)
    const text = await response.text()
    const rawJSON = xmlConverter.parse(text)
    const entry = new BookFeed(rawJSON)
    localforage.setItem('entriesNew', entry)
    return entry
}

async function fetchEntries(subjects) {
    let entries = []
    await Promise.all(subjects.entries.map(async (subject) => {
        const url = subject.id
        const res = await fetch(url)
        const text = await res.text()
        const rawJSON = xmlConverter.parse(text)
        const entry = new BookFeed(rawJSON)
        entries.push(entry)
    }));
    localforage.setItem('entriesBySubject', entries)
    return entries
}

function createCategroiesFrom(entriesBySubject) {
    let categoriesFound = []
    entriesBySubject.forEach(bookFeed => {
        bookFeed.entries.forEach(entry => {
            const catArray = entry.categories
            localforage.setItem(entry.id, entry)
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
        })
    })
    categoriesFound.sort((a, b) => b.entries.length - a.entries.length)
    localforage.setItem('entriesByCategory', categoriesFound)
    return categoriesFound
}

async function createUserLibrary(entryId) {
    const firstEntry = await localforage.getItem(entryId);
    const userLibrary = new MyLibrary({term: "My Library"})
    userLibrary.addEntry(firstEntry)
    localforage.setItem('userLibrary', userLibrary)
    return userLibrary
}

const all_url = 'https://standardebooks.org/opds/all';
const new_url = 'https://standardebooks.org/opds/new-releases';
const subjects_url = 'https://standardebooks.org/opds/subjects';
// const query_url = `https://standardebooks.org/opds/all?query=${q}`

async function userLibraryReducer(state = [], action) {
    const {
        type,
        entryId,
    } = action;
    switch (type) {
        case('library-tab'): {
            const userLibrary = await localforage.getItem('userLibrary')
            if (!userLibrary) {
                return []
            } else {
                return userLibrary
            }
        }
        case('click-add-to-library'): {
            let userLibrary = await localforage.getItem('userLibrary')
            console.log(userLibrary)
            if (!userLibrary) {
                console.log('creating Library')
                userLibrary = await createUserLibrary(entryId)
            } else {
                const newEntry = await localforage.getItem(entryId);
                userLibrary.entries.push(newEntry)
                localforage.setItem('userLibrary', userLibrary)
            }
            return userLibrary;
        }
        case('browse-tab'):
        case('new-tab'):
        case('search-tab'): {
            return null;
        }
        default:
            return state
    }
}

async function bookLibraryReducer(state = [], action) {
    switch (action.type) {
        case('browse-tab'): {
            // TODO: add date to "my" database
            //       don't chek when "they" update
            const entriesBySubject = await localforage.getItem('entriesBySubject')
            if (!entriesBySubject) {
                console.log('no subjects')
                bookLibrary = await fetchStandardBooks();
            } else {
                console.log('subjects in storage')
                bookLibrary = entriesBySubject
            }
            bookLibrary = bookLibrary
                .map(val => {
                    return {
                        title: val.title,
                        entries: val.entries.slice(0, 4)
                    }
                })
            // TODO: Assuming Fetch is successful...
            return bookLibrary;
        }
        case('new-tab'): {
            let entriesNew = await localforage.getItem('entriesNew')
            if (!entriesNew) {
                entriesNew = await fetchNewReleases(new_url)
            } 
            entriesNew = {
                title: entriesNew.title,
                entries: entriesNew.entries.slice(0, 4)
            }
            return entriesNew
        }
        case('library-tab'):
        case('search-tab'): {
            return null;
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
        case('click-title'): 
        case('click-add-to-library'): 
        case('library-tab'): 
        case('new-tab'): 
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
        case('click-category'): {
            const cats = await localforage.getItem('entriesByCategory')
            return cats.filter(val => val.term === categoryTerm)[0];
        }
        case('click-subject'): {
            const subjects = await localforage.getItem('entriesBySubject')
            return subjects.filter(val => val.title === categoryTerm)[0];
        }
        case('click-new'): {
            const newEntries = await localforage.getItem('entriesNew')
            entriesNew = {
                title: newEntries.title,
                entries: newEntries.entries
            }
            return entriesNew
        }
        case('click-category-close'):
        case('browse-tab'):
            return null;
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
        case('click-title'): {
            return await localforage.getItem(entryId);
        }
        case('click-title-close'):
        case('browse-tab'):
        case('library-tab'):
        case('click-category'):
            return null;
        default:
            return state
    }
}

async function setInitialState(
    userLibrary = [],
    bookLibrary = [],
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

async function initApp(state) {
    const rv = app(state, {
        type: 'library-tab',
        tab: 'LIBRARY'
      });
    // populate database if it doesnt exist
    await app(state, {
        type: 'browse-tab',
      });
    return rv
}

async function app(state = {}, action) {
    return {
        userLibrary: await userLibraryReducer(state.userLibrary, action),
        bookLibrary: await bookLibraryReducer(state.bookLibrary, action),
        activeTab: activeTabReducer(state.activeTab, action),
        activeEntry: await activeEntryReducer(state.activeEntry, action),
        activeCategory: await activeCategoryReducer(state.activeCategory, action),
    }
}

async function fetchStandardBooks() {
    const subjects = await fetchSubjects(subjects_url)
    const newReleases = await fetchNewReleases(new_url)
    const entriesBySubject = await fetchEntries(subjects)
    const entriesByCategory = createCategroiesFrom(entriesBySubject)
    return entriesBySubject
}

let state;

self.onmessage = async function(event) {
  const {
      type,
      payload,
  } = event.data;

  switch (type) {
    case "init": {
        state = await setInitialState()
        state = await initApp(state)
        self.postMessage({type:"state", payload:JSON.stringify(state)});
        break;
    }
    case "click": {
        const parsedPayload = JSON.parse(payload)
        console.log(parsedPayload)
        state = await app(state, parsedPayload.action)
        self.postMessage({type:"state", payload:JSON.stringify(state)});
        break;
    }
    default: {
      break;
    }
  }
}
