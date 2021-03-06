
    var $viewer = document.getElementById("viewer");
    var $next = document.getElementById("next");
    var $prev = document.getElementById("prev");
    var currentSection;
    var currentSectionIndex = 6;

    var book = ePub("https://s3.amazonaws.com/epubjs/books/moby-dick/OPS/package.opf");
    book.loaded.navigation.then(function(toc){
      var $select = document.getElementById("toc"),
          docfrag = document.createDocumentFragment();

      toc.forEach(function(chapter) {
        var option = document.createElement("option");
        option.textContent = chapter.label;
        option.ref = chapter.href;

        docfrag.appendChild(option);
      });

      $select.appendChild(docfrag);

      $select.onchange = function(){
          var index = $select.selectedIndex,
              url = $select.options[index].ref;
          display(url);
          return false;
      };

      book.opened.then(function(){
        display(currentSectionIndex);
      });

      $next.addEventListener("click", function(){
        var displayed = display(currentSectionIndex+1);
        if(displayed) currentSectionIndex++;
      }, false);

      $prev.addEventListener("click", function(){
        var displayed = display(currentSectionIndex-1);
        if(displayed) currentSectionIndex--;
      }, false);

      function display(item){
        var section = book.spine.get(item);
        if(section) {
          currentSection = section;
          section.render().then(function(html){
            // $viewer.srcdoc = html;
            $viewer.innerHTML = html;
          });
        }
        return section;
      }

    });
  