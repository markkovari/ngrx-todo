import { Component, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { addTodo } from '../store/todo.actions';
import { AppState } from '../app.state';
import { getTodos } from '../store/todo.selector';
import { TodoListItemComponent } from '../todo-list-item/todo-list-item.component';
import { TodoCountComponent } from '../todo-count/todo-count.component';

export interface Todo {
  id: number;
  name: string;
  done: boolean;
}

@Component({
  selector: 'app-todo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TodoListItemComponent,
    TodoCountComponent,
  ],
  templateUrl: './todo.component.html',
  styleUrl: './todo.component.css',
})
export class TodoComponent {
  private readonly store = inject(Store<AppState>);

  newTodo: Todo = { id: 0, name: '', done: false };
  todo$ = this.store.select(getTodos);

  constructor() {}

  onAddTodo() {
    this.newTodo.id = Math.floor(Math.random() * 10000);
    this.newTodo.done = false;
    this.store.dispatch(addTodo({ todo: this.newTodo }));
    this.newTodo = { id: 0, name: '', done: false };
  }
}
