import { html, render } from 'https://unpkg.com/lit-html?module';

const w = new Worker("./js/appState.js");
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
    if (type === 'state') {
        const state = payload
        elem.dispatchEvent(new CustomEvent('re-render', {
            detail: state,
        }))
    } else {
        const details = data
        console.log(details)
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

// TODO: call state mgmt
w.postMessage({
    type: "init",
    payload: JSON.stringify({
        action: {
            currentlyReading: getCurrentlyReadingStorage()
        }
    })
});

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
        const payload = {
            action: {
                type: 'search-query',
                query,
                currentlyReading: getCurrentlyReadingStorage()
            },
        }
        w.postMessage({ type: 'click', payload: JSON.stringify(payload) })
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html `
  <form role="search" @submit=${submitHandler}><label class="no-padding" for="mySearch">Search for a book, based on title, author, subject, or description</label>
    <div>
      <input
        type="search"
        id="mySearch"
        name="q"
        placeholder="Search for a book..."
        .value=${query}
        @change=${e => {query = e.target.value;}}
        size="30">
      <button>Search</button>
    </div>
  </form>
  <h2>${title}</h2>
  ${results.length === 0
    ? html`${EmptySearch()}`
    : html`<ul class="list-style-none library-list no-padding">${results.map(item => {
              return html`${ItemView(item.item, false)}`
              })
            }</ul>`
  }`
}
const LibraryNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'library-tab',
          tab: 'LIBRARY'
        })
  return html`<button @click=${clickHandler} class="box button"><span style='font-size:24px;'>&#8962;</span>&nbsp;Home</button>`
}
const NewNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'click-new',
          // TODO: GET RID OF THIS MAGIC STRING
          categoryTerm: "Newest 30 Standard Ebooks",
          // END TODO: GET RID OF THIS MAGIC STRING
          tab: 'SUBJECT',
        })
        return html`<button @click=${clickHandler} class="box button">&nbsp;<span style='font-size:18px;'>&#9734;</span>&nbsp;New Books</button>`
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
  return html`<button @click=${clickHandler} class="box button"><span style='font-size:28px;'>&#8981;</span>&nbsp;Search</button>`
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
  <li>Scroll to the bottome to view the categories it is a part of</li>
  <li>Click a category to see similar books in that category (sometimes it's only one, sorry)</li>
  <li>Click "Follow" to follow, and "Unfollow" to unfollow</li>
  </ol>`

const EmptyLibrary = () => html`<p><b>Your Library is empty.</b></p>${HowTo()}`
const EmptySearch = () => html`<p>Results are empty.</p>`

const Help = () => html`
<h2>How to</h2>
${HowTo()}
${HowToFollow()}
<b>Tips</b>
<p>Clicking the H1 title at the top of the page will toggle the navigation.</p>
<p>Clicking the Moon/Sun button will toggle the site into dark mode</p>
<p>When reading clicking the chapter title at the top of the screen will bring up a chapter selection menu</p>
<p>If you toggle dark mode while reading a book, you may need to refresh the page for the colors to load correctly.</p>
`


const ItemView = (entry, isCoverOnly = true) => {
  const {
    id,
    thumbnail,
    title,
  } = entry;
  const clickHandler = clickHandlerCreator({
    type: 'click-title',
    entryId: entry.id,
  });
  const standardURL = 'https://standardebooks.org/'
  return html`
  <li class="library-list-image" @click=${clickHandler}>
    <img class="book-cover" loading=lazy id=${id} width=350 height=525 src=${standardURL + thumbnail.href} alt=${title}/>
    ${isCoverOnly
      ? ''
      : html`
      <div class="card-body">
        <b id=${entry.id}>${entry.title}</b>
        <p id=${entry.id}>${entry.summary}</p>
      </div>`}
  </li>`}
const LibraryList = (items = []) => {
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`<ul class="library-list">${items.map((item) => ItemView(item))}</ul>`
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
      lastUpdated,
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
    return html`
    <h2>${title}</h2>
    ${title !== 'Newest 30 Standard Ebooks' ? html`
      <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Unfollow' : 'Follow'}</b></button>
    ` : html`Last updated: ${new Date(lastUpdated).toDateString()}
    `}
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
  return html`
  <h2>${title}</h2>
  <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Unfollow' : 'Follow'}</b></button>
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
  return html`
  <h2>${title}</h2>
  <button class="follow" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Unfollow' : 'Follow'}</b></button>
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
  return html`
  <h2>${title}</h2>
  <button class="follow" role="button" @click=${inUserLibrary ? removeHandler : clickHandler}><b>${inUserLibrary ? 'Unfollow' : 'Follow'}</b></button>
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
      const payload = {
        action: {
          type: 'click-copied-share-url',
          entryId: entry.id,
          currentlyReading:getCurrentlyReadingStorage(),
        },
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
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
  const cacheBook = () => {
      var oReq = new XMLHttpRequest();
      oReq.open("GET", `${ebookLink.href}.epub`, true);
      oReq.responseType = "blob";
      oReq.send(null);
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
      const payload = {
        action: {
          ...action,
          currentlyReading:getCurrentlyReadingStorage()
        },
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
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
const FollowTitle = (titleText, clickHandler) => html`
<div class="flex-title">
  <h2>
    ${titleText}
  </h2>
  <h2>
    <strong class="pointer" @click=${clickHandler}>See All ></strong>
  </h2>
</div>`
const FollowedCollections = (followedCollections) => {
  const isCollection = true
  const clickHandler = clickHandlerCreator({
    type: 'collection-tab',
    tab: 'COLLECTIONS'
  })
  return followedCollections.length
  ? html`
  ${FollowTitle('Followed Collections', clickHandler)}
  ${Browse(followedCollections, {isCollection})}
  `
  : html`${FollowTitle('Followed Collections', clickHandler)}`
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
  ${FollowTitle('Followed Subjects', clickHandler)}
  ${Browse(followedSubjects, {isSubject})}
  `
  : html`${FollowTitle('Followed Subjects', clickHandler)}`
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
const FollowedCategories = (followedCategories) => {
  const isCategory = true
  const clickHandler = clickHandlerCreator({
    type:'help-tab',
    tab: 'HELP'
  })
  return followedCategories.length
  ? html`
  ${FollowTitle('Followed Categories', clickHandler)}
  ${Browse(followedCategories, {isCategory})}
  `
  : html``
}
const LoadingMessages = (index = 0) => {
  const msgs = [
    html`Loading...`,
    html`The first load is the longest...`,
    html`Downloading new Standard Books...`,
    html`Collections may take a minute to load...`,
    html`Organizing Libraries...`,
    html`Collecting Collections...`,
    html`Parsing New books...`,
    html`Reticulating Splines...`,
    html`Ordering LLamas...`,
    html`Generating witty dialog...`,
    html`Swapping time and space...`,
    html`Tokenizing real life...`,
    html`Downloading new Standard Books...`,
    html`The servers are having a slow day, today.`,
  ]  
  return msgs[index]
}
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
            ${New(bookLibrary)}
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
          return New(bookLibrary);
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
      <h1 class="pointer">
      ${activeTab === 'AUTHOR'
        ? toTitleCase(searchResults.query)
        : toTitleCase(activeTab ? activeTab : 'Ebook Reader')}</h1>
      <div id="sidebar" class="sidebar ${showSideBarMenu}">
        <nav class="parent-nav">
          <div class="parent">
            ${LibraryNavigation()}
            ${NewNavigation()}
            ${SearchNavigation()}
          </div>
        </nav>
      </div>
      <div id="main">
        ${!isLoading ? TabContent(activeTab) : LoadingMessages(loadingMessageindex)}
        ${showDetailModal ? DetailView(activeEntry) : html``}
        <footer>
          <p id="credit">Credit to <a href="https://standardebooks.org">Standard Ebooks</a> for the curated list.</p>
          <a class="pointer" @click=${helpHandler}>Help</a>
        </footer> 
      </div>
    `
  }
  console.log(state)
  render(app(state), document.querySelector('#result'))
}
document.querySelector('.first-content').hidden = true
rerender({detail: JSON.stringify({isLoading:true, showSideBarMenu:'show'})})

elem.addEventListener('re-render', (e) => rerender({detail: e.detail}))