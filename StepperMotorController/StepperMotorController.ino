//==================================================================================================================
//  Stepper Motor Controller, Version 2016-06-14
//
//  Notes  : This firmware is used to operate a single stepper motor from an Arduino NANO board.
//           It is assumed that a host application will provide the serial communications to this firmware.
//
//  Author : Bill Daniels
//           Copyright (c) 2016, D+S Tech Labs Incorporated
//           All Rights Reserved
//==================================================================================================================
//
//  This firmware is designed for the Arduino NANO MCU but may be modified for other boards.
//  It communicates (by 5-volt pins) with micro-stepping motor drivers that take Enable, Direction
//  and Pulse (step) signals.  A typical stepper motor driver would be the MA860H Microstep Driver.
//
//  This firmware receives and executes stepper motor commands by serial communication.
//  Serial communication parameters are set at 57600-baud, 8 data bits, no parity, 1 stop bit.
//  Serial commands are assumed completed when the "newline" '\n' character is received.
//  Carriage Return characters '\r' are ignored and discarded.
//
//  This firmware controls one(1) stepper motor with the following serial commands:
//     EN    = ENABLE                - Enables the motor driver (energizes the motor)
//     DI    = DISABLE               - Disables the motor driver (releases the motor)
//     SH    = SET HOME POSITION     - Sets the current position of the motor as its HOME position (Sets Absolute position to zero)
//     SL... = SET LOWER LIMIT       - Sets the LOWER LIMIT (minimum Absolute Position) of the motor's range
//     SU... = SET UPPER LIMIT       - Sets the UPPER LIMIT (maximum Absolute Position) of the motor's range
//     SRr   = SET RAMP              - Sets the trapezoidal velocity RAMP (up/down) for smooth motor start and stop
//     RA... = ROTATE ABSOLUTE       - Rotates motor to an Absolute target position from its HOME position
//     RR... = ROTATE RELATIVE       - Rotates motor clockwise or counter-clockwise any number of steps from its current position
//     RH    = ROTATE HOME           - Rotates motor to its HOME position
//     RL    = ROTATE LOWER LIMIT    - Rotates motor to its LOWER LIMIT position
//     RU    = ROTATE UPPER LIMIT    - Rotates motor to its UPPER LIMIT position
//     ES    = E-STOP                - Stops the motor immediately (emergency stop), Must use RE to resume operation
//     RE    = RESUME                - Resume normal operation after E-STOP (ENABLE)
//     GA    = GET ABSOLUTE position - Returns the motor's current step position relative to its HOME position
//     GR    = GET RELATIVE position - Returns the motor's current step position relative to its last targeted position
//     GL    = GET LOWER LIMIT       - Returns the motor's Absolute LOWER LIMIT position
//     GU    = GET UPPER LIMIT       - Returns the motor's Absolute UPPER LIMIT position
//     GV    = GET VERSION           - Returns this firmware's current version
//     BL    = BLINK LED             - Blink the onboard LED to indicate identification
//  where r is the velocity ramp rate (0-9).
//
//------------------------------------------------------------------------------------------------------------------
//
//  Motor rotation velocity follows a trapezoidal shape.  A linear ramp-up/ramp-down rate is set by the SR command
//  for each motor.  Along with the motor ID, a single digit ramp value (0-9) is specified:
//
//                                   .--------------------------------.    <-- full velocity
//  A ramp value of 0                |                                |
//  specifies no ramping:            |                                |
//  (not recommended)                |                                |
//                                 --------------------------------------
//  
//                                       .------------------------.        <-- full velocity
//  A ramp value of 5                   /                          \
//  specifies moderate ramping:        /                            \
//  This is the default at startup    /                              \
//                                 --------------------------------------
//
//                                           .----------------.            <-- full velocity
//  A ramp value of 9                      /                    \
//  specifies gradual ramping:           /                        \
//                                     /                            \
//                                 --------------------------------------
//
//  Use low values (1, 2, ..) for fast accelerations with light loads and high values (.., 8, 9) for slow accelerations
//  with heavy loads.  It is highly recommended to use slow acceleration when moving high inertial loads.
//
//                                            ----------    <-- full velocity
//  If there is not enough time to achieve
//  full velocity, then rotation velocity         /\
//  follows a "stunted" triangle path:           /  \
//                                            ----------
//
//  Once a ramp value is set for a motor, all rotate commands for that motor will use its specified ramp value.
//  The default ramp value at start-up is 5 for all motors.
//
//------------------------------------------------------------------------------------------------------------------
//
//  All five ROTATE commands return the string "RCa" to indicate completion of rotation (RC = ROTATE COMPLETE),
//  where a is the new ABSOLUTE POSITION of the motor.  For example, receiving the string "RC-5430" from this
//  firmware indicates rotation is complete and the motor is now at -5430 steps from its HOME position.
//
//  If a Rotate command is received when the motor is already running, then the current rotation is
//  interrupted and the new Rotate command is executed from the motor's current position.
//
//------------------------------------------------------------------------------------------------------------------
//
//  The default LOWER and UPPER Range Limits are set to +2 billion and -2 billion at start up.
//  It is assumed the host (PC) software will set these limits from a configuration file or other means.
//  If a range limit has been reached (the motor's Absolute Position has reached the set LOWER LIMIT or UPPER LIMIT),
//  then the motor's motion is stopped and a Range Error "RE" message is returned.
//
//------------------------------------------------------------------------------------------------------------------
//
//  This firmware may also be queried for position, range limits and firmware version,
//  with the following serial commands:
//     GA = GET ABSOLUTE position - Returns the motor's current step position relative to its HOME position
//     GR = GET RELATIVE position - Returns the motor's current step position relative to its last targeted position
//     GL = GET LOWER LIMIT       - Returns the motor's Absolute LOWER LIMIT position
//     GU = GET UPPER LIMIT       - Returns the motor's Absolute UPPER LIMIT position
//     GV = GET VERSION           - Returns this firmware's current version

