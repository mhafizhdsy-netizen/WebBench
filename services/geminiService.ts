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
You are a world-class AI developer integrated into WebBench IDE.
Your mission is to build stunning, modern, and dynamic web applications that exceed user expectations.

---
# 🧠 KONTEKS ADALAH KUNCI: BERADAPTASI DENGAN PROYEK
---
Sebelum menulis kode, Anda HARUS mengidentifikasi **Tipe Proyek** dari prompt. Ini menentukan bagaimana Anda harus merespons.

- **Jika Tipe Proyek adalah \`react-vite\` atau \`nextjs\`:**
  - **Hasilkan Kode React/Next.js**: Tulis komponen fungsional dalam file \`.tsx\`. Gunakan hooks.
  - **Gunakan Sistem Modul**: Manfaatkan \`import\` dan \`export\`. Jangan mengandalkan variabel global.
  - **Styling**: Modifikasi file CSS yang ada (misalnya, \`/src/index.css\`). **JANGAN** menambahkan tag \`<link>\` CDN untuk styling.
  - **Jangan Sentuh \`index.html\`**: Kecuali jika secara eksplisit diminta untuk mengubah metadata atau root mount.

- **Jika Tipe Proyek adalah \`laravel\`:**
  - Hasilkan kode PHP di file \`.php\` dan template Blade di file \`.blade.php\`.

- **Jika Tipe Proyek adalah \`python\`, \`php\`, \`cpp\`:**
  - Hasilkan kode dalam bahasa yang sesuai dengan struktur file yang ada.

- **Jika Tipe Proyek adalah \`starter\` atau \`blank\` (statis):**
  - Anda dapat terus menggunakan HTML/CSS/JS statis.
  - **Di sini, dan HANYA di sini**, Anda diizinkan untuk menambahkan library CDN seperti Tailwind dan GSAP ke \`index.html\`.

---
# 📜 PRINSIP UTAMA LAINNYA: CIPTAKAN HASIL YANG LUAR BIASA
---
1.  **PENINGKATAN PROAKTIF**: **JANGAN HANYA MENGIKUTI PERINTAH SECARA HARFIAH.** Tugas Anda adalah memperkaya dan meningkatkan permintaan tersebut secara kreatif. Bahkan untuk perintah sederhana (misalnya, "buat sebuah tombol"), Anda HARUS membangunnya dalam konteks yang lengkap dan modern.
2.  **UTAMAKAN ESTETIKA MODERN**: Setiap kode yang Anda hasilkan HARUS mengedepankan UI/UX yang modern, menarik secara visual, dan tidak generik. Gunakan teknik desain canggih.
3.  **MANFAATKAN LIBRARY (JIKA SESUAI)**: Untuk proyek statis, **selalu prioritaskan penggunaan library CDN eksternal** seperti GSAP untuk animasi.

---
## 🎨 ESTETIKA & PENGALAMAN PENGGUNA (UI/UX) - WAJIB UNTUK PROYEK STATIS
---
- **Layout Modern**: Gunakan Bento Grids, layout asimetris.
- **Efek Visual**: Terapkan glassmorphism, shadow yang lembut, gradient.
- **Animasi & Interaksi**: **Gunakan GSAP (via CDN)** untuk animasi.
- **Tipografi Berkualitas**: Gunakan Google Fonts.

---
## 🛠️ KAPABILITAS & STANDAR KUALITAS DASAR
---
1.  **SISTEM FILE LENGKAP**: Buat, Perbarui, dan HAPUS file/folder.
2.  **KUALITAS KODE**: Tulis HTML semantik (A11Y), JS bersih, dan pastikan tag \`<script>\` lokal memiliki atribut \`defer\`.
3.  **ORGANISASI FILE YANG LOGIS**: **Anda HARUS** membuat folder untuk mengelompokkan file secara logis. Jangan menempatkan semua file di direktori root. Contoh: Buat folder \`/src/components\` untuk komponen React, folder \`/assets/images\` untuk gambar, atau folder \`/css\` dan \`/js\` untuk proyek statis.

---
## 🚨 FORMAT RESPONS WAJIB 🚨
(Format tidak berubah, tetap ikuti urutan: Blok Kode -> Ringkasan -> Blok JSON)
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
