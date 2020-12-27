  import { h, Component } from 'https://unpkg.com/preact?module';
import htm from 'https://unpkg.com/htm?module';
const html = htm.bind(h);

export default class TodoList extends Component {
    state = { todos: [], text: '' };
    setText = e => {
        this.setState({ text: e.target.value });
    };
    addTodo = () => {
        let { todos, text } = this.state;
        todos = todos.concat({ text });
        this.setState({ todos, text: '' });
    };
    render({ }, { todos, text }) {
        return (html`
            <form onSubmit=${this.addTodo} action="javascript:">
                <label>
                  <span>Add Todo</span>
                  <input value=${text} onInput=${this.setText} />
                </label>
                <button type="submit">Add</button>
                <ul>
                    ${ todos.map( todo => (
                        html`<li>${todo.text}</li>`
                    )) }
                </ul>
            </form>
        `);
    }
}