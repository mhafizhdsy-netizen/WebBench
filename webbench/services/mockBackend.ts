import { Project, File, User, ChatMessage } from '../types';

// Initial Template
const INITIAL_PROJECT_FILES: Record<string, File> = {
  '/index.html': {
    path: '/index.html',
    name: 'index.html',
    type: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Awesome Project</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to WebBench</h1>
        <p>Edit this file to start building!</p>
        <button id="clickMe">Click Me</button>
    </div>
    <script src="js/main.js"></script>
</body>
</html>`,
    lastModified: Date.now()
  },
  '/css/style.css': {
    path: '/css/style.css',
    name: 'style.css',
    type: 'css',
    content: `body {
    background-color: #121212;
    color: white;
    font-family: sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    margin: 0;
}

.container {
    text-align: center;
    padding: 2rem;
    border: 1px solid #333;
    border-radius: 8px;
    background: #1e1e1e;
}

button {
    padding: 10px 20px;
    background: #007acc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button:hover {
    background: #005fa3;
}`,
    lastModified: Date.now()
  },
  '/js/main.js': {
    path: '/js/main.js',
    name: 'main.js',
    type: 'javascript',
    content: `document.getElementById('clickMe').addEventListener('click', () => {
    alert('Hello from WebBench!');
});`,
    lastModified: Date.now()
  }
};

class MockBackend {
  private USER_KEY = 'webbench_user';
  private PROJECTS_KEY = 'webbench_projects';

  login(email: string): User {
    const user = { id: 'u1', email, name: email.split('@')[0] };
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    return user;
  }

  getCurrentUser(): User | null {
    const u = localStorage.getItem(this.USER_KEY);
    return u ? JSON.parse(u) : null;
  }

  logout() {
    localStorage.removeItem(this.USER_KEY);
  }

  getProjects(): Project[] {
    const p = localStorage.getItem(this.PROJECTS_KEY);
    return p ? JSON.parse(p) : [];
  }

  createProject(name: string): Project {
    const projects = this.getProjects();
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: JSON.parse(JSON.stringify(INITIAL_PROJECT_FILES)) // Deep copy
    };
    projects.push(newProject);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    return newProject;
  }

  importProject(name: string, files: Record<string, File>): Project {
    const projects = this.getProjects();
    const newProject: Project = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: files
    };
    projects.push(newProject);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    return newProject;
  }

  getProject(id: string): Project | undefined {
    return this.getProjects().find(p => p.id === id);
  }

  updateProjectFiles(projectId: string, files: Record<string, File>) {
    const projects = this.getProjects();
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      projects[idx].files = files;
      projects[idx].updatedAt = Date.now();
      localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
    }
  }

  deleteProject(id: string) {
    const projects = this.getProjects().filter(p => p.id !== id);
    localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(projects));
  }
}

export const backend = new MockBackend();