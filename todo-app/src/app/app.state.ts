import { TodoState } from "./todo/store/todo.reducer";

export interface AppStore {
  todo: TodoState;
}
