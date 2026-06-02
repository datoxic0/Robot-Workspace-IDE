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
import AIPanel from "./components/AIPanel";
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
  Sliders
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
    payloadWeight: 1.8 // kg
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
  const [selectedDesignTab, setSelectedDesignTab] = useState<"robot-designer" | "workspace-config" | "system-status">("robot-designer");
  const [activeMainTab, setActiveMainTab] = useState<"visualizer" | "ide" | "ai">("visualizer");
  const [designControlsExpanded, setDesignControlsExpanded] = useState<boolean>(false);

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
    simulationSpeed: 1
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
          <nav className="hidden md:flex space-x-4 text-[10px] font-mono uppercase tracking-wider text-slate-500">
            <span className="text-blue-400 border-b border-blue-400 pb-0.5">Workspace IDE</span>
            <span className="text-slate-400">Computer Integrated Manufacturing</span>
            <span className="text-slate-400">4-DOF Kinematics Simulator</span>
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
      </div>

      {/* 3. Main Interactive Dashboard Column Grid */}
      <main className="flex-1 p-3 grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        
        {/* Left Column: Mechanical Kinematics Visualizer (xl:col-span-5) */}
        <div className={`xl:col-span-5 flex-col space-y-3 h-full min-h-0 ${activeMainTab === "visualizer" ? "flex" : "hidden"} xl:flex`}>
          <div className="flex-1 min-h-0">
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
            />
          </div>
        </div>

        {/* Middle Column: Hardware Code IDE (xl:col-span-4) */}
        <div className={`xl:col-span-4 flex-col h-full min-h-0 ${activeMainTab === "ide" ? "flex" : "hidden"} xl:flex`}>
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
          />
        </div>

        {/* Right Column: AI Robotic Assistant Chat (xl:col-span-3) */}
        <div className={`xl:col-span-3 flex-col h-full min-h-0 ${activeMainTab === "ai" ? "flex" : "hidden"} xl:flex`}>
          <AIPanel
            activeBoard={activeBoard}
            activeLanguage={activeLanguage}
            currentCode={files[activeFileIndex]?.content || ""}
            onInsertCode={handleInsertCodeFromAI}
          />
        </div>
      </main>

      {/* 3. Mechanical Robot DESIGN Studio Panel */}
      <footer className="bg-[#141417] border-t border-white/5 px-4 py-3 shrink-0">
        <div id="mechanical-design-studio" className="w-full">
          {/* Tabs header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 mb-2 gap-2">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <div className="flex items-center space-x-2">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-200">
                  INDUSTRIAL CIM DESIGN & VIRTUAL SIMULATION STUDIO
                </h3>
              </div>
              <button
                onClick={() => setDesignControlsExpanded(!designControlsExpanded)}
                className="ml-3 px-2 py-0.5 bg-black/40 hover:bg-[#1a1a1e] border border-white/10 rounded font-mono text-[9px] font-semibold tracking-wider text-blue-400 hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {designControlsExpanded ? "▲ COLLAPSE" : "▼ EXPAND SETTINGS"}
              </button>
            </div>
            
            {/* Tab switchers */}
            {designControlsExpanded && (
              <div className="flex space-x-1.5 bg-black/30 p-0.5 rounded border border-white/5 select-none">
                <button
                  onClick={() => setSelectedDesignTab("robot-designer")}
                  className={`flex items-center space-x-1 px-3 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                    selectedDesignTab === "robot-designer"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Cpu className="w-3 h-3" />
                  <span>1. Robot Designer</span>
                </button>
                
                <button
                  onClick={() => setSelectedDesignTab("workspace-config")}
                  className={`flex items-center space-x-1 px-3 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                    selectedDesignTab === "workspace-config"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Settings className="w-3 h-3" />
                  <span>2. Factory Simulator</span>
                </button>
                
                <button
                  onClick={() => setSelectedDesignTab("system-status")}
                  className={`flex items-center space-x-1 px-3 py-1 font-mono text-[9px] uppercase rounded transition-all cursor-pointer ${
                    selectedDesignTab === "system-status"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Activity className="w-3 h-3" />
                  <span>3. System Telemetry</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Core Contents */}
          {designControlsExpanded && selectedDesignTab === "robot-designer" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Type selector */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Select Kinematics Class
                  </div>
                  <div className="space-y-1">
                    {[
                      { id: "articulated", name: "Articulated 4-DOF", desc: "Rotational joints sorted multi-planar" },
                      { id: "scara", name: "SCARA Pro Planar", desc: "Selective Compliance Assembly Arm for fast picks" },
                      { id: "cartesian", name: "Cartesian Gantry Cargo", desc: "Overhead rails precision linear loaders" }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setRobotType(type.id as any)}
                        className={`w-full text-left p-1.5 rounded border transition-all cursor-pointer ${
                          robotType === type.id
                            ? "bg-blue-600/10 border-blue-500 text-blue-400 font-bold"
                            : "bg-[#0d0d0f] border-white/5 text-slate-400 hover:bg-[#141417]"
                        }`}
                      >
                        <div className="text-[10px] font-mono font-bold leading-none">{type.name}</div>
                        <div className="text-[8px] text-slate-500 font-mono mt-0.5">{type.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Physical link scales */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider flex justify-between">
                  <span>Joint Link Lengths</span>
                  <span className="text-blue-400 font-bold">CAD Config</span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500">Shoulder J1 Length:</span>
                    <span className="text-blue-400 font-semibold">{robotDesign.shoulderLength} mm</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="150"
                    value={robotDesign.shoulderLength}
                    onChange={(e) => setRobotDesign((prev) => ({ ...prev, shoulderLength: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500">Elbow J2 Length:</span>
                    <span className="text-blue-400 font-semibold">{robotDesign.elbowLength} mm</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="140"
                    value={robotDesign.elbowLength}
                    onChange={(e) => setRobotDesign((prev) => ({ ...prev, elbowLength: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500">Wrist J3 Length:</span>
                    <span className="text-blue-400 font-semibold">{robotDesign.wristLength} mm</span>
                  </div>
                  <input
                    type="range"
                    min="40"
                    max="90"
                    value={robotDesign.wristLength}
                    onChange={(e) => setRobotDesign((prev) => ({ ...prev, wristLength: parseInt(e.target.value) }))}
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>

              {/* End Effectors list */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  End Effector Head Tool
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {[
                    { id: "gripper", name: "Pneumatic Grabber Claw" },
                    { id: "suction", name: "Vacuum Suction Pad" },
                    { id: "welder", name: "CO2 Electric Spot Welder" }
                  ].map((tool) => (
                    <label
                      key={tool.id}
                      className={`flex items-center px-1.5 py-0.5 border rounded text-[10px] font-mono cursor-pointer transition-colors ${
                        robotDesign.endEffectorType === tool.id 
                          ? "bg-blue-500/10 border-blue-500/40 text-blue-400 font-semibold" 
                          : "bg-[#141417]/40 border-white/5 text-slate-500 hover:text-slate-300 hover:bg-[#141417]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="endEffectorType"
                        value={tool.id}
                        checked={robotDesign.endEffectorType === tool.id}
                        onChange={() => setRobotDesign((prev) => ({ ...prev, endEffectorType: tool.id as any }))}
                        className="mr-2 h-3 w-3 accent-blue-500"
                      />
                      {tool.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Physical specifications info */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500 font-bold">Actuator Servos:</span>
                    <span className="text-teal-400 font-bold">AC Brushless</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-slate-500">Max Payload Limit:</span>
                        <span className={robotDesign.payloadWeight > 3.5 ? "text-rose-400 font-bold animate-pulse" : "text-white font-semibold"}>
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
                        className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[8px] font-mono text-slate-500 leading-none pt-1.5 border-t border-white/5 uppercase">
                  Kinematic Resolver Version: V2.4-DH
                </div>
              </div>
            </div>
          )}

          {designControlsExpanded && selectedDesignTab === "workspace-config" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Conveyor factors */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  Conveyor Belt Speed
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500">Linear Feed Rate:</span>
                    <span className="text-blue-400 font-semibold">{conveyorSpeed * 10} mm/s</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={conveyorSpeed}
                    onChange={(e) => setConveyorSpeed(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="text-[8px] text-slate-500 font-mono italic">
                    (Default is 20mm/s. High speeds stress the sensor sweep)
                  </div>
                </div>
              </div>

              {/* Security Shield active obstacle barrier height */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  Hazard Safety Shield (Obstacle)
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500">Containment Wall Height:</span>
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
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="text-[8px] text-slate-500 font-mono italic leading-tight">
                    Adds a central protection barrier column. Arm paths MUST climb OVER it to avoid stress-halt crashes!
                  </div>
                </div>
              </div>

              {/* Dynamic sensor location */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  Photoelectric Laser Offset
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-slate-500">IRSENS_01 Coord:</span>
                    <span className="text-blue-400 font-semibold">{sensorPositionX} px from base</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="220"
                    value={sensorPositionX}
                    onChange={(e) => setSensorPositionX(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="text-[8px] text-slate-500 font-mono italic leading-tight">
                    Set relative spacing of breakbeam detector. Slide left or right to simulate distinct assembly layouts.
                  </div>
                </div>
              </div>

              {/* Seed generator flow control guidelines */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-blue-400 flex items-center space-x-1 mb-1">
                    <Lightbulb className="w-3 h-3 text-amber-400" />
                    <span>Layout Guideline</span>
                  </span>
                  <p className="text-[9px] font-mono text-slate-400 leading-normal">
                    Adjust speed first. Placing barriers enforces rigorous spatial path constraints on the robot arms! Excellent for collision avoidance validation scripts.
                  </p>
                </div>
                <div className="text-[8px] font-[#2e1d1d] font-mono uppercase text-slate-500 leading-none">
                  Virtual Factory Cell #29A
                </div>
              </div>
            </div>
          )}

          {designControlsExpanded && selectedDesignTab === "system-status" && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Joint stress monitors */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-1.5 col-span-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Live Joint Motor Stress Analysis
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-mono">J1 Turntable Base servo:</span>
                    <div className="flex justify-between font-mono text-[9px] text-slate-300">
                      <span>NEMA 23 standard</span>
                      <span className="text-emerald-400 font-bold">OPERATIONAL</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-mono">J2 Shoulder link motor:</span>
                    <div className="flex justify-between font-mono text-[9px] text-slate-300">
                      <span>Max temp 42°C</span>
                      <span className="text-emerald-400 font-bold">SYS_HEALTHY</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-mono">J3 Forearm Elbow servo:</span>
                    <div className="flex justify-between font-mono text-[9px] text-slate-300">
                      <span>Slip back: 0.02%</span>
                      <span className="text-blue-500 font-bold">CALIBRATED</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-slate-500 font-mono">Wrist Solenoid Effector:</span>
                    <div className="flex justify-between font-mono text-[9px] text-slate-300">
                      <span>Pneu vac scale: 1.0</span>
                      <span className="text-emerald-400 font-bold">READY</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kinematic solvers stats */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 space-y-2">
                <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                  Inverse Kinematics (IK)
                </div>
                <div className="text-[9px] font-mono text-slate-400 space-y-1">
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
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 flex flex-col justify-between">
                <div>
                  <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider mb-1">
                    System Clock Registers
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 leading-normal space-y-0.5">
                    <div>RTC: 2026-06-02T12:16:04Z</div>
                    <div>PLL: LOCKED (Freq: 400 MHz)</div>
                    <div>ADC Channels: 0x4B3A8</div>
                  </div>
                </div>
                <div className="text-[8px] font-mono text-slate-600 uppercase pt-1 border-t border-white/5">
                  Firmware version check OK
                </div>
              </div>
            </div>
          )}
        </div>
      </footer>

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
    </div>
  );
}
