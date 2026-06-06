import React, { useState } from "react";
import Markdown from "react-markdown";
import { Cpu, RotateCcw, AlertTriangle, Send, Sparkles, Code2, Flame, Wrench, ChevronRight, Settings } from "lucide-react";
import { BoardConfig, ProgramLanguageConfig } from "../types";

interface AIPanelProps {
  activeBoard: BoardConfig;
  activeLanguage: ProgramLanguageConfig;
  currentCode: string;
  onInsertCode: (code: string) => void;
  onCollapse?: () => void;
}

export default function AIPanel({
  activeBoard,
  activeLanguage,
  currentCode,
  onInsertCode,
  onCollapse
}: AIPanelProps) {
  // Config states for Gemini & OpenRouter Customization
  const [showSettings, setShowSettings] = useState(false);
  const [apiProvider, setApiProvider] = useState<"gemini" | "openrouter">(() => {
    return (localStorage.getItem("robot_ai_provider") as "gemini" | "openrouter") || "gemini";
  });
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("robot_ai_gemini_key") || "");
  const [openrouterKey, setOpenrouterKey] = useState(() => localStorage.getItem("robot_ai_openrouter_key") || "");
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = localStorage.getItem("robot_ai_model");
    if (stored) return stored;
    const provider = localStorage.getItem("robot_ai_provider") || "gemini";
    return provider === "openrouter" ? "openrouter/free" : "gemini-3.5-flash";
  });

  const saveSetting = (key: string, value: string) => {
    localStorage.setItem(key, value);
  };

  const handleProviderChange = (provider: "gemini" | "openrouter") => {
    setApiProvider(provider);
    saveSetting("robot_ai_provider", provider);
    
    // Auto-select a corresponding default model
    let defaultModel = "gemini-3.5-flash";
    if (provider === "openrouter") {
      defaultModel = "openrouter/free";
    }
    setSelectedModel(defaultModel);
    saveSetting("robot_ai_model", defaultModel);
  };

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: `🦾 **A.I. Robotic Co-pilot initialized.** 

I can help study mechanical kinematics, write firmware routines, evaluate stress parameters, or plan trajectories for the **${activeBoard.name}** platform in **${activeLanguage.name}**.

*Quick Hint:* Tap one of the automation tasks below, or type your custom robot instruction!`
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Dynamic context-aware prompts depending on hardware selection
  const quickPromptsByBoard: Record<string, { label: string; prompt: string }[]> = {
    cim_arm_controller: [
      {
        label: "Tray sorting G-Code",
        prompt: "Write a high-precision industrial G-Code sequence for picking an item from the photoelectric sensor range (laser SENSOR beam at X=125mm) and placing it into trays located at X=472mm, Y=302mm. Add detail comments explaining G01 speeds."
      },
      {
        label: "Explain CCD Kinematics",
        prompt: "Explain how CCD (Cyclic Coordinate Descent) Inverse Kinematics computes angles for a 4-degrees-of-freedom robotic arm. Formulate standard trigonometric limitations and joint parameters."
      },
      {
        label: "Optimize tray delay cycle",
        prompt: "How can we optimize G-Code workspace trajectory to reduce picking cycle times in Computer Integrated Manufacturing (CIM) assembly lines? Share a short sample."
      }
    ],
    arduino_uno: [
      {
        label: "Double blink loop",
        prompt: "Write a clear Arduino loop that blink the built-in LED on pin 13 and drives an external industrial pneumatic valve switch relay connected to Digital Pin 3."
      },
      {
        label: "Servo trajectory easing",
        prompt: "Give me an Arduino sweep function that includes logarithmic easing or deceleration near joint rotation limits to prevent robotic arm overshoot."
      }
    ],
    esp32: [
      {
        label: "AP Joint controller",
        prompt: "Generate an ESP32 web server script written in standard Arduino Dialect C++ that sets up an Access Point SSID: 'Robot_Arm_Router' and processes joint movement POST queries."
      }
    ],
    raspberry_pi_pico: [
      {
        label: "MicroPython step loop",
        prompt: "Provide a lightweight RP2040 MicroPython step driver class. It should drive step pulses on Pin 15 and toggle directions on Pin 14 safely using thread queues."
      }
    ]
  };

  const activePrompts = quickPromptsByBoard[activeBoard.id] || [
    {
      label: "Optimize workspace logic",
      prompt: "Analyze the current active workspace script and recommend speed or hardware optimizations to prevent servo motor overheating."
    },
    {
      label: "Explain Active Code",
      prompt: "Explain step-by-step how the current workspace script triggers physical microcontroller actions."
    }
  ];

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputText;
    if (!promptToSend.trim() || isLoading) return;

    setErrorText(null);
    const newMessages = [...messages, { role: "user" as const, text: promptToSend }];
    setMessages(newMessages);
    setInputText("");
    setIsLoading(true);

    try {
      // Load current configurations from persistence
      const prov = localStorage.getItem("robot_ai_provider") || "gemini";
      const key = prov === "openrouter" 
        ? localStorage.getItem("robot_ai_openrouter_key") || ""
        : localStorage.getItem("robot_ai_gemini_key") || "";
      const model = localStorage.getItem("robot_ai_model") || (prov === "openrouter" ? "google/gemini-2.5-flash:free" : "gemini-3.5-flash");

      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptToSend,
          codeContext: currentCode,
          language: activeLanguage.name,
          board: activeBoard.name,
          systemInstruction: `You are an elite master roboticist, programmer, and CIM engineer specializing in ${activeBoard.name}. Provide precise instructions, clear mathematical formulations if coordinates are involved, and code snippets where fitting.`,
          apiProvider: prov,
          customApiKey: key,
          selectedModel: model
        })
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (jsonErr) {
        // Fail silently and let status check handle it
      }

      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}: Our Express proxy had an issue communicating with Gemini.`);
      }

      if (data && data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data?.text || "No insights found." }]);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to reach AI. Confirm GEMINI_API_KEY environment variable is configured.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoInsert = (textBlock: string) => {
    // Basic heuristics to pluck codes inside ``` block
    const codeBlocks = textBlock.match(/```(?:gcode|arduino|cpp|python|cim_script)?([\s\S]*?)```/);
    if (codeBlocks && codeBlocks[1]) {
      onInsertCode(codeBlocks[1].trim());
    } else {
      onInsertCode(textBlock);
    }
  };

  return (
    <div id="ai-copilot-card" className="bg-[#1a1a1e] border border-white/5 rounded overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Title */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141417] border-b border-white/5 shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse animate-duration-1000" />
          <span className="font-mono text-xs font-semibold text-slate-200 tracking-tight select-none uppercase">
            {apiProvider === "openrouter" ? "OpenRouter Copilot" : "Gemini Copilot v3"}
          </span>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setShowSettings(!showSettings)}
            title="Model & API Calibration Setup"
            className={`p-1 rounded cursor-pointer transition-colors ${
              showSettings ? "text-cyan-400 bg-white/5" : "text-slate-500 hover:text-slate-200"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMessages([messages[0]])}
            title="Clear Chat Logs"
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded hover:bg-[#0d0d0f] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Collapse AI Panel"
              className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-[#0d0d0f] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Retractable Settings Drawer */}
      {showSettings && (
        <div className="bg-[#141417] border-b border-white/5 p-3 space-y-2.5 font-mono text-[10px] text-slate-300 animate-in slide-in-from-top duration-200 select-none">
          <div className="flex justify-between items-center border-b border-white/5 pb-1 select-none">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              🛠️ LLM Calibration Console
            </span>
            <span className="text-[7.5px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/10 px-1 rounded uppercase tracking-wider">
              180-Token Cap Enabled for Standard/Free
            </span>
          </div>

          {/* Provider Toggle Buttons */}
          <div className="space-y-0.5">
            <label className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">Service Provider</label>
            <div className="flex bg-[#0d0d0f] p-0.5 rounded border border-white/5 gap-0.5">
              <button
                type="button"
                onClick={() => handleProviderChange("gemini")}
                className={`flex-1 py-1 rounded text-[9.5px] text-center font-bold tracking-tight block transition-all uppercase cursor-pointer ${
                  apiProvider === "gemini" ? "bg-blue-600/95 text-white" : "text-slate-500 hover:text-slate-200"
                }`}
              >
                Gemini (Standard)
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange("openrouter")}
                className={`flex-1 py-1 rounded text-[9.5px] text-center font-bold tracking-tight block transition-all uppercase cursor-pointer ${
                  apiProvider === "openrouter" ? "bg-purple-650/95 text-white" : "text-slate-500 hover:text-slate-200"
                }`}
              >
                OpenRouter (Free Tiers)
              </button>
            </div>
          </div>

          {/* Model Selection Dropdown */}
          <div className="space-y-0.5">
            <label className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">Active Model Variant</label>
            <select
              value={selectedModel}
              onChange={(e) => {
                setSelectedModel(e.target.value);
                saveSetting("robot_ai_model", e.target.value);
              }}
              className="w-full bg-[#0d0d0f] border border-white/5 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-blue-500/30 cursor-pointer text-ellipsis overflow-hidden"
            >
              {apiProvider === "gemini" ? (
                <>
                  <option value="gemini-3.5-flash">gemini-3.5-flash (Fast & Accurate - Default)</option>
                  <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Cost Efficient)</option>
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Standard)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Creative Reasoning)</option>
                </>
              ) : (
                <>
                  <option value="openrouter/free">openrouter/free (Auto-Free Model Routing - Recommended)</option>
                  <option value="google/gemini-2.5-flash">google/gemini-2.5-flash (Gemini 2.5 Flash)</option>
                  <option value="google/gemini-2.5-pro">google/gemini-2.5-pro (Gemini 2.5 Pro)</option>
                  <option value="deepseek/deepseek-r1">deepseek/deepseek-r1 (DeepSeek R1 Reasoning)</option>
                  <option value="meta-llama/llama-3-8b-instruct">meta-llama/llama-3-8b-instruct (Meta LLaMA 3)</option>
                  <option value="mistralai/mistral-7b-instruct">mistralai/mistral-7b-instruct (Mistral 7B)</option>
                </>
              )}
            </select>
            <div className="pt-1">
              <label className="text-[7.5px] font-bold uppercase tracking-wider text-slate-500 block">Or customize Model ID directly:</label>
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  saveSetting("robot_ai_model", e.target.value);
                }}
                placeholder={apiProvider === "gemini" ? "e.g. gemini-3.5-flash" : "e.g. openrouter/free"}
                className="w-full bg-[#0d0d0f] border border-white/5 rounded px-2 py-0.5 mt-0.5 text-[9px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/30 select-text font-mono"
              />
            </div>
          </div>

          {/* Custom API Key input */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center text-[8px] block">
              <label className="font-bold uppercase tracking-wider text-slate-500">
                {apiProvider === "gemini" ? "Custom Gemini API Key" : "Custom OpenRouter Secret Bearer"}
              </label>
              {(apiProvider === "gemini" ? geminiKey : openrouterKey) ? (
                <span className="text-emerald-400 font-bold text-[7.5px] tracking-wider uppercase">● Local Access Key Mounted</span>
              ) : (
                <span className="text-amber-500 font-bold text-[7.5px] tracking-wider uppercase">○ Using Server Fallback</span>
              )}
            </div>
            <input
              type="password"
              value={apiProvider === "gemini" ? geminiKey : openrouterKey}
              onChange={(e) => {
                const val = e.target.value;
                if (apiProvider === "gemini") {
                  setGeminiKey(val);
                  saveSetting("robot_ai_gemini_key", val);
                } else {
                  setOpenrouterKey(val);
                  saveSetting("robot_ai_openrouter_key", val);
                }
              }}
              placeholder={
                apiProvider === "gemini"
                  ? "Leave blank to fallback to server GEMINI_API_KEY..."
                  : "Enter OpenRouter Key starting with sk-or-..."
              }
              className="w-full bg-[#0d0d0f] border border-white/5 rounded px-2 py-1 text-[9.5px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/30 select-text"
            />
          </div>
        </div>
      )}

      {/* Messages layout */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#0d0d0f]">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col space-y-1 p-2.5 rounded border max-w-[94%] ${
              m.role === "user"
                ? "bg-blue-600/10 border-blue-500/20 self-end ml-auto text-blue-100"
                : m.role === "assistant"
                ? "bg-[#141417]/80 border-white/5 self-start mr-auto text-slate-300"
                : ""
            }`}
          >
            <div className="flex items-center space-x-1">
              <span className="text-[8px] font-mono tracking-wider font-semibold uppercase opacity-45">
                {m.role === "user" ? "USER" : "CO-PILOT"}
              </span>
            </div>

            {/* Markdown styling container */}
            <div className="markdown-body text-[11px] font-sans leading-relaxed tracking-normal antialiased space-y-1.5 select-text prose prose-invert prose-xs">
              <Markdown>{m.text}</Markdown>
            </div>

            {/* Smart Insertion Tool */}
            {m.role === "assistant" && m.text.includes("```") && (
              <button
                onClick={() => handleAutoInsert(m.text)}
                className="mt-2 self-start inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-500 text-[10px] font-mono border border-blue-700 transition-colors cursor-pointer"
              >
                <Code2 className="w-3 h-3" />
                <span>Inject Code</span>
              </button>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 p-2 bg-slate-900/40 border border-white/5 rounded self-start mr-auto max-w-[85%]">
            <Cpu className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-[10px] font-mono text-slate-400 animate-pulse font-medium">Co-pilot computing kinematic trajectory...</span>
          </div>
        )}

        {errorText && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded flex items-start space-x-2 text-rose-300 text-[11px] font-mono">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-rose-200">System Pipeline Issue:</p>
              <p>{errorText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Board-specific automation Tasks */}
      <div className="px-3 py-2 bg-[#141417] border-t border-white/5 space-y-2 shrink-0">
        <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
          💡 Trajectory Automation ({activeBoard.category})
        </div>
        <div className="flex flex-wrap gap-1">
          {activePrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(p.prompt)}
              className="text-[9px] font-mono bg-[#0d0d0f] border border-white/5 text-slate-400 hover:text-white hover:bg-white/5 px-2 py-0.5 rounded transition-colors text-left truncate max-w-full cursor-pointer"
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => handleSendMessage(`Analyze current program trajectory: ${currentCode}`)}
            className="text-[9px] font-mono bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:text-white hover:bg-blue-600/20 px-2 py-0.5 rounded transition-colors text-left cursor-pointer font-semibold"
          >
            🔍 Analyze Program
          </button>
        </div>
      </div>

      {/* Keyboard Input wrapper */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center p-2 bg-[#0d0d0f] border-t border-white/5 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Instruct AI on ${activeBoard.name}...`}
          className="flex-1 bg-[#141417] border border-white/5 text-slate-200 rounded px-2.5 py-1 text-[11px] font-mono focus:outline-none focus:border-blue-500/50 placeholder-slate-600"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="ml-1.5 px-2.5 py-1.5 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 rounded transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
