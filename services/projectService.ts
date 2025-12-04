import { supabase } from './supabaseClient';
import { Project, File } from '../types';

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
    <title>WebBench Starter</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;500;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="wrapper">
        <nav class="navbar">
            <div class="logo">⚡ WebBench</div>
            <div class="nav-links">
                <a href="#features">Features</a>
                <a href="#docs">Docs</a>
                <a href="#" class="btn-sm">Sign In</a>
            </div>
            <button class="mobile-menu-btn" id="menuBtn">☰</button>
        </nav>

        <div class="mobile-menu" id="mobileMenu">
            <a href="#features">Features</a>
            <a href="#docs">Docs</a>
            <a href="#">Sign In</a>
        </div>

        <main class="hero">
            <div class="content">
                <h1>Build the web <br><span class="gradient-text">at lightspeed</span></h1>
                <p>Edit this project directly in WebBench. Changes apply instantly. Ask the AI to "Change the gradient color" or "Add a contact form".</p>
                <div class="buttons">
                    <button id="actionBtn" class="btn-primary">Interact Me</button>
                    <button class="btn-secondary">View Source</button>
                </div>
                <div id="output" class="hidden"></div>
            </div>
            
            <div class="visual">
                <div class="card glass">
                    <div class="card-header">
                        <span class="dot red"></span>
                        <span class="dot yellow"></span>
                        <span class="dot green"></span>
                    </div>
                    <div class="card-body">
                        <div class="skeleton-line w-75"></div>
                        <div class="skeleton-line w-50"></div>
                        <div class="skeleton-line w-full"></div>
                    </div>
                </div>
            </div>
        </main>

        <section class="features" id="features">
            <div class="feature-card">
                <h3>Responsive</h3>
                <p>Built with mobile-first principles using modern CSS Grid and Flexbox.</p>
            </div>
            <div class="feature-card">
                <h3>Fast</h3>
                <p>No build steps required. Just standard HTML, CSS, and JavaScript.</p>
            </div>
            <div class="feature-card">
                <h3>AI Powered</h3>
                <p>Integrated with Gemini 2.5 to write code for you.</p>
            </div>
        </section>
    </div>
    <script src="js/main.js"></script>
    <footer>
        <p>&copy; <span id="current-year"></span> WebBench. All rights reserved.</p>
    </footer>
</body>
</html>`,
    lastModified: Date.now()
  },
  '/css/style.css': {
    path: '/css/style.css',
    name: 'style.css',
    type: 'css',
    content: `:root {
    --bg-color: #0f172a;
    --text-color: #e2e8f0;
    --primary: #3b82f6;
    --secondary: #64748b;
    --accent: #8b5cf6;
    --card-bg: rgba(30, 41, 59, 0.5);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: 'Inter', sans-serif;
    line-height: 1.6;
    overflow-x: hidden;
}

.wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Navbar */
.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 0;
    position: relative;
    z-index: 10;
}

.logo {
    font-weight: 700;
    font-size: 1.5rem;
    color: white;
}

.nav-links { display: flex; gap: 20px; items-center; }
.nav-links a { color: var(--secondary); text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }
.nav-links a:hover { color: white; }

