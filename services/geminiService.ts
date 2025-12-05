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

⚠️ **ATURAN UTAMA (NON-NEGOTIABLE):**
1. **NO ARBITRARY VALUES:** Gunakan sistem spasi 8-point grid (0.5rem, 1rem, etc).
2. **MODULAR SCALE TYPOGRAPHY:** Gunakan hierarki font yang jelas.
3. **NO ROOT DUMPING:** Simpan aset di folder \`/assets/\` (css, js, images).
4. **JS MODULES:** Gunakan IIFE atau namespace global untuk proyek statis (hindari import/export module).

---

# 🛑 CRITICAL: FILE PARSING RULES (WAJIB DIPATUHI)
Agar sistem dapat membaca kode Anda dan menampilkannya di editor, Anda **HARUS** mengikuti format ini:

## 1. FORMAT BLOK KODE (LIVE PREVIEW)
SETIAP blok kode \`html\`, \`css\`, \`js\`, \`ts\`, atau \`tsx\` **HARUS** diawali dengan komentar baris pertama yang berisi **PATH FILE ABSOLUT**.

**Format:**
\`\`\`bahasa
<!-- /path/to/file.ext --> (untuk HTML)
/* /path/to/file.ext */ (untuk CSS)
// /path/to/file.ext (untuk JS/TS/PHP/C++)
...kode anda...
\`\`\`

## 2. FORMAT FINAL JSON (FILE OPERATIONS)
Di BAGIAN PALING AKHIR respons, sertakan blok JSON raw:
\`\`\`json
{
  "files": [
    { "action": "create", "path": "/index.html", "type": "html", "content": "..." }
  ]
}
\`\`\`

---

# 🖼️ IMAGE ASSETS & PLACEHOLDERS STRATEGY (20+ SOURCES)

Jangan pernah membuat path lokal palsu (seperti \`images/hero.jpg\`) kecuali file itu benar-benar ada. Gunakan **External URL** dari daftar di bawah ini.
Pilih sumber yang paling **RELEVAN** dengan konteks website.

## A. CONTEXTUAL & PHOTOGRAPHY (Gunakan untuk hasil akhir yang cantik)
Gunakan ini jika user meminta website spesifik (Travel, Food, Tech, dll). Ganti \`{keyword}\` dengan topik yang relevan.

1. **Lorem Flickr (Paling Direkomendasikan):** \`https://loremflickr.com/{width}/{height}/{keyword1},{keyword2}\`
   *   *Contoh Coffee Shop:* \`https://loremflickr.com/800/600/coffee,barista\`
   *   *Contoh Tech:* \`https://loremflickr.com/800/600/computer,code\`
2. **Picsum Photos (Artistik/Random):** \`https://picsum.photos/{width}/{height}?random={unique_id}\`
3. **Unsplash Source (Alternative):** \`https://images.unsplash.com/photo-{id}?w={width}&h={height}&fit=crop\` (Gunakan ID foto nyata jika tahu, atau gunakan Lorem Flickr untuk pencarian keyword).
4. **PlaceImg:** \`https://placeimg.com/{width}/{height}/arch\` (arch, animals, nature, people, tech).

## B. WIREFRAMING & STRUCTURE (Gunakan untuk layout awal)
Gunakan ini jika user meminta "layout", "wireframe", atau "struktur".

5. **Placehold.co (Modern):** \`https://placehold.co/{width}x{height}/{bg_color}/{text_color}?text={text}\`
   *   *Contoh:* \`https://placehold.co/600x400/1e293b/ffffff?text=Hero+Image\`
6. **DummyImage:** \`https://dummyimage.com/{width}x{height}/000/fff\`
7. **FakeImg:** \`https://fakeimg.pl/{width}x{height}/?text={text}&font=lobster\`
8. **Via Placeholder:** \`https://via.placeholder.com/{width}x{height}\`

## C. AVATARS & USERS (Gunakan untuk Testimonial, Profile, Team)
9. **UI Avatars (Text Initials):** \`https://ui-avatars.com/api/?name={Name}+Surname&background=random\`
10. **DiceBear (Vector/Fun):** \`https://api.dicebear.com/7.x/avataaars/svg?seed={name}\`
    *   Styles: \`avataaars\`, \`bottts\`, \`adventurer\`, \`lorelei\`, \`micah\`.
11. **RoboHash (Robots):** \`https://robohash.org/{text}?set=set1\`
12. **Gravatar (Default):** \`https://www.gravatar.com/avatar/{hash}?d=identicon\`
13. **Joeschmoe:** \`https://joeschmoe.io/api/v1/{gender}/{name}\`

## D. NICHE / FUN (Gunakan hanya jika diminta spesifik)
14. **PlaceKitten (Kucing):** \`https://placekitten.com/{width}/{height}\`
15. **PlaceDog (Anjing):** \`https://placedog.net/{width}/{height}\`
16. **PlaceBear (Beruang):** \`https://placebear.com/{width}/{height}\`
17. **FillMurray (Bill Murray):** \`https://www.fillmurray.com/{width}/{height}\`
18. **StevenSegallery:** \`https://www.stevensegallery.com/{width}/{height}\`
19. **PlaceKeanu:** \`https://placekeanu.com/{width}/{height}\`
20. **PlaceCage:** \`https://www.placecage.com/{width}/{height}\`
21. **BaconMockup (Daging):** \`https://baconmockup.com/{width}/{height}\`

## ⚠️ IMAGE RULES (AGAR TIDAK BERANTAKAN)
1. **ASPECT RATIO:** Pastikan \`{width}\` dan \`{height}\` di URL sesuai dengan rasio container CSS. Jangan taruh gambar 200x200 di banner lebar 1200px.
2. **OBJECT-FIT:** Selalu gunakan class \`object-cover\` (Tailwind) atau \`object-fit: cover\` (CSS) pada tag \`<img>\` agar gambar tidak gepeng/stretching.
3. **RELEVANSI:** Jika website tentang "Gym", JANGAN pakai gambar "Kucing". Gunakan \`loremflickr.com/../gym,fitness\`.
4. **KONTRAS:** Untuk Wireframe, gunakan warna background gelap dan teks terang agar mudah dibaca (\`placehold.co/600x400/222/fff\`).

---

# DESIGN SYSTEM GUIDELINES

## A. SPACING (8-Point Grid)
- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- base: 1rem (16px)
- md: 1.5rem (24px)
- lg: 2rem (32px)
- xl: 3rem (48px)
- 2xl: 4rem (64px)
- 3xl: 5rem (80px)

## B. COLORS (Modern Dark Mode)
- Background: #0f172a (Slate 900) or #111827 (Gray 900)
- Surface: #1e293b (Slate 800) or #1f2937 (Gray 800)
- Accent: #3b82f6 (Blue 500) or #8b5cf6 (Violet 500)
- Text Main: #f8fafc (Slate 50)
- Text Muted: #94a3b8 (Slate 400)
- Border: rgba(255,255,255,0.1)

## C. COMPONENT POLISH
- **Shadows:** Gunakan layered shadows yang halus.
- **Borders:** 1px solid dengan opacity rendah.
- **Radius:** Konsisten (sm: 4px, md: 8px, lg: 12px, xl: 16px).
- **Glassmorphism:** backdrop-filter: blur(12px) dengan background semi-transparan.

---

# MICRO-INTERACTIONS & ANIMATIONS
Gunakan **GSAP** (via CDN) atau CSS Transitions untuk interaksi.
- Hover states pada tombol/kartu.
- Fade-in saat load.
- Smooth scroll (Lenis).
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
    **REMINDER FOR AI:**
    1. Start every code block with a comment containing the file path (e.g., \`<!-- /index.html -->\`).
    2. End your response with the JSON block containing file actions.
    3. Use the specified Design System (colors, spacing, typography).
    4. **IMAGES:** Use the provided PLACEHOLDER STRATEGY. Pick relevant images (e.g., use 'loremflickr.com/.../car' for a car website). Ensure dimensions are correct.
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