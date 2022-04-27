import {populateStorage, setStyles, toggleDarkMode} from './utility.js'
import {Moon, darkModeID, light, dark} from './constats.js'

let body = document.getElementsByTagName("body")[0]
let darkButton = document.getElementById("dark-button")
if(typeof(darkButton) === 'undefined' || darkButton === null){
    darkButton = document.createElement('button')
}
darkButton.addEventListener("click", () => toggleDarkMode(body, darkButton), false);
darkButton.innerHTML = Moon;
const handlePreferenceChange = (mql) => {
    if (mql.matches) {
        populateStorage(darkModeID, dark);
        setStyles(body, darkButton);
    } else {
        populateStorage(darkModeID, light);
        setStyles(body, darkButton);
    }
}
const mediaPreference = window.matchMedia('(prefers-color-scheme: dark)');
if (mediaPreference.media !== 'not all') {
    console.log("🎉 Dark mode supported!")
    mediaPreference.addEventListener('change', handlePreferenceChange);
    handlePreferenceChange(mediaPreference);
} else {
    console.log("💩")
}
if(!window.localStorage.getItem(darkModeID)) {
    populateStorage(darkModeID, light);
}
setStyles(body, darkButton)