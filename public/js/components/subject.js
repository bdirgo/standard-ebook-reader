import { h, Component } from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';
const html = htm.bind(h);

import xmlToJson from '../../lib/xmlToJson.js';
import shuffle from '../../lib/shuffle.js';

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

export const Subject = ({subject, text, url, onClick}) => {
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
    return (html`
        <${Heading} text=${subject} />
        <${Content} text=${text} />
        <${SubjectList} isBrowse=${true} url=${url} onClick=${onClick} />
    `);
}

const Heading = ({text}) => {
    return (html`
        <h2>
            ${text}
        </h2>
    `)
}

const Content = ({text}) => {
    return html`<p>${text}</p>`
}

class Entry {
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

class SubjectList extends Component {
    constructor() {
        super();
        this.state = {
            error: null,
            isLoaded: false,
            items: [],
        };
        this.handleClick = this.handleClick.bind(this)
    }

    componentDidMount() {
        const { url } = this.props; // clamp number of items to 10 ish, add see all button
        // lazy load in the images, need placeholders so no jumping
        fetch(url).then(res => res.text())
            .then(str => xmlToJson(new window.DOMParser().parseFromString(str, "text/xml")), 
                (error) => {
                    this.setState({
                        isLoaded: true,
                        error
                    });
                })
            .then(
                (result) => {
                    console.log(result.feed.entry)
                    const entries = result.feed.entry.map(e => new Entry(e))
                    this.setState({
                        isLoaded: true,
                        entries: shuffle(entries)
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
        const { isBrowse } = this.props;
        const { error, isLoaded, entries = [] } = this.state;
        let entriesMap = entries;
        if (isBrowse) {
            entriesMap = entries.slice(0,6)
        }
        if (error) {
            return html`<div>Error: ${error.message}</div>`;
        } else if (!isLoaded) {
            return html`<div>Loading...</div>`;
        } else {
            // add class from index
            return (html`
                <ul class="subject-list ${isBrowse ? 'browse' : ''}">
                    ${entriesMap.map((entry) => {
                        return html`
                            <${SubjectListEntry} entry=${entry} onClick=${this.handleClick}/>
                        `
                    })}
                    <li class="subject-list-link">
                        <a href=${'#'}>See all</a>
                    </li>
                </ul>
            `)
        }
    }
}

const SubjectListEntry = ({entry, onClick}) => {
    const standardURL = 'https://standardebooks.org/'
    return (html`
        <li class="subject-list-image" onClick=${onClick}>
            <img class="book-cover" id=${entry.id} width=${'350'} height=${'525'} src=${standardURL + entry.thumbnail} alt=${entry.title}/>
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
            epubLink,
            cover,
            categories,
        } = entry;
        const readLink = `/ebook.html?book=${epubLink.slice(0, -5)}`
        console.log(entry)
        return (html`
            <div class="modal ${!show ? 'hide' : ''}">
                <div class="modal-content">
                    <span onClick=${toggleDetails} class="close">X</span>
                    <a href=${readLink}>
                        <img class="img-fluid detail-book-cover " width=1400 height=2100 src=${this.standardURL + cover} />
                    </a>
                    <h2><a href=${readLink}>${title}</a></h2>
                    <${AuthorDetails} authors=${authorArray} />
                    <p>${summary}</p>
                    <a href=${readLink}>Read now</a>
                </div>
            </div>
        `);
    }
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