//  The returned result is a string with the following format:
//     APs... = Absolute Position of motor m is s steps from its HOME position
//     RPs... = Relative Position of motor m is s steps from its last targeted position
//     LLs... = LOWER LIMIT of motor m relative to its HOME position
//     ULs... = UPPER LIMIT of motor m relative to its HOME position
//  where s is a positive or negative long integer (depending on clockwise or counter-clockwise position)
//  and represents a number of steps which may be 1 to 10 digits plus a possible sign.
//
//  The motor's HOME position is always zero (0).
//
//---------------------------------------------------------------
//  Command String Format: (no spaces between fields)
//---------------------------------------------------------------
//                          cc vvvv sssssssssss<cr><lf>
//                          |   |        |
//  Command/Query ----------*   |        | 
//     [2-chars]                |        |
//     EN = ENABLE              |        |
//     DI = DISABLE             |        |
//     SH = SET HOME            |        |
//     SL = SET LOWER LIMIT     |        |
//     SU = SET UPPER LIMIT     |        |
//     SR = SET RAMP            |        |
//     RA = ROTATE ABSOLUTE     |        |
//     RR = ROTATE RELATIVE     |        |
//     RH = ROTATE HOME         |        |
//     RL = ROTATE LOWER LIMIT  |        |
//     RU = ROTATE UPPER LIMIT  |        |
//     ES = E-STOP              |        |
//     RE = RESUME              |        |
//     GA = GET ABS POSITION    |        |
//     GR = GET REL POSITION    |        |
//     GL = GET LOWER LIMIT     |        |
//     GU = GET UPPER LIMIT     |        |
//     GV = GET VERSION         |        |
//     BL = BLINK               |        |
//                              |        |
//  Velocity Ramp Rate ---------*        |
//     [1-digit] 0 - 9          |        |
//     (For SR command only)    |        |
//                              |        |  ----.
//  Velocity (steps per sec) ---*        |      |
//     [4-digits] 1___ - 9999            |      |
//     Right-padded with spaces          |      |
//                                       |      |
//  Absolute or Relative Step Position --*      |--- For ROTATE commands only
//     [1 to 10-digits plus sign]               |
//     No padding necessary                     |
//     -2147483648 to 2147483647 (long)         |
//     Positive values = Clockwise              |
//     Negative values = Counter-Clockwise      |
//                                          ----*
//---------------------------------------------------------------
//  Examples: (quotes are not included in string)
//---------------------------------------------------------------
//  "EN"            - ENABLE                - Enable the stepper motor driver
//  "DI"            - DISABLE               - Disable the stepper motor driver
//  "SH"            - SET HOME              - Set the current position of the motor as its HOME position (which is zero)
//  "RA500 2000"    - ROTATE ABSOLUTE       - Rotate the motor at 500 steps per second, to Absolute position of +2000 steps clockwise from HOME
//  "RR3210-12000"  - ROTATE RELATIVE       - Rotate the motor at 3210 steps per second, -12000 steps counter-clockwise from its current position
//  "RH"            - ROTATE HOME           - Rotate motor back to its HOME position (0)
//  "RL"            - ROTATE to LOWER LIMIT - Rotate motor to its LOWER LIMIT position
//  "SR6"           - SET RAMP              - Set the velocity ramp-up/ramp-down rate to 6
//  "ES"            - EMERGENCY STOP        - Immediately stop the motor and cancel rotation command
//  "GR"            - GET RELATIVE POSITION - Get the current relative step position of the motor
//
//---------------------------------------------------------------
//  Arduino NANO Pin Connections:
//---------------------------------------------------------------
//
//  A stepper motor driver requires three(3) Arduino pins to operate; Enable, Direction and Pulse.
//  Using the Arduino NANO board:
//
//  GROUND    = (GND)
//  Enable    = digital pin 2 (D02)
//  Direction = digital pin 3 (D03)
//  Pulse     = digital pin 4 (D04)
//
//  (GND) should be used for common ground.
//  Future connections will include LOW and HIGH Limit Switch inputs.
//
//==================================================================================================================

