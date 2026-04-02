import express, { Request, Response } from "express";
import cors from "cors";
class Todo {
  id: number;
  name: string;
  done: boolean;

  constructor(name: string, done: boolean, id: number) {
    this.name = name;
    this.done = done;
    this.id = id;
  }
}

let todos: Todo[] = [];

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL }));

app.get("/todos", (req: Request, res: Response) => {
  res.send(todos);
});

app.get("/todos/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const todo = todos.find((todo) => todo.id === id);
  if (todo) {
    res.send(todo);
  } else {
    res.status(404).send({ message: "Todo not found" });
  }
});

app.post("/todos", (req: Request, res: Response) => {
  const id = Math.round(Math.random() * 4_294_967_296);
  const todo = new Todo(req.body.name, false, id);
  todos.push(todo);
  res.send(todo);
});

app.patch("/todos/:id/toggle", (req: Request, res: Response) => {
  //Update todo
  const id = parseInt(req.params.id);
  let todo = todos.find((todo) => todo.id === id);
  if (todo) {
    todo.done = !todo.done;
    res.send({ id: todo.id });
  } else {
    res.status(404).send({ message: "Todo not found" });
  }
});

app.delete("/todos/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  let todo = todos.find((todo) => todo.id === id);
  if (todo) {
    todos = todos.filter((todo) => todo.id !== id);
    res.statusCode = 204;
    res.send({ id });
  } else {
    res.status(404).send({ message: "Todo not found" });
  }
});

const parsedPort = parseInt(port as string);
app.listen(parsedPort, "0.0.0.0", () => {
  console.log(`Server is running on port ${parsedPort}`);
  console.log(`${process.env.FRONTEND_URL}`);
});
