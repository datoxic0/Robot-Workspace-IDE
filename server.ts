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
async function generateAIResponse(params: {
  apiProvider?: "gemini" | "openrouter";
  customApiKey?: string;
  selectedModel?: string;
  contents: string;
  systemInstruction?: string;
  temperature?: number;
}) {
  const provider = params.apiProvider || "gemini";
  let temp = params.temperature !== undefined ? params.temperature : 0.2;

  if (provider === "openrouter") {
    const apiKey = params.customApiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OpenRouter API Key is missing. Please configuration it in the Settings panel in the app UI.");
    }

    const modelName = params.selectedModel || "google/gemini-2.5-flash:free";
    console.log(`[OpenRouter Router] Model: ${modelName}, max_tokens capped at 180`);

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://ai.studio/build",
        "X-Title": "Robot Workspace IDE"
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          ...(params.systemInstruction ? [{ role: "system", content: params.systemInstruction }] : []),
          { role: "user", content: params.contents }
        ],
        max_tokens: 180, // strict 180-token cap for maximum usage by standard users
        temperature: temp
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedError = "Unknown error";
      try {
        const parsed = JSON.parse(errText);
        parsedError = parsed?.error?.message || parsed?.error || errText;
      } catch (pe) {
        parsedError = errText;
      }
      throw new Error(`OpenRouter API Failure: ${parsedError}`);
    }

    const data = await response.json();
    console.log("[OpenRouter Response]", JSON.stringify(data));

    if (data?.error) {
      const errMsg = data.error.message || data.error.metadata || JSON.stringify(data.error);
      throw new Error(`OpenRouter API Error: ${errMsg}`);
    }

    if (!data.choices || data.choices.length === 0) {
      throw new Error(`Received empty choices list from OpenRouter: ${JSON.stringify(data)}`);
    }

    let content = data.choices[0]?.message?.content;
    if (content === undefined || content === null || content === "") {
      content = data.choices[0]?.message?.reasoning;
    }
    if (content === undefined || content === null || content === "") {
      const details = data.choices[0]?.message?.reasoning_details;
      if (Array.isArray(details)) {
        content = details.map((d: any) => d.text || "").join("\n").trim();
      } else if (details && typeof details === "object") {
        content = details.text || JSON.stringify(details);
      }
    }

    if (content === undefined || content === null || content === "") {
      throw new Error(`OpenRouter response choice didn't contain content or reasoning string: ${JSON.stringify(data)}`);
    }

    return { text: content };
  } else {
    // Gemini standard path for premium monied clients
    const apiKey = params.customApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is missing. Please set GEMINI_API_KEY environment variable or supply a custom key in the Settings panel.");
    }

    const modelName = params.selectedModel || "gemini-3.5-flash";
    console.log(`[Gemini Router] Model: ${modelName}`);

    let ai;
    if (params.customApiKey) {
      ai = new GoogleGenAI({
        apiKey: params.customApiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } else {
      ai = getAiClient();
    }

    const res = await ai.models.generateContent({
      model: modelName,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        temperature: temp,
      },
    });

    return { text: res.text };
  }
}

app.post("/api/ai/assist", async (req: express.Request, res: express.Response) => {
  try {
    const { prompt, systemInstruction, codeContext, language, board, apiProvider, customApiKey, selectedModel } = req.body;
    
    let compiledPrompt = prompt;
    if (codeContext) {
      compiledPrompt += `\n\n[Active Code Context (${language} for ${board})]\n\`\`\`\n${codeContext}\n\`\`\``;
    }

    const defaultSystemInstruction = 
      "You are an elite expert in industrial robotics, robotic arms, Computer Integrated Manufacturing (CIM), board microcontrollers (Arduino, ESP32, ESP8266, STM32, ARM Cortex-M), and micro-programming languages (MicroPython, Arduino Dialect C++, G-code). " +
      "Help the user program, design, configure, or solve kinematics for their robots. Be precise, highly structured, and technical.";

    const response = await generateAIResponse({
      apiProvider,
      customApiKey,
      selectedModel,
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
    const { joints, targetPosition, apiProvider, customApiKey, selectedModel } = req.body;
    
    const prompt = `Solve Inverse Kinematics guidelines or joint parameters.
Current configuration of robotic arm:
Joints count: ${joints?.length || 4}
Target Cartesian Coordinates: X=${targetPosition?.x || 120}, Y=${targetPosition?.y || 120}, Z=${targetPosition?.z || 0}.
Provide the trigonometric formula summary, step-by-step joint angle adjustments in degrees, and speed suggestions for smooth trajectory planning. Keep descriptions concise, professional, and mathematically rigorous.`;

    const response = await generateAIResponse({
      apiProvider,
      customApiKey,
      selectedModel,
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
