import { html, render } from 'https://unpkg.com/lit-html?module';

const w = new Worker("./js/appState.js");
let state = history.state;
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
                console.error(error.message);
            });
    }
}
// unregister()

function initializeApp (state, searchParams) {
  window.history.replaceState(state, "", `?${searchParams}`);
  initialRenderCall();
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

const initialRenderCall = () => {
  log('initial call render')
  w.postMessage({
      type: "init",
      payload: JSON.stringify({
          action: {
              currentlyReading: getCurrentlyReadingStorage()
          }
      })
  });
}

const callRender = (state) => {
  const payload = {
    action: {
      ...state,
      currentlyReading:getCurrentlyReadingStorage()
    },
  }
  w.postMessage({type:'click', payload:JSON.stringify(payload)})
}

window.onload = function () {
  log('onload')
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const urlAction = Object.fromEntries(searchParams);
  initializeApp(urlAction, searchParams)
}

window.onpopstate = function (event) {
  log('onpopstate')
  if (event.state) {
    state = event.state
  }
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
const LibraryNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'library-tab',
          tab: 'LIBRARY'
        })
        // square house 
        // &#8962;
  return html`<button @click=${clickHandler} class="box button"><span style='font-size:18px;padding-right:4px;'>&#127968;</span><span style='font-size:18px;padding-left:4px;'>Home</span></button>`
}
const NewBrowseNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'new-tab',
          tab: 'NEW'
          // type: 'click-new',
          // // TODO: GET RID OF THIS MAGIC STRING
          // categoryTerm: "Newest 30 Standard Ebooks",
          // // END TODO: GET RID OF THIS MAGIC STRING
          // tab: 'SUBJECT',
        })
        // star
        // &#9734; 
        return html`<button @click=${clickHandler} class="box button">&nbsp;<span style='font-size:18px;padding-right:4px;'>&#128218;</span><span style='font-size:18px;padding-left:4px;'>Browse</span></button>`
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
const SearchNavigation = () => {
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
  
  return html`<button @click=${clickHandler} class="box button"><span style='font-size:18px; padding-right:4px;'>&#128269;</span><span style='font-size:18px; padding-left:4px;'>Search</span></button>`
}
const HowTo = () => html`
  <ol>
  <li>Add this web page to your homescreen.</li>
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
  const standardURL = 'https://standardebooks.org/'
  return html`
  <li class="library-list-image">
    <img @click=${isLibraryListView ? clickOpenBook : clickOpenDetailView} class="book-cover" loading=lazy id=${id} width=350 height=525 src=${standardURL + thumbnail?.href} alt=${title}/>
    <div class="card-body" @click=${clickOpenDetailView}>
    ${isLibraryListView
      ? html`
        <a class="information-icon">&#9432;</a>
      `
      : html`
        <a><b id=${entry?.id}>${entry?.title}</b></a>
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
    title,
  } = userLibrary
  const dupBooks = [...currentlyReading, ...entries]
  const books = Array.from(new Set(dupBooks.map(a => a?.id)))
        .map(id => dupBooks.find(a => a.id === id))
  return html`
    <h2>Currently reading</h2>
    ${LibraryList(books)}
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
  const standardURL = 'https://standardebooks.org/'
  return entry === null ? html``: html`
    <li class="subject-list-image" @click=${clickHandler}>
      <div class="collectionId">${collectionNum}</div>
      <img class="book-cover" loading=lazy id=${entry?.id} width=350 height=525 src=${standardURL + entry?.thumbnail?.href} alt=${entry?.title}/>
      ${isCoverOnly
        ? ''
        : html`
        <div class="card-body">
        <b id=${entry?.id}>${entry?.title}</b>
        <p id=${entry?.id}>${entry?.summary}</p>
        </div>`}
    </li>
  `
}

