import { html, render } from 'https://unpkg.com/lit-html?module';
import config from './config.js'

const w = new Worker("./js/appState.js");
let state = history.state;
let lastActiveTab = ''
let previousAction = null;
const standardURL = 'https://standardebooks.org'

const log = console.log;
const populateStorage = (id, value) => {
    window.localStorage.setItem(id, value);
}
const getStorage = (id) => {
    return window.localStorage.getItem(id);
}

/* 
Reading Ease:
90+   Grade 5 Very Easy
80-90 Grade 6 Easy
70-80 Grade 7 Fairly Easy
60-70 8-9     Standard
50-60 10-12   Fairly Difficult
30-50 College Difficult
0-30  Graduate Very Difficult
*/
const EaseToGrade = (ease) => {
    if (ease >= 90) {
        return "5th Grade";
    } else if (ease >= 80 && ease < 90) {
        return "6th Grade"
    } else if (ease >= 70 && ease < 80) {
        return "7th Grade"
    } else if (ease >= 65 && ease < 70) {
        return "8th Grade"
    } else if (ease >= 60 && ease < 65) {
        return "9th Grade"
    } else if (ease >= 57 && ease < 60) {
        return "10th Grade"
    } else if (ease >= 53 && ease < 57) {
        return "11th Grade"
    } else if (ease >= 50 && ease < 53) {
        return "12th Grade"
    } else if (ease >= 30 && ease < 50) {
        return "College"
    } else if (ease >= 0 && ease < 30) {
        return "Graduate"
    }
    return null
}
const EaseToString = (ease) => {
        if (ease >= 90) {
            return "Very Easy";
        } else if (ease >= 80 && ease < 90) {
            return "Easy"
        } else if (ease >= 70 && ease < 80) {
            return "Fairly Easy"
        } else if (ease >= 60 && ease < 70) {
            return "Standard"
        } else if (ease >= 50 && ease < 60) {
            return "Fairly Difficult"
        } else if (ease >= 30 && ease < 50) {
            return "Difficult"
        } else if (ease >= 0 && ease < 30) {
            return "Very Difficult"
        }
        return null
    }
    /**
     * Service Worker
     */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log("Registered!", reg)
                    // registration worked
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
                // console.error(error.message);
            });
    }
}
// unregister()

function initializeApp(initialState, searchParams) {
  if (initialState?.tab === "LIBRARY" || initialState?.tab === "NEW" || initialState?.tab === "SEARCH") {
    lastActiveTab = initialState.tab
  }
  window.history.pushState(initialState, "", `?${searchParams}`);
  const hasPath = Array.from(searchParams).length > 0
  if (hasPath) {
    state = initialState;
    initialRenderCall(initialState);
  } else {
    let action = {
      tab: 'NEW',
      type: 'new-tab',
    }
    const searchParams = new URLSearchParams(action);
    window.history.pushState(action, "", `?${searchParams}`);
    initialRenderCall(action)
  }
}
let displayMode = 'browser tab';
window.addEventListener('DOMContentLoaded', () => {
    // TODO: Electron
    if (navigator.standalone) {
        displayMode = 'standalone-ios';
    }
    if (window.matchMedia('(display-mode: standalone)').matches) {
        displayMode = 'standalone';
    }
    console.log('DISPLAY_MODE_LAUNCH:', displayMode);

});

let elem = document.body

w.onmessage = function(event) {
    const {
        data,
    } = event
    const {
        type,
        payload,
    } = data
    switch (type) {
      case "state": {
        elem.dispatchEvent(new CustomEvent('re-render', {
          detail: payload,
        }))
        break;
      }
      case "initial-state": {
        callRender(state);
        break;
      }
      default:
        console.log(data)
        break;
    }
};

const getCurrentlyReadingStorage = () => {
    const stor = localStorage.getItem('currentlyReading')
    if (!stor) {
        return JSON.stringify([])
    } else {
        return stor
    }
}

const initialRenderCall = (state) => {
  // log('initial call render')
  w.postMessage({
      type: "init",
      payload: JSON.stringify({
          action: {
              ...state,
              currentlyReading: getCurrentlyReadingStorage()
          }
      })
  });
}

const callRender = (state) => {
  // log('call render')
  const payload = {
    action: {
      ...state,
      currentlyReading:getCurrentlyReadingStorage()
    },
  }
  // if (state?.tab !== undefined) {
  //   previousAction = state
  // }
  w.postMessage({type:'click', payload:JSON.stringify(payload)})
}

window.onload = function () {
  // log('onload')
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const urlAction = Object.fromEntries(searchParams);
  initializeApp(urlAction, searchParams)
}

