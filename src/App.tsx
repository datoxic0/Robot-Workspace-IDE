import React, { useState, useEffect } from "react";
import { 
  BoardConfig, 
  ProgramLanguageConfig, 
  WorkspaceFile, 
  SimulationState, 
  TerminalLog, 
  RobotJoint,
  RobotDesignConfig,
  CIMWorkpiece,
  CIMSortingStats
} from "./types";
import { BOARDS, LANGUAGES, DEFAULT_FILES, INITIAL_JOINTS } from "./data/templates";
import CimWorkspaceVisualizer from "./components/CimWorkspaceVisualizer";
import RobotWorkspaceIDE from "./components/RobotWorkspaceIDE";
import RightControlPanel from "./components/RightControlPanel";
import ResizableModal from "./components/ResizableModal";
import VisionSandbox from "./components/VisionSandbox";
import DigitalTwinStudio from "./components/DigitalTwinStudio";
import { 
  Cpu, 
  Wrench, 
  Activity, 
  Workflow, 
  FileCode, 
  Layers, 
  Play, 
  Box, 
  Scale, 
  Compass, 
  HelpCircle,
  Lightbulb,
  Settings,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Code2,
  Minimize2
} from "lucide-react";

export default function App() {
  // Active hardware setups
  const [activeBoard, setActiveBoard] = useState<BoardConfig>(BOARDS[0]);
  const [activeLanguage, setActiveLanguage] = useState<ProgramLanguageConfig>(
    LANGUAGES.find((l) => l.id === activeBoard.defaultLanguage) || LANGUAGES[0]
  );

  // File explorer documents state
  const [files, setFiles] = useState<WorkspaceFile[]>(DEFAULT_FILES[activeBoard.id] || []);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  // Base mechanical design boundaries (parametric robot design!)
  const [robotDesign, setRobotDesign] = useState<RobotDesignConfig>({
    baseWidth: 60,
    shoulderLength: 110,
    elbowLength: 100,
    wristLength: 60,
    endEffectorType: "gripper",
    payloadWeight: 1.8, // kg
    category: "industrial",
    visionSensorType: "lidar_2d",
    visionRange: 180,
    visionAngle: 90,
    chassisType: "fixed_base",
    hasAIVisionModel: true,
    batteryCapacity: 450,
    speedLimit: 1.5
  });

  // Dynamic live joints coordinate values (including joint length binding based on design configs!)
  const [joints, setJoints] = useState<RobotJoint[]>(INITIAL_JOINTS);

  // Synchronize joint length segments with active parametric Robot Design configurations!
  useEffect(() => {
    setJoints((prev) => 
      prev.map((joint) => {
        if (joint.id === "shoulder") return { ...joint, length: robotDesign.shoulderLength };
        if (joint.id === "elbow") return { ...joint, length: robotDesign.elbowLength };
        if (joint.id === "wrist") return { ...joint, length: robotDesign.wristLength };
        return joint;
      })
    );
  }, [robotDesign.shoulderLength, robotDesign.elbowLength, robotDesign.wristLength]);

  // Interactive workpiece elements flowing on the conveyor line
  const [workpieces, setWorkpieces] = useState<CIMWorkpiece[]>([
    { id: "wp1", color: "red", positionX: -20, status: "approaching" }
  ]);

  // Dynamic sorting metrics statistics state
  const [sortingStats, setSortingStats] = useState<CIMSortingStats>({
    scannedRed: 1,
    scannedGreen: 0,
    scannedBlue: 0,
    scannedYellow: 0,
    correctRed: 0,
    correctGreen: 0,
    correctBlue: 0,
    correctYellow: 0,
    incorrect: 0,
    dropped: 0
  });

  // Current material flow spawning mode
  const [feedMode, setFeedMode] = useState<"random" | "red" | "green" | "blue" | "yellow">("random");

  // Advanced CAD designer and simulator states (SCARA & Cartesian robot designer and workspace factory simulator)
  const [robotType, setRobotType] = useState<"articulated" | "scara" | "cartesian">("articulated");
  const [conveyorSpeed, setConveyorSpeed] = useState<number>(2); // Horizontal conveyor speed multiplier
  const [obstacleHeight, setObstacleHeight] = useState<number>(0); // Obstacle barrier collision height (pixels) (0 = deactivated)
  const [sensorPositionX, setSensorPositionX] = useState<number>(125); // Color scanner offset location (80 - 220 pixels)
  const [selectedDesignTab, setSelectedDesignTab] = useState<"robot-designer" | "workspace-config" | "vision-sandbox" | "system-status">("robot-designer");
  const [activeMainTab, setActiveMainTab] = useState<"visualizer" | "ide" | "ai" | "digital-twin">("visualizer");
  const [designControlsExpanded, setDesignControlsExpanded] = useState<boolean>(true);

  // High density retractable panel layout states
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [ideCollapsed, setIdeCollapsed] = useState<boolean>(false);
  const [isCimModalOpen, setIsCimModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Serial Console simulation terminal logs logger
  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: "init",
      type: "success",
      text: "CIM Robotics IDE Framework booted successfully. System diagnostics check: ALL CHANNELS OPERATIONAL.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  // Primary Workspace simulator state
  const [simulationState, setSimulationState] = useState<SimulationState>({
    isRunning: false,
    isCompiled: false,
    currentLine: 0,
    conveyorRunning: false,
    blockPosition: 0,
    hasBlock: false,
    status: "idle",
    simulationSpeed: 1,
    dryRunMode: false,
    profilingEnabled: true
  });

  // Handle active boards selector shifting: auto-load projects file templates library lists
  const handleBoardShift = (boardId: string) => {
    const targetBoard = BOARDS.find((b) => b.id === boardId);
    if (!targetBoard) return;
    
    // Halt any active runs first
    setSimulationState((prev) => ({ 
      ...prev, 
      isRunning: false, 
      status: "idle",
      conveyorRunning: false,
      hasBlock: false
    }));

    setActiveBoard(targetBoard);

    const targetLang = LANGUAGES.find((l) => l.id === targetBoard.defaultLanguage) || LANGUAGES[0];
    setActiveLanguage(targetLang);

    const targetTemplates = DEFAULT_FILES[targetBoard.id] || [];
    setFiles(targetTemplates);
    setActiveFileIndex(0);

    // Refresh base joints state angles back to default calibration position
    setJoints(INITIAL_JOINTS.map(j => ({ ...j })));

    // Inject system serial diagnostic log
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type: "info",
        text: `Switched target device board context to: ${targetBoard.name}. Ready for compiler sequence.`,
        timestamp
      }
    ]);
  };

  // Synchronize inline code adjustments
  const handleFileContentChange = (newContent: string) => {
    setFiles((prev) => 
      prev.map((file, i) => (i === activeFileIndex ? { ...file, content: newContent } : file))
    );
  };

  const handleInsertCodeFromAI = (code: string) => {
    handleFileContentChange(code);
    
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type: "success",
        text: "Injected customized firmware code generated by Gemini into workspace editor successfully.",
        timestamp
      }
    ]);
  };

  // Dynamic layout column adjustments
  const [leftWidth, setLeftWidth] = useState<number>(38); // default width percentage for simulation visualizer
  const [rightWidth, setRightWidth] = useState<number>(26); // default width percentage for AI copilot panel
  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== "undefined" ? window.innerWidth : 1200);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const mainRef = React.useRef<HTMLDivElement>(null);
  const isResizingLeftRef = React.useRef<boolean>(false);
  const isResizingRightRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    const handleWinResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleWinResize);
    return () => window.removeEventListener("resize", handleWinResize);
  }, []);

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingLeftRef.current = true;
    setIsResizing(true);
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeUp);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRightRef.current = true;
    setIsResizing(true);
    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeUp);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!mainRef.current) return;
    const rect = mainRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    if (containerWidth <= 0) return;

    if (isResizingLeftRef.current) {
      const clientXInsideMain = e.clientX - rect.left;
      let newLeftPct = (clientXInsideMain / containerWidth) * 100;
      newLeftPct = Math.max(15, Math.min(55, newLeftPct));
      setLeftWidth(newLeftPct);
    } else if (isResizingRightRef.current) {
      const clientXFromRightInsideMain = rect.right - e.clientX;
      let newRightPct = (clientXFromRightInsideMain / containerWidth) * 100;
      newRightPct = Math.max(15, Math.min(45, newRightPct));
      setRightWidth(newRightPct);
    }
  };

  const handleResizeUp = () => {
    isResizingLeftRef.current = false;
    isResizingRightRef.current = false;
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResizeMove);
    document.removeEventListener("mouseup", handleResizeUp);
  };

  // Dynamic collapse handlers to maintain layout balance and keep screen fully utilized
  const handleLeftCollapse = () => {
    setLeftCollapsed(true);
    if (ideCollapsed && rightCollapsed) {
      setIdeCollapsed(false);
    }
  };

  const handleIdeCollapse = () => {
    setIdeCollapsed(true);
    if (leftCollapsed && rightCollapsed) {
      setLeftCollapsed(false);
    }
  };

  const handleRightCollapse = () => {
    setRightCollapsed(true);
    if (leftCollapsed && ideCollapsed) {
      setIdeCollapsed(false);
    }
  };

  // Determine dynamically adjusted column styles to prevent empty space on retraction/collapse
  let leftStyle: React.CSSProperties | undefined = undefined;
  let rightStyle: React.CSSProperties | undefined = undefined;
  const leftIsFlex1 = !leftCollapsed && (ideCollapsed && rightCollapsed);
  const rightIsFlex1 = !rightCollapsed && (ideCollapsed && leftCollapsed);

  if (windowWidth >= 1280) {
    if (!leftCollapsed) {
      if (ideCollapsed && rightCollapsed) {
        leftStyle = undefined;
      } else if (ideCollapsed && !rightCollapsed) {
        const total = leftWidth + rightWidth;
        const scale = total > 0 ? 100 / total : 1;
        leftStyle = { width: `calc(${leftWidth * scale}% - 24px)` };
      } else {
        leftStyle = { width: `${leftWidth}%` };
      }
    }

    if (!rightCollapsed) {
      if (ideCollapsed && leftCollapsed) {
        rightStyle = undefined;
      } else if (ideCollapsed && !leftCollapsed) {
        const total = leftWidth + rightWidth;
        const scale = total > 0 ? 100 / total : 1;
        rightStyle = { width: `calc(${rightWidth * scale}% - 24px)` };
      } else {
        rightStyle = { width: `${rightWidth}%` };
      }
    }
  }

  const transitionClass = isResizing ? "" : "transition-all duration-300 ease-in-out";

  return (
    <div className="h-screen bg-[#0d0d0f] text-slate-350 flex flex-col antialiased overflow-hidden">
      
      {/* 1. High Density Workspace Header */}
      <header className="h-12 bg-[#1a1a1e] border-b border-white/5 flex items-center justify-between px-4 shrink-0 shadow-md">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center shadow-lg">
              <div className="w-3 h-3 bg-white rotate-45"></div>
            </div>
            <span className="font-bold text-white tracking-tight text-sm">
              VoltLogic<span className="text-blue-500">PRO</span>
            </span>
          </div>
          <nav className="hidden md:flex space-x-2 text-[10px] font-mono uppercase tracking-wider items-center select-none">
            <button
              onClick={() => setActiveMainTab("visualizer")}
              className={`px-3 py-1 rounded transition-all cursor-pointer ${
                activeMainTab !== "digital-twin"
                  ? "bg-blue-600/20 border border-blue-500/40 text-blue-400 font-extrabold shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🛠️ Physical CIM Workspace
            </button>
            <button
              onClick={() => setActiveMainTab("digital-twin")}
              className={`px-3 py-1 rounded flex items-center transition-all cursor-pointer ${
                activeMainTab === "digital-twin"
                  ? "bg-teal-650/20 border border-teal-500/40 text-teal-300 font-extrabold shadow-md shadow-teal-500/10"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Workflow className="w-3.5 h-3.5 mr-1 text-teal-400" />
              🌐 Digital Twin CAD Console
            </button>
          </nav>
        </div>

        {/* Global Connection/Microcontroller selectors */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs">
            <span className="text-[9px] text-slate-500 font-mono font-bold uppercase">TARGET:</span>
            <select
              value={activeBoard.id}
              onChange={(e) => handleBoardShift(e.target.value)}
              className="bg-transparent border-none text-slate-300 focus:outline-none cursor-pointer font-semibold font-mono text-[11px] p-0"
            >
              {BOARDS.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#1a1a1e] text-slate-300">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 bg-black/40 border border-white/10 rounded px-2.5 py-1 text-[10px] font-mono text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            <span>{activeLanguage.name}</span>
          </div>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center justify-center p-1.5 bg-[#1e1e24] hover:bg-[#2e2e38] text-slate-350 hover:text-white border border-white/10 rounded transition-all cursor-pointer"
            title="Dedicated Settings & Preferences Panel"
          >
            <Settings className="w-4 h-4 text-slate-400 hover:text-blue-400 animate-spin-slow" />
          </button>
        </div>
      </header>

      {/* 2. Responsive Workspace View-Tab Switcher (Only visible below xl) */}
      <div className="xl:hidden flex bg-[#141417]/90 backdrop-blur border-b border-white/5 p-1 px-3 shrink-0 overflow-x-auto scrollbar-none gap-1">
        <button
          onClick={() => setActiveMainTab("visualizer")}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeMainTab === "visualizer"
              ? "bg-blue-600 text-white font-bold shadow-md"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>1. Simulation</span>
        </button>
        <button
          onClick={() => setActiveMainTab("ide")}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeMainTab === "ide"
              ? "bg-blue-600 text-white font-bold shadow-md"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>2. Code IDE</span>
        </button>
        <button
          onClick={() => setActiveMainTab("ai")}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeMainTab === "ai"
              ? "bg-blue-600 text-white font-bold shadow-md"
              : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>3. AI Copilot</span>
        </button>
        <button
          onClick={() => setActiveMainTab("digital-twin")}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            activeMainTab === "digital-twin"
              ? "bg-teal-650 text-white font-bold shadow-md"
              : "text-slate-400 hover:text-slate-300 hover:bg-white/5"
          }`}
        >
          <Workflow className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
          <span>4. Twin CAD</span>
        </button>
      </div>

      {/* 3. Main Interactive Dashboard Column Grid */}
      {activeMainTab === "digital-twin" ? (
        <div className="flex-1 p-3 flex flex-col min-h-0 overflow-hidden select-none">
          <div className="flex-1 bg-[#101014] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <DigitalTwinStudio robotDesign={robotDesign} setRobotDesign={setRobotDesign} />
          </div>
        </div>
      ) : (
        <main 
          ref={mainRef}
          className="flex-1 p-3 flex flex-col xl:flex-row gap-3 min-h-0 overflow-hidden relative select-none"
        >
        
        {/* Left Column: Mechanical Kinematics Visualizer (Custom-Retractable & Resizable) */}
        <div 
          style={leftStyle}
          className={`${leftCollapsed ? "xl:w-12 shrink-0 md:flex" : (leftIsFlex1 ? "flex-1 flex-col" : "flex-col")} h-full min-h-0 ${activeMainTab === "visualizer" ? "flex" : "hidden"} xl:flex ${transitionClass}`}
        >
          {leftCollapsed ? (
            <div className="h-full bg-[#141417] border border-white/5 rounded flex flex-col items-center py-4 space-y-4 shadow-xl shrink-0 w-12">
              <button
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 hover:bg-white/10 rounded text-blue-400 hover:text-white cursor-pointer transition-colors"
                title="Expand Workspace Simulator"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none [writing-mode:vertical-lr] rotate-180 flex items-center gap-2">
                  <Workflow className="w-3.5 h-3.5 rotate-90 text-blue-500" />
                  WORKSPACE SIMULATOR
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <CimWorkspaceVisualizer
                joints={joints}
                setJoints={setJoints}
                simulationState={simulationState}
                setSimulationState={setSimulationState}
                workpieces={workpieces}
                setWorkpieces={setWorkpieces}
                robotDesign={robotDesign}
                sortingStats={sortingStats}
                setSortingStats={setSortingStats}
                feedMode={feedMode}
                setFeedMode={setFeedMode}
                robotType={robotType}
                setRobotType={setRobotType}
                conveyorSpeed={conveyorSpeed}
                setConveyorSpeed={setConveyorSpeed}
                obstacleHeight={obstacleHeight}
                setObstacleHeight={setObstacleHeight}
                sensorPositionX={sensorPositionX}
                setSensorPositionX={setSensorPositionX}
                activeFile={files[activeFileIndex]}
                onFileChange={handleFileContentChange}
                setLogs={setLogs}
                onCollapse={handleLeftCollapse}
              />
            </div>
          )}
        </div>

        {/* Dynamic vertical resizer drag handle between Left & Center */}
        {!leftCollapsed && windowWidth >= 1280 && (
          <div
            onMouseDown={startResizeLeft}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-600/30 cursor-col-resize shrink-0 transition-all duration-150 relative group"
            title="Drag to resize simulation and ide panels"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/5 group-hover:bg-blue-500/50 transition-colors pointer-events-none" />
          </div>
        )}
 
        {/* Middle Column: Hardware Code IDE (Fills remaining container space) */}
        <div className={`${ideCollapsed ? "xl:w-12 shrink-0 md:flex" : "flex-1 flex-col"} h-full min-h-0 min-w-0 ${activeMainTab === "ide" ? "flex" : "hidden"} xl:flex ${transitionClass}`}>
          {ideCollapsed ? (
            <div className="h-full bg-[#141417] border border-white/5 rounded flex flex-col items-center py-4 space-y-4 shadow-xl shrink-0 w-12">
              <button
                onClick={() => setIdeCollapsed(false)}
                className="p-2 bg-purple-600/15 hover:bg-purple-600/35 border border-purple-500/30 rounded-full cursor-pointer transition-all duration-305 hover:scale-110 flex items-center justify-center shadow"
                title="Expand Code IDE Workspace"
                id="expand-ide-btn"
              >
                <Code2 className="w-5 h-5 text-purple-400" />
              </button>
              <div className="flex-1 py-12 flex items-center justify-center">
                <span className="text-[9px] font-black font-mono tracking-widest text-[#a855f7] uppercase select-none [writing-mode:vertical-lr] rotate-180 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400 rotate-90" />
                  CODE IDE WORKSPACE
                </span>
              </div>
            </div>
          ) : (
            <RobotWorkspaceIDE
              activeBoard={activeBoard}
              setActiveBoard={setActiveBoard}
              activeLanguage={activeLanguage}
              setActiveLanguage={setActiveLanguage}
              files={files}
              setFiles={setFiles}
              activeFileIndex={activeFileIndex}
              setActiveFileIndex={setActiveFileIndex}
              simulationState={simulationState}
              setSimulationState={setSimulationState}
              joints={joints}
              setJoints={setJoints}
              workpieces={workpieces}
              setWorkpieces={setWorkpieces}
              logs={logs}
              setLogs={setLogs}
              onFileChange={handleFileContentChange}
              sortingStats={sortingStats}
              setSortingStats={setSortingStats}
              feedMode={feedMode}
              robotType={robotType}
              conveyorSpeed={conveyorSpeed}
              obstacleHeight={obstacleHeight}
              sensorPositionX={sensorPositionX}
              onCollapse={handleIdeCollapse}
            />
          )}
        </div>

        {/* Dynamic vertical resizer drag handle between Center & Right */}
        {!rightCollapsed && windowWidth >= 1280 && (
          <div
            onMouseDown={startResizeRight}
            className="w-1.5 hover:w-2 bg-transparent hover:bg-[#38bdf8]/30 cursor-col-resize shrink-0 transition-all duration-150 relative group"
            title="Drag to resize ide and copilot panels"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white/5 group-hover:bg-cyan-500/50 transition-colors pointer-events-none" />
          </div>
        )}
 
        {/* Right Column: AI Robotic Assistant Chat (Custom-Retractable & Resizable) */}
        <div 
          style={rightStyle}
          className={`${rightCollapsed ? "xl:w-12 shrink-0 md:flex" : (rightIsFlex1 ? "flex-1 flex-col" : "flex-col")} h-full min-h-0 ${activeMainTab === "ai" ? "flex" : "hidden"} xl:flex ${transitionClass}`}
        >
          {rightCollapsed ? (
            <div className="h-full bg-[#141417] border border-white/5 rounded flex flex-col items-center py-4 space-y-4 shadow-xl shrink-0 w-12">
              <button
                onClick={() => setRightCollapsed(false)}
                className="p-1.5 hover:bg-white/10 rounded text-blue-400 hover:text-white cursor-pointer transition-colors"
                title="Expand AI Assistant Panel"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <span className="font-mono text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none [writing-mode:vertical-lr] rotate-180 flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 rotate-90 text-cyan-400 animate-pulse" />
                  GEMINI AI COPILOT
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <RightControlPanel
                activeBoard={activeBoard}
                activeLanguage={activeLanguage}
                currentCode={files[activeFileIndex]?.content || ""}
                onInsertCode={handleInsertCodeFromAI}
                onCollapse={handleRightCollapse}
                joints={joints}
                setJoints={setJoints}
                robotDesign={robotDesign}
                robotType={robotType}
                simulationState={simulationState}
                setSimulationState={setSimulationState}
                sortingStats={sortingStats}
                setSortingStats={setSortingStats}
                feedMode={feedMode}
                setFeedMode={setFeedMode}
                activeFile={files[activeFileIndex]}
                onFileChange={(newContent) => {
                  setFiles((prev) =>
                    prev.map((f, i) =>
                      i === activeFileIndex ? { ...f, content: newContent } : f
                    )
                  );
                }}
              />
            </div>
          )}
        </div>
      </main>
      )}

      {/* 3. Mechanical Robot DESIGN Studio Panel */}
      <footer className="bg-[#141417] border-t border-white/5 px-4 py-2 shrink-0">
        <div id="mechanical-design-studio" className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-3.5 h-3.5 text-purple-405" />
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-205">
              INDUSTRIAL CIM DESIGN & VIRTUAL SIMULATION STUDIO
            </h3>
          </div>
          <button
            onClick={() => setIsCimModalOpen(true)}
            className="ml-3 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 hover:border-purple-400/50 rounded font-mono text-[9px] font-bold tracking-wider text-purple-300 hover:text-white transition-all cursor-pointer shrink-0"
            id="expand-settings-modal-btn"
          >
            🎛️ OPEN STUDIO SETTINGS
          </button>
        </div>
      </footer>

      {/* 3.1. Dedicated INDUSTRIAL CIM DESIGN & VIRTUAL SIMULATION STUDIO Resizable Modal */}
      {isCimModalOpen && (
        <ResizableModal
          isOpen={isCimModalOpen}
          title="INDUSTRIAL CIM DESIGN & VIRTUAL SIMULATION STUDIO"
          onClose={() => setIsCimModalOpen(false)}
          defaultWidth={960}
          defaultHeight={550}
        >
          {/* Exact same Robot Design and Configuration layout inside the Modal with spacious styling! */}
          <div className="space-y-4 p-4 font-mono select-none bg-[#0e0e11] text-slate-100 min-h-full">
            <div className="flex space-x-2 bg-black/40 p-1.5 rounded-lg border border-white/5 select-none w-fit pb-1.5 mb-3">
              <button
                onClick={() => setSelectedDesignTab("robot-designer")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 font-mono text-[10px] uppercase rounded-md transition-all cursor-pointer ${
                  selectedDesignTab === "robot-designer"
                    ? "bg-purple-650 text-white font-bold shadow-md shadow-purple-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>1. Robot Designer</span>
              </button>
              
              <button
                onClick={() => setSelectedDesignTab("workspace-config")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 font-mono text-[10px] uppercase rounded-md transition-all cursor-pointer ${
                  selectedDesignTab === "workspace-config"
                    ? "bg-purple-650 text-white font-bold shadow-md shadow-purple-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5 text-purple-400" />
                <span>2. Factory Simulator</span>
              </button>

              <button
                onClick={() => setSelectedDesignTab("vision-sandbox")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 font-mono text-[10px] uppercase rounded-md transition-all cursor-pointer ${
                  selectedDesignTab === "vision-sandbox"
                    ? "bg-purple-650 text-white font-bold shadow-md shadow-purple-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>3. Vision Sandbox</span>
              </button>
              
              <button
                onClick={() => setSelectedDesignTab("system-status")}
                className={`flex items-center space-x-1.5 px-4 py-1.5 font-mono text-[10px] uppercase rounded-md transition-all cursor-pointer ${
                  selectedDesignTab === "system-status"
                    ? "bg-purple-650 text-white font-bold shadow-md shadow-purple-500/10"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span>4. System Telemetry</span>
              </button>
            </div>

            {/* Render selected design tabs layout inside the modal */}
            {selectedDesignTab === "robot-designer" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
                {/* Sector Preset & Kinematics Selector */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-4 shadow-lg flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div>
                      <div className="text-[10px] font-mono text-purple-300 font-extrabold uppercase tracking-wider mb-2">
                        1. Select Sector/Vibe Preset
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: "industrial", label: "IND", name: "Industrial", desc: "Factory heavy duty work", payload: 1.8, range: 180, angles: 90 },
                          { id: "corporate", label: "COR", name: "Corporate", desc: "Security & hospitality", payload: 3.2, range: 220, angles: 110 },
                          { id: "domestic", label: "DOM", name: "Domestic", desc: "Household task companion", payload: 0.8, range: 140, angles: 120 }
                        ].map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setRobotDesign(prev => ({
                              ...prev,
                              category: cat.id as any,
                              payloadWeight: cat.payload,
                              visionRange: cat.range,
                              visionAngle: cat.angles,
                              visionSensorType: cat.id === "industrial" ? "lidar_2d" : cat.id === "corporate" ? "depth_camera_3d" : "stereoscopic_vision"
                            }))}
                            className={`px-1.5 py-2.5 rounded-lg border text-center transition-all cursor-pointer ${
                              (robotDesign.category || "industrial") === cat.id
                                ? "bg-purple-650/20 border-purple-500 text-purple-300 font-bold shadow-md shadow-purple-500/10"
                                : "bg-[#0d0d0f]/60 border-white/5 text-slate-400 hover:bg-[#1a1a24]"
                            }`}
                          >
                            <div className="text-[10px] font-extrabold tracking-wide">{cat.label}</div>
                            <div className="text-[7.5px] text-slate-500 mt-1 uppercase truncate font-mono">{cat.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3">
                      <div className="text-[10px] font-mono text-purple-300 font-extrabold uppercase tracking-wider mb-2">
                        2. Select Kinematics Class
                      </div>
                      <div className="space-y-1.5">
                        {[
                          { id: "articulated", name: "Articulated 4-DOF", desc: "Rotational joint chains" },
                          { id: "scara", name: "SCARA Pro Planar", desc: "Parallel axis picking arm" },
                          { id: "cartesian", name: "Cartesian Gantry", desc: "Linear rail coordinate gantry" }
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setRobotType(type.id as any)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                              robotType === type.id
                                ? "bg-purple-600/20 border-purple-500 text-purple-300 font-bold"
                                : "bg-[#0d0d0f] border-white/5 text-slate-400 hover:bg-[#1c1c24]"
                            }`}
                          >
                            <div className="text-[10px] font-mono font-bold leading-none">{type.name}</div>
                            <p className="text-[7.5px] text-slate-500 font-mono mt-1">{type.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-[7.5px] text-slate-550 font-mono uppercase bg-black/30 p-1.5 border border-white/5 rounded text-center">
                    Sector: {(robotDesign.category || "industrial").toUpperCase()}
                  </div>
                </div>

                {/* Physical link scales */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-extrabold uppercase tracking-wider flex justify-between pb-1 border-b border-white/5">
                    <span>Joint Link Lengths</span>
                    <span className="text-purple-400 font-bold">CAD Scales</span>
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-mono animate-fade-in">
                      <span className="text-slate-400">Shoulder J1 Length:</span>
                      <span className="text-purple-300 font-bold">{robotDesign.shoulderLength} mm</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="150"
                      value={robotDesign.shoulderLength}
                      onChange={(e) => setRobotDesign((prev) => ({ ...prev, shoulderLength: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-400">Elbow J2 Length:</span>
                      <span className="text-purple-300 font-bold">{robotDesign.elbowLength} mm</span>
                    </div>
                    <input
                      type="range"
                      min="70"
                      max="140"
                      value={robotDesign.elbowLength}
                      onChange={(e) => setRobotDesign((prev) => ({ ...prev, elbowLength: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-400">Wrist J3 Length:</span>
                      <span className="text-purple-300 font-bold">{robotDesign.wristLength} mm</span>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="90"
                      value={robotDesign.wristLength}
                      onChange={(e) => setRobotDesign((prev) => ({ ...prev, wristLength: parseInt(e.target.value) }))}
                      className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </div>

                {/* End Effectors list */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-extrabold uppercase tracking-wider pb-1 border-b border-white/5">
                    End Effector Head Tool
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-1.5">
                    {[
                      { id: "gripper", name: "Pneumatic Grabber Claw" },
                      { id: "suction", name: "Vacuum Suction Pad" },
                      { id: "welder", name: "CO2 Electric Spot Welder" }
                    ].map((tool) => (
                      <label
                        key={tool.id}
                        className={`flex items-center px-3 py-2 border rounded-lg text-[10px] font-mono cursor-pointer transition-colors ${
                          robotDesign.endEffectorType === tool.id 
                            ? "bg-purple-500/20 border-purple-500 text-purple-300 font-bold" 
                            : "bg-[#141417]/40 border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="endEffectorType"
                          value={tool.id}
                          checked={robotDesign.endEffectorType === tool.id}
                          onChange={() => setRobotDesign((prev) => ({ ...prev, endEffectorType: tool.id as any }))}
                          className="mr-2.5 h-3.5 w-3.5 accent-purple-500"
                        />
                        {tool.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Advanced Propulsion & Electronics Diagnostics */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-mono font-bold border-b border-white/5 pb-1">
                      <span>3. Propulsion & Electronics</span>
                      <span className="text-teal-400 font-bold uppercase">{robotDesign.chassisType || "fixed_base"}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[8px] font-mono uppercase text-slate-500">Chassis Assembly</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "fixed_base", label: "Fixed" },
                          { id: "wheeled", label: "Wheeled" },
                          { id: "quadruped", label: "Quad" }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => setRobotDesign(prev => ({ ...prev, chassisType: type.id as any }))}
                            className={`py-1 text-[8.5px] font-mono border rounded transition-all cursor-pointer ${
                              (robotDesign.chassisType || "fixed_base") === type.id
                                ? "bg-teal-950/30 border-teal-500 text-teal-300 font-bold"
                                : "bg-black/40 border-white/5 text-slate-400 hover:bg-[#1a1a24]"
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono">
                        <span className="text-slate-500">Battery capacity (Power):</span>
                        <span className="text-teal-300 font-bold">{robotDesign.batteryCapacity || 450} Wh</span>
                      </div>
                      <input
                        type="range"
                        min="100"
                        max="1500"
                        step="50"
                        value={robotDesign.batteryCapacity || 450}
                        onChange={(e) => setRobotDesign(prev => ({ ...prev, batteryCapacity: parseInt(e.target.value) }))}
                        className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono">
                        <span className="text-slate-500">Speed Limit:</span>
                        <span className="text-teal-300 font-bold">{(robotDesign.speedLimit || 1.5).toFixed(1)} m/s</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.5"
                        value={robotDesign.speedLimit || 1.5}
                        onChange={(e) => setRobotDesign(prev => ({ ...prev, speedLimit: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                      />
                    </div>

                    <div className="border-t border-white/5 pt-2 space-y-1">
                      <div className="text-[8px] font-mono uppercase text-slate-500">Active Sensor Node</div>
                      <select
                        value={robotDesign.visionSensorType || "lidar_2d"}
                        onChange={(e) => setRobotDesign(prev => ({ ...prev, visionSensorType: e.target.value as any }))}
                        className="w-full bg-[#0d0d0f] border border-white/5 text-slate-350 rounded p-1 text-[9px] font-mono focus:border-purple-500"
                      >
                        <option value="lidar_2d">LIDAR 2D Scanner</option>
                        <option value="depth_camera_3d">Depth Camera 3D</option>
                        <option value="stereoscopic_vision">Stereoscopic Optical Dual</option>
                        <option value="ultrasonic_array">Ultrasonic Sonar Array</option>
                      </select>
                    </div>

                    <div className="space-y-1 border-t border-white/5 pt-2">
                      <div className="flex justify-between text-[9px] font-mono font-bold">
                        <span className="text-slate-400">Payload Weight:</span>
                        <span className={robotDesign.payloadWeight > 3.5 ? "text-rose-400 font-bold animate-pulse" : "text-purple-300 font-semibold"}>
                          {robotDesign.payloadWeight} kg
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={robotDesign.payloadWeight}
                        onChange={(e) => setRobotDesign((prev) => ({ ...prev, payloadWeight: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                  <div className="text-[8px] font-mono text-slate-500 leading-none pt-2.5 border-t border-white/5 mt-3 text-center uppercase">
                    Kinematic Resolver: V2.4-DH
                  </div>
                </div>
              </div>
            )}

            {selectedDesignTab === "workspace-config" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
                {/* Conveyor factors */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                    Conveyor Belt Speed
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Linear Feed Rate:</span>
                      <span className="text-purple-300 font-semibold">{conveyorSpeed * 10} mm/s</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={conveyorSpeed}
                      onChange={(e) => setConveyorSpeed(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="text-[9px] text-slate-500 font-mono italic">
                      (Default is 20mm/s. High speeds stress the sensor sweep)
                    </div>
                  </div>
                </div>

                {/* Security Shield active obstacle barrier height */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                    Hazard Safety Shield (Obstacle)
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Containment Wall Height:</span>
                      <span className={obstacleHeight > 0 ? "text-amber-400 font-bold" : "text-slate-500"}>
                        {obstacleHeight > 0 ? `${obstacleHeight} pixels` : "DEACTIVATED"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="110"
                      step="10"
                      value={obstacleHeight}
                      onChange={(e) => setObstacleHeight(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="text-[9px] text-slate-500 font-mono italic leading-tight">
                      Adds a central protection barrier column. Arm paths MUST climb OVER it to avoid stress-halt crashes!
                    </div>
                  </div>
                </div>

                {/* Dynamic sensor location */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-3 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                    Photoelectric Laser Offset
                  </div>
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-400">IRSENS_01 Coord:</span>
                      <span className="text-purple-300 font-semibold">{sensorPositionX} px from base</span>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="220"
                      value={sensorPositionX}
                      onChange={(e) => setSensorPositionX(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="text-[9px] text-slate-500 font-mono italic leading-tight">
                      Set relative spacing of breakbeam detector. Slide left or right to simulate distinct assembly layouts.
                    </div>
                  </div>
                </div>

                {/* Seed generator flow control guidelines */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                  <div>
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5 mb-1 bg-black/20 p-2 rounded border border-white/5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                      <span>Layout Guideline</span>
                    </span>
                    <p className="text-[10px] font-mono text-slate-400 leading-normal">
                      Adjust speed first. Placing barriers enforces rigorous spatial path constraints on the robot arms! Excellent for collision avoidance validation scripts.
                    </p>
                  </div>
                  <div className="text-[9px] font-mono uppercase text-slate-500 leading-none mt-4">
                    Virtual Factory Cell #29A
                  </div>
                </div>
              </div>
            )}

            {selectedDesignTab === "vision-sandbox" && (
              <div className="animate-in fade-in duration-200">
                <VisionSandbox robotDesign={robotDesign} setRobotDesign={setRobotDesign} />
              </div>
            )}

            {selectedDesignTab === "system-status" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
                {/* Joint stress monitors */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-2 col-span-2 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-2">
                    Live Joint Motor Stress Analysis
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-slate-400 font-mono">J1 Turntable Base:</span>
                      <div className="flex justify-between font-mono text-[10px] text-slate-200">
                        <span>NEMA 23 standard</span>
                        <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-slate-400 font-mono">J2 Shoulder:</span>
                      <div className="flex justify-between font-mono text-[10px] text-slate-200">
                        <span>Max temp 42°C</span>
                        <span className="text-emerald-400 font-bold">SYS_HEALTHY</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-slate-400 font-mono">J3 Forearm Elbow:</span>
                      <div className="flex justify-between font-mono text-[10px] text-slate-200">
                        <span>Slip back: 0.02%</span>
                        <span className="text-purple-400 font-bold">CALIBRATED</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8.5px] text-slate-400 font-mono">Wrist Solenoid:</span>
                      <div className="flex justify-between font-mono text-[10px] text-slate-200">
                        <span>Pneu vac scale: 1.0</span>
                        <span className="text-emerald-400 font-bold">READY</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Kinematic solvers stats */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 space-y-2.5 shadow-lg">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
                    Inverse Kinematics (IK)
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Active Solver:</span>
                      <span className="text-teal-400 font-semibold">CCD Loop Optimizer</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy range:</span>
                      <span className="text-slate-200">±0.25mm bounds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Solve Interval:</span>
                      <span className="text-slate-200">&lt; 15 milliseconds</span>
                    </div>
                  </div>
                </div>

                {/* Technical indicators */}
                <div className="bg-[#16161c] border border-white/5 rounded-xl p-4 flex flex-col justify-between shadow-lg">
                  <div>
                    <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider mb-2">
                      System Clock Registers
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 leading-normal space-y-1">
                      <div>RTC: 2026-06-02T12:16:04Z</div>
                      <div>PLL: LOCKED (400 MHz)</div>
                      <div>ADC Channels: 0x4B3A8</div>
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-slate-600 uppercase pt-2.5 border-t border-white/5 mt-4">
                    Firmware version check OK
                  </div>
                </div>
              </div>
            )}
          </div>
        </ResizableModal>
      )}

      {/* 4. High Density absolute bottom details strip */}
      <footer className="h-6 bg-blue-600 text-white flex items-center px-4 text-[10px] shrink-0 font-mono">
        <div className="flex space-x-4 items-center">
          <div className="flex items-center space-x-1 font-bold">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>CORE STATUS: RESPONSIVE</span>
          </div>
          <span className="opacity-80">MCU_SPEED: Core Clock OK</span>
          <span className="opacity-80">UTF-8</span>
          <span className="opacity-80">VoltLogic Engines Loaded</span>
        </div>
        <div className="ml-auto flex items-center space-x-4">
          <span>v2.1.0-STABLE</span>
          <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
        </div>
      </footer>

      {/* 5. Dedicated Modal for Settings & Preferences */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-[#141417] border border-white/10 rounded-lg w-full max-w-2xl h-auto max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#1a1a1e]">
              <div className="flex items-center space-x-2 text-blue-400">
                <Settings className="w-4 h-4 text-blue-500 animate-spin-slow" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-slate-200">
                  SYSTEM CALIBRATION_SETTINGS & PREFERENCES
                </span>
              </div>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors text-xs font-mono font-bold"
              >
                [CLOSE]
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 text-xs font-mono">
              
              {/* Group A: Mechanical Kinematics */}
              <div className="space-y-4">
                <div className="font-bold text-blue-400 border-b border-white/5 pb-1 uppercase text-[10px] tracking-wider">
                  Phase A: Robot Kinematics & Mechanics
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Shoulder segment link (J1):</span>
                      <span className="text-blue-400">{robotDesign.shoulderLength} mm</span>
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={180}
                      step={5}
                      value={robotDesign.shoulderLength}
                      onChange={(e) => setRobotDesign(prev => ({ ...prev, shoulderLength: Number(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                    <span className="text-[9px] text-slate-600 block">Mechanical span for horizontal shoulder projection.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Elbow segment link (J2):</span>
                      <span className="text-blue-400">{robotDesign.elbowLength} mm</span>
                    </label>
                    <input
                      type="range"
                      min={60}
                      max={180}
                      step={5}
                      value={robotDesign.elbowLength}
                      onChange={(e) => setRobotDesign(prev => ({ ...prev, elbowLength: Number(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                    <span className="text-[9px] text-slate-600 block">Radius boundary swing range.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Wrist segment link (J3):</span>
                      <span className="text-blue-400">{robotDesign.wristLength} mm</span>
                    </label>
                    <input
                      type="range"
                      min={30}
                      max={100}
                      step={5}
                      value={robotDesign.wristLength}
                      onChange={(e) => setRobotDesign(prev => ({ ...prev, wristLength: Number(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                    <span className="text-[9px] text-slate-600 block">End effector wrist mounting length extension.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Payload Mass capacity:</span>
                      <span className="text-blue-400">{robotDesign.payloadWeight} kg</span>
                    </label>
                    <input
                      type="range"
                      min={0.5}
                      max={5.0}
                      step={0.1}
                      value={robotDesign.payloadWeight}
                      onChange={(e) => setRobotDesign(prev => ({ ...prev, payloadWeight: Number(e.target.value) }))}
                      className="w-full accent-blue-500"
                    />
                    <span className="text-[9px] text-slate-600 block">Maximum load rating before joint torque stress limit faults.</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block font-bold text-slate-400 uppercase">Interactive End-Effector Style Tool:</span>
                  <div className="flex gap-2">
                    {(["gripper", "suction", "welder"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setRobotDesign(prev => ({ ...prev, endEffectorType: type }))}
                        className={`flex-1 py-1.5 rounded border text-[10px] font-bold uppercase transition-all ${
                          robotDesign.endEffectorType === type
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-[#1e1e24] border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Group B: Factory Simulator Params */}
              <div className="space-y-4">
                <div className="font-bold text-indigo-400 border-b border-white/5 pb-1 uppercase text-[10px] tracking-wider">
                  Phase B: Factory Simulator & Color scanner configuration
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Conveyor horizontal speed:</span>
                      <span className="text-indigo-400">{conveyorSpeed}x scalar</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={0.5}
                      value={conveyorSpeed}
                      onChange={(e) => setConveyorSpeed(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[9px] text-slate-600 block">Material transit speed multiplier on physical belt.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Color Scanner Location x-offset:</span>
                      <span className="text-indigo-400">{sensorPositionX} px</span>
                    </label>
                    <input
                      type="range"
                      min={80}
                      max={225}
                      step={5}
                      value={sensorPositionX}
                      onChange={(e) => setSensorPositionX(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[9px] text-slate-600 block">Left scanning beam positioning offset coordinates.</span>
                  </div>

                  <div className="space-y-2">
                    <label className="flex justify-between font-bold text-slate-400">
                      <span>Collision Obstacle Barrier Height:</span>
                      <span className="text-rose-400">{obstacleHeight} px</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      step={5}
                      value={obstacleHeight}
                      onChange={(e) => setObstacleHeight(Number(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                    <span className="text-[9px] text-slate-600 block">Height ceiling obstacle to test path collisions (0 = bypassed).</span>
                  </div>

                  <div className="space-y-2 bg-[#0c0c0e] p-2.5 rounded border border-white/5 flex flex-col justify-between">
                    <span className="block font-bold text-slate-400 uppercase text-[9px] mb-1">Color spawning queue feed:</span>
                    <select
                      value={feedMode}
                      onChange={(e: any) => setFeedMode(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded px-2 py-1 text-slate-300 w-full text-[10px]"
                    >
                      <option value="random" className="bg-[#141417] text-slate-200">Random Spawns</option>
                      <option value="red" className="bg-[#141417] text-slate-200">Always Red</option>
                      <option value="green" className="bg-[#141417] text-slate-200">Always Green</option>
                      <option value="blue" className="bg-[#141417] text-slate-200">Always Blue</option>
                      <option value="yellow" className="bg-[#141417] text-slate-200">Always Yellow</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Group C: Compiler and Virtual Settings */}
              <div className="space-y-4">
                <div className="font-bold text-amber-500 border-b border-white/5 pb-1 uppercase text-[10px] tracking-wider">
                  Phase C: Interpreter Execution Core & Bypasses
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block font-bold text-slate-400 uppercase">Operational Mode Setup:</span>
                    <div className="space-y-1">
                      <label className="flex items-center space-x-2 text-slate-350 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simulationState.dryRunMode}
                          onChange={(e) => setSimulationState(prev => ({ ...prev, dryRunMode: e.target.checked }))}
                          className="rounded border-white/10 bg-[#1e1e24] accent-amber-500"
                        />
                        <span>Enable Dry-Run Bypass (Bypass Gripper Suction)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-slate-350 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={simulationState.profilingEnabled}
                          onChange={(e) => setSimulationState(prev => ({ ...prev, profilingEnabled: e.target.checked }))}
                          className="rounded border-white/10 bg-[#1e1e24] accent-amber-500"
                        />
                        <span>Enable Microsecond Profiling Registers</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2 bg-[#0c0c0e] p-2.5 rounded border border-white/5 text-[9.5px]">
                    <div className="font-bold text-slate-400 mb-1 uppercase text-[8.5px]">Diagnostic Level Registers:</div>
                    <div className="text-slate-500 leading-normal space-y-0.5">
                      <div>INTEGRATION LAYER: ACTIVE</div>
                      <div>PROFILING BUFFERS: ACTIVE</div>
                      <div>THERMAL LEVEL: 42°C (OPTIMAL)</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Summary Bar */}
            <div className="px-5 py-3 border-t border-white/5 bg-[#141417] text-right">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase rounded text-[10px] transition-all cursor-pointer"
              >
                Apply Parameters & Recalibrate Base
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
