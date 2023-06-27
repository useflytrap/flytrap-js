
printf "Retrieving all todos (curl -X GET http://localhost:3000/todos)\n\n"
curl -X GET http://localhost:3000/todos
printf "\n\n"

printf "Adding a new todo\n\n"
curl -X POST -H "Content-Type: application/json" -d '{"id": 3, "title": "Test Todo", "completed": false}' http://localhost:3000/todos
printf "\n\n"

printf "Updating a todo (with a bad ID value)\n\n"
curl -X PUT -H "Content-Type: application/json" -d '{"title": "Updated Todo", "completed": true}' http://localhost:3000/todos/59
printf "\n\n"

printf "Deleting a todo\n\n"
curl -X DELETE http://localhost:3000/todos/1
printf "\n\n"