window.onpopstate = function (event) {
  // log('onpopstate')
  if (event.state) {
    state = event.state
  }
  // if (previousAction !== null) {
  //     if (state.type === 'click-title' && previousAction.type !== 'click-title') {
  //         log('previous action')
  //         log(previousAction)
  //         callRender({
  //           ...previousAction,
  //           isPreviousAction: true,
  //         })
  //     }
  // }
  callRender(state)
}

function toTitleCase(str = '') {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}

const SearchBar = (queryResults) => {
  let {
    query = '',
    results = [],
  } = queryResults
  const title = toTitleCase(query)
  const submitHandler = {
    // handleEvent method is required.
    handleEvent(e) {
        e.preventDefault();
        const action = {
            type: 'search-query',
            tab: 'SEARCH',
            query,
        }
        const searchParams = new URLSearchParams(action);
        if (action?.tab === "LIBRARY" || action?.tab === "NEW" || action?.tab === "SEARCH") {
          lastActiveTab = action.tab
        }
        window.history.pushState(action, "", `?${searchParams}`);
        callRender(action)
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html `
  <form role="search" @submit=${submitHandler}><label class="no-padding" for="mySearch">You can search for a title, author, subject, etc.</label>
    <div>
      <input
        type="search"
        id="mySearch"
        name="q"
        placeholder="Search for a book..."
        .value=${query}
        @change=${e => {query = e.target.value;}}
        size="26">
      <button>Search</button>
    </div>
  </form>
  <h2>${title}</h2>
  ${results.length === 0
    ? html`${EmptySearch()}`
    : html`<ul class="list-style-none library-list no-padding">${results.map(item => {
              return html`${ItemView(item.item)}`
              })
            }</ul>`
  }`
}
const LibraryNavigation = (isActive = false) => {
  const clickHandler = clickHandlerCreator({
          type: 'library-tab',
          tab: 'LIBRARY'
        })
        // square house 
        // &#8962;
        // <div style='font-size:18px;padding-right:4px;'>&#127968;</div>
  return html`
  <button @click=${clickHandler} class="box button ${isActive ? 'active' : ''}">
    <div class="icon icon-home"></div>
    <div class="button-text">Home</div>
  </button>
  `
}
const NewBrowseNavigation = (isActive = false) => {
  const clickHandler = clickHandlerCreator({
          type: 'new-tab',
          tab: 'NEW'
        })
        // star
        // &#9734; 
        // <div style='font-size:18px;padding-right:4px;'>&#128218;</div>
    return html`
    <button @click=${clickHandler} class="box button ${isActive ? 'active' : ''}">
      <div class="icon icon-browse"></div>
      <div class="button-text">Browse</div>
    </button>
    `
  }
const SearchNavigation = (isActive = false) => {
    const clickHandler = clickHandlerCreator({
      type: 'search-tab',
      tab: 'SEARCH'
    })
    // outline search
    // &#8981;
    // left facing icon
    // &#128269;
    // right facing icon
    // &#128270;
    // <div style='font-size:18px; padding-right:4px;'>&#128269;</div>
    
    return html`
    <button @click=${clickHandler} class="box button  ${isActive ? 'active' : ''}">
        <div class="icon icon-search"></div>
        <div class="button-text">Search</div>
    </button>
    `
}
const CollectionsNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'collection-tab',
          tab: 'COLLECTIONS'
        })
        return html`<button @click=${clickHandler} class="box button">Collections</button>`
      }
const BrowseNavigation = () => {
  const clickHandler = clickHandlerCreator({
    type: 'browse-tab',
    tab: 'BROWSE'
  })
  return html`<button @click=${clickHandler} class="box button">Browse Subjects</button>`
}
const HowTo = () => html`
  <ol>
  ${displayMode = 'browser tab' ? html`<li>Add this web page to your homescreen.</li>` : ''}
  <li>Browse to add a few books.</li>
  <li>The app will remember your place. So, you can come back and pick up where you left off.</li>
  </ol>`
const HowToFollow = () => html`<h2>How to Follow Categories</h2>
  <ol>
  <li>Click a book to open its details</li>
  <li>Scroll to the bottom to view the categories the book is included in (i.e. "Irish Poetry", or "Shipwrecks--Fiction")</li>
  <li>Click a category to see similar books in that category (sometimes it's only one book)</li>
  <li>Click "Follow" to follow, and "Unfollow" to unfollow</li>
  <li>The category will show up on your home Library, and will update when there is a new book available.</li>
  </ol>`

const EmptyLibrary = () => html`<p><b>Your Library is empty.</b></p>${HowTo()}`
const EmptySearch = () => html`<p>Results are empty.</p>`

