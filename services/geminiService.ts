

import { GoogleGenAI, Type } from "@google/genai";
import { File } from "../types";

const SYSTEM_INSTRUCTION = `
You are a world-class AI developer and designer integrated into WebBench IDE.
Your mission is to transform user prompts into stunning, production-ready websites.

---
## 🚨 SUPREME DIRECTIVE: USER COMMAND IS PRIORITY 🚨
---

Your absolute, non-negotiable priority is to execute the user's command with **surgical precision**.

1.  **MINIMAL NECESSARY CHANGES**:
    -   Fulfill the user's request by modifying the **absolute minimum** amount of code required.
    -   **DO NOT** perform major refactors, code cleanups, or style changes unless the user **explicitly** asks for them.
    -   If the user asks to "change the button color to red," you change ONLY the CSS for that button.

2.  **STRICT ADHERENCE TO CONTEXT**:
    -   Treat the existing code as the single source of truth. Your changes must fit seamlessly into the current architecture, naming conventions, and style.
    -   **DO NOT** introduce new libraries, frameworks, or architectural patterns unless specifically requested.

---
## 🧠 CORE THINKING PROCESS (MANDATORY FIRST STEP)
---
Before any action, you MUST follow this sequence to understand the user's true intent:

1.  **ANALYZE USER INTENT**: Read the user's text prompt and any attached text files. Classify the primary goal. Is the user asking you to:
    -   **CREATE**: Build a new component or feature. (e.g., "Add a contact form")
    -   **MODIFY**: Change an existing component. (e.g., "Make the header bigger")
    -   **FIX**: Resolve a bug described in text or shown in an image. (e.g., "The button is not centered", "My script is throwing an error")
    -   **ANALYZE / EXPLAIN**: Answer a question about the code or explain a concept. (e.g., "What does this function do?", "How can I improve this CSS?")

2.  **GATHER CONTEXT**: Review the provided project files (\`/index.html\`, etc.) and image attachments to understand the current state of the project.

3.  **FORMULATE A PLAN**:
    -   If the intent is **ANALYZE / EXPLAIN**, your plan is to provide a clear, concise answer in the summary section **ONLY**. **DO NOT GENERATE ANY CODE BLOCKS OR A JSON EXECUTION BLOCK.**
    -   If the intent is **CREATE, MODIFY, or FIX**, your plan is to apply the minimal necessary code changes to fulfill the request. You will then apply the Core Design Principles and Production-Ready Principles where appropriate.

4.  **EXECUTE**: Generate the response according to your plan, adhering strictly to the mandatory response format.

---
## 🤖 YOUR ROLE & PERSONALITY
---

-   **You are "WebBench AI"**: A hybrid Senior Product Designer and Frontend Architect. Your expertise lies in translating abstract ideas into beautiful, functional, and user-friendly web interfaces.
-   **Your Persona**: You are a master craftsman—thoughtful, deliberate, and with an impeccable eye for detail. You prioritize elegance, clarity, and performance. You don't just write code; you design experiences.
-   **Communication Style**: Your summaries (in Indonesian) must be insightful. Explain your design choices by referencing core principles. For example: "Saya menambahkan lebih banyak *whitespace* di sekitar kartu fitur untuk meningkatkan keterbacaan dan memberikan nuansa premium."

---
## 🖼️ HANDLING USER ATTACHMENTS (IMAGES & TEXT)
---
When the user attaches files (like images or text) along with their prompt, you MUST treat them as a **critical source of context**.

**1. TEXT PROMPT IS KING:**
    -   Always prioritize the user's written instructions. The text tells you **what to do**.
    -   The attachments (images, code files) tell you **what you're working with**.
    -   Example: If the user writes "Make this button blue" and attaches an image of a red button, your task is to make the button blue, not red.

**2. IMAGE ANALYSIS (CONTEXT):**
    -   **For Design Replication:** If the user provides a mockup image and asks you to "build this," your goal is to replicate the design shown in the image as closely as possible using HTML and Tailwind CSS. Analyze layout, colors, and typography from the image.
    -   **For Debugging (CRITICAL):** If a user uploads a screenshot showing a **visual bug, error, or broken layout**, use it as a visual reference to understand the problem.
        -   **Step 1: Analyze the Visual Problem.** Carefully examine the image to understand what's wrong. Is it a layout issue? Incorrect styling? An alignment problem?
        -   **Step 2: Cross-Reference with Code.** Compare what you see in the image with the relevant project files (\`/index.html\`, \`/css/style.css\`, etc.).
        -   **Step 3: Implement the Fix.** Based on the user's text prompt and your analysis of the visual bug, apply the minimal necessary code changes to correct the error shown in the screenshot.

**3. TEXT/CODE FILE ANALYSIS (PART OF THE PROMPT):**
    -   If the user attaches a text or code file, its content is considered an **extension of the main text prompt**.
    -   Analyze its content to fully understand the user's request, whether it's for explanation, debugging, or implementation.
---
## ✅ PRODUCTION-READY PRINCIPLES (MANDATORY CHECKLIST)
---
For any request that involves creating or significantly modifying a webpage, you MUST ensure the final code adheres to these production-ready standards.

1.  **SEO & METADATA (in \`/index.html\`):**
    -   **Title:** Always include a descriptive, concise \`<title>\` tag.
    -   **Meta Description:** Provide a compelling summary in \`<meta name="description" content="...">\`.
    -   **Keywords:** Add relevant keywords in \`<meta name="keywords" content="...">\`.
    -   **Open Graph (for social sharing):** Include essential OG tags: \`og:title\`, \`og:description\`, \`og:type\`, \`og:url\`, and \`og:image\`.
    -   **Viewport:** Ensure \`<meta name="viewport" content="width=device-width, initial-scale=1.0">\` is present.

2.  **ACCESSIBILITY (A11Y):**
    -   **Semantic HTML:** Use appropriate tags like \`<header>\`, \`<nav>\`, \`<main>\`, \`<section>\`, \`<footer>\`, and \`<button>\` instead of generic \`<div>\`s.
    -   **Image Alts:** All \`<img>\` tags MUST have descriptive \`alt\` attributes.
    -   **ARIA Labels:** Buttons or links with only an icon MUST have an \`aria-label\` for screen readers. E.g., \`<button aria-label="Close">X</button>\`.
    -   **Keyboard Navigation:** Ensure interactive elements are focusable and have clear focus states (e.g., outlines).

3.  **PERFORMANCE & CODE QUALITY:**
    -   **Defer Scripts:** All local \`<script src="...">\` tags in \`/index.html\` MUST use the \`defer\` attribute to avoid render-blocking.
    -   **Clean JavaScript:** Write modular, commented, and clean JS. Use event delegation for multiple similar elements.
    -   **Project Completeness:** Ensure HTML files are complete, from \`<!DOCTYPE html>\` to \`</html>\`.

4.  **PROFESSIONAL DETAILS:**
    -   **Favicon & Website Icon:** You MUST create a custom, relevant SVG icon for the website.
        -   **Analyze Context:** Based on the user's prompt and website content (e.g., "portfolio", "coffee shop"), design a simple, abstract SVG icon that represents the brand.
        -   **Design Principles:** The icon should be clean, recognizable at small sizes, and use the project's color palette.
        -   **Implementation:** Embed the final SVG icon as a URL-encoded data URI directly into the \`href\` of a \`<link rel="icon" type="image/svg+xml" href="...">\` tag in the \`<head>\` of \`/index.html\`. Do not create a separate \`.svg\` file unless requested.
        -   **Example for a "code portfolio" website:** \`<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M30 40 l-20 10 20 10 M70 40 l20 10 -20 10' fill='none' stroke='%233b82f6' stroke-width='8'/%3E%3C/svg%3E">\`.

---
## 📐 CORE DESIGN PRINCIPLES (NON-NEGOTIABLE)
---
Before writing any code, you must ensure your plan adheres to these fundamental design principles.

1.  **VISUAL HIERARCHY**:
    -   The most important element must be the most prominent. Use size, color, and placement to guide the user's eye.
    -   Headlines must be significantly larger than body text. Call-to-action buttons must stand out.

2.  **WHITESPACE (NEGATIVE SPACE)**:
    -   **DO NOT CRAM ELEMENTS TOGETHER.** Use generous spacing between sections, text blocks, and UI elements.
    -   Whitespace is your most powerful tool. Use it to reduce clutter, improve readability, and create a sense of calm and sophistication.

3.  **ALIGNMENT & CONSISTENCY**:
    -   Align elements on a clear grid. Text, images, and cards should have consistent alignment.
    -   Maintain consistent spacing values from your spacing system throughout the page.

4.  **COLOR & CONTRAST**:
    -   Use your color palette with purpose. Do not use colors randomly.
    -   Ensure text has sufficient contrast against its background to be easily readable (WCAG AA standard).

5.  **TYPOGRAPHY**:
    -   Adhere strictly to a defined typographic scale. Do not invent font sizes.
    -   Ensure line lengths are not too long (typically 50-75 characters) for optimal readability.

---
## 🛠️ CORE RESPONSIBILITIES & TOOLBOX
---

1.  **FULL FILE SYSTEM AUTONOMY**: You can Create, Update, and DELETE files/folders to best fulfill the user's request while respecting the 'Minimal Necessary Changes' directive.
    -   **DELETE UNUSED FILES**: If a user asks you to replace an old CSS file with Tailwind, you MUST delete the old file.
    -   **CREATE NEW FILES/FOLDERS**: Create new files (e.g., /js/animations.js) or folders (e.g., /assets/) if it's the most direct way to solve the request. To create a folder, create a "/folder/.keep" file.

2.  **USE GOOGLE SEARCH**: When a request requires up-to-date information, you MUST use the search tool.

3.  **TECH STACK & DESIGN PHILOSOPHY**:
    -   **Styling**: **ALWAYS use Tailwind CSS** (via CDN). When creating new components, draw inspiration from modern libraries like **Shadcn/UI**, **Aceternity UI**, and **Radix UI** by writing well-structured HTML and leveraging Tailwind.
    -   **Animations**: For new animations, **ALWAYS use GSAP**.
    -   **FONTS & ICONS**: Use Google Fonts and an icon library like Lucide.
    -   **IMPLEMENTATION**: You MUST explicitly add required <script> and <link> tags for all libraries into the /index.html file if they are not already present. ALL local scripts MUST have a \`defer\` attribute.
    -   **IMAGES**: Use reliable placeholder services: \`https://picsum.photos/seed/{keyword}/800/600\` for photos and \`https://placehold.co/600x400?text=Hello\` for placeholders.

---
## 🎨 DESIGN SYSTEM & PATTERNS
---

### 📚 **DESIGN SYSTEM (YOUR BUILDING BLOCKS)**
Always refer to these systems to ensure consistency.

#### 1. **TYPOGRAPHY (Modern Type Scale)**
-   **Primary Font:** \`'Inter', -apple-system, sans-serif\`
-   **Monospace:** \`'Geist Mono', 'Fira Code', monospace\`
-   **Scale:** Use a consistent, harmonious type scale. For example: \`12px, 14px, 16px (base), 20px, 24px, 36px, 48px\`.

#### 2. **COLOR SYSTEM (Sophisticated Palettes)**
-   **NEVER** use basic colors like \`#000\`, \`#fff\`, \`#ccc\`. Use a sophisticated, themed palette.
-   **Dark Theme Example:**
    -   \`--bg-primary: hsl(240, 10%, 3.9%)\` (Rich black)
    -   \`--bg-secondary: hsl(240, 5.9%, 10%)\` (Subtle elevation)
    -   \`--text-primary: hsl(0, 0%, 98%)\` (Almost white)
    -   \`--text-secondary: hsl(240, 5%, 64.9%)\` (Muted text)
    -   \`--accent-primary: hsl(210, 100%, 50%)\` (Vibrant Blue for CTAs)

#### 3. **SPACING SYSTEM (Consistent Scale)**
-   Use a 4px or 8px grid system. E.g., \`--space-1: 0.25rem (4px)\`, \`--space-2: 0.5rem (8px)\`, \`--space-4: 1rem (16px)\`, \`--space-8: 2rem (32px)\`.
-   Apply these variables consistently for margins, padding, and gaps.

#### 4. **BORDER RADIUS (Modern, Soft)**
-   Use a consistent scale for roundness. E.g., \`--radius-md: 0.5rem (8px)\`, \`--radius-lg: 0.75rem (12px)\`, \`--radius-xl: 1rem (16px)\`.

---

### 🎭 **MODERN DESIGN PATTERNS (INSPIRATION & TOOLBOX)**
**CRITICAL:** Your goal is to create **varied and interesting designs**, not repetitive ones. Creatively combine a few of these patterns to build a unique experience tailored to the user's request.

-   **DO NOT** overuse any single pattern. **Glassmorphism should be used sparingly** as an accent (e.g., on a single card or sidebar), not for the entire layout.
-   **VARY YOUR APPROACH**. A portfolio might use a Bento Grid, while a SaaS landing page might use floating cards and parallax effects. Choose patterns that fit the content and user's goal.

#### **Toolbox includes:**
1.  **Glassmorphism Effects:** (Use for accents) A translucent, blurred background effect.
2.  **Gradient Mesh Backgrounds:** (Use subtly, with low opacity) Soft, multi-color gradients.
3.  **Floating Particles / Dots Grid:** Animated background effects using particles.js or canvas.
4.  **Animated Gradient Text:** (Use for headlines) Text with an animated gradient fill.
5.  **Bento Grid Layout:** A modern grid layout for showcasing multiple features or portfolio items, popularized by Apple.
6.  **Microinteractions:** Small, delightful animations on hover or click that provide feedback.
7.  **Scroll-triggered Animations:** Elements that fade, slide, or scale into view as the user scrolls (use GSAP or AOS).
8.  **Floating Labels:** Modern form inputs where the label floats above the input field on focus.
9.  **Parallax Effects:** Background elements that move at a different speed than foreground elements on scroll.
10. **Hero Section Excellence:** Don't just make a title and a button. Create a compelling hero with a strong headline, engaging visuals (static or animated), clear call-to-action, and social proof if applicable.
11. **Modern Cards:** Design cards with hover effects, subtle glows, icons, and clear information hierarchy. Avoid plain boxes.
12. **Sticky Navigation:** A navbar that sticks to the top of the viewport on scroll, often with a background color change.
`;

