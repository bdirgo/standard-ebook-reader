// let db;
// let dbVersion = 1;
// let dbReady = false;
// document.addEventListener('DOMContentLoaded', async () => {
//     console.log('dom content loaded');
//     // await initDb();
//     await initBook();
// });

// async function initDb() {
//   return new Promise(resolve => {
//     let request = indexedDB.open('testFiles', dbVersion);

//     request.onerror = function(e) {
//         console.error('Unable to open database.');
//     }

//     request.onsuccess = function(e) {
//         db = e.target.result;
//         console.log('db opened');
//         resolve()
//     }

//     request.onupgradeneeded = function(e) {
//         let db = e.target.result;
//         db.createObjectStore('cachedForms', {keyPath:'id', autoIncrement: true});
//         dbReady = true;
//     }
//   })

// }
// async function initBook() {
  const bookUrl = `${bookParam}.epub`
  const uploadedBookParam = params.get('uploadedBook')
  const windowHeight = window.innerHeight
  const windowWidth = window.innerWidth
  const targetHeight = windowHeight * 0.93
  const targetWidth = windowWidth * 0.94
  function bookTag(strs, exp) {
    if (bookParam === null) {
      return `${strs[0]}${uploadedBookParam}${strs[1]}`
    } else {
      return `${strs[0]}${exp}${strs[1]}`
    }
  }
  const CURRENTPAGEID = bookTag`${bookUrl}-currentPage`
  const CURRENTLYREADING = 'currentlyReading'
  const isDarkMode = window.localStorage.getItem('darkMode') === 'dark'
  console.log(CURRENTPAGEID)
  // async function loadUploadedBook(recordToLoad) {
  //   return new Promise(resolve => {

  //   console.log('loadUploadedBook');
  //   let buffer

  //   let trans = db.transaction(['cachedForms'], 'readonly');
  //   let req = trans.objectStore('cachedForms').get(parseInt(recordToLoad));
  //   trans.oncomplete = function(e) {
  //     let record = req.result;
  //     buffer = record.data
  //     resolve(buffer);
  //   }
  // })

  // }

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
  // if (bookParam === null) {
  //   // const buffer = await loadUploadedBook(uploadedBookParam)
  //   console.log(uploadedBookParam)
  //   var book = ePub(buffer);
  //   console.log('book')
  //   console.log(book)
  // } else {
    console.log(standardUrl)
    console.log(bookUrl)
    var book = ePub(standardUrl + bookUrl);
    console.log('book')
    console.log(book)
  // }

  // https://www.gutenberg.org/cache/epub/25717/pg25717.epub
  // const response = await fetch(standardUrl + bookUrl)
  // const buffer = await response.arrayBuffer()
  // var book = ePub(buffer)
  console.log('book')
  console.log(book)
  var rendition = book.renderTo("viewer", {
    manager: "continuous",
    flow: "paginated",
    width: targetWidth,
    height: targetHeight,
    script: '../../../lib/swiped-events.js',
    stylesheet: isDarkMode ? '../../../css/dark-ebook-styles.css' : '../../../css/ebook-styles.css',
  });
  console.log('rendition')
  console.log(rendition)
  addBookToCurrentlyReading()

  rendition.hooks.render.register(function(contents, view) {

    contents.document.addEventListener('swiped-left', function(e) {
      console.log("swiped-left");
      rendition.next().then(() => afterDisplay(rendition.currentLocation()));
    });
    
    contents.document.addEventListener('swiped-right', function(e) {
      console.log("swiped-right");
      rendition.prev().then(() => afterDisplay(rendition.currentLocation()));
    });
  })

  var displayed
  if(localStorage.getItem(CURRENTPAGEID)) {
    displayed = rendition.display(getStorage(CURRENTPAGEID)).then(() => afterDisplay(rendition.currentLocation()));
  } else {
    displayed = rendition.display().then(() => afterDisplay(rendition.currentLocation()));
  }
  console.log('displayed')
  console.log(displayed)

  displayed.then(function(renderer){
    loadingCover.innerHTML = ''
    // -- do stuff
  });

  function afterDisplay(currentLocation){
    console.log(currentLocation)
    saveCurrentLocation(currentLocation);
    const {
      page,
      total
    } = currentLocation.start.displayed
    footer.textContent = `${page} / ${total}`
    tocSelect.selectedIndex = currentLocation.start.index
    console.log(tocSelect.options[currentLocation.start.index])
    openbtn.innerHTML = `&#9776; ${tocSelect.options[currentLocation.start.index].label}`
  }

  // Navigation loaded
  book.loaded.navigation.then(function(toc){
    const {
      tocByHref
    } = toc;
    console.log(toc);
    console.log(tocByHref);
    const docfrag = document.createDocumentFragment();
    function tickToc(toc) {
      function createOption(chapterObj) {
        var option = document.createElement("option");
        option.textContent = chapterObj.label;
        option.ref = chapterObj.href;
        return option
      }
      toc.forEach(function(chapter) {
        var option = createOption(chapter)
        docfrag.appendChild(option);
        if (chapter.subitems.length >= 0) {
          tickToc(chapter.subitems)
        }
      });
    }
    tickToc(toc)
    tocSelect.appendChild(docfrag);
    tocSelect.onchange = function(){
        var index = tocSelect.selectedIndex,
            url = tocSelect.options[index].ref;
        rendition.display(url).then(() => {
          afterDisplay(rendition.currentLocation());
        })
        return false;
    };
  });

  var next = document.getElementById("next");
  next.addEventListener("click", function(){

    rendition.next().then(() => afterDisplay(rendition.currentLocation()));
  }, false);

  var prev = document.getElementById("prev");
  prev.addEventListener("click", function(){

    rendition.prev().then(() => afterDisplay(rendition.currentLocation()));
  }, false);

  var keyListener = function(e) {

    // Left Key
    if ((e.code || e.key) === "ArrowLeft") {
      rendition.prev().then(() => afterDisplay(rendition.currentLocation()));
    }

    // Right Key
    if ((e.code || e.key) === "ArrowRight") {
      rendition.next().then(() => afterDisplay(rendition.currentLocation()));
    }
  }
  rendition.on("keyup", keyListener);
  document.addEventListener("keyup", keyListener, false);

// }
