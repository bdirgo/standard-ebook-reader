import {html, render} from 'https://unpkg.com/lit-html?module';

const w = new Worker("./js/appState.js");

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
window.addEventListener('DOMContentLoaded', () => {
  // TODO: Electron
    let displayMode = 'browser tab';
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

// TODO: call state mgmt
w.postMessage({type:"init"});

function toTitleCase(str) {
  return str.replace(
      /\w\S*/g,
      function(txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      }
  );
}

const SearchBar = (results = []) => {
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action:{
          type: 'search-query',
          query: x
        },
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  let x = ''
  const updateQuery = (e) => {x = e.target.value}
  return html` <input type="search" @change=${updateQuery}> <button @click=${clickHandler}>Search</button>
  ${results.length === 0
    ? html`${EmptySearch()}`
    : html`${results.map(item => {
              return html`${SubjectEntry(item.item)}`
              })
            }`
  }`
}
const LibraryNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'library-tab',
          tab: 'LIBRARY'
        })
  return html`<a @click=${clickHandler} class="box button">Library</a>`
}
const NewNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'new-tab',
          tab: 'NEW'
        })
  return html`<a @click=${clickHandler} class="box button">New Books</a>`
}
const CollectionsNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'collection-tab',
          tab: 'COLLECTIONS'
        })
  return html`<a @click=${clickHandler} class="box button">Collections</a>`
}
const BrowseNavigation = () => {
  const clickHandler = clickHandlerCreator({
    type: 'browse-tab',
    tab: 'BROWSE'
  })
  return html`<a @click=${clickHandler} class="box button">Browse Subjects</a>`
}
const SearchNavigation = () => {
  const clickHandler = clickHandlerCreator({
    type: 'search-tab',
    tab: 'SEARCH'
  })
  return html`<a @click=${clickHandler} class="box button">Search</a>`
}
const HowTo = () => html`<h2>How to</h2>
  <ol>
  <li>Add this web page to your homescreen.</li>
  <li>Browse to add a few books.</li>
  <li>The app will remember your place. So, you can come back and pick up where you left off.</li>
  </ol>`
const EmptyLibrary = () => html`<p>Your Library is empty.</p>${HowTo()}`
const EmptySearch = () => html`<p>Results are empty.</p>`

const ItemView = (entry) => {
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
  </li>`}
const LibraryList = (items = []) => {
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`<ul class="library-list">${items.map(item => ItemView(item))}</ul>`
  }`}

const Library = (userLibrary) => {
  return html`
    <h2>${userLibrary.title}</h2>
    ${LibraryList(userLibrary.entries)}
  `
}

function collectionID(entry, subjectTitle) {
  return entry.collection?.filter(val => val.title === subjectTitle)[0]?.position
}

const SubjectEntry = (entry, isCoverOnly = false, subjectTitle = '') => {
  const clickHandler = clickHandlerCreator({
    type: 'click-title',
    entryId: entry.id,
  })
  const collectionNum = collectionID(entry, subjectTitle)
  const standardURL = 'https://standardebooks.org/'
  return html`
  <li class="subject-list-image" @click=${clickHandler}>
    <div class="collectionId">${collectionNum}</div>
    <img class="book-cover" loading=lazy id=${entry.id} width=350 height=525 src=${standardURL + entry.thumbnail?.href} alt=${entry.title}/>
    ${isCoverOnly
      ? html`
      <div class="card-body">
        <b id=${entry.id}>${entry.title}</b>
        <p id=${entry.id}>${entry.summary}</p>
      </div>`
      : ''}
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
  <h2 class="pointer" @click=${clickHandler}>${title} > </h2>
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
  <h2 class="pointer" @click=${clickHandler}>${title} > (${length})</h2>
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

const Subjects = (subject) => {
  const {
    title,
    entries,
  } = subject;
  const clickHandler = clickHandlerCreator({
    type: 'click-subject',
    categoryTerm: title,
    tab: 'SUBJECT',
  })
  return html`
  <h2 class="pointer" @click=${clickHandler}>${title} > </h2>
  <ul class="subject-list">
    ${entries.map(entry => {
      return SubjectEntry(entry)
    })}
  </ul>
  `
}

const Browse = (items = []) => {
  return html`
  ${items.length === 0
    ? html`${EmptyLibrary()}`
    : html`${items.map(subject => {
                    return html`${Subjects(subject)}`
                    })
            }`
  }`}

const Category = (category) => {
  const {
    title,
    entries,
  } = category;
  const isCoverOnly = true;
  return html`
  <h2>${title}</h2>
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
  } = category;
  const isCoverOnly = true;
  const list = entries.sort((a,b) => parseInt(collectionID(a, title)) - parseInt(collectionID(b, title)))
  return html`
  <h2>${title}</h2>
  <p>All items in the collection are not yet in the public domain. So, there may be gaps.</p>
  <ul class="category-list">
    ${list.map(entry => {
      return SubjectEntry(entry, isCoverOnly, title)
    })}
  </ul>`
}

