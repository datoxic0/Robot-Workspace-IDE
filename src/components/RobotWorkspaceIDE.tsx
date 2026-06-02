import React, { useState, useRef, useEffect } from "react";
import { 
  BoardConfig, 
  ProgramLanguageConfig, 
  WorkspaceFile, 
  SimulationState, 
  TerminalLog, 
  CIMWorkpiece,
  RobotJoint,
  CIMSortingStats
} from "../types";
import { parseGcodeLine, solveInverseKinematics, calculateForwardKinematics } from "../utils/kinematics";
import { 
  FolderOpen, 
  Play, 
  Terminal, 
  Cpu, 
  RefreshCw, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  FileCode, 
  Info,
  Wrench,
  CheckCircle,
  AlertTriangle,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface RobotWorkspaceIDEProps {
  activeBoard: BoardConfig;
  setActiveBoard: (b: BoardConfig) => void;
  activeLanguage: ProgramLanguageConfig;
  setActiveLanguage: (l: ProgramLanguageConfig) => void;
  files: WorkspaceFile[];
  setFiles: React.Dispatch<React.SetStateAction<WorkspaceFile[]>>;
  activeFileIndex: number;
  setActiveFileIndex: (idx: number) => void;
  simulationState: SimulationState;
  setSimulationState: React.Dispatch<React.SetStateAction<SimulationState>>;
  joints: RobotJoint[];
  setJoints: React.Dispatch<React.SetStateAction<RobotJoint[]>>;
  workpieces: CIMWorkpiece[];
  setWorkpieces: React.Dispatch<React.SetStateAction<CIMWorkpiece[]>>;
  logs: TerminalLog[];
  setLogs: React.Dispatch<React.SetStateAction<TerminalLog[]>>;
  onFileChange: (content: string) => void;
  sortingStats: CIMSortingStats;
  setSortingStats: React.Dispatch<React.SetStateAction<CIMSortingStats>>;
  feedMode: "random" | "red" | "green" | "blue" | "yellow";
  robotType: "articulated" | "scara" | "cartesian";
  conveyorSpeed: number;
  obstacleHeight: number;
  sensorPositionX: number;
}

export default function RobotWorkspaceIDE({
  activeBoard,
  setActiveBoard,
  activeLanguage,
  setActiveLanguage,
  files,
  setFiles,
  activeFileIndex,
  setActiveFileIndex,
  simulationState,
  setSimulationState,
  joints,
  setJoints,
  workpieces,
  setWorkpieces,
  logs,
  setLogs,
  onFileChange,
  sortingStats,
  setSortingStats,
  feedMode,
  robotType,
  conveyorSpeed,
  obstacleHeight,
  sensorPositionX
}: RobotWorkspaceIDEProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const idleTicksRef = useRef<number>(0);
  
  const workpiecesRef = useRef(workpieces);
  const sensorPositionXRef = useRef(sensorPositionX);
  const jointsRef = useRef(joints);
  const waitingOnSensorRef = useRef(false);

  useEffect(() => {
    workpiecesRef.current = workpieces;
  }, [workpieces]);

  useEffect(() => {
    sensorPositionXRef.current = sensorPositionX;
  }, [sensorPositionX]);

  useEffect(() => {
    jointsRef.current = joints;
  }, [joints]);
  
  const [newFileName, setNewFileName] = useState("");
  const [showAddFile, setShowAddFile] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [interpreterIntervalId, setInterpreterIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1000); // Step interval in milliseconds

  const activeFile = files[activeFileIndex] || { name: "untitled", content: "", language: activeLanguage.id };

  // Scroll terminal logs automatically to the bottom on update
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Append new color-coded log entries to terminal console
  const addLog = (type: "info" | "success" | "warn" | "error", text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        type,
        text,
        timestamp
      }
    ]);
  };

  // Create a brand new workspace code file
  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    // Auto translate filename details
    const ext = activeLanguage.extension;
    const nameWithExt = newFileName.toLowerCase().endsWith(ext) 
      ? newFileName 
      : `${newFileName}${ext}`;

    const newFileObj: WorkspaceFile = {
      name: nameWithExt,
      language: activeLanguage.id,
      content: `// New script file for ${activeBoard.name}\n\nvoid setup() {\n  \n}\n\nvoid loop() {\n  \n}`,
      isCustom: true
    };

    setFiles((prev) => [...prev, newFileObj]);
    setActiveFileIndex(files.length);
    setNewFileName("");
    setShowAddFile(false);
    addLog("success", `File created: ${nameWithExt}`);
  };

  // Delete a workspace file safely
  const handleDeleteFile = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      addLog("error", "Cannot delete last remaining workspace file.");
      return;
    }
    const targetFileName = files[idx].name;
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setActiveFileIndex(0);
    addLog("warn", `Deleted workspace file: ${targetFileName}`);
  };

  // Download code to local client as `.ino` / `.py` / `.gcode` file
  const handleDownloadCode = () => {
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = activeFile.name;
    link.click();
    URL.revokeObjectURL(url);
    addLog("success", `Downloaded file bundle: ${activeFile.name}`);
  };

  // Upload local client source script into target workspace
  const handleUploadCode = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string || "";
      const isGcode = file.name.endsWith(".gcode");
      const isPython = file.name.endsWith(".py");
      
      const newFileObj: WorkspaceFile = {
        name: file.name,
        content,
        language: isGcode ? "gcode" : isPython ? "python" : "arduino",
        isCustom: true
      };

      setFiles((prev) => [...prev, newFileObj]);
      setActiveFileIndex(files.length);
      addLog("success", `Imported external script: ${file.name}`);
    };
    reader.readAsText(file);
  };

  // Compile & Upload simulation sequence triggers
  const handleCompileAndRun = () => {
    if (simulationState.isRunning) {
      stopSimulation();
      return;
    }

    setSimulationState((prev) => ({ ...prev, status: "compiling" }));
    addLog("info", `Starting compile pipeline for Board[${activeBoard.id.toUpperCase()}] using toolchain...`);

    // Reset statistics on building fresh firmware routines
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

    const firstColor = feedMode === "random"
      ? (["red", "green", "blue", "yellow"] as const)[Math.floor(Math.random() * 4)]
      : feedMode;

    // Clean up workpieces to start simulation clean
    setWorkpieces([
      { id: `wp-${Date.now()}`, color: firstColor, positionX: -20, status: "approaching" }
    ]);

    setTimeout(() => {
      addLog("success", "Code validation parsed successfully. Built binary sizes: 142 KB (6.7% capacity).");
      setSimulationState((prev) => ({ ...prev, status: "uploading" }));
      addLog("info", `Initializing serial boundary flash over USB port: COM22 (operating at 115200 bps)...`);

      setTimeout(() => {
        addLog("success", "Flashing completed. System reset performed. Firmware loaded.");
        setSimulationState((prev) => ({
          ...prev,
          status: "running",
          isRunning: true,
          isCompiled: true,
          currentLine: 1,
          conveyorRunning: activeFile.language === "gcode" // Auto-start conveyor if running GCODE
        }));
        addLog("info", "Executing main thread firmware loop... [SYS_ONLINE]");

        if (activeFile.language === "gcode") {
          startGcodeInterpreter();
        } else {
          // General generic board animation blinker logs
          const intervalId = setInterval(() => {
            const pinState = Math.random() > 0.5 ? "HIGH" : "LOW";
            addLog("info", `[Firmware Loop] Pin D13 voltage set to -> [${pinState}]`);
          }, 3000) as any;
          setInterpreterIntervalId(intervalId);
        }
      }, 1500);
    }, 1200);
  };

  // Real-time Interpreter & physics synchronizer for G-Code scripts!
  const startGcodeInterpreter = () => {
    const codeLines = activeFile.content.split("\n");
    let lineIdx = 0;

    // Default base coordinates
    const baseX = 300;
    const baseY = 290;

    // Dynamic Variables & Loops Dictionary local to this closure run
    const variableMap: Record<string, number> = {
      "#102": Math.round((sensorPositionX - baseX) * 1.5 * 10) / 10
    };
    let loopStartIndex = -1;
    let loopCount = 0;
    let maxLoops = 9999;
    let activeDelayTicks = 0;
    const currentSpeed = simulationSpeed; // Cache current delay value in closure

    const intervalId = setInterval(() => {
      // If we are currently in a dwell (G04), decrement ticks and return/stall execution
      if (activeDelayTicks > 0) {
        activeDelayTicks--;
        return;
      }

      if (lineIdx >= codeLines.length) {
        addLog("success", "CIM assembly sequence fully completed. Simulation sequence reset.");
        stopSimulation();
        return;
      }

      const activeText = codeLines[lineIdx];
      const trimmedText = activeText.trim();
      
      setSimulationState((prev) => ({ ...prev, currentLine: lineIdx + 1 }));

      // 1. Skip completely empty lines
      if (!trimmedText) {
        lineIdx++;
        return;
      }

      // 2. Parenthetical comments
      if (trimmedText.startsWith("(")) {
        const commentContent = trimmedText.replace(/^\(/, "").replace(/\)$/, "").trim();
        addLog("info", `( ${commentContent} )`);
        lineIdx++;
        return;
      }

      // 3. Command comments prefixing with ; or is a pure comment
      if (trimmedText.startsWith(";")) {
        const commentContent = trimmedText.replace(/^;/, "").trim();
        addLog("info", `; ${commentContent}`);
        lineIdx++;
        return;
      }

      // 4. Variables Definition mapping like #100 = 3000
      if (trimmedText.startsWith("#") && trimmedText.includes("=")) {
        const parts = trimmedText.split("=");
        const varName = parts[0].trim();
        const varVal = parts[1].split(";")[0].trim();
        const numVal = parseFloat(varVal);
        if (varName && !isNaN(numVal)) {
          variableMap[varName] = numVal;
          addLog("info", `[Variables] Setting Variable ${varName} = ${numVal}`);
        }
        lineIdx++;
        return;
      }

      // 5. Repeating loops like O100 REPEAT [9999]
      if (trimmedText.toUpperCase().includes("REPEAT")) {
        loopStartIndex = lineIdx;
        loopCount = 0;
        const repeatMatch = trimmedText.match(/REPEAT\s*\[?(\d+)\]?/i);
        maxLoops = repeatMatch ? parseInt(repeatMatch[1]) : 9999;
        addLog("info", `[Loop Control] Initiating production sequence loop up to ${maxLoops} cycles...`);
        lineIdx++;
        return;
      }

      // 6. Ending loops like O100 ENDREPEAT
      if (trimmedText.toUpperCase().includes("ENDREPEAT")) {
        loopCount++;
        if (loopCount < maxLoops) {
          lineIdx = loopStartIndex + 1; // repeat from inside loop
          addLog("info", `[Loop Control] Production cycle ${loopCount} complete. Seamlessly cycling back to start...`);
          return;
        } else {
          addLog("success", `[Loop Control] Production sequence fully satisfied after ${loopCount} continuous runs.`);
          lineIdx++;
          return;
        }
      }

      // Resolve variables inside G-code parameters e.g. F[#101]
      let resolvedText = activeText;
      for (const [key, value] of Object.entries(variableMap)) {
        resolvedText = resolvedText.replace(new RegExp(`\\[?${key}\\]?`, "g"), value.toString());
      }

      const parsed = parseGcodeLine(resolvedText);
      if (parsed) {
        if (parsed.command === "COMMENT") {
          if (parsed.comment) {
             addLog("info", `; ${parsed.comment}`);
          }
        } else {
          // Dynamic execution logs
          addLog("success", `[LINE ${lineIdx + 1}] Executing: ${parsed.command} ${JSON.stringify(parsed.params)}`);

          // Process known instructions
          switch (parsed.command) {
            case "G00":
            case "G01": {
              // Coordinated joints & planar kinematics solver
              const hasCoords = parsed.params.X !== undefined || parsed.params.Y !== undefined || parsed.params.Z !== undefined;
              const hasA = parsed.params.A !== undefined;
              const hasB = parsed.params.B !== undefined;

              setJoints((prev) => {
                let nextJoints = prev.map(j => ({ ...j }));

                // 1. Update Base joint (Waist) from B parameter (simulated swivel)
                if (hasB) {
                  const valB = parsed.params.B ?? 0;
                  nextJoints = nextJoints.map(j => j.id === "base" ? { ...j, angle: Math.max(j.minAngle, Math.min(valB, j.maxAngle)) } : j);
                }

                // 2. Update Wrist Pitch joint from A parameter
                if (hasA) {
                  const valA = parsed.params.A ?? 0;
                  nextJoints = nextJoints.map(j => j.id === "wrist" ? { ...j, angle: Math.max(j.minAngle, Math.min(valA, j.maxAngle)) } : j);
                }

                // 3. Resolve planar tool coordinates X, Y, Z
                if (hasCoords) {
                  const mmScale = 1.5;
                  const rawX = parsed.params.X ?? 0;
                  // Handle Z falling back to Y, then to 120 (preventing falsy zero bugs)
                  const rawZ = parsed.params.Z ?? parsed.params.Y ?? 120;
                  const pixelsX = baseX + rawX / mmScale;
                  const pixelsY = baseY - rawZ / mmScale;

                  if (robotType === "cartesian") {
                    let carriageX = pixelsX;
                    if (carriageX < 70) carriageX = 70;
                    if (carriageX > 530) carriageX = 530;
                    const targetJ1Angle = (carriageX - baseX) / 1.45;

                    const railY = 110;
                    let targetPlungeY = pixelsY - 12;
                    if (targetPlungeY < railY + 80) targetPlungeY = railY + 80;
                    if (targetPlungeY > railY + 190) targetPlungeY = railY + 190;

                    const targetPlungeHeight = targetPlungeY - railY;
                    const targetJ2Angle = ((targetPlungeHeight - 80) / 110) * 240 - 120;

                    nextJoints = nextJoints.map((j) => {
                      if (j.id === "shoulder") return { ...j, angle: Math.round(targetJ1Angle) };
                      if (j.id === "elbow") return { ...j, angle: Math.round(targetJ2Angle) };
                      return j;
                    });
                  } else if (robotType === "scara") {
                    const postHeight = 110;
                    const originX = baseX;
                    const originY = baseY - postHeight; // (300, 180)

                    const l1 = nextJoints.find(j => j.id === "shoulder")?.length ?? 110;
                    const l2 = nextJoints.find(j => j.id === "elbow")?.length ?? 100;
                    const totalMaxReach = l1 + l2;

                    let tx = pixelsX - originX;
                    let ty = pixelsY - originY - 35; // adjust for wrist plunge guiding
                    const dist = Math.hypot(tx, ty);

                    if (dist > totalMaxReach) {
                      tx *= (totalMaxReach / dist) * 0.98;
                      ty *= (totalMaxReach / dist) * 0.98;
                    }

                    // Analytical SCARA planar forearm solver
                    const cosAngle2 = (tx * tx + ty * ty - l1 * l1 - l2 * l2) / (2 * l1 * l2);
                    const sinAngle2 = Math.sqrt(Math.max(0, 1 - cosAngle2 * cosAngle2));
                    const angle2Rad = Math.atan2(sinAngle2, cosAngle2);

                    const k1 = l1 + l2 * cosAngle2;
                    const k2 = l2 * sinAngle2;
                    const angle1Rad = Math.atan2(ty, tx) - Math.atan2(k2, k1);

                    const a1Deg = (angle1Rad * 180) / Math.PI;
                    const a2Deg = (angle2Rad * 180) / Math.PI;

                    const currentPlungeY = pixelsY - (originY + l1 * Math.sin(angle1Rad) + l2 * Math.sin(angle1Rad + angle2Rad));
                    const targetJ3Angle = ((currentPlungeY - 25) / 30) * 240 - 120;

                    nextJoints = nextJoints.map((j) => {
                      if (j.id === "shoulder") {
                        const bonded = Math.max(j.minAngle, Math.min(a1Deg, j.maxAngle));
                        return { ...j, angle: Math.round(bonded * 10) / 10 };
                      }
                      if (j.id === "elbow") {
                        const bonded = Math.max(j.minAngle, Math.min(a2Deg, j.maxAngle));
                        return { ...j, angle: Math.round(bonded * 10) / 10 };
                      }
                      if (j.id === "wrist" && !hasA) {
                        const bonded = Math.max(j.minAngle, Math.min(targetJ3Angle, j.maxAngle));
                        return { ...j, angle: Math.round(bonded * 10) / 10 };
                      }
                      return j;
                    });
                  } else {
                    // Standard Articulated
                    const clickX = pixelsX;
                    const clickY = pixelsY;
                    const distToClick = Math.hypot(clickX - baseX, clickY - baseY);
                    const totalMaxReach = nextJoints.slice(1).reduce((sum, j) => sum + j.length, 0);

                    let targetX = clickX;
                    let targetY = clickY;

                    if (distToClick > totalMaxReach) {
                      const ratio = totalMaxReach / distToClick;
                      targetX = baseX + (clickX - baseX) * ratio * 0.98;
                      targetY = baseY + (clickY - baseY) * ratio * 0.98;
                    }

                    nextJoints = solveInverseKinematics(baseX, baseY, nextJoints, { x: targetX, y: targetY });
                  }
                }

                return nextJoints;
              });
              break;
            }
            case "M03": {
              // Toggle conveyor relay (S parameter: S1 is start, S0 is halt)
              const statusVal = parsed.params.S === 1;
              setSimulationState((prev) => ({ ...prev, conveyorRunning: statusVal }));
              addLog("warn", `[Relay Out] Conveyor Motor feedback is reset to State => [${statusVal ? "ACTIVE" : "HALTED"}]`);
              break;
            }
            case "M04": {
              // Breakbeam optical photo-detector state checks
              addLog("info", "[Sensor Trip] Beam break laser status verified.");
              break;
            }
            case "M66": {
              // REAL-TIME DIGITAL HARDWARE INTERLOCK SENSOR POLLING!
              const currentWorkpieces = workpiecesRef.current;
              const currentSensorX = sensorPositionXRef.current;
              const sensorActive = currentWorkpieces.some(wp => 
                wp.positionX >= currentSensorX - 15 && 
                wp.positionX <= currentSensorX + 15 && 
                wp.status === "approaching"
              );
              
              if (!sensorActive) {
                if (!waitingOnSensorRef.current) {
                  addLog("info", `[M66 SENSOR INTERLOCK] Pausing routine. Polling Input #1 (IRSENS @ ${currentSensorX}mm) to go HIGH...`);
                  waitingOnSensorRef.current = true;
                }
                // Do not increment lineIdx so we stay on this interlock line on next interval tick!
                return;
              } else {
                addLog("success", `[M66 SENSOR INTERLOCK] Hardware flag met! Laser Photo-Detector detected incoming part.`);
                waitingOnSensorRef.current = false;
                // fall through and execute next line on next tick!
              }
              break;
            }
            case "M05": {
              // Solenoid magnetic vacuum effector state toggles (P1 holds, P0 releases)
              const hasGripped = parsed.params.P === 1;
              setSimulationState((prev) => ({ ...prev, hasBlock: hasGripped }));
              
              // Forward kinematics calculation to locate dropping X offset
              const pts = calculateForwardKinematics(baseX, baseY, joints);
              const endEffectorPoint = pts[pts.length - 1];
              const dropX = endEffectorPoint.x;

              setWorkpieces((prev) => {
                return prev.map((wp) => {
                  const sensorX = sensorPositionXRef.current;
                  if (wp.status === "approaching" && hasGripped && wp.positionX >= sensorX - 15 && wp.positionX <= sensorX + 15) {
                    addLog("warn", `[Actuator] Pneumatic suction solenoid: ENGAGED [${wp.color.toUpperCase()} securely grasped]`);
                    return { ...wp, status: "picked" };
                  }
                  if (wp.status === "picked" && !hasGripped) {
                    addLog("warn", `[Actuator] Pneumatic suction solenoid: DE-ENERGIZED [Releasing workpiece at Drop-X=${Math.round(dropX)}px]`);
                    
                    let targetStatus: "placed" | "rejected" | "dropped" = "dropped";
                    let isCorrect = false;
                    let trayName = "Ground Workspace";

                    // Determine landing slots bases:
                    // Blue Slot: Center X = 390 (370-410)
                    // Green Slot: Center X = 430 (410-450)
                    // Red Slot: Center X = 470 (450-490)
                    // Reject Slot: Center X = 510 (490-535)
                    if (dropX >= 450 && dropX <= 490) {
                      trayName = "RED SORTING BIN";
                      if (wp.color === "red") {
                        isCorrect = true;
                        targetStatus = "placed";
                      } else {
                        targetStatus = "rejected";
                      }
                    } else if (dropX >= 410 && dropX < 450) {
                      trayName = "GREEN SORTING BIN";
                      if (wp.color === "green") {
                        isCorrect = true;
                        targetStatus = "placed";
                      } else {
                        targetStatus = "rejected";
                      }
                    } else if (dropX >= 370 && dropX < 410) {
                      trayName = "BLUE SORTING BIN";
                      if (wp.color === "blue") {
                        isCorrect = true;
                        targetStatus = "placed";
                      } else {
                        targetStatus = "rejected";
                      }
                    } else if (dropX > 490 && dropX <= 545) {
                      trayName = "FAULTY REJECT SLOT";
                      if (wp.color === "yellow") {
                        isCorrect = true;
                        targetStatus = "rejected";
                      } else {
                        targetStatus = "placed"; // improper placement
                      }
                    }

                    // Increment and report stats securely
                    if (targetStatus === "dropped") {
                      addLog("error", `[Mechanical Error] Suction release failed to hit bins! Material crashed to floor at X=${Math.round(dropX)}.`);
                      setSortingStats(s => ({ ...s, dropped: s.dropped + 1 }));
                    } else if (isCorrect) {
                      addLog("success", `[PLC Sorter] VERIFIED! Color ${wp.color.toUpperCase()} correctly deposited in ${trayName}.`);
                      setSortingStats(s => {
                        const clone = { ...s };
                        if (wp.color === "red") clone.correctRed += 1;
                        if (wp.color === "green") clone.correctGreen += 1;
                        if (wp.color === "blue") clone.correctBlue += 1;
                        if (wp.color === "yellow") clone.correctYellow += 1;
                        return clone;
                      });
                    } else {
                      addLog("error", `[PLC Operational Conflict] SORT MISTAKE! Color ${wp.color.toUpperCase()} workpiece misaligned into ${trayName}!`);
                      setSortingStats(s => ({ ...s, incorrect: s.incorrect + 1 }));
                    }

                    return { ...wp, status: targetStatus, positionX: dropX };
                  }
                  return wp;
                });
              });
              break;
            }
            case "M09": {
              // Complete cycle alert sound strobe
              addLog("success", "[SYSTEM] Cycle completion strobe code alert trigger successfully.");
              break;
            }
            case "M30": {
              addLog("success", "M30 Program end execution. Resetting controller home state.");
              stopSimulation();
              return;
            }
            case "G04": {
              // Hold/dwell delay action parameter
              const ms = parsed.params.P || 1000;
              const ticks = Math.max(1, Math.round(ms / currentSpeed));
              activeDelayTicks = ticks;
              addLog("info", `[Dwell] Delaying action execution loop for ${ms}ms (~${ticks} steps).`);
              break;
            }
            default:
              addLog("warn", `Command not mapped locally: ${parsed.command}`);
          }
        }
      }

      lineIdx++;
    }, currentSpeed) as any;

    setInterpreterIntervalId(intervalId);
  };

  const stopSimulation = () => {
    if (interpreterIntervalId) {
      clearInterval(interpreterIntervalId);
      setInterpreterIntervalId(null);
    }
    setSimulationState((prev) => ({
      ...prev,
      isRunning: false,
      status: "idle",
      conveyorRunning: false,
      hasBlock: false
    }));
    addLog("warn", "Firmware diagnostic loop halted by active supervisor.");
  };

  // Clean-up loop on unmount
  useEffect(() => {
    return () => {
      if (interpreterIntervalId) clearInterval(interpreterIntervalId);
    };
  }, [interpreterIntervalId]);

  // Conveyor horizontal belt offset flow animation
  useEffect(() => {
    if (!simulationState.conveyorRunning) return;

    const tick = setInterval(() => {
      setWorkpieces((prev) => {
        let triggerScanStats = false;
        let scannedColor: "red" | "green" | "blue" | "yellow" = "red";

        const mapped = prev.map((wp) => {
          if (wp.status === "approaching") {
            const step = 2 * conveyorSpeed;
            const nextX = wp.positionX + step;
            
            // Log photo-detector color scanning interrupt once it crosses customizable sensorPositionX threshold
            if (wp.positionX < sensorPositionX && nextX >= sensorPositionX) {
              triggerScanStats = true;
              scannedColor = wp.color;
            }

            // Loop back workpiece if it passes workspace boundary bounds
            if (nextX > 580) {
              const nextColor = feedMode === "random"
                ? (["red", "green", "blue", "yellow"] as const)[Math.floor(Math.random() * 4)]
                : feedMode;
              return { ...wp, positionX: -20, status: "approaching" as const, color: nextColor };
            }
            return { ...wp, positionX: nextX };
          }
          return wp;
        });

        if (triggerScanStats) {
          addLog("info", `[Sensor RGB] PHOTO-ELECTRIC INTERRUPT AT ${sensorPositionX}mm! COLOR DETECTED => [${scannedColor.toUpperCase()}]`);
          setSortingStats((s) => {
            const next = { ...s };
            if (scannedColor === "red") next.scannedRed += 1;
            if (scannedColor === "green") next.scannedGreen += 1;
            if (scannedColor === "blue") next.scannedBlue += 1;
            if (scannedColor === "yellow") next.scannedYellow += 1;
            return next;
          });
        }

        // Automatic stream feeder: if no active workpiece is approaching or picked, spawn another after some delay
        const activeCount = mapped.filter(wp => wp.status === "approaching" || wp.status === "picked").length;
        if (activeCount === 0) {
          idleTicksRef.current += 1;
          const requiredIdleDelay = Math.max(10, Math.round(40 / conveyorSpeed));
          if (idleTicksRef.current >= requiredIdleDelay) { // Responsive spawn timing based on conveyorSpeed
            idleTicksRef.current = 0;
            const spawnedColor = feedMode === "random"
              ? (["red", "green", "blue", "yellow"] as const)[Math.floor(Math.random() * 4)]
              : feedMode;
            const newId = `wp-${Date.now()}`;
            addLog("info", `[Feeder Feed] Spawning raw material workpiece onto belt: [color=${spawnedColor.toUpperCase()}]`);
            return [
              ...mapped,
              { id: newId, color: spawnedColor, positionX: -20, status: "approaching" }
            ];
          }
        } else {
          idleTicksRef.current = 0;
        }

        // Clip workpiece list length to guarantee SVG performance limits
        if (mapped.length > 15) {
          return mapped.slice(mapped.length - 15);
        }

        return mapped;
      });

      setSimulationState((prev) => {
        const nextPos = (prev.blockPosition + 1.5 * conveyorSpeed) % 100;
        return { ...prev, blockPosition: nextPos };
      });
    }, 50);

    return () => clearInterval(tick);
  }, [simulationState.conveyorRunning, feedMode, conveyorSpeed, sensorPositionX, setWorkpieces, setSortingStats, setSimulationState]);

  return (
    <div id="workspace-ide-card" className="h-full flex flex-col bg-[#1a1a1e] border border-white/5 rounded overflow-hidden shadow-2xl">
      
      {/* Top IDE Toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#141417] border-b border-white/5 shrink-0">
        <div className="flex items-center space-x-2">
          {/* Collapse/Expand Sidebar button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-[#1e1e23] hover:text-white rounded text-slate-400 font-mono text-[10px] flex items-center space-x-1 cursor-pointer transition-colors"
            title={sidebarOpen ? "Hide File Explorer" : "Show File Explorer"}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase text-slate-500">Explorer</span>
          </button>
          
          <div className="h-4 w-px bg-white/5 hidden sm:block"></div>

          <div className="flex items-center space-x-2.5">
            <FolderOpen className="w-4 h-4 text-blue-500" />
            <span className="font-mono text-[10px] font-bold text-slate-400 tracking-wider">PROJECT_IDE_FILES</span>
          </div>
        </div>
        
        {/* Play/Stop & Reference Triggers */}
        <div className="flex items-center space-x-1.5">
          {/* Reference Modal button */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-2.5 py-1 bg-[#0d0d0f] hover:bg-[#121215] border border-white/5 hover:border-white/10 rounded font-mono text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 cursor-pointer transition-all"
            title="Open G-Code Command Reference Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Command Ref</span>
          </button>

          {/* Simulation Speed Dropdown Selector */}
          <div className="flex items-center space-x-1 bg-[#0d0d0f] border border-white/5 rounded px-2 py-1 select-none">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Speed:</span>
            <select
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              disabled={simulationState.isRunning}
              className="bg-transparent text-slate-300 font-mono text-[9px] focus:outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              title="Execution step speed interval"
            >
              <option value="2000" className="bg-[#141417]">0.5x (Slow)</option>
              <option value="1500" className="bg-[#141417]">0.75x</option>
              <option value="1000" className="bg-[#141417]">1.0x (Normal)</option>
              <option value="500" className="bg-[#141417]">2.0x (Fast)</option>
              <option value="250" className="bg-[#141417]">4.0x (Turbo)</option>
            </select>
          </div>

          <button
            onClick={handleCompileAndRun}
            className={`flex items-center space-x-1.5 px-3 py-1 font-mono text-[10px] font-bold rounded leading-none cursor-pointer border transition-all duration-300 ${
              simulationState.isRunning
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                : "bg-blue-600 hover:bg-blue-500 text-white border-blue-700 shadow-lg"
            }`}
          >
            {simulationState.isRunning ? (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>STOP DIAGNOSTIC</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>BUILD & FLASH</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main IDE grid layout */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row border-b border-white/5 md:overflow-hidden">
        
        {/* Workspace Explorer column (Left sidebar) - Collapsible */}
        {sidebarOpen && (
          <div className="w-full md:w-48 bg-[#141417] p-2.5 border-r border-[#1e1e23] flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-left duration-150">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 font-bold tracking-wider uppercase mb-2 pb-1 border-b border-[#1e1e23] select-none">
              <span>Explorer</span>
              <button
                onClick={() => {
                  setNewFileName("");
                  setShowAddFile(true);
                }}
                className="hover:text-white transition-colors bg-[#0d0d0f] hover:bg-[#1a1a20] rounded p-0.5 border border-white/5 cursor-pointer"
                title="Add New File"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* List of files in active directory */}
            <div className="space-y-0.5 flex-1 select-none">
              {files.map((file, idx) => {
                const isActive = idx === activeFileIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveFileIndex(idx);
                      setActiveLanguage(
                        file.language === "gcode" ? { id: "gcode", name: "CIM G-Code", extension: ".gcode", syntaxCategory: "gcode" } :
                        file.language === "python" ? { id: "python", name: "MicroPython", extension: ".py", syntaxCategory: "python" } :
                        { id: "arduino", name: "Arduino Dialect (C++)", extension: ".ino", syntaxCategory: "arduino" }
                      );
                    }}
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer font-mono text-[11px] transition-colors ${
                      isActive ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "text-slate-400 hover:text-slate-205 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <FileCode className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-slate-550"}`} />
                      <span className="truncate text-[11px]">{file.name}</span>
                    </div>
                    {file.isCustom && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFile(idx, e);
                        }}
                        className="text-slate-600 hover:text-rose-450 p-0.5 transition-colors cursor-pointer"
                        title="Remove File"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active board hardware specs block */}
            <div className="bg-[#0d0d0f] border border-white/5 rounded p-2 mt-3 space-y-1.5">
              <div className="flex items-center space-x-1 px-0.5">
                <Cpu className="w-3 h-3 text-blue-400" />
                <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">SYSTEM UNIT</span>
              </div>
              <div className="space-y-0.5 text-[9px] font-mono text-slate-500">
                <div className="flex justify-between">
                  <span>MCU:</span>
                  <span className="text-slate-300 font-semibold truncate max-w-[80px] text-right" title={activeBoard.name}>{activeBoard.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Core:</span>
                  <span className="text-slate-300 truncate max-w-[80px] text-right" title={activeBoard.processor}>{activeBoard.processor}</span>
                </div>
                <div className="flex justify-between">
                  <span>SRAM/ROM:</span>
                  <span className="text-slate-300">{activeBoard.ramSize} / {activeBoard.romSize}</span>
                </div>
                <div className="flex justify-between text-blue-500 font-bold">
                  <span>State:</span>
                  <span className="font-semibold text-emerald-450 shadow-[0_0_8px_rgba(34,197,94,0.3)]">COM22_OK</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Text Code Editor Panel with custom dynamic scroll view */}
        <div className="flex-1 flex flex-col bg-[#1e1e23] min-w-0 md:overflow-hidden">
          
          {/* HORIZONTAL FILE TABS BAR -- AMAZING FOR MOBILE & FAST ACCESS */}
          <div className="flex border-b border-[#1e1e23] bg-[#141417] overflow-x-auto scrollbar-none select-none shrink-0">
            {files.map((file, idx) => {
              const isActive = idx === activeFileIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveFileIndex(idx);
                    setActiveLanguage(
                      file.language === "gcode" ? { id: "gcode", name: "CIM G-Code", extension: ".gcode", syntaxCategory: "gcode" } :
                      file.language === "python" ? { id: "python", name: "MicroPython", extension: ".py", syntaxCategory: "python" } :
                      { id: "arduino", name: "Arduino Dialect (C++)", extension: ".ino", syntaxCategory: "arduino" }
                    );
                  }}
                  className={`flex items-center space-x-1 px-3.5 py-2 border-r border-[#1e1e23] font-mono text-[11px] leading-none shrink-0 transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1e1e23] text-blue-400 font-bold border-t-2 border-t-blue-500"
                      : "text-slate-500 hover:text-slate-350 hover:bg-[#121215]/80"
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  <span>{file.name}</span>
                  {file.isCustom && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(idx, e);
                      }}
                      className="ml-1 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-full p-0.5 cursor-pointer"
                      title="Delete script"
                    >
                      <X className="w-2.5 h-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
            
            <button
              onClick={() => {
                setNewFileName("");
                setShowAddFile(true);
              }}
              className="px-2.5 text-slate-500 hover:text-white flex items-center justify-center hover:bg-white/5 transition-colors cursor-pointer"
              title="Create new script file"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Editor Header controls */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#141417] border-b border-white/5 shrink-0">
            <span className="font-mono text-[9px] text-slate-500 font-semibold tracking-wider uppercase">
              main_code // {activeFile.name}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleDownloadCode}
                title="Download current file"
                className="px-2 py-0.5 bg-[#0d0d0f] border border-white/5 rounded text-[9px] font-mono text-slate-400 hover:text-white inline-flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Export</span>
              </button>
              
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import local project"
                className="px-2 py-0.5 bg-[#0d0d0f] border border-white/5 rounded text-[9px] font-mono text-slate-400 hover:text-white inline-flex items-center space-x-1 cursor-pointer transition-colors"
              >
                <Upload className="w-3 h-3" />
                <span>Import</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleUploadCode}
                accept=".ino,.py,.cpp,.gcode,.txt"
                className="hidden"
              />
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden font-mono text-xs relative">
            {/* Visual Editor line-numbers gutter */}
            <div className="bg-[#141417] px-2 py-4 border-r border-[#1e1e23] text-right text-slate-600 select-none space-y-0.5 leading-5 w-8 text-[10px] items-stretch">
              {activeFile.content.split("\n").map((_, lineIdx) => {
                const isLineHighlight = simulationState.isRunning && simulationState.currentLine === lineIdx + 1;
                return (
                  <div
                    key={lineIdx}
                    className={`transition-colors ${isLineHighlight ? "text-blue-400 font-bold" : ""}`}
                  >
                    {lineIdx + 1}
                  </div>
                );
              })}
            </div>

            {/* Main Interactive text editor input */}
            <div className="flex-1 h-full relative">
              <textarea
                value={activeFile.content}
                onChange={(e) => onFileChange(e.target.value)}
                className="w-full h-full bg-[#1e1e23] text-slate-200 p-3 leading-5 font-mono focus:outline-none resize-none overflow-y-auto selection:bg-blue-500/20 text-[12px] lg:text-[13px]"
                style={{ tabSize: 2 }}
                placeholder="// Enter code here..."
              />

              {/* Line spotlight highlights for active execution coordinates */}
              {simulationState.isRunning && activeFile.language === "gcode" && (
                <div 
                  className="absolute left-0 right-0 h-5 bg-blue-550/10 border-l-2 border-blue-500 pointer-events-none transition-all duration-300"
                  style={{ 
                    top: `${3 + (simulationState.currentLine - 1) * 20}px` 
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Compiler logs Console & Output (Bottom bar) */}
      <div className="h-40 bg-[#141417] border-t border-white/5 flex flex-col shrink-0">
        <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141417] border-b border-white/5">
          <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-500 font-bold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            <span>Serial Flash Terminal Output</span>
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[9px] font-mono text-slate-600 hover:text-slate-300 uppercase transition-colors"
          >
            Clear
          </button>
        </div>
        
        {/* Terminal logs listing */}
        <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] lg:text-[11px] space-y-1 leading-snug select-text">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic">No console telemetry signals. Compile or flash code to begin parsing...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-start space-x-2">
                <span className="text-slate-600 flex-shrink-0 select-none">[{log.timestamp}]</span>
                <span className={`flex-1 ${
                  log.type === "success" ? "text-[#22c55e] font-semibold" :
                  log.type === "warn" ? "text-amber-400" :
                  log.type === "error" ? "text-rose-400 font-bold" :
                  "text-slate-350"
                }`}>
                  {log.text}
                </span>
              </div>
            ))
          )}
          <div ref={terminalBottomRef} />
        </div>
      </div>

      {/* 5. Centered Modal Dialogs */}

      {/* File Creation Centered Dialog Modal */}
      {showAddFile && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#1a1a1e] border border-white/10 rounded-lg max-w-sm w-full shadow-2xl p-4 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-blue-500" />
                <span>Create Workspace Script</span>
              </span>
              <button 
                onClick={() => setShowAddFile(false)} 
                className="text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Script Name:</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. pick_and_place"
                className="w-full bg-[#0d0d0f] border border-white/10 text-slate-200 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 transition-colors"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFile();
                }}
              />
              <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                Will auto-apply the extension <span className="text-blue-400 font-semibold">{activeLanguage.extension}</span> matching the active language context ({activeLanguage.name}).
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2 border-t border-white/5">
              <button
                onClick={() => setShowAddFile(false)}
                className="px-3 py-1.5 bg-[#0d0d0f] border border-white/5 hover:bg-[#141417] rounded text-xs font-mono text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-mono font-bold shadow-lg cursor-pointer"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Reference Center Centered Dialog Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-[#1a1a1e] border border-white/10 rounded-lg max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 bg-[#141417]">
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Industrial 5-DOF CIM Controller Manual
                </span>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)} 
                className="text-slate-500 hover:text-slate-200 p-1 rounded-full hover:bg-white/5 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs leading-relaxed font-mono text-slate-300">
              <div className="space-y-1 bg-[#0d0d0f] border border-white/5 p-3 rounded">
                <div className="text-blue-400 font-bold text-[10px] uppercase tracking-wider">System Kinematics & Coordinate Mappings</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  The CIM Robotic Arm operates using 5 degrees of freedom: <span className="text-slate-200 font-semibold">X, Y, Z</span> represent the Cartesian Tool Center Point (TCP). 
                  <span className="text-slate-200 font-semibold">A</span> controls the industrial wrist pitch angle (-120° to 120°), while 
                  <span className="text-slate-200 font-semibold">B</span> dictates the absolute waist/base rotation (-180° to 180°).
                </p>
              </div>

              <div>
                <div className="text-emerald-400 font-bold border-b border-white/5 pb-1 mb-2 uppercase text-[10px] tracking-wider">Standard G-Codes Guide</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-2">
                    <div>
                      <code className="text-blue-400 font-bold">G00 [Coords]</code>
                      <p className="text-slate-400">Rapid travel path placement. Moves links concurrently at max frequency. E.g. <code className="text-slate-200 font-semibold">G00 X150 Y150 Z250</code></p>
                    </div>
                    <div>
                      <code className="text-blue-400 font-bold">G01 [Coords] F[speed]</code>
                      <p className="text-slate-400">Precision linear interpolation with custom Feedrate control. E.g. <code className="text-slate-200 font-semibold">G01 X150 Y20 Z10 F1200</code></p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <code className="text-blue-400 font-bold">G90</code>
                      <p className="text-slate-400 cursor-text">Activates absolute programming coordinate mode (standard default).</p>
                    </div>
                    <div>
                      <code className="text-blue-400 font-bold">G21</code>
                      <p className="text-slate-400 cursor-text">Activates metric dimensions system. Arm metrics are computed in millimeters.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-amber-400 font-bold border-b border-white/5 pb-1 mb-2 uppercase text-[10px] tracking-wider">Actuator M-Codes Guide</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div className="space-y-2">
                    <div>
                      <code className="text-blue-400 font-bold">M03 S1 / S0</code>
                      <p className="text-slate-400">Toggles the horizontal digital assembly line. <code className="text-slate-200 font-semibold">S1</code> starts the conveyor belt; <code className="text-slate-200 font-semibold">S0</code> halts it.</p>
                    </div>
                    <div>
                      <code className="text-blue-400 font-bold">M66 P1 L3 Q5</code>
                      <p className="text-slate-400">Interlock breaker. Pauses sequence block until breakbeam scanner registers an approaching workpiece.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <code className="text-blue-400 font-bold">M05 P1 / P0</code>
                      <p className="text-slate-400 cursor-text">Pneumatic vacuum suction control. <code className="text-slate-200 font-semibold">P1</code> actuates suction to grab targets; <code className="text-slate-200 font-semibold">P0</code> releases/vents it.</p>
                    </div>
                    <div>
                      <code className="text-blue-400 font-bold">M09</code>
                      <p className="text-slate-400 cursor-text">Flashes safety strobe signaling block completion.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="text-teal-400 font-bold uppercase text-[10px] tracking-wider mb-2">Advanced Macro Blocks</div>
                <p className="text-slate-400 text-[11px] leading-relaxed mb-2">
                  To establish endless automation workflows, structure pick-and-place codes within repeat sub-loops:
                </p>
                <div className="bg-black/50 p-2.5 rounded font-mono text-[10px] text-emerald-450 border border-white/5">
                  O100 REPEAT [9999]<br />
                  &nbsp;&nbsp;; sequential pick/place tasks here<br />
                  O100 ENDREPEAT
                </div>
              </div>
            </div>
            
            <div className="flex justify-end px-4 py-3 bg-[#141417] border-t border-white/5 shrink-0">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white font-mono font-bold transition-colors cursor-pointer"
              >
                Close Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
