"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
class Todo {
    constructor(name, done, id) {
        this.name = name;
        this.done = done;
        this.id = id;
    }
}
let todos = [];
const app = (0, express_1.default)();
const port = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
app.use(express_1.default.json());
app.use((0, cors_1.default)({ origin: process.env.FRONTEND_URL }));
app.get("/todos", (req, res) => {
    res.send(todos);
});
app.get("/todos/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const todo = todos.find((todo) => todo.id === id);
    if (todo) {
        res.send(todo);
    }
    else {
        res.sendStatus(404).send({ message: "Todo not found" });
    }
});
app.post("/todos", (req, res) => {
    const id = Math.round(Math.random() * 4294967296);
    const todo = new Todo(req.body.name, false, id);
    todos.push(todo);
    res.send(todo);
});
app.patch("/todos/:id/toggle", (req, res) => {
    //Update todo
    const id = parseInt(req.params.id);
    let todo = todos.find((todo) => todo.id === id);
    if (todo) {
        todo.done = !todo.done;
        res.send({ id: todo.id });
    }
    else {
        res.sendStatus(404).send({ message: "Todo not found" });
    }
});
app.delete("/todos/:id", (req, res) => {
    const id = parseInt(req.params.id);
    let todo = todos.find((todo) => todo.id === id);
    if (todo) {
        todos = todos.filter((todo) => todo.id !== id);
        res.statusCode = 204;
        res.send({ id });
    }
    else {
        res.sendStatus(404).send({ message: "Todo not found" });
    }
});
const parsedPort = parseInt(port);
app.listen(parsedPort, "0.0.0.0", () => {
    console.log(`Server is running on port ${parsedPort}`);
    console.log(`${process.env.FRONTEND_URL}`);
});
