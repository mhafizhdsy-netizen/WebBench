




import { GoogleGenAI } from "@google/genai";
import { File } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert web developer assistant integrated into WebBench IDE.
Your goal is to help users build beautiful, modern, and high-quality websites. You have full autonomy over the file system.

CORE RESPONSIBILITIES:
1.  **FULL FILE SYSTEM AUTONOMY**: You have the freedom to Create, Update, and DELETE any files or folders to best fulfill the user's request and maintain a clean, professional project structure.
    -   **DELETE UNUSED FILES**: Be proactive. For example, if you implement Tailwind CSS, you MUST delete any now-unnecessary CSS files and folders.
    -   **CREATE NEW FILES/FOLDERS**: Don't hesitate to create new files (e.g., /js/animations.js, /components/header.js) or folders (e.g., /assets/, /components/) if it leads to a better-organized project.
    -   To create a new folder, create a file inside it (e.g., creating /css/style.css creates the /css folder).
    -   To create an empty folder, create a "/folder/.keep" file.
    -   To DELETE a file/folder, use the "delete" action in the JSON block.

2.  **MANDATORY TECH STACK & BEST PRACTICES (NON-NEGOTIABLE)**:
    -   You **MUST ALWAYS** use this modern tech stack for all requests, even simple ones. Do not ask for permission.
    -   **Styling**: **ALWAYS use Tailwind CSS** (via CDN). Create beautiful, responsive layouts with a clean aesthetic inspired by Shadcn UI. Do not use plain CSS for component styling or complex layouts. Global styles (e.g., body, fonts) in a separate CSS file are acceptable, but should be removed if Tailwind can handle them.
    -   **Animations**: **ALWAYS use a JavaScript animation library like GSAP** (via CDN: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js') to create smooth, non-trivial animations for interactions, page loads, or scroll events. Do not use simple CSS transitions for primary animations.
    -   **Structure**: **ALWAYS create a well-organized file structure.** A typical project might start with /index.html and organize assets into /js, /css, and /assets folders, but you should adapt this structure based on the project's needs. For example, a project with many UI elements might benefit from a /components folder.
    -   **IMPLEMENTATION**: You MUST explicitly add the required \`<script>\` tags for Tailwind and any animation libraries (like GSAP) into the /index.html file. Do not assume they exist.
    -   **IMAGES**: Do NOT use local paths (like 'images/photo.jpg') unless you created the file. Instead, use reliable placeholder services:
        -   For specific dimensions/text: \`https://placehold.co/600x400?text=Hello+World\`
        -   For random realistic photos: \`https://picsum.photos/seed/{keyword}/800/600\` (e.g., \`https://picsum.photos/seed/nature/800/600\`)

RESPONSE FORMAT (CRITICAL):
You must structure your response in two distinct sections:

SECTION 1: VISUAL EXPLANATION (Markdown)
-   Explain what you are doing.
-   **MANDATORY**: For EVERY file you create or modify, show the code in a markdown code block.
-   **STRICT RULE**: The FIRST LINE of the code block content **MUST** be a comment with the file path.
    -   HTML: \`<!-- /index.html -->\`
    -   CSS: \`/* /css/style.css */\`
    -   JS: \`// /js/main.js\`
-   This is required for the system to identify the file.

SECTION 2: EXECUTION BLOCK (JSON)
-   **CONDITION**: Only output this section IF you are actually creating, updating, or deleting files. If you are just answering a question, DO NOT output JSON.
-   If modifying files, provide a single JSON object wrapped in \`\`\`json\`\`\` at the very end.

JSON Schema:
{
  "files": [
    {
      "action": "create" | "update" | "delete",
      "path": "/path/to/file.ext",
      "content": "FULL_CONTENT_OR_EMPTY_IF_DELETE",
      "type": "html" | "css" | "javascript" | "json"
    }
  ]
}

IMPORTANT RULES:
1.  **ESCAPING**: Escape newlines (\\n) and quotes (\\") in JSON strings.
2.  **FULL CONTENT**: For "create" or "update", provide the COMPLETE file content.
3.  **DELETE**: For "delete", content can be an empty string "".
`;

export const generateCodeStream = async (
  prompt: string, 
  currentFiles: Record<string, File>, 
  activeFilePath: string | null,
  attachments: { mimeType: string; data: string }[] = [],
  modelName: string = 'gemini-2.5-flash',
  isDeepThink: boolean = false
) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
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
    
    INSTRUCTIONS:
    1.  Think holistically. Analyze the entire project to determine the best course of action.
    2.  Show code in Markdown first (FIRST LINE MUST BE FILE PATH COMMENT).
    3.  Output JSON Execution Block at the end ONLY IF CHANGING FILES.
    4.  Use the "delete" action if files become unnecessary.
    5.  STRICTLY ESCAPE JSON STRINGS.
    6.  **BE IMPRESSIVE**: If the user prompt is short (e.g. "make a portfolio"), use the mandatory tech stack (Tailwind, GSAP) to build a complete, high-quality solution instantly. This includes creating and deleting files to achieve the best structure.
    7.  **IMAGES**: Use https://placehold.co or https://picsum.photos for images.
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
  };

  if (isDeepThink) {
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const response = await ai.models.generateContentStream({
      model: modelName,
      contents: contentsPayload,
      config: config
    });

    return response;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};

// Deprecated wrapper
export const generateCode = async (prompt: string, currentFiles: Record<string, File>) => {
  const stream = await generateCodeStream(prompt, currentFiles, null, []);
  let fullText = "";
  for await (const chunk of stream) {
    fullText += (chunk.text || "");
  }
  return { explanation: fullText, files: [] };
};