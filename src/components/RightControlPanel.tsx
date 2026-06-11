import React, { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { 
  Cpu, RotateCcw, AlertTriangle, Send, Sparkles, Code2, 
  Settings, Activity, BookOpen, Compass, Sliders, ChevronDown, 
  ChevronUp, BarChart2, RefreshCw, ChevronRight, HelpCircle, 
  ArrowUpRight, Info, CheckCircle2, ShieldAlert, Zap,
  Search, Award, Check, Play, Edit, Calculator, Wrench,
  Maximize2, Minimize2
} from "lucide-react";
import { 
  BoardConfig, 
  ProgramLanguageConfig, 
  RobotJoint, 
  RobotDesignConfig, 
  CIMSortingStats, 
  SimulationState,
  WorkspaceFile
} from "../types";
import { calculateForwardKinematics, solveInverseKinematics } from "../utils/kinematics";

interface RightControlPanelProps {
  activeBoard: BoardConfig;
  activeLanguage: ProgramLanguageConfig;
  currentCode: string;
  onInsertCode: (code: string) => void;
  onCollapse?: () => void;
  
  // Joint coordinates & designs
  joints: RobotJoint[];
  setJoints: React.Dispatch<React.SetStateAction<RobotJoint[]>>;
  robotDesign: RobotDesignConfig;
  robotType: "articulated" | "scara" | "cartesian";
  
  // Factory/Material state
  simulationState: SimulationState;
  setSimulationState: React.Dispatch<React.SetStateAction<SimulationState>>;
  sortingStats: CIMSortingStats;
  setSortingStats: React.Dispatch<React.SetStateAction<CIMSortingStats>>;
  feedMode: "random" | "red" | "green" | "blue" | "yellow";
  setFeedMode: React.Dispatch<React.SetStateAction<"random" | "red" | "green" | "blue" | "yellow">>;
  
  activeFile?: WorkspaceFile;
  onFileChange?: (content: string) => void;
}

// ----------------------------------------------------
// --- VOLTLOGIC ACADEMY ADVANCED QUESTION EXAMS (35 Qs) ---
// ----------------------------------------------------
const QUIZ_QUESTIONS = [
  {
    q: "Which G-Code represents Linear Motion Interpolation with a constant feedrate?",
    options: ["G00 (Rapid Seek)", "G01 (Linear motion)", "G02 (Clockwise Arc)", "G21 (Unit millimeter conversion)"],
    correct: 1,
    hint: "G00 is rapid seek, while G01 interpolates coordinates on a straight vector."
  },
  {
    q: "What is the primary advantage of a SCARA robot arm configuration?",
    options: [
      "Infinite workspace reach in any direction",
      "High vertical stiffness and incredibly fast planar cycle speeds",
      "Easiest 1D linear trajectory equations without rotation",
      "Laser-guided spatial triangulation offsets"
    ],
    correct: 1,
    hint: "SCARA uses parallel joint planes for rapid horizontal movements while remaining extremely robust vertically."
  },
  {
    q: "If a photoelectric breakbeam sensor is occluded, how should we await its signal in G-Code?",
    options: ["G04 P350 (Dwell delay)", "M03 S1 (Conveyor on)", "M66 P1 L3 Q5 (Wait pin digital)", "M05 P1 (Vacuum active)"],
    correct: 2,
    hint: "M66 reads digital sensor pins and waits for transitions with optional timeout P/Q parameters."
  },
  {
    q: "What coordinate space represents the individual rotational angles of the physical joints?",
    options: ["Cartesian Frame (X, Y, Z)", "Joint Space (angles or segment lengths)", "DH Matrix Determinant", "Pneumatic Solenoid Registers"],
    correct: 1,
    hint: "Joint Space is defined by angles (θ1, θ2, θ3) or slider lengths change, whereas Cartesian represents absolute spatial dimensions."
  },
  {
    q: "Which error is fired if the joint thermal load exceeds rated motor limits continuously?",
    options: ["E101 Gripper Leak", "E103 Compiler Fault", "E105 Thermal Stress", "E106 Singular Dh-Matrix"],
    correct: 2,
    hint: "Excess torque load triggers thermal alarms (E105) resulting in hardware safety interrupts."
  },
  {
    q: "What character prefix specifies feedrate speed (axial velocity) in planar G-Code blocks?",
    options: ["S (Spindle Speed)", "F (Feedrate)", "V (Velocity vector)", "A (Acceleration rate)"],
    correct: 1,
    hint: "F stands for feedrate, typically written as F[val] (e.g. F1200 represents 1200 mm/min)."
  },
  {
    q: "Along which axis does a Selective Compliance Assembly Robot Arm (SCARA) exhibit near-infinite stiffness?",
    options: ["Planar horizontal X vector", "Planar diagonal Y vector", "Vertical drop-down Z vector", "Angular swivel pivot J0"],
    correct: 2,
    hint: "The vertical column structure gives high thrust load stiffness in Z, perfect for pressing."
  },
  {
    q: "Which M-code instruction blocks interpreter execution until a photoelectric sensor state changes?",
    options: ["M03 S1 (Turn Belt Active)", "M05 P0 (Venturi Release)", "M66 (Wait Digital Interrupt Signal)", "M02 (End of Program Layout)"],
    correct: 2,
    hint: "M66 is used in combination with P (port) and L (mode) to block execution until pin input rises or falls."
  },
  {
    q: "What kinematic condition occurs if Link 1 and Link 2 are aligned in a perfect collinear line (angle θ2 = 0° or 180°)?",
    options: ["Maximum acceleration boost", "Jacobian Singularity with loss of a spatial degree of freedom", "Automatic Denavit-Hartenberg checksum parity", "Pneumatic pressure stabilizer vent"],
    correct: 1,
    hint: "Collinear alignment creates a singularity where infinite joint velocity is mathematically required to move along the normal vector."
  },
  {
    q: "How are scanned analog color indices stored in VoltLogic global macro memory slots?",
    options: ["In volatile servo buffers $SV0-$SV3", "Using macro slots #200 (Red), #201 (Green), and #202 (Blue)", "Directly written on the EEPROM flash sector", "Shared via the raw G01 feedrate registers #F00-#F03"],
    correct: 1,
    hint: "Color-scanning camera sensors write numerical light intensities directly into shared macro registers starting from slot #200."
  },
  {
    q: "Which command combo configures absolute coordinates combined with millimeter layout scaling?",
    options: ["G91 & G20", "G90 & G21", "G00 & M03", "G04 & M66"],
    correct: 1,
    hint: "G90 switches coordinate mapping to absolute, while G21 converts coordinates to millimeters."
  },
  {
    q: "When calculating planar 2-link Jacobian metrics, what value corresponds to a complete dead-zone singularity?",
    options: ["When det(J) reaches its maximum capacity", "When det(J) equals absolute zero", "When det(J) is perfectly proportional to Link 1", "When det(J) matches the feedrate scaling coefficient"],
    correct: 1,
    hint: "When the determinant of the Jacobian Matrix is zero, the matrix is non-invertible, indicating a singular state."
  },
  {
    q: "In Chapter 7, what is the corrective measure for recovering from a Joint Over-torque Safety Alarm (E105)?",
    options: ["Manually disconnect the high-pressure conveyor line", "Lower the speed feedrate limit below F1000 and use smooth acceleration profiles", "Replace the digital breakbeam emitter receiver tube", "Shift the coordinate space to English standard inches via G20"],
    correct: 1,
    hint: "Over-torque (E105) happens due to extreme dynamic joint stress. Reducing feedrates and smoothing vectors cures it."
  },
  {
    q: "What is the physical time duration when G04 P450 is compiled in the sequencer?",
    options: ["A hold duration of exactly 4.5 seconds", "A hold duration of exactly 450 milliseconds", "A mechanical sweep of 450 microsteps", "An active belt transport loop of 45 centimeters"],
    correct: 1,
    hint: "G04 blocks processing for raw P milliseconds (so P450 = 450ms)."
  },
  {
    q: "Which correct G-code/M-code combination immediately toggles the belt drive motor off?",
    options: ["M03 S0", "M66 P1 L0", "M05 P0", "G01 X0 Z0 F0"],
    correct: 0,
    hint: "M03 S1 enables the conveyor, and S0 cuts power to the conveyor motor."
  },
  {
    q: "What does the abbreviation TCP stand for in robotics and coordinate space calibration?",
    options: ["Thermal Calibration Parameter", "Tool Center Point", "Trajectory Control Program", "Transfer Collision Phase"],
    correct: 1,
    hint: "Tool Center Point is the coordinate origin of the functional end effector."
  },
  {
    q: "In the spatial inverse kinematics solver of a planar 2R joint manipulator, what mathematical law is utilized to solve θ2 first?",
    options: ["Euler's Totient Theorem", "The Pythagorean Hypotenuse Summation", "Law of Cosines on intermediate link projections", "Newtonian Force Vectoring"],
    correct: 2,
    hint: "Law of Cosines relates the Euclidean radial distance squared to the link lengths of joint 1 and joint 2."
  },
  {
    q: "What is the signal state of the optical breakbeam when an incoming workpiece blocks the light beam?",
    options: ["Digital LOW / Open Relay", "Digital HIGH / Active Occluded Segment", "Tri-State Floating impedance index", "Infinite Voltage Loop Reset"],
    correct: 1,
    hint: "Photoelectric receivers typically transit to state HIGH (1) when the beam represents active blockage."
  },
  {
    q: "What type of path motion trajectory is commanded by G02?",
    options: ["Counter-clockwise circular arc", "Clockwise circular arc", "Rapid vertical linear climb override", "Direct angular motor joint homing pivot"],
    correct: 1,
    hint: "G02 represents clockwise arc interpolation, whereas G03 is counter-clockwise."
  },
  {
    q: "What is the primary function of Denavit-Hartenberg (D-H) parameters in structural robotics?",
    options: ["Measuring thermal heat dissipation in high-torque servo motor coils", "Establishing consistent spatial relative frames for coordinate linkage transformations", "Calculating vacuum release pressure ratios inside pneumatic valves", "Encrypting digital G-Code data fields in host ethernet channels"],
    correct: 1,
    hint: "D-H representation uses four spatial constants (a, alpha, d, theta) to recursively compile joint vectors."
  },
  {
    q: "If the end-effector pressure sensor registers 0.35 bar instead of 0.85 bar vacuum during pick, what error code is flagged?",
    options: ["E104 Photo Sensor Timeout", "E101 Gripper Vacuum Leak", "E103 Compiler Parse Fault", "E106 Singular Frame Alignment"],
    correct: 1,
    hint: "E101 represents a gripper vacuum leak where suction pressure fails to reach the critical seal state."
  },
  {
    q: "In the manual kinematic equations, why are degree values converted to radians using (Angle * PI / 180)?",
    options: ["Because math trigonometric functions in Javascript (cos, sin) exclusively expect radian arguments", "To calibrate torque loads back to standard imperial metrics", "To scale the slider length to fit G-Code coordinate buffers", "To trigger mechanical microstep adjustments on Arduino encoders"],
    correct: 0,
    hint: "Math.sin() and Math.cos() are defined purely in terms of radian parameters."
  },
  {
    q: "What Cartesian manipulator config maps moves directly using perpendicular sliding carriages?",
    options: ["Planar 3R Swivel Delta", "Cartesian Gantry G-Code Rails", "SCARA high stiffness column", "Pneumatic Radial Manipulator Pivot"],
    correct: 1,
    hint: "Cartesian systems translate frames on simple, linear, orthogonal axes without rotational pivots."
  },
  {
    q: "In M66 P1 L3 Q5, what does the 'L3' mode parameter represent to the digital wait command?",
    options: ["Wait specifically for digital latching on falling-edge signal transitions", "Wait specifically for state transition (both rising and falling edge thresholds)", "Command digital relay to pulse exactly three times", "Apply a high thermal speed limit of 3.0 N·m load"],
    correct: 1,
    hint: "Mode parameter 'L3' in industrial sensor controllers signifies listening to any transition interrupt state."
  },
  {
    q: "What is the safe operating reach limit coordinates radius for Link lengths L1=160mm and L2=120mm combined?",
    options: ["Exactly 120 mm", "Exactly 160 mm", "Up to 280 mm absolute displacement limit", "Over 400 mm offset with auxiliary extensions"],
    correct: 2,
    hint: "Total mechanical range cannot exceed the direct analytical sum of individual links (160 + 120 = 280 mm)."
  },
  {
    q: "When G21 is active, what are the dimensional speed units for the feed rate parameter F1200?",
    options: ["1200 micrometers per second", "1200 centimeters per microsecond", "1200 millimeters per minute", "1200 inches per hour"],
    correct: 2,
    hint: "Standard millimeter G-Code parameters execute feedrates scaled as millimeters per minute."
  },
  {
    q: "In the kinematic analyzer, what determinant value triggers a singular workspace Warning inside the cell?",
    options: ["When det(J) falls below a conservative threshold of 1500", "When det(J) exceeds 120,000", "When the link angles θ1 and θ2 equal 45 degrees exactly", "When the vacuum suction pressure indicator drops beneath 0.5 bar"],
    correct: 0,
    hint: "To avoid near-singularity mathematical division bugs, det(J) < 1500 is flagged."
  },
  {
    q: "What parameter does the M05 vacuum command take to active drop release of a captured workpiece?",
    options: ["S1 (Solenoid Turn Active)", "P0 (Suction Power Off / Venturi Drain)", "P1 (Pressure Force on)", "G66 (Interrupt Wait Lock)"],
    correct: 1,
    hint: "M05 P0 immediately closes the digital solenoid valve to disengage gripper suction."
  },
  {
    q: "What transformation solves joint servo angles from target (X, Z) coordinates?",
    options: ["Forward Kinematics Transformation", "Inverse Kinematics Resolution", "Numerical Integration Vectors", "Pneumatic Coordinate Sweeping"],
    correct: 1,
    hint: "Inverse kinematics maps global Cartesian space goals back onto individual rotary motor coordinates."
  },
  {
    q: "In a CIM (Computer Integrated Manufacturing) loop, why is the sensor placed upstream of the robot?",
    options: ["To let parts slide into the disposal container first", "To detect, identify, and prepare coordinates for intercept pick-up BEFORE the part reaches the robot range", "To record the total thermal operating temperatures of the pneumatic compressor", "To clear G-Code local macro storage registers regularly"],
    correct: 1,
    hint: "Pre-scanning material allows the PLC to calculate paths and timing profiles prior to physical arrival."
  },
  {
    q: "When executing the REST API webhook command, which endpoint handles motion controls on VoltLogic nodes?",
    options: ["GET /api/system/status", "POST /api/robot/move", "DELETE /api/macros/clear", "PUT /api/conveyor/speed"],
    correct: 1,
    hint: "Motion actions typically use POST requests targeting specific trajectory routes."
  },
  {
    q: "Why do automated high-speed gantries use trapezoidal or S-curve velocity profiling?",
    options: ["To minimize mechanical stress, jerks, and joint motor over-torque E105 alerts", "To rotate the coordinate gantry frame towards G20 inches scale", "To decrease the breakbeam occlusion threshold of digital sensors", "To double the vacuum pressure level in the pickup solenoid"],
    correct: 0,
    hint: "Ramping up and down smoothly keeps kinetic momentum from throwing joints into over-torque."
  },
  {
    q: "What is the typical resolution for G-Code interpreter warning 'E103: Syntax Compiler Fault'?",
    options: ["Replace physical vacuum cup gaskets", "Verify instructions match standard ISO G-Code syntax and review coordinate casing formatting", "Recharge conveyor motor belt grease registers", "Calibrate coordinate axes limits offset +0.024 mm manually"],
    correct: 1,
    hint: "E103 occurs when there are syntactically malformed commands, comments without delimiters, or invalid alphanumeric parameters."
  },
  {
    q: "What physical metric represents the data incoming from slot #220 = ENC1?",
    options: ["Absolute air moisture inside pneumatic lines", "Revolutions or count output from conveyor axle shaft quadrature encoders", "Rotational degree angles of Link 1 motor J1", "Maximum color reflection percentage of red wavelength"],
    correct: 1,
    hint: "ENC1 maps physical digital pulses from conveyor belt encoders to coordinate displacement speed."
  },
  {
    q: "What score threshold represents an Elite Academy Architect rating upon completing the evaluation exam?",
    options: ["100% Correct on all multiple-choice and mathematical coding exercises", "At least 55% with manual calibration offset bypass active", "Exactly three correct multiple-choice answers, code not checked", "90% on MC only, with a vacuum alarm leak present"],
    correct: 0,
    hint: "Perfection on both theoretical questions and physical G-code scripts defines the A+ Elite rating."
  }
];

const CODING_EXERCISES = [
  {
    id: 1,
    title: "Exercise 1: G-Code Trajectory Basics (Beginner)",
    description: "Initialize G-Code mapping to Absolute Mode (G90) and Millimeter Units (G21), then execute a linear move (G01) to coordinates X=150, Z=75 at horizontal feedrate speed F1000.",
    difficulty: "Beginner",
    linesRequired: "1 - 3 Lines",
    placeholder: "G90\nG21\nG01 X150 Z75 F1000",
    hint: "Make sure to include G90, G21, and a singular line of destination coordinates with the feedrate syntax.",
    verifier: (lines: string[]) => {
      const parsed = lines.map(l => l.toUpperCase().replace(/\s+/g, " ").trim()).filter(l => l.length > 0 && !l.startsWith(";"));
      const hasG90 = parsed.some(l => l.includes("G90"));
      const hasG21 = parsed.some(l => l.includes("G21"));
      const hasMove = parsed.some(l => (l.includes("G01") || l.includes("G1")) && l.includes("X150") && l.includes("Z75") && l.includes("F1000"));
      
      if (!hasG90) return { success: false, feedback: "Missing G90 absolute mode initialization segment.", advice: "Add G90 on its own line to configure absolute space offsets.", nextInstruction: "Review Command handbook Part IV: G-Code Reference." };
      if (!hasG21) return { success: false, feedback: "Missing G21 millimeter unit setup command.", advice: "Include G21 to scale axial dimension calculations to mm.", nextInstruction: "Review Command handbook Part IV: G-Code Reference." };
      if (!hasMove) return { success: false, feedback: "Target linear destination command is missing or holds incorrect parameters.", advice: "Write 'G01 X150 Z75 F1000' to execute coordinate moves at feedrate speed F1000.", nextInstruction: "Verify spelling, case coordinates and parameter values." };
      
      return { success: true, feedback: "Verification Successful! Perfect baseline trajectory compiled.", advice: "Your code successfully conforms to ISO-6983 standard structures.", nextInstruction: "Awesome! You are clean to proceed to Level 2 challenges." };
    }
  },
  {
    id: 2,
    title: "Exercise 2: Sensor-Driven Pick Cycle (Intermediate)",
    description: "Write an automated cycle: Turn the conveyor belt motor ON (M03 S1), await incoming materials on breakbeam sensor pin 1 using wait pin transition command (M66 P1 L3 with timeout Q5), stop the conveyor belt motor (M03 S0), activate vacuum suction cup (M05 P1), hold for 400ms for stable suction seal (G04 P400), and retract vertical tool to height Z=120 using linear travel (G01 Z120 at feedrate F1200).",
    difficulty: "Intermediate",
    linesRequired: "3 - 6 Lines",
    placeholder: "; Enter your pick cycle script here\nM03 S1\n...",
    hint: "Combine conveyor states M03, digital trigger checker M66, hold wait timer G04, and physical tool retract commands sequentially.",
    verifier: (lines: string[]) => {
      const parsed = lines.map(l => l.toUpperCase().replace(/\s+/g, " ").trim()).filter(l => l.length > 0 && !l.startsWith(";"));
      
      const idxM03_On = parsed.findIndex(l => l.includes("M03 S1") || l.includes("M3 S1") || l.includes("M03 S1.0") || l.includes("M03S1"));
      const idxM66 = parsed.findIndex(l => l.includes("M66 P1 L3") || l.includes("M66 P1 L3 Q5") || l.includes("M66P1"));
      const idxM03_Off = parsed.findIndex(l => l.includes("M03 S0") || l.includes("M3 S0") || l.includes("M03 S0.0") || l.includes("M03S0"));
      const idxM05_On = parsed.findIndex(l => l.includes("M05 P1") || l.includes("M5 P1") || l.includes("M05P1"));
      const idxG04 = parsed.findIndex(l => l.includes("G04 P400") || l.includes("G4 P400") || l.includes("G04P400"));
      const idxRetract = parsed.findIndex(l => (l.includes("G01") || l.includes("G00") || l.includes("G1") || l.includes("G0")) && l.includes("Z120"));
      
      if (idxM03_On === -1) return { success: false, feedback: "Conveyor motor is never activated.", advice: "Use register toggle command 'M03 S1' on the first step.", nextInstruction: "Review Chapter IV: Belt Motor Registry or physical M03 relays." };
      if (idxM66 === -1) return { success: false, feedback: "Photoelectric breakbeam condition monitor is missing.", advice: "Add 'M66 P1 L3 Q5' to yield processor execution until scan occludes.", nextInstruction: "Check Port P1 and signal transition L3 parameters." };
      if (idxM03_Off === -1) return { success: false, feedback: "Inbound conveyor belt was not stopped upon detecting the workpiece.", advice: "Deactivate motor line immediately after M66 using 'M03 S0'.", nextInstruction: "Failing to stop conveyor triggers mechanical impact alarms (E102)." };
      if (idxM05_On === -1) return { success: false, feedback: "Venturi vacuum solenoid suction generator was not enabled.", advice: "Inject command 'M05 P1' to hold the physical block.", nextInstruction: "Review Chapter IV: Solenoid Suction." };
      if (idxG04 === -1) return { success: false, feedback: "Holding dwell delay is invalid or missing.", advice: "Add G04 P400 block timer to allow system pressure to hit 0.85 bar vacuum seal.", nextInstruction: "Pressure sensors trigger E101 vacuum leak if movement begins immediately." };
      if (idxRetract === -1) return { success: false, feedback: "Vertical elevator failed to execute retract movement to Z0 zero boundary heights.", advice: "Translate tool vector smoothly upwards using 'G01 Z120 F1200'.", nextInstruction: "Ensure target coordinate maps exactly to Z120." };
      
      if (idxM66 < idxM03_On || idxM03_Off < idxM66 || idxM05_On < idxM03_Off || idxG04 < idxM05_On || idxRetract < idxG04) {
        return { success: false, feedback: "Sequence mismatch in the processor pipeline.", advice: "Re-arrange commands: 1. Start belt, 2. Wait sensor, 3. Stop belt, 4. Grip suction, 5. Dwell wait, 6. Retract heights.", nextInstruction: "Sequential registers must proceed in logical order." };
      }
      
      return { success: true, feedback: "Verification Successful! Pick sequence pipeline compiled 100% correctly.", advice: "Your script perfectly synchronizes sensor inputs with physical axes movements.", nextInstruction: "Sensors & Actuators synchronized. You are cleared for Level 3." };
    }
  },
  {
    id: 3,
    title: "Exercise 3: Macro Register Logic & Branching (Advanced)",
    description: "Write an intelligent decision routing block: Read the multi-spectral color scanning register index into local macro storage parameter slot #200 using value from analog sensor AI1 (write: #200 = AI1). Check if the value in #200 exceeds brightness intensity limit of 150. If true, execute a jump conditional branch targeting sequence mark label 150 (write: IF [#200 > 150] GOTO 150). If the jump does not occur, continue rapid seek displacement to default coordinates X=180, Z=60, immediately disengage suction vacuum cup (M05 P0) to drop non-conforming part, and terminate the sequence.",
    difficulty: "Advanced",
    linesRequired: "3 - 6 Lines",
    placeholder: "; Enter your macro decision logic here\n#200 = AI1\n...",
    hint: "Use macro variables '#200 = AI1', conditional expression 'IF [#200 > 150] GOTO 150', followed by default fallthrough commands: 'G00 X180 Z60' and shutdown solenoid 'M05 P0'.",
    verifier: (lines: string[]) => {
      const parsed = lines.map(l => l.toUpperCase().replace(/\s+/g, "").trim()).filter(l => l.length > 0 && !l.startsWith(";"));
      
      const hasMacroAssign = parsed.some(l => l.includes("#200=AI1") || l.includes("#200=AI[1]"));
      const hasIfGoto = parsed.some(l => l.includes("IF[#200>150]GOTO150") || l.includes("IF[#200GT150]GOTO150") || l.includes("IF[#200>150]GOTO150"));
      const hasG00 = parsed.some(l => (l.includes("G00") || l.includes("G01") || l.includes("G0") || l.includes("G1")) && l.includes("X180") && l.includes("Z60"));
      const hasM05 = parsed.some(l => l.includes("M05P0") || l.includes("M5P0"));
      
      if (!hasMacroAssign) return { success: false, feedback: "Macro register assignment error.", advice: "Type '#200 = AI1' to pipe optical color sensor readings into state register memory.", nextInstruction: "Review Chapter V: Macro Registers database allocation." };
      if (!hasIfGoto) return { success: false, feedback: "Conditional statement syntax invalid or missing.", advice: "Construct the expression as 'IF [#200 > 150] GOTO 150' using correct square brackets syntax.", nextInstruction: "Relational blocks require brackets around the conditional variables." };
      if (!hasG00) return { success: false, feedback: "Default drop-off coordinate G-code segment missing.", advice: "Append 'G00 X180 Z60' as a safe default fallback trajectory route.", nextInstruction: "Verify target coordinate spelling." };
      if (!hasM05) return { success: false, feedback: "Vacuum clamp release was not executed on the default path.", advice: "Trigger 'M05 P0' to close solenoid gripper valves.", nextInstruction: "Review Chapter IV: Solenoid Suction properties." };
      
      return { success: true, feedback: "Verification Successful! Advanced conditional logic registers compiled perfectly.", advice: "You have verified active closed-loop decision manufacturing logic flow.", nextInstruction: "Outstanding! All code modules verified. Ready to transmit for Certification Grading." };
    }
  }
];

export default function RightControlPanel({
  activeBoard,
  activeLanguage,
  currentCode,
  onInsertCode,
  onCollapse,
  joints,
  setJoints,
  robotDesign,
  robotType,
  simulationState,
  setSimulationState,
  sortingStats,
  setSortingStats,
  feedMode,
  setFeedMode,
  activeFile,
  onFileChange
}: RightControlPanelProps) {
  // Navigation internal tabs state
  const [activeTab, setActiveTab] = useState<"copilot" | "pendant" | "calibration" | "diagnostics" | "reference">("copilot");
  const [isManualMaximized, setIsManualMaximized] = useState(false);
  const [currentRefPart, setCurrentRefPart] = useState<string>("ALL");
  const [refSearchQuery, setRefSearchQuery] = useState("");
  const [refSubTab, setRefSubTab] = useState<"book" | "sandbox" | "quiz">("book");

  // Quiz interactive module states
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizQuestions, setQuizQuestions] = useState(QUIZ_QUESTIONS);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizShowHint, setQuizShowHint] = useState<Record<number, boolean>>({});

  const jointsAnglesKey = joints.map((j) => `${j.id}:${j.angle}:${j.length}`).join(",");
  const robotDesignKey = `${robotDesign.shoulderLength}:${robotDesign.elbowLength}:${robotDesign.wristLength}:${robotDesign.endEffectorType}:${robotDesign.payloadWeight}`;

  // Hand-Written Code Exercises States
  const [codeAnswers, setCodeAnswers] = useState<string[]>(["", "", ""]);
  const [codeResults, setCodeResults] = useState<{ success: boolean; feedback: string; advice: string; nextInstruction: string }[] | null>(null);

  // Reference interactive simulator states (Forward Kinematics Sandbox)
  const [interactiveTheta1, setInteractiveTheta1] = useState(-30);
  const [interactiveTheta2, setInteractiveTheta2] = useState(45);
  const [linkLength1, setLinkLength1] = useState(160);
  const [linkLength2, setLinkLength2] = useState(120);
  const [ikTargetX, setIkTargetX] = useState(180);
  const [ikTargetZ, setIkTargetZ] = useState(100);
  const [ikSolverError, setIkSolverError] = useState<string | null>(null);
  const [ikSolverSuccess, setIkSolverSuccess] = useState(false);

  // G-Code Generator State
  const [genCmd, setGenCmd] = useState<"G00" | "G01" | "G04" | "M03" | "M05">("G01");
  const [genX, setGenX] = useState(250);
  const [genZ, setGenZ] = useState(80);
  const [genFeed, setGenFeed] = useState(1200);
  const [genDwell, setGenDwell] = useState(500);
  const [genM05Val, setGenM05Val] = useState<"1" | "0">("1");
  const [genM03Val, setGenM03Val] = useState<"1" | "0">("1");

  // ----------------------------------------------------
  // --- 1. AI COPILOT STATE & HANDLERS ---
  // ----------------------------------------------------
  const [showAISettings, setShowAISettings] = useState(false);
  const [apiProvider, setApiProvider] = useState<"gemini" | "openrouter">(() => {
    return (localStorage.getItem("robot_ai_provider") as "gemini" | "openrouter") || "gemini";
  });
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem("robot_ai_gemini_key") || "");
  const [openrouterKey, setOpenrouterKey] = useState(() => localStorage.getItem("robot_ai_openrouter_key") || "");
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = localStorage.getItem("robot_ai_model");
    if (stored) return stored;
    return apiProvider === "openrouter" ? "openrouter/free" : "gemini-3.5-flash";
  });

  const saveSetting = (key: string, value: string) => {
    localStorage.setItem(key, value);
  };

  const handleProviderChange = (provider: "gemini" | "openrouter") => {
    setApiProvider(provider);
    saveSetting("robot_ai_provider", provider);
    const defaultModel = provider === "openrouter" ? "openrouter/free" : "gemini-3.5-flash";
    setSelectedModel(defaultModel);
    saveSetting("robot_ai_model", defaultModel);
  };

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: `🦾 **A.I. Robotic Co-pilot initialized.**\n\nI can help study mechanical kinematics, write firmware routines, evaluate stress parameters, or plan trajectories for the **${activeBoard.name}** platform in **${activeLanguage.name}**.\n\n*Quick Hint:* Tap one of the automation tasks below, or type your custom robot instruction!`
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

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
      const prov = localStorage.getItem("robot_ai_provider") || "gemini";
      const key = prov === "openrouter" 
        ? localStorage.getItem("robot_ai_openrouter_key") || ""
        : localStorage.getItem("robot_ai_gemini_key") || "";
      const model = localStorage.getItem("robot_ai_model") || (prov === "openrouter" ? "openrouter/free" : "gemini-3.5-flash");

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
      } catch (jsonErr) {}

      if (!response.ok) {
        throw new Error(data?.error || `Request failed with status ${response.status}: Failed communicating with proxy.`);
      }

      setMessages((prev) => [...prev, { role: "assistant", text: data?.text || "No insights found." }]);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to reach AI. Confirm Gemini is integrated.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoInsert = (textBlock: string) => {
    const codeBlocks = textBlock.match(/```(?:gcode|arduino|cpp|python|cim_script)?([\s\S]*?)```/);
    if (codeBlocks && codeBlocks[1]) {
      onInsertCode(codeBlocks[1].trim());
    } else {
      onInsertCode(textBlock);
    }
  };

  // ----------------------------------------------------
  // --- 2. JOG & PENDANT STATES ---
  // ----------------------------------------------------
  const [jogMode, setJogMode] = useState<"JOINT" | "CARTESIAN">("CARTESIAN");
  const [jogStepSize, setJogStepSize] = useState<number>(10);
  const [cmdMode, setCmdMode] = useState<"G01" | "G00" | "M05" | "M03" | "G04">("G01");
  const [suctionState, setSuctionState] = useState<boolean>(false);
  const [conveyorState, setConveyorState] = useState<boolean>(false);
  const [dwellMs, setDwellMs] = useState<number>(500);
  const [feedrate, setFeedrate] = useState<number>(1200);

  // Origins for calculations
  const baseX = 300;
  const baseY = 230; // Matches raised platform!

  // FK point calculations for DRO readouts
  const displayJoints = joints;
  const points = calculateForwardKinematics(baseX, baseY, displayJoints);
  const endEffector = points[points.length - 1];

  const cartesianX = Math.round((endEffector.x - baseX) * 1.5);
  const cartesianY = Math.round((baseY - endEffector.y) * 1.5);

  const resolveKinematicsForPoint = (tx: number, ty: number) => {
    const lShoulder = robotDesign.shoulderLength;
    const lElbow = robotDesign.elbowLength;
    const lWrist = robotDesign.wristLength;
    const totalMaxReach = lShoulder + lElbow + lWrist;

    let targetX = tx;
    let targetY = ty;
    const distToClick = Math.hypot(targetX - baseX, targetY - baseY);

    if (distToClick > totalMaxReach) {
      const ratio = totalMaxReach / distToClick;
      targetX = baseX + (targetX - baseX) * ratio * 0.98;
      targetY = baseY + (targetY - baseY) * ratio * 0.98;
    }

    const solved = solveInverseKinematics(baseX, baseY, joints, { x: targetX, y: targetY });
    setJoints(solved);
  };

  const jogAxis = (axisId: string, dir: number) => {
    const step = jogStepSize * dir;
    if (jogMode === "JOINT") {
      setJoints((prev) =>
        prev.map((j) => {
          if (j.id === axisId) {
            let nAngle = j.angle + step;
            nAngle = Math.max(j.minAngle, Math.min(j.maxAngle, nAngle));
            return { ...j, angle: Math.round(nAngle * 10) / 10 };
          }
          return j;
        })
      );
    } else {
      let curX = endEffector.x;
      let curY = endEffector.y;

      if (axisId === "X") {
        curX += step / 1.5;
      } else if (axisId === "Z") {
        curY -= step / 1.5;
      } else if (axisId === "B") {
        setJoints((prev) =>
          prev.map((j) => {
            if (j.id === "base") {
              let n = j.angle + step;
              n = Math.max(j.minAngle, Math.min(j.maxAngle, n));
              return { ...j, angle: Math.round(n * 10) / 10 };
            }
            return j;
          })
        );
        return;
      } else if (axisId === "A") {
        setJoints((prev) =>
          prev.map((j) => {
            if (j.id === "wrist") {
              let n = j.angle + step;
              n = Math.max(j.minAngle, Math.min(j.maxAngle, n));
              return { ...j, angle: Math.round(n * 10) / 10 };
            }
            return j;
          })
        );
        return;
      }
      resolveKinematicsForPoint(curX, curY);
    }
  };

  // Keyboard Event Handlers for Manual Axes Jogging and Framing Toggles
  useEffect(() => {
    const handleJogKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.hasAttribute("contenteditable") ||
        activeEl.classList.contains("cm-content") ||
        activeEl.closest(".cm-editor") || 
        activeEl.tagName === "SELECT"
      );
      if (isTyping) return;

      const key = e.key.toLowerCase();

      // 'm' - Switch Jog mode frame mapping
      if (key === 'm') {
        e.preventDefault();
        setJogMode((prev) => (prev === "CARTESIAN" ? "JOINT" : "CARTESIAN"));
        return;
      }

      // '[' and ']' adjustments of micro steps increments
      if (e.key === '[') {
        e.preventDefault();
        setJogStepSize((prev) => {
          if (prev <= 1) return 1;
          if (prev <= 10) return 1;
          if (prev <= 50) return 10;
          return 50;
        });
        return;
      }
      if (e.key === ']') {
        e.preventDefault();
        setJogStepSize((prev) => {
          if (prev >= 100) return 100;
          if (prev >= 50) return 100;
          if (prev >= 10) return 50;
          return 10;
        });
        return;
      }

      // Only listen to direct directions overrides when pendant tab is active!
      if (activeTab !== "pendant") return;

      if (jogMode === "CARTESIAN") {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            jogAxis("X", -1);
            break;
          case "ArrowRight":
            e.preventDefault();
            jogAxis("X", 1);
            break;
          case "ArrowUp":
            e.preventDefault();
            jogAxis("Z", 1);
            break;
          case "ArrowDown":
            e.preventDefault();
            jogAxis("Z", -1);
            break;
          case "a":
          case "A":
            e.preventDefault();
            jogAxis("B", -1);
            break;
          case "d":
          case "D":
            e.preventDefault();
            jogAxis("B", 1);
            break;
          case "w":
          case "W":
            e.preventDefault();
            jogAxis("A", 1);
            break;
          case "s":
          case "S":
            e.preventDefault();
            jogAxis("A", -1);
            break;
          default:
            break;
        }
      } else {
        // JOINT Space keys
        switch (e.key) {
          case "1":
            e.preventDefault();
            jogAxis("base", -1);
            break;
          case "2":
            e.preventDefault();
            jogAxis("base", 1);
            break;
          case "3":
            e.preventDefault();
            jogAxis("shoulder", -1);
            break;
          case "4":
            e.preventDefault();
            jogAxis("shoulder", 1);
            break;
          case "5":
            e.preventDefault();
            jogAxis("elbow", -1);
            break;
          case "6":
            e.preventDefault();
            jogAxis("elbow", 1);
            break;
          case "7":
            e.preventDefault();
            jogAxis("wrist", -1);
            break;
          case "8":
            e.preventDefault();
            jogAxis("wrist", 1);
            break;
          case "9":
            e.preventDefault();
            jogAxis("effector", -1);
            break;
          case "0":
            e.preventDefault();
            jogAxis("effector", 1);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleJogKeyDown);
    return () => {
      window.removeEventListener("keydown", handleJogKeyDown);
    };
  }, [jogMode, jogStepSize, activeTab, jointsAnglesKey, robotDesignKey]);

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
    } else if (cmdMode === "M05") {
      if (fileLang === "gcode") {
        return `M05 P${suctionState ? 1 : 0}`;
      } else if (fileLang === "arduino") {
        return `digitalWrite(3, ${suctionState ? "HIGH" : "LOW"}); // Actuate Vacuum Solenoid`;
      } else if (fileLang === "cim_script") {
        return suctionState ? "ENGAGE_GRIPPER()" : "RELEASE_GRIPPER()";
      } else {
        return `suction_solenoid(${suctionState ? "True" : "False"})`;
      }
    } else if (cmdMode === "G04") {
      if (fileLang === "gcode") {
        return `G04 P${dwellMs}`;
      } else if (fileLang === "arduino") {
        return `delay(${dwellMs});`;
      } else if (fileLang === "cim_script") {
        return `WAIT ${dwellMs}`;
      } else {
        return `time.sleep(${dwellMs / 1000})`;
      }
    } else {
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
  };

  const handleTeachCurrent = () => {
    const rawPreview = getCommandPreview();
    onInsertCode(rawPreview + "\n");
  };

  // ----------------------------------------------------
  // --- 3. PARAMETERS CALIBRATION REGISTERS ---
  // ----------------------------------------------------
  const calibrationRegisters = [
    {
      varName: "#122",
      name: "Conveyor Pick Intercept X",
      default: -250,
      desc: "X landing target on conveyor belt",
    },
    {
      varName: "#123",
      name: "Conveyor Pick Intercept Y",
      default: 140,
      desc: "Y height coordinate on conveyor bed",
    },
    {
      varName: "#120",
      name: "Tray Red Center X",
      default: 235,
      desc: "Red deposit center coordinate",
    },
    {
      varName: "#121",
      name: "Tray Yellow Center X",
      default: 295,
      desc: "Yellow deposit center coordinate",
    },
    {
      varName: "#124",
      name: "Dwell Pick Hold Delay Ms",
      default: 450,
      desc: "Stabilization time of the suction pad",
    },
    {
      varName: "#125",
      name: "Drop Landing Alt Z",
      default: 55,
      desc: "Low Z coordinate inside collection trays",
    },
  ];

  const parseVariableFromGcode = (varName: string, defaultValue: number): number => {
    if (!activeFile) return defaultValue;
    const lines = activeFile.content.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(varName)) {
        const parts = trimmed.split("=");
        if (parts.length >= 2) {
          const valPart = parts[1].split(";")[0].split("(")[0].trim();
          const val = parseFloat(valPart);
          if (!isNaN(val)) return val;
        }
      }
    }
    return defaultValue;
  };

  const updateGcodeVariable = (varName: string, newValue: number) => {
    if (!activeFile || !onFileChange) return;
    const lines = activeFile.content.split("\n");
    let replaced = false;
    const nextLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith(varName)) {
        const parts = line.split("=");
        if (parts.length >= 2) {
          replaced = true;
          const commentPart = parts[1].includes(";")
            ? " ;" + parts[1].split(";").slice(1).join(";")
            : "";
          return `${varName} = ${newValue}${commentPart}`;
        }
      }
      return line;
    });

    if (!replaced) {
      nextLines.unshift(`${varName} = ${newValue} ; Calibrated Param`);
    }
    onFileChange(nextLines.join("\n"));
  };

  // ----------------------------------------------------
  // --- 4. DIAGNOSTICS & TELEMETRY ---
  // ----------------------------------------------------
  const [velocityHistory, setVelocityHistory] = useState<number[]>(new Array(40).fill(0));
  const prevJointsRef = useRef(joints);

  useEffect(() => {
    const delta = joints.reduce((sum, j, idx) => {
      const prevJ = prevJointsRef.current[idx];
      return sum + Math.abs(j.angle - (prevJ ? prevJ.angle : j.angle));
    }, 0);
    prevJointsRef.current = joints;

    setVelocityHistory((prev) => {
      if (delta === 0 && prev[prev.length - 1] === 0) {
        return prev;
      }
      const next = [...prev.slice(1), delta];
      return next;
    });
  }, [jointsAnglesKey]);

  const jointTorques = joints.map((j, idx) => {
    const baseTorque = idx === 0 ? 3.5 : idx === 1 ? 6.8 : idx === 2 ? 4.2 : 1.5;
    const loadFactor = Math.abs(Math.sin((j.angle * Math.PI) / 180));
    const torque = baseTorque * (1.0 + loadFactor * 0.85);
    return Math.round(torque * 10) / 10;
  });

  const aggregatePowerW = Math.round(
    jointTorques.reduce((sum, val) => sum + val * 4.5, 0)
  );

  const getSystemStatusTier = (activeErrCount: number) => {
    if (activeErrCount === 0) {
      return { 
        name: "NOMINAL STATUS CHECK", 
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        desc: "All physical joint links, actuators, and pneumatic systems are fully operational."
      };
    }
    return {
      name: "DEGRADED TELEMETRY", 
      color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      desc: "One or more safety components report exceptions. Resolve in code console."
    };
  };

  // ----------------------------------------------------
  // --- 5. ENHANCED REFERENCE MANUAL LISTINGS ---
  // ----------------------------------------------------
  const errorDatabase = [
    {
      code: "E101",
      name: "Gripper Vacuum Leak",
      cause: "Pneumatic suction seal failed to exceed 85% safety vacuum threshold within 450ms.",
      action: "Check suction cup gasket integrity and verify workpiece alignment intercept parameters (#122/#123)."
    },
    {
      code: "E102",
      name: "Axis Joint Limits Collision",
      cause: "Servo target exceeded physical axis coordinates. J2 reached limit boundary.",
      action: "Review inverse kinematics constraints or adjust physical variables in G-code block. Decelerate carriage."
    },
    {
      code: "E103",
      name: "Syntax Compiler Fault",
      cause: "Loaded firmware block contains unresolvable commands or illegal decimals.",
      action: "Ensure correct dialect (G-code, Arduino, Python) is matching compile settings in dropdown."
    },
    {
      code: "E104",
      name: "Photoelectric Sensor Timeout",
      cause: "Workspace optical sensor beam remains interrupted longer than conveyor belt index sequence.",
      action: "Clean photo eye or lower conveyor motor speed rate parameter. Adjust sensor offset position X."
    },
    {
      code: "E105",
      name: "Thermal Joint Stress Alarm",
      cause: "Joint torque exceeded 12.0 N·m rating continuously during rapid trajectory movement.",
      action: "Adopt logarithmic acceleration ramping profiles. Reduce linear feedrate limit F1250 below F1000."
    },
    {
      code: "E106",
      name: "Dh-Parameter Matrix Parity",
      cause: "Denavit-Hartenberg coordinate linkage transformation matrix determinant is singular.",
      action: "Avoid singularity positions directly overhead. Avoid absolute collinear orientation of links 1 & 2."
    }
  ];

  const codeSnippetsDatabase = [
    {
      title: "G-Code Sorting Routine",
      lang: "gcode",
      content: `; Pick and place routine
G00 X-250 Z140 A0 B0 ; Move to pick intercept
M05 P1 ; Vacuum suction pad ENGAGE
G04 P450 ; Dwell for pressure stabilization
G01 X-250 Z20 ; Lift up workpiece
G00 X235 Z55 ; Rapid move to tray red
M05 P0 ; Vacuum suction pad RELEASE
G04 P200 ; Dwell for release`
    },
    {
      title: "Arduino Joint Sweeper",
      lang: "arduino",
      content: `// Fine trajectory sweep
void sweepJoint(int pin, int start, int end) {
  for (int pos = start; pos <= end; pos += 1) {
    servo.write(pos);
    delay(15); // Wait for mechanical response
  }
}`
    },
    {
      title: "Python Coordinate Intercept",
      lang: "python",
      content: `# Velocity profile calculator
def calculate_ramp(distance, feedrate):
    accel_time = feedrate / 60.0 / 20.0 # ACCEL
    flat_time = distance / (feedrate / 60.0)
    return accel_time * 2 + flat_time`
    }
  ];

  // --- Kinematic Sandbox Live Mathematical Calculations ---
  const sandboxTh1Rad = (interactiveTheta1 * Math.PI) / 180;
  const sandboxTh2Rad = ((interactiveTheta1 + interactiveTheta2) * Math.PI) / 180;

  const sandboxX1 = linkLength1 * Math.cos(sandboxTh1Rad);
  const sandboxZ1 = linkLength1 * Math.sin(sandboxTh1Rad);

  const sandboxX2 = sandboxX1 + linkLength2 * Math.cos(sandboxTh2Rad);
  const sandboxZ2 = sandboxZ1 + linkLength2 * Math.sin(sandboxTh2Rad);

  const sandboxJacobianDeterminant = linkLength1 * linkLength2 * Math.sin((interactiveTheta2 * Math.PI) / 180);
  const sandboxIsSingular = Math.abs(sandboxJacobianDeterminant) < 1500;

  return (
    <div id="right-control-panel-deck" className="bg-[#1a1a1e] border border-white/5 rounded overflow-hidden flex flex-col h-full shadow-2xl relative">
      
      {/* Tab bar header switcher */}
      <div className="flex bg-[#121215] border-b border-white/5 shrink-0 overflow-x-auto scrollbar-none select-none">
        {[
          { id: "copilot", label: "Copilot", icon: Sparkles, color: "text-cyan-400 hover:text-cyan-300" },
          { id: "pendant", label: "Pendant", icon: Sliders, color: "text-rose-400 hover:text-rose-350" },
          { id: "calibration", label: "Calibration", icon: Settings, color: "text-amber-500 hover:text-amber-450" },
          { id: "diagnostics", label: "Diagnostics", icon: Activity, color: "text-blue-400 hover:text-blue-350" },
          { id: "reference", label: "Manual", icon: BookOpen, color: "text-indigo-400 hover:text-indigo-350" }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-4 px-3 border-b-2 font-mono text-[10px] uppercase font-bold tracking-wider transition-all duration-150 cursor-pointer text-center outline-none shrink-0 ${
                isActive
                  ? "border-blue-500 text-white bg-[#1a1a1e] shadow-inner"
                  : "border-transparent text-slate-500 hover:text-slate-350 hover:bg-white/5"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : "text-slate-500"}`} />
              <span className="hidden leading-none xl:inline">{tab.label}</span>
            </button>
          );
        })}

        {onCollapse && (
          <button
            onClick={onCollapse}
            title="Collapse Right Deck"
            className="text-slate-600 hover:text-rose-400 transition-colors p-3 hover:bg-white/5 border-l border-white/5 cursor-pointer ml-auto shrink-0 flex items-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. TAB CORE CONTENT (Scrollable with rich padding & margins) */}
      <div className="flex-1 overflow-y-auto bg-[#0d0d0f] scrollbar-thin scrollbar-thumb-white/10 p-4.5 space-y-4">

        {/* ==================================== */}
        {/* === TAB A: CO-PILOT CHAT INTERFACE === */}
        {/* ==================================== */}
        {activeTab === "copilot" && (
          <div className="flex flex-col h-full space-y-4">
            
            {/* Context bar with calibration setting access */}
            <div className="flex items-center justify-between bg-[#151518] border border-white/5 p-3 rounded-lg relative overflow-hidden select-none shadow">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="font-mono text-[9.5px] font-bold text-slate-300 uppercase tracking-tight">
                  {apiProvider === "openrouter" ? "OpenRouter Copilot Portal" : "Gemini Intelligent Agent v3"}
                </span>
              </div>
              <button
                onClick={() => setShowAISettings(!showAISettings)}
                className={`p-1.5 rounded cursor-pointer border transition-all text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  showAISettings 
                    ? "text-cyan-400 border-cyan-500/20 bg-cyan-500/10" 
                    : "text-slate-500 hover:text-slate-200 border-white/5 hover:border-white/10"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Adjust</span>
              </button>
            </div>

            {/* AI Config expander */}
            {showAISettings && (
              <div className="bg-[#141417] border border-white/5 rounded-lg p-3.5 space-y-3 font-mono text-[10px] text-slate-300 select-none shadow-md">
                <div className="flex justify-between items-center border-b border-white/5 pb-1 select-none">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                    🛠️ LLM Calibration Panel
                  </span>
                </div>

                <div className="space-y-1">
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

                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-slate-500 block">Active Model Variant</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      saveSetting("robot_ai_model", e.target.value);
                    }}
                    className="w-full bg-[#0d0d0f] border border-white/5 rounded px-2.5 py-1.5 text-[10.5px] text-slate-200 focus:outline-none focus:border-blue-500/30 cursor-pointer font-mono"
                  >
                    {apiProvider === "gemini" ? (
                      <>
                        <option value="gemini-3.5-flash" className="bg-[#141417] text-slate-200">gemini-3.5-flash (Fast & Accurate - Default)</option>
                        <option value="gemini-3.1-flash-lite" className="bg-[#141417] text-slate-200">gemini-3.1-flash-lite (Cost Efficient)</option>
                        <option value="gemini-2.5-flash" className="bg-[#141417] text-slate-200">gemini-2.5-flash (Standard)</option>
                        <option value="gemini-2.5-pro" className="bg-[#141417] text-slate-200">gemini-2.5-pro (Creative Reasoning)</option>
                      </>
                    ) : (
                      <>
                        <option value="openrouter/free" className="bg-[#141417] text-slate-200">openrouter/free (Auto-Free Model Routing)</option>
                        <option value="google/gemini-2.5-flash" className="bg-[#141417] text-slate-200">google/gemini-2.5-flash (Gemini 2.5 Flash)</option>
                        <option value="google/gemini-2.5-pro" className="bg-[#141417] text-slate-200">google/gemini-2.5-pro (Gemini 2.5 Pro)</option>
                        <option value="deepseek/deepseek-r1" className="bg-[#141417] text-slate-200">deepseek/deepseek-r1 (DeepSeek R1 Reasoning)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[8px] block">
                    <label className="font-bold uppercase tracking-wider text-slate-500">
                      {apiProvider === "gemini" ? "Custom Gemini API Key" : "Custom OpenRouter Secret Token"}
                    </label>
                    {(apiProvider === "gemini" ? geminiKey : openrouterKey) ? (
                      <span className="text-emerald-400 font-bold text-[7.5px] tracking-wider uppercase">● Locally Configured</span>
                    ) : (
                      <span className="text-amber-500 font-bold text-[7.5px] tracking-wider uppercase">○ Using Server Key</span>
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
                    placeholder="Leave blank to fallback to system credentials..."
                    className="w-full bg-[#0d0d0f] border border-white/5 rounded px-2.5 py-1.5 text-[9.5px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/30 font-mono select-text"
                  />
                </div>
              </div>
            )}

            {/* Chat Messages Frame */}
            <div className="flex-1 bg-[#09090b] border border-white/5 rounded-lg p-3 space-y-3.5 min-h-[200px] flex flex-col justify-end">
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col space-y-1.5 p-3 rounded-lg border max-w-[94%] shadow-sm ${
                      m.role === "user"
                        ? "bg-blue-600/10 border-blue-500/20 self-end ml-auto text-blue-100"
                        : "bg-[#121215]/90 border-white/5 self-start mr-auto text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-1 border-b border-white/5 pb-1 select-none">
                      <span className="text-[8px] font-mono tracking-wider font-bold uppercase opacity-35">
                        {m.role === "user" ? "USER CLIENT" : "CO-PILOT AI ENGINE"}
                      </span>
                    </div>

                    <div className="markdown-body text-[11px] font-sans leading-relaxed tracking-normal select-text prose prose-invert prose-xs">
                      <Markdown>{m.text}</Markdown>
                    </div>

                    {m.role === "assistant" && m.text.includes("```") && (
                      <button
                        onClick={() => handleAutoInsert(m.text)}
                        className="mt-2.5 self-start inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-[10px] font-mono border border-blue-700 transition-colors cursor-pointer font-bold"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Inject Script Code</span>
                      </button>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center space-x-2.5 p-3 bg-[#121215]/50 border border-white/5 rounded-lg self-start mr-auto max-w-[85%]">
                    <Cpu className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="text-[10px] font-mono text-slate-400 animate-pulse font-bold uppercase">Trajectory Planner Compiling...</span>
                  </div>
                )}

                {errorText && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start space-x-2 text-rose-300 text-[11px] font-mono">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
                    <div>
                      <p className="font-bold text-rose-200">Execution Fail:</p>
                      <p className="text-[10px] text-rose-400 leading-normal mt-0.5">{errorText}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick automation Task blocks */}
            <div className="space-y-2">
              <div className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider block">
                💡 Quick Trajectory Automation ({activeBoard.category})
              </div>
              <div className="flex flex-wrap gap-1.5 select-none">
                {activePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="text-[9px] font-mono bg-[#141417] hover:bg-[#1a1a1f] border border-white/5 text-slate-400 hover:text-white px-2.5 py-1 rounded transition-colors text-left font-medium cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => handleSendMessage(`Analyze program contents:\n\n${currentCode}`)}
                  className="text-[9px] font-mono bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:text-white hover:bg-blue-600/20 px-2.5 py-1 rounded transition-colors cursor-pointer font-bold"
                >
                  🔍 Auto-Analyze Script
                </button>
              </div>
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex items-center bg-[#121215] border border-white/5 rounded-lg p-1.5"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Ask Copilot... (${activeLanguage.name})`}
                className="flex-1 bg-transparent border-none text-slate-200 focus:outline-none px-3 py-1.5 text-[11.5px] font-mono placeholder-slate-700 select-text"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-550 text-white disabled:opacity-40 rounded transition-colors cursor-pointer shrink-0 ml-1.5"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* ==================================== */}
        {/* === TAB B: TEACH PENDANT INTERFACE === */}
        {/* ==================================== */}
        {activeTab === "pendant" && (
          <div className="space-y-4 font-mono select-none">
            
            {/* Title Block with status bar */}
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>Manual Teach Pendant Console</span>
                </h3>
                <span className="text-[7.5px] text-slate-500 block uppercase tracking-wide">
                  Direct hardware joints injection & coordinates validation
                </span>
              </div>
              <span className="text-[7.5px] px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded uppercase font-bold tracking-widest animate-pulse">
                Pendant-Engaged
              </span>
            </div>

            {/* Digital Readout Screen (DRO) */}
            <div className="bg-[#121b15] border border-emerald-500/10 p-3.5 rounded-lg relative shadow-[inset_0_2px_12px_rgba(16,185,129,0.06)]">
              <div className="absolute top-2 right-2.5 flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[7.5px] text-emerald-500 font-bold tracking-widest uppercase">
                  Telemetry DRO (1.5x Multiplier)
                </span>
              </div>
              <h4 className="text-[9.5px] font-bold text-emerald-400 uppercase mb-3 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-emerald-500 animate-spin-slow" />
                <span>Live coordinates feedback</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                {/* TOOL CENTER POINT */}
                <div className="bg-[#0b1310] rounded border border-emerald-500/10 p-2.5 space-y-1">
                  <span className="text-[7.5px] text-emerald-500/70 font-bold tracking-wider block uppercase">
                    Tool Center Point (TCP)
                  </span>
                  <div className="grid grid-cols-2 text-[11px] font-bold text-emerald-300">
                    <div>
                      X: <span className="bg-emerald-950/80 px-1 py-0.5 rounded ml-0.5">{cartesianX} mm</span>
                    </div>
                    <div>
                      Z: <span className="bg-emerald-950/80 px-1 py-0.5 rounded ml-0.5">{cartesianY} mm</span>
                    </div>
                  </div>
                </div>

                {/* JOINT ANGLES READOUT */}
                <div className="bg-[#0b1310] rounded border border-emerald-500/10 p-2.5 space-y-1">
                  <span className="text-[7.5px] text-emerald-500/70 font-bold tracking-wider block uppercase">
                    Joint Coordinate Space
                  </span>
                  <div className="grid grid-cols-2 gap-x-1.5 text-[9px] text-emerald-400 font-bold">
                    <div>B: <span className="text-emerald-200">{Math.round(joints[0].angle)}°</span></div>
                    <div>J1: <span className="text-emerald-200">{Math.round(joints[1].angle)}°</span></div>
                    <div>J2: <span className="text-emerald-200">{Math.round(joints[2].angle)}°</span></div>
                    <div>J3: <span className="text-emerald-200">{Math.round(joints[3].angle)}°</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Jog settings */}
            <div className="grid grid-cols-2 gap-3.5 bg-[#141417] p-3 rounded-lg border border-white/5">
              <div>
                <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                  Jog Frame Standard
                </label>
                <div className="flex bg-[#0d0d0f] p-0.5 rounded border border-white/5">
                  {(["CARTESIAN", "JOINT"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setJogMode(mode)}
                      className={`flex-1 text-[9px] py-1 rounded transition-all uppercase cursor-pointer ${
                        jogMode === mode
                          ? "bg-rose-600 text-white font-bold shadow-md"
                          : "text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">
                  Step Increment Scale
                </label>
                <div className="flex bg-[#0d0d0f] p-0.5 rounded border border-white/5">
                  {([1, 5, 10, 25] as const).map((stepVal) => (
                    <button
                      key={stepVal}
                      onClick={() => setJogStepSize(stepVal)}
                      className={`flex-1 text-[9px] py-1 rounded transition-colors font-bold cursor-pointer ${
                        jogStepSize === stepVal
                          ? "bg-rose-600 text-white"
                          : "text-slate-500 hover:text-slate-200"
                      }`}
                    >
                      {stepVal}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Micro-alignment angle sliders nested here with space! */}
            <div className="bg-[#141417] p-3 rounded-lg border border-white/5 space-y-3">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide block">
                Manual Joint micro-alignment sliders
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-1">
                {joints.slice(1).map((joint) => (
                  <div key={joint.id} className="space-y-1">
                    <div className="flex justify-between text-[9.5px]">
                      <span className="text-slate-400 font-semibold uppercase">{joint.name}</span>
                      <span className="text-blue-400 font-bold">{joint.angle}°</span>
                    </div>
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
                      className="w-full h-1 bg-[#09090b] rounded appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[6.5px] text-slate-600 font-mono">
                      <span>{joint.minAngle}°</span>
                      <span>{joint.maxAngle}°</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

             {/* Direct coordinate jogging switches (Jog Jaws) */}
            <div className="bg-[#141417] p-3 rounded-lg border border-white/5 space-y-3 select-none">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide block">
                  Active {jogMode} axes jogging buttons
                </span>
                <span className="text-[7px] font-mono text-slate-500 uppercase">Interactive Pendant Live</span>
              </div>

              {jogMode === "CARTESIAN" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <span className="text-[7.5px] text-slate-505 block uppercase text-center font-bold">X-Axis Linear</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => jogAxis("X", -1)} className="flex-1 bg-[#1c1c22] hover:bg-rose-950/40 border border-white/5 py-2 rounded text-[10.5px] font-bold uppercase transition-colors cursor-pointer text-slate-350 hover:text-rose-400 hover:border-rose-500/20 text-center flex flex-col items-center justify-center">
                          <span>X- Jog ({jogStepSize})</span>
                          <span className="text-[6.5px] font-mono text-slate-500 font-medium">KEY [←]</span>
                        </button>
                        <button onClick={() => jogAxis("X", 1)} className="flex-1 bg-[#1c1c22] hover:bg-[#1f2937]/40 border border-white/5 py-2 rounded text-[10.5px] font-bold uppercase transition-colors cursor-pointer text-slate-350 hover:text-blue-400 hover:border-blue-500/20 text-center flex flex-col items-center justify-center">
                          <span>X+ Jog ({jogStepSize})</span>
                          <span className="text-[6.5px] font-mono text-slate-500 font-medium">KEY [→]</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[7.5px] text-slate-505 block uppercase text-center font-bold">Z-Axis Plunge</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => jogAxis("Z", -1)} className="flex-1 bg-[#1c1c22] hover:bg-rose-950/40 border border-[#2b1717] py-2 rounded text-[10.5px] font-bold uppercase transition-colors cursor-pointer text-slate-350 hover:text-rose-400 hover:border-rose-500/20 text-center flex flex-col items-center justify-center">
                          <span>Z- Jog ({jogStepSize})</span>
                          <span className="text-[6.5px] font-mono text-slate-500 font-medium">KEY [↓]</span>
                        </button>
                        <button onClick={() => jogAxis("Z", 1)} className="flex-1 bg-[#1c1c22] hover:bg-[#1f2937]/40 border border-[#1e293b] py-2 rounded text-[10.5px] font-bold uppercase transition-colors cursor-pointer text-slate-350 hover:text-blue-400 hover:border-blue-500/20 text-center flex flex-col items-center justify-center">
                          <span>Z+ Jog ({jogStepSize})</span>
                          <span className="text-[6.5px] font-mono text-slate-500 font-medium">KEY [↑]</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rotary linear joint keys helper */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/20 border border-white/5 rounded text-[7.2px] text-slate-400 font-mono">
                    <div className="flex justify-between px-1">
                      <span>Base Spin:</span>
                      <span className="text-cyan-400 font-black">[A] / [D]</span>
                    </div>
                    <div className="flex justify-between px-1">
                      <span>Wrist Pitch:</span>
                      <span className="text-cyan-400 font-black">[W] / [S]</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {joints.map((j, index) => {
                    // Match indexing keys: base is index 0 -> Keys '1' & '2', etc.
                    const keyMinus = index * 2 + 1;
                    const keyPlus = (index * 2 + 2) % 10;
                    return (
                      <div key={j.id} className="space-y-1.5 bg-black/20 p-2 rounded border border-white/5">
                        <span className="text-[7.5px] text-slate-400 block uppercase tracking-tight font-semibold">{j.name} Joint</span>
                        <div className="flex gap-1">
                          <button onClick={() => jogAxis(j.id, -1)} className="flex-1 bg-[#1c1c22] text-slate-300 hover:bg-[#282830] hover:text-white border border-white/5 py-1 rounded text-[9px] font-semibold tracking-tighter cursor-pointer flex flex-col items-center justify-center">
                            <span>Minus (-)</span>
                            <span className="text-[6.2px] font-mono text-slate-500">KEY [{keyMinus}]</span>
                          </button>
                          <button onClick={() => jogAxis(j.id, 1)} className="flex-1 bg-[#1c1c22] text-slate-300 hover:bg-[#282830] hover:text-white border border-white/5 py-1 rounded text-[9px] font-semibold tracking-tighter cursor-pointer flex flex-col items-center justify-center">
                            <span>Plus (+)</span>
                            <span className="text-[6.2px] font-mono text-slate-500">KEY [{keyPlus}]</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dynamic pendant configuration hotkeys cheatsheet */}
              <div className="flex flex-wrap gap-2.5 pt-1.5 border-t border-white/5 items-center justify-between text-[7px] font-mono text-slate-500 uppercase select-none">
                <div className="flex items-center gap-1">
                  <span className="bg-black/30 border border-white/5 px-1.5 py-0.5 rounded text-cyan-400 font-bold">M</span>
                  <span>Change Frame Mode</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="bg-black/30 border border-white/5 px-1.5 py-0.5 rounded text-cyan-400 font-bold">[</span>
                  <span className="bg-black/30 border border-white/5 px-1.5 py-0.5 rounded text-cyan-400 font-bold">]</span>
                  <span>Scale Increment</span>
                </div>
              </div>
            </div>

            {/* Code Generator & Snippet Injector */}
            <div className="bg-[#141417] p-3 rounded-lg border border-white/5 space-y-2.5 flex flex-col">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide block">
                Compile & Inject commands into open files
              </span>

              <div className="grid grid-cols-5 gap-1 bg-[#0d0d0f] p-0.5 rounded border border-white/5 select-none">
                {(["G01", "G00", "M05", "G04", "M03"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCmdMode(mode)}
                    className={`text-[8.5px] py-1 rounded font-bold uppercase cursor-pointer ${
                      cmdMode === mode
                        ? "bg-rose-600 text-white"
                        : "text-slate-500 hover:text-slate-200"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Conditional options details inside pendant drawer */}
              {cmdMode === "G01" || cmdMode === "G00" ? (
                <div className="flex items-center justify-between gap-3 text-[9px]">
                  <span className="text-slate-500">Linear Feedrate F:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={feedrate}
                      onChange={(e) => setFeedrate(Math.max(100, parseInt(e.target.value) || 1200))}
                      className="bg-[#09090b] border border-white/5 rounded px-2 py-0.5 text-[9px] text-blue-400 font-bold w-16 text-center select-text font-mono"
                    />
                    <span className="text-slate-650">mm/min</span>
                  </div>
                </div>
              ) : cmdMode === "M05" ? (
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500">Pneumatic Solenoid State:</span>
                  <button
                    onClick={() => setSuctionState(!suctionState)}
                    className={`px-3 py-1 text-[8.5px] font-bold rounded uppercase cursor-pointer border ${
                      suctionState ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20" : "bg-[#0c0c0e] hover:bg-[#141417] text-slate-400 border-white/5"
                    }`}
                  >
                    {suctionState ? "ACTIVE (VACUUM ON)" : "SAFE (VACUUM OFF)"}
                  </button>
                </div>
              ) : cmdMode === "G04" ? (
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500">Dwell duration P:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      value={dwellMs}
                      onChange={(e) => setDwellMs(Math.max(50, parseInt(e.target.value) || 500))}
                      className="bg-[#09090b] border border-white/5 rounded px-2 py-0.5 text-[9px] text-blue-400 font-bold w-16 text-center select-text font-mono"
                    />
                    <span className="text-slate-650">ms</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-500">Conveyor motor S:</span>
                  <button
                    onClick={() => setConveyorState(!conveyorState)}
                    className={`px-3 py-1 text-[8.5px] font-bold rounded uppercase cursor-pointer border ${
                      conveyorState ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20 animate-pulse" : "bg-[#0c0c0e] hover:bg-[#141417] text-slate-400 border-white/5"
                    }`}
                  >
                    {conveyorState ? "MOTOR SPINNING ON" : "MOTOR HALTED OFF"}
                  </button>
                </div>
              )}

              {/* Injected terminal command preview */}
              <div className="bg-[#0d0d0f] rounded border border-white/5 p-2 flex flex-col space-y-1 select-all relative group font-mono">
                <span className="text-[6.5px] text-slate-650 tracking-wider font-bold block uppercase leading-none select-none">Preview Block Injection Output</span>
                <span className="text-[9.5px] text-pink-400 font-bold tracking-tight select-all leading-tight">
                  {getCommandPreview()}
                </span>
              </div>

              <button
                onClick={handleTeachCurrent}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[10px] tracking-wide uppercase transition-all shadow-[0_2px_10px_rgba(225,29,72,0.15)] flex items-center justify-center space-x-2 cursor-pointer mt-1"
              >
                <span>➕ Teach / Insert Instruction Point</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* === TAB C: PARAMETERS CALIBRATION === */}
        {/* ==================================== */}
        {activeTab === "calibration" && (
          <div className="space-y-4 font-mono select-none">
            
            {/* Title Block */}
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-amber-500" />
                <span>Active Variables & Calibration Registry</span>
              </h3>
              <span className="text-[7.5px] text-slate-500 block uppercase tracking-wide">
                Dynamically read & recalibrate intercept markers inside G-code templates
              </span>
            </div>

            <div className="text-[9px] text-slate-400 leading-normal bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg">
              <span className="text-amber-500 font-bold block uppercase mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Instruction registers calibration guide
              </span>
              These variables bind directly to variables declared inside G-Code commands. Updating a coordinate below will dynamically scan and update the values inside the open file editor!
            </div>

            {/* Registers Grid Container */}
            <div className="bg-[#141417]/30 border border-white/5 rounded-lg overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#141417] text-left text-[8px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="p-2.5">REGISTER</th>
                    <th className="p-2.5">DESCRIPTION & METRICS</th>
                    <th className="p-2.5 text-right w-24">VALUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[10px]">
                  {calibrationRegisters.map((reg) => {
                    const currentVal = parseVariableFromGcode(reg.varName, reg.default);
                    return (
                      <tr key={reg.varName} className="hover:bg-white/5 transition-colors">
                        <td className="p-2.5 font-bold text-amber-400 select-all vertical-middle">{reg.varName}</td>
                        <td className="p-2.5 vertical-middle">
                          <div className="text-[9.5px] font-medium text-slate-300 leading-none mb-1.5">{reg.name}</div>
                          <div className="text-[7.5px] text-slate-500 max-w-xs leading-normal font-sans tracking-wide">{reg.desc}</div>
                        </td>
                        <td className="p-2.5 text-right vertical-middle">
                          <input
                            type="number"
                            value={currentVal}
                            step={reg.varName.startsWith("#124") ? 50 : 5}
                            onChange={(e) => {
                              const newVal = parseFloat(e.target.value) || 0;
                              updateGcodeVariable(reg.varName, newVal);
                            }}
                            className="bg-[#09090b] border border-white/5 rounded px-2 py-1 text-center font-bold text-slate-100 font-mono text-[10.5px] w-20 focus:outline-none focus:border-amber-500"
                          />
                          <div className="flex justify-end gap-1.5 mt-1">
                            <button
                              onClick={() => {
                                // Teach current cartesian point
                                const teachVal = reg.varName.endsWith("X") ? cartesianX : cartesianY;
                                updateGcodeVariable(reg.varName, teachVal);
                              }}
                              className="text-[7px] text-amber-400 hover:text-white transition-colors uppercase font-bold"
                              title="Sync TCP position currently active on DRO screen"
                            >
                              [TEACH XY]
                            </button>
                            <button
                              onClick={() => updateGcodeVariable(reg.varName, reg.default)}
                              className="text-[7px] text-slate-500 hover:text-rose-400 transition-colors uppercase font-bold"
                            >
                              [RESET]
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* === TAB D: REAL-TIME DIAGNOSTICS === */}
        {/* ==================================== */}
        {activeTab === "diagnostics" && (
          <div className="space-y-4 font-mono select-none">
            
            {/* Title Block */}
            <div className="border-b border-white/5 pb-2">
              <h3 className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-400" />
                <span>Mechanical system diagnostics</span>
              </h3>
              <span className="text-[7.5px] text-slate-500 block uppercase tracking-wide">
                Kinematic loading factors, torques stress logs, and power indexing
              </span>
            </div>

            {/* Total System Load Card */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-[#141417] border border-white/5 p-3.5 rounded-lg flex flex-col space-y-1 relative">
                <span className="text-[7.5px] text-slate-500 font-bold block uppercase tracking-wider">
                  Aggregated Output Power
                </span>
                <span className="text-xl font-black text-rose-450 text-rose-400 leading-none">
                  {aggregatePowerW} Watts
                </span>
                <span className="text-[7px] text-slate-650 uppercase">
                  Kinematic speed & load dissipation
                </span>
              </div>

              <div className="bg-[#141417] border border-white/5 p-3.5 rounded-lg flex flex-col space-y-1 justify-between">
                <div>
                  <span className="text-[7.5px] text-slate-500 font-bold block uppercase tracking-wider leading-none mb-1">
                    Ramping profile state
                  </span>
                  <div className="text-[10px] font-bold text-blue-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                    <span>TRAPEZOID_ON (0.08 damping)</span>
                  </div>
                </div>
                <span className="text-[7px] text-slate-650 uppercase leading-none">
                  Smooth micro-step easing
                </span>
              </div>
            </div>

            {/* Real-time Velocity Profile Sparkline */}
            <div className="bg-[#141417] border border-white/5 rounded-lg p-3.5 space-y-2">
              <div className="flex justify-between items-center text-[9px] text-slate-400">
                <span className="font-bold uppercase tracking-wider flex items-center space-x-1.5 text-blue-400">
                  <Activity className="w-3.5 h-3.5 animate-pulse" />
                  <span>Trapezoidal Velocity Sparkline</span>
                </span>
                <span className="text-[7.5px] text-slate-500">
                  Joint Space speed Integral
                </span>
              </div>

              <div className="h-16 bg-[#0d0d0f] rounded-md relative overflow-hidden p-1 flex items-end border border-white/5">
                <div className="absolute inset-0 flex flex-col justify-between p-1 opacity-20 pointer-events-none text-[6.5px] font-mono text-slate-600">
                  <div className="border-b border-dashed border-slate-500/30 w-full" />
                  <div className="border-b border-dashed border-slate-500/30 w-full" />
                </div>

                <svg className="w-full h-full" viewBox="0 0 100 40" preserveAspectRatio="none">
                  <polygon
                    points={`0,40 ${velocityHistory
                      .map((val, idx) => {
                        const x = (idx / (velocityHistory.length - 1)) * 100;
                        const y = 40 - Math.min((val / 10) * 35, 38);
                        return `${x},${y}`;
                      })
                      .join(" ")} 100,40`}
                    fill="url(#blue-gradient-tab)"
                    fillOpacity="0.15"
                  />
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.2"
                    points={velocityHistory
                      .map((val, idx) => {
                        const x = (idx / (velocityHistory.length - 1)) * 100;
                        const y = 40 - Math.min((val / 10) * 35, 38);
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                  <defs>
                    <linearGradient id="blue-gradient-tab" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Torques indicators */}
            <div className="bg-[#141417] border border-white/5 p-3.5 rounded-lg space-y-3.5">
              <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wide block mb-1">
                Dynamic link joint-load stress meters (Torques)
              </span>

              <div className="space-y-3">
                {joints.slice(1).map((joint, idx) => {
                  const torqueVal = jointTorques[idx + 1] || 1.5;
                  const maxTorqueVal = idx === 0 ? 12 : idx === 1 ? 10 : 8; // rated max joint limit
                  const pct = Math.min((torqueVal / maxTorqueVal) * 100, 100);
                  const isStressed = torqueVal > maxTorqueVal * 0.8;

                  return (
                    <div key={joint.id} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono leading-none">
                        <span className="text-slate-400 font-bold uppercase">{joint.name} Segment</span>
                        <div className="space-x-1.5">
                          <span className={isStressed ? "text-rose-450 text-rose-400 font-black animate-pulse" : "text-blue-400 font-bold"}>
                            {torqueVal} N·m
                          </span>
                          <span className="text-slate-600">/ max {maxTorqueVal} N·m</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#0d0d0f] rounded-sm h-2 overflow-hidden border border-white/5 relative">
                        <div 
                          className={`h-full transition-all duration-150 ${isStressed ? "bg-rose-500" : "bg-blue-500"}`}
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[7.5px] text-slate-500 mt-1 uppercase max-w-sm leading-normal">
                * Stress calculated in Newton-meters (N·m) relative to link projections. Values exceeding red warnings require joint velocity reduction overrides.
              </p>
            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* === TAB E: EXPANDED REFERENCE HUB === */}
        {/* ==================================== */}
        {activeTab === "reference" && (
          <div className={isManualMaximized 
            ? "fixed inset-0 bg-[#0c0c0f] text-slate-100 z-[110] p-6 md:p-8 overflow-y-auto font-mono select-none flex flex-col space-y-4 animate-in fade-in duration-200" 
            : "space-y-4 font-mono select-none"
          }>
            
            {/* Title Block */}
            <div className="border-b border-white/5 pb-2.5 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-[12.5px] font-extrabold text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-indigo-400 animate-pulse" />
                  <span>VoltLogic PRO Dynamic Companion Academy{isManualMaximized && " (Maximized)"}</span>
                </h3>
                <p className="text-[8px] text-slate-400 uppercase tracking-wider mt-0.5 leading-normal">
                  Professional interactive robot cell manual, live kinematics calculators, &amp; knowledge audits.
                </p>
              </div>
              <button
                onClick={() => setIsManualMaximized(!isManualMaximized)}
                className="px-2 py-1.5 text-[8.5px] font-bold text-slate-300 hover:text-indigo-300 hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/20 rounded cursor-pointer transition-all shrink-0 flex items-center gap-1.5 uppercase"
                title={isManualMaximized ? "Restore Normal Pane" : "Maximize Manual View"}
                id="toggle-ref-maximize-btn"
              >
                {isManualMaximized ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                    <span>Minimize View</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Maximize View</span>
                  </>
                )}
              </button>
            </div>

            {/* NESTED SUB-TABS SELECTOR */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0b0b0d] border border-white/5 rounded-lg">
              <button
                onClick={() => setRefSubTab("book")}
                className={`py-1.5 px-2 text-[8.5px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  refSubTab === "book"
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-black"
                    : "text-slate-400 hover:bg-[#141417]/50 hover:text-slate-200 border border-transparent"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Handbook</span>
              </button>
              <button
                onClick={() => setRefSubTab("sandbox")}
                className={`py-1.5 px-2 text-[8.5px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  refSubTab === "sandbox"
                    ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-black"
                    : "text-slate-400 hover:bg-[#141417]/50 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Kinematic Lab</span>
              </button>
              <button
                onClick={() => setRefSubTab("quiz")}
                className={`py-1.5 px-2 text-[8.5px] font-bold uppercase rounded flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  refSubTab === "quiz"
                    ? "bg-pink-600/30 text-pink-300 border border-pink-500/30 font-black"
                    : "text-slate-400 hover:bg-[#141417]/50 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Cert Board</span>
              </button>
            </div>

            {/* PART SELECTED TAB TOGGLE BLOCK */}
            {refSubTab === "book" && (
              <div className="bg-[#0b0b0d] border border-white/5 p-2 rounded flex flex-col space-y-1.5 shrink-0">
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                  Select Handbook Module Chapter:
                </span>
                <select
                  value={currentRefPart}
                  onChange={(e) => setCurrentRefPart(e.target.value)}
                  className="bg-[#141417] border border-white/10 rounded px-2 py-1 text-slate-300 font-bold text-[9px] w-full focus:outline-none focus:border-blue-500 cursor-pointer font-mono uppercase"
                >
                  <option value="ALL" className="bg-[#141417] text-slate-200">Show Complete Handbook (All Chapters)</option>
                  <option value="PART_I" className="bg-[#141417] text-slate-200">Part I: Intro to VoltLogic &amp; Roadmap</option>
                  <option value="PART_II" className="bg-[#141417] text-slate-200">Part II: Mathematics &amp; Kinematics</option>
                  <option value="PART_III" className="bg-[#141417] text-slate-200">Part III: Robot Manipulator Types</option>
                  <option value="PART_IV" className="bg-[#141417] text-slate-200">Part IV: G-Code Programming Reference</option>
                  <option value="PART_V" className="bg-[#141417] text-slate-200">Part V: Breakbeams &amp; Color Sensors</option>
                  <option value="PART_VI" className="bg-[#141417] text-slate-200">Part VI: Industrial Factory Projects</option>
                  <option value="PART_VII" className="bg-[#141417] text-slate-200">Part VII: Diagnostics &amp; Hard Troubleshooting</option>
                  <option value="PART_VIII" className="bg-[#141417] text-slate-200">Part VIII: Python/REST Developer SDK</option>
                  <option value="PART_IX" className="bg-[#141417] text-slate-200">Part IX: Certification &amp; Prescription Presets</option>
                </select>

                {/* Target Audience Badge Bar */}
                <div className="flex flex-wrap gap-1 pt-1 border-t border-white/5">
                  <span className="text-[7px] px-1 bg-blue-500/10 text-blue-400 border border-blue-500/25 rounded uppercase font-bold leading-none py-0.5">STUDENT</span>
                  <span className="text-[7px] px-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded uppercase font-bold leading-none py-0.5">TECHNICIAN</span>
                  <span className="text-[7px] px-1 bg-pink-500/10 text-pink-400 border border-pink-500/25 rounded uppercase font-bold leading-none py-0.5">PROGRAMMER</span>
                  <span className="text-[7px] px-1 bg-teal-500/10 text-teal-400 border border-teal-500/25 rounded uppercase font-bold leading-none py-0.5">ENGINEER</span>
                  <span className="text-[7px] px-1 bg-amber-500/10 text-amber-400 border border-amber-500/25 rounded uppercase font-bold leading-none py-0.5">DEVELOPER</span>
                </div>
              </div>
            )}

            {refSubTab === "book" && (<>
            {/* ------------------------------------ */}
            {/* --- PART I: ECOSYSTEM & ROADMAP --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_I") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-blue-400 uppercase tracking-widest leading-none">
                    PART I: INTRODUCTION TO THE VOLTLOGIC PRO ECOSYSTEM
                  </span>
                </div>
                
                <div className="space-y-2 text-[9px] text-slate-350 leading-relaxed font-sans">
                  <p className="font-semibold text-slate-250">What is VoltLogic Pro?</p>
                  <p>
                    VoltLogic Pro is an industrial-grade mechatronics simulation, hardware compilation, 
                    and motion routing ecosystem designed for smart automation pipelines. It combines physical multi-axis coordinate calculations 
                    with industrial-level automation controllers to deliver high-performance testing of robotic cells.
                  </p>
                  <p className="font-semibold text-slate-300 mt-2">Target High-Capacity Capabilities:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-mono text-[8.5px] text-slate-400">
                    <li>Industrial Automation cell design &amp; path validation</li>
                    <li>Robot Kinematics (4-DOF Parallel Swivel link layouts)</li>
                    <li>SCARA and Cartesian high-speed precision sorting</li>
                    <li>Conveyor coordination via photoelectric breakbeams</li>
                    <li>PLC and G-Code interpretation register controls</li>
                  </ul>
                </div>

                {/* 4 progressive training curriculums */}
                <div className="space-y-2.5 pt-2 border-t border-white/5">
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block">
                    Curriculum Learning Roadmaps (Level 1-4)
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[8px]">
                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-emerald-400 font-bold uppercase flex justify-between">
                        <span>Level 1: Beginner</span>
                        <span className="text-slate-500 font-normal">Core Basics</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        Acquire familiarity with Cartesian offsets, reference coordinates, G90 absolute mode, 
                        G21 dimension controls, and simple tool positioning.
                      </p>
                      <pre className="p-1 px-1.5 bg-[#141417] text-slate-300 rounded text-[7.5px] font-mono leading-tight">
                        G90 ; Set positioning absolute{"\n"}
                        G21 ; Dimensions in millimeters{"\n"}
                        G01 X100 Y0 Z50 F500 ; Smooth linear slide
                      </pre>
                      <div className="text-[7.5px] text-amber-500 italic">
                        Exercises: Write program driving effector along a perfect 100mm planar square.
                      </div>
                    </div>

                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-blue-400 font-bold uppercase flex justify-between">
                        <span>Level 2: Intermediate</span>
                        <span className="text-slate-500 font-normal">Pick-and-place</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        Control real-time feedrates, understand pneumatic suction relays, process conveyor drive states, 
                        and synchronize with breakbeam sensors.
                      </p>
                      <pre className="p-1 px-1.5 bg-[#141417] text-slate-300 rounded text-[7.5px] font-mono leading-tight">
                        M03 S1 ; Drive motor belt transport{"\n"}
                        M66 P1 L3 Q5 ; Wait sensor breakbeam{"\n"}
                        M05 P1 ; Vacuum suction hold active
                      </pre>
                      <div className="text-[7.5px] text-amber-500 italic">
                        Exercises: Construct closed line awaiting scanned workpiece, capture, and dump to container box.
                      </div>
                    </div>

                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-purple-400 font-bold uppercase flex justify-between">
                        <span>Level 3: Advanced</span>
                        <span className="text-slate-500 font-normal">Flow logic</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        Incorporate relational checks, jump blocks with variables, color scanned indices, 
                        and write customized automatic decision registers.
                      </p>
                      <pre className="p-1 px-1.5 bg-[#141417] text-slate-300 rounded text-[7.5px] font-mono leading-tight">
                        #200 = AI1 ; Store color reading{"\n"}
                        IF [#200 &gt; 100] GOTO 150 ; Color check{"\n"}
                        GOTO 200 ; Default fallthrough segment
                      </pre>
                      <div className="text-[7.5px] text-amber-500 italic">
                        Exercises: Sort colored blocks to matching storage bays via logic.
                      </div>
                    </div>

                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-rose-400 font-bold uppercase flex justify-between">
                        <span>Level 4: Professional</span>
                        <span className="text-slate-500 font-normal">Autonomous Cell</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed font-sans">
                        Deploy machine-vision camera buffers, execute real-time decision algorithms, 
                        calibrate spatial errors, and program multi-station factory arrays.
                      </p>
                      <pre className="p-1 px-1.5 bg-[#141417] text-slate-300 rounded text-[7.5px] font-mono leading-tight">
                        ; Adaptive path profiling{"\n"}
                        #220 = ENC1 ; Read encoder speed{"\n"}
                        ; Process high speed collision bounds
                      </pre>
                      <div className="text-[7.5px] text-amber-500 italic">
                        Exercises: Build autonomous 24/7 dark-factory pipeline with collision protection.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART II: KINEMATICS & MATH --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_II") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-indigo-400 uppercase tracking-widest leading-none">
                    PART II: KINEMATICS, DIAGRAMS &amp; COORDINATE MATRIX SCALARS
                  </span>
                </div>

                {/* Spatial vectors and Cartesian explanation */}
                <div className="space-y-2 text-[9px] text-slate-350 leading-relaxed font-sans">
                  <p className="font-semibold text-slate-200 uppercase tracking-wide text-[8px]">Cartesian Coordinates Frame Configuration</p>
                  <p>
                    VoltLogic physical workspace parameters map spatial vector states along three perpendicular axes relative to calibrated baseline:
                  </p>
                  
                  {/* ASCII Kinematic Linkages Diagram */}
                  <div className="bg-[#0b0b0d] border border-white/5 p-2 rounded text-[8.5px] font-mono space-y-1 my-2">
                    <span className="text-[8px] text-[#f472b6] font-extrabold uppercase tracking-wider block">Analytical Linkages Space Diagram:</span>
                    <pre className="text-[7.5px] leading-tight text-indigo-300 bg-black/50 p-2 rounded border border-white/5 overflow-x-auto select-all">
{`                        Joint 2 [J2] (θ2 relative to link 1)
                         o=========.  (Link 2: L2)
                        /           \\
                       /             \\
                      / (Link 1: L1)  *  End Effector Tool Center Point (TCP)
                     /                   [X, Z] Cartesian Coordinates
                    / 
            [J1]   o  (θ1 angle relative to base)
                   |
                   | (Base height)
                   |
                 ===== Base [J0] (Stationary origin offset)`}
                    </pre>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[8px] font-mono text-slate-400 pt-1">
                    <div className="bg-[#0b0b0d] p-1.5 rounded border border-white/5">
                      <span className="text-blue-400 font-bold block">X-Axis Range:</span>
                      <span>Left/Right workspace displacement. Range: 100 to 500mm</span>
                    </div>
                    <div className="bg-[#0b0b0d] p-1.5 rounded border border-white/5">
                      <span className="text-blue-400 font-bold block">Y-Axis Range:</span>
                      <span>Forward/Backward extension alignment, simulated radial stretch limits.</span>
                    </div>
                    <div className="bg-[#0b0b0d] p-1.5 rounded border border-white/5">
                      <span className="text-blue-400 font-bold block">Z-Axis Range:</span>
                      <span>Up/Down tool vertical drop coordinates (retract offset, pick height zero boundary).</span>
                    </div>
                  </div>
                </div>

                {/* Kinematics Workflow */}
                <div className="bg-[#0b0b0d] border border-white/5 p-2 rounded text-[8.5px] font-mono space-y-2">
                  <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider block">Joint Space Transformation Protocol</span>
                  <div className="flex flex-col items-center justify-center p-2.5 bg-black/40 rounded border border-white/5 text-center leading-normal">
                    <div className="text-slate-300 font-bold">DESIRED CARTESIAN COORDINATE frame (X, Y, Z)</div>
                    <div className="text-indigo-400 my-1 font-bold">↓ (Controller processes Inverse Kinematics solver)</div>
                    <div className="text-slate-200 font-bold">JOINT SPACE ROTATIONAL ANGLES (J1, J2, J3, B)</div>
                    <div className="text-indigo-400 my-1 font-bold">↓ (Closed-loop digital servo feedback)</div>
                    <div className="text-slate-300 font-black text-blue-400">PHYSICAL STEPPER BRUSHLESS COMMAND DECODE</div>
                  </div>
                </div>

                {/* Mathematical conversions */}
                <div className="space-y-2 text-[8.5px] font-mono">
                  <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wider">Kinematics Solver Mathematical Equations</span>
                  <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5 space-y-1.5 text-slate-400 leading-relaxed font-sans">
                    <div>
                      <span className="font-bold font-mono text-slate-200 block">Forward Kinematics Transformation (Angles → Spatial positions):</span>
                      <p>
                        Calculates tool end effector position using joint lengths <span className="font-mono text-blue-400">L1, L2</span> and rotational state angles <span className="font-mono text-blue-400">θ1, θ2</span>:
                      </p>
                      <pre className="mt-1 p-1 px-2.5 bg-[#141417] text-teal-400 rounded text-[8px] font-mono leading-snug">
                        X = BaseX + L1 * cos(θ1) + L2 * cos(θ1 + θ2){"\n"}
                        Y = BaseY - L1 * sin(θ1) - L2 * sin(θ1 + θ2)
                      </pre>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <span className="font-bold font-mono text-slate-200 block">Inverse Kinematics Resolution (Spatial positions → Angles):</span>
                      <p>
                        Determines joint states required to navigate end-effector to location X, Y using law of cosines algorithm:
                      </p>
                      <pre className="mt-1 p-1 px-2.5 bg-[#141417] text-teal-400 rounded text-[8px] font-mono leading-snug">
                        cos(θ2) = (X² + Y² - L1² - L2²) / (2 * L1 * L2){"\n"}
                        θ2 = atan2(±√(1 - cos²(θ2)), cos(θ2)){"\n"}
                        θ1 = atan2(Y, X) - atan2(L2 * sin(θ2), L1 + L2 * cos(θ2))
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART III: ROBOT CONFIGS --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_III") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-rose-400 uppercase tracking-widest leading-none">
                    PART III: ROBOT MANIPULATOR CONFIGURATION ARRAYS
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[8px] font-mono">
                  <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5 space-y-1">
                    <span className="text-blue-400 font-extrabold uppercase block text-[8.5px]">1. Articulated System</span>
                    <p className="text-slate-400 font-sans leading-relaxed">
                      Replicates flexible human muscle ranges with three rotational joint segments pivoting around base swivel frame J0.
                    </p>
                    <div className="text-[#a855f7] font-bold">Advantages:</div>
                    <span className="text-slate-500 font-sans leading-snug block">
                      Maximum circular workspace reach bounds, spatial dexterity, obstacle collision loops bypass clearance.
                    </span>
                    <div className="text-slate-600 block text-[7.5px] uppercase pt-1 border-t border-white/5">
                      Applications: Laser Welding, painting sprayers, multi-axis heavy assemblies.
                    </div>
                  </div>

                  <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5 space-y-1">
                    <span className="text-indigo-400 font-extrabold uppercase block text-[8.5px]">2. SCARA Manipulator</span>
                    <p className="text-slate-400 font-sans leading-relaxed">
                      Selective Compliance Assembly Robot Arm. Uses vertical column axis combined with two planar folding rotational joints.
                    </p>
                    <div className="text-[#a855f7] font-bold">Advantages:</div>
                    <span className="text-slate-500 font-sans leading-snug block">
                      Excellent structural rigidity along vertical thrust vector axis, incredibly fast cycle speeds, precise placement.
                    </span>
                    <div className="text-slate-600 block text-[7.5px] uppercase pt-1 border-t border-white/5">
                      Applications: Board pick-and-place, micro PCB component placements.
                    </div>
                  </div>

                  <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5 space-y-1">
                    <span className="text-teal-400 font-extrabold uppercase block text-[8.5px]">3. Cartesian Gantry</span>
                    <p className="text-slate-400 font-sans leading-relaxed">
                      Linear slide carriages traveling exclusively along orthogonal grid rails (X, Y, Z sliders) with no rotational joints.
                    </p>
                    <div className="text-[#a855f7] font-bold">Advantages:</div>
                    <span className="text-slate-500 font-sans leading-snug block">
                      Linear scaling limits, absolute geometric positioning, simplest algebraic trajectory calculations.
                    </span>
                    <div className="text-slate-600 block text-[7.5px] uppercase pt-1 border-t border-white/5">
                      Applications: CNC milling gantries, heavy package pellet sorting bays.
                    </div>
                  </div>
                </div>

                {/* TABLE COMPARATIVE SPECIFICATIONS */}
                <div className="bg-[#0b0b0d] border border-white/5 rounded-lg overflow-hidden mt-3 font-mono">
                  <div className="bg-[#141417]/70 p-1.5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[8.5px] font-black tracking-wider uppercase text-pink-400">Table 3.1: Kinematic Manipulator Comparison Grid</span>
                    <span className="text-[6.5px] text-slate-500 uppercase px-1.5 py-0.5 bg-black rounded-full border border-white/5">Auto-Ref</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[7.5px]">
                      <thead>
                        <tr className="bg-black/30 border-b border-white/5 text-slate-400">
                          <th className="p-1 px-2 font-black uppercase">Configuration</th>
                          <th className="p-1 font-black uppercase">Joint Type</th>
                          <th className="p-1 font-black uppercase">Z-Rigidity</th>
                          <th className="p-1 font-black uppercase">Cycle Speeds</th>
                          <th className="p-1 font-black uppercase">IK Math Complexity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-350">
                        <tr>
                          <td className="p-1 px-2 font-bold text-blue-300">Articulated (3R)</td>
                          <td className="p-1">Rotational (3 Rot)</td>
                          <td className="p-1 text-rose-405 font-semibold">Low (Suspended)</td>
                          <td className="p-1 text-amber-500">Medium (0.8s)</td>
                          <td className="p-1 text-red-400 font-bold">Very High (Trig/DH)</td>
                        </tr>
                        <tr>
                          <td className="p-1 px-2 font-bold text-indigo-300">SCARA (2R1Pris)</td>
                          <td className="p-1">Hybrid (2 Rot, 1 Lin)</td>
                          <td className="p-1 text-emerald-400 font-extrabold">Superior (Vertical Column)</td>
                          <td className="p-1 text-[#f472b6] font-extrabold">Maximum (0.35s)</td>
                          <td className="p-1 text-yellow-400">Medium (Law of Cosines)</td>
                        </tr>
                        <tr>
                          <td className="p-1 px-2 font-bold text-teal-300">Cartesian (3Pris)</td>
                          <td className="p-1">Linear (3 Slide)</td>
                          <td className="p-1 text-indigo-400 font-semibold">High (Gantry Rails)</td>
                          <td className="p-1 text-amber-500">Slow-Medium (1.2s)</td>
                          <td className="p-1 text-emerald-400 font-extrabold">Easiest (Linear Offset)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART IV: G-CODE REFERENCE --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_IV") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-yellow-400 uppercase tracking-widest leading-none">
                    PART IV: G-CODE &amp; MOTION INSTRUCTION DICTIONARY
                  </span>
                </div>

                <div className="space-y-2 text-[9px] text-slate-300">
                  <p className="font-sans leading-relaxed text-slate-400">
                    All interpreter instruction codes map coordinates in millimeter dimensional limits or degrees angular scales. Feedrate is absolute.
                  </p>

                  <div className="space-y-2 font-mono text-[8.5px]">
                    <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5">
                      <div className="flex justify-between font-bold text-pink-400 text-[9px] mb-0.5">
                        <span>G00: Rapid Seek Positioning</span>
                        <span className="text-slate-500">Syntax: G00 X[val] Z[val] B[angle]</span>
                      </div>
                      <p className="font-sans text-slate-400 leading-normal">
                        Drives motors rapidly without linear interpolation towards coordinates, moving all axes simultaneously at max core limit.
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5">
                      <div className="flex justify-between font-bold text-pink-400 text-[9px] mb-0.5">
                        <span>G01: Linear Feed Interpolation</span>
                        <span className="text-slate-500">Syntax: G01 X[val] Z[val] F[feedrate]</span>
                      </div>
                      <p className="font-sans text-slate-400 leading-normal">
                        Moves the tool tip along a straight vector profile at constant feedrate speed F (expressed in mm/min). Standard for pickup maneuvers.
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5">
                      <div className="flex justify-between font-bold text-pink-400 text-[9px] mb-0.5">
                        <span>G02 / G03: Circular Arc Interpolation</span>
                        <span className="text-slate-500">Syntax: G02/G03 X[val] Z[val] R[radius] F[speed]</span>
                      </div>
                      <p className="font-sans text-slate-400 leading-normal">
                        Drives the end effector in a circular clockwise (G02) or counter-clockwise (G03) arc to target waypoint with radius R.
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5">
                      <div className="flex justify-between font-bold text-pink-400 text-[9px] mb-0.5">
                        <span>G04: Dwell Timer (Hold Sequence)</span>
                        <span className="text-slate-500">Syntax: G04 P[millis]</span>
                      </div>
                      <p className="font-sans text-slate-400 leading-normal">
                        Blocks interpreter processing for P milliseconds. Halts path motion without disengaging step torque. Ideal for let vacuum establish.
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5">
                      <div className="flex justify-between font-bold text-[#38bdf8] text-[9px] mb-0.5">
                        <span>M03: Conveyor Motor Belt State</span>
                        <span className="text-slate-500">Syntax: M03 S[0 or 1]</span>
                      </div>
                      <p className="font-sans text-slate-400 leading-normal">
                        Sets conveyor drive motor line. Parameter <span className="font-mono text-slate-200">S1</span> shifts belt active conveyor; 
                        <span className="font-mono text-slate-200">S0</span> commands immediate halt of incoming material line.
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2.5 rounded border border-white/5">
                      <div className="flex justify-between font-bold text-[#38bdf8] text-[9px] mb-0.5">
                        <span>M05: Suction Solenoid Suction active</span>
                        <span className="text-slate-500">Syntax: M05 P[0 or 1]</span>
                      </div>
                      <p className="font-sans text-slate-400 leading-normal">
                        Triggers high-pressure pneumatic solenoid venturi generator. P1 activates strong suction grip; P0 shuts down valve for drop off release.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART V: SENSORS AND MACROS --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_V") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-cyan-400 uppercase tracking-widest leading-none">
                    PART V: SENSOR PROGRAMMING, MACROS &amp; INTERRUPTS
                  </span>
                </div>

                <div className="space-y-2 text-[9px] text-slate-350 leading-relaxed font-sans">
                  <p>
                    Automation processes inside VoltLogic leverage optical scanner, color reading register, and dynamic rotation hardware:
                  </p>

                  <div className="space-y-2 font-mono text-[8px]">
                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-cyan-400 font-bold text-[8.5px]">Optoelectronic Breakbeam Interrupt:</div>
                      <p className="text-slate-450">
                        Halts execution until lightbeam receives occlusion barrier. Syntax structure: 
                        <span className="font-mono text-yellow-400 bg-white/5 px-1 ml-1">M66 P1 L3 Q5</span> (Wait Sensor Port 1 state HIGH with 5s timeout).
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-cyan-400 font-bold text-[8.5px]">Multi-Spectral Color Scanning Registers:</div>
                      <p className="text-slate-450">
                        Pushes RGB reflections down into global memory macros. The camera reads:
                        <br />
                        <span className="text-blue-400">#200 = AI1</span> (Port 1 Red Value),{" "}
                        <span className="text-blue-400">#201 = AI2</span> (Port 2 Green Value),{" "}
                        <span className="text-blue-400">#202 = AI3</span> (Port 3 Blue Value).
                      </p>
                    </div>

                    <div className="bg-[#0b0b0d] p-2 rounded border border-white/5 space-y-1">
                      <div className="text-cyan-400 font-bold text-[8.5px]">High-Resolution Shaft Quadrature Encoders:</div>
                      <p className="text-slate-450">
                        Tracks microsecond rotation index. Access command: <span className="font-mono text-yellow-400">#220 = ENC1</span>. 
                        Useful for real-time timing alignment, closed loop feedrate transport adjustments, and material positioning verification.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART VI: AUTOMATION PROJECTS --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_VI") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-amber-500 uppercase tracking-widest leading-none">
                    PART VI: INDUSTRIAL MANUFACTURING &amp; INTEGRATION CELL PROJECTS
                  </span>
                </div>

                <div className="space-y-3 text-[9px] font-sans text-slate-350">
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-orange-400 block text-[9.5px]">Project 1: Automatic Material Sorting Loop</span>
                    <p className="leading-relaxed font-sans">
                      Build an integrated sorting cell. Transport material block with conveyor, listen on breakbeam interrupt scanner, capture raw material using magnet or suction, identify RGB profiles, and move block cleanly down respective color container drop arrays.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="font-mono font-bold text-orange-400 block text-[9.5px]">Project 2: Autonomous Multi-Grid Inventory Depot</span>
                    <p className="leading-relaxed font-sans">
                      Implement coordinate cell allocating. Manage spatial registers (#500 through #599) to track coordinates of 100 virtual parts. Program robot to stack products cleanly in spatial bays without colliding with racks.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="font-mono font-bold text-orange-400 block text-[9.5px]">Project 3: Video Calibration Camera Guidance</span>
                    <p className="leading-relaxed font-sans">
                      Integrate real-time machine vision tracking. Track material shape configurations, align spatial offsets, and trigger correct pickup adjustments to accommodate random shifts along belt orientations.
                    </p>
                  </div>

                  <div className="space-y-1 pt-2 border-t border-white/5">
                    <span className="font-mono font-bold text-orange-400 block text-[9.5px]">Project 4: Synchronized Multi-Stage Robotic Cluster</span>
                    <p className="leading-relaxed font-sans">
                      Formulate automated plant cell. Robot Alpha extracts mold; Robot Beta inspects dimensions via coordinate probe; Robot Gamma packages finished box, maintaining zero bottlenecks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART VII: DIAGNOSTICS & ALARMS - */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_VII") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-rose-400 uppercase tracking-widest leading-none">
                    PART VII: SYSTEM DIAGNOSTIC ERROR CODES &amp; CRITICAL REPAIRS
                  </span>
                </div>
                
                <p className="text-[8.5px] text-slate-500 leading-normal font-sans">
                  The VoltLogic host controller alerts safety alarms upon detecting joint reach limitations, obstacle collides, or load faults:
                </p>

                <div className="space-y-2.5 font-mono text-[8.5px]">
                  {errorDatabase.map((err) => (
                    <div key={err.code} className="bg-[#0b0b0d] border border-white/5 rounded p-2.5 space-y-1">
                      <div className="flex justify-between items-center text-[9px] pb-1 border-b border-white/5">
                        <span className="text-rose-400 font-extrabold tracking-widest">{err.code}: {err.name}</span>
                        <span className="text-[7px] px-1 bg-rose-500/10 text-rose-500 rounded font-bold uppercase leading-none py-0.5">Critical Alarm</span>
                      </div>
                      <div className="text-slate-450 leading-normal font-sans pt-0.5">
                        <span className="text-slate-500 font-bold font-mono">Root Cause:</span> {err.cause}
                      </div>
                      <div className="text-amber-400 leading-normal font-sans">
                        <span className="text-slate-500 font-bold font-mono">Remediation:</span> {err.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART VIII: DEVELOPER SDK ------- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_VIII") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-teal-400 uppercase tracking-widest leading-none">
                    PART VIII: DEVELOPER PLATFORM SDK &amp; FIRMWARE CORRIDORS
                  </span>
                </div>

                <div className="space-y-3 text-[9px] text-slate-350 leading-relaxed font-sans">
                  <p>
                    VoltLogic platform provides developers with extensibility hooks for custom sensors, coordinate kinematics engines, and camera buffers:
                  </p>

                  <div className="space-y-3 font-mono text-[8px] text-slate-400 leading-snug">
                    <div className="space-y-1 bg-[#0b0b0d] p-2 rounded border border-white/5">
                      <span className="font-bold text-teal-400">1. Plugin Sensor API Hook (Python Framework)</span>
                      <pre className="p-2 bg-black/40 text-cyan-400 rounded overflow-x-auto leading-tight">
                        class SensorPlugin:{"\n"}
                        {"  "}def initialize(self):{"\n"}
                        {"    "}# Initialize physical bus connections{"\n"}
                        {"    "}self.port = 0x3F{"\n"}
                        {"  "}def update(self):{"\n"}
                        {"    "}# Return analog state registers{"\n"}
                        {"    "}return read_bus(self.port)
                      </pre>
                    </div>

                    <div className="space-y-1 bg-[#0b0b0d] p-2 rounded border border-white/5">
                      <span className="font-bold text-teal-400">2. Low level Motion API (Node / C++ Bindings)</span>
                      <pre className="p-2 bg-black/40 text-cyan-400 rounded overflow-x-auto leading-tight">
                        robot.move_to({"\n"}
                        {"  "}x=100,{"\n"}
                        {"  "}y=120,{"\n"}
                        {"  "}z=50,{"\n"}
                        {"  "}speed=500{"\n"}
                        )
                      </pre>
                    </div>

                    <div className="space-y-1 bg-[#0b0b0d] p-2 rounded border border-white/5">
                      <span className="font-bold text-teal-400">3. Camera Vision API (Integration module)</span>
                      <pre className="p-2 bg-black/40 text-cyan-400 rounded overflow-x-auto leading-tight">
                        color = camera.detect_color(){"\n"}
                        if color == "RED":{"\n"}
                        {"  "}robot.place("BIN_RED")
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------ */}
            {/* --- PART IX: CERTIFICATION TESTS --- */}
            {/* ------------------------------------ */}
            {(currentRefPart === "ALL" || currentRefPart === "PART_IX") && (
              <div className="bg-[#141417]/40 border border-white/5 p-3.5 rounded-lg space-y-3">
                <div className="flex items-center space-x-1.5 border-b border-white/5 pb-1.5">
                  <span className="text-[9.5px] font-black text-pink-400 uppercase tracking-widest leading-none">
                    PART IX: ACADEMY PROGRESSIVE CERTIFICATION ASSIGNMENTS
                  </span>
                </div>

                <div className="space-y-3 font-mono text-[8.5px] text-slate-350">
                  <p className="font-sans leading-relaxed text-slate-500 text-[9px]">
                    To unlock professional certificates, verify program setups by injecting these preset scripts directly and launching simulation.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    {codeSnippetsDatabase.map((snippet, idx) => (
                      <div key={idx} className="bg-[#0b0b0d] p-2.5 rounded border border-white/10 space-y-1.5 font-mono">
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-slate-200 font-bold uppercase tracking-wider">{snippet.title}</span>
                          <button
                            onClick={() => onInsertCode(snippet.content)}
                            className="text-[8px] bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/25 hover:border-cyan-500 text-cyan-400 hover:text-white font-black px-2 py-0.5 rounded transition-all cursor-pointer uppercase"
                          >
                            [Insert Directly to Editor]
                          </button>
                        </div>
                        <p className="font-sans text-[8px] text-slate-500 leading-normal">
                          {idx === 0 ? "Target Certification: Level 1 Basic Coordinate Trajectory Calibration." :
                           idx === 1 ? "Target Certification: Level 2 Advanced Sensors Conveyor Synchronization." :
                           "Target Certification: Level 3 Automated Dynamic Sorting &amp; Variables Relational checks."}
                        </p>
                        <pre className="p-2 bg-[#09090b] text-[8px] text-slate-350 rounded border border-white/5 overflow-x-auto max-h-36 scrollbar-thin">
                          {snippet.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </>)}

          {/* ------------------------------------ */}
          {/* --- PART II: KINEMATIC LAB (SANDBOX) --- */}
          {/* ------------------------------------ */}
          {refSubTab === "sandbox" && (
            <div className="space-y-4 font-mono text-[8.5px]">
              
              {/* Lab Overview Intro Banner */}
              <div className="bg-[#141417]/30 border border-white/5 p-3 rounded-lg space-y-1">
                <div className="flex items-center gap-1.5 text-[9.5px] font-black text-cyan-400 uppercase tracking-widest">
                  <Calculator className="w-4 h-4 text-cyan-400" />
                  <span>Interactive Forward &amp; Inverse Kinematic Lab</span>
                </div>
                <p className="font-sans text-[8.5px] text-slate-400 leading-relaxed">
                  Analyze coordinate space mapping, Denavit-Hartenberg matrices, and Jacobian Singularities for planar 2R articulated configurations in real time.
                </p>
              </div>

              {/* Dynamic Coordinate Target Visual Anchor */}
              <div className="bg-[#0b0b0d] border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-[#141417] px-3 py-1.5 border-b border-white/5 flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Live Graphic Trajectory Map</span>
                  </span>
                  
                  {/* Preset Quick Loader Buttons */}
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[7px] text-slate-500 font-bold uppercase">Presets:</span>
                    <button
                      onClick={() => {
                        setInteractiveTheta1(-30);
                        setInteractiveTheta2(45);
                        setLinkLength1(160);
                        setLinkLength2(120);
                        setIkSolverError(null);
                        setIkSolverSuccess(false);
                      }}
                      className="px-1 text-[7px] bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-white/5 rounded cursor-pointer uppercase font-extrabold"
                    >
                      Home
                    </button>
                    <button
                      onClick={() => {
                        setInteractiveTheta1(0);
                        setInteractiveTheta2(0);
                        setLinkLength1(180);
                        setLinkLength2(140);
                        setIkSolverError(null);
                        setIkSolverSuccess(false);
                      }}
                      className="px-1 text-[7px] bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-white/5 rounded cursor-pointer uppercase font-extrabold"
                    >
                      Extended
                    </button>
                    <button
                      onClick={() => {
                        setInteractiveTheta1(45);
                        setInteractiveTheta2(90);
                        setLinkLength1(160);
                        setLinkLength2(120);
                        setIkSolverError(null);
                        setIkSolverSuccess(false);
                      }}
                      className="px-1 text-[7px] bg-slate-800/60 hover:bg-slate-700 text-slate-300 border border-white/5 rounded cursor-pointer uppercase font-extrabold"
                    >
                      Orthogonal
                    </button>
                    <button
                      onClick={() => {
                        setInteractiveTheta1(35);
                        setInteractiveTheta2(-180);
                        setLinkLength1(160);
                        setLinkLength2(160);
                        setIkSolverError(null);
                        setIkSolverSuccess(false);
                      }}
                      className="px-1 text-[7px] bg-slate-800/60 hover:bg-slate-700 text-red-400 border border-white/10 rounded cursor-pointer uppercase font-extrabold"
                    >
                      Singular
                    </button>
                  </div>
                </div>

                {/* SVG Kinematic Screen */}
                <div className="bg-[#070709] p-2 flex flex-col items-center justify-center relative select-none">
                  {/* Radar grid coordinates graph background */}
                  <svg
                    viewBox="-180 -150 360 300"
                    className="w-full max-w-[340px] h-[210px] border border-white/5 rounded bg-black/60 shadow-inner"
                  >
                    {/* Concentric circles */}
                    <circle cx="0" cy="0" r="130" stroke="rgba(255,255,255,0.04)" fill="none" strokeDasharray="3 3" />
                    <circle cx="0" cy="0" r="90" stroke="rgba(255,255,255,0.04)" fill="none" strokeDasharray="3 3" />
                    <circle cx="0" cy="0" r="50" stroke="rgba(255,255,255,0.04)" fill="none" strokeDasharray="3 3" />
                    
                    {/* Grid Axes */}
                    <line x1="-180" y1="0" x2="180" y2="0" stroke="rgba(255,255,255,0.07)" strokeDasharray="2 2" />
                    <line x1="0" y1="-150" x2="0" y2="150" stroke="rgba(255,255,255,0.07)" strokeDasharray="2 2" />
                    
                    {/* Safe Operating Workspace Reach boundaries (semi-circle overlay) */}
                    <path
                      d={`M -${(linkLength1 + linkLength2) * 0.45} 0 A ${(linkLength1 + linkLength2) * 0.45} ${(linkLength1 + linkLength2) * 0.45} 0 0 1 ${(linkLength1 + linkLength2) * 0.45} 0`}
                      stroke="rgba(34,211,238,0.12)"
                      fill="rgba(34,211,238,0.02)"
                      strokeWidth="1.5"
                    />

                    {/* Scale coordinate factor (0.45) mapping base center to 0,0 */}
                    {/* Link 1 Line: Joint Base to Joint 1 */}
                    <line
                      x1="0"
                      y1="0"
                      x2={sandboxX1 * 0.45}
                      y2={-sandboxZ1 * 0.45}
                      stroke="#4F46E5"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    
                    {/* Link 2 Line: Joint 1 to End Effector TCP */}
                    <line
                      x1={sandboxX1 * 0.45}
                      y1={-sandboxZ1 * 0.45}
                      x2={sandboxX2 * 0.45}
                      y2={-sandboxZ2 * 0.45}
                      stroke="#06B6D4"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Dynamic trace path of link projections */}
                    <circle cx={sandboxX1 * 0.45} cy={-sandboxZ1 * 0.45} r="5" fill="#4F46E5" stroke="#FFFFFF" strokeWidth="1.5" />
                    <circle cx={sandboxX2 * 0.45} cy={-sandboxZ2 * 0.45} r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5 animate-pulse" />
                    
                    {/* Base circle node */}
                    <circle cx="0" cy="0" r="6.5" fill="#312E81" stroke="#4F46E5" strokeWidth="2" />
                    
                    {/* Crosshairs at Tooltip TCP */}
                    <line x1={sandboxX2 * 0.45 - 11} y1={-sandboxZ2 * 0.45} x2={sandboxX2 * 0.45 + 11} y2={-sandboxZ2 * 0.45} stroke="#EC4899" strokeWidth="1" />
                    <line x1={sandboxX2 * 0.45} y1={-sandboxZ2 * 0.45 - 11} x2={sandboxX2 * 0.45} y2={-sandboxZ2 * 0.45 + 11} stroke="#EC4899" strokeWidth="1" />

                    {/* Graphic text labels */}
                    <text x="10" y="-12" fill="#818CF8" fontSize="6.5" fontWeight="bold">BASE [0.0, 0.0]</text>
                    <text x={sandboxX1 * 0.45 + 8} y={-sandboxZ1 * 0.45 - 5} fill="#C084FC" fontSize="6" fontWeight="semibold">
                      J1 ({interactiveTheta1}°): [{sandboxX1.toFixed(0)}, {sandboxZ1.toFixed(0)}]
                    </text>
                    <text x={sandboxX2 * 0.45 + 8} y={-sandboxZ2 * 0.45 + 10} fill="#34D399" fontSize="6.5" fontWeight="black" className="font-mono bg-black px-1 py-0.5">
                      TCP EE: [{sandboxX2.toFixed(1)}, {sandboxZ2.toFixed(1)}]
                    </text>
                  </svg>

                  {/* Operational Status Overlay Warning */}
                  {sandboxIsSingular && (
                    <div className="absolute top-3 left-3 bg-amber-950/90 border border-amber-600/50 text-amber-400 text-[6.5px] font-bold px-2 py-0.5 rounded tracking-widest uppercase flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400 animate-pulse" />
                      <span>CRITICAL SINGULARITY WARNING (DET &lt; 1500)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TWO COLUMN PANEL: Joint Knobs vs Live Solved Outputs */}
              <div className="grid grid-cols-2 gap-3">
                {/* COLUMN 1: INTERACTIVE PHYSICAL MANUAL SLIDERS */}
                <div className="bg-[#141417]/80 rounded p-2.5 border border-white/5 space-y-2.5">
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Joint Variables</span>
                  </span>

                  {/* Theta 1 controller */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[7.5px] font-bold text-slate-300">
                      <span>θ₁ Angle (Base)</span>
                      <span className="text-indigo-400 font-mono font-black">{interactiveTheta1}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={interactiveTheta1}
                      onChange={(e) => setInteractiveTheta1(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-[#09090b] rounded-lg cursor-pointer h-1"
                    />
                  </div>

                  {/* Theta 2 controller */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[7.5px] font-bold text-slate-300">
                      <span>θ₂ Angle (Elbow)</span>
                      <span className="text-cyan-400 font-mono font-black">{interactiveTheta2}°</span>
                    </div>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      value={interactiveTheta2}
                      onChange={(e) => setInteractiveTheta2(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 bg-[#09090b] rounded-lg cursor-pointer h-1"
                    />
                  </div>

                  {/* Link 1 length dynamic controller */}
                  <div className="space-y-1 pt-1 border-t border-white/5">
                    <div className="flex justify-between text-[7.5px] text-slate-400">
                      <span>L₁ Link Length</span>
                      <span className="text-slate-300 font-bold">{linkLength1} mm</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="220"
                      value={linkLength1}
                      onChange={(e) => setLinkLength1(parseInt(e.target.value))}
                      className="w-full accent-slate-400 bg-[#09090b] rounded h-0.5 cursor-pointer"
                    />
                  </div>

                  {/* Link 2 length dynamic controller */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[7.5px] text-slate-400">
                      <span>L₂ Link Length</span>
                      <span className="text-slate-300 font-bold">{linkLength2} mm</span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="185"
                      value={linkLength2}
                      onChange={(e) => setLinkLength2(parseInt(e.target.value))}
                      className="w-full accent-slate-400 bg-[#09090b] rounded h-0.5 cursor-pointer"
                    />
                  </div>
                </div>

                {/* COLUMN 2: MATHEMATICAL METRICS CARD */}
                <div className="bg-[#141417]/80 rounded p-2.5 border border-white/5 space-y-2 flex flex-col justify-between">
                  <div>
                    <span className="text-[8px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Jacobian &amp; DH Space</span>
                    </span>

                    {/* DH table */}
                    <div className="mt-1.5 space-y-1">
                      <div className="grid grid-cols-4 text-[7px] text-slate-500 uppercase font-black border-b border-white/5 pb-0.5">
                        <span>Link</span>
                        <span>aᵢ(L)</span>
                        <span>αᵢ</span>
                        <span>θᵢ</span>
                      </div>
                      <div className="grid grid-cols-4 text-[7.5px] text-slate-300">
                        <span className="font-extrabold text-[#70c1b3]">1</span>
                        <span>{linkLength1}</span>
                        <span>0°</span>
                        <span>{interactiveTheta1}°</span>
                      </div>
                      <div className="grid grid-cols-4 text-[7.5px] text-slate-300 border-b border-white/5 pb-1">
                        <span className="font-extrabold text-[#70c1b3]">2</span>
                        <span>{linkLength2}</span>
                        <span>0°</span>
                        <span>{interactiveTheta2}°</span>
                      </div>
                    </div>

                    {/* Jacobian Metric Block */}
                    <div className="pt-2 space-y-1">
                      <span className="text-[7.5px] text-slate-400 uppercase font-bold tracking-wider block">Jacobian Determinant:</span>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[8.5px] text-slate-200">
                          det(J) = {(sandboxJacobianDeterminant).toFixed(1)}
                        </span>
                        {sandboxIsSingular ? (
                          <span className="text-[6.5px] bg-red-950 text-red-400 px-1 border border-red-500/20 rounded font-black whitespace-nowrap">SINGULAR STATE</span>
                        ) : (
                          <span className="text-[6.5px] bg-emerald-950 text-emerald-400 px-1 border border-emerald-500/10 rounded font-black whitespace-nowrap font-mono">NOMINAL ZONE</span>
                        )}
                      </div>
                      
                      {/* Jacobian Matrix preview */}
                      <pre className="text-[7.5px] text-slate-500 p-1 bg-[#09090b] rounded border border-white/5 mt-0.5 font-mono leading-tight">
                        J = [ [ {(-linkLength1 * Math.sin(sandboxTh1Rad) - linkLength2 * Math.sin(sandboxTh2Rad)).toFixed(1)}, {(-linkLength2 * Math.sin(sandboxTh2Rad)).toFixed(1)} ],<br />
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[ {(linkLength1 * Math.cos(sandboxTh1Rad) + linkLength2 * Math.cos(sandboxTh2Rad)).toFixed(1)}, {(linkLength2 * Math.cos(sandboxTh2Rad)).toFixed(1)} ] ]
                      </pre>
                    </div>
                  </div>

                  {/* Coordinate Export Button */}
                  <button
                    onClick={() => onInsertCode(`G01 X${sandboxX2.toFixed(1)} Z${sandboxZ2.toFixed(1)} F1200\n`)}
                    className="w-full text-center bg-cyan-600/15 hover:bg-cyan-600 border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 hover:text-white font-black py-1 px-2 rounded transition-all cursor-pointer uppercase text-[7.5px]"
                  >
                    Export Coordinates as G01 G-Code
                  </button>
                </div>
              </div>

              {/* INVERSE KINEMATICS CO-PROCESSOR SOLVER */}
              <div className="bg-[#0b0b0d] border border-white/10 rounded-lg p-3 space-y-2.5">
                <div className="flex justify-between items-center pb-1 border-b border-white/5">
                  <span className="text-[8.5px] font-black text-rose-300 uppercase tracking-widest flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                    <span>Inertial Inverse Kinematics Co-Processor</span>
                  </span>
                  <span className="text-[7.5px] text-slate-500 font-semibold tracking-wider uppercase">Elbow-Up Topology Solver</span>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="space-y-1.5Packed">
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase block leading-none">Target Absolute X (mm)</span>
                    <input
                      type="number"
                      value={ikTargetX}
                      onChange={(e) => setIkTargetX(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141417] border border-white/10 rounded px-2 py-1 text-slate-200 font-black font-mono focus:outline-none focus:border-rose-500 text-[9px]"
                    />
                  </div>

                  <div className="space-y-1.5Packed">
                    <span className="text-[7.5px] text-slate-400 font-bold uppercase block leading-none">Target Absolute Z (mm)</span>
                    <input
                      type="number"
                      value={ikTargetZ}
                      onChange={(e) => setIkTargetZ(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#141417] border border-white/10 rounded px-2 py-1 text-slate-200 font-black font-mono focus:outline-none focus:border-rose-500 text-[9px]"
                    />
                  </div>
                </div>

                {/* Actions Trigger Block */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => {
                      const l1 = linkLength1;
                      const l2 = linkLength2;
                      const x = ikTargetX;
                      const z = ikTargetZ;
                      
                      const num = x * x + z * z - l1 * l1 - l2 * l2;
                      const den = 2 * l1 * l2;
                      const cosT2 = num / den;
                      
                      if (Math.abs(cosT2) > 1.0001) {
                        setIkSolverError("Coordinates are out of reach bounds limit. Max Reach: " + (l1+l2) + " mm.");
                        setIkSolverSuccess(false);
                        return;
                      }
                      
                      const cosT2Clamped = Math.max(-1, Math.min(1, cosT2));
                      // Elbow-Up
                      const sinT2 = Math.sqrt(1 - cosT2Clamped * cosT2Clamped);
                      const t2_rad = Math.atan2(sinT2, cosT2Clamped);
                      
                      const t1_rad = Math.atan2(z, x) - Math.atan2(l2 * Math.sin(t2_rad), l1 + l2 * Math.cos(t2_rad));
                      
                      const t1_deg = Math.round(t1_rad * 180 / Math.PI);
                      const t2_deg = Math.round(t2_rad * 180 / Math.PI);
                      
                      setInteractiveTheta1(t1_deg);
                      setInteractiveTheta2(t2_deg);
                      setIkSolverError(null);
                      setIkSolverSuccess(true);
                    }}
                    className="flex-1 text-center bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-500 text-rose-300 hover:text-white font-black py-1.5 px-2.5 rounded transition-all cursor-pointer uppercase text-[8px] tracking-wider"
                  >
                    Solve Geometric Inverse Angles
                  </button>

                  <button
                    onClick={() => {
                      onInsertCode(`G01 X${ikTargetX.toFixed(1)} Z${ikTargetZ.toFixed(1)} F1200\n`);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white font-black py-1.5 px-3 rounded transition-all cursor-pointer uppercase text-[8px]"
                  >
                    Insert Coordinates
                  </button>
                </div>

                {/* Solving Status Display Feedback */}
                {ikSolverError && (
                  <div className="bg-red-950/40 border border-red-500/25 p-2 rounded text-red-400 font-sans text-[8px] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>{ikSolverError}</span>
                  </div>
                )}

                {ikSolverSuccess && !ikSolverError && (
                  <div className="bg-emerald-950/40 border border-emerald-500/25 p-2 rounded text-emerald-300 font-sans text-[8px] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 font-extrabold" />
                      <span>Mathematical inverse match verified. Angles set on coordinate sim!</span>
                    </span>
                    <span className="bg-[#0b2512] text-outline-emerald border border-emerald-500/30 px-2 py-0.5 font-mono font-bold text-[8px] rounded tracking-wider shadow">OK</span>
                  </div>
                )}
              </div>
            </div>
          )}

                    {/* ------------------------------------ */}
          {refSubTab === "quiz" && (
            <div className="space-y-4 font-mono text-[8.5px]">
              
              {/* Certification board banner */}
              <div className="bg-gradient-to-r from-pink-900/15 via-purple-900/15 to-indigo-900/15 border border-pink-500/20 p-3 rounded-lg flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-pink-400 uppercase tracking-widest">
                    <Award className="w-4.5 h-4.5 text-pink-400 animate-pulse" />
                    <span>VoltLogic Academy Certification Portal</span>
                  </div>
                  <p className="font-sans text-[8px] text-slate-400 leading-normal">
                    Complete the formal critical audit of 35 multiple-choice questions &amp; 3 programming challenges to secure high-tier credentials.
                  </p>
                </div>

                {/* Developer Mode Auto Fill */}
                <div className="flex gap-1.5 items-center">
                  {!quizSubmitted && (
                    <button
                      onClick={() => {
                        const solved: Record<number, number> = {};
                        quizQuestions.forEach((q, idx) => {
                          solved[idx] = q.correct;
                        });
                        setQuizAnswers(solved);
                      }}
                      className="text-[7.5px] bg-[#1a1a1f] hover:bg-indigo-950 text-indigo-400 hover:text-indigo-300 font-bold px-2 py-1 rounded border border-white/5 cursor-pointer uppercase font-mono"
                      title="For testing: Fills all MCQ answers with correct ones instantly."
                    >
                      [Auto-Solve MCQs]
                    </button>
                  )}

                  {quizSubmitted && (
                    <div className="text-right p-1 px-2.5 bg-black/60 border border-white/10 rounded">
                      <div className="text-[6.5px] text-slate-500 uppercase font-bold">Grade Audit</div>
                      <div className="text-sm font-black text-pink-400 font-mono">
                        {quizScore !== null ? `${quizScore}%` : "0%"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* AUDIT QUESTIONS MAP CARD CONTAINER */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <span className="text-slate-400 text-[8px] uppercase font-bold tracking-wide">
                    Section A: Multiple Choice Exam ({quizQuestions.length} Questions)
                  </span>
                  <span className="text-slate-500 text-[7.5px]">
                    Scrollable Panel • Completed: {Object.keys(quizAnswers).length}/{quizQuestions.length}
                  </span>
                </div>
                
                <div className="space-y-3 max-h-96 pr-1 overflow-y-auto scrollbar-thin border border-white/5 bg-black/20 p-2.5 rounded-lg">
                  {quizQuestions.map((question, qIdx) => {
                    const hasSelection = quizAnswers[qIdx] !== undefined;
                    const selectedOpt = quizAnswers[qIdx];
                    const showHint = quizShowHint[qIdx];
                    
                    return (
                      <div
                        key={qIdx}
                        className={`p-2.5 bg-[#0b0b0d] rounded border transition-all ${
                          hasSelection 
                            ? "border-indigo-500/10 bg-[#101014]/40" 
                            : "border-white/5"
                        }`}
                      >
                        {/* Question Index Bar */}
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[7px] font-black tracking-widest text-[#fa9284] px-1.5 py-0.5 bg-[#fa9284]/10 border border-[#fa9284]/25 rounded uppercase">
                            COMPLIANCE Q{qIdx + 1}
                          </span>
                          
                          {quizSubmitted && (
                            quizAnswers[qIdx] === question.correct ? (
                              <span className="text-[6.5px] text-emerald-400 font-bold uppercase flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Correct</span>
                            ) : (
                              <span className="text-[6.5px] text-rose-400 font-bold uppercase flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" /> Failed</span>
                            )
                          )}
                        </div>

                        {/* Question text */}
                        <p className="text-[8.5px] font-bold text-slate-200 uppercase leading-snug font-mono">
                          {question.q}
                        </p>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                          {question.options.map((option, optIdx) => {
                            const isSelected = selectedOpt === optIdx;
                            const isCorrectOpt = question.correct === optIdx;
                            let optStyle = "border-white/5 bg-[#141417] text-slate-350 hover:bg-[#1b1b22]";
                            
                            if (isSelected) {
                              optStyle = "border-indigo-500 bg-indigo-950/20 text-indigo-350 font-black";
                            }
                            
                            // Show color-coded answers post submission
                            if (quizSubmitted) {
                              if (isCorrectOpt) {
                                optStyle = "border-emerald-500/40 bg-emerald-950/20 text-emerald-400 font-black";
                              } else if (isSelected) {
                                optStyle = "border-rose-500/30 bg-rose-950/25 text-rose-450";
                              } else {
                                optStyle = "border-white/5 bg-black/40 text-slate-500 cursor-not-allowed";
                              }
                            }

                            return (
                              <button
                                key={optIdx}
                                disabled={quizSubmitted}
                                onClick={() => {
                                  setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx });
                                }}
                                className={`w-full text-left p-1.5 rounded text-[8px] border cursor-pointer flex justify-between items-center transition-all ${optStyle}`}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="w-3.5 h-3.5 rounded-full bg-black/40 border border-white/5 text-[6.5px] font-bold text-center flex items-center justify-center select-none uppercase">
                                    {optIdx === 0 ? "A" : optIdx === 1 ? "B" : optIdx === 2 ? "C" : "D"}
                                  </span>
                                  <span>{option}</span>
                                </div>
                                
                                {quizSubmitted && isCorrectOpt && (
                                  <Check className="w-3 text-emerald-400" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Hint Trigger block */}
                        <div className="mt-1.5 pt-1 border-t border-white/5 flex flex-col space-y-1">
                          <button
                            onClick={() => {
                              setQuizShowHint({ ...quizShowHint, [qIdx]: !showHint });
                            }}
                            className="text-[6.5px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer uppercase font-bold text-left self-start"
                          >
                            <HelpCircle className="w-2.5 h-2.5 text-slate-500" />
                            <span>{showHint ? "Conceal tip" : "Request Laboratory Hint"}</span>
                          </button>

                          {showHint && (
                            <div className="p-1.5 bg-[#121215] border border-white/5 rounded text-slate-400 font-sans text-[7.5px] leading-relaxed">
                              💡 <span className="font-semibold text-slate-300">Lab Tip:</span> {question.hint}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MC SUBMISSION ZONE AND SCORE REPORT */}
              <div className="bg-[#0b0b0d] border border-white/5 p-3 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-[8px] uppercase font-bold tracking-wide">MCQ Telemetry Assembly</span>
                  <span className="text-[7.5px] text-slate-500">Must solve all 35 prior to academic grading</span>
                </div>
                
                <div className="flex gap-2">
                  {!quizSubmitted ? (
                    <button
                      onClick={() => {
                        const answeredCount = Object.keys(quizAnswers).length;
                        if (answeredCount < quizQuestions.length) {
                          alert(`Compliance Check: Please answer all multiple-choice questions first. (${answeredCount}/${quizQuestions.length} completed)`);
                          return;
                        }
                        
                        let correctOnes = 0;
                        quizQuestions.forEach((q, idx) => {
                          if (quizAnswers[idx] === q.correct) {
                            correctOnes++;
                          }
                        });
                        
                        const calculatedScore = Math.round((correctOnes / quizQuestions.length) * 100);
                        setQuizScore(calculatedScore);
                        setQuizSubmitted(true);
                      }}
                      className="w-full text-center bg-[#ea580c]/10 hover:bg-[#ea580c] border border-[#ea580c]/30 hover:border-[#ea580c] text-[#fdba74] hover:text-white font-bold py-2 rounded transition-all cursor-pointer uppercase text-[8px] tracking-widest flex items-center justify-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Submit Section A MCQs ({Object.keys(quizAnswers).length}/35)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setQuizAnswers({});
                        setQuizSubmitted(false);
                        setQuizScore(null);
                        setQuizShowHint({});
                      }}
                      className="w-full text-center bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white font-bold py-1.5 rounded transition-all cursor-pointer uppercase text-[8px]"
                    >
                      Reset Multiple-Choice &amp; Re-Test Theory
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION B: CODING EXERCISES FOR ROBOTIC WORKCELLS */}
              <div className="space-y-3.5 pt-2">
                <div className="flex justify-between items-center px-1 border-t border-white/5 pt-3.5">
                  <span className="text-slate-400 text-[8px] uppercase font-bold tracking-wide">
                    Section B: High-Integrity Mechatronics Code Verification
                  </span>
                  <span className="text-[7.5px] text-[#f472b6] font-bold uppercase tracking-wider">
                    Practical G-Code Exercises
                  </span>
                </div>

                <div className="space-y-4">
                  {CODING_EXERCISES.map((exercise, idx) => {
                    const ansValue = codeAnswers[idx];
                    const res = codeResults?.[idx];
                    
                    return (
                      <div key={exercise.id} className="bg-[#0b0b0d] p-3 rounded-lg border border-white/10 space-y-2">
                        {/* Header metadata row */}
                        <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[7.5px] font-black tracking-widest text-indigo-400 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/25 rounded uppercase">
                              {exercise.difficulty}
                            </span>
                            <span className="text-[8.5px] font-bold text-slate-200 uppercase">{exercise.title}</span>
                          </div>
                          <span className="text-[7px] text-slate-500 uppercase font-mono bg-[#141417] px-1.5 rounded border border-white/5">
                            Est: {exercise.linesRequired}
                          </span>
                        </div>

                        {/* Description and hint tips */}
                        <p className="text-[8px] font-sans text-slate-350 leading-relaxed font-sans pr-1">
                          {exercise.description}
                        </p>

                        {/* Interactive Script Editor */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[7.5px] text-slate-400 uppercase font-bold flex items-center gap-1">
                              <Code2 className="w-3 h-3 text-cyan-400" />
                              <span>Cell Sequence Draft:</span>
                            </label>

                            <button
                              onClick={() => {
                                const nextAnswers = [...codeAnswers];
                                nextAnswers[idx] = exercise.placeholder;
                                setCodeAnswers(nextAnswers);
                              }}
                              className="text-[6.5px] bg-[#141417] hover:bg-cyan-950 text-cyan-400 hover:text-cyan-300 font-bold px-2 py-0.5 rounded border border-white/5 cursor-pointer uppercase"
                            >
                              [Load Reference Template]
                            </button>
                          </div>

                          <div className="relative font-mono rounded overflow-hidden border border-white/5">
                            <textarea
                              rows={4}
                              value={ansValue}
                              onChange={(e) => {
                                const nextAnswers = [...codeAnswers];
                                nextAnswers[idx] = e.target.value;
                                setCodeAnswers(nextAnswers);
                              }}
                              placeholder="; Type compliant G-Code instructions here..."
                              className="w-full bg-[#08080a] p-2 text-[8px] text-emerald-300 focus:outline-none placeholder-slate-600 focus:ring-1 focus:ring-cyan-500/30 selection:bg-cyan-500/30 font-mono leading-relaxed"
                            />
                          </div>
                        </div>

                        {/* Verifier Button and results rendering */}
                        <div className="pt-1.5 flex flex-col space-y-2">
                          <button
                            onClick={() => {
                              const lines = ansValue.split("\n");
                              const result = exercise.verifier(lines);
                              setCodeResults(prev => {
                                const next = prev ? [...prev] : [
                                  { success: false, feedback: "Unattempted", advice: "Please draft your script code according to specifications.", nextInstruction: "Review Chapter IV: G-Code Reference." },
                                  { success: false, feedback: "Unattempted", advice: "Please draft your script code according to specifications.", nextInstruction: "Review Chapter IV: G-Code Reference." },
                                  { success: false, feedback: "Unattempted", advice: "Please draft your script code according to specifications.", nextInstruction: "Review Chapter IV: G-Code Reference." }
                                ];
                                next[idx] = result;
                                return next;
                              });
                            }}
                            className="w-full bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/25 hover:border-cyan-500 text-cyan-400 hover:text-white font-black py-1 px-3 rounded text-[7.5px] tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Play className="w-3 h-3 text-cyan-400" />
                            <span>Validate Script Assembly {idx + 1}</span>
                          </button>

                          {/* Verification outcome cards (Right/Wrong feedback with Advises & further instructions) */}
                          {res && (
                            <div className={`p-2 rounded text-[8px] border transition-all leading-relaxed ${
                              res.success 
                                ? "border-emerald-500/20 bg-emerald-950/10 text-emerald-300" 
                                : "border-[#e05a47]/20 bg-[#e05a47]/5 text-slate-300"
                            }`}>
                              <div className="flex items-center gap-1 font-bold mb-1">
                                {res.success ? (
                                  <span className="text-emerald-400 uppercase font-black tracking-widest flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> COMPLY-PASS
                                  </span>
                                ) : (
                                  <span className="text-[#e25c5c] uppercase font-black tracking-widest flex items-center gap-0.5">
                                    <ShieldAlert className="w-3 h-3 text-[#e25c5c]" /> COMPLY-FAIL
                                  </span>
                                )}
                              </div>
                              <p><strong className="text-slate-200">Verifier Feedback:</strong> {res.feedback}</p>
                              <p><strong className="text-slate-200">Academy Advises:</strong> {res.advice}</p>
                              <p><strong className="text-slate-200">Further Instruction:</strong> {res.nextInstruction}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VOLTLOGIC GRADUATION AND ACADEMY CONTROL GRADE TERMINAL */}
              {/* ACCORDING TO DIFFICULTY AND INCLUDES PROFESSIONAL 9 LINES AT THE END */}
              <div className="bg-black/40 border border-[#f472b6]/20 p-4 rounded-xl space-y-3 font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[9px] uppercase font-extrabold text-[#f472b6] tracking-widest block">
                      SECTION C: ACADEMY GRADUATES GRADES TELEMETRY
                    </span>
                    <span className="text-[7px] text-slate-500 block uppercase">Continuous grading server link: ACTIVE</span>
                  </div>
                  <Cpu className="w-4.5 h-4.5 text-[#f472b6] animate-pulse" />
                </div>

                {/* Theoretical scoring + code compliance evaluations helper variables */}
                {(() => {
                  const mcqScore = quizScore !== null ? quizScore : null;
                  const e1Passed = codeResults?.[0]?.success === true;
                  const e2Passed = codeResults?.[1]?.success === true;
                  const e3Passed = codeResults?.[2]?.success === true;
                  const allPassed = mcqScore !== null && mcqScore >= 90 && e1Passed && e2Passed && e3Passed;
                  
                  return (
                    <div className="space-y-3.5">
                      {/* Terminal Grading Output Logs: Exactly 9 Lines of Professional data */}
                      <div className="bg-[#07070a] p-3 rounded-lg border border-white/5 space-y-1">
                        <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1.5">
                          <span className="text-[6.5px] text-slate-500 uppercase font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span>VLA Secure Grade Stream [Terminal-0x3]</span>
                          </span>
                          <span className="text-[6px] text-slate-600">Row-Offset-Hex: 9L</span>
                        </div>
                        
                        {/* THE PROFESSIONAL 9 LINES */}
                        <div className="text-[7.5px] leading-relaxed text-slate-400 space-y-0.5 font-mono select-all">
                          <p><span className="text-slate-600">[LINE 1]</span> <span className="text-indigo-400 font-bold">INIT PIPELINE:</span> ADVANCED ROBOTIC DESIGN ACADEMY GRADE GRADER TELEMETRY</p>
                          <p><span className="text-slate-600">[LINE 2]</span> <span className="text-blue-400 font-bold">MCQ AUDIT SCALE:</span> {mcqScore !== null ? `GRADE CONFIRMED [${mcqScore}% / 100%]` : "AWAITING SECTION A TELEMETRY SUBMISSION"}</p>
                          <p><span className="text-slate-600">[LINE 3]</span> <span className="text-[#fa9284] font-bold">G-CODE LEVEL 1:</span> {e1Passed ? "COMPILER VERIFIED [PASS-COMPLIANT]" : "AWAITING COMPLIANCE SCRIPT VALIDATION"}</p>
                          <p><span className="text-slate-600">[LINE 4]</span> <span className="text-[#fa9284] font-bold">G-CODE LEVEL 2:</span> {e2Passed ? "COMPILER VERIFIED [PASS-COMPLIANT]" : "AWAITING COMPLIANCE SCRIPT VALIDATION"}</p>
                          <p><span className="text-slate-600">[LINE 5]</span> <span className="text-[#fa9284] font-bold">G-CODE LEVEL 3:</span> {e3Passed ? "COMPILER VERIFIED [PASS-COMPLIANT]" : "AWAITING COMPLIANCE SCRIPT VALIDATION"}</p>
                          <p><span className="text-slate-600">[LINE 6]</span> <span className="text-pink-400 font-bold">ACADEMIC RATING:</span> {allPassed ? "A+ ELITE ARCHITECT SPECIALIST DISPATCHED" : "INCOMPLETE CELL VERIFICATION IN SECTIONS A &amp; B"}</p>
                          <p><span className="text-slate-600">[LINE 7]</span> <span className="text-slate-500 font-bold">SHA256 CHECKSUM:</span> vla-auth-sha256:4d3ea1f90bc201cfdb08aa22c8172dae</p>
                          <p><span className="text-slate-600">[LINE 8]</span> <span className="text-yellow-500 font-bold">HTTP PROXY LINK:</span> TELEMETRY REPLICATED SUCCESSFULLY TO ADJACENT NODE CONTAINER PORT 3000</p>
                          <p><span className="text-slate-600">[LINE 9]</span> <span className="text-emerald-400 font-bold">AUTHORITY STAMP:</span> VOLTLOGIC ACADEMY CELL GRADUATES BOARD AND COGNITIVE EMBEDDED ENGINE</p>
                        </div>
                      </div>

                      {/* Advice and further instructions text block */}
                      <div className="p-3 bg-[#111114]/50 border border-white/5 rounded-lg space-y-2 text-[8px] text-slate-350 leading-relaxed font-sans">
                        <span className="font-bold text-[8.5px] uppercase text-cyan-400 flex items-center gap-1 font-mono">
                          <Info className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Final Certificate Instructions &amp; Advises:</span>
                        </span>
                        
                        {allPassed ? (
                          <div className="space-y-1.5">
                            <p className="text-emerald-400 font-semibold uppercase font-mono text-[7.5px] tracking-wide">
                              ★ Diploma Verified: Congratulations Master of Robotics Architecture!
                            </p>
                            <p>
                              Your mechatronics knowledge and G-code scripting capabilities are fully verified. You scored above 90% in theory and successfully developed highly robust scripts matching industrial safety benchmarks.
                            </p>
                            <p className="font-mono text-[7.5px] text-[#f472b6] uppercase leading-snug">
                              Further Instructions: You are authorized to copy your compiled mechatronics designs or paste them directly back into the live workspace sequencer via the pendant button to run on the production simulator cell.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-amber-400 uppercase font-mono text-[7.5px] tracking-wide">
                              ⚠ Status Incomplete: Verification requirements are pending.
                            </p>
                            <p>
                              To achieve the prestigious Master grading level, please satisfy the following compliance requirements:
                            </p>
                            <ul className="list-disc pl-4 space-y-1 font-mono text-[7.5px] text-slate-400">
                              <li>Achieve at least <strong className="text-white">90% score</strong> on the MCQ theory exam (Section A) by scrolling through and selecting correct industrial responses.</li>
                              <li>Achieve <strong className="text-white">COMPLIANT status on all three G-code challenges</strong> (Section B) by writing standard compliant commands and pressing 'Validate Script'.</li>
                            </ul>
                            <p className="font-mono text-[7px] text-teal-400 uppercase leading-snug">
                              Further Instructions: Reload templates if Stuck, use 'Request Laboratory Hint' for reference guidelines, and review Chapter IV &amp; V for syntax and coordinate boundaries.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          )}

          </div>
        )}

      </div>
    </div>
  );
}
