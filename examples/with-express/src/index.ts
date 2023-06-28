import express, { Request, Response } from 'express'

// Define the shape of a Todo item
interface Todo {
	id: number
	title: string
	completed: boolean
}

// Example array of Todos
let todos: Todo[] = [
	{ id: 1, title: 'Write TypeScript', completed: false },
	{ id: 2, title: 'Write Express.js', completed: false }
]

const app = express()
app.use(express.json())

// CRUD operations
app.get('/todos', (req: Request, res: Response) => {
	res.json(todos)
})

app.post('/todos', (req: Request, res: Response) => {
	const newTodo: Todo = req.body
	todos.push(newTodo)
	res.status(201).json(newTodo)
})

app.put('/todos/:id', (req: Request, res: Response) => {
	const id: number = parseInt(req.params.id, 10)

	const foundTodo = todos.find((todo) => todo.id === id)

	// @ts-ignore
	foundTodo.completed = req.body.completed
	// @ts-ignore
	foundTodo.title = req.body.title

	res.json(foundTodo)
})

app.delete('/todos/:id', (req: Request, res: Response) => {
	const id: number = parseInt(req.params.id, 10)
	todos = todos.filter((todo) => todo.id !== id)
	res.status(204).end()
})

app.listen(3000, () => console.log('Server is listening on port 3000'))
