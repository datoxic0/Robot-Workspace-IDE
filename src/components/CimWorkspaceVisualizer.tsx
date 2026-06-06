import React, { useState, useRef, useEffect } from "react";
import Markdown from "react-markdown";
import { RobotJoint, SimulationState, TargetPosition, CIMWorkpiece, RobotDesignConfig, CIMSortingStats, WorkspaceFile, TerminalLog } from "../types";
import { calculateForwardKinematics, solveInverseKinematics } from "../utils/kinematics";
import { Play, Square, Settings, Eye, HelpCircle, Activity, Box, Zap, Scale, BarChart2, ShieldAlert, CheckCircle2, RotateCcw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Sliders, Check, Hammer, Power, RefreshCw, Cpu, Sparkles } from "lucide-react";

interface CimWorkspaceVisualizerProps {
  joints: RobotJoint[];
  setJoints: React.Dispatch<React.SetStateAction<RobotJoint[]>>;
  simulationState: SimulationState;
  setSimulationState: React.Dispatch<React.SetStateAction<SimulationState>>;
  workpieces: CIMWorkpiece[];
  setWorkpieces: React.Dispatch<React.SetStateAction<CIMWorkpiece[]>>;
  robotDesign: RobotDesignConfig;
  sortingStats: CIMSortingStats;
  setSortingStats: React.Dispatch<React.SetStateAction<CIMSortingStats>>;
  feedMode: "random" | "red" | "green" | "blue" | "yellow";
  setFeedMode: React.Dispatch<React.SetStateAction<"random" | "red" | "green" | "blue" | "yellow">>;
  robotType: "articulated" | "scara" | "cartesian";
  setRobotType: React.Dispatch<React.SetStateAction<"articulated" | "scara" | "cartesian">>;
  conveyorSpeed: number;
  setConveyorSpeed: React.Dispatch<React.SetStateAction<number>>;
  obstacleHeight: number;
  setObstacleHeight: React.Dispatch<React.SetStateAction<number>>;
  sensorPositionX: number;
  setSensorPositionX: React.Dispatch<React.SetStateAction<number>>;
  activeFile?: WorkspaceFile;
  onFileChange?: (content: string) => void;
  setLogs?: React.Dispatch<React.SetStateAction<TerminalLog[]>>;
  onCollapse?: () => void;
}