#include <string.h>

#define SERIAL_BAUDRATE     57600
#define MAX_COMMAND_LENGTH     17
#define HOME_LIMIT_SPEED    1000L
#define PULSE_WIDTH             3  // 3-microseconds (check your driver's pulse width requirement)
#define HOLD_PULSE_HIGH     __asm__volatile("nop\n\tnop\n\tnop\n\tnop")  // Each nop (no operation instruction) is 63-nanoseconds

enum MotorStates
{
  ENABLED,   // Motor driver is enabled, this is the normal idle/holding state
  DISABLED,  // Motor driver is disable, motor can be manually rotated
  RUNNING,   // Motor is running (rotating) and is currently executing a Rotate command
  ESTOPPED   // Motor is in an E-STOP condition (Emergency Stop), a Resume commmand (RE) must be issued to re-enable
};

//=== Data ================================================

const char Version[]    = "Stepper Motor Controller 2016-06-14, Copyright 2013-2016, D+S Tech Labs, Inc. - All Rights Reserved.";
const int  LEDPin       = 13;
const int  EnablePin    = 2;
const int  DirectionPin = 3;
const int  PulsePin     = 4;
const long RampScale    = 5L;

char NextChar          [ 2] = "A";
char CommandString     [25] = "";
char Command           [ 3] = "";
char MaxVelocityString [ 6] = "";
long MaxVelocity, TargetOrSteps, TotalSteps, StepCount;

MotorStates    MotorState = ENABLED;
long           StepIncrement;      // 1 for clockwise rotations, -1 for counter-clockwise
long           AbsolutePosition;
long           DeltaPosition;
long           TargetPosition;     // Target position for end of rotation
long           LowerLimit;         // Minimum step position
long           UpperLimit;         // Maximum step position
long           RampSteps;          // Total number of steps during ramping
long           RampDownStep;       // Step at which to start ramping down
long           Velocity;           // Current velocity of motor
long           VelocityIncrement;  // Velocity adjustment for ramping (determined by ramp factor)
unsigned long  NextStepMicros;     // Target micros for next step


