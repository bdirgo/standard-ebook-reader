import { h, Component } from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';
import xmlToJson from '../../lib/xmlToJson.js';
import shuffle from '../../lib/shuffle.js';

const html = htm.bind(h);
const CURRENTLYREADING = 'currentlyReading'

const populateStorage = (id, value) => {
    // TODO: use IndexDB
    window.localStorage.setItem(id, JSON.stringify(value));
}
const getStorage = (id) => {
    return JSON.parse(window.localStorage.getItem(id));
}

export class Clock extends Component {
    constructor() {
        super();
        this.state = { time: Date.now() };
    }

    // Lifecycle: Called whenever our component is created
    componentDidMount() {
        // update time every second
        this.timer = setInterval(() => {
        this.setState({ time: Date.now() });
        }, 1000);
    }

    // Lifecycle: Called just before our component will be destroyed
    componentWillUnmount() {
        // stop when not renderable
        clearInterval(this.timer);
    }

    render() {
        let time = new Date(this.state.time).toLocaleTimeString();
        return html`<span>${time}</span>`;
    }
}

export class HelloName extends Component {
    // Add `name` to the initial state
    state = { value: '', name: 'world' }

    onInput = ev => {
        this.setState({ value: ev.target.value });
    }

    // Add a submit handler that updates the `name` with the latest input value
    onSubmit = ev => {
        // Prevent default browser behavior (aka don't submit the form here)
        ev.preventDefault();

        this.setState({ name: this.state.value });
    }

    render() {
        return (html`
        <div>
            <h1>Hello, ${this.state.name}!</h1>
            <form onSubmit=${this.onSubmit}>
            <input type="text" value=${this.state.value} onInput=${this.onInput} />
            <button type="submit">Update</button>
            </form>
        </div>
        `);
    }
}

/*
* <entry>
*  <title>Adventure</title>
*  <link href="/opds/subjects/adventure" rel="subsection" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
*  <updated>2020-12-23T22:54:14Z</updated>
*  <id>https://standardebooks.org/opds/subjects/adventure</id>
*  <content type="text">
*      30 Standard Ebooks tagged with “adventure,” most-recently-released first.
*  </content>
* </entry>
**/
export const Subject = ({ subject, id, isBrowse, seeAll, url, onClick, onClickBook }) => {
    return (html`
        <${Heading} text=${subject} id=${id} seeAll=${seeAll} onClick=${onClick} />
        ${!seeAll ? html`<a href='#' onClick=${onClick}>Back</a>` : html``}
        <ul class="subject-list ${isBrowse && 'browse'} ${seeAll ? '' : 'block'}">
            <${SubjectList} id=${id} isBrowse=${isBrowse} seeAll=${seeAll} url=${url} onClick=${onClickBook} />
            ${seeAll && html`<li class="subject-list-link">
                <a href='#' id=${id} onClick=${onClick}>See all</a>
            </li>`}
        </ul>
    `);
}

const Heading = ({text, seeAll, id, onClick}) => {
    return (html`
        <h2 class="subject-heading">
            ${text}
            ${seeAll ? html`<a class="subject-heading-link" href="#" id=${id} onClick=${onClick}>></a>` : ''}
        </h2>
    `)
}

const Content = ({text}) => {
    return html`<p>${text}</p>`
}

export class Entry {
    constructor(entry){
        this.id = this.getText(entry.id)
        this.title = this.getText(entry.title)
        this.summary = this.getText(entry.summary)
        this.authorArray = this.getAuthor(entry.author)
        this.language = this.getText(entry['dc:language'])
        this.issuedDate = new Date(this.getText(entry['dc:issued']))
        this.updatedDate = new Date(this.getText(entry.updated))
        this.thumbnail = this.filterThumbnail(entry.link)
        this.cover = this.filterCover(entry.link)
        this.epubLink = this.filterRecommendedEpub(entry.link)
        this.ebookLink = this.epubLink.slice(0, -5)
        this.sources = this.filterSources(entry['dc:source'])
        this.categories = this.filterCategories(entry.category)
    }

    getAuthor(author) {
        if (Array.isArray(author)) {
            return author.map(auth => this.getText(auth.name))
        }
        return [this.getText(author.name)]
    }

    getText(object) {
        return object['#text']
    }

    getAttributes(object) {
        return object['@attributes']
    }

    filterThumbnail(links) {
        const linksOrEmptyArray = Array.isArray(links) ? links : []
        const linkObj = linksOrEmptyArray.filter(val => {
            const attrObj = this.getAttributes(val)
            return attrObj.rel === "http://opds-spec.org/image/thumbnail"
        })[0]
        return this.getAttributes(linkObj).href
    }

    filterCover(links) {
        const linksOrEmptyArray = Array.isArray(links) ? links : []
        const linkObj = linksOrEmptyArray.filter(val => {
            const attrObj = this.getAttributes(val)
            return attrObj.rel === "http://opds-spec.org/image"
        })[0]
        return this.getAttributes(linkObj).href
    }

    filterRecommendedEpub(links) {
        const linksOrEmptyArray = Array.isArray(links) ? links : []
        const linkObj = linksOrEmptyArray.filter(val => {
            const attrObj = this.getAttributes(val)
            return attrObj.title === "Recommended compatible epub"
        })[0]
        return this.getAttributes(linkObj).href
    }

    filterCategories(categories) {
        const categoriesOrEmptyArray = Array.isArray(categories) ? categories : []
        return categoriesOrEmptyArray.map((cat) => this.getAttributes(cat).term)
    }

    filterSources(sources) {
        const sourcesOrEmptyArray = Array.isArray(sources) ? sources : []
        return sourcesOrEmptyArray.map((source) => this.getText(source))
    }
}