export default function CimWorkspaceVisualizer({
  joints,
  setJoints,
  simulationState,
  setSimulationState,
  workpieces,
  setWorkpieces,
  robotDesign,
  sortingStats,
  setSortingStats,
  feedMode,
  setFeedMode,
  robotType,
  setRobotType,
  conveyorSpeed,
  setConveyorSpeed,
  obstacleHeight,
  setObstacleHeight,
  sensorPositionX,
  setSensorPositionX,
  activeFile,
  onFileChange,
  setLogs,
  onCollapse
}: CimWorkspaceVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [activeTab, setActiveTab] = useState<"viewport" | "mechanics" | "pendant">("viewport");

  // Teach Pendant States
  const [jogMode, setJogMode] = useState<"JOINT" | "CARTESIAN">("CARTESIAN");
  const [jogStepSize, setJogStepSize] = useState<number>(10);
  const [cmdMode, setCmdMode] = useState<"G01" | "G00" | "M05" | "M03" | "G04">("G01");
  const [suctionState, setSuctionState] = useState<boolean>(false);
  const [conveyorState, setConveyorState] = useState<boolean>(false);
  const [dwellMs, setDwellMs] = useState<number>(500);
  const [feedrate, setFeedrate] = useState<number>(1200);

  // Gemini AI Kinematics States
  const [isSolvingIK, setIsSolvingIK] = useState(false);
  const [ikResponse, setIkResponse] = useState<string>("");
  const [ikError, setIkError] = useState<string | null>(null);

  // Origin point of physical robot base inside SVG plane (600x400)
  const baseX = 300;
  const baseY = 290;

  // Compute Forward Kinematics absolute positions for drawing
  let points = calculateForwardKinematics(baseX, baseY, joints);

  if (robotType === "scara") {
    const postHeight = 110;
    const p0 = { x: baseX, y: baseY - postHeight }; // post head (300, 180)
    
    const rad1 = (joints[1].angle * Math.PI) / 180;
    const p1 = {
      x: p0.x + robotDesign.shoulderLength * Math.cos(rad1),
      y: p0.y + robotDesign.shoulderLength * Math.sin(rad1)
    };
    
    const rad2 = rad1 + (joints[2].angle * Math.PI) / 180;
    const p2 = {
      x: p1.x + robotDesign.elbowLength * Math.cos(rad2),
      y: p1.y + robotDesign.elbowLength * Math.sin(rad2)
    };
    
    // Joint 3 acts as the vertical plunge guideway quill
    const slide = 25 + ((joints[3].angle + 120) / 240) * 110;
    const p3 = {
      x: p2.x,
      y: p2.y + slide
    };
    
    points = [
      { x: baseX, y: baseY }, // mount base
      p0, // column head
      p1, // shoulder joint end
      p2, // elbow joint end
      p3  // end effector tool tip
    ];
  } else if (robotType === "cartesian") {
    const railY = 110;
    const carriageX = baseX + joints[1].angle * 1.45;
    
    const plungeHeight = 80 + ((joints[2].angle + 120) / 240) * 110;
    const plungeY = railY + plungeHeight;
    
    const p0 = { x: baseX, y: baseY }; // mount base reference
    const p1 = { x: carriageX, y: railY }; // carriage point on rail
    const p2 = { x: carriageX, y: plungeY }; // tool base plunging down
    const p3 = { x: carriageX, y: plungeY + 12 }; // gripper tip
    
    points = [p0, p1, p2, p3];
  }

  const endEffector = points[points.length - 1];

  // Map to Cartesian robot-coordinate coordinates relative to base (scaled to simulate mm)
  // Base is X=0, Y=0 (offset visually in SVG)
  const cartesianX = Math.round((endEffector.x - baseX) * 1.5);
  const cartesianY = Math.round((baseY - endEffector.y) * 1.5);

  const handleSolveKinematicsWithAI = async () => {
    setIsSolvingIK(true);
    setIkError(null);
    try {
      const prov = localStorage.getItem("robot_ai_provider") || "gemini";
      const key = prov === "openrouter" 
        ? localStorage.getItem("robot_ai_openrouter_key") || ""
        : localStorage.getItem("robot_ai_gemini_key") || "";
      const model = localStorage.getItem("robot_ai_model") || (prov === "openrouter" ? "google/gemini-2.5-flash:free" : "gemini-3.5-flash");

      const response = await fetch("/api/ai/kinematics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joints: joints.map(j => ({ id: j.id, name: j.name, angle: j.angle })),
          targetPosition: { x: cartesianX, y: cartesianY, z: 0 },
          apiProvider: prov,
          customApiKey: key,
          selectedModel: model
        })
      });
      if (!response.ok) {
        throw new Error(`Failed to calculate with status ${response.status}`);
      }
      const data = await response.json();
      setIkResponse(data.text || "No kinematics solution data returned.");
    } catch (err: any) {
      console.error(err);
      setIkError(err.message || "Error calling high-precision kinematic controller solver.");
    } finally {
      setIsSolvingIK(false);
    }
  };

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 380;

  // Real-time continuous O(1) collision checker
  const checkCollisionActive = () => {
    if (obstacleHeight <= 0) return false;
    
    for (let s = 0; s < points.length - 1; s++) {
      const pStart = points[s];
      const pEnd = points[s + 1];
      
      // Skip the base post from self-collision for Scara
      if (s === 0 && robotType !== "cartesian") continue;
      
      for (let t = 0; t <= 1; t += 0.1) {
        const sx = pStart.x + t * (pEnd.x - pStart.x);
        const sy = pStart.y + t * (pEnd.y - pStart.y);
        
        // Hazard safety containment is centered at X=215, width=20 (205 to 225)
        // Vertical range goes from baseY (310 conveyor level) up to 310 - obstacleHeight
        if (sx >= 205 && sx <= 225 && sy >= 325 - obstacleHeight && sy <= 325) {
          return true;
        }
      }
    }
    return false;
  };

  const isColliding = checkCollisionActive();

  // Target drag to solve Inverse Kinematics
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    // Check if user clicked near end effector coordinates or crosshair
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const dist = Math.hypot(x - endEffector.x, y - endEffector.y);

    if (dist < 40) { // Larger target grab box
      setIsDraggingTarget(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingTarget) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * svgHeight;

    if (robotType === "cartesian") {
      let carriageX = clickX;
      if (carriageX < 70) carriageX = 70;
      if (carriageX > 530) carriageX = 530;
      const targetJ1Angle = (carriageX - baseX) / 1.45;
      
      const railY = 110;
      let targetPlungeY = clickY - 12;
      if (targetPlungeY < railY + 80) targetPlungeY = railY + 80;
      if (targetPlungeY > railY + 190) targetPlungeY = railY + 190;
      
      const targetPlungeHeight = targetPlungeY - railY;
      const targetJ2Angle = ((targetPlungeHeight - 80) / 110) * 240 - 120;
      
      const nextJoints = joints.map((j) => {
        if (j.id === "shoulder") return { ...j, angle: Math.round(targetJ1Angle) };
        if (j.id === "elbow") return { ...j, angle: Math.round(targetJ2Angle) };
        return j;
      });
      setJoints(nextJoints);
      return;
    }

    if (robotType === "scara") {
      const postHeight = 110;
      const originX = baseX;
      const originY = baseY - postHeight; // (300, 180)
      
      const totalMaxReach = robotDesign.shoulderLength + robotDesign.elbowLength;
      let tx = clickX - originX;
      let ty = clickY - originY - 35; // adjust for wrist plunge guiding
      const dist = Math.hypot(tx, ty);
      
      if (dist > totalMaxReach) {
        tx *= (totalMaxReach / dist) * 0.98;
        ty *= (totalMaxReach / dist) * 0.98;
      }
      
      // Analytical SCARA planar forearm solver
      const l1 = robotDesign.shoulderLength;
      const l2 = robotDesign.elbowLength;
      const cosAngle2 = (tx * tx + ty * ty - l1 * l1 - l2 * l2) / (2 * l1 * l2);
      const sinAngle2 = Math.sqrt(Math.max(0, 1 - cosAngle2 * cosAngle2));
      const angle2Rad = Math.atan2(sinAngle2, cosAngle2);
      
      const k1 = l1 + l2 * cosAngle2;
      const k2 = l2 * sinAngle2;
      const angle1Rad = Math.atan2(ty, tx) - Math.atan2(k2, k1);
      
      const a1Deg = (angle1Rad * 180) / Math.PI;
      const a2Deg = (angle2Rad * 180) / Math.PI;
      
      const currentPlungeY = clickY - (originY + robotDesign.shoulderLength * Math.sin(angle1Rad) + robotDesign.elbowLength * Math.sin(angle1Rad + angle2Rad));
      const targetJ3Angle = ((currentPlungeY - 25) / 110) * 240 - 120;
      
      const nextJoints = joints.map((j) => {
        if (j.id === "shoulder") {
          const bonded = Math.max(j.minAngle, Math.min(a1Deg, j.maxAngle));
          return { ...j, angle: Math.round(bonded * 10) / 10 };
        }
        if (j.id === "elbow") {
          const bonded = Math.max(j.minAngle, Math.min(a2Deg, j.maxAngle));
          return { ...j, angle: Math.round(bonded * 10) / 10 };
        }
        if (j.id === "wrist") {
          const bonded = Math.max(j.minAngle, Math.min(targetJ3Angle, j.maxAngle));
          return { ...j, angle: Math.round(bonded * 10) / 10 };
        }
        return j;
      });
      setJoints(nextJoints);
      return;
    }

    // Standard Articulated
    const distToClick = Math.hypot(clickX - baseX, clickY - baseY);
    const totalMaxReach = joints.slice(1).reduce((sum, j) => sum + j.length, 0);
    
    let targetX = clickX;
    let targetY = clickY;

    if (distToClick > totalMaxReach) {
      const ratio = totalMaxReach / distToClick;
      targetX = baseX + (clickX - baseX) * ratio * 0.98;
      targetY = baseY + (clickY - baseY) * ratio * 0.98;
    }

    const solvedJoints = solveInverseKinematics(baseX, baseY, joints, { x: targetX, y: targetY });
    setJoints(solvedJoints);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingTarget) {
      setIsDraggingTarget(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const resolveKinematicsForPoint = (targetX: number, targetY: number) => {
    if (robotType === "cartesian") {
      let carriageX = targetX;
      if (carriageX < 70) carriageX = 70;
      if (carriageX > 530) carriageX = 530;
      const targetJ1Angle = (carriageX - baseX) / 1.45;
      
      const railY = 110;
      let targetPlungeY = targetY - 12;
      if (targetPlungeY < railY + 80) targetPlungeY = railY + 80;
      if (targetPlungeY > railY + 190) targetPlungeY = railY + 190;
      
      const targetPlungeHeight = targetPlungeY - railY;
      const targetJ2Angle = ((targetPlungeHeight - 80) / 110) * 240 - 120;
      
      const nextJoints = joints.map((j) => {
        if (j.id === "shoulder") return { ...j, angle: Math.round(targetJ1Angle) };
        if (j.id === "elbow") return { ...j, angle: Math.round(targetJ2Angle) };
        return j;
      });
      setJoints(nextJoints);
      return;
    }

    if (robotType === "scara") {
      const postHeight = 110;
      const originX = baseX;
      const originY = baseY - postHeight; // (300, 180)
      
      const totalMaxReach = robotDesign.shoulderLength + robotDesign.elbowLength;
      let tx = targetX - originX;
      let ty = targetY - originY - 35; // adjust for wrist plunge guiding
      const dist = Math.hypot(tx, ty);
      
      if (dist > totalMaxReach) {
        tx *= (totalMaxReach / dist) * 0.98;
        ty *= (totalMaxReach / dist) * 0.98;
      }
      
      const l1 = robotDesign.shoulderLength;
      const l2 = robotDesign.elbowLength;
      const cosAngle2 = (tx * tx + ty * ty - l1 * l1 - l2 * l2) / (2 * l1 * l2);
      const sinAngle2 = Math.sqrt(Math.max(0, 1 - cosAngle2 * cosAngle2));
      const angle2Rad = Math.atan2(sinAngle2, cosAngle2);
      
      const k1 = l1 + l2 * cosAngle2;
      const k2 = l2 * sinAngle2;
      const angle1Rad = Math.atan2(ty, tx) - Math.atan2(k2, k1);
      
      const a1Deg = (angle1Rad * 180) / Math.PI;
      const a2Deg = (angle2Rad * 180) / Math.PI;
      
      const currentPlungeY = targetY - (originY + robotDesign.shoulderLength * Math.sin(angle1Rad) + robotDesign.elbowLength * Math.sin(angle1Rad + angle2Rad));
      const targetJ3Angle = ((currentPlungeY - 25) / 110) * 240 - 120;
      
      const nextJoints = joints.map((j) => {
        if (j.id === "shoulder") {
          const bonded = Math.max(j.minAngle, Math.min(a1Deg, j.maxAngle));
          return { ...j, angle: Math.round(bonded * 10) / 10 };
        }
        if (j.id === "elbow") {
          const bonded = Math.max(j.minAngle, Math.min(a2Deg, j.maxAngle));
          return { ...j, angle: Math.round(bonded * 10) / 10 };
        }
        if (j.id === "wrist") {
          const bonded = Math.max(j.minAngle, Math.min(targetJ3Angle, j.maxAngle));
          return { ...j, angle: Math.round(bonded * 10) / 10 };
        }
        return j;
      });
      setJoints(nextJoints);
      return;
    }

    // Standard Articulated
    const distToClick = Math.hypot(targetX - baseX, targetY - baseY);
    const totalMaxReach = joints.slice(1).reduce((sum, j) => sum + j.length, 0);
    
    let targetX_ok = targetX;
    let targetY_ok = targetY;

    if (distToClick > totalMaxReach) {
      const ratio = totalMaxReach / distToClick;
      targetX_ok = baseX + (targetX - baseX) * ratio * 0.98;
      targetY_ok = baseY + (targetY - baseY) * ratio * 0.98;
    }

    const solvedJoints = solveInverseKinematics(baseX, baseY, joints, { x: targetX_ok, y: targetY_ok });
    setJoints(solvedJoints);
  };

  const jogAxis = (axisId: string, dir: number) => {
    const step = jogStepSize * dir;
    if (jogMode === "JOINT") {
      setJoints(prev => prev.map(j => {
        if (j.id === axisId) {
          let nAngle = j.angle + step;
          nAngle = Math.max(j.minAngle, Math.min(j.maxAngle, nAngle));
          return { ...j, angle: Math.round(nAngle * 10) / 10 };
        }
        return j;
      }));
    } else {
      let curX = endEffector.x;
      let curY = endEffector.y;
      
      if (axisId === "X") {
        curX += (step / 1.5);
      } else if (axisId === "Z") {
        curY -= (step / 1.5);
      } else if (axisId === "B") {
        setJoints(prev => prev.map(j => {
          if (j.id === "base") {
            let n = j.angle + step;
            n = Math.max(j.minAngle, Math.min(j.maxAngle, n));
            return { ...j, angle: Math.round(n * 10) / 10 };
          }
          return j;
        }));
        return;
      } else if (axisId === "A") {
        setJoints(prev => prev.map(j => {
          if (j.id === "wrist") {
            let n = j.angle + step;
            n = Math.max(j.minAngle, Math.min(j.maxAngle, n));
            return { ...j, angle: Math.round(n * 10) / 10 };
          }
          return j;
        }));
        return;
      }
      
      resolveKinematicsForPoint(curX, curY);
    }
  };

  const getCommandPreview = () => {
    const fileLang = activeFile?.language || "gcode";
    
    const jBase = Math.round(joints[0].angle);
    const jShoulder = Math.round(joints[1].angle);
    const jElbow = Math.round(joints[2].angle);
    const jWrist = Math.round(joints[3].angle);

    if (cmdMode === "G01" || cmdMode === "G00") {
      if (fileLang === "gcode") {
        return `${cmdMode} X${cartesianX} Z${cartesianY} A${jWrist} B${jBase} F${feedrate}`;
      } else if (fileLang === "arduino") {
        return `moveJoints(${jBase}, ${jShoulder}, ${jElbow}, ${jWrist}); // Joint Jog Target`;
      } else if (fileLang === "cim_script") {
        return `MOVE_JOINT 1 TO ${jBase} DEGREES`;
      } else {
        return `move_joints(${jBase}, ${jShoulder}, ${jElbow}, ${jWrist}) # Joint Jog Target`;
      }
    }
    
    if (cmdMode === "M05") {
      if (fileLang === "gcode") {
        return `M05 P${suctionState ? 1 : 0}`;
      } else if (fileLang === "arduino") {
        return `digitalWrite(3, ${suctionState ? "HIGH" : "LOW"}); // Actuate Vacuum Solenoid`;
      } else if (fileLang === "cim_script") {
        return suctionState ? "ENGAGE_GRIPPER()" : "RELEASE_GRIPPER()";
      } else {
        return `suction_solenoid(${suctionState ? "True" : "False"})`;
      }
    }
    
    if (cmdMode === "M03") {
      if (fileLang === "gcode") {
        return `M03 S${conveyorState ? 1 : 0}`;
      } else if (fileLang === "arduino") {
        return `digitalWrite(4, ${conveyorState ? "HIGH" : "LOW"}); // Conveyor motor relay`;
      } else if (fileLang === "cim_script") {
        return conveyorState ? "START_CONVEYOR()" : "STOP_CONVEYOR()";
      } else {
        return `conveyor_motor(${conveyorState ? "True" : "False"})`;
      }
    }
    
    if (cmdMode === "G04") {
      if (fileLang === "gcode") {
        return `G04 P${dwellMs}`;
      } else if (fileLang === "arduino") {
        return `delay(${dwellMs});`;
      } else if (fileLang === "cim_script") {
        return `WAIT ${dwellMs}`;
      } else {
        return `time.sleep_ms(${dwellMs})`;
      }
    }
    
    return "";
  };

  const handleTeachPoint = (previewText: string) => {
    if (!activeFile || !onFileChange) return;
    const currentContent = activeFile.content;
    const separator = currentContent.endsWith("\n") || currentContent === "" ? "" : "\n";
    const nextContent = currentContent + separator + previewText + "\n";
    onFileChange(nextContent);

    if (setLogs) {
      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          type: "success",
          text: `[Teach Pendant] Inserted command => "${previewText}" into workspace active file.`,
          timestamp
        }
      ]);
    }
  };

  // Convert workpiece positions and status dynamically using custom sensorPositionX
  const sensorTriggered = workpieces.some(wp => wp.positionX >= sensorPositionX - 10 && wp.positionX <= sensorPositionX + 10 && wp.status === "approaching");

  // Dynamic values calculation for diagnostics screen
  const jointTorques = joints.map((j, idx) => {
    if (idx === 0) return 3.4; // Base gravity invariant torque
    const distanceToEffector = joints.slice(idx).reduce((sum, current) => sum + current.length, 0);
    // Rough estimate of torque required: mass * distance * sin(angle)
    const torque = Math.abs(robotDesign.payloadWeight * 9.8 * (distanceToEffector / 100) * Math.sin((j.angle * Math.PI) / 180));
    return parseFloat(torque.toFixed(2));
  });

  const aggregatePowerW = Math.round(
    12 + // Idle consumption
    (simulationState.conveyorRunning ? 24 : 0) + 
    jointTorques.reduce((sum, val) => sum + val * 4.5, 0)
  );

  return (
    <div id="cim-visualizer-card" className="bg-[#1a1a1e] border border-white/5 rounded overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Title block & Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#141417] border-b border-white/5 shrink-0">
        <div className="flex items-center space-x-2.5">
          <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
          <span className="font-mono text-xs font-semibold text-slate-200 tracking-tight">SYS_VIEW_CIM</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono leading-none border ${
            simulationState.status === "running" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_8px_rgba(34,197,94,0.3)]" :
            simulationState.status === "paused" ? "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.2)]" :
            simulationState.status === "compiling" ? "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse" :
            simulationState.status === "error" ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.3)] animate-bounce" :
            "bg-[#0d0d0f] text-slate-500 border-white/5"
          }`}>
            {simulationState.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-[#0d0d0f] p-0.5 rounded border border-white/5">
            <button
              onClick={() => setActiveTab("viewport")}
              className={`px-2 py-0.5 font-mono text-[10px] rounded transition-colors ${
                activeTab === "viewport" ? "bg-blue-600 text-white font-medium" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Workspace
            </button>
            <button
              onClick={() => setActiveTab("pendant")}
              className={`px-2 py-0.5 font-mono text-[10px] rounded transition-colors relative flex items-center space-x-1 ${
                activeTab === "pendant" ? "bg-red-600 text-white font-medium" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span>Pendant</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            </button>
            <button
              onClick={() => setActiveTab("mechanics")}
              className={`px-2 py-0.5 font-mono text-[10px] rounded transition-colors ${
                activeTab === "mechanics" ? "bg-blue-600 text-white font-medium" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Stress
            </button>
          </div>
          <div className="flex items-center space-x-1 border-l border-white/5 pl-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Grid Lines"
              className={`p-1 rounded transition-colors ${showGrid ? "text-blue-400 bg-[#0d0d0f]" : "text-slate-600 hover:text-slate-300"}`}
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowAngles(!showAngles)}
              title="Toggle Angle Guides"
              className={`p-1 rounded transition-colors ${showAngles ? "text-blue-400 bg-[#0d0d0f]" : "text-slate-600 hover:text-slate-300"}`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            {onCollapse && (
              <button
                onClick={onCollapse}
                title="Collapse Visualizer Panel"
                className="p-1 rounded transition-colors text-slate-600 hover:text-rose-400 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === "viewport" ? (
        <div className="relative flex-1 bg-[#0d0d0f] flex flex-col items-center justify-center p-2 group select-none">
          {/* Interactive Canvas Grid */}
          <svg
            id="simulation-svg-viewport"
            ref={svgRef}
            className="w-full h-full max-h-[380px] bg-gradient-to-b from-[#141417] to-[#0d0d0f] rounded cursor-crosshair touch-none"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Background CAD Grid */}
            {showGrid && (
              <g id="grid-lines">
                {Array.from({ length: 12 }).map((_, i) => (
                  <line
                    key={`v-${i}`}
                    x1={i * 50}
                    y1={0}
                    x2={i * 50}
                    y2={svgHeight}
                    stroke="#1e1e23"
                    strokeWidth="1"
                    strokeDasharray={i * 50 === baseX ? "" : "3,3"}
                  />
                ))}
                {Array.from({ length: 8 }).map((_, i) => (
                  <line
                    key={`h-${i}`}
                    x1={0}
                    y1={i * 50}
                    x2={svgWidth}
                    y2={i * 50}
                    stroke="#1e1e23"
                    strokeWidth="1"
                    strokeDasharray={i * 50 === baseY ? "" : "3,3"}
                  />
                ))}
              </g>
            )}

            {/* Workplace conveyor assembly (Horizontal) */}
            <g id="conveyor-belt-assembly">
              {/* Ground level support beam */}
              <rect x="0" y="325" width={svgWidth} height="55" fill="#141417" opacity="0.9" />
              <line x1="0" y1="325" x2={svgWidth} y2="325" stroke="#1e1e23" strokeWidth="2" />
              
              {/* Conveyor path bar */}
              <rect x="40" y="310" width="480" height="15" fill="#1e1e23" rx="2" stroke="#ffffff/10" strokeWidth="1" />
              <g id="spinning-wheels">
                <circle cx="50" cy="317.5" r="5" fill="#3f3f46" />
                <circle cx="125" cy="317.5" r="5" fill="#3f3f46" />
                <circle cx="280" cy="317.5" r="5" fill="#3f3f46" />
                <circle cx="510" cy="317.5" r="5" fill="#3f3f46" />
              </g>

              {/* Infinite moving surface pattern hashes */}
              <g id="conveyor-moving-stripes" clipPath="url(#conveyor-clip)">
                {Array.from({ length: 24 }).map((_, i) => {
                  const xOffset = simulationState.conveyorRunning 
                    ? ((simulationState.blockPosition * 4.8) % 20) 
                    : 0;
                  return (
                    <line
                      key={`strip-${i}`}
                      x1={40 + i * 20 + xOffset}
                      y1="310"
                      x2={30 + i * 20 + xOffset}
                      y2="325"
                      stroke="#27272a"
                      strokeWidth="3"
                    />
                  );
                })}
              </g>

            </g>

            {/* Bins Rack (4 stations color-coded to collect components) */}
            <g id="assembly-glass-slots" opacity="0.9">
              {/* Blue Storage Slot */}
              <rect x="375" y="295" width="30" height="15" fill="#1e3a8a" fillOpacity="0.2" rx="1.5" stroke="#3b82f6" strokeWidth="1" />
              <text x="390" y="290" textAnchor="middle" fill="#60a5fa" fontSize="6.5" fontFamily="monospace" fontWeight="bold">BLUE</text>
              <line x1="390" y1="295" x2="390" y2="310" stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.4" />

              {/* Green Storage Slot */}
              <rect x="415" y="295" width="30" height="15" fill="#064e3b" fillOpacity="0.2" rx="1.5" stroke="#10b981" strokeWidth="1" />
              <text x="430" y="290" textAnchor="middle" fill="#34d399" fontSize="6.5" fontFamily="monospace" fontWeight="bold">GREEN</text>
              <line x1="430" y1="295" x2="430" y2="310" stroke="#10b981" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.4" />

              {/* Red Storage Slot */}
              <rect x="455" y="295" width="30" height="15" fill="#7f1d1d" fillOpacity="0.2" rx="1.5" stroke="#ef4444" strokeWidth="1" />
              <text x="470" y="290" textAnchor="middle" fill="#f87171" fontSize="6.5" fontFamily="monospace" fontWeight="bold">RED</text>
              <line x1="470" y1="295" x2="470" y2="310" stroke="#ef4444" strokeWidth="0.75" strokeDasharray="2,2" opacity="0.4" />

              {/* Reject / Yellow Stripe Slot */}
              <rect x="495" y="295" width="30" height="15" fill="#78350f" fillOpacity="0.2" rx="1.5" stroke="#fbbf24" strokeWidth="1" />
              <text x="510" y="290" textAnchor="middle" fill="#fbbf24" fontSize="6.5" fontFamily="monospace" fontWeight="bold">REJECT</text>
              <line x1="497" y1="310" x2="503" y2="295" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
              <line x1="507" y1="310" x2="513" y2="295" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
              <line x1="517" y1="310" x2="523" y2="295" stroke="#fbbf24" strokeWidth="1" opacity="0.4" />
            </g>

            {/* Workpieces moving on conveyor */}
            {workpieces.map((wp) => {
              // Draw moving workpiece box
              // If status is "picked", bind coordinates to endEffector tip!
              const size = 16;
              const wX = wp.status === "picked" ? endEffector.x - size / 2 : wp.positionX;
              const wY = wp.status === "picked" ? endEffector.y + 4 : 310 - size;

              return (
                <g key={wp.id} id={`wp-${wp.id}`}>
                  <rect
                    x={wX}
                    y={wY}
                    width={size}
                    height={size}
                    fill={wp.color === "red" ? "#ef4444" : wp.color === "green" ? "#22c55e" : wp.color === "blue" ? "#3b82f6" : "#fbbf24"}
                    rx="1"
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-all duration-75"
                  />
                  {/* Package target graphic details */}
                  <line x1={wX} y1={wY + 8} x2={wX + size} y2={wY + 8} stroke="#09090b" opacity="0.3" strokeWidth="2" />
                  <line x1={wX + 8} y1={wY} x2={wX + 8} y2={wY + size} stroke="#09090b" opacity="0.3" strokeWidth="2" />
                </g>
              );
            })}

            {/* ROBOT ASSEMBLY STRUCTURE (SVG PATHS & G-BLOCK) */}
            <g id="robotic-arm-joints-graphics">
              {/* --- ARTICULATED ROBOT DRAWINGS --- */}
              {robotType === "articulated" && (
                <g id="articulated-linkages-drawing">
                  {/* Ground turntable mounting frame box */}
                  <path d="M 270 325 L 330 325 L 315 290 L 285 290 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                  <circle cx={baseX} cy={baseY} r="18" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
                  <text x={baseX - 16} y={baseY + 4} fill="#a1a1aa" fontSize="9" fontFamily="monospace" fontWeight="bold">J1</text>

                  {joints.slice(1).map((joint, idx) => {
                    const startPt = points[idx];
                    const endPt = points[idx + 1];
                    const linkWidth = 14 - idx * 2.5;

                    return (
                      <g key={joint.id}>
                        {/* Shadow / Glow line */}
                        <line
                          x1={startPt.x}
                          y1={startPt.y}
                          x2={endPt.x}
                          y2={endPt.y}
                          stroke={joint.color}
                          strokeWidth={linkWidth + 4}
                          strokeLinecap="round"
                          opacity="0.12"
                        />
                        {/* Primary structural solid arm link armatures */}
                        <line
                          x1={startPt.x}
                          y1={startPt.y}
                          x2={endPt.x}
                          y2={endPt.y}
                          stroke={`url(#linkGradient-${idx})`}
                          strokeWidth={linkWidth}
                          strokeLinecap="round"
                        />
                        
                        {/* Neon Joint Center Dot */}
                        <circle cx={startPt.x} cy={startPt.y} r={linkWidth * 0.7} fill="#18181b" stroke={joint.color} strokeWidth="2" />
                        <circle cx={startPt.x} cy={startPt.y} r={2} fill={joint.color} />

                        {showAngles && idx >= 0 && (
                          <g className="opacity-75">
                            <text
                              x={startPt.x + 14}
                              y={startPt.y - 10}
                              fill={joint.color}
                              fontSize="9"
                              fontFamily="monospace"
                              fontWeight="semibold"
                            >
                              {joint.name.split(" ")[0]}: {joint.angle}°
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* --- SCARA ROBOT DRAWINGS --- */}
              {robotType === "scara" && points.length >= 5 && (
                <g id="scara-linkages-drawing">
                  {/* Ground turntable mounting frame box anchoring SCARA column */}
                  <path d="M 270 325 L 330 325 L 315 290 L 285 290 Z" fill="#18181b" stroke="#3f3f46" strokeWidth="2" />
                  <circle cx={baseX} cy={baseY} r="18" fill="#09090b" stroke="#3f3f46" strokeWidth="2" />
                  <text x={baseX - 16} y={baseY + 4} fill="#a1a1aa" fontSize="9" fontFamily="monospace" fontWeight="bold">J1</text>

                  {/* Vertical metal guide column support cylinder */}
                  <rect x="290" y="180" width="20" height="110" fill="#1f2937" rx="1.5" stroke="#4b5563" strokeWidth="2" />
                  <line x1="300" y1="180" x2="300" y2="290" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3,4" opacity="0.4" />
                  <ellipse cx="300" cy="180" rx="10" ry="4" fill="#374151" />

                  {/* Shoulder link: column head points[1] to elbow mount points[2] */}
                  <g>
                    <line x1={points[1].x} y1={points[1].y} x2={points[2].x} y2={points[2].y} stroke="#3b82f6" strokeWidth="14" strokeLinecap="round" opacity="0.15" />
                    <line x1={points[1].x} y1={points[1].y} x2={points[2].x} y2={points[2].y} stroke="url(#scaraJoint1)" strokeWidth="10" strokeLinecap="round" />
                    <circle cx={points[1].x} cy={points[1].y} r="8" fill="#111827" stroke="#3b82f6" strokeWidth="1.5" />
                  </g>

                  {/* Forearm elbow link: points[2] to quill spline head points[3] */}
                  <g>
                    <line x1={points[2].x} y1={points[2].y} x2={points[3].x} y2={points[3].y} stroke="#10b981" strokeWidth="10" strokeLinecap="round" opacity="0.15" />
                    <line x1={points[2].x} y1={points[2].y} x2={points[3].x} y2={points[3].y} stroke="url(#scaraJoint2)" strokeWidth="7" strokeLinecap="round" />
                    <circle cx={points[2].x} cy={points[2].y} r="6.5" fill="#111827" stroke="#10b981" strokeWidth="1.5" />
                  </g>

                  {/* Telescoping quill ball screw splines plunge J3: points[3] down to tool tip points[4] */}
                  <g>
                    {/* Inner high-polish metal telescoping piston shafts */}
                    <line x1={points[3].x} y1={points[3].y} x2={points[4].x} y2={points[4].y} stroke="#e4e4e7" strokeWidth="4.5" strokeLinecap="square" />
                    <line x1={points[3].x - 1.2} y1={points[3].y} x2={points[3].x - 1.2} y2={points[4].y} stroke="#ffffff" strokeWidth="1" />
                    {/* Helical spiral ball-screw threads lines */}
                    <line x1={points[3].x - 2} y1={points[3].y + 6} x2={points[3].x + 2} y2={points[3].y + 8} stroke="#71717a" strokeWidth="1.2" />
                    <line x1={points[3].x - 2} y1={points[3].y + 12} x2={points[3].x + 2} y2={points[3].y + 14} stroke="#71717a" strokeWidth="1.2" />
                    <line x1={points[3].x - 2} y1={points[3].y + 18} x2={points[3].x + 2} y2={points[3].y + 20} stroke="#71717a" strokeWidth="1.2" />
                    
                    {/* Outer drive head box collar */}
                    <rect x={points[3].x - 7} y={points[3].y - 3} width="14" height="9" fill="#374151" rx="1" stroke="#4b5563" strokeWidth="0.75" />
                  </g>

                  {showAngles && (
                    <g className="text-[8.5px] font-mono opacity-85">
                      <text x={points[1].x + 12} y={points[1].y - 4} fill="#3b82f6" fontWeight="bold">J1: {joints[1].angle}°</text>
                      <text x={points[2].x + 12} y={points[2].y - 4} fill="#10b981" fontWeight="bold">J2: {joints[2].angle}°</text>
                      <text x={points[3].x + 12} y={points[3].y - 6} fill="#f59e0b" fontWeight="bold">J3_PLG: {joints[3].angle}°</text>
                    </g>
                  )}
                </g>
              )}

              {/* --- CARTESIAN GANTRY SYSTEM DRAWINGS --- */}
              {robotType === "cartesian" && points.length >= 4 && (
                <g id="cartesian-linkages-drawing">
                  {/* Left robust steel truss lattice support column */}
                  <rect x="35" y="110" width="12" height="215" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
                  <line x1="35" y1="110" x2="47" y2="135" stroke="#374151" strokeWidth="1" />
                  <line x1="35" y1="160" x2="47" y2="185" stroke="#374151" strokeWidth="1" />
                  <line x1="35" y1="210" x2="47" y2="235" stroke="#374151" strokeWidth="1" />
                  <line x1="35" y1="260" x2="47" y2="285" stroke="#374151" strokeWidth="1" />

                  {/* Right robust steel truss lattice support column */}
                  <rect x="553" y="110" width="12" height="215" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
                  <line x1="565" y1="110" x2="553" y2="135" stroke="#374151" strokeWidth="1" />
                  <line x1="565" y1="160" x2="553" y2="185" stroke="#374151" strokeWidth="1" />
                  <line x1="565" y1="210" x2="553" y2="235" stroke="#374151" strokeWidth="1" />
                  <line x1="565" y1="260" x2="553" y2="285" stroke="#374151" strokeWidth="1" />

                  {/* Horizontal overhead linear guide rails structural beam */}
                  <rect x="35" y="100" width="530" height="12" fill="#2d2d34" stroke="#4b5563" strokeWidth="1.5" />
                  {/* Toothed slide rack gears */}
                  <line x1="45" y1="106" x2="555" y2="106" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4,3" opacity="0.55" />

                  {/* Carriage slide block box */}
                  <rect x={points[1].x - 16} y={points[1].y - 5} width="32" height="13" fill="#3b82f6" rx="2.5" stroke="#ffffff" strokeWidth="1.2" className="shadow-lg" />
                  <circle cx={points[1].x} cy={points[1].y + 1} r="3" fill="#09090b" stroke="#60a5fa" strokeWidth="1" />

                  {/* Vertical plunging piston guide rail segment */}
                  <line x1={points[1].x} y1={points[1].y + 8} x2={points[2].x} y2={points[2].y} stroke="#10b981" strokeWidth="5.5" strokeLinecap="square" />
                  <line x1={points[1].x - 1.2} y1={points[1].y + 8} x2={points[2].x - 1.2} y2={points[2].y} stroke="#ffffff" strokeWidth="1" opacity="0.8" />
                  <rect x={points[2].x - 8} y={points[2].y - 4} width="16" height="8" fill="#4b5563" rx="1" />

                  {showAngles && (
                    <g className="text-[8.5px] font-mono opacity-85">
                      <text x={points[1].x - 30} y={points[1].y - 12} fill="#3b82f6" fontWeight="bold">J1_X: {joints[1].angle}°</text>
                      <text x={points[2].x + 12} y={points[2].y - 12} fill="#10b981" fontWeight="bold">J2_Z_PLG: {joints[2].angle}°</text>
                    </g>
                  )}
                </g>
              )}

              {/* --- PARAMETERIZED DESIGNED END-EFFECTOR TOOL HOODS --- */}
              <g id="gripper-claw-tool" transform={`translate(${endEffector.x}, ${endEffector.y}) rotate(${(joints[joints.length - 1].angle)})`}>
                
                {/* TOOL 1: STANDARD CLAW GRIPPER */}
                {robotDesign.endEffectorType === "gripper" && (
                  <g id="claw-pneumatics-assembly">
                    <rect x="-7" y="-2" width="14" height="6" fill="#4b5563" rx="1.5" stroke="#374151" strokeWidth="1" />
                    
                    {/* Left mechanical claw fingers */}
                    <path
                      d={simulationState.hasBlock ? "M -5 3 Q -10 11 -3 17" : "M -5 3 Q -14 11 -7 17"}
                      fill="none"
                      stroke="#e4e4e7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Right mechanical claw fingers */}
                    <path
                      d={simulationState.hasBlock ? "M 5 3 Q 10 11 3 17" : "M 5 3 Q 14 11 7 17"}
                      fill="none"
                      stroke="#e4e4e7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    
                    {/* Diagnostic LED */}
                    <circle cx="0" cy="1" r="2.5" fill={simulationState.hasBlock ? "#ef4444" : "#22c55e"} />
                  </g>
                )}

                {/* TOOL 2: VACUUM SUCTION COMPRESSOR */}
                {robotDesign.endEffectorType === "suction" && (
                  <g id="suction-bellows-nozzle">
                    {/* Solid core bracket */}
                    <rect x="-5" y="-1" width="10" height="4" fill="#52525b" stroke="#3f3f46" strokeWidth="1" />
                    {/* Corrugated rubber bellows syringes */}
                    <path d="M -4 3 L 4 3 L 2 6 L -2 6 Z" fill="#27272a" stroke="#18181b" strokeWidth="0.5" />
                    <path d="M -3 6 L 3 6 L 1.5 9 L -1.5 9 Z" fill="#27272a" stroke="#18181b" strokeWidth="0.5" />
                    <path d="M -2 9 L 2 9 L 1.2 12 L -1.2 12 Z" fill="#18181b" />
                    
                    {/* Soft wide vinyl silicone suction cup head */}
                    <path d="M -7 11 C -4 11 -6 16 -8 16 L 8 16 C 6 16 4 11 7 11 Z" fill="#2563eb" fillOpacity="0.85" />

                    {/* Diagnostic suction pressure ring */}
                    <circle cx="0" cy="1" r="2" fill={simulationState.hasBlock ? "#ef4444" : "#22c55e"} />
                  </g>
                )}

                {/* TOOL 3: ELECTRIC ARC DISCHARGE WELDER */}
                {robotDesign.endEffectorType === "welder" && (
                  <g id="welder-electrode-needle">
                    {/* Heavy gauge shroud barrel */}
                    <path d="M -5 -1 L 5 -1 L 2 8 L -2 8 Z" fill="#3f3f46" stroke="#27272a" />
                    {/* Pure copper collar ring */}
                    <rect x="-2" y="7" width="4" height="2.5" fill="#ca8a04" />
                    {/* Pointed tungsten arc torch needle electrode rod */}
                    <line x1="0" y1="9.5" x2="0" y2="18" stroke="#d4d4d8" strokeWidth="1.5" strokeLinecap="round" />
                    
                    {/* Flashing high-frequency arc weld fire sparks */}
                    {simulationState.hasBlock && (
                      <g className="animate-pulse">
                        <line x1="0" y1="18" x2="-6" y2="23" stroke="#fef08a" strokeWidth="1" />
                        <line x1="0" y1="18" x2="5" y2="24" stroke="#fef08a" strokeWidth="1" />
                        <line x1="0" y1="18" x2="-1" y2="26" stroke="#fbbf24" strokeWidth="1.2" />
                        <circle cx="0" cy="18" r="3.5" fill="#fef08a" opacity="0.75" />
                        <circle cx="0" cy="18" r="1.5" fill="#ffffff" />
                      </g>
                    )}
                  </g>
                )}
              </g>
            </g>

            {/* INVERSE KINEMATICS ACTIVE GRAB INDICATOR & DYNAMIC TRAILING LINE */}
            <g id="interaction-target-crosshair">
              {/* Floating target locator dot */}
              <circle
                cx={endEffector.x}
                cy={endEffector.y}
                r="18"
                fill="none"
                stroke={isDraggingTarget ? "#f59e0b" : isColliding ? "#ef4444" : "#3b82f6"}
                strokeWidth="1.5"
                strokeDasharray="3,2"
                className={`transition-all duration-75 ${isDraggingTarget ? "scale-110 opacity-100" : "opacity-80 group-hover:opacity-100"}`}
              />
              <circle
                cx={endEffector.x}
                cy={endEffector.y}
                r="3"
                fill={isDraggingTarget ? "#f59e0b" : isColliding ? "#ef4444" : "#3b82f6"}
              />
              <line x1={endEffector.x - 24} y1={endEffector.y} x2={endEffector.x + 24} y2={endEffector.y} stroke={isDraggingTarget ? "#f59e0b" : isColliding ? "#ef4444" : "#3b82f6"} strokeWidth="1" opacity="0.4" />
              <line x1={endEffector.x} y1={endEffector.y - 24} x2={endEffector.x} y2={endEffector.y + 24} stroke={isDraggingTarget ? "#f59e0b" : isColliding ? "#ef4444" : "#3b82f6"} strokeWidth="1" opacity="0.4" />
            </g>

            {/* PHYSICAL SAFETY SHIELD BARRIER */}
            {obstacleHeight > 0 && (
              <g id="containment-hazard-fence">
                {/* Hazard base foundation */}
                <rect x="205" y={325 - obstacleHeight} width="20" height={obstacleHeight} fill="url(#hazardStripe)" stroke="#fbbf24" strokeWidth="1.5" />
                {/* Laser sensor glow on coordinate fence boundary */}
                <line x1="215" y1="0" x2="215" y2="325" stroke="#ef4444" strokeWidth="1" strokeDasharray="5,15" opacity="0.3" />
                {/* Laser transmitter guard top */}
                <rect x="211" y={320 - obstacleHeight} width="8" height="6" fill="#1f2937" rx="0.5" />
                <circle cx="215" cy={323 - obstacleHeight} r="1.5" fill="#ef4444" className="animate-ping" />
                {/* Hazard boundary labeling */}
                <text x="215" y={312 - obstacleHeight} fill="#fbbf24" fontSize="6.5" fontFamily="monospace" textAnchor="middle" fontWeight="bold">SEC_BARRIER</text>
              </g>
            )}

            {/* COLLISION ALERT FLASHING OVERLAY ZONE */}
            {isColliding && (
              <g id="collision-emergency-trip" className="animate-pulse">
                <rect x="10" y="10" width="580" height="30" fill="#7f1d1d" fillOpacity="0.8" rx="2" stroke="#ef4444" strokeWidth="1.5" />
                <text x="300" y="29" fill="#fca5a5" fontSize="9.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                  ⚠️ EMERGENCY MUTE: SYSTEM TRIPPED - PHYSICAL COLLISION REACHES OVER SEC_BARRIER LIMITS!
                </text>
              </g>
            )}

            {/* Photo-electric Workpiece sensor guide lines based on sensorPositionX */}
            <g id="sensor-custom-guides">
              <line x1={sensorPositionX} y1="210" x2={sensorPositionX} y2="310" stroke={sensorTriggered ? "#ef4444" : "#22c55e"} strokeWidth="1.2" strokeDasharray="3,3" opacity="0.5" />
              <rect x={sensorPositionX - 6} y="200" width="12" height="10" fill="#111827" rx="1" stroke="#374151" strokeWidth="1" />
              <circle cx={sensorPositionX} cy="205" r="2.5" fill={sensorTriggered ? "#ef4444" : "#22c55e"} />
              <text x={sensorPositionX - 25} y="193" fill={sensorTriggered ? "#ef4444" : "#9ca3af"} fontSize="7.5" fontFamily="monospace" fontWeight="semibold">IRSENS_@{sensorPositionX}mm</text>
            </g>

            {/* Gradient Definitions clipboards */}
            <defs>
              <clipPath id="conveyor-clip">
                <rect x="40" y="310" width="480" height="15" rx="4" />
              </clipPath>
              
              {/* Repeating Yellow-and-Black Hazard Pattern */}
              <pattern id="hazardStripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="10" fill="#eab308" />
                <line x1="0" y1="0" x2="0" y2="10" stroke="#000000" strokeWidth="4" />
              </pattern>

              {/* Scara structural link gradients */}
              <linearGradient id="scaraJoint1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="scaraJoint2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#059669" />
                <stop offset="100%" stopColor="#064e3b" />
              </linearGradient>

              {joints.slice(1).map((joint, idx) => (
                <linearGradient id={`linkGradient-${idx}`} key={idx} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d4d4d8" />
                  <stop offset="45%" stopColor="#a1a1aa" />
                  <stop offset="100%" stopColor="#52525b" />
                </linearGradient>
              ))}
            </defs>
          </svg>

          {/* Interactive Tooltip Helper */}
          <div className="absolute top-3 left-3 bg-[#1a1a1e]/90 border border-white/5 rounded px-2 py-0.5 text-[9px] font-mono text-slate-400 capitalize pointer-events-none backdrop-blur-sm shadow">
            <span className="text-slate-500 mr-1 font-semibold">T_EFF_LINK:</span>
            <span className="text-slate-100">X={cartesianX}mm</span>, <span className="text-slate-100">Y={cartesianY}mm</span>
          </div>

          <div className="absolute bottom-3 right-3 text-[9px] font-mono text-slate-500 bg-[#1a1a1e]/90 px-2 py-0.5 rounded border border-[#1e1e23] pointer-events-none">
            Drag blue crosshair to solve inverse kinematics!
          </div>
        </div>
      ) : activeTab === "pendant" ? (
        /* Teach Pendant Tab Content */
        <div className="flex-1 bg-[#0c0c0e] p-3 flex flex-col justify-between overflow-y-auto space-y-3.5 select-none text-slate-100 font-mono">
          
          {/* Digital Readout Screen (DRO) */}
          <div className="bg-[#152e25]/60 border border-emerald-500/10 p-3 rounded-lg shadow-[inset_0_2px_12px_rgba(16,185,129,0.04)] relative">
            <div className="absolute top-2 right-2.5 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[7.5px] text-emerald-500 font-bold tracking-widest">DRO_LIVE_TELEMETRY</span>
            </div>
            <h4 className="text-[9.5px] font-bold text-emerald-400 uppercase mb-2.5 flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />
              <span>Digital Read-Out Console</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Cartesian Coordinates Tool Center Point */}
              <div className="bg-[#0b1a15] rounded border border-emerald-500/10 p-2 space-y-1">
                <div className="text-[8px] text-emerald-500/80 font-semibold tracking-wider">TOOL CENTER POINT (TCP)</div>
                <div className="grid grid-cols-2 text-xs font-bold font-mono">
                  <div className="text-emerald-300">X: <span className="bg-emerald-950 px-1 py-0.5 rounded text-[11px]">{cartesianX} <span className="text-[7.5px] text-emerald-500">mm</span></span></div>
                  <div className="text-emerald-300">Z: <span className="bg-emerald-950 px-1 py-0.5 rounded text-[11px]">{cartesianY} <span className="text-[7.5px] text-emerald-500">mm</span></span></div>
                </div>
              </div>
              
              {/* Active Robot joint angles */}
              <div className="bg-[#0b1a15] rounded border border-emerald-500/10 p-2 space-y-1">
                <div className="text-[8px] text-emerald-500/80 font-semibold tracking-wider">JOINT SPHERES (ANGLES)</div>
                <div className="grid grid-cols-2 gap-x-1 text-[9.5px] text-emerald-300 font-medium">
                  <div>Base B: <span className="text-emerald-400 font-bold">{Math.round(joints[0].angle)}°</span></div>
                  <div>Shld J1: <span className="text-emerald-400 font-bold">{Math.round(joints[1].angle)}°</span></div>
                  <div>Elb J2: <span className="text-emerald-400 font-bold">{Math.round(joints[2].angle)}°</span></div>
                  <div>Wrst J3: <span className="text-emerald-400 font-bold">{Math.round(joints[3].angle)}°</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Jog Config Controls Bar */}
          <div className="grid grid-cols-2 gap-3.5 bg-[#141417] p-2.5 rounded-lg border border-white/5">
            <div>
              <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Jog Frame Standard</label>
              <div className="flex bg-[#0d0d0f] p-0.5 rounded border border-white/5">
                <button
                  onClick={() => setJogMode("CARTESIAN")}
                  className={`flex-1 text-[9px] py-1 rounded transition-colors uppercase ${
                    jogMode === "CARTESIAN" ? "bg-red-600 text-white font-bold" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  Cartesian
                </button>
                <button
                  onClick={() => setJogMode("JOINT")}
                  className={`flex-1 text-[9px] py-1 rounded transition-colors uppercase ${
                    jogMode === "JOINT" ? "bg-red-600 text-white font-bold" : "text-slate-400 hover:text-slate-100"
                  }`}
                >
                  Joints
                </button>
              </div>
            </div>

            <div>
              <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Jog Increment Size</label>
              <div className="flex bg-[#0d0d0f] p-0.5 rounded border border-white/5 gap-0.5 font-mono text-[9.5px]">
                {[1, 5, 10, 25].map((s) => (
                  <button
                    key={s}
                    onClick={() => setJogStepSize(s)}
                    className={`flex-1 py-1 rounded transition-colors inline-block ${
                      jogStepSize === s ? "bg-slate-700 text-white font-bold" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Manual Axis Jogging Buttons Grid */}
          <div className="bg-[#101012] p-2.5 rounded-lg border border-white/5 space-y-2">
            <div className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 border-b border-white/5 pb-1">
              <Sliders className="w-3.5 h-3.5 text-red-500" />
              <span>Link Jogging Actuators ({jogMode} Mode)</span>
            </div>

            {jogMode === "CARTESIAN" ? (
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* Cartesian Jog Row X */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">Cartesian X</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("X", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer font-mono"
                    >
                      X-
                    </button>
                    <button
                      onClick={() => { jogAxis("X", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer font-mono"
                    >
                      X+
                    </button>
                  </div>
                </div>

                {/* Cartesian Jog Row Z */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">Cartesian Z</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("Z", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer font-mono"
                    >
                      Z-
                    </button>
                    <button
                      onClick={() => { jogAxis("Z", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer font-mono"
                    >
                      Z+
                    </button>
                  </div>
                </div>

                {/* Waist Base Sweep B */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">Waist (Base B)</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("B", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer font-mono"
                    >
                      B-
                    </button>
                    <button
                      onClick={() => { jogAxis("B", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer font-mono"
                    >
                      B+
                    </button>
                  </div>
                </div>

                {/* Wrist Pitch Alignment A */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">Wrist (Pitch A)</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("A", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer font-mono"
                    >
                      A-
                    </button>
                    <button
                      onClick={() => { jogAxis("A", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer font-mono"
                    >
                      A+
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* Joint axis 1 */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">B (Waist)</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("base", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer"
                    >
                      B-
                    </button>
                    <button
                      onClick={() => { jogAxis("base", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer"
                    >
                      B+
                    </button>
                  </div>
                </div>

                {/* Joint axis 2 */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">J1 (Shoulder)</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("shoulder", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer"
                    >
                      J1-
                    </button>
                    <button
                      onClick={() => { jogAxis("shoulder", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer"
                    >
                      J1+
                    </button>
                  </div>
                </div>

                {/* Joint axis 3 */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">J2 (Elbow)</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("elbow", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer"
                    >
                      J2-
                    </button>
                    <button
                      onClick={() => { jogAxis("elbow", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer"
                    >
                      J2+
                    </button>
                  </div>
                </div>

                {/* Joint axis 4 */}
                <div className="flex items-center justify-between bg-[#141417] p-1.5 rounded border border-white/5">
                  <span className="font-semibold text-slate-400">J3 (Wrist)</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { jogAxis("wrist", -1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-red-500 font-black cursor-pointer"
                    >
                      J3-
                    </button>
                    <button
                      onClick={() => { jogAxis("wrist", 1); }}
                      className="w-8 h-6 bg-[#222226] hover:bg-slate-700 border border-white/5 rounded text-emerald-400 font-black cursor-pointer"
                    >
                      J3+
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Core Hardware Manual Relays Toggles */}
          <div className="grid grid-cols-2 gap-3 bg-[#101012] p-2.5 rounded-lg border border-white/5">
            <button
              onClick={() => {
                const nextState = !simulationState.hasBlock;
                setSimulationState(p => ({ ...p, hasBlock: nextState }));
                setSuctionState(nextState);
              }}
              className={`flex items-center justify-center space-x-2 py-1.5 px-3 rounded text-[9px] font-mono font-bold tracking-tight border uppercase transition-all cursor-pointer ${
                simulationState.hasBlock
                  ? "bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/5"
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${simulationState.hasBlock ? "text-red-400 animate-pulse" : "text-slate-400"}`} />
              <span>Vacuum Solenoid: {simulationState.hasBlock ? "ON (HOLD)" : "OFF"}</span>
            </button>

            <button
              onClick={() => {
                const nextState = !simulationState.conveyorRunning;
                setSimulationState(p => ({ ...p, conveyorRunning: nextState }));
                setConveyorState(nextState);
              }}
              className={`flex items-center justify-center space-x-2 py-1.5 px-3 rounded text-[9px] font-mono font-bold tracking-tight border uppercase transition-all cursor-pointer ${
                simulationState.conveyorRunning
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(34,197,94,0.15)]"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-white/5"
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${simulationState.conveyorRunning ? "text-emerald-400 animate-pulse" : "text-slate-400"}`} />
              <span>Conveyor Relay: {simulationState.conveyorRunning ? "RUNNING" : "HALTED"}</span>
            </button>
          </div>

          {/* Interactive G-Code Command Builder */}
          <div className="bg-[#141417] p-3 rounded-lg border border-white/5 space-y-3">
            <div className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-white/5 pb-1 block">
              <Hammer className="w-3.5 h-3.5 text-blue-500" />
              <span>Teach-In Program Builder Cmd Selector</span>
            </div>

            {/* Select instruction category */}
            <div className="grid grid-cols-5 gap-1 text-[8px] font-mono">
              {(["G01", "G00", "M05", "M03", "G04"] as const).map((m) => {
                const label = m === "G01" ? "G01 Move" : m === "G00" ? "G00 Rapid" : m === "M05" ? "M05 Vac" : m === "M03" ? "M03 Conv" : "G04 Delay";
                return (
                  <button
                    key={m}
                    onClick={() => { setCmdMode(m); }}
                    className={`py-1 rounded text-center font-bold tracking-tighter uppercase transition-colors border cursor-pointer ${
                      cmdMode === m
                        ? "bg-blue-600 text-white border-blue-500"
                        : "bg-[#0d0d0f] hover:bg-[#1a1a20] text-slate-400 border-white/5"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* command parameters input based on user selected type */}
            <div className="bg-[#0b0c0e] p-2 rounded border border-white/5 text-[9px] text-slate-400 min-h-[50px] flex items-center">
              {cmdMode === "G01" && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-[8.5px] uppercase">
                    <span>Target Feedrate Parameter</span>
                    <span className="text-blue-400 font-bold">{feedrate} mm/min</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="3000"
                    step="100"
                    value={feedrate}
                    onChange={(e) => { setFeedrate(parseInt(e.target.value)); }}
                    className="w-full h-1 bg-[#1a1a1e] rounded appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="text-[7.5px] text-slate-500 mt-1">Linear G01 moves are used for precise joint trajectory motions.</div>
                </div>
              )}

              {cmdMode === "G00" && (
                <div className="w-full text-center py-2 text-[8px] uppercase text-amber-500 font-semibold tracking-wider">
                  ⚠️ TRAVEL SPEED ACTIVE: RAPID CO-SYNCHRONOUS MOVEMENTS AT MAXIMUM SPEED FACTOR!
                </div>
              )}

              {cmdMode === "M05" && (
                <div className="w-full flex items-center justify-between">
                  <span>Change Vacuum state target:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setSuctionState(true); }}
                      className={`px-3 py-1 text-[8.5px] font-bold rounded border ${
                        suctionState ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-[#18181b] text-slate-500 border-white/5"
                      }`}
                    >
                      P1 (HOLD)
                    </button>
                    <button
                      onClick={() => { setSuctionState(false); }}
                      className={`px-3 py-1 text-[8.5px] font-bold rounded border ${
                        !suctionState ? "bg-slate-700 text-white border-slate-600" : "bg-[#18181b] text-slate-500 border-white/5"
                      }`}
                    >
                      P0 (RELEASE)
                    </button>
                  </div>
                </div>
              )}

              {cmdMode === "M03" && (
                <div className="w-full flex items-center justify-between">
                  <span>Conveyor motor status signal target:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setConveyorState(true); }}
                      className={`px-3 py-1 text-[8.5px] font-bold rounded border ${
                        conveyorState ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-[#18181b] text-slate-500 border-white/5"
                      }`}
                    >
                      S1 (RUN)
                    </button>
                    <button
                      onClick={() => { setConveyorState(false); }}
                      className={`px-3 py-1 text-[8.5px] font-bold rounded border ${
                        !conveyorState ? "bg-slate-700 text-white border-slate-600" : "bg-[#18181b] text-slate-500 border-white/5"
                      }`}
                    >
                      S0 (HALT)
                    </button>
                  </div>
                </div>
              )}

              {cmdMode === "G04" && (
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-[8.5px] uppercase">
                    <span>Milling Dwell Delay Duration</span>
                    <span className="text-amber-400 font-bold">{dwellMs} ms</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={dwellMs}
                    onChange={(e) => { setDwellMs(parseInt(e.target.value)); }}
                    className="w-full h-1 bg-[#1a1a1e] rounded appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="text-[7.5px] text-slate-500 mt-1">Dwells are recommended to wait for solenoid relays stabilizing pressures.</div>
                </div>
              )}
            </div>

            {/* Live Interactive syntax colored code line preview */}
            <div className="space-y-1 block">
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Script Code Generation Line Preview ({activeFile?.name || "*.gcode"})</span>
              <div className="bg-[#09090b] text-[10px] py-1.5 px-3 rounded font-mono border border-white/5 flex items-center justify-between shadow-inner">
                <span className="text-blue-400 font-semibold tracking-wide select-all">{getCommandPreview()}</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase">{activeFile?.language || "gcode"} syntax</span>
              </div>
            </div>

            {/* Teach Point Insertion Action Trigger Button */}
            <button
              onClick={() => { handleTeachPoint(getCommandPreview()); }}
              disabled={!activeFile || !onFileChange}
              className={`w-full py-2 px-4 rounded font-mono font-bold text-xs flex items-center justify-center space-x-1 border shadow transition-all ${
                activeFile && onFileChange
                  ? "bg-red-600 hover:bg-red-700 border-red-500 text-white cursor-pointer active:scale-[0.99] hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]"
                  : "bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50"
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping mr-2.5" />
              <span>🔴 Teach Instruction Point</span>
            </button>
          </div>
        </div>
      ) : (
        /* Stress & Physics Tab Content */
        <div className="flex-1 bg-[#0d0d0f] p-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3 h-full">
            {/* Torques meters */}
            <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 flex flex-col justify-between">
              <div>
                <h4 className="text-[10px] font-mono font-bold text-slate-400 mb-3 flex items-center space-x-1.5 uppercase">
                  <Scale className="w-3.5 h-3.5 text-blue-500" />
                  <span>Joint Torque Stress Limits</span>
                </h4>
                <div className="space-y-2">
                  {joints.slice(1).map((j, i) => {
                    const pct = Math.min((jointTorques[i + 1] / 15) * 100, 100);
                    return (
                      <div key={j.id} className="space-y-1">
                        <div className="flex justify-between text-[9px] font-mono">
                          <span className="text-slate-500">{j.name}</span>
                          <span className={pct > 75 ? "text-rose-400" : pct > 45 ? "text-amber-400" : "text-slate-300"}>
                            {jointTorques[i + 1]} N·m ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-1 bg-[#0d0d0f] rounded overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              pct > 75 ? "bg-rose-500" : pct > 45 ? "bg-amber-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[8px] font-mono text-slate-500 pt-2 border-t border-white/5 leading-normal">
                Torques computed based on current link projection coordinates and static active payload of {robotDesign.payloadWeight} kg.
              </p>
            </div>

            {/* Dynamic Diagnostics */}
            <div className="space-y-2.5">
              {/* Power Watts consumption meter */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-slate-500">AGGREGATE SYSTEM POWER</div>
                  <div className="text-2xl font-mono font-bold text-blue-400 tracking-tight mt-1">
                    {aggregatePowerW} <span className="text-xs text-slate-500">Watts</span>
                  </div>
                </div>
                <Zap className="w-6 h-6 text-blue-500 opacity-25" />
              </div>

              {/* Payload factors info */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono text-slate-500">ARM MAX PAYLOAD</div>
                  <div className="text-2xl font-mono font-bold text-slate-200 tracking-tight mt-1">
                    {robotDesign.payloadWeight} <span className="text-xs text-slate-500">/ 5.0 kg</span>
                  </div>
                </div>
                <Box className="w-6 h-6 text-blue-500 opacity-25" />
              </div>

              {/* Advanced specifications diagnostics */}
              <div className="bg-[#1a1a1e] border border-white/5 rounded p-2 text-[9px] font-mono space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Tool Armature:</span>
                  <span className="text-slate-200 uppercase">{robotDesign.endEffectorType} (PNEUMATIC)</span>
                </div>
                <div className="flex justify-between">
                  <span>Conveyor status:</span>
                  <span className={simulationState.conveyorRunning ? "text-emerald-400 font-semibold" : "text-slate-500"}>
                    {simulationState.conveyorRunning ? "RUNNING (60 RPM)" : "HALTED"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Solenoid state:</span>
                  <span className={simulationState.hasBlock ? "text-rose-400 font-semibold" : "text-slate-500"}>
                    {simulationState.hasBlock ? "ENGAGED" : "STANDBY"}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic AI Kinematics Solver Console */}
            <div className="col-span-2 bg-[#141417]/90 border border-blue-500/10 p-3 rounded-lg shadow-[inset_0_1px_8px_rgba(59,130,246,0.03)] space-y-2 mt-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">
                    {localStorage.getItem("robot_ai_provider") === "openrouter" ? "OpenRouter Free Kinematics Assistant" : "Gemini High-Precision Kinematics Solver"}
                  </span>
                </div>
                <div className="text-[8px] font-mono text-slate-500 font-semibold uppercase">TCP TARGET: X={cartesianX}mm, Z={cartesianY}mm</div>
              </div>

              {ikResponse ? (
                <div className="space-y-2">
                  <div className="bg-[#09090b] text-[10px] font-sans p-3 rounded border border-white/5 overflow-y-auto max-h-[140px] text-slate-300 leading-relaxed select-text markdown-body">
                    <Markdown>{ikResponse}</Markdown>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIkResponse("")}
                      className="px-2.5 py-1 bg-[#1d1d22] text-slate-400 hover:text-slate-200 transition-colors rounded text-[9px] font-mono border border-white/5 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear Solution</span>
                    </button>
                    <button
                      disabled={isSolvingIK}
                      onClick={handleSolveKinematicsWithAI}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white transition-all rounded text-[9px] font-mono font-medium flex items-center gap-1 cursor-pointer shadow-md"
                    >
                      {isSolvingIK ? <Cpu className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      <span>Recalculate Inverse Kinematics</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#0d0d0f] border border-white/5 rounded p-4 flex flex-col items-center justify-center text-center space-y-2.5">
                  <Cpu className={`w-8 h-8 text-blue-500/40 ${isSolvingIK ? "animate-spin" : ""}`} />
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono text-slate-300 font-bold uppercase tracking-wide">
                      {localStorage.getItem("robot_ai_provider") === "openrouter" ? "OpenRouter Kinematics pipeline active" : "Gemini solver pipeline active"}
                    </p>
                    <p className="text-[9px] text-slate-500 max-w-md font-sans">
                      Let {localStorage.getItem("robot_ai_provider") === "openrouter" ? "OpenRouter" : "Gemini"} analyze your current joint structure and tool coordinate vector to solve the exact trigonometric parameters and guide trajectory motion calculations.
                    </p>
                  </div>
                  {ikError && (
                    <p className="text-[9px] text-rose-400 font-mono bg-rose-500/5 px-2.5 py-1 rounded border border-rose-500/10">⚠️ {ikError}</p>
                  )}
                  <button
                    disabled={isSolvingIK}
                    onClick={handleSolveKinematicsWithAI}
                    className="inline-flex items-center space-x-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded text-[10px] font-mono font-bold tracking-wide shadow-lg border border-blue-500/30 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    {isSolvingIK ? (
                      <>
                        <Cpu className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying Kinematics Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-blue-200 animate-pulse" />
                        <span>Solve Kinematics Math with AI</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CIM Production Control & Metrics Center */}
      <div id="cim-production-controller" className="bg-[#101012] border-t border-white/5 p-3 space-y-3 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-1.5 font-mono text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            <BarChart2 className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>CIM Workpiece Sorting & Metrics Center</span>
          </div>
          <button
            onClick={() => {
              setSortingStats({
                scannedRed: 0,
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
            }}
            className="flex items-center space-x-1 font-mono text-[8px] text-slate-500 hover:text-slate-300 transition-colors bg-[#18181b] border border-white/5 px-1.5 py-0.5 rounded cursor-pointer"
            title="Reset Production Scoring Counters"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Reset Stats</span>
          </button>
        </div>

        {/* Scoring Statistics Blocks */}
        <div className="grid grid-cols-4 gap-2">
          {/* Box 1: Material Scanned */}
          <div className="bg-[#09090b] border border-white/5 p-2 rounded flex flex-col space-y-1">
            <div className="text-[8px] font-mono font-bold text-slate-500 uppercase tracking-tight">RAW VOLUMES FEEDED</div>
            <div className="text-sm font-mono font-bold text-slate-300 tracking-tight">
              {sortingStats.scannedRed + sortingStats.scannedGreen + sortingStats.scannedBlue + sortingStats.scannedYellow} <span className="text-[8px] font-normal text-slate-500">items</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-mono text-slate-500 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{sortingStats.scannedRed}
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />{sortingStats.scannedGreen}
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{sortingStats.scannedBlue}
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />{sortingStats.scannedYellow}
            </div>
          </div>

          {/* Box 2: Correctly Sorted */}
          <div className="bg-[#09090b] border border-white/5 p-2 rounded flex flex-col space-y-1">
            <div className="text-[8px] font-mono font-bold text-emerald-500/80 uppercase tracking-tight">VERIFIED SORTED</div>
            <div className="text-sm font-mono font-bold text-emerald-400 tracking-tight">
              {sortingStats.correctRed + sortingStats.correctGreen + sortingStats.correctBlue + sortingStats.correctYellow} <span className="text-[8px] font-semibold text-emerald-600">PASSED</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] font-mono text-slate-500 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{sortingStats.correctRed}
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />{sortingStats.correctGreen}
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />{sortingStats.correctBlue}
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />{sortingStats.correctYellow}
            </div>
          </div>

          {/* Box 3: Sorted Mismatches */}
          <div className="bg-[#09090b] border border-white/5 p-2 rounded flex flex-col space-y-1">
            <div className="text-[8px] font-mono font-bold text-amber-500/80 uppercase tracking-tight">TRAY MISMATCHES</div>
            <div className={`text-sm font-mono font-bold tracking-tight ${sortingStats.incorrect > 0 ? "text-amber-400" : "text-slate-500"}`}>
              {sortingStats.incorrect} <span className="text-[8px] font-medium text-slate-500">Conflicts</span>
            </div>
            <span className="text-[7px] font-mono text-slate-600 mt-1 leading-none uppercase">Cross-contamination faults</span>
          </div>

          {/* Box 4: Dropped on floor */}
          <div className="bg-[#09090b] border border-white/5 p-2 rounded flex flex-col space-y-1">
            <div className="text-[8px] font-mono font-bold text-rose-500/80 uppercase tracking-tight">DROP INCIDENTS</div>
            <div className={`text-sm font-mono font-bold tracking-tight ${sortingStats.dropped > 0 ? "text-rose-400 font-semibold animate-pulse" : "text-slate-500"}`}>
              {sortingStats.dropped} <span className="text-[8px] font-medium text-slate-500">Crashes</span>
            </div>
            <span className="text-[7px] font-mono text-slate-600 mt-1 leading-none uppercase">Gripper vacuum leaks</span>
          </div>
        </div>

        {/* Material Flow Seeding Controls */}
        <div className="flex flex-col space-y-1 bg-[#141417]/40 p-2 rounded border border-white/5">
          <div className="flex justify-between items-center mb-1 text-[8px] font-mono">
            <span className="text-slate-500 font-bold uppercase">Workpiece Feed Flow Stream Settings</span>
            <span className="text-[8px] px-1 bg-blue-500/10 text-blue-400 rounded-sm font-mono border border-blue-500/10">Active: {feedMode.toUpperCase()}</span>
          </div>
          <div className="flex gap-1">
            {(["random", "red", "green", "blue", "yellow"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFeedMode(mode)}
                className={`flex-1 text-[9px] font-mono py-1 rounded transition-all uppercase cursor-pointer border ${
                  feedMode === mode
                    ? "bg-blue-600 text-white border-blue-500 font-bold shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                    : "bg-[#0c0c0e] hover:bg-[#141417] text-slate-400 border-white/5"
                }`}
              >
                {mode === "random" ? "Auto" : `${mode}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Numerical angles adjustment bar panel */}
      <div id="joint-micro-alignment" className="bg-[#141417] border-t border-white/5 p-3 space-y-2 shrink-0">
        <div className="flex justify-between items-center">
          <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-tight">Manual Joint Angle Angle Control</h4>
          <span className="text-[9px] font-mono text-slate-500">Limits: J2 (-80°/90°), J3 (-120°/120°)</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {joints.slice(1).map((joint) => (
            <div key={joint.id} className="space-y-0.5">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400 font-medium">{joint.name}</span>
                <span className="text-blue-400 font-semibold">{joint.angle}°</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min={joint.minAngle}
                  max={joint.maxAngle}
                  step="0.5"
                  value={joint.angle}
                  onChange={(e) => {
                    const parsedVal = parseFloat(e.target.value);
                    setJoints((prev) =>
                      prev.map((j) => (j.id === joint.id ? { ...j, angle: parsedVal } : j))
                    );
                  }}
                  className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
