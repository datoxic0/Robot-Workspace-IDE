import React, { useState, useRef, useEffect } from "react";
import { RobotDesignConfig } from "../types";
import { 
  Compass, 
  MapPin, 
  User, 
  ShieldAlert, 
  RefreshCw, 
  Zap, 
  Sliders, 
  Eye, 
  Trash2, 
  Plus, 
  Activity,
  Play,
  Square
} from "lucide-react";

interface SandboxItem {
  id: string;
  name: string;
  type: "obstacle" | "target" | "pedestrian" | "charger";
  x: number;
  y: number;
  radius: number;
  label: string;
}

interface VisionSandboxProps {
  robotDesign: RobotDesignConfig;
  setRobotDesign: React.Dispatch<React.SetStateAction<RobotDesignConfig>>;
}

export default function VisionSandbox({ robotDesign, setRobotDesign }: VisionSandboxProps) {
  // SVG Workspace Floor Dimensions
  const canvasWidth = 500;
  const canvasHeight = 320;

  // Sandbox active items state
  const [items, setItems] = useState<SandboxItem[]>([
    { id: "obs-1", name: "Steel Hazard Pillar", type: "obstacle", x: 120, y: 100, radius: 12, label: "OBSTACLE_WALL" },
    { id: "obs-2", name: "Corridor Panel Wall", type: "obstacle", x: 340, y: 220, radius: 15, label: "HAZARD_PARTITION" },
    { id: "dock-1", name: "Automatic Power Dock", type: "charger", x: 440, y: 70, radius: 10, label: "CHARGER_DOCK_ACV" },
    { id: "tar-1", name: "Target Cargo Bin", type: "target", x: 180, y: 240, radius: 12, label: "DELIVERY_BIN_A" },
    { id: "ped-1", name: "Human Guest pedestrian", type: "pedestrian", x: 280, y: 110, radius: 10, label: "HUMAN_PEDESTRIAN" },
  ]);

  // Robot Position (can also be dragged!)
  const [robotPos, setRobotPos] = useState({ x: 250, y: 160 });

  // Kinematics and sensor variables synced with robotDesign
  const currentCategory = robotDesign.category || "industrial";
  const sensorType = robotDesign.visionSensorType || "lidar_2d";
  
  // Use parent prop directly (Single Source of Truth) to avoid update loops
  const useAIVision = robotDesign.hasAIVisionModel ?? true;
  const scanRange = robotDesign.visionRange || 180;
  const fovAngle = robotDesign.visionAngle || 90;

  const [headingAngle, setHeadingAngle] = useState(0); // Current look-at offset angle in degrees (-180 to 180)

  // Simulation parameters
  const [isSweeping, setIsSweeping] = useState(true);
  const [sweepDirection, setSweepDirection] = useState(1); // 1 = clockwise, -1 = counter
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);

  // Automated sweeping look-at rotation animation loop
  useEffect(() => {
    if (!isSweeping) return;

    let animFrame: number;
    const updateSweep = () => {
      setHeadingAngle(prev => {
        let next = prev + sweepDirection * 1.5;
        // Bound look sweeps between limits. E.g. -60 to +60 degrees sweep
        const sweepLimit = fovAngle >= 150 ? 50 : 75;
        if (next > sweepLimit) {
          setSweepDirection(-1);
          return sweepLimit;
        }
        if (next < -sweepLimit) {
          setSweepDirection(1);
          return -sweepLimit;
        }
        return next;
      });
      animFrame = requestAnimationFrame(updateSweep);
    };

    animFrame = requestAnimationFrame(updateSweep);
    return () => cancelAnimationFrame(animFrame);
  }, [isSweeping, sweepDirection, fovAngle]);

  // Mouse / Touch Drag and Drop Coordinators
  const getCoordinates = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvasWidth);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvasHeight);
    return { x: Math.max(0, Math.min(canvasWidth, x)), y: Math.max(0, Math.min(canvasHeight, y)) };
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggedId(id);
    const coords = getCoordinates(e as any);
    if (id === "robot") {
      setDragOffset({ x: coords.x - robotPos.x, y: coords.y - robotPos.y });
    } else {
      const item = items.find(it => it.id === id);
      if (item) {
        setDragOffset({ x: coords.x - item.x, y: coords.y - item.y });
      }
    }
    // Set pointer capture to receive events even outside the elements
    const target = e.target as HTMLElement;
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!draggedId) return;
    const coords = getCoordinates(e);
    const updatedX = coords.x - dragOffset.x;
    const updatedY = coords.y - dragOffset.y;

    if (draggedId === "robot") {
      setRobotPos({ 
        x: Math.max(20, Math.min(canvasWidth - 20, updatedX)), 
        y: Math.max(20, Math.min(canvasHeight - 20, updatedY)) 
      });
    } else {
      setItems(prev => prev.map(item => {
        if (item.id === draggedId) {
          return {
            ...item,
            x: Math.max(10, Math.min(canvasWidth - 10, updatedX)),
            y: Math.max(10, Math.min(canvasHeight - 10, updatedY))
          };
        }
        return item;
      }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedId) {
      try {
        const target = e.target as HTMLElement;
        if (target && typeof target.releasePointerCapture === "function") {
          target.releasePointerCapture(e.pointerId);
        }
      } catch (err) {
        // Safe catch for potential pointer capturing release errors
      }
      setDraggedId(null);
    }
  };

  // Add a new random item on the board
  const addNewItem = (type: "obstacle" | "target" | "pedestrian" | "charger") => {
    const rx = Math.round(50 + Math.random() * (canvasWidth - 100));
    const ry = Math.round(50 + Math.random() * (canvasHeight - 100));
    const count = items.length + 1;
    let label = "ENTITY";
    let name = "Artifact";

    if (type === "obstacle") {
      label = `OBSTACLE_${count}`;
      name = `Structure Pillar B${count}`;
    } else if (type === "target") {
      label = `TARGET_RECEPTACLE_${count}`;
      name = `Assembly Basket ${count}`;
    } else if (type === "pedestrian") {
      label = `OPERATOR_SYS_${count}`;
      name = `Safety Zone Guest ${count}`;
    } else {
      label = `DC_CHARGER_${count}`;
      name = `AC Charging Rack ${count}`;
    }

    setItems(prev => [...prev, {
      id: `${type}-${Date.now()}`,
      name,
      type,
      x: rx,
      y: ry,
      radius: type === "charger" ? 9 : 12,
      label
    }]);
  };

  // Delete an item
  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(it => it.id !== id));
  };

  // Calculate if item is within robot's look cone segment
  // headingAngle is look angle offset relative to bottom (90 degrees or customizable)
  // Let's assume the robot's default camera looks forward/rightward (0 is horizontal positive x-axis)
  const isItemDetected = (item: SandboxItem) => {
    const dx = item.x - robotPos.x;
    const dy = item.y - robotPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > scanRange) return false;

    // Angle of item from robot (-180 to 180 degrees)
    let itemAngleRad = Math.atan2(dy, dx);
    let itemAngleDeg = (itemAngleRad * 180) / Math.PI;

    // Normalize item angle to look sweep heading
    let diff = itemAngleDeg - headingAngle;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;

    return Math.abs(diff) <= fovAngle / 2;
  };

  const detectedItems = items.filter(isItemDetected);

  // Check if any obstacle is extremely close (Emergency Alert Zone)
  const emergencyBrakeActive = items.some(it => {
    if (it.type !== "obstacle" && it.type !== "pedestrian") return false;
    const dx = it.x - robotPos.x;
    const dy = it.y - robotPos.y;
    return Math.sqrt(dx * dx + dy * dy) < 45;
  });

  // Calculate sector arc paths
  const getSectorPath = () => {
    const startAngleRad = ((headingAngle - fovAngle / 2) * Math.PI) / 180;
    const endAngleRad = ((headingAngle + fovAngle / 2) * Math.PI) / 180;

    const xStart = robotPos.x + scanRange * Math.cos(startAngleRad);
    const yStart = robotPos.y + scanRange * Math.sin(startAngleRad);
    const xEnd = robotPos.x + scanRange * Math.cos(endAngleRad);
    const yEnd = robotPos.y + scanRange * Math.sin(endAngleRad);

    const largeArcFlag = fovAngle > 180 ? 1 : 0;

    return `M ${robotPos.x} ${robotPos.y} 
            L ${xStart} ${yStart} 
            A ${scanRange} ${scanRange} 0 ${largeArcFlag} 1 ${xEnd} ${yEnd} 
            Z`;
  };

  // Robot custom drawing details by category
  const renderRobotChassis = () => {
    if (currentCategory === "domestic") {
      return (
        <g>
          {/* Friendly vacuum disc helper */}
          <circle cx="0" cy="0" r="16" fill="#1e293b" stroke="#6366f1" strokeWidth="2.5" />
          <circle cx="0" cy="0" r="8" fill="#312e81" />
          {/* Camera wedge marker */}
          <path d="M -6 -5 L 0 -11 L 6 -5 Z" fill="#6366f1" />
          {/* Eyes */}
          <circle cx="-5" cy="-2" r="2.5" fill="#a5b4fc" />
          <circle cx="5" cy="-2" r="2.5" fill="#a5b4fc" />
          {/* Wheeled rims indicator */}
          <rect x="-18" y="-4" width="3" height="8" fill="#64748b" rx="1" />
          <rect x="15" y="-4" width="3" height="8" fill="#64748b" rx="1" />
        </g>
      );
    } else if (currentCategory === "corporate") {
      return (
        <g>
          {/* Commercial logistics / concierge tower patrol base */}
          <rect x="-13" y="-13" width="26" height="26" fill="#0f172a" stroke="#0ea5e9" strokeWidth="2" rx="4" />
          {/* Lidar spinning dome */}
          <circle cx="0" cy="0" r="7.5" fill="#0284c7" className="animate-pulse" />
          <line x1="0" y1="0" x2="6" y2="4" stroke="#e0f2fe" strokeWidth="1.5" />
          {/* Track wheels */}
          <rect x="-15" y="-10" width="2" height="20" fill="#475569" />
          <rect x="13" y="-10" width="2" height="20" fill="#475569" />
        </g>
      );
    } else {
      // Industrial
      return (
        <g>
          {/* Solid anchor frame */}
          <polygon points="-12,12 12,12 16,-10 -16,-10" fill="#111827" stroke="#9333ea" strokeWidth="2.5" />
          {/* Articulated joint J1 base pin */}
          <circle cx="0" cy="0" r="6" fill="#e9d5ff" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="3,3" className="animate-spin-slow" />
        </g>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      {/* Simulation Workspace Panel */}
      <div className="md:col-span-8 space-y-3 flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#141417]/80 p-2.5 rounded-lg border border-white/5 font-mono">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-purple-400 animate-spin-slow" />
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-200">
              CIM Workspace & Vision Sandbox Map
            </h4>
          </div>
          <div className="flex gap-1.5 text-[8.5px]">
            <button
              onClick={() => setIsSweeping(!isSweeping)}
              className={`px-2 py-0.5 rounded border flex items-center gap-1 cursor-pointer transition-colors ${
                isSweeping 
                  ? "bg-purple-950/40 border-purple-800 text-purple-300"
                  : "bg-slate-900 border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {isSweeping ? <Square className="w-2.5 h-2.5 fill-purple-300" /> : <Play className="w-2.5 h-2.5 fill-slate-300" />}
              <span>{isSweeping ? "HALT SWEEP" : "SWEEP SENSOR"}</span>
            </button>
            <button
              onClick={() => {
                setRobotPos({ x: 250, y: 160 });
                setHeadingAngle(0);
              }}
              className="px-2 py-0.5 bg-slate-900 border border-white/5 text-slate-400 hover:text-white rounded cursor-pointer transition-colors"
            >
              RESET BASE
            </button>
          </div>
        </div>

        {/* Dynamic Map Area */}
        <div className="relative flex-1 bg-[#09090b] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center p-0.5 shadow-2xl">
          {/* Grid Background Overlay representing different environments */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
            backgroundImage: "radial-gradient(#8b5cf6 1px, transparent 1px)",
            backgroundSize: "20px 20px"
          }} />

          {/* Environmental Floor Blueprint Backdrop lines */}
          <div className="absolute top-2.5 left-3.5 flex items-center space-x-1.5 bg-black/60 px-2 py-0.5 border border-white/5 rounded text-[8px] font-mono select-none uppercase backdrop-blur-md">
            <span className={`w-1.5 h-1.5 rounded-full ${emergencyBrakeActive ? "bg-rose-500 animate-ping" : "bg-emerald-450 animate-pulse"}`} />
            <span className="text-slate-300 font-bold">
              MAP SETUP: {currentCategory} ENVIRONMENT
            </span>
          </div>

          <svg
            ref={svgRef}
            className="w-full h-auto aspect-[500/320] bg-transparent touch-none select-none"
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Grid Pattern Details based on Robot Class */}
            {currentCategory === "industrial" && (
              <g id="industrial-safety-boundaries" opacity="0.15">
                {/* Yellow black hazard bounds strip on edges */}
                <rect x="5" y="5" width={canvasWidth - 10} height={canvasHeight - 10} fill="none" stroke="#eab308" strokeWidth="4" strokeDasharray="12,12" />
                <text x="20" y="24" fill="#eab308" fontSize="8" fontFamily="monospace">DANGER: WORK CELL RADIAL REGISTERS</text>
              </g>
            )}

            {currentCategory === "corporate" && (
              <g id="corporate-blueprint-partitions" opacity="0.1" stroke="#38bdf8" strokeWidth="1">
                {/* Office layout outlines */}
                <line x1="100" y1="0" x2="100" y2="120" />
                <line x1="400" y1="200" x2="400" y2="320" />
                <rect x="200" y="250" width="100" height="70" fill="none" />
                <circle cx="250" cy="285" r="22" fill="none" />
              </g>
            )}

            {currentCategory === "domestic" && (
              <g id="domestic-blueprint-walls" opacity="0.12" stroke="#f43f5e" strokeWidth="1">
                {/* Room wall layouts */}
                <path d="M 50 0 L 50 80 L 180 80" fill="none" />
                <path d="M 450 320 L 450 240 L 320 240" fill="none" />
                <rect x="30" y="260" width="60" height="40" fill="none" />
                <text x="35" y="278" fill="#f43f5e" fontSize="7" fontFamily="monospace">COUCH AREA</text>
              </g>
            )}

            {/* Simulated target range indicators */}
            <circle cx={robotPos.x} cy={robotPos.y} r={scanRange} fill="none" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,6" opacity="0.1" />

            {/* Vision Cone Sector Mesh */}
            <g id="dynamic-vision-sensor-cone">
              <path
                d={getSectorPath()}
                fill={currentCategory === "industrial" ? "url(#indScan)" : currentCategory === "corporate" ? "url(#corpScan)" : "url(#domScan)"}
                stroke={currentCategory === "industrial" ? "#ea580c" : currentCategory === "corporate" ? "#0284c7" : "#ec4899"}
                strokeWidth="1.5"
                strokeOpacity="0.4"
                opacity={isSweeping ? 0.35 : 0.25}
              />
            </g>

            {/* Lock Vectors Drawn to detected items */}
            {detectedItems.map(item => (
              <g key={`lock-${item.id}`} id={`locking-vector-${item.id}`}>
                <line
                  x1={robotPos.x}
                  y1={robotPos.y}
                  x2={item.x}
                  y2={item.y}
                  stroke={item.type === "obstacle" ? "#f43f5e" : item.type === "pedestrian" ? "#f97316" : "#10b981"}
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                  className="animate-pulse"
                />
                {/* Animated locking ring around active item */}
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={item.radius + 6}
                  fill="none"
                  stroke={item.type === "obstacle" ? "#f43f5e" : item.type === "pedestrian" ? "#f97316" : "#10b981"}
                  strokeWidth="1"
                  strokeDasharray="2,3"
                  className="animate-spin-slow"
                />
                {/* Bounding telemetry vector node */}
                <text
                  x={item.x - 20}
                  y={item.y - item.radius - 8}
                  fill={item.type === "obstacle" ? "#fda4af" : item.type === "pedestrian" ? "#ffedd5" : "#a7f3d0"}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {Math.round(Math.sqrt((item.x - robotPos.x) ** 2 + (item.y - robotPos.y) ** 2))}mm
                </text>
              </g>
            ))}

            {/* Graggable Environment Items */}
            <g id="sandbox-artifacts">
              {items.map(item => {
                const isSelected = draggedId === item.id;
                const isDetected = detectedItems.some(it => it.id === item.id);
                let color = "#3b82f6";
                let textCol = "#93c5fd";

                if (item.type === "obstacle") {
                  color = isDetected ? "#ef4444" : "#4b5563";
                  textCol = isDetected ? "#fca5a5" : "#cbd5e1";
                } else if (item.type === "pedestrian") {
                  color = isDetected ? "#f97316" : "#a855f7";
                  textCol = isDetected ? "#fed7aa" : "#f3e8ff";
                } else if (item.type === "charger") {
                  color = isDetected ? "#10b981" : "#0d9488";
                  textCol = isDetected ? "#6ee7b7" : "#99f6e4";
                } else {
                  color = isDetected ? "#22c55e" : "#059669";
                  textCol = isDetected ? "#86efac" : "#a7f3d0";
                }

                return (
                  <g
                    key={item.id}
                    id={`artifact-${item.id}`}
                    transform={`translate(${item.x}, ${item.y})`}
                    className="cursor-move group"
                    onPointerDown={(e) => handlePointerDown(item.id, e)}
                  >
                    {/* Shadow anchor */}
                    <circle cx="0" cy="3" r={item.radius} fill="#000" opacity="0.3" hover-overlay="" />
                    
                    {/* Pulsing trigger core */}
                    {isDetected && (
                      <circle cx="0" cy="0" r={item.radius + 4} fill="none" stroke={color} strokeWidth="1" className="animate-ping" opacity="0.5" />
                    )}

                    {/* Draggable Circle Node */}
                    <circle
                      cx="0"
                      cy="0"
                      r={item.radius}
                      fill={color}
                      stroke={isSelected ? "#fff" : "rgba(255,255,255,0.15)"}
                      strokeWidth={isSelected ? 1.5 : 1}
                      className="transition-shadow"
                    />

                    {/* Specific interior symbol details */}
                    {item.type === "pedestrian" && (
                      <path d="M-4,3 C-4,1 -2,-1 0,-1 C2,-1 4,1 4,3 Z M0,-3 A2,2 0 1,1 0,-5 A2,2 0 1,1 0,-3" fill="#fff" />
                    )}
                    {item.type === "charger" && (
                      <polygon points="-2,4 2,1 0,1 2,-3 -2,0 0,0" fill="#fff" />
                    )}

                    {/* Floating Item Label */}
                    <text
                      x="0"
                      y={item.radius + 10}
                      fill={textCol}
                      fontSize="7"
                      fontFamily="monospace"
                      textAnchor="middle"
                      className="pointer-events-none font-bold uppercase tracking-wider bg-black/60 select-none"
                    >
                      {item.label}
                    </text>

                    {/* Small Trash Delete overlay */}
                    <g 
                      transform={`translate(${item.radius + 4}, ${-item.radius - 4})`} 
                      className="opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                    >
                      <circle cx="0" cy="0" r="6" fill="#18181b" stroke="#ef4444" strokeWidth="0.5" />
                      <line x1="-2" y1="-2" x2="2" y2="2" stroke="#ef4444" strokeWidth="0.75" />
                      <line x1="2" y1="-2" x2="-2" y2="2" stroke="#ef4444" strokeWidth="0.75" />
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Draggable Robot Core Base Unit */}
            <g
              id="robot-sensor-hub-node"
              transform={`translate(${robotPos.x}, ${robotPos.y})`}
              className="cursor-move"
              onPointerDown={(e) => handlePointerDown("robot", e)}
            >
              <circle cx="0" cy="0" r="24" fill="none" stroke="#a78bfa" strokeWidth="1" strokeDasharray="3,3" className="animate-spin-slow" opacity="0.3" />
              
              {/* Render dynamic graphic matching category */}
              {renderRobotChassis()}

              {/* Floating ID badge */}
              <text x="0" y="-18" fill="#c084fc" fontSize="8" fontFamily="monospace" textAnchor="middle" className="font-bold tracking-widest text-[#d8b4fe]">
                ROBOT_HUB
              </text>
            </g>

            {/* Gradation Definitions block */}
            <defs>
              <radialGradient id="indScan" cx="0" cy="0" r="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#ea580c" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#7c2d12" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="corpScan" cx="0" cy="0" r="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#0ea5e9" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="domScan" cx="0" cy="0" r="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
                <stop offset="60%" stopColor="#db2777" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#9d174d" stopOpacity="0" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        {/* Action controls block */}
        <div className="flex gap-2">
          <button
            onClick={() => addNewItem("obstacle")}
            className="flex-1 py-1.5 bg-[#1e293b]/50 hover:bg-[#1e293b] border border-slate-700/50 hover:border-slate-600 rounded text-[9.5px] font-mono font-bold flex items-center justify-center gap-1 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span>+ ADD OBSTACLE</span>
          </button>
          <button
            onClick={() => addNewItem("target")}
            className="flex-1 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/30 hover:border-emerald-700 rounded text-[9.5px] font-mono font-bold text-emerald-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ ADD TARGET BIN</span>
          </button>
          <button
            onClick={() => addNewItem("pedestrian")}
            className="flex-1 py-1.5 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-900/30 hover:border-purple-700 rounded text-[9.5px] font-mono font-bold text-purple-300 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span>+ ADD PEDESTRIAN</span>
          </button>
        </div>
      </div>

      {/* Real-Time Sensor Diagnostics & simulated video stream column */}
      <div className="md:col-span-4 space-y-3.5 flex flex-col justify-start">
        {/* Cam / LIDAR processor feed box */}
        <div className="bg-[#141416] border border-white/5 rounded-xl p-3 space-y-2.5 flex flex-col">
          <div className="flex items-center justify-between text-[9px] font-mono border-b border-white/5 pb-1.5">
            <span className="font-extrabold uppercase tracking-wide text-cyan-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
              <span>Camera Video Recognition Feed</span>
            </span>
            <span className="font-bold text-slate-500 uppercase">AIV_V4.8</span>
          </div>

          {/* Video display card matrix */}
          <div className="relative aspect-video w-full rounded-lg bg-black border border-white/5 overflow-hidden flex flex-col justify-between p-2 font-mono text-[8px] tracking-wide text-green-450">
            {/* Edge overlay framing corner boxes */}
            <div className="absolute inset-2 border border-slate-900/40 pointer-events-none" />
            <div className="absolute top-1 left-1.5 text-[7px] text-zinc-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
              <span>LIVE FEED_STREAM [CAM_IDX_0]</span>
            </div>
            <div className="absolute top-1 right-1.5 text-zinc-600">CONFIDENCE RANGE: 100%</div>

            {/* Central scanning items overlay drawer */}
            <div className="flex-1 flex flex-col justify-center items-center py-2 space-y-1">
              {detectedItems.length === 0 ? (
                <div className="text-[9px] text-zinc-400 uppercase tracking-widest text-center py-4">
                  -- NO ARTIFACTS ACQUIRED --
                  <span className="block text-[7.5px] text-zinc-650 mt-1">SENSORS SCANNING 2D FIELD BOUNDARIES</span>
                </div>
              ) : (
                <div className="w-full space-y-1.5 font-mono px-1">
                  {detectedItems.slice(0, 3).map((item) => {
                    const dist = Math.round(Math.sqrt((item.x - robotPos.x) ** 2 + (item.y - robotPos.y) ** 2));
                    let colorClass = "text-rose-400 border-rose-900/50 bg-rose-950/10";
                    if (item.type === "target") colorClass = "text-emerald-400 border-emerald-900/50 bg-emerald-950/10";
                    if (item.type === "pedestrian") colorClass = "text-orange-400 border-orange-950/50 bg-orange-950/10";
                    if (item.type === "charger") colorClass = "text-teal-400 border-teal-900/50 bg-teal-950/10";

                    return (
                      <div key={item.id} className={`p-1.5 rounded border ${colorClass} flex justify-between items-center text-[8.5px] leading-none`}>
                        <div className="space-y-0.5">
                          <span className="font-extrabold">{item.label}</span>
                          <span className="block text-[7px] opacity-70">CLASS: {item.type.toUpperCase()}</span>
                        </div>
                        <div className="text-right space-y-0.5 font-bold">
                          <span>RANGE: {dist}mm</span>
                          <span className="block text-[7px] opacity-90 text-cyan-400">DETECT OK ({useAIVision ? "99.4%" : "82%"})</span>
                        </div>
                      </div>
                    );
                  })}
                  {detectedItems.length > 3 && (
                    <div className="text-center text-[7.5px] text-slate-500 uppercase tracking-wider">
                      + {detectedItems.length - 3} more items in FOV registers
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Diagnostics matrix numbers bottom strip */}
            <div className="flex justify-between items-center text-[7.5px] pt-1.5 border-t border-white/5 mt-auto text-zinc-500">
              <span>FPS: 30.0</span>
              <span>FILTER: {useAIVision ? "NEURAL_CV" : "LIDAR_ECHO"}</span>
              <span>THETA: {headingAngle.toFixed(1)}°</span>
            </div>
          </div>
        </div>

        {/* Local parameter slider configurations */}
        <div className="bg-[#141416] border border-white/5 rounded-xl p-3.5 space-y-3.5 font-mono">
          <div className="text-[10px] uppercase font-extrabold tracking-wider text-purple-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Vision Vector Parameters</span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-400">Field Range (Range):</span>
              <span className="text-purple-300 font-bold">{scanRange} mm</span>
            </div>
            <input
              type="range"
              min="80"
              max="260"
              step="10"
              value={scanRange}
              onChange={(e) => setRobotDesign(prev => ({ ...prev, visionRange: parseInt(e.target.value) }))}
              className="w-full h-1 bg-black/60 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between text-[9px]">
              <span className="text-slate-400">Field of View (FOV):</span>
              <span className="text-purple-300 font-bold">{fovAngle} degrees</span>
            </div>
            <input
              type="range"
              min="30"
              max="180"
              step="10"
              value={fovAngle}
              onChange={(e) => setRobotDesign(prev => ({ ...prev, visionAngle: parseInt(e.target.value) }))}
              className="w-full h-1 bg-black/60 rounded appearance-none cursor-pointer accent-purple-500"
            />
          </div>

          {/* Model toggle and alerts */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] text-slate-300">Neural Sight Mapping Model:</span>
              <input
                type="checkbox"
                checked={useAIVision}
                onChange={(e) => setRobotDesign(prev => ({ ...prev, hasAIVisionModel: e.target.checked }))}
                className="h-3.5 w-3.5 rounded accent-purple-500 cursor-pointer"
              />
            </div>
            <p className="text-[8px] text-slate-550 leading-normal">
              Empowers deep classification logic inside the camera loop. Lower processing lag, high confidence indexes!
            </p>
          </div>
        </div>

        {/* Telemetry Console stream output */}
        <div className="flex-1 bg-[#09090b] rounded-xl border border-white/5 p-3 flex flex-col justify-between font-mono text-[8px] min-h-[105px] h-full shadow-lg">
          <div className="flex items-center justify-between text-[8px] border-b border-white/5 pb-1 mb-1.5">
            <span className="font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Sensor Lock Registers Feed</span>
            </span>
            <span className="text-slate-500">CON_SYS</span>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[110px] scrollbar-thin text-slate-350 pr-1">
            {emergencyBrakeActive && (
              <div className="bg-red-950/20 text-rose-400 font-black p-1 rounded border border-red-900/40 animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
                <span>[COLLISION ALARM] BRAKES ENGAGED. OBSTACLE SPOTTING &lt; 45mm</span>
              </div>
            )}
            {detectedItems.length === 0 ? (
              <div className="text-zinc-600 block">
                [06:56:34] Polling sweep... heading @ {headingAngle.toFixed(1)}° | 0 targets locked.
              </div>
            ) : (
              detectedItems.map((item, idx) => {
                const dist = Math.round(Math.sqrt((item.x - robotPos.x) ** 2 + (item.y - robotPos.y) ** 2));
                return (
                  <div key={`${item.id}-${idx}`} className="text-[#a7f3d0] leading-tight font-mono">
                    [{new Date().toLocaleTimeString().slice(0,8)}] <strong className="text-emerald-400">{item.type.toUpperCase()}_LOCKED</strong>: {item.name} at {dist}mm, heading diff: {Math.round(Math.atan2(item.y - robotPos.y, item.x - robotPos.x) * 180 / Math.PI - headingAngle)}°
                  </div>
                );
              })
            )}
            <div className="text-zinc-700 block italic">-- stream polling diagnostic tick active --</div>
          </div>
        </div>
      </div>
    </div>
  );
}