.mobile-menu-btn { display: none; background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }
.mobile-menu { 
    display: none; 
    flex-direction: column; 
    background: #1e293b; 
    padding: 20px; 
    position: absolute; 
    top: 70px; 
    right: 20px; 
    border-radius: 8px; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 100;
}
.mobile-menu a { color: white; text-decoration: none; padding: 10px 0; border-bottom: 1px solid #334155; }
.mobile-menu.active { display: flex; }

/* Hero */
.hero {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 50px;
    padding: 50px 0;
    min-height: 70vh;
}

.content { flex: 1; }

h1 {
    font-size: 3.5rem;
    line-height: 1.1;
    margin-bottom: 20px;
    font-weight: 700;
}

.gradient-text {
    background: linear-gradient(to right, var(--primary), var(--accent));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

p {
    color: var(--secondary);
    font-size: 1.1rem;
    margin-bottom: 30px;
    max-width: 500px;
}

.buttons { display: flex; gap: 15px; flex-wrap: wrap; }

button {
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
}

.btn-primary { background: var(--primary); color: white; border: none; }
.btn-primary:hover { background: #2563eb; transform: translateY(-2px); }

.btn-secondary { background: transparent; color: white; border: 1px solid var(--secondary); }
.btn-secondary:hover { border-color: white; }

.btn-sm { padding: 8px 16px; background: rgba(255,255,255,0.1); border-radius: 6px; color: white !important; }

/* Visual / Glassmorphism */
.visual { flex: 1; display: flex; justify-content: center; }

.glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 20px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3);
    transform: rotate(-3deg);
    transition: transform 0.5s;
}

.glass:hover { transform: rotate(0) scale(1.02); }

.card-header { display: flex; gap: 8px; margin-bottom: 20px; }
.dot { width: 12px; height: 12px; border-radius: 50%; }
.red { background: #ff5f56; }
.yellow { background: #ffbd2e; }
.green { background: #27c93f; }

.skeleton-line { height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 12px; }
.w-75 { width: 75%; }
.w-50 { width: 50%; }
.w-full { width: 100%; }

#output {
    margin-top: 20px; padding: 10px; background: rgba(59, 130, 246, 0.1);
    border-left: 3px solid var(--primary); color: var(--primary); font-size: 0.9rem;
}
.hidden { display: none; }

/* Features Section */
.features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 30px;
    padding: 50px 0;
    border-top: 1px solid #1e293b;
}

.feature-card {
    background: var(--card-bg);
    padding: 25px;
    border-radius: 12px;
    border: 1px solid #1e293b;
    transition: transform 0.2s;
}

.feature-card:hover { transform: translateY(-5px); border-color: var(--primary); }
.feature-card h3 { color: white; margin-bottom: 10px; }
.feature-card p { font-size: 0.95rem; }

/* Footer */
footer {
    padding: 20px 0;
    text-align: center;
    border-top: 1px solid #1e293b;
    margin-top: auto; /* Pushes footer to bottom in flex container */
    font-size: 0.9rem;
    color: var(--secondary);
}

/* Responsive Media Queries */
@media (max-width: 768px) {
    .nav-links { display: none; }
    .mobile-menu-btn { display: block; }
    
    .hero { flex-direction: column-reverse; text-align: center; gap: 30px; }
    .content { display: flex; flex-direction: column; align-items: center; }
    h1 { font-size: 2.5rem; }
    p { margin: 0 auto 30px; }
    .buttons { justify-content: center; }
    .glass { transform: rotate(0); max-width: 100%; }
}
`,
    lastModified: Date.now()
  },
  '/js/main.js': {
    path: '/js/main.js',
    name: 'main.js',
    type: 'javascript',
    content: `const btn = document.getElementById('actionBtn');
const output = document.getElementById('output');
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');

// Interaction Demo
btn.addEventListener('click', () => {
    output.textContent = "🚀 WebBench is running your code instantly!";
    output.classList.remove('hidden');
    
    // Add a simple animation to the button
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = 'translateY(-2px)';
    }, 150);
});

// Mobile Menu Toggle
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
    });
}

// Set current year in footer
const currentYearSpan = document.getElementById('current-year');
if (currentYearSpan) {
  currentYearSpan.textContent = new Date().getFullYear().toString();
}

console.log("WebBench Starter Loaded");`,
    lastModified: Date.now()
  }
};

export const projectService = {
  // Auth Wrappers
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  // Project CRUD
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    
    // Map DB casing to frontend camelCase if needed, but schema matches mostly.
    // Ensure files is parsed if string (Supabase returns JSON object usually)
    return data.map((p: any) => ({
      ...p,
      createdAt: new Date(p.created_at).getTime(),
      updatedAt: new Date(p.updated_at).getTime(),
      files: p.files || {}
    }));
  },

  async getProject(id: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;

    return {
      ...data,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      files: data.files || {}
    };
  },

  async createProject(name: string, files = INITIAL_PROJECT_FILES): Promise<Project> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        files: files
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      createdAt: new Date(data.created_at).getTime(),
      updatedAt: new Date(data.updated_at).getTime(),
      files: data.files
    };
  },

  async renameProject(projectId: string, newName: string) {
    const { error } = await supabase
      .from('projects')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', projectId);

    if (error) throw error;
  },

  async updateProject(projectId: string, updates: Partial<Project>) {
    const payload: any = {
      updated_at: new Date().toISOString()
    };
    if (updates.name) payload.name = updates.name;
    if (updates.files) payload.files = updates.files;

    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', projectId);

    if (error) throw error;
  },

  async deleteProject(projectId: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;
  }
};