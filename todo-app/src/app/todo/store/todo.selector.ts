import { AppStore } from "../../app.state";

export const getTodos = (state: AppStore) => state.todo.todos;
export const getTodoNotDone = (state: AppStore) => state.todo.todos.filter((todo) => !todo.done).length;
export const getTodoDone = (state: AppStore) => state.todo.todos.filter((todo) => todo.done).length;
