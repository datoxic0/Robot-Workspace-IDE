import { RobotJoint, TargetPosition } from "../types";

/**
 * Calculates Forward Kinematics for a 4-Joint 2D Arm model.
 * Inputs joint angles in degrees and segment lengths, returns absolute coordinate values.
 */
export function calculateForwardKinematics(
  baseX: number,
  baseY: number,
  joints: RobotJoint[]
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: baseX, y: baseY }];
  
  // Waist (Base) rotates the base visually or J1 turntable depth
  // We model J2 (Shoulder) -> J3 (Elbow) -> J4 (Wrist) -> Tool as a chain in the 2D plane
  let currentX = baseX;
  let currentY = baseY;
  let absoluteAngleRad = 0; // Cumulative absolute angle in radians

  // We convert angles relative to the previous link
  for (let i = 1; i < joints.length; i++) {
    const joint = joints[i];
    // Convert to radians and add to the running cumulative angle
    const relativeRad = (joint.angle * Math.PI) / 180;
    
    if (i === 1) {
      // Shoulder: J2 is relative to horizontal 0 (pointing right)
      absoluteAngleRad = relativeRad;
    } else {
      // Elbow and onwards are cumulative relative angles
      absoluteAngleRad += relativeRad;
    }

    currentX += joint.length * Math.cos(absoluteAngleRad);
    currentY += joint.length * Math.sin(absoluteAngleRad);
    
    points.push({ x: currentX, y: currentY });
  }

  return points;
}

/**
 * Solves Inverse Kinematics using CCD (Cyclic Coordinate Descent) Algorithm.
 * Robust, handles any segment lengths and joint constraints elegantly in milliseconds.
 */
export function solveInverseKinematics(
  baseX: number,
  baseY: number,
  joints: RobotJoint[],
  target: { x: number; y: number },
  maxIterations = 50,
  tolerance = 0.5
): RobotJoint[] {
  // Clone joints to avoid mutating active state during search
  const resultJoints = joints.map(j => ({ ...j }));
  
  // Helper to calculate FK coordinates for cloned joints
  const getFkCoords = () => calculateForwardKinematics(baseX, baseY, resultJoints);

  for (let iter = 0; iter < maxIterations; iter++) {
    const coords = getFkCoords();
    const endEffector = coords[coords.length - 1];

    // Check if close enough
    const distToTarget = Math.hypot(target.x - endEffector.x, target.y - endEffector.y);
    if (distToTarget < tolerance) {
      break;
    }

    // Iterate backwards through the active joint links (from tool down to shoulder J1)
    // resultJoints index matches coords indexing (0 base, 1 shoulder J1, 2 elbow J2, 3 wrist J3, 4 tool J4)
    for (let i = resultJoints.length - 2; i >= 1; i--) {
      const jointCoord = coords[i]; // Position of current joint we are rotating around
      const currentEffector = getFkCoords()[resultJoints.length - 1]; // Effector position

      // Vector from joint to effector
      const eX = currentEffector.x - jointCoord.x;
      const eY = currentEffector.y - jointCoord.y;
      const jToEffectorAngle = Math.atan2(eY, eX);

      // Vector from joint to target
      const tX = target.x - jointCoord.x;
      const tY = target.y - jointCoord.y;
      const jToTargetAngle = Math.atan2(tY, tX);

      // Angle diff in radians
      let diffAngle = jToTargetAngle - jToEffectorAngle;

      // Normalize diffAngle to -PI to PI
      diffAngle = Math.atan2(Math.sin(diffAngle), Math.cos(diffAngle));

      // Deg angle alteration
      const diffDeg = (diffAngle * 180) / Math.PI;

      // Adjust joint angle
      let newAngle = resultJoints[i].angle + diffDeg;

      // Apply physical mechanical boundaries
      newAngle = Math.max(resultJoints[i].minAngle, Math.min(newAngle, resultJoints[i].maxAngle));
      resultJoints[i].angle = Math.round(newAngle * 10) / 10; // Round to 1 decimal place
    }
  }

  return resultJoints;
}

/**
 * G-Code / Instruction Parser.
 * Translates standard industrial manufacturing instructions into target kinematics coordinates or robotic system commands.
 */
export interface ParsedGcode {
  command: string;
  params: {
    X?: number;
    Y?: number;
    Z?: number;
    A?: number; // custom angle parameters
    B?: number;
    P?: number; // payload parameters or delays
    S?: number; // state toggles (conveyor, gripper etc)
  };
  comment?: string;
  originalText: string;
}

export function parseGcodeLine(line: string): ParsedGcode | null {
  const cleanLine = line.trim();
  if (!cleanLine || cleanLine.startsWith(";")) {
    return {
      command: "COMMENT",
      params: {},
      comment: cleanLine.replace(/^;/, "").trim(),
      originalText: line
    };
  }

  // Split comment at ";"
  const parts = cleanLine.split(";");
  // Strip parenthetical comments from action parts first, e.g. "G00 X0 (comment) Y0" -> "G00 X0  Y0"
  const actionPart = parts[0].replace(/\([^)]*\)/g, " ").trim();
  const comment = parts[1] ? parts[1].trim() : undefined;

  if (!actionPart) {
    return {
      command: "COMMENT",
      params: {},
      comment: comment,
      originalText: line
    };
  }

  // Robust RegExp token parser: extracts letter keys followed by optional numeric integers or floats
  const tokenRegex = /([A-Z])\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+))?/gi;
  const matches: { letter: string; val: number }[] = [];

  let match;
  while ((match = tokenRegex.exec(actionPart)) !== null) {
    const letter = match[1].toUpperCase();
    const valStr = match[2];
    const val = valStr ? parseFloat(valStr) : 0;
    matches.push({ letter, val });
  }

  if (matches.length === 0) {
    return null;
  }

  // First token establishes the primary G/M code action
  const firstToken = matches[0];
  let command = firstToken.letter + firstToken.val.toString();
  // Standardize/pad single digit commands, e.g., G1 -> G01, M3 -> M03
  if (/^[GM]\d$/.test(command)) {
    command = command.charAt(0) + "0" + command.slice(1);
  }

  const params: Record<string, number> = {};
  for (let i = 1; i < matches.length; i++) {
    params[matches[i].letter] = matches[i].val;
  }

  return {
    command,
    params,
    comment,
    originalText: line
  };
}