const Help = () => html`
<h2>How to</h2>
${HowTo()}
${HowToFollow()}
<b>Tips</b>
<p>Clicking the Moon/Sun button will toggle the site into dark mode</p>
<p>When reading clicking the chapter title at the top of the screen will bring up a chapter selection menu</p>
<p>If you toggle dark mode while reading a book, you may need to refresh the page for the colors to load correctly.</p>
<p><small>version: ${config.version}</small></p>
`

const ItemView = (entry, isLibraryListView = false) => {
  const {
    id,
    thumbnail,
    title,
    ebookLink,
  } = entry;
  const readLink = `/ebook.html?book=${ebookLink?.href}`
  const clickOpenBook = clickHandlerCreator({}, () => {window.location.href = readLink})
  const clickOpenDetailView = clickHandlerCreator({
    type: 'click-title',
    entryId: entry?.id,
  });
  return html`
  <li class="library-list-image">
    <a href="" @click=${isLibraryListView ? clickOpenBook : clickOpenDetailView} >
      <img crossorigin='anonymous' class="book-cover" loading=lazy id=${id} width=350 height=525 src=${standardURL + thumbnail?.href} alt=${title}/>
    </a>
    <div class="card-body" @click=${clickOpenDetailView}>
    ${isLibraryListView
      ? html`
        <a href="" class="information-icon">&#9432;</a>
      `
      : html`
        <a href=""><b id=${entry?.id}>${entry?.title}</b></a>
        <p id=${entry?.id}>${entry?.summary}</p>
        `}
    </div>
  </li>`}
const LibraryList = (items = []) => {
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`<ul class="library-list">${items.map((item) => ItemView(item, true))}</ul>`
  }`}


/**
 * Sort array of objects based on another array
 */

function mapOrder (array, order, key) {
  
  array.sort( function (a, b) {
    var A = a[key], B = b[key];
    if (order.indexOf(A) === -1) {
      return -1;
    }
    if (order.indexOf(B) === -1) {
      return -1;
    }
    if (order.indexOf(A) > order.indexOf(B)) {
      return -1;
    } else {
      return 1;
    }
    
  });
  
  return array.reverse();
};


const Library = (userLibrary) => {
  const {
    entries = [],
    currentlyReading = [],
    moreByThisAuthor = {},
    series = [],
    title,
  } = userLibrary
  const dupBooks = [...currentlyReading, ...entries]
  const books = Array.from(new Set(dupBooks.map(a => a?.id)))
        .map(id => dupBooks.find(a => a.id === id))
  const firstBook = books.shift()
  return html`
    <h3>Currently reading</h3>
    <ul class="library-list">${ItemView(firstBook, true)}</ul>
    <h3>Recently read</h3>
    ${LibraryList(books)}
    ${moreByThisAuthor?.length > 1 || series?.length > 0 ? (
      html`
      <h3>For you</h3>
      <p><small>We think you might like these as well</small><p>
    `) : (
      ''
    )}
    ${moreByThisAuthor?.length > 1
      ? html`
      ${Browse([moreByThisAuthor], {isAuthor: true}, html`<h3>More by ${moreByThisAuthor?.title}</h3>`)}
      `
      : html``}
    ${series?.length
    ? html`
      ${Browse(series, {isCollection: true}, html`<h3>The ${series?.[0]?.title} series</h3>`)}
    `
    : html`
    `}
  `
}

function collectionID(entry, subjectTitle) {
  return entry?.collection?.filter(val => val.title === subjectTitle)[0]?.position
}

const SubjectEntry = (entry, isCoverOnly = true, subjectTitle = '') => {
  const clickHandler = clickHandlerCreator({
    type: 'click-title',
    entryId: entry?.id,
  })
  const collectionNum = collectionID(entry, subjectTitle)
  return entry === null ? html``: html`
    <li class="subject-list-image" @click=${clickHandler}>
      <div class="collectionId">${collectionNum}</div>
      <img crossorigin='anonymous' class="book-cover" loading=lazy id=${entry?.id} width=350 height=525 src=${standardURL + entry?.thumbnail?.href} alt=${entry?.title}/>
      ${isCoverOnly
        ? ''
        : html`
        <div class="card-body">
        <a href=""><b id=${entry?.id}>${entry?.title}</b></a>
        <p id=${entry?.id}>${entry?.summary}</p>
        </div>`}
    </li>
  `
}

const New = (subject) => {
  const {
    title,
    entries,
  } = subject;
  const clickHandler = clickHandlerCreator({
    type: 'click-new',
    categoryTerm: title,
    tab: 'SUBJECT',
  })
  return html`
  ${FollowTitle(`${title} ${entries?.length ? `(${entries.length})` : ''}`, clickHandler)}
  <ul class="subject-list">
    ${entries.map(entry => {
      return SubjectEntry(entry)
    })}
  </ul>
  `
}
const Collection = (subject) => {
  const {
    title,
    entries,
    length,
  } = subject;
  const clickHandler = clickHandlerCreator({
    type: 'click-collection',
    categoryTerm: title,
    tab: 'COLLECTION',
  })
  const list = entries.sort((a,b) => parseInt(collectionID(a, title)) - parseInt(collectionID(b, title)))
  return html`
  <h3 class="pointer" @click=${clickHandler}><a href="">${title} (${length})</a></h3>
  <ul class="subject-list">
    ${list.map(entry => {
      return SubjectEntry(entry)
    })}
  </ul>
  `
}

const Collections = (items = []) => {
  const list = items.sort((a,b) => parseInt(b.length) - parseInt(a.length))
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`${list.map(subject => {
                    return html`${Collection(subject)}`
                    })
            }`
  }`}

