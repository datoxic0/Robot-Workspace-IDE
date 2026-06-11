import React, { useState, useEffect, useRef } from "react";
import { 
  Workflow, 
  Settings, 
  Compass, 
  Activity, 
  Cpu, 
  Grid, 
  Layers, 
  Maximize2, 
  Sliders, 
  Eye, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  Trash2, 
  TrendingUp, 
  ShieldAlert, 
  BookOpen, 
  Award, 
  Zap,
  Hammer,
  EyeOff,
  Tv,
  CheckCircle,
  Code,
  Terminal,
  Home,
  Briefcase,
  Share2,
  Download,
  Upload,
  FileText,
  Check,
  AlertCircle,
  Database,
  Video,
  Printer,
  RefreshCw
} from "lucide-react";

// --- Types for CAD objects ---
interface CADObject {
  id: string;
  name: string;
  type: "robot_arm" | "conveyor" | "pallet" | "camera" | "sensor" | "amr" | "barrier" | "machine_tool" | "human";
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  status: "idle" | "active" | "error";
}

// --- Types for Custom Joint Creator ---
interface CustomJoint {
  id: string;
  name: string;
  type: "revolute" | "prismatic" | "spherical";
  length: number; // mm
  mass: number; // kg
  motorType: "servo" | "stepper" | "bldc" | "hydraulic";
  torque: number; // Nm
  gearRatio: number;
  activeAngle: number;
}

// --- PLC Instruction / Rung types ---
interface PLCRung {
  id: string;
  inputContact1: "normally_open" | "normally_closed";
  inputVar1: string;
  inputContact2: "normally_open" | "normally_closed" | "none";
  inputVar2: string;
  outputCoil: string;
  timeDelay: number; // seconds
  isActive: boolean;
}

interface DigitalTwinStudioProps {
  robotDesign?: any;
  setRobotDesign?: any;
}

