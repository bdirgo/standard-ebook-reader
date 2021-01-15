(async function () {
  // https://www.gutenberg.org/cache/epub/25717/pg25717.epub
  // https://www.gutenberg.org/cache/epub/25717/pg25717-images.epub
  const bookUrl = `/cache/epub/${bookParam}/pg${bookParam}.epub`
  const imageBookUrl = `/cache/epub/${bookParam}/pg${bookParam}-images.epub`
  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth
  const targetHeight = windowHeight
  const targetWidth = windowWidth * 0.94
  const CURRENTPAGEID = `${bookUrl}-currentPage`
  const CURRENTLYREADING = 'currentlyReading'
  const isDarkMode = window.localStorage.getItem('darkMode') === 'dark'

  const populateStorage = (id, value) => {
    window.localStorage.setItem(id, value);
  }
  const getStorage = (id) => {
    return window.localStorage.getItem(id);
  }
  const addBookToCurrentlyReading = () => {
    let currentBooks = []
    if (getStorage(CURRENTLYREADING)) {
      currentBooks = JSON.parse(getStorage(CURRENTLYREADING))
    }
    if (currentBooks.length > 0) {
      if (currentBooks.includes(bookParam)) {
        currentBooks.forEach(function(bookUrl,i){
          if(bookUrl === bookParam){
            currentBooks.splice(i, 1);
            currentBooks.unshift(bookUrl);
          }
        });
      } else {
        currentBooks = [bookParam].concat(currentBooks)
      }
    } else {
      currentBooks = [bookParam]
    }
    console.log(currentBooks)
    populateStorage(CURRENTLYREADING, JSON.stringify(currentBooks))
  }
  const saveCurrentLocation = ({
    atStart=false,
    start,
    end,
    atEnd=false,
  }) => {
    populateStorage(CURRENTPAGEID, atStart ? start.href: start.cfi)
  }
  addBookToCurrentlyReading()
  console.log(standardUrl)
  console.log(bookUrl)

  // https://www.gutenberg.org/cache/epub/25717/pg25717.epub
  let res = await fetch(
    `https://cors-anywhere.herokuapp.com/${standardUrl + imageBookUrl}`,
    {
      headers: {
        'x-requested-with':'XMLHttpRequest'
      }
    })
  if (!res.ok) {
    // try again without images?
    res = await fetch(
      `https://cors-anywhere.herokuapp.com/${standardUrl + bookUrl}`,
      {
        headers: {
          'x-requested-with':'XMLHttpRequest'
        }
      }
    )
  }
  if (!res.ok) {
    alert(`Something went wrong`, res.statusText)
  }
  const buffer = await res.arrayBuffer()
  var book = ePub(buffer)
  console.log('booked')
  console.log(book)
  var rendition = book.renderTo("viewer", {
    manager: "default",
    flow: "paginated",
    width: targetWidth,
    height: targetHeight,
    script: '../../../swiped-events.js',
    stylesheet: isDarkMode ? '../../dark-ebook-styles.css' : '../../ebook-styles.css',
  });
  console.log('renditioned')
  console.log(rendition)
  // TODO: hook to make links to images work
  rendition.hooks.render.register(function(contents, view) {
    console.log('registered')
    contents.document.addEventListener('swiped-left', async function(e) {
      console.log("swiped-left");
      await rendition.next();
      saveCurrentLocation(rendition.currentLocation());
    });
    
    contents.document.addEventListener('swiped-right', async function(e) {
      console.log("swiped-right");
      await rendition.prev();
      saveCurrentLocation(rendition.currentLocation());
    });
  })

  var displayed
  if(localStorage.getItem(CURRENTPAGEID)) {
    displayed = rendition.display(getStorage(CURRENTPAGEID));
  } else {
    displayed = rendition.display()
  }
  console.log('displayed')
  console.log(displayed)

  displayed.then(function(renderer){
    console.log('loaded')
    loadingCover.innerHTML = ''
    // -- do stuff
  });

  // Navigation loaded
  book.loaded.navigation.then(function(toc){
    console.log(toc);
  });

  var next = document.getElementById("next");
  next.addEventListener("click", async function(){

    await rendition.next();
    saveCurrentLocation(rendition.currentLocation());

  }, false);

  var prev = document.getElementById("prev");
  prev.addEventListener("click", async function(){

    await rendition.prev();
    saveCurrentLocation(rendition.currentLocation());

  }, false);

  var keyListener = async function(e) {

    // Left Key
    if ((e.code || e.key) === "ArrowLeft") {
      await rendition.prev();
    }

    // Right Key
    if ((e.code || e.key) === "ArrowRight") {
      await rendition.next();
    }
    
    saveCurrentLocation(rendition.currentLocation());
  }
  rendition.on("keyup", keyListener);
  document.addEventListener("keyup", keyListener, false);
})()
