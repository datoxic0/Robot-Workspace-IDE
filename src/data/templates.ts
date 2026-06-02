import { BoardConfig, ProgramLanguageConfig, WorkspaceFile, RobotJoint } from "../types";

export const BOARDS: BoardConfig[] = [
  {
    id: "cim_arm_controller",
    name: "CIM Arm-Industrial V3 (6-DOF)",
    category: "CIM Industry",
    processor: "ARM Cortex-M7 @ 400MHz",
    romSize: "2 MB",
    ramSize: "1 MB",
    operatingVoltage: "24V DC",
    supportedPins: ["Joint 1 (Base)", "Joint 2 (Shoulder)", "Joint 3 (Elbow)", "Joint 4 (Wrist)", "Gripper Solenoid", "Conveyor Relay"],
    defaultLanguage: "gcode"
  },
  {
    id: "arduino_uno",
    name: "Arduino Uno R3",
    category: "Arduino",
    processor: "ATmega328P @ 16MHz",
    romSize: "32 KB",
    ramSize: "2 KB",
    operatingVoltage: "5V",
    supportedPins: ["D0 (RX)", "D1 (TX)", "D2", "D3~", "D4", "D5~", "D6~", "D7", "D8", "D9~", "D10~", "D11~", "D12", "D13", "A0", "A1", "A2", "A3", "A4", "A5"],
    defaultLanguage: "arduino"
  },
  {
    id: "arduino_nano",
    name: "Arduino Nano R3",
    category: "Arduino",
    processor: "ATmega328P @ 16MHz",
    romSize: "32 KB",
    ramSize: "2 KB",
    operatingVoltage: "5V",
    supportedPins: ["D0 (RX)", "D1 (TX)", "D2", "D3~", "D4", "D5~", "D6~", "D7", "D8", "D9~", "D10~", "D11~", "D12", "D13", "A0", "A1", "A2", "A3", "A4", "A5", "A6", "A7"],
    defaultLanguage: "arduino"
  },
  {
    id: "esp32",
    name: "ESP32 DevKit V1",
    category: "ESP",
    processor: "Xtensa Dual-Core @ 240MHz",
    romSize: "4 MB",
    ramSize: "520 KB",
    operatingVoltage: "3.3V",
    supportedPins: ["GPIO0", "GPIO2 (LED)", "GPIO4", "GPIO5", "GPIO12", "GPIO13", "GPIO14", "GPIO15", "GPIO18", "GPIO19", "GPIO21", "GPIO22", "GPIO23", "GPIO25", "GPIO26", "GPIO27", "GPIO32", "GPIO33", "GPIO34 (Input)", "GPIO35 (Input)"],
    defaultLanguage: "cpp"
  },
  {
    id: "esp8266",
    name: "NodeMCU v2 (ESP8266)",
    category: "ESP",
    processor: "L106 32-bit @ 80MHz",
    romSize: "4 MB",
    ramSize: "80 KB",
    operatingVoltage: "3.3V",
    supportedPins: ["D0 (GPIO16)", "D1 (GPIO5)", "D2 (GPIO4)", "D3 (GPIO0)", "D4 (GPIO2)", "D5 (GPIO14)", "D6 (GPIO12)", "D7 (GPIO13)", "D8 (GPIO15)", "RX (GPIO3)", "TX (GPIO1)", "A0 (ADC)"],
    defaultLanguage: "python"
  },
  {
    id: "raspberry_pi_pico",
    name: "Raspberry Pi Pico",
    category: "SBC / ARM",
    processor: "RP2040 Dual ARM Cortex-M0+",
    romSize: "2 MB",
    ramSize: "264 KB",
    operatingVoltage: "3.3V",
    supportedPins: ["GP0", "GP1", "GP2", "GP3", "GP4", "GP5", "GP6", "GP7", "GP8", "GP9", "GP10", "GP11", "GP12", "GP13", "GP14", "GP15", "GP16", "GP17", "GP18", "GP19", "GP20", "GP21", "GP22", "GP25 (LED)", "GP26 (A0)", "GP27 (A1)", "GP28 (A2)"],
    defaultLanguage: "python"
  },
  {
    id: "stm32_bluepill",
    name: "STM32F103 BluePill",
    category: "SBC / ARM",
    processor: "ARM Cortex-M3 @ 72MHz",
    romSize: "64 KB",
    ramSize: "20 KB",
    operatingVoltage: "3.3V",
    supportedPins: ["PA0", "PA1", "PA2", "PA3", "PA4", "PA5", "PA6", "PA7", "PA8", "PA9", "PA10", "PA11", "PA12", "PA15", "PB0", "PB1", "PB3", "PB4", "PB5", "PB6", "PB7", "PB8", "PB9", "PB10", "PB11", "PB12", "PB13", "PB14", "PB15", "PC13 (LED)", "PC14", "PC15"],
    defaultLanguage: "cpp"
  }
];