const emptyState = {
  userLibrary:[],
  bookLibrary:[],
  activeTab:'LIBRARY',
}

const DetailView = (entry) => {
  const {
    ebookLink,
    thumbnail,
    title,
    summary,
    categories,
    inUserLibrary,
    collection = [],
  } = entry
  const readLink = `/ebook.html?book=${ebookLink.href}`
  const standardURL = 'https://standardebooks.org/'
  const clickAdd = clickHandlerCreator({
    type: 'click-add-to-library',
    entryId: entry.id,
  })
  const clickRemove = clickHandlerCreator({
    type: 'click-remove-from-library',
    entryId: entry.id,
  })
  const clickClose = clickHandlerCreator({
    type: 'click-close-details-modal',
  })
  return html`
    <div class="modal">
      <div class="modal-content">
        <span @click=${clickClose} class="close">X</span>
        <a href=${readLink}>
          <img class="img-fluid detail-book-cover " src=${standardURL + thumbnail.href} />
        </a>
        <div>
          <h2 class="pointer"><a href=${readLink}>${title}</a></h2>
          ${inUserLibrary 
            ? html`<a class="remove-from-library pointer" @click=${clickRemove}>Remove from Library</a>`
            : html`<a class="add-to-library pointer" @click=${clickAdd}>Add to Library</a>`
          }
          <p>${summary}</p>
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
const clickHandlerCreator = (action) => {
  return {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action,
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
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
    return html`<li class="category-list-item pointer" @click=${clickHandler}><a >${cat.term}</a></li>`
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
const LoadingMessages = (index = 0) => {
  const msgs = [
    html`Loading...`,
    html`Still Loading...`,
    html`Organizing Libraries...`,
    html`Collecting Collections...`,
    html`Parsing New books...`,
    html`Reticulating Splines...`,
    html`Ordering LLamas...`,
    html`Or was it Alpacas?`,
    html`Generating witty dialog...`,
    html`Swapping time and space...`,
    html`The servers are having a slow day, today.`,
    html`Tokenizing real life...`,
    html`Don't think of purple hippos...`,
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
      searchResults,
      showDetailModal,
      showSideBarMenu,
      isLoading,
      loadingMessageindex,
    } = state
    const TabContent = (activeTab) => {
      switch(activeTab) {
        case('LIBRARY'): {
          return Library(userLibrary);
        }
        case('BROWSE'): {
          return Browse(bookLibrary);
        }
        case('COLLECTIONS'): {
          return Collections(bookLibrary);
        }
        case('NEW'): {
          return New(bookLibrary);
        }
        case('SUBJECT'): {
          return Category(activeCategory);
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
        default:
          return html`Default View. Not yet implemented.`;
      }
      
    }
    const toggleNav = clickHandlerCreator({
      type: `${showSideBarMenu === 'show' ? 'click-open-main-menu': 'click-close-main-menu'}`
    })
    return html`
      <h1 class="pointer" @click=${toggleNav}>Ebook Reader - ${toTitleCase(activeTab)}</h1>
      <div id="sidebar" class="sidebar ${showSideBarMenu}">
        <nav>
          <div class="parent">
            ${LibraryNavigation()}
            ${NewNavigation()}
            ${BrowseNavigation()}
            ${CollectionsNavigation()}
            ${SearchNavigation()}
          </div>
        </nav>
      </div>
      <div id="main">
        ${!isLoading ? TabContent(activeTab) : LoadingMessages(loadingMessageindex)}
        ${showDetailModal ? DetailView(activeEntry) : html``}
        <footer id="credit">Credit to <a href="https://standardebooks.org">Standard Ebooks</a> for the curated list.</footer> 
      </div>
    `
  }
  console.log(state)
  render(app(state), document.querySelector('#result'))
}
document.querySelector('.first-content').hidden = true
rerender({detail: JSON.stringify({isLoading:true, showSideBarMenu:'show'})})

elem.addEventListener('re-render', (e) => rerender({detail: e.detail}))