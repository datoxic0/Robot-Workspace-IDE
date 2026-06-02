import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json());

// Initialize Gemini client on the server
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// API endpoint for robotic assistance and code generation
async function generateContentWithRetryAndFallback(params: {
  contents: string;
  systemInstruction?: string;
  temperature?: number;
}) {
  const ai = getAiClient();
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 3;
    let delay = 1000;

    while (attempts < maxAttempts) {
      try {
        console.log(`Sending content request to model: ${model} (attempt ${attempts + 1}/${maxAttempts})`);
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            temperature: params.temperature,
          },
        });
        return response;
      } catch (err: any) {
        lastError = err;
        attempts++;
        const errMessage = String(err?.message || err || "").toLowerCase();
        
        const isTemporary = errMessage.includes("503") || 
                            errMessage.includes("unavailable") || 
                            errMessage.includes("429") || 
                            errMessage.includes("resource_exhausted") ||
                            errMessage.includes("high demand") ||
                            errMessage.includes("busy");

        if (isTemporary && attempts < maxAttempts) {
          console.warn(`Gemini API connection error on ${model} (attempt ${attempts}/${maxAttempts}), retrying in ${delay}ms... Details:`, errMessage);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`Gemini API error for model ${model}:`, errMessage);
          break;
        }
      }
    }
  }

  throw lastError || new Error("Failed to communicate with any Gemini model.");
}

app.post("/api/ai/assist", async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, systemInstruction, codeContext, language, board } = req.body;
    
    let compiledPrompt = prompt;
    if (codeContext) {
      compiledPrompt += `\n\n[Active Code Context (${language} for ${board})]\n\`\`\`\n${codeContext}\n\`\`\``;
    }

    const defaultSystemInstruction = 
      "You are an elite expert in industrial robotics, robotic arms, Computer Integrated Manufacturing (CIM), board microcontrollers (Arduino, ESP32, ESP8266, STM32, ARM Cortex-M), and micro-programming languages (MicroPython, Arduino Dialect C++, G-code). " +
      "Help the user program, design, configure, or solve kinematics for their robots. Be precise, highly structured, and technical.";

    const response = await generateContentWithRetryAndFallback({
      contents: compiledPrompt,
      systemInstruction: systemInstruction || defaultSystemInstruction,
      temperature: 0.2,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("AI Assist error:", error);
    res.status(500).json({ error: error.message || "Failed to communicate with AI model" });
  }
});

// API endpoint for smart kinematics solving recommendations
app.post("/api/ai/kinematics", async (req: express.Request, res: express.Response) => {
  try {
    const { joints, targetPosition } = req.body;
    
    const prompt = `Solve Inverse Kinematics guidelines or joint parameters.
Current configuration of robotic arm:
Joints count: ${joints?.length || 4}
Target Cartesian Coordinates: X=${targetPosition?.x || 120}, Y=${targetPosition?.y || 120}, Z=${targetPosition?.z || 0}.
Provide the trigonometric formula summary, step-by-step joint angle adjustments in degrees, and speed suggestions for smooth trajectory planning. Keep descriptions concise, professional, and mathematically rigorous.`;

    const response = await generateContentWithRetryAndFallback({
      contents: prompt,
      temperature: 0.1,
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Kinematics AI error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze kinematics" });
  }
});

// Serve assets / Vite fallback integration
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Vite loading in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled static production build assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Application successfully listening on http://0.0.0.0:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error("Vite server configuration crash:", err);
});