const Subjects = (subject, {isAuthor, isSubject, isCategory, isCollection}, Title) => {
  if (subject !== null) {
  const {
    title,
    entries,
    length,
  } = subject;
  const clickCollection = clickHandlerCreator({
    type: 'click-collection',
    categoryTerm: title,
    tab: 'COLLECTION',
  })
  const clickCategory = clickHandlerCreator({
    type: 'click-category',
    categoryTerm: title,
    tab: 'CATEGORY',
  })
  const clickSubject = clickHandlerCreator({
    type: 'click-subject',
    categoryTerm: title,
    tab: 'SUBJECT',
  })
  const clickAuthor = clickHandlerCreator({
    type:'search-author',
    tab:'AUTHOR',
    query: title,
  })
  return html`${Title === null ? html`
  <h3 class="pointer" @click=${
    (isSubject && clickSubject)
    || (isAuthor && clickAuthor)
    || (isCategory && clickCategory)
    || (isCollection && clickCollection)}><a href="">${title} ${length ? `(${length})` : ''}</a></h3>
    ` : Title}
  <ul class="subject-list">
    ${entries.map(entry => {
      return SubjectEntry(entry)
    })}
  </ul>
  `
}
}

const Browse = (
    items = [],
    {
      isAuthor = false,
      isSubject = false,
      isCategory = false,
      isCollection = false
    },
    Title = null,
    ) => {
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`${items.map(subject => {
                    return html`${Subjects(subject, {isAuthor, isSubject, isCategory, isCollection}, Title)}`
                    })
            }`
  }`}

const Subject = (category) => {
    const {
      title,
      entries,
      inUserLibrary,
    } = category;
    const isCoverOnly = false;
    const removeHandler = clickHandlerCreator({
      type:'click-remove-subject-from-library',
      subjectName: title
    })
    const clickHandler = clickHandlerCreator({
      type:'click-add-subject-to-library',
      subjectName: title
    })
    // <h2>${title}</h2>
    return html`
    ${title !== 'Newest 30 Standard Ebooks' ? html`
      <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Home' : 'Add to Home'}</b></button>
    ` : html``}
    <ul class="category-list">
      ${entries.map(entry => {
        return SubjectEntry(entry, isCoverOnly)
      })}
    </ul>`
  }
const Category = (category) => {
  const {
    title,
    entries,
    inUserLibrary,
  } = category;
  const isCoverOnly = false;
  const removeHandler = clickHandlerCreator({
    type:'click-remove-category-from-library',
    categoryName: title
  })
  const clickHandler = clickHandlerCreator({
    type:'click-add-category-to-library',
    categoryName: title
  })
  // <h2>${title}</h2>
  return html`
  <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Home' : 'Add to Home'}</b></button>
  <ul class="category-list">
    ${entries.map(entry => {
      return SubjectEntry(entry, isCoverOnly)
    })}
  </ul>`
}
const CollectionCategory = (category) => {
  const {
    title,
    entries,
    inUserLibrary = false,
  } = category;
  const isCoverOnly = false;
  const removeHandler = clickHandlerCreator({
    type:'click-remove-collection-from-library',
    collectionName: title
  })
  const clickHandler = clickHandlerCreator({
    type:'click-add-collection-to-library',
    collectionName: title
  })
  const list = entries.sort((a,b) => parseInt(collectionID(a, title)) - parseInt(collectionID(b, title)))
  // <h2>${title}</h2>
  return html`
  <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Home' : 'Add to Home'}</b></button>
  <p>All items in the collection are not yet in the public domain. So, there may be gaps.</p>
  <ul class="category-list">
    ${list.map(entry => {
      return SubjectEntry(entry, isCoverOnly, title)
    })}
  </ul>`
}

const emptyState = {
  userLibrary:{},
  bookLibrary:{},
  followedCollections: [],
  followedCategories: [],
  followedSubjects: [],
  activeTab:'LIBRARY',
}

const AuthorList = (queryResults) => {
  const {
    query = '',
    results,
    inUserLibrary,
  } = queryResults
  const title = toTitleCase(query)
  const removeHandler = clickHandlerCreator({
    type:'click-remove-search-results-from-library',
    subjectName: title,
    query,
  })
  const clickHandler = clickHandlerCreator({
    type:'click-add-search-results-to-library',
    subjectName: title,
    query,
  })
  // <h2>${title}</h2>
  return html`
  <button class="follow" role="button" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Home' : 'Add to Home'}</b></button>
  <ul class="list-style-none">
    ${results.length === 0
      ? html`${EmptySearch()}`
      : html`${results.map(item => {
                return html`${SubjectEntry(item.item, false)}`
                })
              }`
    }
  </ul>`
}

const ViewAuthorArray = (authorArray) => {
  return authorArray.map(author => {
    const clickAuthor = clickHandlerCreator({
      type:'search-author',
      tab:'AUTHOR',
      query: author.name,
    })
    return html`<p><a href="" class="pointer" @click=${clickAuthor}>${author.name}</a></p>`
  })
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
      // return `<${content?.tagName}${content?.attributes ? createAttributes(content?.attributes) : ''}>${content?.children.map((child) => convertContentToString(child)).join('')}</${content?.tagName}>`
  } else {
      return  `${content}`
  }
}

const DetailView = (entry) => {
  const {
    ebookLink,
    thumbnail,
    title,
    authorArray,
    summary,
    content,
    categories,
    inUserLibrary,
    wasCopySuccessfull = false,
    collection = [],
  } = entry






  const readLink = `/ebook.html?book=${ebookLink.href}`
  const READINGEASEID = `${ebookLink.href}.epub-readingEase`
  const readingEase = getStorage(READINGEASEID) ?? 'unknown'
  const clickAdd = clickHandlerCreator({
    type: 'click-add-to-library',
    entryId: entry.id,
  }, () => {window.location.href = readLink})
  const clickRemove = () => {
    // Remove from cookie
    let currentBooks = JSON.parse(getCurrentlyReadingStorage())
    const bookParam = ebookLink.href
    if (currentBooks.length > 0) {
        if (currentBooks.includes(bookParam)) {
          const index = currentBooks.findIndex(v => v === bookParam);
          currentBooks.splice(index, 1);
        }
        populateStorage('currentlyReading', JSON.stringify(currentBooks))
    }
    return clickHandlerCreator({
      type: 'click-remove-from-library',
      entryId: entry.id,
    })
  }
  const clickClose = clickHandlerCreator({
    type: 'click-close-details-modal',
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelector('.close').click()
    }
  }, {once: true})
  const shareURL = `https://standard-ebook-reader.web.app${readLink}`
  const shareData = {
    title: title,
    text: summary,
    url: shareURL,
  }
  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareURL);
      // console.log('Page URL copied to clipboard');
      callRender({
        type: 'click-copied-share-url',
        entryId: entry.id,
      })
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
  const shareHandler = async () => {
    try {
      await navigator.share(shareData)
      // log('shared successfully')
    } catch(err) {
      log('Error: ' + err)
      await copyShareUrl();
    }
  }
  // const cacheBook = async () => {
  //     const url = `https://standardebooks.org${ebookLink.href}.epub`;
  //     await fetch(url);
  // }
  return html`
    <div class="modal">
      <div class="modal-content">
        <button @click=${clickClose} class="close">X</button>
        <a href="" @click=${clickAdd}>
          <img crossorigin='anonymous' class="img-fluid detail-book-cover " src=${standardURL + thumbnail.href} />
        </a>
        <div>
          <h2 class="pointer"><a href="" @click=${clickAdd}>${title}</a></h2>
          <button @click=${shareHandler} class="share ${wasCopySuccessfull ? 'copied':''}">${wasCopySuccessfull ? html`&#9989;` : html`&#128279;`}</button>
          <button class="follow" @click=${inUserLibrary ? clickRemove() : clickHandlerCreator({
            type: 'click-add-to-library',
            entryId: entry.id,
          })}><b>${inUserLibrary ? 'Remove from Home' : 'Add to Home'}</b></button>
          ${ViewAuthorArray(authorArray)}
          <p><span title="${EaseToString(readingEase)}">${EaseToGrade(readingEase) ? `${EaseToGrade(readingEase)} Reading Level` : ''}</span></p>
          <p>${convertContentToString(content)}</p>
          ${collection.length ? (
            html`<b>Collections</b>
            ${CollectionList(collection)}`
          ) : ''}
          ${categories.length ? (
            html`<b>Categories</b>
            ${CategoryList(categories)}`
          ) : ''}
        </div>
      </div>
    </div>
  `
}
const clickHandlerCreator = (action, cb = () => {}) => {
  return {
    // handleEvent method is required.
    handleEvent(e) {
      e.preventDefault();
      const searchParams = new URLSearchParams(action);
      if (action?.tab === "LIBRARY" || action?.tab === "NEW" || action?.tab === "SEARCH") {
        lastActiveTab = action.tab
      }
      window.history.pushState(action, "", `?${searchParams}`);
      callRender(action)
      cb()
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
}

const CollectionList = (collection) => {
  return html`
  <ul class="list-style-none">
  ${collection.map(cat => {
    const clickHandler = clickHandlerCreator({
      type: 'click-collection',
      categoryTerm: cat.term,
      tab: 'COLLECTION',
    })
    return html`<li class="category-list-item pointer" @click=${clickHandler}><a href="">${cat.term}</a> #${cat.position}</li>`
  })}
  </ul>
  `
}

const CategoryList = (categories) => {
  return html`
  <ul class="list-style-none">
  ${categories.map(cat => {
    const clickHandler = clickHandlerCreator({
      type: 'click-category',
      categoryTerm: cat.term,
      tab: 'CATEGORY',
    })
    return html`<li class="category-list-item pointer" @click=${clickHandler}><a href="">${cat.term}</a></li>`
  })}
  </ul>
  `
}
const FollowTitle = (titleText, clickHandler, linkText = 'See All') => html`
<div class="flex-title">
  <h2 @click=${clickHandler}>
  <a href="">${titleText}</a>
  </h2>
  <h2>
    <strong class="pointer see-all" @click=${clickHandler}>${linkText} ></strong>
  </h2>
