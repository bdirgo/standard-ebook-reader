import {Moon, Sun, darkModeID, dark, light} from './constats.js'

let populateStorage = (id, value) => {
    window.localStorage.setItem(id, value);
}
let setStyles = (body, darkButton) => {
    let darkMode = window.localStorage.getItem(darkModeID);
    if (darkMode === dark) {
        body.classList.add(dark)
        darkButton.innerHTML = Sun;
    } else {
        body.classList.remove(dark)
        darkButton.innerHTML = Moon;
    }
    darkButton.setAttribute('value', darkMode)
}
let toggleDarkMode = (body, darkButton) => {
    let darkMode = window.localStorage.getItem(darkModeID);
    if (darkMode === dark) {
        populateStorage(darkModeID, light);
    } else {
        populateStorage(darkModeID, dark);
    }
    setStyles(body, darkButton)
}

export {populateStorage, setStyles, toggleDarkMode}