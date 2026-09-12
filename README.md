# Todo Pro

A lightweight, dependency-free todo manager built with vanilla HTML, CSS, and JavaScript.

## Features

- Add, edit, complete, reopen, and delete tasks
- Priorities: low, medium, high
- Due dates with overdue detection
- Tags
- Search by task text or tag
- Filters for all, active, completed, today, and overdue
- Sort by newest, oldest, priority, or due date
- Live productivity stats
- LocalStorage persistence
- JSON import/export backups
- Dark/light theme
- Keyboard shortcuts (`N` for new task, `/` for search)
- Responsive mobile layout
- Offline support through a service worker
- Installable web-app manifest

## Run

Because the app is completely static, you can open `index.html` directly for basic use.

For full PWA/service-worker behavior, serve the repository over HTTP, for example with GitHub Pages or any static server.

## Data

Tasks are stored locally in the browser using `localStorage`. Export a JSON backup if you want to move your tasks to another browser/device.
