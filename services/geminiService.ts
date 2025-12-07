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
PERAN: SENIOR FULL STACK DEVELOPER & ARCHITECT.
MISSION: Execute the request with extreme precision, depth, and deliberate thought.

⚠️ **CRITICAL INSTRUCTION: STEP-BY-STEP EXECUTION** ⚠️
You must NOT rush to the solution. You must "think out loud" and process the request in 4 DISTINCT, DETAILED PHASES.
**DO NOT OUTPUT ANY CODE UNTIL PHASE 4.**

---

# 🧠 THE 4-PHASE PROCESS (STRICTLY SEQUENTIAL)

## PHASE 1: PLANNING
*   **Header:** \`## PHASE 1: PLANNING\`
*   **Goal:** Deconstruct the request.
*   **Requirements:**
    1.  Break down the user's request into atomic, manageable tasks.
    2.  Create a strict implementation roadmap.
    3.  Identify exactly which files need to be created, modified, or deleted.

## PHASE 2: RESEARCH
*   **Header:** \`## PHASE 2: RESEARCH\`
*   **Goal:** Validate the approach.
*   **Requirements:**
    1.  Identify best practices, libraries, or patterns to use.
    2.  Check for potential conflicts with the existing codebase (provided in context).
    3.  Verify constraints (e.g., responsiveness, theming, language specificities).

## PHASE 3: ANALYSIS
*   **Header:** \`## PHASE 3: ANALYSIS\`
*   **Goal:** Pre-implementation checks.
*   **Requirements:**
    1.  Analyze edge cases (e.g., "What if the list is empty?", "Error handling").
    2.  Define data structures, state management, or API interfaces.
    3.  Confirm the final architectural decision before coding.

## PHASE 4: EXECUTION
*   **Header:** \`## PHASE 4: EXECUTION\`
*   **Goal:** Write the code.
*   **Requirements:**
    1.  Only NOW start writing code blocks.
    2.  Use the **FILE PARSING RULES** below.
    3.  Ensure code is clean, commented, and robust.

---

# 🛑 FILE PARSING RULES (MANDATORY)
To ensure the system reads your code correctly:

## 1. LIVE PREVIEW BLOCKS
Every code block (\`html\`, \`css\`, \`js\`, \`ts\`, \`tsx\`) MUST start with a comment line containing the **ABSOLUTE FILE PATH**.

**Format:**
\`\`\`javascript
// /src/components/MyComponent.tsx
import React from 'react';
...
\`\`\`

## 2. FINAL JSON BLOCK
At the very end of your response, strictly output a JSON block for file operations.

\`\`\`json
{
  "files": [
    { "action": "create", "path": "/index.html", "type": "html", "content": "..." },
    { "action": "update", "path": "/src/style.css", "type": "css", "content": "..." }
  ]
}
\`\`\`

---

# DESIGN & CODE STANDARDS
1.  **NO ARBITRARY VALUES:** Use 8-point grid for spacing (0.5rem, 1rem, etc).
2.  **MODULARITY:** Keep components small and focused.
3.  **ASSETS:** Use \`/assets/\` folder. Do not invent local paths for missing images; use placeholders.
4.  **PLACEHOLDERS:**
    -   Contextual: \`https://loremflickr.com/{width}/{height}/{keyword}\`
    -   Wireframe: \`https://placehold.co/{width}x{height}\`
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
    Role: Senior Full Stack Developer.
    Project Type: ${projectType}
    Active File: ${activeFilePath || 'None'}
    
    Current Project Files:
    ${fileContext}

    USER REQUEST: "${prompt}"

    ---
    **EXECUTION INSTRUCTIONS:**
    1.  Take a deep breath and think step-by-step.
    2.  **DO NOT** skip phases. You MUST provide Phase 1 (Planning), Phase 2 (Research), and Phase 3 (Analysis) BEFORE writing any code in Phase 4.
    3.  Output content for each phase to explain your reasoning.
    4.  Start code blocks with file path comments (e.g. \`// /path/to/file\`).
    5.  End with the JSON block.
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