//==========================================================
//  setup
//==========================================================

void setup ()
{
  // Set all pin modes as DIGITAL OUTPUT's
  pinMode (LEDPin      , OUTPUT);
  pinMode (EnablePin   , OUTPUT);
  pinMode (DirectionPin, OUTPUT);
  pinMode (PulsePin    , OUTPUT);
    
  // Initialize pins
  digitalWrite (LEDPin      , LOW);  // Turn off LED
  digitalWrite (EnablePin   , LOW);  // Enabled
  digitalWrite (DirectionPin, LOW);  // Counter-Clockwise
  digitalWrite (PulsePin    , LOW);  // No Pulse
    
  // Set motor state and step position/timing
  MotorState       = ENABLED;
  StepIncrement    = 1L;
  AbsolutePosition = 0L;
  DeltaPosition    = 0L;
  TargetPosition   = 0L;
  LowerLimit       = -2000000000L;
  UpperLimit       =  2000000000L;
    
  VelocityIncrement = RampScale * 5L;  // Default ramp scale of 5
  NextStepMicros    = -1L;
  
  // Start serial communication
  Serial.begin (SERIAL_BAUDRATE);
  Serial.flush ();

  digitalWrite (LEDPin, HIGH);  // Indicate board is ready
}


//==========================================================
//  loop
//==========================================================

void loop ()
{
  // Check serial port for any host commands
  if (Serial.available ())
  {
    NextChar[0] = (char) Serial.read ();
    if (NextChar[0] != '\r')
    {
      if (NextChar[0] == '\n' || strlen (CommandString) >= MAX_COMMAND_LENGTH)
      {
        ExecuteCommand ();
        CommandString[0] = 0;  // Clear the command string
      }
      else
      {
        NextChar[1] = 0;
        strcat (CommandString, NextChar);  // Tack char onto Command String
      }
    }
  }
  
  // Keep the motor running
  StepTheMotor ();
}


//==========================================================
//  StepTheMotor
//==========================================================

void StepTheMotor ()
{
  long  nextPosition;
  
  // If motor is RUNNING and it's time for it to step, then issue step pulse
  
  // Is motor Running?
  if (MotorState == RUNNING)
  {
    // Is it time to step?
    if (micros() >= NextStepMicros)
    {
      // Check range limits
      nextPosition = AbsolutePosition + StepIncrement;
      if (nextPosition < LowerLimit || nextPosition > UpperLimit)
      {
        // Next step will be out of range
        MotorState = ENABLED;
        Serial.println ("RE");  // Range Error
      }
      else
      {
        //=============================================================================
        // Perform FAST step pulse using direct port register
        //=============================================================================
        PORTD |= B00010000;   // Turn on Pulse pin (Arduino NANO Digital Pin 4)
        delayMicroseconds (PULSE_WIDTH);
        PORTD &= ~B00010000;  // Turn off Pulse pin
        
        // Increment positions
        AbsolutePosition = nextPosition;
        DeltaPosition   += StepIncrement;
      
        // Has motor reached end of commanded rotation?
        if (nextPosition == TargetPosition)
        {
          // Yes, stop motor and indicate completion with position
          MotorState = ENABLED;
          Serial.print ("RC"); Serial.println (AbsolutePosition);
        }
        else
        {
          // No, so continue motion
          StepCount = abs (DeltaPosition);

          if (StepCount <= RampSteps)
          {
            // Ramping up
            Velocity += VelocityIncrement;
          }
          else if (StepCount > RampDownStep)
          {
            // Ramping down
            Velocity -= VelocityIncrement;
          }

          // Set time for next step
          NextStepMicros += 1000000L / Velocity;
        } 
      }
    }
  }
}


//==========================================================
//  ExecuteCommand
//==========================================================

