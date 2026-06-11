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
      content: `(=======================)
( CIM 36-PIECE SORTER   )
(=======================)

G90 ; Set absolute positioning
G21 ; Set metric unit format
G18 ; ZX plane selection
G92 X0 Y0 Z120 A0 B0 ; Preset origin coordinates

#100 = 1200 ; Rapid travel speed mm/min
#101 = 450  ; Plunge feedrate speed mm/min

#120 = -385 ; Pick station center line
#121 = 140

O100 REPEAT [36]

( ========================= )
( CYCLE INITIATION: SECTOR  )
( ========================= )

G01 X0 Z120 A0 B0 F[#100]
M03 S1 ; Start conveyor motor
M66 P1 L3 Q10 ; Interlock: poll input to go HIGH (wait for sensor)
M03 S0 ; Halt conveyor motor on trigger

( ========================= )
( STAGED KINEMATICS PICKUP  )
( ========================= )

G01 X-320 Z80 F800 ; Staged approach above workpiece
G01 X-360 Z40 F600 ; Intermediate descent slide
G01 X-385 Z-60 F400 ; Final pickup dive

M05 P1 ; Engage vacuum suction cup solenoid
G04 P400 ; Dwell for pressure stabilization

G01 X-360 Z20 F600 ; Safe post-pick staged lift
G01 X-300 Z80 F900 ; Retrieve arm back to travel height

( ========================= )
( REAL-TIME COLOR SENSING   )
( ========================= )

#200 = AI1 ; Read Port 1 Red Sensor intensity
#201 = AI2 ; Read Port 2 Green Sensor intensity
#202 = AI3 ; Read Port 3 Blue Sensor intensity

#104 = 315 ; Fallback default: REJECT BIN (X315)

IF [#200 > 150] GOTO O301 ; RED workpiece detected
IF [#201 > 150] GOTO O302 ; GREEN workpiece detected
IF [#202 > 150] GOTO O303 ; BLUE workpiece detected
GOTO O304

O301
#104 = 255 ; Center coordinates RED bin (X255)
GOTO O304

O302
#104 = 195 ; Center coordinates GREEN bin (X195)
GOTO O304

O303
#104 = 135 ; Center coordinates BLUE bin (X135)

O304
( ========================= )
( DISPATCH TO CO-ORDINATE   )
( ========================= )

G01 X[#104] Z80 A0 B45 F900 ; Rapid sweep to target bin
G01 X[#104] Z20 A-60 B180 F500 ; Direct align slide
G01 X[#104] Z-50 A-85 B180 F400 ; Final deposit plunge slide

M05 P0 ; De-energize vacuum suction cup solenoid
G04 P350 ; Dwell to release vacuum pressure

( ========================= )
( ARM RETRACTION SEQUENCE   )
( ========================= )

G01 X280 Z60 A-40 B180 F900 ; Rise clear of sorting bin edges
G01 X0 Z120 A0 B0 F1200 ; Return home for next material piece

O100 ENDREPEAT

M30 ; End of program sequence

Development advice for the app developer:

Separate sensing, decision-making, and motion into three distinct layers. That will stop the arm from starting late or moving inconsistently.
Add a teach/calibration mode so each color bin, pick point, and safe height can be stored and edited without rewriting code.
Add motion profiling with acceleration and deceleration control. Robot arms should not jump straight into full-speed moves.
Build a status panel that shows current joint angles, active sensor values, chosen color, target bin, and last fault reason.
Add a dry-run simulation mode that executes the full path with gripper disabled, so coordinate and kinematic errors can be caught before real pickup.
`
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