const New = (subject) => {
  const {
    title,
    entries,
    length,
  } = subject;
  const clickHandler = clickHandlerCreator({
    type: 'click-new',
    categoryTerm: title,
    tab: 'SUBJECT',
  })
  return html`
  ${FollowTitle(`${title} (${length})`, clickHandler)}
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
  <h3 class="pointer" @click=${clickHandler}>${title} (${length})</h3>
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

const Subjects = (subject, {isAuthor, isSubject, isCategory, isCollection}) => {
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
  return html`
  <h3 class="pointer" @click=${
    (isSubject && clickSubject)
    || (isAuthor && clickAuthor)
    || (isCategory && clickCategory)
    || (isCollection && clickCollection)}>${title} ${length ? `(${length})` : ''}</h3>
  <ul class="subject-list">
    ${entries.map(entry => {
      return SubjectEntry(entry)
    })}
  </ul>
  `
}
}

const Browse = (items = [], {isAuthor = false, isSubject = false, isCategory = false, isCollection = false}) => {
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`${items.map(subject => {
                    return html`${Subjects(subject, {isAuthor, isSubject, isCategory, isCollection})}`
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
      <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Library' : 'Add to Library'}</b></button>
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
  <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Library' : 'Add to Library'}</b></button>
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
  <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Library' : 'Add to Library'}</b></button>
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
  <button class="follow" role="button" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Remove from Library' : 'Add to Library'}</b></button>
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
    return html`<p><a class="pointer" @click=${clickAuthor}>${author.name}</a></p>`
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
  const standardURL = 'https://standardebooks.org/'
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
      console.log('Page URL copied to clipboard');
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
      log('shared successfully')
    } catch(err) {
      log('Error: ' + err)
      await copyShareUrl();
    }
  }
  const cacheBook = async () => {
      const url = `https://standardebooks.org${ebookLink.href}.epub`;
      await fetch(url);
  }
  return html`
    <div class="modal">
      <div class="modal-content">
        <button @click=${clickClose} class="close">X</button>
        <a @click=${clickAdd}>
          <img class="img-fluid detail-book-cover " src=${standardURL + thumbnail.href} />
        </a>
        <div>
          <h2 class="pointer"><a @click=${clickAdd}>${title}</a></h2>
          <button @click=${shareHandler} class="share ${wasCopySuccessfull ? 'copied':''}">${wasCopySuccessfull ? html`&#9989;` : html`&#128279;`}</button>
          <button class="follow" @click=${inUserLibrary ? clickRemove() : clickHandlerCreator({
            type: 'click-add-to-library',
            entryId: entry.id,
          }, cacheBook)}><b>${inUserLibrary ? 'Remove from library' : 'Add to library'}</b></button>
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
    return html`<li class="category-list-item pointer" @click=${clickHandler}><a>${cat.term}</a> #${cat.position}</li>`
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
    return html`<li class="category-list-item pointer" @click=${clickHandler}><a >${cat.term}</a></li>`
  })}
  </ul>
  `
}
const FollowTitle = (titleText, clickHandler, linkText = 'See All') => html`
<div class="flex-title">
  <h2 @click=${clickHandler}>
    ${titleText}
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
  <h2>
    Followed Authors
  </h2>
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
const H1Title = (props) => {
  const {activeTab, searchResults, activeCategory} = props;

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
    case('AUTHOR'): {
      return html`
      <h1 class="pointer">
      ${toTitleCase(searchResults.query)}
      </h1>
      `
    }
    case('BROWSE'):{
      return html`
      <h1 class="pointer">Subjects</h1>
      <div class="top-nav__breadcrumb">
        <a @click=${browseHandler}>${BROWSETITLE}</a> | ${SUBJECTTITLE}
      </div>
      `
    }
    case('SUBJECT'):{
      return activeCategory?.title === "Newest 30 Standard Ebooks" ? (
        html`
        <h1 class="pointer">${activeCategory?.title}</h1>
        <div class="top-nav__breadcrumb">
          <a @click=${browseHandler}>${BROWSETITLE}</a> | ${activeCategory?.title}
        </div>
        `
      ) : (html`
      <h1 class="pointer">${activeCategory?.title}</h1>
      <div class="top-nav__breadcrumb">
        <a @click=${browseHandler}>${BROWSETITLE}</a> | <a @click=${allSubjectsHandler}>${SUBJECTTITLE}</a> | ${activeCategory?.title}
      </div>
      `)
    }
    case('COLLECTIONS'): {
      return html`
      <h1 class="pointer">${toTitleCase(activeTab)}</h1>
      <div class="top-nav__breadcrumb">
        <a @click=${browseHandler}>${BROWSETITLE}</a> | ${COLLECTIONTITLE}
      </div>
      `
    }
    case('COLLECTION'): {
      return html`
      <h1 class="pointer">${activeCategory?.title}</h1>
      <div class="top-nav__breadcrumb">
        <a @click=${browseHandler}>${BROWSETITLE}</a> | <a @click=${allCollectionsHandler}>${COLLECTIONTITLE}</a> | ${activeCategory?.title}
      </div>
      `
    }
    case('CATEGORY'): {
      return html`
      <h1 class="pointer">${activeCategory?.title}</h1>
      `
    }
    case('NEW'): {
      return html`
      <h1 class="pointer">${BROWSETITLE}</h1>
      `
    }
    case('LIBRARY') : {
      return html`
      <h1 class="pointer">
      My Library
      </h1>`
    }
    default: {
      return html`
      <h1 class="pointer">
      ${toTitleCase(activeTab ? activeTab : 'Standard Ebooks')}
      </h1>`
    }
  }
}
const LoadingMessages = (index = 0) => {
  const msgs = [
    html`Loading...`,
  ]  
  // html`The first load is the longest...`,
  // html`Downloading new Standard Books...`,
  // html`Collections may take a minute to load...`,
  // html`Organizing Libraries...`,
  // html`Collecting Collections...`,
  // html`Parsing New books...`,
  // html`Reticulating Splines...`,
  // html`Ordering LLamas...`,
  // html`Generating witty dialog...`,
  // html`Swapping time and space...`,
  // html`Tokenizing real life...`,
  // html`Downloading new Standard Books...`,
  // html`The servers are having a slow day, today.`,
  return msgs[index]
}
function rerender(props) {
  log('re Render')
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
      showSideBarMenu,
      isLoading,
      loadingMessageindex,
    } = state
    const TabContent = (activeTab) => {
      window.scrollTo(0,0)
      switch(activeTab) {
        case('LIBRARY'): {
          return html`
            ${Library(userLibrary)}
            ${FollowedAuthors(followedSearchResults)}
            ${FollowedCollections(followedCollections)}
            ${FollowedSubjects(followedSubjects)}
            ${FollowedCategories(followedCategories)}
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
    return html`
      ${H1Title({activeTab, searchResults, activeCategory})}
      <div id="sidebar" class="sidebar ${showSideBarMenu}">
        <nav class="parent-nav">
          <div class="parent">
            ${LibraryNavigation()}
            ${NewBrowseNavigation()}
            ${SearchNavigation()}
          </div>
        </nav>
      </div>
      <div id="main">
        ${!isLoading ? html`
          ${TabContent(activeTab)}
          <footer>
            <p id="credit">Credit to <a href="https://standardebooks.org">Standard Ebooks</a> for the curated list.</p>
            <a class="pointer" @click=${helpHandler}>Help</a>
          </footer> 
        ` : LoadingMessages(loadingMessageindex)}
        ${showDetailModal ? DetailView(activeEntry) : html``}
      </div>
    `
  }
  console.log(state)
  render(app(state), document.querySelector('#result'))
}
document.querySelector('.first-content').hidden = true
rerender({detail: JSON.stringify({isLoading:true, showSideBarMenu:'show'})})

elem.addEventListener('re-render', (e) => rerender({detail: e.detail}))

document.addEventListener('swiped-down', function(e) {
  console.log("swiped-down");
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
        const clickClose = clickHandlerCreator({
          type: 'click-close-details-modal',
        })
        clickClose.handleEvent()
      }
    }
  }
});

document.addEventListener('swiped-up', function(e) {
  console.log("swiped-up");
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
        const clickClose = clickHandlerCreator({
          type: 'click-close-details-modal',
        })
        clickClose.handleEvent()
      }
    }
  }
});