import { inject } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { catchError, exhaustMap, map, of } from "rxjs";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { TodoService } from "../todo.service";
import {
  loadTodosStarted,
  loadTodosSuccess,
  loadTodosError,
  addTodoStarted,
  addTodoSuccess,
  AddTodoRequest,
  addTodoError,
  removeTodoStarted,
  removeTodoError,
  RemoveTodoRequest,
  removeTodoSuccess,
  toggleTodoStarted,
  toggleTodoError,
  ToggleTodoRequest,
  toggleTodoSuccess
} from "./todo.actions";

const handleGetTodosSideEffects$ = createEffect(
  (actions$ = inject(Actions), todoService = inject(TodoService)) => {
    return actions$.pipe(
      ofType(loadTodosStarted),
      exhaustMap(() =>
        todoService.getTodos().pipe(
          map((todos) => loadTodosSuccess({ todos })),
          catchError(({ message }: HttpErrorResponse) => {
            return of(loadTodosError({ message }));
          })
        )
      )
    );
  },
  { functional: true }
);

const handleAddTodoSideEffects$ = createEffect(
  (actions$ = inject(Actions), todoService = inject(TodoService)) => {
    return actions$.pipe(
      ofType(addTodoStarted),
      exhaustMap((todo: AddTodoRequest) =>
        todoService.addTodo(todo).pipe(
          map((todo) => addTodoSuccess(todo)),
          catchError(({ message }: HttpErrorResponse) => {
            return of(addTodoError({ message }));
          })
        )
      )
    );
  },
  { functional: true }
);

const handleDeleteTodoSideEffects$ = createEffect(
  (actions$ = inject(Actions), todoService = inject(TodoService)) => {
    return actions$.pipe(
      ofType(removeTodoStarted),
      exhaustMap((id: RemoveTodoRequest) =>
        todoService.removeTodo(id).pipe(
          map(() => removeTodoSuccess(id)),
          catchError(({ message }: HttpErrorResponse) => {
            return of(removeTodoError({ message }));
          })
        )
      )
    );
  },
  { functional: true }
);

const handleToggleTodoSideEffects$ = createEffect(
  (actions$ = inject(Actions), todoService = inject(TodoService)) => {
    return actions$.pipe(
      ofType(toggleTodoStarted),
      exhaustMap((todo: ToggleTodoRequest) =>
        todoService.toggleDone(todo).pipe(
          map((todo) => toggleTodoSuccess(todo)),
          catchError(({ message }: HttpErrorResponse) => {
            return of(toggleTodoError({ message }));
          })
        )
      )
    );
  },
  { functional: true }
);

export const todoEffects = {
  handleGetTodosSideEffects$,
  handleAddTodoSideEffects$,
  handleDeleteTodoSideEffects$,
  handleToggleTodoSideEffects$
};
