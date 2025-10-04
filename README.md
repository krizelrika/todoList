# To-Do List

A Todo List application built with JavaScript, Webpack, and localStorage. The app organizes tasks into projects, supports priorities and due dates, and persists data between sessions.

## 🚀 Features

- Projects & Todos:
    * Default project (Inbox) on first load.
    * Create, view, and delete projects.
    * Add, view, edit, and delete todos.
- Todo Properties:
    * Title, description, due date, priority (low/medium/high).
    * Optional notes and checklist.
    * Expandable todo cards for details.
    * Mark todos as complete.
- Data Persistence:
    * Saves todos & projects to localStorage.
    * Automatically reloads saved data on startup.
    * Handles missing or invalid storage data gracefully.
- UI/UX:
    * Sidebar for projects.
    * Main section for todos.
    * Priority-based styling (e.g. red = high, yellow = medium, green = low).
    * Add project/todo via buttons + forms.
    * Clean modular DOM updates.

## 🎯 Usage
- Start in the default Inbox project.
- Create a new project from the sidebar.
- Add todos to a project (title, due date, priority, etc.).
- Expand a todo to see/edit details.
- Delete or complete todos.
- Data automatically saves to localStorage.

## 🌱 Future Enhancements
- Add search or filtering by priority/due date.
- Implement checklist subtasks inside todos.
- Add reminders/alerts for upcoming due dates.
- Improve mobile responsiveness.