void ExecuteCommand ()
{
  // Command string must be at least 2 chars
  if (strlen (CommandString) < 2) return;
  
  // Set 2-Char Command and parse all commands
  strlcpy (Command, CommandString, 3);

  //======================================================
  //  Emergency Stop (ESTOP)
  //  I check this first for quick processing
  //======================================================
  if (strcmp (Command, "ES") == 0)
  {
    // Emergency Stop
    digitalWrite (PulsePin, LOW);
    MotorState = ESTOPPED;
    TargetPosition = AbsolutePosition;
    
    // Indicate rotate complete with current position
    Serial.print ("RC"); Serial.println (AbsolutePosition);
  }
      
  //======================================================
  //  Enable / Disable / Resume from E-Stop
  //======================================================
  else if (strcmp (Command, "EN") == 0)
  {
    if (MotorState == DISABLED)
    {
      // Enable motor driver
      digitalWrite (EnablePin, LOW);
      MotorState = ENABLED;
    }
  }
  else if (strcmp (Command, "DI") == 0)
  {
    if (MotorState != RUNNING)
    {
      // Disable motor driver
      digitalWrite (EnablePin, HIGH);
      MotorState = DISABLED;
    }
  }
  else if (strcmp (Command, "RE") == 0)
  {
    if (MotorState == ESTOPPED)
    {
      // Enable motor driver
      digitalWrite (EnablePin, LOW);
      MotorState = ENABLED;
    }
  }

  //======================================================
  //  Ignore all other commands if E-Stopped
  //======================================================
  else if (MotorState == ESTOPPED)
  {
    Serial.println ("E-Stopped");
    return;
  }
  
  //======================================================
  //  Rotate Commands
  //======================================================
  else if (strcmp (Command, "RA") == 0 ||
           strcmp (Command, "RR") == 0 ||
           strcmp (Command, "RH") == 0 ||
           strcmp (Command, "RL") == 0 ||
           strcmp (Command, "RU") == 0)
  {
    if (strcmp (Command, "RH") == 0)
    {
      MaxVelocity    = HOME_LIMIT_SPEED;
      TargetPosition = 0L;  // HOME position
      TotalSteps     = abs (AbsolutePosition);
    }
    else if (strcmp (Command, "RL") == 0)
    {
      MaxVelocity    = HOME_LIMIT_SPEED;
      TargetPosition = LowerLimit;
      TotalSteps     = abs (AbsolutePosition - LowerLimit);
    }
    else if (strcmp (Command, "RU") == 0)
    {
      MaxVelocity    = HOME_LIMIT_SPEED;
      TargetPosition = UpperLimit;
      TotalSteps     = abs (AbsolutePosition - UpperLimit);
    }
    else
    {
      // Rotate command must be at least 7 chars
      if (strlen (CommandString) < 7)
      {
        Serial.print ("Bad command: "); Serial.println (CommandString);
        return;
      }
      
      // Parse max velocity and target
      strlcpy (MaxVelocityString, CommandString + 2, 5);  // Velocity is 4-chars
      MaxVelocityString[4] = 0;  // Ensure string termination
      MaxVelocity = atol (MaxVelocityString);
      
      TargetOrSteps = atol (CommandString + 6);
      if (strcmp (Command, "RA") == 0)
      {
        TargetPosition = TargetOrSteps;  // Set Absolute Position
        TotalSteps     = abs (TargetOrSteps - AbsolutePosition);
      }
      else
      {
        TargetPosition = AbsolutePosition + TargetOrSteps;  // Set Relative Position
        TotalSteps     = abs (TargetOrSteps);
      }
    }
      
    // Determine number of steps in ramp and set starting speed
    if (VelocityIncrement == 0L)
    {
      // Immediate full speed, no ramping
      RampSteps = 0L;
      Velocity  = MaxVelocity;  // Start at full velocity
    }
    else
    {
      // Ramp up
      RampSteps = MaxVelocity / VelocityIncrement;
      if (RampSteps == 0)
        Velocity = MaxVelocity;  // Start at slow value
      else
        Velocity = 0L;  // Start from a stand-still
    }
    
    // Set on what step to start ramping down
    if (TotalSteps > 2L * RampSteps)
      RampDownStep = TotalSteps - RampSteps;  // Normal trapezoid velocity
    else
      RampDownStep = RampSteps = TotalSteps / 2L;  // Stunted triangle velocity
    
    // Set Direction  
    if (AbsolutePosition > TargetPosition)
    {
      StepIncrement = -1L;
      digitalWrite (DirectionPin, LOW);  // Counter-clockwise
    }
    else if (AbsolutePosition < TargetPosition)
    {
      StepIncrement = 1L;
      digitalWrite (DirectionPin, HIGH);  // Clockwise
    }
    else
    {
      // Motor is already at Target position
      Serial.print ("RC"); Serial.println (AbsolutePosition);
      return;
    }
    
    // Start rotation
    DeltaPosition  = 0L;
    NextStepMicros = micros() + 5L;  // Direction must be set 5-microseconds before stepping
    MotorState     = RUNNING;
    return;
  }
  
  //======================================================
  //  Set HOME Position, LOWER and UPPER Limits
  //======================================================
  else if (strcmp (Command, "SH") == 0)
  {
    // Set current position as HOME position (only if ENABLED)
    if (MotorState == ENABLED)
    {
      AbsolutePosition = 0L;
      DeltaPosition    = 0L;
    }
  }
  else if (strcmp (Command, "SL") == 0)
  {
    // Check for value
    if (strlen (CommandString) > 2)
    {
      // Set LOWER LIMIT to specified value
      LowerLimit = atol (CommandString + 2);
    }
    else
    {
      Serial.print ("Bad command: "); Serial.println (CommandString);
    }
  }
  else if (strcmp (Command, "SU") == 0)
  {
    // Check for value
    if (strlen (CommandString) > 2)
    {
      // Set UPPER LIMIT to specified value
      UpperLimit = atol (CommandString + 2);
    }
    else
    {
      Serial.print ("Bad command: "); Serial.println (CommandString);
    }
  }
  
  //======================================================
  //  Set Velocity Ramp Factor
  //======================================================
  else if (strcmp (Command, "SR") == 0)
  {
    // Check for value
    if (strlen (CommandString) == 3)
    {
      // Check specified ramp factor
      if (CommandString[2] >= '0' && CommandString[2] <= '9')
      {
        // Set velocity slope (increment)
        long rampFactor = atol (CommandString + 2);
        if (rampFactor == 0L)
          VelocityIncrement = 0L;  // constant full velocity
        else
          VelocityIncrement = RampScale * (10L - rampFactor);
      }
    }
  }

  //======================================================
  //  Query Commands and Blink
  //======================================================
  else if (strcmp (Command, "GA") == 0)
  {
    // Get Absolute Position
    Serial.print ("AP"); Serial.println (AbsolutePosition);
  }
  else if (strcmp (Command, "GR") == 0)
  {
    // Get Relative Position
    Serial.print ("RP"); Serial.println (DeltaPosition);
  }
  else if (strcmp (Command, "GL") == 0)
  {
    // Get Lower Limit
    Serial.print ("LL"); Serial.println (LowerLimit);
  }
  else if (strcmp (Command, "GU") == 0)
  {
    // Get Upper Limit
    Serial.print ("UL"); Serial.println (UpperLimit);
  }
  else if (strcmp (Command, "GV") == 0)
  {
    // Get Firmware Version
    Serial.println (Version);
  }
  else if (strcmp (Command, "BL") == 0)
  {
    // Blink onboard LED
    for (int i=0; i<8; i++)
    {
      digitalWrite (LEDPin, LOW);
      delay (100);
      digitalWrite (LEDPin, HIGH);
      delay (100);
    }
  }
  else
  {
    // Unknown Command
    Serial.print ("Unknown command: "); Serial.println (Command);
  }
}