export default function DigitalTwinStudio({ robotDesign, setRobotDesign }: DigitalTwinStudioProps) {
  // --- CIM Syncing Notifications and Alerts ---
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "loading" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  // --- Profile Storage & Local Persistence ---
  const [profileName, setProfileName] = useState("CIM Ultra-Reach Setup A");
  const [savedProfiles, setSavedProfiles] = useState<{ name: string; timestamp: string; joints: any[]; objects: any[]; plcs: any[] }[]>([]);

  // --- CAE Compliance & Bill of Materials Report ---
  const [isReportOpen, setIsReportOpen] = useState(false);

  // --- Interactive Timeline & Camera Simulation Capture ---
  const [activeCameraView, setActiveCameraView] = useState<string>("CCTV-Overhead-01");
  const [timelineFrame, setTimelineFrame] = useState(140);
  const [isRecordingSim, setIsRecordingSim] = useState(false);
  const [recordingSuccessAlert, setRecordingSuccessAlert] = useState<string | null>(null);

  // --- 1. Top Level Tabs ---
  const [activeTab, setActiveTab] = useState<
    "workspace-cad" | "robot-builder" | "automation-plc" | "vision-lab" | "motion-planning" | "analytics-center" | "learning-academy"
  >("workspace-cad");

  // --- 2. Design Mode ---
  const [environmentType, setEnvironmentType] = useState<"factory" | "domestic">("factory");
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // --- 3. Digital Twin Simulation Controls ---
  const [isSimulating, setIsSimulating] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [powerConsumption, setPowerConsumption] = useState(380); // Live Watts
  const [totalEnergyWh, setTotalEnergyWh] = useState(1420); // total accumulated Wh
  const [safetyAlertLevel, setSafetyAlertLevel] = useState<"nominal" | "warning" | "halt">("nominal");
  const [collisionLog, setCollisionLog] = useState<string[]>([
    "System nominal - Area scanner clear.",
    "AMR-24 docked at station 1."
  ]);

  // --- 4. CAD Drag and Drop states ---
  const [cadObjects, setCadObjects] = useState<CADObject[]>([
    { id: "cad-1", name: "Articulated KR-60", type: "robot_arm", x: 180, y: 150, rotation: 45, width: 44, height: 44, status: "active" },
    { id: "cad-2", name: "Spawning Conveyor", type: "conveyor", x: 80, y: 260, rotation: 0, width: 280, height: 26, status: "active" },
    { id: "cad-3", name: "Unload Pallet B3", type: "pallet", x: 380, y: 140, rotation: 90, width: 50, height: 50, status: "idle" },
    { id: "cad-4", name: "LiDAR Guard Scanner", type: "sensor", x: 280, y: 80, rotation: 120, width: 22, height: 22, status: "active" },
    { id: "cad-5", name: "Smart AMR Transport", type: "amr", x: 320, y: 240, rotation: -30, width: 36, height: 24, status: "idle" },
    { id: "cad-6", name: "Safety Panel Left", type: "barrier", x: 40, y: 100, rotation: 90, width: 10, height: 120, status: "idle" },
    { id: "cad-7", name: "Operator Dave", type: "human", x: 110, y: 70, rotation: 180, width: 15, height: 15, status: "idle" },
  ]);
  const [selectedCADId, setSelectedCADId] = useState<string | null>("cad-1");
  const [cadProjection, setCadProjection] = useState<"top" | "front" | "side" | "perspective">("top");
  const [snapToGrid, setSnapToGrid] = useState(true);

  // --- 5. Robot Builder Custom Arms states ---
  const [customJoints, setCustomJoints] = useState<CustomJoint[]>([
    { id: "j1", name: "Base Revolute Axle", type: "revolute", length: 140, mass: 24.5, motorType: "bldc", torque: 180, gearRatio: 120, activeAngle: 30 },
    { id: "j2", name: "Shoulder Lift Boom", type: "revolute", length: 180, mass: 18.2, motorType: "servo", torque: 260, gearRatio: 160, activeAngle: -45 },
    { id: "j3", name: "Forearm Extension", type: "prismatic", length: 120, mass: 11.0, motorType: "stepper", torque: 80, gearRatio: 40, activeAngle: 65 },
    { id: "j4", name: "Wrist Pitch/Yaw Actuator", type: "spherical", length: 80, mass: 4.5, motorType: "servo", torque: 40, gearRatio: 50, activeAngle: 15 },
  ]);
  const [selectedJointId, setSelectedJointId] = useState<string | null>("j1");

  // --- 6. PLC Logic inputs & simulation states ---
  const [plcRungs, setPlcRungs] = useState<PLCRung[]>([
    { id: "r1", inputContact1: "normally_open", inputVar1: "CONVEYOR_SENSOR", inputContact2: "normally_closed", inputVar2: "E_STOP_TRIPPED", outputCoil: "ARM_TRIGGER_READY", timeDelay: 0.5, isActive: true },
    { id: "r2", inputContact1: "normally_open", inputVar1: "ARM_HEAVY_LOAD", inputContact2: "none", inputVar2: "", outputCoil: "SLOW_SPEED_LIMIT_ON", timeDelay: 0, isActive: false },
    { id: "r3", inputContact1: "normally_closed", inputVar1: "BARRIER_INTERLOCK", inputContact2: "normally_open", inputVar2: "AI_HUMAN_DETECTED", outputCoil: "SIREN_ALERT_LIGHT", timeDelay: 1.2, isActive: true },
  ]);
  const [plcInputs, setPlcInputs] = useState<Record<string, boolean>>({
    CONVEYOR_SENSOR: true,
    E_STOP_TRIPPED: false,
    ARM_HEAVY_LOAD: false,
    BARRIER_INTERLOCK: true,
    AI_HUMAN_DETECTED: false,
  });
  const [selectedRungId, setSelectedRungId] = useState<string | null>("r1");
  const [plcCompileLog, setPlcCompileLog] = useState<string[]>([
    "PLC structured parser initialized.",
    "Ladder structures fully matching IEC 61131-3 code syntax.",
    "Simulation cycle loop rate set to 50ms runtimes."
  ]);

  // --- 7. Robot Vision Laboratory states ---
  const [cameraFov, setCameraFov] = useState(95);
  const [visionMode, setVisionMode] = useState<"raw_camera" | "yolo_ai_model" | "lidar_echodepth">("yolo_ai_model");
  const [detectedTargets, setDetectedTargets] = useState([
    { class: "Workpiece", conf: 0.98, x: 195, y: 155, box: "w-24 h-16" },
    { class: "Personnel Dave", conf: 0.94, x: 120, y: 65, box: "w-16 h-28 border-rose-500 bg-rose-500/10" },
    { class: "AMR DriveBase", conf: 0.89, x: 310, y: 235, box: "w-20 h-20 border-yellow-500 bg-yellow-500/10" },
  ]);

  // --- 8. Motion Planning solver settings ---
  const [planningAlgorithm, setPlanningAlgorithm] = useState<"A_Star" | "RRT_Star" | "PRM">("RRT_Star");
  const [ikTarget, setIkTarget] = useState({ x: 260, y: 140, z: 90 });
  const [calculatedAngles, setCalculatedAngles] = useState({ theta1: 42.5, theta2: -15.2, theta3: 78.4 });
  const [pathfindingStep, setPathfindingStep] = useState(0);

  // --- 9. Academy guided tracks ---
  const [currentCourse, setCurrentCourse] = useState("industrial_robot_engineer");
  const [labs, setLabs] = useState([
    { id: "lab-1", title: "Kinematic Workspace Mapping", status: "completed", reward: "IK Expert Badge" },
    { id: "lab-2", title: "PLC Ladder Logic Assembly", status: "in_progress", reward: "Controls Engineer Certification" },
    { id: "lab-3", title: "Failsafe Vision Interlock Calibration", status: "locked", reward: "Safety Systems Designer" },
    { id: "lab-4", title: "OEE Predictive Maintenance Setup", status: "locked", reward: "Analytics Specialist" },
  ]);

  // Synchronize latest cadObjects and plcInputs via refs to prevent stale closure loops
  const plcInputsRef = useRef(plcInputs);
  plcInputsRef.current = plcInputs;

  const cadObjectsRef = useRef(cadObjects);
  cadObjectsRef.current = cadObjects;

  // --- 10. Simulate conveyor part flow inside CAD canvas ---
  const [convPartPos, setConvPartPos] = useState(0);

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      // Move parts on conveyor
      setConvPartPos(prev => {
        if (prev >= 100) return 0;
        return prev + 1.5 * simulationSpeed;
      });

      // Fluctuate live energy variables slightly
      setPowerConsumption(prev => {
        const base = 350 + Math.sin(Date.now() / 2000) * 45;
        const speedBoost = simulationSpeed * 30;
        return Math.round(base + speedBoost);
      });

      // Gradually accumulate watt-hours
      setTotalEnergyWh(prev => prev + 0.1 * simulationSpeed);

      // Trigger automatic warning checks using refs to always read fresh state
      const currentCadObjects = cadObjectsRef.current;
      const currentPlcInputs = plcInputsRef.current;

      const isDaveClose = currentCadObjects.find(c => c.name === "Operator Dave");
      const isRobotWorking = currentCadObjects.find(c => c.name === "Articulated KR-60");
      if (isDaveClose && isRobotWorking) {
        // Dave is near the operating region
        const distance = Math.sqrt((isDaveClose.x - isRobotWorking.x) ** 2 + (isDaveClose.y - isRobotWorking.y) ** 2);
        if (distance < 110) {
          setSafetyAlertLevel(prev => prev !== "warning" ? "warning" : prev);
          if (currentPlcInputs.AI_HUMAN_DETECTED === false) {
            setPlcInputs(prev => ({ ...prev, AI_HUMAN_DETECTED: true }));
            setCollisionLog(prev => [
              `[WARN - ${new Date().toLocaleTimeString()}] Safety field violated! Dave entered warning boundary.`,
              ...prev.slice(0, 4)
            ]);
          }
        } else {
          setSafetyAlertLevel(prev => prev !== "nominal" ? "nominal" : prev);
          if (currentPlcInputs.AI_HUMAN_DETECTED === true) {
            setPlcInputs(prev => ({ ...prev, AI_HUMAN_DETECTED: false }));
          }
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed]);

  // --- Drag & Drop CAD placement triggers ---
  const handleDragObject = (id: string, dx: number, dy: number) => {
    setCadObjects(prev => prev.map(obj => {
      if (obj.id !== id) return obj;
      let nx = obj.x + dx;
      let ny = obj.y + dy;
      if (snapToGrid) {
        nx = Math.round(nx / 15) * 15;
        ny = Math.round(ny / 15) * 15;
      }
      return { ...obj, x: nx, y: ny };
    }));
  };

  // Add Object to CAD Layout
  const addNewObject = (type: CADObject["type"]) => {
    const names: Record<CADObject["type"], string> = {
      robot_arm: "KUKA-300 Arm",
      conveyor: "Secondary Conveyor",
      pallet: "Pallet Stack",
      camera: "Festo CCTV Vision",
      sensor: "Sick LIDAR",
      amr: "Mobile AMR Unit",
      barrier: "Hazard Guard Fence",
      machine_tool: "CNC Machine Enclosure",
      human: "Aux Technician"
    };

    const newObj: CADObject = {
      id: `cad-${Date.now()}`,
      name: `${names[type]} (0${cadObjects.length + 1})`,
      type,
      x: 200,
      y: 120,
      rotation: 0,
      width: type === "conveyor" ? 200 : 40,
      height: type === "conveyor" ? 24 : 40,
      status: "idle"
    };

    setCadObjects(prev => [...prev, newObj]);
    setSelectedCADId(newObj.id);
  };

  const deleteSelectedCAD = () => {
    if (!selectedCADId) return;
    setCadObjects(prev => prev.filter(c => c.id !== selectedCADId));
    setSelectedCADId(null);
  };

  const getSelectedCADItem = () => {
    return cadObjects.find(c => c.id === selectedCADId) || null;
  };

  const handleUpdateCADItem = (field: keyof CADObject, val: any) => {
    if (!selectedCADId) return;
    setCadObjects(prev => prev.map(o => o.id === selectedCADId ? { ...o, [field]: val } : o));
  };

  // --- 1. Load profiles from LocalStorage on mount ---
  useEffect(() => {
    const raw = localStorage.getItem("cim_digital_twin_profiles");
    if (raw) {
      try {
        setSavedProfiles(JSON.parse(raw));
      } catch (e) {
        console.error("Failed to parse saved profiles", e);
      }
    } else {
      // Seed initial mock profiles
      const seedProfiles = [
        {
          name: "Factory Core Profile v1",
          timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString(),
          joints: [
            { id: "j1", name: "Base Revolute Axle", type: "revolute" as const, length: 140, mass: 24.5, motorType: "bldc" as const, torque: 180, gearRatio: 120, activeAngle: 30 },
            { id: "j2", name: "Shoulder Lift Boom", type: "revolute" as const, length: 180, mass: 18.2, motorType: "servo" as const, torque: 260, gearRatio: 160, activeAngle: -45 },
            { id: "j3", name: "Forearm Extension", type: "prismatic" as const, length: 120, mass: 11.0, motorType: "stepper" as const, torque: 80, gearRatio: 40, activeAngle: 65 },
            { id: "j4", name: "Wrist Pitch/Yaw Actuator", type: "spherical" as const, length: 80, mass: 4.5, motorType: "servo" as const, torque: 40, gearRatio: 50, activeAngle: 15 },
          ],
          objects: cadObjects,
          plcs: plcRungs
        }
      ];
      setSavedProfiles(seedProfiles);
      localStorage.setItem("cim_digital_twin_profiles", JSON.stringify(seedProfiles));
    }
  }, []);

  // --- 2. Bidirectional Syncing: Push Design parameters to CIM Physical Workshop ---
  const handlePushToPhysical = () => {
    if (!setRobotDesign) {
      setSyncStatus("error");
      setSyncMessage("CIM Physical Workshop hook is unavailable or unmounted.");
      return;
    }

    setSyncStatus("loading");
    setSyncMessage("Transmitting Denavit-Hartenberg parameter matrices to Physical CIM Controller...");

    setTimeout(() => {
      // Extract segment lengths from joints list
      const j1Len = customJoints.find(j => j.id === "j1")?.length || 140;
      const j2Len = customJoints.find(j => j.id === "j2")?.length || 180;
      const j3Len = customJoints.find(j => j.id === "j3")?.length || 120;
      const j4Len = customJoints.find(j => j.id === "j4")?.length || 80;

      // Extract details
      const totalJointMass = customJoints.reduce((sum, j) => sum + j.mass, 0);

      setRobotDesign((prev: any) => ({
        ...prev,
        baseWidth: j1Len,
        shoulderLength: j2Len,
        elbowLength: j3Len,
        wristLength: j4Len,
        payloadWeight: parseFloat((totalJointMass * 0.15).toFixed(2)), // Calculated leverage scaling
      }));

      setSyncStatus("success");
      setSyncMessage(`Push Successful! Handshook 4-DOF mechanical parameters securely with the physical room. [Base: ${j1Len}mm, Shoulder: ${j2Len}mm, Elbow: ${j3Len}mm, Wrist: ${j4Len}mm]`);
      
      // Auto-clear message
      setTimeout(() => setSyncStatus("idle"), 6000);
    }, 1100);
  };

  // --- 3. Bidirectional Syncing: Pull setup parameters from Physical CIM Workshop ---
  const handlePullFromPhysical = () => {
    if (!robotDesign) {
      setSyncStatus("error");
      setSyncMessage("Unable to read parameters from Physical CIM Room.");
      return;
    }

    setSyncStatus("loading");
    setSyncMessage("Querying state feedback from CIM physical room arm telemetry registers...");

    setTimeout(() => {
      const physicalBase = robotDesign.baseWidth || 140;
      const physicalShoulder = robotDesign.shoulderLength || 180;
      const physicalElbow = robotDesign.elbowLength || 120;
      const physicalWrist = robotDesign.wristLength || 80;

      setCustomJoints(prev => prev.map(j => {
        if (j.id === "j1") return { ...j, length: physicalBase };
        if (j.id === "j2") return { ...j, length: physicalShoulder };
        if (j.id === "j3") return { ...j, length: physicalElbow };
        if (j.id === "j4") return { ...j, length: physicalWrist };
        return j;
      }));

      setSyncStatus("success");
      setSyncMessage(`Pull Successful! Imported physical workspace bounds. Joint lengths updated in Digital Twin schematic.`);
      
      setTimeout(() => setSyncStatus("idle"), 6000);
    }, 1000);
  };

  // --- 4. Store design profile as backup in localStorage ---
  const handleSaveProfile = () => {
    if (!profileName.trim()) return;

    const newProfile = {
      name: profileName,
      timestamp: new Date().toLocaleString(),
      joints: customJoints,
      objects: cadObjects,
      plcs: plcRungs
    };

    const updated = [newProfile, ...savedProfiles.filter(p => p.name !== profileName)];
    setSavedProfiles(updated);
    localStorage.setItem("cim_digital_twin_profiles", JSON.stringify(updated));
    
    setSyncStatus("success");
    setSyncMessage(`Profile "${profileName}" written to local storage database successfully.`);
    setTimeout(() => setSyncStatus("idle"), 4000);
  };

  // --- 5. Delete a saved profile ---
  const handleDeleteProfile = (pName: string) => {
    const updated = savedProfiles.filter(p => p.name !== pName);
    setSavedProfiles(updated);
    localStorage.setItem("cim_digital_twin_profiles", JSON.stringify(updated));
  };

  // --- 6. Load database profile into active state ---
  const handleLoadProfile = (prof: any) => {
    if (prof.joints) setCustomJoints(prof.joints);
    if (prof.objects) setCadObjects(prof.objects);
    if (prof.plcs) setPlcRungs(prof.plcs);
    setProfileName(prof.name);

    setSyncStatus("success");
    setSyncMessage(`Loaded schema profile: ${prof.name}`);
    setTimeout(() => setSyncStatus("idle"), 4000);
  };

  // --- 7. Export profile metadata as JSON file download ---
  const handleExportJSON = () => {
    const payload = {
      manifest: {
        creator: "CIM CAD CAE Studio IDE",
        version: "4.0.0 Pro",
        timestamp: new Date().toISOString(),
        profileName
      },
      physicalRobotConfig: {
        joints: customJoints,
        totalMassKg: customJoints.reduce((sum, j) => sum + j.mass, 0),
        totalTorqueNm: customJoints.reduce((sum, j) => sum + j.torque, 0)
      },
      spatialLayout: {
        cadObjects,
        environmentType
      },
      autonomousPlc: {
        rungs: plcRungs,
        inputs: plcInputs
      }
    };

    const fileData = JSON.stringify(payload, null, 2);
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${profileName.toLowerCase().replace(/\s+/g, "_")}_cim_twin_schema.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- 8. Dynamic File Uploader structure ---
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.physicalRobotConfig?.joints && data.spatialLayout?.cadObjects) {
          setCustomJoints(data.physicalRobotConfig.joints);
          setCadObjects(data.spatialLayout.cadObjects);
          if (data.autonomousPlc?.rungs) setPlcRungs(data.autonomousPlc.rungs);
          if (data.manifest?.profileName) setProfileName(data.manifest.profileName);
          if (data.spatialLayout?.environmentType) setEnvironmentType(data.spatialLayout.environmentType);

          setSyncStatus("success");
          setSyncMessage(`Success! Validated and mounted imported schema "${file.name}" cleanly.`);
          setTimeout(() => setSyncStatus("idle"), 5000);
        } else {
          setSyncStatus("error");
          setSyncMessage("Invalid configuration structure! Missing core physicalRobotConfig tags.");
        }
      } catch (err) {
        setSyncStatus("error");
        setSyncMessage("Failure parsing file. Check syntax parsing validation.");
      }
    };
    reader.readAsText(file);
  };

  // --- 9. Toggle simulation video recording sequence ---
  const handleToggleRecording = () => {
    if (isRecordingSim) {
      // Stopped recording - trigger alert download prompt
      setIsRecordingSim(false);
      const randomSeed = Math.floor(Math.random() * 9000) + 1000;
      setRecordingSuccessAlert(`Success! Video telemetry pipeline captured ${timelineFrame} frames at 60FPS. Buffer written to "sim_render_stream_#${randomSeed}.mp4"`);
      
      // Download simulated report file
      const telemetryRows = [
        ["CIM SIMULATION SEQUENCE TELEMETRY LOG REPORT"],
        [`Timestamp: ${new Date().toLocaleString()}`],
        [`Profile: ${profileName}`],
        [`Active Camera View: ${activeCameraView}`],
        [`Frames Logged: ${timelineFrame}`],
        ["Joint 1 Base Reach Angle", "Joint 2 Shoulder Angle", "Joint 3 Elbow Angle", "Live Energy Watts"],
      ];
      // Generate some mock frames
      for (let i = 0; i <= timelineFrame; i += 10) {
        telemetryRows.push([
          `Frame-${i}`,
          `${Math.round(25 + Math.sin(i / 10) * 15)}Deg`,
          `${Math.round(-30 + Math.cos(i / 10) * 20)}Deg`,
          `${Math.round(340 + Math.sin(i / 5) * 40)}W`
        ]);
      }
      const csvContent = "data:text/csv;charset=utf-8," + telemetryRows.map(e => e.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `cim_sim_sequence_#${randomSeed}_telemetry.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      setRecordingSuccessAlert(null);
      setIsRecordingSim(true);
      setTimelineFrame(0);
    }
  };

  // Increment simulated frames if recording
  useEffect(() => {
    if (!isRecordingSim) return;
    const interval = setInterval(() => {
      setTimelineFrame(f => {
        if (f >= 300) {
          return 300;
        }
        return f + 1;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [isRecordingSim]);

  // Handle auto-stop recording cleanly to avoid state updates inside active render/updater closures
  useEffect(() => {
    if (isRecordingSim && timelineFrame >= 300) {
      setIsRecordingSim(false);
    }
  }, [isRecordingSim, timelineFrame]);

  // --- 10. Printable report layout with BOM (Bill of Materials) ---
  const handlePrintBOM = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker prevented launching the print viewport. Please clear blocker flags.");
      return;
    }

    // Prepare printable document HTML content
    const totalAssemblyWeight = customJoints.reduce((sum, j) => sum + j.mass, 0) + 15;// riser pad
    const totalJointTorques = customJoints.reduce((sum, j) => sum + j.torque, 0);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>CIM Digital Twin CAE Sheet: ${profileName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; background: white; }
            h1 { font-size: 24px; border-bottom: 3px solid #14b8a6; padding-bottom: 8px; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; }
            h2 { font-size: 16px; margin-top: 30px; text-transform: uppercase; color: #334155; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 15px; }
            .card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc; }
            .card-title { font-[8px] font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 6px; }
            .card-value { font-size: 20px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #0f766e; color: white; padding: 8px; text-align: left; text-transform: uppercase; font-size: 11px; }
            td { padding: 9px; border-bottom: 1px solid #e2e8f0; }
            tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 40px; font-size: 11px; color: #64748b; border-t: 1px dashed #cbd5e1; pt: 10px; text-align: center; }
            .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .badge-green { bg: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          </style>
        </head>
        <body>
          <h1>CIM CAD/CAE System Diagnostic Report</h1>
          <p><strong>Profile Name:</strong> ${profileName}</p>
          <p><strong>Generated Timestamp:</strong> ${new Date().toString()}</p>
          <p><strong>Regulatory Compliance Standards:</strong> IEC-61131-3 PLC Industrial Safety Interlocks Active</p>
          
          <h2>1. Mechanical & Mathematical Linkage Telemetry</h2>
          <div class="grid">
            <div class="card">
              <div class="card-title">Total Assembly Weight</div>
              <div class="card-value">${totalAssemblyWeight.toFixed(1)} kg</div>
              <p style="font-size: 11px; margin: 5px 0 0; color: #64748b;">Includes 15kg foundational riser block and 4 links</p>
            </div>
            <div class="card">
              <div class="card-title">Accumulated Joint Torque</div>
              <div class="card-value">${totalJointTorques} Nm</div>
              <p style="font-size: 11px; margin: 5px 0 0; color: #64748b;">Peak operational torque limits at 48V nominal voltage feed</p>
            </div>
          </div>

          <h2>2. Bill of Materials (BOM) & Inventory Costs</h2>
          <table>
            <thead>
              <tr>
                <th>Part Ref</th>
                <th>Description</th>
                <th>Manufacturer / Source</th>
                <th>Qty</th>
                <th>Unit Weight (kg)</th>
                <th>Est. Price (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CIM-BASE-REV-01</td>
                <td>High-Precision Riser Foundation & TurnTable Base Link (Joint 1, length: ${customJoints[0]?.length || 140}mm)</td>
                <td>Festo Kinematics Inc.</td>
                <td>1</td>
                <td>24.5 kg</td>
                <td>$1,299.00</td>
              </tr>
              <tr>
                <td>CIM-SHOULDER-LIFT-02</td>
                <td>Segment-2 Shoulder Extension Boom Arm (Joint 2, length: ${customJoints[1]?.length || 180}mm)</td>
                <td>KUKA Robotics Corp</td>
                <td>1</td>
                <td>18.2 kg</td>
                <td>$850.00</td>
              </tr>
              <tr>
                <td>CIM-ELBOW-PRIS-03</td>
                <td>Segment-3 Forearm Structural Beam Linkage (Joint 3, length: ${customJoints[2]?.length || 120}mm)</td>
                <td>Harmonic Drive Labs</td>
                <td>1</td>
                <td>11.0 kg</td>
                <td>$720.00</td>
              </tr>
              <tr>
                <td>CIM-WRIST-PITCH-04</td>
                <td>Segment-4 Spherical Wrist Angle Pitch Terminal (Joint 4, length: ${customJoints[3]?.length || 80}mm)</td>
                <td>Maxon Motors AG</td>
                <td>1</td>
                <td>4.5 kg</td>
                <td>$540.00</td>
              </tr>
              <tr>
                <td>CIM-MOTOR-BLDC-48V</td>
                <td>High-Torque Synchronous Brushless DC Motors with Encoders</td>
                <td>Festo Germany</td>
                <td>4</td>
                <td>1.6 kg</td>
                <td>$499.00</td>
              </tr>
              <tr>
                <td>CIM-CONV-BELT-A</td>
                <td>Secondary Variable Speed Part Spawning Conveyor Belt System</td>
                <td>CIM Industries</td>
                <td>1</td>
                <td>12.0 kg</td>
                <td>$1,450.00</td>
              </tr>
              <tr>
                <td>CIM-LIDAR-SCN-S</td>
                <td>Sick LiDAR Area Scanner with Optical interlock protection</td>
                <td>SICK Optics</td>
                <td>1</td>
                <td>2.2 kg</td>
                <td>$899.00</td>
              </tr>
              <tr>
                <td>CIM-AMR-DRIVE</td>
                <td>Autonomous Mobile AMR Transport Unit with Smart Docking Pad</td>
                <td>Mirage Mobile AMR</td>
                <td>1</td>
                <td>14.0 kg</td>
                <td>$2,300.00</td>
              </tr>
              <tr>
                <td>CIM-PLC-IEC61131</td>
                <td>32-Point PLC Embedded DIN-Rail logical microprocessor</td>
                <td>Siemens Industrial</td>
                <td>1</td>
                <td>1.5 kg</td>
                <td>$560.00</td>
              </tr>
              <tr style="font-weight: bold; background: #e2e8f0;">
                <td colspan="3" style="text-align: right;">Total Estimated Assembly:</td>
                <td>12</td>
                <td>${(totalAssemblyWeight + 28).toFixed(1)} kg</td>
                <td>$10,616.00</td>
              </tr>
            </tbody>
          </table>

          <h2>3. CAE Engineering Analysis & Compliance Matrix</h2>
          <table>
            <thead>
              <tr>
                <th>Compliance Parameter</th>
                <th>Operational Tolerance Range</th>
                <th>Measured Rating</th>
                <th>Grade / Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Rigid Kinematic Envelope</strong></td>
                <td>Max Reach Limit: 850mm</td>
                <td>840mm extension</td>
                <td><span style="color:#15803d; font-weight:bold;">PASS - Optimum Coverage</span></td>
              </tr>
              <tr>
                <td><strong>Dynamic Stress Tolerance</strong></td>
                <td>Factor of Safety (FoS) &gt; 1.50</td>
                <td>1.82 FoS factor</td>
                <td><span style="color:#15803d; font-weight:bold;">PASS - Structural Soundness</span></td>
              </tr>
              <tr>
                <td><strong>Peak Thermal Heat Draw</strong></td>
                <td>Temp Limit &lt; 75.0 °C</td>
                <td>44.5 °C core operating temp</td>
                <td><span style="color:#15803d; font-weight:bold;">PASS - Active Coolers Active</span></td>
              </tr>
              <tr>
                <td><strong>I/O Interlock Delay Cycle</strong></td>
                <td>Trip response limit &lt; 150ms</td>
                <td>42 ms system scan time</td>
                <td><span style="color:#15803d; font-weight:bold;">PASS - High Priority Failsafe</span></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>CIM-Twin CAD/CAE System Sheet - Authorized Digital Twin verification. Verified for physical room execution of mechanical profiles.</p>
            <p>&copy; 2026 VoltLogic PRO Systems. All rights reserved.</p>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0f] text-slate-200">
      
      {/* 1. Header Toolbar area of next-gen suite */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between p-3.5 bg-[#141418] border-b border-white/5 gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/25 border border-teal-500 flex items-center justify-center text-teal-400">
            <Workflow className="w-5 h-5" id="digital-twin-core-icon" />
          </div>
          <div>
            <h2 className="text-xs font-bold font-mono tracking-tight text-white uppercase">CIM Digital Twin Engine Studio</h2>
            <p className="text-[10px] font-mono text-slate-400">Virtual CAD/CAM, PLC Controllers, Core Neural Vision & Analytics Suite</p>
          </div>
        </div>

        {/* Global Live status parameters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-black/45 border border-white/5 rounded px-2 py-1">
            <span className="text-[8px] font-mono text-slate-500 font-extrabold uppercase">ENV PRES:</span>
            <div className="flex space-x-1">
              <button 
                onClick={() => setEnvironmentType("factory")}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors uppercase ${environmentType === "factory" ? "bg-teal-900/40 text-teal-300 border border-teal-500/30" : "text-slate-500 hover:text-slate-350"}`}
              >
                <Briefcase className="w-2.5 h-2.5 inline mr-1" /> Factory
              </button>
              <button 
                onClick={() => setEnvironmentType("domestic")}
                className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors uppercase ${environmentType === "domestic" ? "bg-purple-900/40 text-purple-300 border border-purple-500/30" : "text-slate-500 hover:text-slate-350"}`}
              >
                <Home className="w-2.5 h-2.5 inline mr-1" /> Domestic
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-black/45 border border-white/5 rounded px-2.5 py-1">
            <Zap className={`w-3.5 h-3.5 ${isSimulating ? "text-amber-400 animate-pulse" : "text-slate-500"}`} />
            <div className="text-[9px] font-mono leading-none">
              <div className="text-slate-400 font-bold">{powerConsumption} W <span className="text-slate-550">GRID</span></div>
              <div className="text-slate-500 text-[8px] mt-0.5">{totalEnergyWh.toFixed(1)} Wh ACCUM</div>
            </div>
          </div>

          <div className={`flex items-center space-x-2 bg-black/45 border rounded px-2.5 py-1 ${
            safetyAlertLevel === "halt" ? "border-rose-500 text-rose-400" :
            safetyAlertLevel === "warning" ? "border-amber-500 text-amber-400" :
            "border-emerald-500/40 text-emerald-400"
          }`}>
            <ShieldAlert className="w-3.5 h-3.5" />
            <div className="text-[9px] font-mono leading-none font-bold uppercase">
              {safetyAlertLevel === "halt" ? "ESTOP HALT" :
               safetyAlertLevel === "warning" ? "ZONE WARNING" : "SAFE FIELD"}
            </div>
          </div>

          {/* Core controls */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded overflow-hidden">
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className="p-1 px-2.5 hover:bg-white/5 text-slate-300 border-r border-white/10 transition-colors"
              title={isSimulating ? "Pause Twin Physics" : "Resume Twin Physics"}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <select
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
              className="bg-transparent border-none text-slate-300 font-mono text-[9px] px-1.5 focus:outline-none cursor-pointer py-0.5"
            >
              <option value="0.5" className="bg-[#141418]">0.5x Time</option>
              <option value="1" className="bg-[#141418]">1.0x Realtime</option>
              <option value="2.5" className="bg-[#141418]">2.5x Speed</option>
              <option value="5" className="bg-[#141418]">5.0x Hyper</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher Belt */}
      <div className="flex bg-[#111115] border-b border-white/5 p-1 px-3 overflow-x-auto scrollbar-none gap-1 shrink-0">
        {[
          { id: "workspace-cad", label: "1. CAD Drag & Drop Layout", icon: Grid, count: cadObjects.length },
          { id: "robot-builder", label: "2. Actuator Link Builder", icon: Hammer, count: customJoints.length },
          { id: "automation-plc", label: "3. PLC Ladder & I/O", icon: Code, count: plcRungs.length },
          { id: "vision-lab", label: "4. Neural Vision Lab", icon: Eye, count: detectedTargets.length },
          { id: "motion-planning", label: "5. Kinematics & RRT*", icon: Compass },
          { id: "analytics-center", label: "6. OEE KPI Analytics", icon: TrendingUp },
          { id: "learning-academy", label: "7. Certification Quests", icon: BookOpen, count: "2/4" },
        ].map((btn) => {
          const Icon = btn.icon;
          const isSelected = activeTab === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => setActiveTab(btn.id as any)}
              className={`flex items-center space-x-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer whitespace-nowrap border ${
                isSelected
                  ? "bg-teal-950/40 text-teal-300 border-teal-500 shadow-md shadow-teal-500/10 font-bold"
                  : "text-slate-400 bg-transparent border-transparent hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-teal-400" : "text-slate-500"}`} />
              <span>{btn.label}</span>
              {btn.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[7.5px] font-bold ${isSelected ? "bg-teal-400/20 text-teal-200" : "bg-white/5 text-slate-500"}`}>
                  {btn.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* CIM Synctronic Integration & Profiles Hub Banner */}
      <div className="bg-[#101014] border-b border-teal-500/10 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0 text-slate-300 font-mono text-[9.5px]">
        
        {/* Profile and DB Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-black/40 border border-white/5 rounded px-2.5 py-1">
            <span className="text-[8px] uppercase font-bold text-teal-400">Profile Name:</span>
            <input 
              type="text" 
              value={profileName} 
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter design name..."
              className="bg-transparent border-none text-slate-100 placeholder-slate-600 focus:outline-none w-40 font-bold"
            />
            <button 
              onClick={handleSaveProfile}
              className="p-0.5 hover:text-teal-400 text-slate-500 transition-colors"
              title="Save current profile to LocalStorage DB"
            >
              <Database className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Database Selector Dropdown */}
          {savedProfiles.length > 0 && (
            <div className="flex items-center bg-black/40 border border-white/5 rounded overflow-hidden px-2 py-0.5">
              <span className="text-[8px] uppercase font-bold text-slate-500 mr-2">Saved database profiles:</span>
              <select
                value={profileName}
                onChange={(e) => {
                  const found = savedProfiles.find(p => p.name === e.target.value);
                  if (found) handleLoadProfile(found);
                }}
                className="bg-transparent border-none text-slate-300 font-mono text-[9px] focus:outline-none cursor-pointer py-0.5 mr-2 max-w-[150px]"
              >
                <option value="" disabled className="bg-[#141418] text-slate-500">-- Load stored setup --</option>
                {savedProfiles.map((p, idx) => (
                  <option key={idx} value={p.name} className="bg-[#141418] text-slate-200">{p.name}</option>
                ))}
              </select>
              {savedProfiles.length > 1 && (
                <button
                  onClick={() => handleDeleteProfile(profileName)}
                  className="p-1 hover:text-red-400 text-slate-500 transition-colors"
                  title="Delete current profile from DB"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bidirectional Push / Pull and Files Import / Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Push design parameters */}
          <button
            onClick={handlePushToPhysical}
            className="px-2.5 py-1.5 rounded bg-teal-600/10 hover:bg-teal-600/20 border border-teal-500/30 text-teal-300 font-bold flex items-center transition-all cursor-pointer hover:shadow-lg shadow-teal-500/5 active:scale-95"
            title="Update physical kinematics, effector and cargo states in the CIM environment"
          >
            <Upload className="w-3.5 h-3.5 mr-1 text-teal-400 animate-bounce" />
            <span>Push CAD Design to Lab</span>
          </button>

          {/* Pull design parameters */}
          <button
            onClick={handlePullFromPhysical}
            className="px-2.5 py-1.5 rounded bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-300 font-bold flex items-center transition-all cursor-pointer hover:shadow-lg shadow-purple-500/5 active:scale-95"
            title="Import current physical handshaked values into CAD schematic matrix"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-purple-400" />
            <span>Pull CIM to CAD</span>
          </button>

          {/* Export / Import schema files */}
          <div className="h-4 w-px bg-white/5 mx-1 hidden sm:block" />

          <button
            onClick={handleExportJSON}
            className="px-2 py-1.5 rounded bg-[#1c1c24] hover:bg-slate-800 border border-white/5 text-slate-300 font-medium flex items-center transition-all cursor-pointer active:scale-95"
            title="Download full CAD machine profile (.json)"
          >
            <Share2 className="w-3 h-3 mr-1 text-sky-400" />
            <span>Export JSON</span>
          </button>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportJSON} 
            accept=".json" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2 py-1.5 rounded bg-[#1c1c24] hover:bg-slate-800 border border-white/5 text-slate-300 font-medium flex items-center transition-all cursor-pointer active:scale-95"
            title="Upload custom machine profile JSON"
          >
            <Upload className="w-3 h-3 mr-1 text-emerald-400" />
            <span>Import JSON</span>
          </button>

          {/* BOM printable Report button */}
          <button
            onClick={handlePrintBOM}
            className="px-2.5 py-1.5 rounded bg-amber-600/15 hover:bg-amber-600/25 border border-amber-500/35 text-amber-300 font-bold flex items-center transition-all cursor-pointer active:scale-95 ml-2 shadow shadow-amber-500/5"
            title="Launch comprehensive CAE Compliance Diagnostic Report and Bill of Materials"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-amber-400" />
            <span>CAE BOM Report</span>
          </button>
        </div>

      </div>

      {/* Reactive Handshake / Synchronizing Messages banner alert if not idle */}
      {syncStatus !== "idle" && (
        <div className={`px-4 py-2 text-xs font-mono flex items-center mb-0.5 justify-between animate-fade-in border-b ${
          syncStatus === "loading" ? "bg-amber-950/25 border-amber-500/20 text-amber-300" :
          syncStatus === "success" ? "bg-teal-950/35 border-teal-500/20 text-teal-200" :
          "bg-rose-950/35 border-rose-500/20 text-rose-300"
        }`}>
          <div className="flex items-center space-x-2">
            {syncStatus === "loading" ? (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
            ) : syncStatus === "success" ? (
              <CheckCircle className="w-4 h-4 text-teal-400 h-scale-up" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-450" />
            )}
            <span className="font-semibold text-[10px] tracking-wide">{syncMessage}</span>
          </div>
          <button 
            onClick={() => setSyncStatus("idle")} 
            className="text-slate-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4. Central Application View Board */}
      <div className="flex-1 min-h-0 flex flex-col xl:flex-row divide-y xl:divide-y-0 xl:divide-x divide-white/5 overflow-y-auto">
        
        {/* --- LEFT HAND EDIT DECK (PROPELLERS / SLIDERS / DESIGN CONFIGS) --- */}
        <div className="w-full xl:w-96 shrink-0 bg-[#101014] p-4 flex flex-col justify-between min-h-fit xl:h-full overflow-y-auto font-mono select-none">
          
          {/* TAB 1 EDIT BAR: CAD PLANNER */}
          {activeTab === "workspace-cad" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">Device Library (Click to Place)</h3>
                <p className="text-[8.5px] text-slate-500">Append items directly onto the physics grid.</p>
              </div>

              {/* Grid selectors */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: "robot_arm", label: "Articulated KUKA" },
                  { id: "conveyor", label: "Motor Conveyor" },
                  { id: "pallet", label: "Pallet Stack" },
                  { id: "camera", label: "Stereo Camera" },
                  { id: "sensor", label: "Sick LiDAR" },
                  { id: "amr", label: "Mobile AMR" },
                  { id: "barrier", label: "Interlock Fence" },
                  { id: "human", label: "Operator Dave" },
                ].map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => addNewObject(obj.id as any)}
                    className="p-2 text-left bg-[#16161c] hover:bg-[#1a1a24] border border-white/5 rounded text-[8.5.px] text-slate-350 hover:text-white transition-all flex flex-col justify-between cursor-pointer"
                  >
                    <span className="font-bold text-slate-300">{obj.label}</span>
                    <span className="text-[7px] text-slate-500 block uppercase font-normal mt-1">Deploy Component</span>
                  </button>
                ))}
              </div>

              {/* Selected CAD Properties Modifier */}
              {selectedCADId ? (
                <div className="bg-[#15151b] border border-white/5 rounded-xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[9.5px] font-bold text-teal-300 uppercase">Modify Selected</span>
                    <button 
                      onClick={deleteSelectedCAD}
                      className="p-1 text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                      title="Remove object from CAD layout"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>

                  {(() => {
                    const obj = getSelectedCADItem();
                    if (!obj) return <span className="text-[8px] text-slate-500">No object selected.</span>;
                    return (
                      <div className="space-y-3">
                        {/* Name field */}
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-slate-500">Core Node Name</label>
                          <input
                            type="text"
                            value={obj.name}
                            onChange={(e) => handleUpdateCADItem("name", e.target.value)}
                            className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 text-[10px] rounded p-1.5 font-mono focus:border-teal-500 focus:outline-none"
                          />
                        </div>

                        {/* Position inputs */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase text-slate-500">X Position (px)</label>
                            <input
                              type="number"
                              value={obj.x}
                              onChange={(e) => handleUpdateCADItem("x", parseInt(e.target.value) || 0)}
                              className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 text-[10px] rounded p-1.5 focus:border-teal-500 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] uppercase text-slate-500">Y Position (px)</label>
                            <input
                              type="number"
                              value={obj.y}
                              onChange={(e) => handleUpdateCADItem("y", parseInt(e.target.value) || 0)}
                              className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 text-[10px] rounded p-1.5 focus:border-teal-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Slider controls */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px] uppercase text-slate-500">
                            <span>Angular Rotation</span>
                            <span className="text-teal-400 font-bold">{obj.rotation}°</span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            step="5"
                            value={obj.rotation}
                            onChange={(e) => handleUpdateCADItem("rotation", parseInt(e.target.value))}
                            className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[8px] uppercase text-slate-500">
                            <span>Component Scaled Width</span>
                            <span className="text-teal-400 font-bold">{obj.width}px</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="300"
                            step="5"
                            value={obj.width}
                            onChange={(e) => handleUpdateCADItem("width", parseInt(e.target.value))}
                            className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
                          <div>
                            <span className="text-[7.5px] uppercase text-slate-500 block">Class Type:</span>
                            <span className="text-[9px] text-slate-300 font-bold uppercase">{obj.type.replace("_", " ")}</span>
                          </div>
                          <div>
                            <span className="text-[7.5px] uppercase text-slate-500 block">Status Node:</span>
                            <span className="text-[9px] text-emerald-400 font-bold uppercase">{obj.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-[#15151b]/45 border border-white/5 border-dashed rounded-xl p-4 text-center">
                  <span className="text-[8px] text-slate-500">Click any placed SVG object inside the canvas board to edit layout properties or move.</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2 EDIT BAR: ROBOT ACTUATION BUILDER */}
          {activeTab === "robot-builder" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">Dynamic Robot Articulation Builder</h3>
                <p className="text-[8.5px] text-slate-500">Construct complex physical linkages, specify motors & payload constraints.</p>
              </div>

              {/* Add Joint Trigger layout */}
              <button
                onClick={() => {
                  const id = `j${customJoints.length + 1}`;
                  const newJoint: CustomJoint = {
                    id,
                    name: `Joint Segment ${customJoints.length + 1}`,
                    type: "revolute",
                    length: 120,
                    mass: 6.5,
                    motorType: "servo",
                    torque: 60,
                    gearRatio: 80,
                    activeAngle: 45
                  };
                  setCustomJoints(prev => [...prev, newJoint]);
                  setSelectedJointId(id);
                }}
                className="w-full bg-teal-900/35 hover:bg-teal-900/55 border border-teal-500/30 text-teal-300 rounded text-[9px] font-mono py-1.5 flex items-center justify-center space-x-1.5 cursor-pointer uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inject New Kinematic Joint Link</span>
              </button>

              {/* Joint select list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {customJoints.map((j) => (
                  <button
                    key={j.id}
                    onClick={() => setSelectedJointId(j.id)}
                    className={`w-full text-left p-2 rounded text-[9px] border transition-all flex items-center justify-between cursor-pointer ${
                      selectedJointId === j.id 
                        ? "bg-teal-950/20 border-teal-500/50 text-teal-300 font-bold"
                        : "bg-black/30 border-white/5 text-slate-400 hover:bg-black/50"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="truncate max-w-[140px]">{j.name}</span>
                    </div>
                    <span className="text-[7.5px] bg-white/5 px-1.5 py-0.2 rounded text-slate-500 uppercase">{j.type}</span>
                  </button>
                ))}
              </div>

              {/* Selected Joint editor */}
              {selectedJointId && (
                <div className="bg-[#15151b] border border-white/5 rounded-xl p-3.5 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                    <span className="text-[9px] text-teal-350 font-bold uppercase">Joint Segment Specs</span>
                    <button
                      onClick={() => {
                        setCustomJoints(prev => prev.filter(c => c.id !== selectedJointId));
                        setSelectedJointId(customJoints[0]?.id || null);
                      }}
                      className="text-rose-400 hover:text-rose-500 p-0.5 rounded cursor-pointer hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {(() => {
                    const j = customJoints.find(it => it.id === selectedJointId);
                    if (!j) return null;
                    return (
                      <div className="space-y-3 text-[9px]">
                        <div>
                          <label className="text-[7.5px] text-slate-500 uppercase">Segment Identifier</label>
                          <input
                            type="text"
                            value={j.name}
                            onChange={(e) => setCustomJoints(prev => prev.map(item => item.id === j.id ? { ...item, name: e.target.value } : item))}
                            className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1 rounded focus:outline-none text-[9.5px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[7.5px] text-slate-500 uppercase block mb-1">Joint Class</label>
                            <select
                              value={j.type}
                              onChange={(e) => setCustomJoints(prev => prev.map(item => item.id === j.id ? { ...item, type: e.target.value as any } : item))}
                              className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1 rounded focus:outline-none text-[8.5px]"
                            >
                              <option value="revolute">Revolute (Rot)</option>
                              <option value="prismatic">Prismatic (Lin)</option>
                              <option value="spherical">Spherical (Ball)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[7.5px] text-slate-500 uppercase block mb-1">Actuator Motor</label>
                            <select
                              value={j.motorType}
                              onChange={(e) => setCustomJoints(prev => prev.map(item => item.id === j.id ? { ...item, motorType: e.target.value as any } : item))}
                              className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1 rounded focus:outline-none text-[8.5px]"
                            >
                              <option value="servo">Brushless Servo</option>
                              <option value="stepper">Inertial Stepper</option>
                              <option value="bldc">Direct BLDC Hub</option>
                              <option value="hydraulic">Fluid Hydraulic</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                            <span>Link Arm Length</span>
                            <span className="text-teal-400 font-bold">{j.length} mm</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="360"
                            step="10"
                            value={j.length}
                            onChange={(e) => setCustomJoints(prev => prev.map(item => item.id === j.id ? { ...item, length: parseInt(e.target.value) } : item))}
                            className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                            <span>Link Mass</span>
                            <span className="text-teal-400 font-bold">{j.mass.toFixed(1)} kg</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="50.0"
                            step="0.5"
                            value={j.mass}
                            onChange={(e) => setCustomJoints(prev => prev.map(item => item.id === j.id ? { ...item, mass: parseFloat(e.target.value) } : item))}
                            className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] text-slate-500 uppercase">
                            <span>Peak Motor Torque</span>
                            <span className="text-teal-400 font-bold">{j.torque} Nm</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="500"
                            step="10"
                            value={j.torque}
                            onChange={(e) => setCustomJoints(prev => prev.map(item => item.id === j.id ? { ...item, torque: parseInt(e.target.value) } : item))}
                            className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] text-slate-500">
                          <div>
                            <span>EFF GEAR RATIO:</span>
                            <strong className="block text-purple-300 text-[9.5px]">{j.gearRatio}:1</strong>
                          </div>
                          <div>
                            <span>CALC ARM INERTIA:</span>
                            <strong className="block text-purple-300 text-[9.5px]">{(0.33 * j.mass * (j.length/1000)**2).toFixed(3)} kg·m²</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 3 EDIT BAR: PLC INDUSTRIAL logic CONTACT PANEL */}
          {activeTab === "automation-plc" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">IEC 61131-3 PLC Register Controls</h3>
                <p className="text-[8.5px] text-slate-500">Enable/disable registers to watch live Ladder contacts activate the system.</p>
              </div>

              {/* Ladder Register checkboxes */}
              <div className="bg-[#15151b] border border-white/5 rounded-xl p-3 space-y-2">
                <div className="text-[8px] text-purple-300 font-bold uppercase tracking-wider mb-1.5 border-b border-white/5 pb-1 flex justify-between">
                  <span>Register State Inputs</span>
                  <span className="text-slate-500">Value (0/1)</span>
                </div>
                
                {Object.keys(plcInputs).map((key) => (
                  <label key={key} className="flex justify-between items-center bg-black/35 rounded border border-white/5 px-2 py-1.5 text-[9px] hover:bg-black/55 cursor-pointer transition-colors">
                    <span className="text-slate-350 font-mono font-semibold">{key}</span>
                    <input
                      type="checkbox"
                      checked={plcInputs[key]}
                      onChange={(e) => setPlcInputs(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="h-3.5 w-3.5 rounded accent-teal-500 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* Rapid custom Ladder creator rung */}
              <button
                onClick={() => {
                  const newID = `r${plcRungs.length + 1}`;
                  const keyArr = Object.keys(plcInputs);
                  const randomVar1 = keyArr[Math.floor(Math.random() * keyArr.length)];
                  const newRung: PLCRung = {
                    id: newID,
                    inputContact1: "normally_open",
                    inputVar1: randomVar1,
                    inputContact2: "none",
                    inputVar2: "",
                    outputCoil: `SYS_OUTPUT_${plcRungs.length + 1}`,
                    timeDelay: 0,
                    isActive: false
                  };
                  setPlcRungs(prev => [...prev, newRung]);
                  setSelectedRungId(newID);
                  setPlcCompileLog(prev => [`[INFO] Appended PLC Rung ${newID} to register chain.`, ...prev]);
                }}
                className="w-full bg-teal-900/35 hover:bg-teal-900/55 border border-teal-500/30 text-teal-300 text-[9px] font-mono py-1.5 rounded flex items-center justify-center space-x-1 uppercase cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inject Custom Ladder Rung</span>
              </button>

              {/* Selected Rung modifier */}
              {selectedRungId && (
                <div className="bg-[#15151b] border border-white/5 rounded-xl p-3 space-y-2 text-[9px]">
                  <div className="flex justify-between items-center text-teal-300 border-b border-white/5 pb-1 flex justify-between">
                    <span className="font-bold uppercase text-[8.5px]">Rung Parameters ({selectedRungId})</span>
                    <button
                      onClick={() => {
                        setPlcRungs(prev => prev.filter(r => r.id !== selectedRungId));
                        setSelectedRungId(plcRungs[0]?.id || null);
                      }}
                      className="text-rose-400 hover:text-rose-500 cursor-pointer p-0.5 rounded hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {(() => {
                    const rng = plcRungs.find(r => r.id === selectedRungId);
                    if (!rng) return null;
                    return (
                      <div className="space-y-2">
                        {/* Selector 1 */}
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[7px] text-slate-500 uppercase block mb-0.5">Contact 1 Type</label>
                            <select
                              value={rng.inputContact1}
                              onChange={(e) => setPlcRungs(prev => prev.map(r => r.id === rng.id ? { ...r, inputContact1: e.target.value as any } : r))}
                              className="w-full bg-[#0d0d0f] border border-white/5 text-slate-350 p-1 rounded text-[8.5px] cursor-pointer"
                            >
                              <option value="normally_open">Normally Open (NO)</option>
                              <option value="normally_closed">Normally Closed (NC)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[7px] text-slate-500 uppercase block mb-0.5">Signal Variable 1</label>
                            <select
                              value={rng.inputVar1}
                              onChange={(e) => setPlcRungs(prev => prev.map(r => r.id === rng.id ? { ...r, inputVar1: e.target.value } : r))}
                              className="w-full bg-[#0d0d0f] border border-white/5 text-slate-350 p-1 rounded text-[8.5px]"
                            >
                              {Object.keys(plcInputs).map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Output Coil name */}
                        <div>
                          <label className="text-[7px] text-slate-500 uppercase block mb-0.5 font-bold">Actuated Coil output</label>
                          <input
                            type="text"
                            value={rng.outputCoil}
                            onChange={(e) => setPlcRungs(prev => prev.map(r => r.id === rng.id ? { ...r, outputCoil: e.target.value } : r))}
                            className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1 rounded focus:outline-none text-[9.5px]"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VISION LABORATORY SLIDERS */}
          {activeTab === "vision-lab" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">Neural Vision Lab Configurations</h3>
                <p className="text-[8.5px] text-slate-500">Configure machine vision detection fields, filters, and synthetic camera cones.</p>
              </div>

              {/* Slider Field of View */}
              <div className="space-y-2 bg-[#15151b] border border-white/5 rounded-xl p-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] uppercase text-slate-500 font-bold">
                    <span>Optical Aperture Field (FOV)</span>
                    <span className="text-teal-400 font-bold">{cameraFov}° Degrees</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="140"
                    step="5"
                    value={cameraFov}
                    onChange={(e) => setCameraFov(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#0d0d0f] rounded appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                {/* Filter Selector */}
                <div className="space-y-1 pt-1.5">
                  <label className="text-[7px] text-slate-500 uppercase block mb-1">Optical Frame Analysis Mode</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "raw_camera", label: "RGB CCTV" },
                      { id: "yolo_ai_model", label: "YOLO v9" },
                      { id: "lidar_echodepth", label: "LiDAR Depth" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setVisionMode(mode.id as any)}
                        className={`p-1.5 text-[8px] font-mono border rounded text-center transition-all cursor-pointer truncate ${
                          visionMode === mode.id
                            ? "bg-teal-950/30 border-teal-500 text-teal-300 font-extrabold"
                            : "bg-black/30 border-white/5 text-slate-400 hover:bg-[#1a1a24]"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bounding box list */}
              <div className="bg-[#15151b] border border-white/5 rounded-xl p-3 space-y-2">
                <span className="text-[8px] text-cyan-400 font-bold block uppercase border-b border-white/5 pb-1">AI Live Inference Outputs</span>
                <div className="space-y-1">
                  {detectedTargets.map((tar, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[8.5px] font-mono bg-black/40 border border-white/5 p-1.5 rounded">
                      <span className="text-slate-350">{tar.class}</span>
                      <span className="text-emerald-400 font-bold">{(tar.conf * 100).toFixed(1)}% match</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MOTION PLANNING ALGORITHMS */}
          {activeTab === "motion-planning" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">Dynamic Pathfinding and Kinematics Solver</h3>
                <p className="text-[8.5px] text-slate-500">Run obstacle avoidance maps using production algorithms.</p>
              </div>

              {/* Algorithm select buttons */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: "A_Star", label: "A* Path" },
                    { id: "RRT_Star", label: "RRT* Tree" },
                    { id: "PRM", label: "PRM Mesh" },
                  ].map((alg) => (
                    <button
                      key={alg.id}
                      onClick={() => {
                        setPlanningAlgorithm(alg.id as any);
                        setPathfindingStep(0);
                      }}
                      className={`p-1.5 text-[8px] font-bold font-mono border rounded text-center transition-all cursor-pointer ${
                        planningAlgorithm === alg.id
                          ? "bg-teal-950/30 border-teal-500 text-teal-350"
                          : "bg-black/30 border-white/5 text-slate-400 hover:bg-[#1a1a24]"
                      }`}
                    >
                      {alg.label}
                    </button>
                  ))}
                </div>

                {/* Inverse Kinematic Input Target coordinates */}
                <div className="bg-[#15151b] border border-white/5 rounded-xl p-3.5 space-y-3">
                  <span className="text-[8px] text-teal-300 font-bold block uppercase border-b border-white/5 pb-1">IK Coordinate End-Effector Goal</span>
                  
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="space-y-1">
                      <span className="text-[7.5px] uppercase text-slate-500">Target X (mm)</span>
                      <input
                        type="number"
                        value={ikTarget.x}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setIkTarget(prev => ({ ...prev, x: val }));
                          // Sim dynamic angles check
                          setCalculatedAngles({
                            theta1: Math.round((Math.atan2(ikTarget.y, val) * 180) / Math.PI * 10) / 10,
                            theta2: Math.round((Math.sin(val / 100) * 45) * 10) / 10,
                            theta3: Math.round((90 - 45) * 10) / 10
                          });
                        }}
                        className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1.5 rounded focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[7.5px] uppercase text-slate-500">Target Y (mm)</span>
                      <input
                        type="number"
                        value={ikTarget.y}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setIkTarget(prev => ({ ...prev, y: val }));
                          setCalculatedAngles({
                            theta1: Math.round((Math.atan2(val, ikTarget.x) * 180) / Math.PI * 10) / 10,
                            theta2: Math.round((Math.sin(val / 100) * 45) * 10) / 10,
                            theta3: Math.round((90 - 45) * 10) / 10
                          });
                        }}
                        className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1.5 rounded focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[7.5px] uppercase text-slate-500">Target Z (mm)</span>
                      <input
                        type="number"
                        value={ikTarget.z}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setIkTarget(prev => ({ ...prev, z: val }));
                        }}
                        className="w-full bg-[#0d0d0f] border border-white/5 text-slate-300 p-1.5 rounded focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Math Kinematics equations */}
                  <div className="bg-black/35 p-2 rounded text-[7.5px] font-mono leading-relaxed text-slate-400 border border-white/5 text-center">
                    <span className="text-teal-400 block uppercase font-bold text-[8px] mb-1">Decoupled analytical solver</span>
                    θ₁ = atan2(y, x) = <strong className="text-amber-300">{calculatedAngles.theta1}°</strong><br/>
                    θ₂ = acos((x² + y² - L₁² - L₂²) / 2L₁L₂) = <strong className="text-amber-300">{calculatedAngles.theta2}°</strong><br/>
                    θ₃ = φ - θ₁ - θ₂ = <strong className="text-amber-300">{calculatedAngles.theta3}°</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: ENTERPRISE ANALYTICS CENTER */}
          {activeTab === "analytics-center" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider">Enterprise Analytics & OEE Module</h3>
                <p className="text-[8.5px] text-slate-500">View overall equipment effectiveness, downtime analyses, and bottleneck alerts.</p>
              </div>

              {/* Key KPI numbers */}
              <div className="space-y-2">
                {[
                  { label: "OEE OVERALL EFFECTIVENESS", value: "92.4%", desc: "Target benchmark: 85.0% worldclass", color: "text-teal-400" },
                  { label: "AVAILABILITY METRIC", value: "98.1%", desc: "Planned production vs actual runtime", color: "text-purple-300" },
                  { label: "PERFORMANCE EFFICIENCY", value: "95.6%", desc: "Ideal cycle limits vs current actual rates", color: "text-cyan-400" },
                  { label: "QUALITY RUN RATE", value: "99.2%", desc: "Correct workpiece sorting matches", color: "text-amber-400" },
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#15151b] border border-white/5 rounded-xl p-3 flex justify-between items-center">
                    <div className="space-y-0.5">
                      <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider block">{item.label}</span>
                      <span className="text-[7.5px] text-slate-400 block">{item.desc}</span>
                    </div>
                    <span className={`text-base font-black font-mono tracking-tight ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: LEARNING ACADEMY */}
          {activeTab === "learning-academy" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-[10px] text-teal-400 uppercase font-bold tracking-wider font-extrabold">Dual Certification & Guided Labs</h3>
                <p className="text-[8.5px] text-slate-500">Complete missions to activate production credentials and earn developer badges.</p>
              </div>

              <div className="bg-[#15151b] border border-white/5 rounded-xl p-3.5 space-y-3">
                <div className="flex space-x-2.5 items-center">
                  <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/35 flex items-center justify-center text-purple-400 shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9.5px] text-slate-200 font-bold block uppercase leading-tight">Robot Automation Track</span>
                    <span className="text-[7.5px] text-slate-500">Status: 50% Course requirements complete</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-white/5 pt-2.5">
                  <div className="text-[8px] text-slate-500 uppercase font-bold">Guided Lab Assignments</div>
                  {labs.map((l) => (
                    <div key={l.id} className="flex justify-between items-center text-[8.5px] p-2 bg-black/40 border border-white/5 rounded">
                      <div className="flex items-center space-x-2">
                        {l.status === "completed" ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : l.status === "in_progress" ? (
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin mr-0.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span className={l.status === "locked" ? "text-slate-600 truncate max-w-[170px]" : "text-slate-300 font-medium truncate max-w-[170px]"}>{l.title}</span>
                      </div>
                      <span className="text-[6.5px] text-slate-500 font-extrabold uppercase">{l.reward}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* LOWER FIXED TELEMETRY LOGS HEADER */}
          <div className="border-t border-white/5 pt-3 mt-4 space-y-2">
            <div className="text-[8px] font-bold uppercase text-slate-500 flex justify-between">
              <span>Collision Risk monitor</span>
              <span className={`animate-pulse ${safetyAlertLevel === "nominal" ? "text-emerald-400" : "text-rose-400"}`}>
                ● {safetyAlertLevel.toUpperCase()}
              </span>
            </div>
            <div className="bg-black/40 rounded p-2 text-[7.5px] text-slate-400 font-mono space-y-1 max-h-24 overflow-y-auto border border-white/5">
              {collisionLog.map((log, idx) => (
                <div key={idx} className="truncate select-text">
                  <span className="text-slate-550 select-none">[{new Date().toLocaleTimeString().split(" ")[0]}] </span>
                  {log}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* --- MAIN BIG CENTRAL GRAPHIC CANVAS BOARD (RENDERS SVGs CORES) --- */}
        <div className="flex-1 min-w-0 bg-[#0c0c0f] flex flex-col min-h-[400px] xl:h-full relative overflow-hidden">
          
          {/* Main Visual selection deck */}
          {activeTab === "workspace-cad" && (
            <div className="absolute top-3 left-3 bg-black/55 border border-white/5 rounded p-1 flex space-x-1 z-10">
              {[
                { id: "top", label: "Top View (Grid Map)" },
                { id: "front", label: "Front (Clearance)" },
                { id: "side", label: "Side (3-DOF Reach)" },
                { id: "perspective", label: "Perspective Twin" },
              ].map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setCadProjection(proj.id as any)}
                  className={`px-2.5 py-1 text-[8.5px] font-mono rounded select-all cursor-pointer ${
                    cadProjection === proj.id
                      ? "bg-teal-900/40 border border-teal-500/30 text-teal-300 font-bold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {proj.label}
                </button>
              ))}
            </div>
          )}

          {/* Render projection or matching sub-tabs layouts */}
          <div className="flex-1 w-full min-h-0 relative flex items-center justify-center p-4">
            
            {/* VIEWBOARD 1: COMPREHENSIVE FACTORY ENVIRONMENT BLUEPRINT MODIFIER */}
            {activeTab === "workspace-cad" && (
              <div className="relative border border-white/5 bg-[#09090c] rounded-xl shadow-2xl p-2 w-full h-full max-w-4xl flex flex-col justify-between">
                
                {/* Drag-n-drop interactive SVG scene */}
                <div className="flex-1 relative w-full h-full border border-teal-500/10 rounded-lg overflow-hidden flex items-center justify-center select-none bg-[radial-gradient(rgba(34,197,94,0.06)_1px,transparent_1px)] [background-size:20px_20px]">
                  
                  {/* Perspective grid projection background indicator */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                    <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                    {showGrid && (
                      <circle cx="50%" cy="50%" r="180" fill="none" stroke="rgba(34,197,148,0.03)" strokeWidth="1" strokeDasharray="3,3" />
                    )}
                  </svg>

                  {/* RENDER TOP-VIEW OR PROJECTED VIEWPANELS */}
                  <svg 
                    viewBox="0 0 500 320" 
                    className="w-full h-full max-w-2xl max-h-[360px]"
                    onClick={() => setSelectedCADId(null)}
                  >
                    {/* Top Blueprint View */}
                    {cadProjection === "top" && (
                      <>
                        {/* Static conveyor path representation */}
                        <rect x="40" y="250" width="360" height="20" fill="#141416" stroke="rgba(255,255,255,0.1)" strokeWidth="1" rx="2" />
                        <line x1="40" y1="260" x2="400" y2="260" stroke="rgba(20,110,95,0.3)" strokeWidth="1" strokeDasharray="5,5" />

                        {/* Slide animation of workpiece on the conveyor */}
                        <rect 
                          x={40 + ((isRecordingSim || timelineFrame !== 140 ? (timelineFrame / 3) : convPartPos) * 3.6)} 
                          y="253" 
                          width="14" 
                          height="14" 
                          fill="#facc15" 
                          rx="1" 
                          className="shadow-md"
                        >
                          {isSimulating && (
                            <animate attributeName="opacity" values="0.85;1;0.85" dur="1s" repeatCount="indefinite" />
                          )}
                        </rect>

                        {/* Plot dynamic bounding boxes or cones for positioned objects */}
                        {cadObjects.map((obj) => {
                          const isSelected = selectedCADId === obj.id;
                          return (
                            <g 
                              key={obj.id} 
                              transform={`translate(${obj.x}, ${obj.y}) rotate(${obj.rotation})`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCADId(obj.id);
                              }}
                              className="cursor-pointer group"
                            >
                              {/* Selection overlay feedback */}
                              <rect 
                                x={-obj.width/2 - 4} 
                                y={-obj.height/2 - 4} 
                                width={obj.width + 8} 
                                height={obj.height + 8} 
                                fill="none" 
                                stroke={isSelected ? "#14b8a6" : "rgba(20,184,166,0)"} 
                                strokeWidth="1.5" 
                                strokeDasharray={isSelected ? "none" : "3,3"}
                                className="transition-all duration-150 group-hover:stroke-teal-500/40"
                              />

                              {/* Object rendering matching types */}
                              {obj.type === "robot_arm" && (
                                <g>
                                  {/* Arm base ring */}
                                  <circle cx="0" cy="0" r="14" fill="#1e1b4b" stroke="#312e81" strokeWidth="2" />
                                  <circle cx="0" cy="0" r="8" fill="#141418" />
                                  {/* Arm segment links pointing to rotation angle */}
                                  <line x1="0" y1="0" x2="22" y2="0" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
                                  <line x1="22" y1="0" x2="36" y2="10" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />
                                  <circle cx="36" cy="10" r="4" fill="#a855f7" />
                                </g>
                              )}

                              {obj.type === "conveyor" && (
                                <rect x={-obj.width/2} y={-obj.height/2} width={obj.width} height={obj.height} fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" rx="3" />
                              )}

                              {obj.type === "pallet" && (
                                <g>
                                  <rect x={-obj.width/2} y={-obj.height/2} width={obj.width} height={obj.height} fill="#78350f" stroke="#92400e" strokeWidth="1" />
                                  {/* Stack compartments */}
                                  <line x1={-obj.width/2} y1="0" x2={obj.width/2} y2="0" stroke="#92400e" strokeWidth="1" />
                                  <line x1="0" y1={-obj.height/2} x2="0" y2={obj.height/2} stroke="#92400e" strokeWidth="1" />
                                </g>
                              )}

                              {obj.type === "sensor" && (
                                <g>
                                  <polygon points="0,-12 10,8 -10,8" fill="#0c4a6e" stroke="#0284c7" strokeWidth="1.5" />
                                  {/* Sensor arc field cone lines */}
                                  <path d="M -24,-34 A 40 40 0 0 1 24,-34" fill="none" stroke="rgba(14,165,233,0.14)" strokeWidth="1.5" strokeDasharray="2,2" />
                                </g>
                              )}

                              {obj.type === "amr" && (
                                <g>
                                  <rect x={-obj.width/2} y={-obj.height/2} width={obj.width} height={obj.height} fill="#1e293b" stroke="#475569" strokeWidth="1.5" rx="2" />
                                  {/* Wheels */}
                                  <rect x={-obj.width/2 + 2} y={-obj.height/2 - 2} width="8" height="2" fill="#000" />
                                  <rect x={obj.width/2 - 10} y={-obj.height/2 - 2} width="8" height="2" fill="#000" />
                                  <rect x={-obj.width/2 + 2} y={obj.height/2} width="8" height="2" fill="#000" />
                                  <rect x={obj.width/2 - 10} y={obj.height/2} width="8" height="2" fill="#000" />
                                  {/* Status LED */}
                                  <circle cx="0" cy="0" r="3" fill="#22c55e" className="animate-pulse" />
                                </g>
                              )}

                              {obj.type === "barrier" && (
                                <rect x={-obj.width/2} y={-obj.height/2} width={obj.width} height={obj.height} fill="#854d0e" stroke="#eab308" strokeWidth="1" strokeDasharray="3,3" />
                              )}

                              {obj.type === "human" && (
                                <g>
                                  <circle cx="0" cy="0" r="7" fill="#f43f5e" />
                                  <circle cx="0" cy="0" r="4.5" fill="#fbcfe8" />
                                  <path d="M -6,4 Q 0,-3 6,4" fill="none" stroke="#fbcfe8" strokeWidth="1.5" />
                                </g>
                              )}

                              {/* Label text */}
                              <text 
                                x="0" 
                                y={obj.height/2 + 12} 
                                textAnchor="middle" 
                                className="text-[7.5px] font-mono fill-slate-450 bg-black/60 font-semibold uppercase tracking-wider"
                              >
                                {obj.name.split(" ")[0]}
                              </text>
                            </g>
                          );
                        })}
                      </>
                    )}

                    {/* FRONT OR SIDE Blueprint CAD Ortho Views */}
                    {(cadProjection === "front" || cadProjection === "side") && (
                      <g transform="translate(10, -20)">
                        {/* Floor plane */}
                        <line x1="20" y1="280" x2="480" y2="280" stroke="#4b5563" strokeWidth="2" />
                        <line x1="120" y1="280" x2="120" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1.2" strokeDasharray="4,4" />
                        <line x1="380" y1="280" x2="380" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1.2" strokeDasharray="4,4" />

                        {/* Structural columns rendering */}
                        <rect x="100" y="240" width="40" height="40" fill="#1e1e24" stroke="rgba(255,255,255,0.1)" />
                        <rect x="350" y="230" width="60" height="50" fill="#1e1e24" stroke="rgba(255,255,255,0.1)" />

                        {cadProjection === "front" ? (
                          <>
                            {/* Front View schematic robot arm with angles */}
                            <circle cx="250" cy="280" r="12" fill="#111" stroke="#a855f7" strokeWidth="2" />
                            <line x1="250" y1="280" x2="210" y2="180" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
                            <circle cx="210" cy="180" r="6" fill="#c084fc" />
                            <line x1="210" y1="180" x2="280" y2="130" stroke="#c084fc" strokeWidth="3" strokeLinecap="round" />
                            <circle cx="280" cy="130" r="5" fill="#e9d5ff" />
                            <line x1="280" y1="130" x2="280" y2="105" stroke="#db2777" strokeWidth="2.5" />
                            
                            {/* Bounding sweep sector arc line */}
                            <path d="M 120,200 A 130 130 0 0 1 380,200" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="1" strokeDasharray="3,3" />
                            
                            <text x="250" y="55" textAnchor="middle" className="text-[10px] fill-teal-400 uppercase font-bold tracking-widest">
                              Z-Clearance Axis Map (FRONT VIEW)
                            </text>
                            <text x="140" y="170" className="text-[7.5px] fill-purple-300">θ₁ Max Lift = 125°</text>
                            <text x="300" y="140" className="text-[7.5px] fill-purple-300">θ₂ Elbow Yaw = -45°</text>
                          </>
                        ) : (
                          <>
                            {/* Side Reach View orthographic diagram */}
                            <circle cx="250" cy="280" r="10" fill="#111" stroke="#0284c7" strokeWidth="2" />
                            <line x1="250" y1="280" x2="290" y2="190" stroke="#0284c7" strokeWidth="4.5" />
                            <line x1="290" y1="190" x2="360" y2="185" stroke="#38bdf8" strokeWidth="3" />
                            <circle cx="360" cy="185" r="4.5" fill="#38bdf8" />
                            
                            {/* Max extension reach bubble circle */}
                            <circle cx="250" cy="280" r="140" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="1.2" strokeDasharray="4,4" />
                            <text x="250" y="55" textAnchor="middle" className="text-[10px] fill-cyan-400 uppercase font-bold tracking-widest">
                              Kinematic Reach Profile (SIDE VIEW)
                            </text>
                            <text x="310" y="210" className="text-[8px] fill-cyan-300">Max Reach Envelope : 840mm</text>
                          </>
                        )}
                      </g>
                    )}

                    {/* PERSPECTIVE Digital Twin Factory/Isometric simulation view */}
                    {cadProjection === "perspective" && (
                      <g transform="translate(10, 0)">
                        {/* Iso Grid floor line meshes */}
                        <path d="M 60,180 L 250,50 L 440,180 L 250,310 Z" fill="#0a0a0d" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                        
                        {/* Iso lines */}
                        <line x1="123" y1="135" x2="313" y2="265" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <line x1="186" y1="92" x2="376" y2="222" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        <line x1="123" y1="222" x2="313" y2="92" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                        
                        {/* Render 2.5D Isometric style blocks to represent physical machinery */}
                        {/* KUKA robot base riser block */}
                        <g transform="translate(250, 160)">
                          {/* Top isometric face of cylinder base */}
                          <polygon points="0,-15 15,-7 0,1 -15,-7" fill="#a855f7" stroke="rgba(250,250,250,0.15)" strokeWidth="0.8" />
                          <polygon points="-15,-7 0,1 0,11 -15,3" fill="#7e22ce" />
                          <polygon points="15,-7 0,1 0,11 15,3" fill="#6b21a8" />
                          
                          {/* Segment lines soaring vertically */}
                          <line x1="0" y1="-7" x2="25" y2="-55" stroke="#c084fc" strokeWidth="4.5" strokeLinecap="round" />
                          <line x1="25" y1="-55" x2="70" y2="-45" stroke="#f472b6" strokeWidth="3" />
                          <circle cx="70" cy="-45" r="4" fill="#f472b6" />
                          
                          {/* Text indicator overlay */}
                          <text x="0" y="27" textAnchor="middle" className="text-[7.5px] fill-slate-350 bg-black font-semibold text-center uppercase tracking-wider">
                            TWIN_NODE #01 : ARTICULATED_ARM
                          </text>
                        </g>

                        {/* AMR Mobile cart */}
                        <g transform="translate(130, 210)">
                          <polygon points="0,-10 20,-2 0,6 -20,-2" fill="#0369a1" />
                          <polygon points="-20,-2 0,6 0,14 -20,6" fill="#02507e" />
                          <polygon points="20,-2 0,6 0,14 20,6" fill="#0c4a6e" />
                          <circle cx="0" cy="0" r="2" fill="#4ade80" className="animate-blink" />
                        </g>

                        <text x="250" y="45" textAnchor="middle" className="text-[10px] fill-purple-300 uppercase font-extrabold tracking-widest">
                          3D Digital Twin Virtual Space
                        </text>
                      </g>
                    )}

                  </svg>
                </div>

                {/* Live Sequence Recording Timeline Deck */}
                <div className="bg-black/45 border border-white/5 rounded-lg p-2 font-mono text-[9px] mt-1.5 mb-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-300">
                    
                    {/* Viewport & recording triggers */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#17171e] text-[8px] font-bold text-slate-400">
                        <Video className={`w-3.5 h-3.5 mr-1 ${isRecordingSim ? "text-rose-500 animate-pulse" : "text-slate-500"}`} />
                        <span>CAMERA SIMULATOR FEED:</span>
                      </div>
                      <select 
                        value={activeCameraView} 
                        onChange={(e) => setActiveCameraView(e.target.value)}
                        className="bg-[#141416] border border-white/10 text-slate-200 text-[8.5px] py-0.5 px-2 rounded focus:outline-none cursor-pointer"
                      >
                        <option value="CCTV-Overhead-01">CCTV-Overhead-01 (Spatial Map)</option>
                        <option value="Arm-Terminal-EndEff">Arm-Terminal-EndEff (Gripper Focus)</option>
                        <option value="LiDAR-Dome-04">LiDAR-Dome-04 (Laser SafeZone)</option>
                        <option value="Operator-Station-3">Operator-Station-3 (OEE Console)</option>
                      </select>

                      <button
                        onClick={handleToggleRecording}
                        className={`px-2.5 py-1 rounded font-bold transition-all text-[8px] uppercase cursor-pointer flex items-center ${
                          isRecordingSim 
                            ? "bg-rose-950/40 border border-rose-500 text-rose-300" 
                            : "bg-[#1c1c24] hover:bg-slate-800 border border-white/10 text-slate-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isRecordingSim ? "bg-rose-500 animate-ping" : "bg-rose-600"}`} />
                        {isRecordingSim ? "STOP REC & GENERATE TELEMETRY" : "START VIDEO RECORD"}
                      </button>
                    </div>

                    {/* Timeline slider scrubber */}
                    <div className="flex-1 flex items-center space-x-2 w-full">
                      <span className="text-slate-500 shrink-0 text-[8px] uppercase font-bold">TIMELINE:</span>
                      <div className="flex-1 relative flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="300"
                          value={timelineFrame}
                          onChange={(e) => setTimelineFrame(parseInt(e.target.value))}
                          className="w-full select-all cursor-pointer accent-teal-400 h-1 bg-slate-800 rounded-lg appearance-none"
                        />
                      </div>
                      <div className="text-right text-[8px] text-teal-400 font-bold shrink-0 w-16">
                        Frame {timelineFrame} / 300
                      </div>
                    </div>
                  </div>

                  {/* Success prompt */}
                  {recordingSuccessAlert && (
                    <div className="mt-1 text-[8px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center justify-between">
                      <span className="font-semibold">{recordingSuccessAlert}</span>
                      <button onClick={() => setRecordingSuccessAlert(null)} className="hover:text-white px-1">✕</button>
                    </div>
                  )}
                </div>

                {/* Grid guidelines & tools belt */}
                <div className="flex justify-between items-center text-[8.5px] border-t border-white/5 pt-2 font-mono text-slate-500">
                  <div className="flex space-x-3">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={snapToGrid} 
                        onChange={(e) => setSnapToGrid(e.target.checked)} 
                        className="rounded accent-teal-500" 
                      />
                      <span>Grid Snap</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={showGrid} 
                        onChange={(e) => setShowGrid(e.target.checked)} 
                        className="rounded accent-teal-500" 
                      />
                      <span>Cones Overlay</span>
                    </label>
                  </div>
                  <span className="uppercase text-[8px] bg-white/5 px-2 py-0.5 rounded text-slate-400">
                    Physics Engine: <b>Bullet-v2.6</b> (Active WebGL Layer)
                  </span>
                </div>

              </div>
            )}

            {/* VIEWBOARD 2: ACTUATOR AND LINK LINKAGES SCHEMATIC BUILDER */}
            {activeTab === "robot-builder" && (
              <div className="border border-white/5 bg-[#09090c] rounded-xl p-4 w-full h-full max-w-4xl flex flex-col justify-between">
                <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                  <span className="text-teal-400 font-extrabold uppercase">Kinematic Skeleton Schematic (Denavit-Hartenberg)</span>
                  <span className="text-slate-500">Total Arm Payload Limits: <b>{customJoints.reduce((sum, j) => sum + j.mass, 0).toFixed(1)}kg</b></span>
                </div>

                {/* SVG model showing segments linked consecutively */}
                <div className="flex-1 w-full h-full flex items-center justify-center bg-black/40 rounded-lg my-2 relative">
                  <svg viewBox="0 0 500 240" className="w-full max-w-2xl max-h-[220px]">
                    {/* Render consecutive coordinate frames of the robot */}
                    <g transform="translate(80, 180)">
                      {/* Floor ground pad */}
                      <rect x="-60" y="10" width="120" height="6" fill="#1f2937" rx="2" />
                      <line x1="-80" y1="16" x2="80" y2="16" stroke="rgba(255,255,255,0.06)" />

                      {/* Cumulative mathematical segments drawing */}
                      {(() => {
                        let currentX = 0;
                        let currentY = 0;
                        let accumAngle = 0;
                        
                        return customJoints.map((j, idx) => {
                          const rad = (j.activeAngle * Math.PI) / 180;
                          accumAngle += rad;
                          // Convert length to pixels (e.g. scale multiplier 0.45)
                          const lengthPx = j.length * 0.42;
                          const nextX = currentX + lengthPx * Math.cos(accumAngle);
                          const nextY = currentY - lengthPx * Math.sin(accumAngle); // graphics Y is inverted
                          
                          const nodeX = currentX;
                          const nodeY = currentY;
                          
                          currentX = nextX;
                          currentY = nextY;

                          const isSelected = selectedJointId === j.id;

                          return (
                            <g key={j.id}>
                              {/* Joint Cylinder node */}
                              <circle 
                                cx={nodeX} 
                                cy={nodeY} 
                                r="10" 
                                fill={isSelected ? "#14b8a6" : "#1e1b4b"} 
                                stroke={isSelected ? "#5eead4" : "#a855f7"} 
                                strokeWidth="2" 
                                className="cursor-pointer hover:fill-teal-900 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJointId(j.id);
                                }}
                              />
                              
                              {/* Inner joint pin representation */}
                              <circle cx={nodeX} cy={nodeY} r="4" fill="#fff" />

                              {/* Connective links */}
                              <line 
                                x1={nodeX} 
                                y1={nodeY} 
                                x2={nextX} 
                                y2={nextY} 
                                stroke={isSelected ? "#14b8a6" : "#6366f1"} 
                                strokeWidth={isSelected ? "5" : "3.5"} 
                                strokeLinecap="round" 
                                className="cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedJointId(j.id);
                                }}
                              />

                              {/* Dimension text line overlay */}
                              <text 
                                x={(nodeX + nextX) / 2} 
                                y={(nodeY + nextY) / 2 - 8} 
                                textAnchor="middle" 
                                className="text-[7.5px] fill-slate-300 font-mono font-semibold"
                              >
                                {j.length}mm
                              </text>

                              {/* Target endpoint ring on the tip of final node */}
                              {idx === customJoints.length - 1 && (
                                <g transform={`translate(${nextX}, ${nextY})`}>
                                  <circle cx="0" cy="0" r="5" fill="#f43f5e" />
                                  <line x1="-8" y1="0" x2="8" y2="0" stroke="#fecdd3" strokeWidth="1" />
                                  <line x1="0" y1="-8" x2="0" y2="8" stroke="#fecdd3" strokeWidth="1" />
                                </g>
                              )}
                            </g>
                          );
                        });
                      })()}
                    </g>
                  </svg>
                </div>

                <div className="bg-[#111115] p-2.5 rounded-lg border border-white/5 text-[8px] font-mono leading-relaxed text-slate-400">
                  <span className="text-teal-400 block uppercase font-extrabold text-[8.5px] mb-1">Actuation Dynamics Solver Matrix</span>
                  Link lengths parsed into <b>Forward DH kinematics model</b>. Torque bounds calculated via inertial momentum vector equations. Ensure voltage constraints (48V nominal) stay compatible with peak BLDC power draw demands.
                </div>
              </div>
            )}

            {/* VIEWBOARD 3: INTERACTIVE PLC LADDER LOGIC & SIGNAL STATE COMPILER */}
            {activeTab === "automation-plc" && (
              <div className="border border-white/5 bg-[#09090c] rounded-xl p-4 w-full h-full max-w-4xl flex flex-col justify-between">
                <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                  <span className="text-teal-400 font-extrabold uppercase">Interactive IEC 61131 Ladder Diagram (LD)</span>
                  <span className="text-slate-500">Scan Frequency Cycle: <b>20 Hz (Stateful)</b></span>
                </div>

                {/* Ladder logic board rendering */}
                <div className="flex-1 w-full min-h-[200px] border border-white/5 rounded-lg bg-black/45 my-2 p-4 select-none relative overflow-y-auto">
                  {/* Two vertical power rails */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-cyan-700/60" title="Hot Rail L1" />
                  <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-slate-700" title="Return Rail L2" />

                  <div className="space-y-6 pt-4 pl-6 pr-6">
                    {plcRungs.map((rung) => {
                      // Calculate active states based on PLC inputs
                      const input1State = plcInputs[rung.inputVar1];
                      const contact1Closed = rung.inputContact1 === "normally_closed" ? !input1State : input1State;

                      let contact2Closed = true;
                      if (rung.inputContact2 !== "none") {
                        const input2State = plcInputs[rung.inputVar2];
                        contact2Closed = rung.inputContact2 === "normally_closed" ? !input2State : input2State;
                      }

                      const outputCoilOn = contact1Closed && contact2Closed;
                      const isSelected = selectedRungId === rung.id;

                      return (
                        <div 
                          key={rung.id} 
                          onClick={() => setSelectedRungId(rung.id)}
                          className={`relative h-12 flex items-center group cursor-pointer transition-colors ${
                            isSelected ? "bg-teal-500/5 rounded" : ""
                          }`}
                        >
                          {/* Continuous line representing connection rung wire block */}
                          <div className="absolute left-0 right-0 h-0.5 bg-gray-700 -z-0" />
                          
                          {/* Highlighted path if active */}
                          {outputCoilOn && (
                            <div className="absolute left-0 right-28 h-0.5 bg-teal-500 -z-0" />
                          )}

                          {/* Contact symbol 1 */}
                          <div className="absolute left-10 flex items-center space-x-1 font-mono text-[9px] bg-[#0c0c0f] px-2 border border-white/5 rounded z-10">
                            <span className="text-slate-500 font-bold uppercase shrink-0">In1:</span>
                            <span className="text-cyan-400 select-all font-semibold max-w-[100px] truncate">{rung.inputVar1}</span>
                            {/* Visual contact icon */}
                            {rung.inputContact1 === "normally_open" ? (
                              <span className={`font-bold ml-1 px-1 py-0.2 select-none border rounded text-[8px] ${contact1Closed ? "bg-teal-900 border-teal-500 text-teal-300 font-black" : "bg-black/50 text-slate-500 border-white/5"}`}>---| |---</span>
                            ) : (
                              <span className={`font-bold ml-1 px-1 py-0.2 select-none border rounded text-[8px] ${contact1Closed ? "bg-teal-900 border-teal-500 text-teal-300 font-black" : "bg-black/50 text-slate-500 border-white/5"}`}>---|/|---</span>
                            )}
                          </div>

                          {/* Optional Contact symbol 2 */}
                          {rung.inputContact2 !== "none" && (
                            <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-1 font-mono text-[9px] bg-[#0c0c0f] px-2 border border-white/5 rounded z-10">
                              <span className="text-slate-500 font-bold uppercase shrink-0">In2:</span>
                              <span className="text-cyan-400 font-semibold max-w-[100px] truncate">{rung.inputVar2}</span>
                              {rung.inputContact2 === "normally_open" ? (
                                <span className={`font-bold ml-1 px-1 py-0.2 select-none border rounded text-[8px] ${contact2Closed ? "bg-teal-900 border-teal-500 text-teal-300 font-black" : "bg-black/50 text-slate-500 border-white/5"}`}>---| |---</span>
                              ) : (
                                <span className={`font-bold ml-1 px-1 py-0.2 select-none border rounded text-[8px] ${contact2Closed ? "bg-teal-900 border-teal-500 text-teal-300 font-black" : "bg-black/50 text-slate-500 border-white/5"}`}>---|/|---</span>
                              )}
                            </div>
                          )}

                          {/* Output Coil symbol */}
                          <div className="absolute right-12 flex items-center space-x-1 bg-[#0c0c0f] border border-white/5 rounded px-2 text-[9px] z-10 font-mono">
                            <span className="text-slate-500 font-bold uppercase shrink-0">Coil:</span>
                            <span className="text-teal-3/10 font-bold uppercase text-[9px] text-[#f472b6] truncate max-w-[110px]">{rung.outputCoil}</span>
                            <span className={`font-bold ml-1 px-1.5 py-0.2 select-none border rounded-full text-[8px] ${outputCoilOn ? "bg-teal-950 border-teal-500 text-teal-300 font-black animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.5)]" : "bg-black text-slate-500 border-white/5"}`}>( )</span>
                          </div>

                          {/* Line status tag */}
                          <div className="absolute -right-2 font-mono text-[7px] text-slate-500">
                            {rung.id.toUpperCase()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Automation Log */}
                <div className="bg-[#111115] p-2.5 rounded-lg border border-white/5">
                  <div className="text-[8px] font-bold uppercase text-slate-500 mb-1 flex items-center space-x-2">
                    <Terminal className="w-3 h-3 text-teal-400" />
                    <span>Structured Text (ST) state loop validation compiler</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[8px] font-mono text-slate-400 leading-normal">
                    <div className="bg-black/50 rounded p-1.5 border border-white/5 whitespace-pre">
{`IF CONVEYOR_SENSOR AND NOT E_STOP_TRIPPED THEN
  ARM_TRIGGER_READY := TRUE;
ELSE
  ARM_TRIGGER_READY := FALSE;
END_IF;`}
                    </div>
                    <div className="bg-black/50 rounded p-1.5 border border-white/5 h-full overflow-y-auto max-h-16">
                      {plcCompileLog.map((log, idx) => <div key={idx}><span className="text-teal-400">►</span> {log}</div>)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEWBOARD 4: MACHINE VISION CALIBRATION RADAR LAB */}
            {activeTab === "vision-lab" && (
              <div className="border border-white/5 bg-[#09090c] rounded-xl p-4 w-full h-full max-w-4xl flex flex-col justify-between">
                <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                  <span className="text-teal-400 font-extrabold uppercase">Optic Inference Neural Sandbox Frame</span>
                  <span className="text-slate-500">Live AI Model: <b>YOLOv9-S (TensorRT Accelerated)</b></span>
                </div>

                {/* CCTV camera feedback representation with overlay boxes */}
                <div className="flex-1 border border-white/5 rounded-lg bg-black/40 my-2 select-none relative overflow-hidden flex items-center justify-center bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15)_0%,transparent_75%)]">
                  
                  {/* Camera lens grid overlay */}
                  <div className="absolute inset-x-8 inset-y-6 border border-cyan-500/10 rounded pointer-events-none" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500/5 pointer-events-none" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500/5 pointer-events-none" />

                  {/* Corner focus brackets */}
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-cyan-500" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-cyan-500" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-cyan-500" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-cyan-500" />

                  {/* Visualizing detect outputs on background */}
                  {visionMode === "raw_camera" && (
                    <div className="text-center font-mono space-y-2">
                      <Tv className="w-12 h-12 text-slate-550 mx-auto animate-pulse" />
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-widest">CCTV Raw Stream Feeds Only</span>
                      <p className="text-[8.5px] text-slate-500 leading-none">Filters deactivated. AI model recognition is currently bypassed.</p>
                    </div>
                  )}

                  {visionMode === "yolo_ai_model" && (
                    <div className="w-full h-full relative font-mono select-none">
                      {/* Plot floating labels as bounding tags */}
                      {detectedTargets.map((tar, index) => (
                        <div 
                          key={index}
                          style={{ left: `${tar.x}px`, top: `${tar.y}px` }}
                          className={`absolute border border-teal-500 rounded p-1 flex flex-col justify-between ${tar.box}`}
                        >
                          <div className="absolute -top-[16px] left-0 bg-teal-500 text-black text-[7.5px] font-extrabold px-1.5 py-0.2 rounded uppercase select-all">
                            {tar.class} [{Math.round(tar.conf * 100)}%]
                          </div>
                        </div>
                      ))}

                      {/* Vision focal sweeping arc line */}
                      <div className="absolute bottom-4 right-4 text-[7px] text-slate-500 flex flex-col items-end">
                        <span>FPS: 120.4 (CUDA)</span>
                        <span>APERTURE ANGLE: {cameraFov}°</span>
                      </div>
                    </div>
                  )}

                  {visionMode === "lidar_echodepth" && (
                    <div className="w-full h-full relative font-mono select-none flex items-center justify-center p-6">
                      {/* Wave circle scanning */}
                      <svg viewBox="0 0 400 200" className="w-full max-w-lg h-full max-h-[180px]">
                        <circle cx="200" cy="100" r="80" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="4,4" opacity="0.4" />
                        <circle cx="200" cy="100" r="50" fill="none" stroke="#22d3ee" strokeWidth="1.5" opacity="0.6" />
                        <circle cx="200" cy="100" r="20" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.8" />
                        <line x1="200" y1="100" x2="280" y2="40" stroke="#22d3ee" strokeWidth="2" className="animate-spin-slow origin-[200px_100px]" />
                        
                        {/* Echo points hit */}
                        <circle cx="160" cy="80" r="4" fill="#ef4444" className="animate-ping" />
                        <circle cx="270" cy="130" r="3" fill="#22c55e" />
                        <circle cx="210" cy="150" r="3" fill="#facc15" />
                      </svg>
                      
                      <div className="absolute bottom-4 left-4 text-[7.5px] text-[#22d3ee] font-bold">
                        LIDAR CYCLIC INTERFEROMETRIC SCANNER ACTIVE
                      </div>
                    </div>
                  )}

                </div>

                <div className="bg-[#111115] p-2.5 rounded-lg border border-white/5 text-[8.5px] font-mono leading-relaxed text-slate-400">
                  <span className="text-teal-400 block uppercase font-extrabold text-[8.5px] mb-1">Optical Calibration Diagnostics</span>
                  YOLO v9 Deep Learning classifier bounds humans vs hardware parts. Depth estimates generated from stereo disparity triangulation matrices automatically output safety alarms if field limits are breached.
                </div>
              </div>
            )}

            {/* VIEWBOARD 5: MOTION PLANNING PATHFINDING OVERLAY DECK */}
            {activeTab === "motion-planning" && (
              <div className="border border-white/5 bg-[#09090c] rounded-xl p-4 w-full h-full max-w-4xl flex flex-col justify-between">
                <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                  <span className="text-teal-400 font-extrabold uppercase">Path Planning Algorithms Visualizer</span>
                  <span className="text-slate-500">Method: <b>{planningAlgorithm.replace("_", " ")} Network</b></span>
                </div>

                {/* Paths finding board mapping with dots and links */}
                <div className="flex-1 w-full min-h-[220px] border border-white/5 rounded-lg bg-black/45 my-2 p-3 font-mono text-slate-400 select-none relative overflow-hidden flex items-center justify-center">
                  <svg viewBox="0 0 460 200" className="w-full max-w-xl h-full max-h-[190px]">
                    {/* Grid mesh backdrop */}
                    <g opacity="0.1">
                      <line x1="40" y1="0" x2="40" y2="200" stroke="#10b981" />
                      <line x1="100" y1="0" x2="100" y2="200" stroke="#10b981" />
                      <line x1="160" y1="0" x2="160" y2="200" stroke="#10b981" />
                      <line x1="220" y1="0" x2="220" y2="200" stroke="#10b981" />
                      <line x1="280" y1="0" x2="280" y2="200" stroke="#10b981" />
                      <line x1="340" y1="0" x2="340" y2="200" stroke="#10b981" />
                      <line x1="400" y1="0" x2="400" y2="200" stroke="#10b981" />
                    </g>

                    {/* Start & End Target Hubs */}
                    <circle cx="60" cy="140" r="14" fill="#312e81" stroke="#4338ca" strokeWidth="2" />
                    <circle cx="60" cy="140" r="4" fill="#818cf8" />
                    <text x="60" y="162" textAnchor="middle" className="text-[7px] fill-indigo-300 font-bold">START (HOME)</text>

                    <circle cx="380" cy="50" r="14" fill="#064e3b" stroke="#047857" strokeWidth="2" />
                    <circle cx="380" cy="50" r="4" fill="#34d399" />
                    <text x="380" y="72" textAnchor="middle" className="text-[7px] fill-emerald-300 font-bold">END (PALLET)</text>

                    {/* Threat / Obstacle boundary panel wall */}
                    <rect x="200" y="30" width="40" height="120" fill="rgba(185,28,28,0.2)" stroke="#b91c1c" strokeWidth="1.5" rx="3" />
                    <text x="220" y="90" textAnchor="middle" className="text-[7.5px] fill-red-400 rotate-90 font-black">COLLISION_BARRIER</text>

                    {/* A* GRID SEARCH LINES OR RRT* NODE TREE RENDERERS */}
                    {planningAlgorithm === "A_Star" && (
                      <g>
                        {/* Static Grid paths routing around wall */}
                        <polyline 
                          points="60,140 140,140 140,40 140,50 380,50" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                          strokeDasharray="4,4"
                          className="animate-blink"
                        />
                        <circle cx="140" cy="140" r="3" fill="#14b8a6" />
                        <circle cx="140" cy="50" r="3" fill="#14b8a6" />
                        
                        <text x="145" y="135" className="text-[6.5px] fill-teal-400">Node cost F(n) = g(n) + h(n)</text>
                      </g>
                    )}

                    {planningAlgorithm === "RRT_Star" && (
                      <g>
                        {/* RRT Node Tree Branch structures pulsing */}
                        <line x1="60" y1="140" x2="110" y2="120" stroke="#ec4899" strokeWidth="1.5" />
                        <line x1="110" y1="120" x2="160" y2="135" stroke="#ec4899" strokeWidth="1.5" />
                        <line x1="110" y1="120" x2="135" y2="80" stroke="#ec4899" strokeWidth="1.5" />
                        <line x1="135" y1="80" x2="190" y2="60" stroke="#ec4899" strokeWidth="1.5" />
                        
                        {/* Branch around hazard */}
                        <line x1="135" y1="80" x2="170" y2="170" stroke="#ec4899" strokeWidth="1.5" />
                        <line x1="170" y1="170" x2="270" y2="180" stroke="#ec4899" strokeWidth="1.5" />
                        <line x1="270" y1="180" x2="310" y2="120" stroke="#ec4899" strokeWidth="1.5" />
                        <line x1="310" y1="120" x2="380" y2="50" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                        
                        {/* Star Optimization Nodes */}
                        <circle cx="110" cy="120" r="2.5" fill="#fbcfe8" />
                        <circle cx="160" cy="135" r="2.5" fill="#fbcfe8" />
                        <circle cx="135" cy="80" r="2.5" fill="#fbcfe8" />
                        <circle cx="170" cy="170" r="2.5" fill="#fbcfe8" />
                        <circle cx="270" cy="180" r="2.5" fill="#fbcfe8" />
                        <circle cx="310" cy="120" r="2.5" fill="#fbcfe8" />
                        
                        <text x="210" y="193" className="text-[6.5px] fill-pink-400">RRT* Optimized collision-free path branch (16 samples)</text>
                      </g>
                    )}

                    {planningAlgorithm === "PRM" && (
                      <g>
                        {/* PRM Road network mesh mapping */}
                        <polygon points="60,140 100,50 160,80" fill="none" stroke="rgba(14,165,233,0.3)" />
                        <polygon points="160,80 260,180 340,110" fill="none" stroke="rgba(14,165,233,0.3)" />
                        <polygon points="340,110 380,50 310,40" fill="none" stroke="rgba(14,165,233,0.3)" />
                        
                        <polyline points="60,140 160,80 340,110 380,50" fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
                        
                        <circle cx="100" cy="50" r="3" fill="#38bdf8" />
                        <circle cx="160" cy="80" r="3" fill="#38bdf8" />
                        <circle cx="260" cy="180" r="3" fill="#38bdf8" />
                        <circle cx="340" cy="110" r="3" fill="#38bdf8" />
                        
                        <text x="230" y="18" className="text-[6.5px] fill-cyan-400">PRM Network graph query solution</text>
                      </g>
                    )}
                  </svg>
                </div>

                <div className="bg-[#111115] p-2.5 rounded-lg border border-white/5 text-[8px] font-mono leading-relaxed text-slate-400">
                  <span className="text-teal-400 block uppercase font-extrabold text-[8.5px] mb-1">Dynamic Path planning calculations</span>
                  Calculates coordinates through linear trajectory interpolations. Standard splines/bezier math ensures acceleration profile smoothing, eliminating severe physical armature shaking at joint pivot clamps.
                </div>
              </div>
            )}

            {/* VIEWBOARD 6: ENTERPRISE ANALYTICS GRAPHS CHART */}
            {activeTab === "analytics-center" && (
              <div className="border border-white/5 bg-[#09090c] rounded-xl p-4 w-full h-full max-w-4xl flex flex-col justify-between">
                <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                  <span className="text-teal-400 font-extrabold uppercase">Live Factory Power Grid Metrics & OEE Curves</span>
                  <span className="text-slate-500">Telemetry Sampling: <b>Continuous Real-time</b></span>
                </div>

                {/* Draw custom SVG chart showing efficiency metrics over time */}
                <div className="flex-1 border border-white/5 rounded-lg bg-black/45 my-2 p-3 font-mono text-slate-400 select-none relative overflow-hidden flex flex-col justify-between">
                  <div className="flex-1 w-full h-full flex items-center justify-center pt-2">
                    <svg viewBox="0 0 420 160" className="w-full max-w-lg h-full max-h-[140px]">
                      {/* Grid lines */}
                      <line x1="30" y1="20" x2="400" y2="20" stroke="rgba(255,255,255,0.03)" />
                      <line x1="30" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.03)" />
                      <line x1="30" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.03)" />
                      <line x1="30" y1="130" x2="400" y2="130" stroke="rgba(255,255,255,0.08)" />

                      {/* Chart axis numbers */}
                      <text x="10" y="24" className="text-[7.5px] fill-slate-550">100%</text>
                      <text x="10" y="64" className="text-[7.5px] fill-slate-550">60%</text>
                      <text x="10" y="104" className="text-[7.5px] fill-slate-550">20%</text>
                      <text x="10" y="134" className="text-[7.5px] fill-slate-550">0%</text>

                      {/* Line plot 1: Production efficiency graph (Green) */}
                      <polyline
                        points="30,110 80,95 130,50 180,45 230,65 280,30 330,35 400,25"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Line plot 2: Peak Power Watt Draw fluctuation (Amber) */}
                      <polyline
                        points="30,120 80,105 130,80 180,90 230,100 280,75 330,60 400,75"
                        fill="none"
                        stroke="#facc15"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeDasharray="2,2"
                      />

                      {/* Anchored markers */}
                      <circle cx="280" cy="30" r="3" fill="#14b8a6" />
                      <text x="287" y="27" className="text-[7px] fill-teal-400 font-bold">OEE PEAK : 98%</text>
                    </svg>
                  </div>

                  <div className="flex justify-between items-center text-[7.5px] border-t border-white/5 pt-2 text-slate-500 font-mono">
                    <div className="flex space-x-3">
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>OEE Efficiency (%)</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span className="w-2 h-2 rounded bg-yellow-500 inline-block" />
                        <span>Grid Peak Power (W)</span>
                      </span>
                    </div>
                    <span>Data Refresh Interval : 100ms cycle</span>
                  </div>
                </div>

                <div className="bg-[#111115] p-2.5 rounded-lg border border-white/5 text-[8.5px] font-mono leading-relaxed text-slate-400">
                  <span className="text-teal-400 block font-extrabold uppercase text-[8.5px] mb-1">Predictive Bottleneck Diagnostics</span>
                  OEE curves trace optimal motor utilization vs power factor limits. Integrated AI algorithm forecasts hardware thermal breakdowns 12 days prior to mechanical joint locking fatigue.
                </div>
              </div>
            )}

            {/* VIEWBOARD 7: LEARNING ACADEMY COURSE PROGRESS GRAPH */}
            {activeTab === "learning-academy" && (
              <div className="border border-white/5 bg-[#09090c] rounded-xl p-4 w-full h-full max-w-4xl flex flex-col justify-between">
                <div className="flex justify-between text-[10px] border-b border-white/5 pb-2">
                  <span className="text-teal-400 font-extrabold uppercase">Engineering certification milestones tracker</span>
                  <span className="text-slate-500">Track: <b>Industrial Robotics Architect V2</b></span>
                </div>

                {/* Visual badges/milestones presentation */}
                <div className="flex-1 w-full min-h-[220px] my-2 select-none flex items-center justify-center relative overflow-hidden bg-black/45 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-xl">
                    {[
                      { title: "Kinematics Master", level: "Core math and Jacobians solved", isEarned: true, reward: "IK Badge" },
                      { title: "PLC Automator", level: "IEC Ladder logical state compiler", isEarned: true, reward: "Coil Specialist Badge" },
                      { title: "Inference Calibrator", level: "Neural CCTV box model tuning", isEarned: false, reward: "Vision Badge" },
                      { title: "OEE Strategist", level: "KPI optimization models master", isEarned: false, reward: "Enterprise Architect" },
                    ].map((badge, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                          badge.isEarned 
                            ? "bg-teal-950/20 border-teal-500 text-slate-200 shadow shadow-teal-500/10" 
                            : "bg-[#111114] border-white/5 text-slate-500"
                        }`}
                      >
                        <div className={`w-11 h-11 rounded-full border flex items-center justify-center mb-1.5 font-bold ${
                          badge.isEarned 
                            ? "bg-teal-500/10 border-teal-400 text-teal-400" 
                            : "bg-black border-slate-700 text-slate-650"
                        }`}>
                          <Award className="w-5 h-5" />
                        </div>
                        <h4 className="text-[9px] font-bold uppercase truncate max-w-full leading-tight">{badge.title}</h4>
                        <p className="text-[7.5px] text-slate-500 mt-1 leading-normal leading-tight h-8 truncate overflow-hidden">{badge.level}</p>
                        <span className={`text-[6.5px] font-extrabold uppercase px-1.5 py-0.2 rounded mt-2.5 ${
                          badge.isEarned ? "bg-teal-400/20 text-teal-200" : "bg-white/5 text-slate-550"
                        }`}>
                          {badge.isEarned ? "EARNED" : "LOCK"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111115] p-2.5 rounded-lg border border-white/5 text-[8.5px] font-mono leading-relaxed text-slate-400">
                  <span className="text-teal-400 block font-extrabold uppercase text-[8.5px] mb-1">Academic Credentials status</span>
                  Earn digital badges matching accredited technical factory automation courses. Synchronize and test physical scripts to verify full kinematics compliance and secure your official digital engineer resume credentials.
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}