export const LANGUAGES: ProgramLanguageConfig[] = [
  { id: "gcode", name: "CIM G-Code", extension: ".gcode", syntaxCategory: "gcode" },
  { id: "arduino", name: "Arduino Dialect (C++)", extension: ".ino", syntaxCategory: "arduino" },
  { id: "cpp", name: "Standard C++", extension: ".cpp", syntaxCategory: "cpp" },
  { id: "python", name: "MicroPython", extension: ".py", syntaxCategory: "python" },
  { id: "cim_script", name: "CIM Structured Script", extension: ".cim", syntaxCategory: "cim_script" }
];

export const DEFAULT_FILES: Record<string, WorkspaceFile[]> = {
  cim_arm_controller: [
    {
      name: "cim_assembly.gcode",
      language: "gcode",
      content: `; ==========================================================================
; 5-DOF CIM INDUSTRIAL ROBOTIC ARM - PICK-AND-PLACE PRODUCTION SEQUENCE
; SYSTEM CONFIG: X, Y, Z (Cartesian Tool Center Point), A (Wrist Pitch), B (Waist/Base Rotation)
; ==========================================================================

; --- SAFETY INITIALIZATION BLOCK ---
G90                     ; Set absolute positioning mode
G21                     ; Set units to millimeters
G18                     ; Select XZ plane select (typical for multi-axis arms)
G92 X0 Y0 Z120 A0 B0    ; Coordinate system preset (Establish trusted software home)

; --- GLOBAL VARIABLE & FEEDRATE DEFINITIONS ---
#100 = 3000             ; Travel Feedrate (Fast air-moves, mm/min)
#101 = 800              ; Engagement Feedrate (Precision approach/retract, mm/min)
#102 = -262.5           ; Dynamic pick coordinate corresponding to IRSENS position

; --- MAIN PRODUCTION LOOP ---
O100 REPEAT [9999]      ; Loop the sequence for continuous industrial operation

    (STAGE 1: SYSTEM STANDBY & MATERIAL CALL)
    G00 X0 Y0 Z120 A0 B0       ; Rapid to safe home/standby position
    M03 S1                     ; Activate digital output: Conveyor Motor ON
    
    (STAGE 2: HARDWARE INTERLOCK - SENSOR POLLING)
    ; Instead of a blind delay, poll Digital Input #1 (Laser Photo-Detector)
    ; M66 code waits for Input 1 to go HIGH (L3). Q5 sets a 5-second timeout fault.
    M66 P1 L3 Q5               
    M03 S0                     ; Interlock met: Immediately Halt Conveyor Motor

    (STAGE 3: PRECISION APPROACH & PICK)
    G00 X[#102] Y140 Z60 A90 B10 ; Rapid travel to a safe clearance plane (20mm above target)
    G01 Z40 F[#101]            ; Controlled linear descent to exact target pick point
    M05 P1                     ; Actuate Pneumatic Solenoid Gripper (Engage jaw pressure)
    G04 P800                   ; Dwell 800ms: Allow pneumatic pressure to fully stabilize

    (STAGE 4: VERTICAL RETRACT & TRANSIT)
    G01 Z100 F[#101]           ; Controlled vertical extraction to clear conveyor rails
    G00 X150 Y0 Z100 A0 B45 F[#100] ; High-speed synchronous move to Dispatch Tray A clearance space

    (STAGE 5: CONTROLLED PLACE)
    G01 Z30 F[#101]            ; Precision downward approach into the storage tray
    M05 P0                     ; De-actuate Pneumatic Solenoid Gripper (Vent/Release pressure)
    G04 P500                   ; Dwell 500ms: Ensure part is fully decoupled before moving

    (STAGE 6: CLEARANCE RETRACT)
    G01 Z100 F[#101]           ; Retract straight up to clear tray partition walls
    M09                        ; Pulse cycle completion strobe alert signal

O100 ENDREPEAT          ; Repeat cycle for next approaching workpiece
M30                     ; Program end and reset`
    },
    {
      name: "kinematic_test.cim",
      language: "cim_script",
      content: `# CIM Robotics ARM control Structured Script
# Define joint ranges and trigger mechanical testing routines

SET_BASE_SPEED 45.0
SET_ACCELERATION 15.0

# Calibrate Joints to zero endpoints
CALIBRATE_JOINTS()

LOOP 3:
  PRINT_LOG "Starting joint sweep test sequence..."
  
  # Step Waist (Joint 1) through full swing
  MOVE_JOINT 1 TO 90 DEGREES
  WAIT 800
  MOVE_JOINT 1 TO -90 DEGREES
  WAIT 800
  MOVE_JOINT 1 TO 0 DEGREES
  
  # Test Shoulder & Elbow kinematic boundaries
  MOVE_JOINT 2 TO 45 DEGREES
  MOVE_JOINT 3 TO 90 DEGREES
  WAIT 1000
  
  # Reset alignment
  SAFE_RETRACT()
  WAIT 500
END LOOP

PRINT_LOG "All CIM system joint safety diagnostics: PASSED"`
    }
  ],
  arduino_uno: [
    {
      name: "Blink_UNO.ino",
      language: "arduino",
      content: `/*
  Arduino Uno R3 Digital Output Sweep
  Blinks the built-in LED on pin 13 and drives an external motor-relay on GPIO 3.
*/

const int BUILTIN_LED = 13;
const int SOLENOID_PIN = 3;

void setup() {
  Serial.begin(9600);
  pinMode(BUILTIN_LED, OUTPUT);
  pinMode(SOLENOID_PIN, OUTPUT);
  Serial.println("Robot Controller Starting...");
}

void loop() {
  Serial.println("Activating Pneumatic Solenoid [HIGH]");
  digitalWrite(BUILTIN_LED, HIGH);
  digitalWrite(SOLENOID_PIN, HIGH);
  delay(1000); // 1 second hold state

  Serial.println("De-activating Solenoid [LOW]");
  digitalWrite(BUILTIN_LED, LOW);
  digitalWrite(SOLENOID_PIN, LOW);
  delay(1000); // 1 second reset state
}`
    }
  ],
  esp32: [
    {
      name: "ESP32_WiFi_Arm.cpp",
      language: "cpp",
      content: `/*
 * ESP32 Web-Socket Robotic Joint Controller Endpoint
 * Parses incoming kinematic target commands and adjusts angles.
 */

#include <WiFi.h>
#include <ESPAsyncWebServer.h>

const char* ssid = "Robot_Lab_LAN";
const char* password = "AlphaSecured_99";

AsyncWebServer server(80);

// Base servo Pin assignment 
const int AXIS_X_PIN = 14;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected. IP: " + WiFi.localIP().toString());

  // Servos API handler
  server.on("/api/arm/move", HTTP_POST, [](AsyncWebServerRequest *request){
    if(request->hasParam("joint", true) && request->hasParam("angle", true)) {
      String j = request->getParam("joint", true)->value();
      String a = request->getParam("angle", true)->value();
      Serial.printf("Command: Set Link %s to angle %s\\n", j.c_str(), a.c_str());
      request->send(200, "application/json", "{\\"status\\":\\"success\\"}");
    } else {
      request->send(400, "application/json", "{\\"error\\":\\"missing_params\\"}");
    }
  });

  server.begin();
}`
    }
  ],
  esp8266: [
    {
      name: "servo_sweep.py",
      language: "python",
      content: `# ESP8266 MicroPython Micro-Controller sweep
# Periodically sweeps multi-axis servo joints on GP5 (D1) and GP4 (D2)

import machine
import time
import math

class JointServo:
    def __init__(self, pin):
        self.pwm = machine.PWM(machine.Pin(pin), freq=50)
    
    def set_angle(self, angle):
        # Translate 0-180 degrees into pulse duty cycle lengths (40 to 115)
        duty = int(40 + (angle / 180.0) * 75)
        self.pwm.duty(duty)

base_servo = JointServo(5)
shoulder_servo = JointServo(4)

print("Starting MicroPython Servo diagnostic sequence...")

for cycle in range(5):
    print("Beginning Sweeping Angle Run...")
    for degree in range(0, 180, 5):
        base_servo.set_angle(degree)
        # Offset shoulder sinusoidally
        shoulder_angle = int(90 + 45 * math.sin(degree * 3.14159 / 180.0))
        shoulder_servo.set_angle(shoulder_angle)
        time.sleep_ms(30)
        
    time.sleep_ms(500)
    
# Disconnect and safely sleep
base_servo.set_angle(90)
shoulder_servo.set_angle(90)
print("MicroPython sweeps completed successfully.")`
    }
  ],
  raspberry_pi_pico: [
    {
      name: "main_pico.py",
      language: "python",
      content: `# Raspberry Pi Pico Dual Core Kinematic Parser
# Core 0 reads sensor values; Core 1 operates the joint pulse-width step drivers

import time
import _thread
import machine

sensor_pin = machine.ADC(26)
step_pin = machine.Pin(15, machine.Pin.OUT)
direction_pin = machine.Pin(14, machine.Pin.OUT)

is_running = True
workpiece_count = 0

def core1_step_worker():
    global workpiece_count
    print("[Core 1] Step Driver operational.")
    while is_running:
        if workpiece_count > 0:
            direction_pin.high()
            # Step motor 200 cycles
            for _ in range(200):
                step_pin.high()
                time.sleep_us(500)
                step_pin.low()
                time.sleep_us(500)
            workpiece_count -= 1
        time.sleep_ms(10)

# Launch worker core thread
_thread.start_new_thread(core1_step_worker, ())

print("[Core 0] Starting system polling...")
while True:
    val = sensor_pin.read_u16()
    # If IR beam sensor breaks (less light, low voltage)
    if val < 12000:
        print("[Core 0] Workpiece detected! Beam interrupted.")
        workpiece_count += 1
        time.sleep(1.5) # debounce timeout delay
    time.sleep_ms(50)`
    }
  ],
  stm32_bluepill: [
    {
      name: "stm32_can_drive.cpp",
      language: "cpp",
      content: `/*
 * STM32 BluePill CAN-Bus industrial linkage communication
 * Listens to master robot telemetry packets and sets arm positions.
 */

#include <Arduino.h>
#include <CAN.h>

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("STM32 Robot CAN Node Initializing...");

  // start CAN transceiver at 500 kbps speed
  if (!CAN.begin(500E3)) {
    Serial.println("CAN bus initialization error!");
    while (1);
  }
}

void loop() {
  int packetSize = CAN.parsePacket();

  if (packetSize) {
    long id = CAN.packetId();
    Serial.print("Received Robot frame ID: 0x");
    Serial.print(id, HEX);

    if (CAN.packetRtr()) {
      Serial.println(" [RTR Request]");
    } else {
      Serial.print(" Payload length: ");
      Serial.println(packetSize);

      while (CAN.available()) {
        uint8_t jointIndex = CAN.read();
        uint8_t targetDegrees = CAN.read();
        Serial.printf("Action -> Segment %d command Target: %d deg\\n", jointIndex, targetDegrees);
      }
    }
    Serial.println();
  }
}`
    }
  ],
  esp8266_placeholder: [] // fallback
};

export const INITIAL_JOINTS: RobotJoint[] = [
  { id: "base", name: "Waist (Base)", angle: 0, minAngle: -150, maxAngle: 150, length: 0, color: "#1e293b" },
  { id: "shoulder", name: "Shoulder (J1)", angle: -15, minAngle: -80, maxAngle: 90, length: 110, color: "#10b981" },
  { id: "elbow", name: "Elbow (J2)", angle: 75, minAngle: -120, maxAngle: 120, length: 100, color: "#3b82f6" },
  { id: "wrist", name: "Wrist Pitch (J3)", angle: 30, minAngle: -90, maxAngle: 90, length: 60, color: "#f59e0b" },
  { id: "effector", name: "Roll / Tool (J4)", angle: 0, minAngle: -180, maxAngle: 180, length: 25, color: "#ef4444" }
];
