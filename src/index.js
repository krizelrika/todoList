// Simple in-file module system to mimic separated modules
    const AppModules = (() => {
      const modules = {};
      const define = (name, factory) => { modules[name] = { factory, instance: null }; };
      const require = (name) => {
        if (!modules[name]) throw new Error('Module not found: ' + name);
        if (!modules[name].instance) modules[name].instance = modules[name].factory(require);
        return modules[name].instance;
      };
      return { define, require };
    })();

    // todo.js
    AppModules.define('todo', () => {
      class Todo {
        constructor({ id, title, description = '', dueDate, priority = 'medium', notes = '', checklist = [], completed = false }) {
          this.id = id || ('td_' + Math.random().toString(36).slice(2, 10));
          this.title = title;
          this.description = description;
          this.dueDate = dueDate ? new Date(dueDate) : null;
          this.priority = priority; // 'low' | 'medium' | 'high'
          this.notes = notes;
          this.checklist = (checklist || []).map(item => ({
            id: item.id || ('cl_' + Math.random().toString(36).slice(2, 10)),
            text: item.text || '',
            done: !!item.done
          }));
          this.completed = !!completed;
        }
        toggleComplete() { this.completed = !this.completed; }
        setPriority(p) { this.priority = p; }
        setDueDate(d) { this.dueDate = d ? new Date(d) : null; }
        addChecklistItem(text) {
          const item = { id: 'cl_' + Math.random().toString(36).slice(2, 10), text, done: false };
          this.checklist.push(item); return item;
        }
        toggleChecklistItem(id) {
          const found = this.checklist.find(i => i.id === id);
          if (found) found.done = !found.done;
        }
        removeChecklistItem(id) {
          this.checklist = this.checklist.filter(i => i.id !== id);
        }
        toJSON() {
          return {
            id: this.id,
            title: this.title,
            description: this.description,
            dueDate: this.dueDate ? this.dueDate.toISOString() : null,
            priority: this.priority,
            notes: this.notes,
            checklist: this.checklist,
            completed: this.completed
          };
        }
      }
      return { Todo };
    });

    // project.js
    AppModules.define('project', (require) => {
      const { Todo } = require('todo');
      class Project {
        constructor({ id, title, todos = [] }) {
          this.id = id || ('pr_' + Math.random().toString(36).slice(2, 10));
          this.title = title || 'Untitled';
          this.todos = todos.map(t => new Todo(t));
        }
        addTodo(todoData) {
          const t = (todoData instanceof require('todo').Todo) ? todoData : new Todo(todoData);
          this.todos.push(t); return t;
        }
        removeTodo(todoId) {
          this.todos = this.todos.filter(t => t.id !== todoId);
        }
        findTodo(todoId) {
          return this.todos.find(t => t.id === todoId);
        }
        toJSON() {
          return { id: this.id, title: this.title, todos: this.todos.map(t => t.toJSON()) };
        }
      }
      return { Project };
    });

    // storage.js
    AppModules.define('storage', (require) => {
      const KEY = 'modular_todo_projects_v1';
      const { Project } = require('project');

      function save(projects, selectedProjectId) {
        try {
          const payload = {
            projects: projects.map(p => p.toJSON()),
            selectedProjectId: selectedProjectId || null
          };
          localStorage.setItem(KEY, JSON.stringify(payload));
        } catch (e) { console.warn('Save failed', e); }
      }

      function load() {
        try {
          const raw = localStorage.getItem(KEY);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          const projects = (parsed.projects || []).map(p => new Project(p));
          return { projects, selectedProjectId: parsed.selectedProjectId || null };
        } catch (e) {
          console.warn('Load failed', e);
          return null;
        }
      }

      return { save, load };
    });

    // projectManager.js
    AppModules.define('projectManager', (require) => {
      const { Project } = require('project');
      const { Todo } = require('todo');
      const Storage = require('storage');

      class ProjectManager {
        constructor() {
          this.projects = [];
          this.selectedProjectId = null;
        }
        init() {
          const loaded = Storage.load();
          if (loaded && loaded.projects.length) {
            this.projects = loaded.projects;
            if (!this.projects.find(p => p.title === 'Inbox')) {
              this.projects.unshift(new Project({ title: 'Inbox' }));
            }
            this.selectedProjectId = loaded.selectedProjectId || this.projects[0].id;
          } else {
            const inbox = new Project({ title: 'Inbox' });
            this.projects = [inbox];
            this.selectedProjectId = inbox.id;
            Storage.save(this.projects, this.selectedProjectId);
          }
        }
        get selectedProject() {
          return this.projects.find(p => p.id === this.selectedProjectId);
        }
        selectProject(id) {
          if (this.projects.some(p => p.id === id)) {
            this.selectedProjectId = id;
            Storage.save(this.projects, this.selectedProjectId);
          }
        }
        addProject(title) {
          const p = new Project({ title });
          this.projects.push(p);
          Storage.save(this.projects, this.selectedProjectId);
          return p;
        }
        addTodoToSelected(todoData) {
          if (!this.selectedProject) return null;
          const t = new Todo(todoData);
          this.selectedProject.addTodo(t);
          Storage.save(this.projects, this.selectedProjectId);
          return t;
        }
        updateTodo(projectId, todoId, updates) {
          const p = this.projects.find(pr => pr.id === projectId);
          if (!p) return null;
          const t = p.findTodo(todoId);
          if (!t) return null;
          Object.assign(t, updates);
          if (updates.dueDate !== undefined) t.setDueDate(updates.dueDate);
          if (updates.priority) t.setPriority(updates.priority);
          Storage.save(this.projects, this.selectedProjectId);
          return t;
        }
        removeTodo(projectId, todoId) {
          const p = this.projects.find(pr => pr.id === projectId);
          if (!p) return;
          p.removeTodo(todoId);
          Storage.save(this.projects, this.selectedProjectId);
        }
        toggleTodo(projectId, todoId) {
          const p = this.projects.find(pr => pr.id === projectId);
          if (!p) return;
          const t = p.findTodo(todoId);
          if (!t) return;
          t.toggleComplete();
          Storage.save(this.projects, this.selectedProjectId);
        }
        addChecklistItem(projectId, todoId, text) {
          const p = this.projects.find(pr => pr.id === projectId);
          if (!p) return null;
          const t = p.findTodo(todoId);
          if (!t) return null;
          const item = t.addChecklistItem(text);
          Storage.save(this.projects, this.selectedProjectId);
          return item;
        }
        toggleChecklistItem(projectId, todoId, itemId) {
          const p = this.projects.find(pr => pr.id === projectId);
          if (!p) return;
          const t = p.findTodo(todoId);
          if (!t) return;
          t.toggleChecklistItem(itemId);
          Storage.save(this.projects, this.selectedProjectId);
        }
        removeChecklistItem(projectId, todoId, itemId) {
          const p = this.projects.find(pr => pr.id === projectId);
          if (!p) return;
          const t = p.findTodo(todoId);
          if (!t) return;
          t.removeChecklistItem(itemId);
          Storage.save(this.projects, this.selectedProjectId);
        }
      }
      return { ProjectManager };
    });

    // domController.js
    AppModules.define('domController', (require) => {
      const { ProjectManager } = require('projectManager');
      const PM = new ProjectManager();
      const { format, isBefore, startOfDay } = dateFns;

      // Elements
      const el = {
        projectsList: document.getElementById('projectsList'),
        addProjectBtn: document.getElementById('addProjectBtn'),
        projectModal: document.getElementById('projectModal'),
        projectForm: document.getElementById('projectForm'),
        projectTitle: document.getElementById('projectTitle'),

        currentProjectTitle: document.getElementById('currentProjectTitle'),
        projectMeta: document.getElementById('projectMeta'),
        todosContainer: document.getElementById('todosContainer'),

        addTodoBtn: document.getElementById('addTodoBtn'),
        todoModal: document.getElementById('todoModal'),
        todoModalTitle: document.getElementById('todoModalTitle'),
        todoForm: document.getElementById('todoForm'),
        todoId: document.getElementById('todoId'),
        todoTitle: document.getElementById('todoTitle'),
        todoDescription: document.getElementById('todoDescription'),
        todoDueDate: document.getElementById('todoDueDate'),
        todoPriority: document.getElementById('todoPriority'),
        todoNotes: document.getElementById('todoNotes'),
        checklistItems: document.getElementById('checklistItems'),
        addChecklistBtn: document.getElementById('addChecklistBtn'),
        newChecklistText: document.getElementById('newChecklistText'),

        filterPriority: document.getElementById('filterPriority'),
        searchBox: document.getElementById('searchBox'),
      };

      // State for editing todo in modal
      let editingContext = { projectId: null, todoId: null };

      // Modal helpers
      function openProjectModal() {
        el.projectModal.classList.add('show');
        el.projectTitle.value = '';
        el.projectTitle.focus();
      }
      function closeProjectModal() {
        el.projectModal.classList.remove('show');
      }
      function openTodoModal({ isEdit = false, projectId = null, todo = null } = {}) {
        el.todoModal.classList.add('show');
        editingContext = { projectId: projectId || PM.selectedProjectId, todoId: todo ? todo.id : null };
        el.todoModalTitle.textContent = isEdit ? 'Edit Todo' : 'New Todo';

        // Reset fields
        el.todoForm.reset();
        el.checklistItems.innerHTML = '';
        el.todoId.value = todo ? todo.id : '';
        el.todoTitle.value = todo ? todo.title : '';
        el.todoDescription.value = todo ? (todo.description || '') : '';
        el.todoDueDate.value = todo && todo.dueDate ? toInputDate(todo.dueDate) : '';
        el.todoPriority.value = todo ? todo.priority : 'medium';
        el.todoNotes.value = todo ? (todo.notes || '') : '';
        (todo ? (todo.checklist || []) : []).forEach(addChecklistRow);
        el.todoTitle.focus();
      }
      function closeTodoModal() {
        el.todoModal.classList.remove('show');
      }
      function toInputDate(d) {
        const date = new Date(d);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      }

      // Renderers
      function renderProjects() {
        el.projectsList.innerHTML = '';
        PM.projects.forEach(p => {
          const isActive = p.id === PM.selectedProjectId;
          const btn = document.createElement('button');
          btn.className = 'project-btn' + (isActive ? ' active' : '');
          btn.textContent = p.title;
          btn.onclick = () => {
            PM.selectProject(p.id);
            renderAll();
          };
          el.projectsList.appendChild(btn);
        });
      }

      function priorityPill(priority) {
        const span = document.createElement('span');
        span.className = 'pill ' + (priority === 'high' ? 'pill-high' : priority === 'medium' ? 'pill-med' : 'pill-low');
        span.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
        return span;
      }

      function renderHeader() {
        const p = PM.selectedProject;
        if (!p) return;
        el.currentProjectTitle.textContent = p.title;
        const count = p.todos.length;
        el.projectMeta.textContent = `${count} ${count === 1 ? 'todo' : 'todos'}`;
      }

      function matchFilter(todo) {
        const priorityFilter = el.filterPriority.value;
        const term = el.searchBox.value.trim().toLowerCase();
        if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;
        if (!term) return true;
        const hay = [todo.title, todo.description, todo.notes].join(' ').toLowerCase();
        return hay.includes(term);
      }

      function stripClassForPriority(priority){
        if (priority === 'high') return 'background: color-mix(in oklab, var(--prio-high-br) 80%, white 20%);';
        if (priority === 'medium') return 'background: color-mix(in oklab, var(--prio-med-br) 80%, white 20%);';
        return 'background: color-mix(in oklab, var(--prio-low-br) 75%, white 25%);';
      }

      function renderTodos() {
        const p = PM.selectedProject;
        el.todosContainer.innerHTML = '';
        if (!p) return;

        const todos = p.todos.filter(matchFilter);
        if (!todos.length) {
          const empty = document.createElement('div');
          empty.className = 'empty';
          empty.textContent = 'No todos match your filter.';
          el.todosContainer.appendChild(empty);
          return;
        }

        todos.forEach(todo => {
          const isOverdue = todo.dueDate ? isBefore(startOfDay(todo.dueDate), startOfDay(new Date())) && !todo.completed : false;

          const card = document.createElement('div');
          card.className = 'card';

          const top = document.createElement('div');
          top.className = 'card-top';

          const left = document.createElement('div');
          left.className = 'card-left';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = !!todo.completed;
          checkbox.className = 'checkbox';
          checkbox.onchange = () => {
            PM.toggleTodo(p.id, todo.id);
            todo.completed = !todo.completed;
            renderAll();
          };

          const titleWrap = document.createElement('div');
          titleWrap.className = 'card-title-wrap';

          const title = document.createElement('div');
          title.className = 'card-title' + (todo.completed ? ' done' : '');
          title.textContent = todo.title;

          const meta = document.createElement('div');
          meta.className = 'card-meta';
          const dateText = document.createElement('span');
          dateText.textContent = todo.dueDate ? `Due ${format(new Date(todo.dueDate), 'MMM d, yyyy')}` : 'No due date';
          if (isOverdue) {
            const overdue = document.createElement('span');
            overdue.className = 'overdue';
            overdue.textContent = 'Overdue';
            meta.appendChild(overdue);
          }

          meta.appendChild(dateText);
          titleWrap.append(title, meta);

          left.append(checkbox, titleWrap, priorityPill(todo.priority));

          const right = document.createElement('div');
          right.className = 'controls';

          const dueInput = document.createElement('input');
          dueInput.type = 'date';
          dueInput.value = todo.dueDate ? toInputDate(todo.dueDate) : '';
          dueInput.title = 'Update due date';
          dueInput.className = 'control-sm';
          dueInput.onchange = () => {
            PM.updateTodo(p.id, todo.id, { dueDate: dueInput.value ? new Date(dueInput.value) : null });
            renderAll();
          };

          const prioritySel = document.createElement('select');
          prioritySel.className = 'control-sm';
          ['low', 'medium', 'high'].forEach(opt => {
            const o = document.createElement('option');
            o.value = opt; o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
            if (opt === todo.priority) o.selected = true;
            prioritySel.appendChild(o);
          });
          prioritySel.onchange = () => {
            PM.updateTodo(p.id, todo.id, { priority: prioritySel.value });
            renderAll();
          };

          const expandBtn = document.createElement('button');
          expandBtn.className = 'btn-ghost btn';
          expandBtn.textContent = 'Details';

          const delBtn = document.createElement('button');
          delBtn.className = 'btn-danger btn';
          delBtn.textContent = 'Delete';
          delBtn.onclick = () => {
            PM.removeTodo(p.id, todo.id);
            renderAll();
          };

          right.append(dueInput, prioritySel, expandBtn, delBtn);

          top.append(left, right);

          const details = document.createElement('div');
          details.className = 'details';

          const desc = document.createElement('p');
          desc.className = 'desc';
          desc.textContent = todo.description || 'No description';

          const notes = document.createElement('p');
          notes.className = 'notes';
          notes.textContent = todo.notes ? `Notes: ${todo.notes}` : 'No notes';

          // Checklist in card
          const checklistWrap = document.createElement('div');
          checklistWrap.className = 'cl-wrap';
          const clTitle = document.createElement('div');
          clTitle.className = 'cl-title';
          clTitle.textContent = 'Checklist';
          const clList = document.createElement('div');
          clList.className = 'cl-list';

          function renderChecklistInline() {
            clList.innerHTML = '';
            (todo.checklist || []).forEach(item => {
              const row = document.createElement('div');
              row.className = 'cl-row';
              const left = document.createElement('label');
              left.className = 'left';
              const cb = document.createElement('input');
              cb.type = 'checkbox';
              cb.checked = !!item.done;
              cb.style.accentColor = 'var(--c-3)';
              cb.onchange = () => {
                PM.toggleChecklistItem(p.id, todo.id, item.id);
                item.done = !item.done;
                renderChecklistInline();
              };
              const txt = document.createElement('span');
              txt.className = 'txt' + (item.done ? ' done' : '');
              txt.textContent = item.text;
              left.append(cb, txt);

              const rm = document.createElement('button');
              rm.className = 'btn-ghost btn';
              rm.style.padding = '6px 8px';
              rm.style.fontSize = '12px';
              rm.textContent = 'Remove';
              rm.onclick = () => {
                PM.removeChecklistItem(p.id, todo.id, item.id);
                renderChecklistInline();
              };

              row.append(left, rm);
              clList.appendChild(row);
            });
          }
          renderChecklistInline();

          const editBtn = document.createElement('button');
          editBtn.className = 'btn';
          editBtn.style.marginTop = '10px';
          editBtn.textContent = 'Edit Todo';
          editBtn.onclick = () => openTodoModal({ isEdit: true, projectId: p.id, todo });

          checklistWrap.append(clTitle, clList, editBtn);

          details.append(desc, notes, checklistWrap);

          // Toggle details animation
          expandBtn.onclick = () => {
            const hidden = details.style.display === '' || details.style.display === 'none';
            if (hidden) {
              details.style.display = 'block';
              details.classList.add('details-enter');
              requestAnimationFrame(() => {
                details.classList.add('details-enter-active');
                details.classList.remove('details-enter');
              });
            } else {
              details.classList.add('details-exit');
              details.classList.add('details-exit-active');
              setTimeout(() => {
                details.style.display = 'none';
                details.classList.remove('details-exit', 'details-exit-active');
              }, 230);
            }
          };

          const strip = document.createElement('div');
          strip.className = 'edge-strip';
          strip.setAttribute('style', stripClassForPriority(todo.priority));

          card.append(top, details, strip);
          el.todosContainer.appendChild(card);
        });
      }

      function renderAll() {
        renderProjects();
        renderHeader();
        renderTodos();
      }

      // Checklist in modal
      function addChecklistRow(item) {
        const row = document.createElement('div');
        row.className = 'cl-modal-row';
        row.dataset.id = item.id;
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.checked = !!item.done; cb.style.accentColor = 'var(--c-3)';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = item.text || '';
        input.placeholder = 'Subtask';
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn-ghost btn';
        remove.style.padding = '6px 8px';
        remove.style.fontSize = '12px';
        remove.textContent = 'Remove';
        remove.onclick = () => row.remove();
        row.append(cb, input, remove);
        el.checklistItems.appendChild(row);
      }

      // Events
      function bindEvents() {
        // Open/close project modal
        el.addProjectBtn.onclick = openProjectModal;
        document.querySelectorAll('[data-close-project-modal]').forEach(btn => btn.onclick = closeProjectModal);
        el.projectForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const title = el.projectTitle.value.trim();
          if (!title) return;
          const p = PM.addProject(title);
          PM.selectProject(p.id);
          closeProjectModal();
          renderAll();
        });

        // Open/close todo modal
        el.addTodoBtn.onclick = () => openTodoModal({ isEdit: false });
        document.querySelectorAll('[data-close-todo-modal]').forEach(btn => btn.onclick = closeTodoModal);

        // Checklist add in modal
        el.addChecklistBtn.onclick = () => {
          const text = el.newChecklistText.value.trim();
          if (!text) return;
          addChecklistRow({ id: 'tmp_' + Math.random().toString(36).slice(2, 10), text, done: false });
          el.newChecklistText.value = '';
          el.newChecklistText.focus();
        };

        // Todo form submit
        el.todoForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const data = {
            title: el.todoTitle.value.trim(),
            description: el.todoDescription.value.trim(),
            dueDate: el.todoDueDate.value ? new Date(el.todoDueDate.value) : null,
            priority: el.todoPriority.value,
            notes: el.todoNotes.value.trim(),
            checklist: Array.from(el.checklistItems.children).map(row => ({
              id: row.dataset.id || ('cl_' + Math.random().toString(36).slice(2, 10)),
              text: row.querySelector('input[type="text"]').value,
              done: row.querySelector('input[type="checkbox"]').checked
            }))
          };
          if (!data.title) return;
          if (editingContext.todoId) {
            PM.updateTodo(editingContext.projectId, editingContext.todoId, data);
          } else {
            PM.addTodoToSelected(data);
          }
          closeTodoModal();
          renderAll();
        });

        // Filters
        el.filterPriority.onchange = () => renderTodos();
        el.searchBox.oninput = () => renderTodos();
      }

      function init() {
        PM.init();
        bindEvents();
        renderAll();
      }

      return { init };
    });

    // Bootstrap
    AppModules.require('domController').init();