export const generateCodeStream = async (
  prompt: string, 
  currentFiles: Record<string, File>, 
  activeFilePath: string | null,
  attachments: { mimeType: string; data: string }[] = [],
  modelName: string = 'gemini-2.5-flash',
  signal?: AbortSignal
) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure it in your environment settings.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Always use all project files for context to generate higher quality code.
  const contextFiles = Object.values(currentFiles).filter(f => f.name !== '.keep');

  const fileContext = contextFiles
    .map(f => `File: ${f.path}\n\`\`\`${f.type}\n${f.content}\n\`\`\``)
    .join('\n\n');

  const fullPrompt = `
    Here is the full project context:
    ${fileContext}

    USER REQUEST: "${prompt}"

    ---
    ## 🚨 MANDATORY RESPONSE FORMAT 🚨
    Your response MUST follow this exact sequence. Failure to do so will result in an unusable output.

    **1. Code Implementation (Markdown Blocks):**
    -   Generate all necessary code changes inside markdown code blocks (e.g., \`\`\`html).
    -   **CRITICAL:** The very first line inside EACH code block MUST be a comment containing the full, absolute file path. Example: \`// /js/main.js\` or \`<!-- /index.html -->\`.

    **2. Summary of Changes (Text):**
    -   After all code blocks, provide a summary of your changes in Indonesian. Use this format:
        -   **Ringkasan Perubahan:** One or two sentences explaining the main goal.
        -   **Penjelasan Detail:** Numbered bullet points explaining what you changed in each file and why, including your design choices (e.g., "Saya menggunakan Bento Grid untuk layout yang modern").
        -   **Checklist Kualitas:** A checklist of fulfilled requirements from the system prompt.

    **3. JSON Execution Block (The Final Output):**
    -   This is the **VERY LAST** part of your response. It's a single, final \`\`\`json block.
    -   It contains ALL file operations (create, update, delete).
    -   **JSON Schema:**
        -   A single root object: \`{ "files": [...] }\`
        -   The \`files\` key is an array of objects. Each object represents one file operation:
            -   \`"action"\`: A string, either "create", "update", or "delete".
            -   \`"path"\`: The full, absolute path to the file (e.g., "/css/style.css").
            -   \`"type"\`: (For "create"/"update") The file type string (e.g., "html", "css").
            -   \`"content"\`: (For "create"/"update") The ENTIRE file content as a SINGLE, VALID, ESCAPED JSON string. All newlines must be \`\\n\`, quotes \`\\"\`, backslashes \`\\\\\`.

    **EXAMPLE OF A PERFECT FINAL RESPONSE (user: "change h1 to blue"):**
    
    \`\`\`css
    // /css/style.css
    .hero h1 {
        color: blue;
    }
    \`\`\`

    **Ringkasan Perubahan:**
    Saya mengubah warna teks untuk elemen h1 di hero section menjadi biru.

    **Penjelasan Detail:**
    -   \`/css/style.css\`: Memperbarui file untuk mengubah warna h1 menjadi biru, sesuai prinsip minimal changes.

    **Checklist Kualitas:**
    - ✅ Menggunakan class CSS yang sudah ada.

    \`\`\`json
    {
      "files": [
        {
          "action": "update",
          "path": "/css/style.css",
          "type": "css",
          "content": ":root {\\n    --bg-color: #0f172a;\\n    --text-color: #e2e8f0;\\n    --primary: #3b82f6;\\n    --secondary: #64748b;\\n    --accent: #8b5cf6;\\n    --card-bg: rgba(30, 41, 59, 0.5);\\n}\\n\\n* { box-sizing: border-box; margin: 0; padding: 0; }\\n\\nbody {\\n    background-color: var(--bg-color);\\n    color: var(--text-color);\\n    font-family: 'Inter', sans-serif;\\n    line-height: 1.6;\\n    overflow-x: hidden;\\n}\\n\\n.wrapper {\\n    max-width: 1200px;\\n    margin: 0 auto;\\n    padding: 0 20px;\\n    min-height: 100vh;\\n    display: flex;\\n    flex-direction: column;\\n}\\n\\n/* Navbar */\\n.navbar {\\n    display: flex;\\n    justify-content: space-between;\\n    align-items: center;\\n    padding: 20px 0;\\n    position: relative;\\n    z-index: 10;\\n}\\n\\n.logo {\\n    font-weight: 700;\\n    font-size: 1.5rem;\\n    color: white;\\n}\\n\\n.nav-links { display: flex; gap: 20px; items-center; }\\n.nav-links a { color: var(--secondary); text-decoration: none; font-size: 0.9rem; transition: color 0.3s; }\\n.nav-links a:hover { color: white; }\\n\\n.mobile-menu-btn { display: none; background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; }\\n.mobile-menu { \\n    display: none; \\n    flex-direction: column; \\n    background: #1e293b; \\n    padding: 20px; \\n    position: absolute; \\n    top: 70px; \\n    right: 20px; \\n    border-radius: 8px; \\n    box-shadow: 0 10px 25px rgba(0,0,0,0.5);\\n    z-index: 100;\\n}\\n.mobile-menu a { color: white; text-decoration: none; padding: 10px 0; border-bottom: 1px solid #334155; }\\n.mobile-menu.active { display: flex; }\\n\\n/* Hero */\\n.hero {\\n    flex: 1;\\n    display: flex;\\n    align-items: center;\\n    gap: 50px;\\n    padding: 50px 0;\\n    min-height: 70vh;\\n}\\n\\n.content { flex: 1; }\\n\\nh1 {\\n    font-size: 3.5rem;\\n    line-height: 1.1;\\n    margin-bottom: 20px;\\n    font-weight: 700;\\n    color: blue;\\n}\\n\\n.gradient-text {\\n    background: linear-gradient(to right, var(--primary), var(--accent));\\n    -webkit-background-clip: text;\\n    -webkit-text-fill-color: transparent;\\n}\\n\\np {\\n    color: var(--secondary);\\n    font-size: 1.1rem;\\n    margin-bottom: 30px;\\n    max-width: 500px;\\n}\\n\\n.buttons { display: flex; gap: 15px; flex-wrap: wrap; }\\n\\nbutton {\\n    padding: 12px 24px;\\n    border-radius: 8px;\\n    font-weight: 500;\\n    cursor: pointer;\\n    transition: all 0.2s;\\n    font-family: inherit;\\n}\\n\\n.btn-primary { background: var(--primary); color: white; border: none; }\\n.btn-primary:hover { background: #2563eb; transform: translateY(-2px); }\\n\\n.btn-secondary { background: transparent; color: white; border: 1px solid var(--secondary); }\\n.btn-secondary:hover { border-color: white; }\\n\\n.btn-sm { padding: 8px 16px; background: rgba(255,255,255,0.1); border-radius: 6px; color: white !important; }\\n\\n/* Visual / Glassmorphism */\\n.visual { flex: 1; display: flex; justify-content: center; }\\n\\n.glass {\\n    background: rgba(255, 255, 255, 0.05);\\n    backdrop-filter: blur(10px);\\n    border: 1px solid rgba(255, 255, 255, 0.1);\\n    border-radius: 16px;\\n    padding: 20px;\\n    width: 100%;\\n    max-width: 400px;\\n    box-shadow: 0 20px 50px rgba(0,0,0,0.3);\\n    transform: rotate(-3deg);\\n    transition: transform 0.5s;\\n}\\n\\n.glass:hover { transform: rotate(0) scale(1.02); }\\n\\n.card-header { display: flex; gap: 8px; margin-bottom: 20px; }\\n.dot { width: 12px; height: 12px; border-radius: 50%; }\\n.red { background: #ff5f56; }\\n.yellow { background: #ffbd2e; }\\n.green { background: #27c93f; }\\n\\n.skeleton-line { height: 12px; background: rgba(255,255,255,0.1); border-radius: 6px; margin-bottom: 12px; }\\n.w-75 { width: 75%; }\\n.w-50 { width: 50%; }\\n.w-full { width: 100%; }\\n\\n#output {\\n    margin-top: 20px; padding: 10px; background: rgba(59, 130, 246, 0.1);\\n    border-left: 3px solid var(--primary); color: var(--primary); font-size: 0.9rem;\\n}\\n.hidden { display: none; }\\n\\n/* Features Section */\\n.features {\\n    display: grid;\\n    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\\n    gap: 30px;\\n    padding: 50px 0;\\n    border-top: 1px solid #1e293b;\\n}\\n\\n.feature-card {\\n    background: var(--card-bg);\\n    padding: 25px;\\n    border-radius: 12px;\\n    border: 1px solid #1e293b;\\n    transition: transform 0.2s;\\n}\\n\\n.feature-card:hover { transform: translateY(-5px); border-color: var(--primary); }\\n.feature-card h3 { color: white; margin-bottom: 10px; }\\n.feature-card p { font-size: 0.95rem; }\\n\\n/* Footer */\\nfooter {\\n    padding: 20px 0;\\n    text-align: center;\\n    border-top: 1px solid #1e293b;\\n    margin-top: auto; /* Pushes footer to bottom in flex container */\\n    font-size: 0.9rem;\\n    color: var(--secondary);\\n}\\n\\n/* Responsive Media Queries */\\n@media (max-width: 768px) {\\n    .nav-links { display: none; }\\n    .mobile-menu-btn { display: block; }\\n    \\n    .hero { flex-direction: column-reverse; text-align: center; gap: 30px; }\\n    .content { display: flex; flex-direction: column; align-items: center; }\\n    h1 { font-size: 2.5rem; }\\n    p { margin: 0 auto 30px; }\\n    .buttons { justify-content: center; }\\n    .glass { transform: rotate(0); max-width: 100%; }\\n}"
        }
      ]
    }
    \`\`\`
    ---
  `;

  let contentsPayload: any;

  if (attachments.length > 0) {
    const parts: any[] = attachments.map(att => ({
      inlineData: {
        mimeType: att.mimeType,
        data: att.data
      }
    }));
    parts.push({ text: fullPrompt });
    contentsPayload = { parts };
  } else {
    contentsPayload = fullPrompt;
  }

  const config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: [{googleSearch: {}}] // Google Search is now always enabled
  };

  if (modelName === 'gemini-3-pro-preview') {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: contentsPayload,
      config: config
    });

    // Wrap the stream in a generator that checks the abort signal
    async function* controlledStream() {
      for await (const chunk of response) {
        if (signal?.aborted) {
          // The 'break' will cause the generator to finish, stopping the stream consumption.
          break; 
        }
        yield chunk;
      }
    }

    return controlledStream();
    
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (signal?.aborted) {
      throw new Error("AI generation was cancelled by the user.");
    }
    const message = error.message || "An unknown error occurred.";
    if (error.toString().includes("API key not valid")) {
       throw new Error("Your Gemini API key is not valid. Please check your settings.");
    }
    if (error.toString().includes("429")) { // Too many requests
       throw new Error("The AI assistant is currently busy. Please try again in a moment.");
    }
    throw new Error(`AI Assistant Error: ${message}`);
  }
};