export class SubjectEntry {
    constructor(entry) {
        this.id = this.getText(entry.id)
        this.title = this.getText(entry.title)
        this.content = this.getText(entry.content)
    }
    getText(object) {
        return object['#text']
    }

    getAttributes(object) {
        return object['@attributes']
    }
}

export class SubjectList extends Component {
    constructor(props) {
        super();
        this.state = {
            error: null,
            isLoaded: false,
            entries: [],
            filteredEntries: [],
        };
        this.handleClick = this.handleClick.bind(this)
    }
    filterRecentBooks(entries) {
        const currentBookUrls = getStorage(CURRENTLYREADING)
        if(currentBookUrls.length === 0) {
            return []
        }
        const recentBooks = currentBookUrls.slice(0,8)
        const bumpyArray = recentBooks.map((bookUrl) => {
            return entries.filter((entry) => bookUrl === entry.ebookLink)
        })
        if (!Array.prototype.flat) {
            return bumpyArray.reduce((acc, val) => acc.concat(val), [])
        }
        return bumpyArray.flat()   
    }
    componentDidMount() {
        const { url } = this.props;
            fetch(url).then(res => res.text())
                .then(str => xmlToJson(new window.DOMParser().parseFromString(str, "text/xml")), 
                    (error) => {this.setState({isLoaded: true,error})})
                .then(
                    (result) => {
                        console.log(result.feed.entry)
                        let entries = result.feed.entry.map(e => new Entry(e))
                        let filteredEntries = [];
                        console.log(this.props.isBrowse)
                        if (!this.props.isBrowse) {
                            filteredEntries = this.filterRecentBooks(entries)
                        }
                        this.setState({
                            isLoaded: true,
                            entries: entries,
                            filteredEntries: filteredEntries,
                        });
                    },
                    // Note: it's important to handle errors here
                    // instead of a catch() block so that we don't swallow
                    // exceptions from actual bugs in components.
                    (error) => {
                        this.setState({
                            isLoaded: true,
                            error
                        });
                    }
                )
    }
    handleClick(ev) {
        ev.preventDefault();
        const { onClick } = this.props
        const target = ev.target
        const clickedEntry = this.state.entries.filter(entry => entry.id === target.id)[0]
        onClick(clickedEntry)
    }
    render() {
        const { id, seeAll } = this.props;
        const { error, isLoaded, entries, filteredEntries } = this.state;
        populateStorage(id, this.state)
        // const entriesMap = isBrowse ? entries.slice(0,6) : filteredEntries
        const entriesMap = !seeAll ? entries : entries.slice(0,6)
        console.log(entries)
        if (error) {
            return html`<div>Error: ${error.message}</div>`;
        } else if (!isLoaded) {
            return html`<div>Loading...</div>`;
        } else {
            // add class from index, for "see all" case
            return (html`
                ${entriesMap.map((entry) => {
                    return html`
                        <${SubjectListEntry} seeAll=${seeAll} entry=${entry} onClick=${this.handleClick}/>
                    `
                })}
            `)
        }
    }
}

export const SubjectListEntry = ({entry, seeAll, onClick}) => {
    const standardURL = 'https://standardebooks.org/'
    return (html`
        <li class="${seeAll ? 'subject-list-image' :  'card'}" onClick=${onClick}>
            <img class="book-cover" id=${entry.id} width=${'350'} height=${'525'} src=${standardURL + entry.thumbnail} alt=${entry.title}/>
            ${!seeAll
                ? html`
                <div class="card-body">
                    <b id=${entry.id}>${entry.title}</b>
                    <${Content} id=${entry.id} text=${entry.summary} />
                </div>
                `
                : ''}
        </li>
    `)
}

export class DetailView extends Component {
    constructor() {
        super();
        this.standardURL = 'https://standardebooks.org'
        this.escFunction = this.escFunction.bind(this);
    }
    escFunction(event) {
      if(event.keyCode === 27) {
        this.props.toggleDetails()
      }
    }
    componentDidMount() {
        document.addEventListener("keydown", this.escFunction, false);
        fetch(this.standardURL + this.props.entry.epubLink).then(() => console.log('fetched'))
    }
    componentWillUnmount(){
        document.removeEventListener("keydown", this.escFunction, false);
    }
    render() {
        const {
            toggleDetails,
            show,
            entry,
        } = this.props;
        const {
            title,
            summary,
            authorArray,
            ebookLink,
            cover,
            categories,
            id,
            language,
            issuedDate,
            updatedDate,
            sources,
        } = entry;
        const readLink = `/ebook.html?book=${ebookLink}`
        console.log(entry)
        return (html`
            <div class="modal ${!show ? 'hide' : ''}">
                <div class="modal-content">
                    <span onClick=${toggleDetails} class="close">X</span>
                    <a href=${readLink}>
                        <img class="img-fluid detail-book-cover " src=${this.standardURL + cover} />
                    </a>
                    <h2><a href=${readLink}>${title}</a></h2>
                    <${AuthorDetails} authors=${authorArray} />
                    <p>${summary}</p>
                    ${categories.length ? html`<${Categories} items=${categories} />` : ''}
                    <a href=${readLink}>Add to Library</a>
                </div>
            </div>
        `);
    }
}

const Categories = ({
    items,
}) => {
    return html`
        <b>Categories</b>
        <ul>
            ${items.reverse().map(item => {
                return html`
                    <li>${item}</li>
                `
            })}
        </ul>
    `
}

const AuthorDetails = ({
    authors,
}) => {
    console.log(authors)
    return (html`
        <i>${authors.map((author, index) => {
            return (html`${index > 0 ? ', and ' : ''}<a key=${JSON.stringify(author)} href=${`/?q=${author}`}>${author}</a>`) 
        })}</i>
    `)
}