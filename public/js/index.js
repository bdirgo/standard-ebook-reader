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

const SearchBar = () => html`
<input type="search" id="site-search" name="q" aria-label="Search through site content">
<button>Search</button>
`
const LibraryNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'library-tab',
          tab: 'LIBRARY'
        })
  return html`<a @click=${clickHandler} class="box button">My Library</a>`
}
const NewNavigation = () => {
  const clickHandler = clickHandlerCreator({
          type: 'new-tab',
          tab: 'NEW'
        })
  return html`<a @click=${clickHandler} class="box button">New Books</a>`
}
const BrowseNavigation = () => {
  const clickHandler = clickHandlerCreator({
    type: 'browse-tab',
    tab: 'BROWSE'
  })
  return html`<a @click=${clickHandler} class="box button">Browse Categories</a>`
}
const SearchNavigation = () => {
  const clickHandler = clickHandlerCreator({
    type: 'search-tab',
    tab: 'SEARCH'
  })
  return html`<a @click=${clickHandler} class="box button">Search</a>`
}
const EmptyLibrary = () => html`<p>My Library is empty. Try and Browse to add a few books.</p>`

const ItemView = (entry) => {
  const {
    id,
    thumbnail,
    title,
  } = entry;
  const clickHandler = clickHandlerCreator({
    type: 'click-title',
    entryId: entry.id,
    tab:'DETAIL_VIEW',
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

const parseOPFData = async (epubLink) => {
  const standardURL = 'https://standardebooks.org'
  const entry_url = standardURL + epubLink;
  const ebook = new ePub(entry_url)
  await ebook.opened
  console.log(ebook)
  const opf = ebook.packaging;
  console.log(opf)
  return opf
}

const SubjectEntry = (entry, isCoverOnly = false) => {
  let clickHandler = clickHandlerCreator({
    type: 'click-title',
    entryId: entry.id,
    tab:'DETAIL_VIEW',
  })
  const standardURL = 'https://standardebooks.org/'
  return html`
  <li class="subject-list-image" @click=${clickHandler}>
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
  <h2 @click=${clickHandler}>${title} > </h2>
  <ul class="subject-list">
    ${entries.map(entry => {
      return SubjectEntry(entry)
    })}
  </ul>
  `
}

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
  <h2 @click=${clickHandler}>${title} > </h2>
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
  } = entry
  const readLink = `/ebook.html?book=${ebookLink.href}`
  const standardURL = 'https://standardebooks.org/'
  const clickAdd = clickHandlerCreator({
    type: 'click-add-to-library',
    entryId: entry.id,
    tab: 'LIBRARY',
  })
  const clickRemove = clickHandlerCreator({
    type: 'click-remove-from-library',
    entryId: entry.id,
    tab: 'DETAIL_VIEW',
  })
  // Display whole content here?
  return html`
    <div class="modal-content">
      <a href=${readLink}>
          <img class="img-fluid detail-book-cover " src=${standardURL + thumbnail.href} />
      </a>
      <h2><a href=${readLink}>${title}</a></h2>
      ${inUserLibrary 
        ? html`<a class="remove-from-library" @click=${clickRemove}>Remove from Library</a>`
        : html`<a class="add-to-library" @click=${clickAdd}>Add to Library</a>`
      }
      <p>${summary}</p>
      ${categories.length ? CategoryList(categories) : ''}
      
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

const CategoryList = (categories) => {
  return html`
  <ul class="list-style-none">
  ${categories.map(cat => {
    const clickHandler = clickHandlerCreator({
      type: 'click-category',
      categoryTerm: cat.term,
      tab: 'CATEGORY',
    })
    return html`<li class="category-list-item" @click=${clickHandler}><a >${cat.term}</a></li>`
  })}
  </ul>
  `
}

function rerender(props) {
  const {
    ev = {},
    isLoading = true,
  } = props
  const state = JSON.parse(ev.detail ?? '{}')

  const app = (state = emptyState) => {
    const {
      userLibrary,
      bookLibrary,
      activeTab,
      activeCategory,
      activeEntry,
    } = state
    const TabContent = (activeTab) => {
      switch(activeTab) {
        case('LIBRARY'): {
          return Library(userLibrary);
        }
        case('BROWSE'): {
          return Browse(bookLibrary);
        }
        case('NEW'): {
          return New(bookLibrary);
        }
        case('SUBJECT'): {
          window.scrollTo({top:215})
          return Category(activeCategory);
        }
        case('CATEGORY'): {
          window.scrollTo({top:215})
          return Category(activeCategory);
        }
        case('DETAIL_VIEW'): {
          window.scrollTo({top:215})
          return DetailView(activeEntry);
        }
        default:
          return html`Default View. Not yet implemented.`;
      }
      
    }
    return html`
      <h1>Ebook Reader</h1>
      <nav>
        <div class="parent">
          ${LibraryNavigation()}
          ${BrowseNavigation()}
          ${NewNavigation()}
        </div>
      </nav>
      ${!isLoading ? TabContent(activeTab) : html`<span>Loading...</span>`}
      <footer id="credit">Credit to <a href="https://standardebooks.org">Standard Ebooks</a> for the curated list.</footer> 
    `
  }
  console.log(state)
  render(app(state), document.querySelector('#result'))
}
document.querySelector('.first-content').hidden = true
rerender({})

elem.addEventListener('re-render', (e) => rerender({ev:e, isLoading:false}))