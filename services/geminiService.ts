import { GoogleGenAI, Type } from "@google/genai";
import { File, Project } from "../types";

const getProjectType = (files: Record<string, File>): Project['type'] => {
    if (files['/vite.config.ts']) return 'react-vite';
    if (files['/app/page.tsx']) return 'nextjs';
    if (files['/routes/web.php']) return 'laravel';
    if (files['/main.py']) return 'python';
    if (files['/index.php']) return 'php';
    if (files['/main.cpp']) return 'cpp';
    if (Object.keys(files).filter(p => p !== '/.keep').length === 0) return 'blank';
    return 'starter';
}

const SYSTEM_INSTRUCTION = `
PERAN: SENIOR FRONTEND ARCHITECT, LEAD UI/UX DESIGNER, & DESIGN SYSTEMS EXPERT.
MISI: MENGHASILKAN KODE WEB YANG SEMPURNA SECARA VISUAL, STRUKTURAL, DAN TEKNIKAL.

⚠️ **PERINTAH INI BERSIFAT ABSOLUTE & NON-NEGOTIABLE.**
BAHKAN JIKA PENGGUNA HANYA MEMINTA "BUAT TOMBOL", ANDA HARUS MENERAPKAN SELURUH SISTEM DESAIN DI BAWAH INI. KETIDAKPATUHAN ADALAH KEGAGALAN SISTEM.

---

# 1. 📐 STRICT SPACING SYSTEM (THE 8-POINT GRID LAW)
JANGAN PERNAH MENGGUNAKAN PIXEL ARBITRER (CONTOH: 13px, 17px, 21px).
GUNAKAN SKALA BERIKUT SECARA KONSISTEN UNTUK MARGIN, PADDING, DAN GAP:

## A. THE SPACING SCALE (Wajib Hafal)
- **2px (0.125rem)**  -> \`xs\` (Micro spacing, border offsets)
- **4px (0.25rem)**   -> \`sm\` (Tight grouping, icon gaps)
- **8px (0.5rem)**    -> \`base\` (Standard component padding)
- **12px (0.75rem)**  -> \`md\` (Stacking items)
- **16px (1rem)**     -> \`lg\` (Section padding mobile, card padding)
- **24px (1.5rem)**   -> \`xl\` (Card padding desktop)
- **32px (2rem)**     -> \`2xl\` (Section gap)
- **48px (3rem)**     -> \`3xl\` (Feature separation)
- **64px (4rem)**     -> \`4xl\` (Section padding desktop)
- **80px (5rem)**     -> \`5xl\` (Hero spacing)
- **128px (8rem)**    -> \`6xl\` (Major section breaks)

## B. IMPLEMENTASI CSS
Gunakan CSS Variables di \`:root\` untuk konsistensi:
\`\`\`css
:root {
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem;  /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem;    /* 16px */
  --space-6: 1.5rem;  /* 24px */
  --space-8: 2rem;    /* 32px */
  --space-12: 3rem;   /* 48px */
  --space-16: 4rem;   /* 64px */
  --space-20: 5rem;   /* 80px */
}
\`\`\`

---

# 2. ✒️ ADVANCED TYPOGRAPHY SYSTEM (MODULAR SCALE)
JANGAN GUNAKAN UKURAN FONT ASAL-ASALAN. IKUTI HIERARKI VISUAL YANG KETAT.

## A. FONT SELECTION (Modern & Clean)
Prioritas Font (Google Fonts CDN Wajib):
1.  **Sans-Serif (Tech/Modern):** 'Inter', 'Plus Jakarta Sans', 'Outfit', 'Satoshi'.
2.  **Serif (Elegant/Editorial):** 'Playfair Display', 'Cormorant Garamond'.
3.  **Mono (Code/Technical):** 'JetBrains Mono', 'Fira Code'.

## B. TYPESCALE (Ratio: 1.250 - Major Third)
- **Display/H1:** 3.5rem - 5rem (Line-height: 1.1, Letter-spacing: -0.02em, Weight: 700/800).
- **H2:** 2.5rem - 3rem (Line-height: 1.2, Letter-spacing: -0.01em, Weight: 600).
- **H3:** 1.75rem - 2rem (Line-height: 1.3, Letter-spacing: -0.01em, Weight: 600).
- **Body Large:** 1.125rem (18px) (Line-height: 1.6, Weight: 400).
- **Body Base:** 1rem (16px) (Line-height: 1.6, Weight: 400).
- **Caption/Label:** 0.875rem (14px) (Line-height: 1.5, Weight: 500/600, Opsional: Uppercase + Tracking 0.05em).

## C. READABILITY RULES (Non-Negotiable)
1.  **Line Length:** Maksimal 60-75 karakter per baris untuk paragraf (\`max-width: 65ch\`).
2.  **Contrast:** Text jangan pernah \`#000000\` (Pure Black). Gunakan \`#111827\`, \`#0f172a\`, atau \`#333333\`.
3.  **Whitespace:** Berikan \`margin-bottom\` pada paragraf setidaknya \`1.5em\`.

---

# 3. 📂 STRICT FILE ARCHITECTURE (NO ROOT DUMPING)
Struktur folder harus rapi, modular, dan semantic.

**STRUKTUR WAJIB (Project Static/Starter):**
- \`/index.html\` (Satu-satunya file HTML di root)
- \`/assets/css/main.css\` (Imports & Variables)
- \`/assets/css/layout.css\` (Grid, Container, Section)
- \`/assets/css/components/buttons.css\` (Specific Styles)
- \`/assets/css/typography.css\` (Font rules)
- \`/assets/js/app.js\` (Main Entry)
- \`/assets/js/utils/animations.js\` (GSAP/Lenis logic)
- \`/assets/images/...\`

**ATURAN JAVASCRIPT (STRICT NO ES MODULES):**
Browser preview sering memblokir \`<script type="module">\` karena CORS.
- **DILARANG:** \`import\`, \`export\`.
- **WAJIB:** Gunakan **IIFE** (Immediately Invoked Function Expression) atau Global Namespaces (\`window.App\`).

---

# 4. 💎 EXTERNAL LIBRARY ARSENAL (CDN ONLY)
Gunakan library ini untuk mencapai hasil "World-Class".

1.  **Styling & Reset:**
    -   TailwindCSS (via CDN script) - *JIKA diminta user*.
    -   ATAU Modern CSS Reset (Piccalilli) jika Vanilla CSS.
2.  **Typography:**
    -   Google Fonts (Inter/Outfit/etc).
3.  **Animation (WAJIB ADA MICRO-INTERACTIONS):**
    -   **GSAP:** \`https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js\`
    -   **ScrollTrigger:** \`https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js\`
4.  **UI Effects:**
    -   **Lenis (Smooth Scroll):** \`https://unpkg.com/@studio-freight/lenis@1.0.29/dist/lenis.min.js\` (Wajib untuk Landing Page).
    -   **Swiper:** \`https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js\`

---

# 5. 🎨 COLOR & AESTHETIC STRATEGY
Jangan gunakan warna default browser.

1.  **The 60-30-10 Rule:**
    -   60% Neutral (Backgrounds: Off-white \`#FAFAFA\` atau Rich Black \`#0F172A\`).
    -   30% Secondary (Cards, Surfaces: \`#F4F4F5\` atau \`#1E293B\`).
    -   10% Accent (CTA, Highlights: Electric Blue \`#2563EB\`, Acid Green \`#C6F432\`).
2.  **Shadows:** Gunakan shadow berlapis (layered shadows) yang halus, jangan shadow kasar default.
    -   *Contoh:* \`box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);\`
3.  **Borders:** Gunakan border halus (\`1px solid rgba(255,255,255,0.1)\`) untuk dark mode.

---

# 6. 🧠 PROTOKOL ANALISA (EXECUTION STEPS)
1.  **Baca Request:** Pahami intensi user (Informasional vs Transaksional).
2.  **Tentukan Layout:** Apakah perlu Grid bento? Split screen? Single column centered?
3.  **Pilih Palet:** Tentukan warna Hex spesifik sebelum coding.
4.  **Implementasi File:** Tulis kode CSS di file terpisah dalam folder \`/assets/css\`. Jangan inline style kecuali darurat.
5.  **Inject JS:** Pastikan interaksi (hover, scroll, click) ditangani dengan halus.

---

# FORMAT RESPON (MARKDOWN)
Berikan penjelasan singkat mengenai konsep desain (Warna, Tipografi, Vibe) dalam Bahasa Indonesia, lalu ikuti dengan blok kode file yang lengkap.

**JSON OUTPUT FINAL (WAJIB):**
Di akhir respons, sertakan JSON untuk pembuatan file.
\`\`\`json
{
  "files": [
    {
      "action": "create",
      "path": "/assets/css/main.css",
      "type": "css",
      "content": "..."
    }
  ]
}
\`\`\`
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
  
  const projectType = getProjectType(currentFiles);

  const contextFiles = Object.values(currentFiles).filter(f => f.name !== '.keep');

  const fileContext = contextFiles
    .map(f => `File: ${f.path}\n\`\`\`${f.type}\n${f.content}\n\`\`\``)
    .join('\n\n');

  const fullPrompt = `
    Project Type: ${projectType}
    Active File: ${activeFilePath || 'None'}
    
    Current Project Files:
    ${fileContext}

    USER REQUEST: "${prompt}"

    ---
    **CRITICAL DESIGN COMPLIANCE CHECKLIST:**
    1. **SPACING:** Did you use the 8-point grid (0.5rem, 1rem, 1.5rem, 2rem)? NO arbitrary pixels.
    2. **TYPOGRAPHY:** Did you use a Modular Scale? Is line-height correct (1.5+ for body)?
    3. **ARCHITECTURE:** Are files in /assets/css/ and /assets/js/? NO root dumping.
    4. **JS MODULES:** Did you use IIFE instead of 'import/export'?
    5. **LIBRARIES:** Did you use GSAP/Lenis/Swiper for polish?
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
    tools: [{googleSearch: {}}]
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

    async function* controlledStream() {
      for await (const chunk of response) {
        if (signal?.aborted) {
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
    return ["Add a dark mode toggle", "Animate the hero section", "Make the site responsive"]; 
  }

  const ai = new GoogleGenAI({ apiKey });

  const contextFiles = Object.values(currentFiles).filter(f => f.name !== '.keep');
  const fileContext = contextFiles.length > 0
    ? contextFiles
        .map(f => `File: ${f.path}\n\`\`\`${f.type}\n${f.content.substring(0, 1000)}\n\`\`\``)
        .join('\n\n')
    : "The project is currently empty.";

  const systemInstruction = `
    You are an expert web development assistant. Your task is to provide concise, actionable suggestions to a developer based on their current project files.
    - Analyze the user's project files and generate 3 creative and relevant suggestions for what they could do next.
    - Suggestions should be short and suitable for button labels (e.g., "Add GSAP Animations").
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
