export type BoardId = 
  | "arduino_uno" 
  | "arduino_nano" 
  | "esp32" 
  | "esp8266" 
  | "raspberry_pi_pico" 
  | "stm32_bluepill" 
  | "cim_arm_controller";

export interface BoardConfig {
  id: BoardId;
  name: string;
  category: "Arduino" | "ESP" | "SBC / ARM" | "CIM Industry";
  processor: string;
  romSize: string;
  ramSize: string;
  operatingVoltage: string;
  supportedPins: string[];
  defaultLanguage: ProgramLanguage;
}

export type ProgramLanguage = 
  | "arduino" 
  | "cpp" 
  | "python" 
  | "gcode" 
  | "cim_script";

export interface ProgramLanguageConfig {
  id: ProgramLanguage;
  name: string;
  extension: string;
  syntaxCategory: string;
}

export interface WorkspaceFile {
  name: string;
  content: string;
  language: ProgramLanguage;
  isCustom?: boolean;
}

export interface RobotJoint {
  id: string;
  name: string;
  angle: number; // Current angle in degrees
  minAngle: number;
  maxAngle: number;
  length: number; // Segment length in pixels for visualization
  color: string;
}

export interface TargetPosition {
  x: number;
  y: number;
  z: number;
}

export interface SimulationState {
  isRunning: boolean;
  isCompiled: boolean;
  currentLine: number;
  conveyorRunning: boolean;
  blockPosition: number; // 0 to 100 on conveyor
  hasBlock: boolean;
  status: "idle" | "compiling" | "uploading" | "connecting" | "running" | "error" | "paused";
  simulationSpeed: number; // Multiplier, default 1
}

export interface TerminalLog {
  id: string;
  type: "info" | "success" | "warn" | "error";
  text: string;
  timestamp: string;
}

export interface RobotDesignConfig {
  baseWidth: number;
  shoulderLength: number;
  elbowLength: number;
  wristLength: number;
  endEffectorType: "gripper" | "suction" | "welder";
  payloadWeight: number; // kg
}

export interface CIMWorkpiece {
  id: string;
  color: "red" | "green" | "blue" | "yellow";
  positionX: number;
  status: "approaching" | "picked" | "placed" | "rejected" | "dropped";
}

export interface CIMSortingStats {
  scannedRed: number;
  scannedGreen: number;
  scannedBlue: number;
  scannedYellow: number;
  correctRed: number;
  correctGreen: number;
  correctBlue: number;
  correctYellow: number; // Rejected correctly
  incorrect: number;
  dropped: number;
}