</div>`
const AllCollections = () => {
  const clickHandler = clickHandlerCreator({
    type: 'collection-tab',
    tab: 'COLLECTIONS'
  })
  return html`
  ${FollowTitle('By Collection', clickHandler)}
  `
}
const FollowedCollections = (followedCollections) => {
  const isCollection = true
  const clickHandler = clickHandlerCreator({
    type: 'collection-tab',
    tab: 'COLLECTIONS'
  })
  return followedCollections.length
  ? html`
  ${Browse(followedCollections, {isCollection})}
  `
  : html``
}
const AllSubjects = () => {
  const clickHandler = clickHandlerCreator({
    type: 'browse-tab',
    tab: 'BROWSE',
  })
  return html`
  ${FollowTitle('By Subject', clickHandler)}
  `
}
const FollowedSubjects = (followedSubjects) => {
  const isSubject = true
  const clickHandler = clickHandlerCreator({
    type: 'browse-tab',
    tab: 'BROWSE',
    shouldForceRefresh: true,
  })
  return followedSubjects.length
  ? html`
  ${Browse(followedSubjects, {isSubject})}
  `
  : html``
}
const FollowedAuthors = (followedAuthors) => {
  const isAuthor = true
  return followedAuthors.length
  ? html`
  ${Browse(followedAuthors, {isAuthor})}
  `
  : html``
}
const AllCategories = () => {
  const clickHandler = clickHandlerCreator({
    type:'help-tab',
    tab: 'HELP'
  })
  return html`
  ${FollowTitle('By Category', clickHandler, 'Learn')}
  `
}
const FollowedCategories = (followedCategories) => {
  const isCategory = true
  const clickHandler = clickHandlerCreator({
    type:'help-tab',
    tab: 'HELP'
  })
  return followedCategories.length
  ? html`
  ${Browse(followedCategories, {isCategory})}
  `
  : html``
}
const Breadcrumbs = (props) => {
  const {activeTab, activeCategory} = props;
  const browseHandler = clickHandlerCreator({
    type: 'new-tab',
    tab: 'NEW'
  })
  const allSubjectsHandler = clickHandlerCreator({
    type: 'browse-tab',
    tab: 'BROWSE',
  })
  const allCollectionsHandler = clickHandlerCreator({
    type: 'collection-tab',
    tab: 'COLLECTIONS'
  })
  const BROWSETITLE = "Browse Books"
  const COLLECTIONTITLE = "By Collection"
  const SUBJECTTITLE = "By Subject"
  switch(activeTab) {
    case('BROWSE'):{
      return html`
      <div class="top-nav__breadcrumb">
        <a class="pointer" @click=${browseHandler}>${BROWSETITLE}</a> | ${SUBJECTTITLE}
      </div>
      `
    }
    case('SUBJECT'):{
      return activeCategory?.title === "Newest 30 Standard Ebooks" ? (
        html`
        <div class="top-nav__breadcrumb">
          <a class="pointer" @click=${browseHandler}>${BROWSETITLE}</a> | ${activeCategory?.title}
        </div>
        `
      ) : (html`
      <div class="top-nav__breadcrumb">
        <a class="pointer" @click=${browseHandler}>${BROWSETITLE}</a> | <a class="pointer" @click=${allSubjectsHandler}>${SUBJECTTITLE}</a> | ${activeCategory?.title}
      </div>
      `)
    }
    case('COLLECTIONS'): {
      return html`
      <div class="top-nav__breadcrumb">
        <a class="pointer" @click=${browseHandler}>${BROWSETITLE}</a> | ${COLLECTIONTITLE}
      </div>
      `
    }
    case('COLLECTION'): {
      return html`
      <div class="top-nav__breadcrumb">
        <a class="pointer" @click=${browseHandler}>${BROWSETITLE}</a> | <a class="pointer" @click=${allCollectionsHandler}>${COLLECTIONTITLE}</a> | ${activeCategory?.title}
      </div>
      `
    }
    default: {
      return html``
    }
  }
}
const SideNavTitle = (props) => {
  const {activeTab, searchResults, activeCategory} = props
  const BROWSETITLE = "Browse Books"
  switch(activeTab) {
    case('AUTHOR'): {
      return html`
      ${toTitleCase(searchResults.query)}
      `
    }
    case('BROWSE'):{
      return html`
      Subjects
      `
    }
    case('SUBJECT'):
    case('COLLECTION'): 
    case('CATEGORY'): {
      return html`
      ${activeCategory?.title}
      `
    }
    case('NEW'): {
      return html`
      ${BROWSETITLE}
      `
    }
    case('LIBRARY') : {
      return html`
      My Library
      `
    }
    default: {
      return html`
      ${toTitleCase(activeTab ? activeTab : 'Standard Ebooks')}
      `
    }
  }
}

const LoadingMessages = (index = 1) => {
  return html`
  <div id="myProgress">
    <div id="myBar" style="width:${index}%"></div>
  </div>
  `
}

const TimeGoals = () => {
  return html`
  Time Goals
  `
}


function hideOnClickOutside(element) {
  const outsideClickListener = event => {
      // if (!element.contains(event.target) && isVisible(element)) { // or use: event.target.closest(selector) === null
      if (event.target.closest(selector) === null) {
        element.style.display = 'none'
        removeClickListener()
      }
  }

  const removeClickListener = () => {
      document.removeEventListener('click', outsideClickListener)
  }

  document.addEventListener('click', outsideClickListener)
}

// const isVisible = elem => !!elem && !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length ) // source (2018-03-11): https://github.com/jquery/jquery/blob/master/src/css/hiddenVisibleSelectors.js 
























let isDetailModalOpen = false;
// const bodyClickListener = function (event) {
//   // only fire close modal action if showDetailModal is true and they clikc outside the modal
//   // As well as click outside of the flyout to close the flyout, only if it is open
//   if (isDetailModalOpen) {
//     if (event.closest()) {
      
//     }
//   }

// }
// document.body.addEventListener('click', bodyClickListener, false);

function rerender(props) {
  const {
    detail = '{}',
  } = props
  const state = JSON.parse(detail ?? '{}')
  const app = (state = emptyState) => {
    const {
      userLibrary,
      bookLibrary,
      activeTab = '',
      activeCategory,
      activeEntry,
      followedCollections,
      followedSubjects,
      followedCategories,
      followedSearchResults,
      searchResults,
      showDetailModal,
      isLoading,
      loadingMessageindex,
    } = state
    isDetailModalOpen = showDetailModal;
    const TabContent = (activeTab) => {
      switch(activeTab) {
        case('LIBRARY'): {
          return html`
            ${Library(userLibrary)}
            ${(
              followedSearchResults?.length > 0 ||
              followedCollections?.length > 0 ||
              followedSubjects?.length > 0 ||
              followedCategories?.length > 0
            ) ? html`
            <h3>Collections you follow</h3>
            ` : ''}
            ${FollowedAuthors(followedSearchResults)}
            ${FollowedCollections(followedCollections)}
            ${FollowedSubjects(followedSubjects)}
            ${FollowedCategories(followedCategories)}
            ${TimeGoals()}
          `
        }
        case('BROWSE'): {
          const isSubject = true
          return Browse(bookLibrary, {isSubject});
        }
        case('COLLECTIONS'): {
          return Collections(bookLibrary);
        }
        case('NEW'): {
          return html`
          ${New(bookLibrary)}
          ${AllSubjects()}
          ${AllCollections()}
          ${AllCategories()}
          `
        }
        case('SUBJECT'): {
          return Subject(activeCategory);
        }
        case('CATEGORY'): {
          return Category(activeCategory);
        }
        case('COLLECTION'): {
          return CollectionCategory(activeCategory);
        }
        case('SEARCH'): {
          return SearchBar(searchResults)
        }
        case('AUTHOR'):{
          return AuthorList(searchResults)
        }
        case('HELP'): {
          return Help()
        }
        default:
          return html`Default View. Not yet implemented.`;
      }
    }
    const helpHandler = clickHandlerCreator({
      type:'help-tab',
      tab: 'HELP'
    })
    if (
      (lastActiveTab === '' || lastActiveTab !== "LIBRARY" || lastActiveTab !== "NEW" || lastActiveTab !== "SEARCH") &&
      (activeTab === "LIBRARY" || activeTab === "NEW" || activeTab === "SEARCH")
    ) {
      lastActiveTab = activeTab
    }
    if (showDetailModal) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
    return html`
      ${isLoading ? html`
        ${LoadingMessages(loadingMessageindex)}
      `: ""}
      <div class="title-bar">
        <span class="open-nav-button" onclick="toggleSideNav()">&#9776;</span>
        <h1 class="title">
          ${SideNavTitle({activeTab, searchResults, activeCategory})}
        </h1>
        <button name="Toggle dark mode" role="button" value="light" id="dark-button">&nbsp;</button>
      </div>
      <div id="mySidenav" class="sidenav">
        <span class="open-nav-button" onclick="toggleSideNav()">&#9776;</span>
        <h2 class="title">
          ${SideNavTitle({activeTab, searchResults, activeCategory})}
        </h2>
        <nav class="parent-nav">
          <div class="parent">
            ${LibraryNavigation(lastActiveTab === "LIBRARY")}
            ${NewBrowseNavigation(lastActiveTab === "NEW")}
            ${SearchNavigation(lastActiveTab === "SEARCH")}
          </div>
        </nav>
      </div>
      <div id="main" class="main">
        ${Breadcrumbs({activeTab, searchResults, activeCategory})}
        ${!isLoading ? html`
          ${TabContent(activeTab)}
          <footer>
            ${activeTab === "HELP" ? '' : html`<a class="pointer" @click=${helpHandler}>Help</a>`}
            <p id="credit">Credit to <a href="https://standardebooks.org">Standard Ebooks</a> for the curated list.</p>
            <p>Made with <i class="icon-heart"></i> by <a href="https://github.com/bdirgo/standard-ebook-reader">Benjamin Dirgo</a></p>
          </footer> 
        ` : ''}
        ${showDetailModal ? DetailView(activeEntry) : html``}
      </div>
      <nav class="parent-nav mobile-nav">
        <div class="parent">
          ${LibraryNavigation(lastActiveTab === "LIBRARY")}
          ${NewBrowseNavigation(lastActiveTab === "NEW")}
          ${SearchNavigation(lastActiveTab === "SEARCH")}
        </div>
      </nav>
    `
  }
  console.log(state)
  render(app(state), document.querySelector('#result'))
}
document.querySelector('.first-content').hidden = true
rerender({detail: JSON.stringify({isLoading:true, showSideBarMenu:'show'})})

elem.addEventListener('re-render', (e) => rerender({detail: e.detail}))

const closeModalForSwipe = () => {
  const action = {
    type: 'click-close-details-modal',
  }
  const searchParams = new URLSearchParams(action);
  window.history.pushState(action, "", `?${searchParams}`);
  callRender(action)
}

document.addEventListener('swiped-down', function(e) {
  // console.log("swiped-down");
  // console.log(e.target); // element that was swiped
  // console.log(e.detail); // see event data below
  const {
    yEnd,
    yStart,
  } = e.detail
  const changeY = yEnd - yStart;
  const modalEl = document.querySelector(".modal")
  if (modalEl !== null) {
    if (modalEl.scrollTop === 0) {
      if(changeY > 100) {
        // Close modal
        closeModalForSwipe()
      }
    }
  }
});

document.addEventListener('swiped-up', function(e) {
  // console.log("swiped-up");
  // {
  //   dir: 'up',            // swipe direction (up,down,left,right)
  //   touchType: 'direct',  // touch type (stylus,direct) - stylus=apple pencil and direct=finger
  //   xStart: 196,          // x coords of swipe start
  //   xEnd: 230,            // x coords of swipe end
  //   yStart: 196,          // y coords of swipe start
  //   yEnd: 4               // y coords of swipe end
  // }
  const {
    yEnd,
    yStart,
  } = e.detail
  const changeY = yStart - yEnd;
  const modalEl = document.querySelector(".modal")
  if (modalEl !== null) {
    if (window.innerHeight + modalEl.scrollTop === modalEl.scrollHeight) {
      if(changeY > 100) {
        // Close modal
        closeModalForSwipe()
      }
    }
  }
});
const sideNav = document.getElementById("mySidenav")
sideNav.addEventListener('click',function(event) {
  if (event.target.closest('button')) {
    sideNav.classList.remove("open")
  }
},false)