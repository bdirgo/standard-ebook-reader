import {html, render} from 'https://unpkg.com/lit-html?module';
const w = new Worker("./appState.js");

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
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'library-tab',
          tab: 'LIBRARY'
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html`<a @click=${clickHandler} class="box button">My Library</a>`
}
const NewNavigation = () => {
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'new-tab',
          tab: 'NEW'
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html`<a @click=${clickHandler} class="box button">New Books</a>`
}
const BrowseNavigation = () => {
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'browse-tab',
          tab: 'BROWSE'
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html`<a @click=${clickHandler} class="box button">Browse Categories</a>`
}
const SearchNavigation = () => {
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'search-tab',
          tab: 'SEARCH'
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html`<a @click=${clickHandler} class="box button">Search</a>`
}
const EmptyLibrary = () => html`<p>My Library is empty. Try and Browse to add a few books.</p>`

const ItemView = (entry) => {
  const {
    ebookLink,
    cover,
    title,
    summary,
    categories,
  } = entry
  const readLink = `/ebook.html?book=${ebookLink.href}`
  const standardURL = 'https://standardebooks.org/'
  return html`<li class="library-list-image">
  <img class="book-cover" loading=lazy id=${entry.id} width=350 height=525 src=${standardURL + entry.thumbnail?.href} alt=${entry.title}/>
  <div class="card-body">
    <b id=${entry.id}>${entry.title}</b>
  </div>
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

const SubjectEntry = (entry, isCoverOnly = false) => {
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'click-title',
          entryId: entry.id,
          tab:'DETAIL_VIEW',
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
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
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'click-new',
          categoryTerm: title,
          tab: 'SUBJECT',
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
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
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'click-subject',
          categoryTerm: title,
          tab: 'SUBJECT',
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
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
    cover,
    title,
    summary,
    categories,
  } = entry
  const readLink = `/ebook.html?book=${ebookLink.href}`
  const standardURL = 'https://standardebooks.org/'
  const clickHandler = {
    // handleEvent method is required.
    handleEvent(e) {
      const payload = {
        action: {
          type: 'click-add-to-library',
          entryId: entry.id,
          tab: 'LIBRARY',
        }
      }
      w.postMessage({type:'click', payload:JSON.stringify(payload)})
    },
    // event listener objects can also define zero or more of the event 
    // listener options: capture, passive, and once.
    capture: true,
  }
  return html`
    <div class="modal-content">
      <a href=${readLink}>
          <img class="img-fluid detail-book-cover " src=${standardURL + cover?.href} />
      </a>
      <h2><a href=${readLink}>${title}</a></h2>
      <p>${summary}</p>
      ${categories.length ? CategoryList(categories) : ''}
      <a @click=${clickHandler}>Add to Library</a>
    </div>
  `
}

const CategoryList = (categories) => {
  return html`
  <ul>
  ${categories.map(cat => {
    const clickHandler = {
      // handleEvent method is required.
      handleEvent(e) {
        const payload = {
          action: {
            type: 'click-category',
            categoryTerm: cat.term,
            tab: 'CATEGORY',
          }
        }
        w.postMessage({type:'click', payload:JSON.stringify(payload)})
      },
      // event listener objects can also define zero or more of the event 
      // listener options: capture, passive, and once.
      capture: true,
    }
    return html`<li @click=${clickHandler}>${cat.term}</li>`
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
          window.scrollTo({top:212})
          return Category(activeCategory);
        }
        case('CATEGORY'): {
          window.scrollTo({top:212})
          return Category(activeCategory);
        }
        case('DETAIL_VIEW'): {
          window.scrollTo({top:212})
          return DetailView(activeEntry);
        }
        default:
          return html`Default View`;
      }
      
    }
    if (!isLoading) {
      return html`
        <h1>Ebook Reader</h1>
        <nav>
          <div class="parent">
            ${LibraryNavigation()}
            ${BrowseNavigation()}
            ${NewNavigation()}
            ${SearchNavigation()}
          </div>
        </nav>
        ${TabContent(activeTab)}
        <footer id="credit">Credit to <a href="https://standardebooks.org">Standard Ebooks</a> for the curated list.</footer> 
      `
    }
    return html`<span>Loading...</span>`
  }
  console.log(state)
  render(app(state), document.querySelector('#result'))
}
rerender({})

elem.addEventListener('re-render', (e) => rerender({ev:e, isLoading:false}))