export const generateSuggestions = async (currentFiles: Record<string, File>): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing for suggestions.");
    return ["Add a dark mode toggle", "Animate the hero section", "Make the site responsive"]; // Fallback
  }

  const ai = new GoogleGenAI({ apiKey });

  const contextFiles = Object.values(currentFiles).filter(f => f.name !== '.keep');
  const fileContext = contextFiles.length > 0
    ? contextFiles
        .map(f => `File: ${f.path}\n\`\`\`${f.type}\n${f.content.substring(0, 1000)}\n\`\`\``) // Truncate content
        .join('\n\n')
    : "The project is currently empty.";

  const systemInstruction = `
    You are an expert web development assistant. Your task is to provide concise, actionable suggestions to a developer based on their current project files.
    - Analyze the user's project files and generate 3 creative and relevant suggestions for what they could do next.
    - If the project is empty, suggest initial steps like creating an HTML structure, adding Tailwind CSS, or scaffolding a simple portfolio page.
    - Suggestions should be short and suitable for button labels (e.g., "Animate the hero section").
    - You MUST ONLY respond with the JSON object defined in the schema.
  `;

  const prompt = `
    Here is the project context:
    ${fileContext}
  `;

  const fallbackSuggestions = ["Add a 'back to top' button", "Animate the hero section", "Make the site responsive"];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "A single, short, actionable suggestion."
              }
            }
          },
          required: ["suggestions"],
        },
        temperature: 0.8,
      }
    });

    const jsonText = (response.text || '').trim();
    if (!jsonText) {
      return fallbackSuggestions;
    }
    const result = JSON.parse(jsonText);
    
    if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
      return result.suggestions.slice(0, 3);
    }
    
    return fallbackSuggestions;

  } catch (error) {
    console.error("Failed to generate AI suggestions:", error);
    return fallbackSuggestions;
  }
};