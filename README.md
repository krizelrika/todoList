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