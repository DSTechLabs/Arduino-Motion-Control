//=============================================================================
//
//     FILE : class_StepperMotor.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Javascript "class" for a Stepper Motor
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Constructor -----------------------------------------

function StepperMotor (motorIndex, name, defaultSpeed, rootScope)
{
  //  motorIndex must be an integer 0..6:
  //    0 = Base
  //    1 = Shoulder
  //    2 = Elbow
  //    3 = Wrist Rotate
  //    4 = Wrist Tilt
  //    5 = Gripper Rotate
  //    6 = Gripper (Grip)

  try
  {
    if (motorIndex < 0 || motorIndex > 6)
      alert ('Invalid motor index: ' + motorIndex.toString() + '\nMust be 0 - 6.');
    else
    {
      this.MotorIndex   = motorIndex.toString ();
      this.Name         = name;
      this.Position     = 0;
      this.LowerLimit   = -2000000;
      this.UpperLimit   = 2000000;
      this.DefaultSpeed = Math.min (Math.max (defaultSpeed, 1), 9999);  // Steps per second
      this.VelRamp      = 6;      // Must be 0...9
      this.Homed        = false;  // HOME position must be set for motor before it can be used
      this.Moving       = false;
      this.Disabled     = false;
      this.RootScope    = rootScope;
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- MaxSpeed (static) -----------------------------------

StepperMotor.MaxSpeed = 4000;  // steps per second

//--- Enable ----------------------------------------------

StepperMotor.prototype.Enable = function ()
{
  try
  {
    // ENABLE motor driver
    var command = 'EN';
    this.RootScope.PostMessage (this.MotorIndex + command, true);
    this.Disabled = false;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- Disable ---------------------------------------------

StepperMotor.prototype.Disable = function ()
{
  try
  {
    // DISABLE motor driver
    var command = 'DI';
    this.RootScope.PostMessage (this.MotorIndex + command, true);
    this.Disabled = true;

    // Also, un-set HOME position since the motor is free to move anywhere
    this.Homed = false;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- SetHomePosition -------------------------------------

StepperMotor.prototype.SetHomePosition = function ()
{
  try
  {
    // Confirm change
    if (confirm ('Change the HOME position of the ' + this.Name + ' motor:\nAre you sure?'))
    {
      // SET HOME POSITION
      var command = 'SH';
      this.RootScope.PostMessage (this.MotorIndex + command, true);
      this.Homed = true;
      this.Position = 0;

      // Change status text if all motors are HOMED
      if (this.RootScope.DSArm.IsHomed ())
      {
        this.RootScope.AppStatus.condition = 'INFO';
        this.RootScope.AppStatus.text      = 'Ready for motion ...';
      }
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- SetLowerLimit ---------------------------------------

StepperMotor.prototype.SetLowerLimit = function (limit)
{
  try
  {
    if (limit > this.UpperLimit)
      alert ('Lower limit must be less than upper limit.');
    else if (confirm ('Change the LOWER LIMIT of the ' + this.Name + ' motor:\nAre you sure?'))
    {
      // SET LOWER LIMIT
      this.LowerLimit = Math.floor (limit);
      var command = 'SL' + this.LowerLimit.toString();
      this.RootScope.PostMessage (this.MotorIndex + command, true);
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- SetUpperLimit ---------------------------------------

StepperMotor.prototype.SetUpperLimit = function (limit)
{
  try
  {
    if (limit < this.LowerLimit)
      alert ('Upper limit must be greater than lower limit.');
    else if (confirm ('Change the UPPER LIMIT of the ' + this.Name + ' motor:\nAre you sure?'))
    {
      // SET UPPER LIMIT
      this.UpperLimit = Math.floor (limit);
      var command = 'SU' + this.UpperLimit.toString();
      this.RootScope.PostMessage (this.MotorIndex + command, true);
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- SetVelocityRamp -------------------------------------

StepperMotor.prototype.SetVelocityRamp = function (rVal)
{
  try
  {
    if (rVal < 0 || rVal > 9)
      alert ('Invalid velocity ramp: ' + rVal.toString() + '\nMust be a single digit 0 - 9');
    else
    {
      // SET RAMP SLOPE
      this.VelRamp = rVal;
      var command  = 'SR' + rVal.toString();
      this.RootScope.PostMessage (this.MotorIndex + command, true);
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- GoHome ----------------------------------------------

StepperMotor.prototype.GoHome = function ()
{
  try
  {
    // Check if E-Stopped
    if (this.RootScope.DSArm.EStopped || !this.Homed) return;

    // ROTATE HOME
    var command = 'RH';
    this.RootScope.PostMessage (this.MotorIndex + command, true);

    this.Position = '...';
    this.Moving = true;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- GoToLower -------------------------------------------

StepperMotor.prototype.GoToLower = function ()
{
  try
  {
    // Check if E-Stopped
    if (this.RootScope.EStopped || !this.Homed) return;

    // ROTATE to LOWER LIMIT
    var command = 'RL';
    this.RootScope.PostMessage (this.MotorIndex + command, true);

    this.Position = '...';
    this.Moving = true;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- GoToUpper -------------------------------------------

StepperMotor.prototype.GoToUpper = function ()
{
  try
  {
    // Check if E-Stopped
    if (this.RootScope.EStopped || !this.Homed) return;

    // ROTATE to UPPER LIMIT
    var command = 'RU';
    this.RootScope.PostMessage (this.MotorIndex + command, true);

    this.Position = '...';
    this.Moving = true;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- GoTo ------------------------------------------------

StepperMotor.prototype.GoTo = function (absolutePosition, speed)
{
  try
  {
    // Check if E-Stopped or not Homed
    if (this.RootScope.EStopped || !this.Homed)
      return;

    // Check if already in position
    if (this.Position == absolutePosition)
      { alert ('Already in position'); return; }

    // Normalize speed
    if (speed == undefined)
      speed = this.DefaultSpeed;
    speed = Math.floor (speed);

    // Check ranges
    if (speed < 1 || speed > StepperMotor.MaxSpeed)
      alert ('Speed out of range: ' + speed.toString());
    else if (absolutePosition < this.LowerLimit || absolutePosition > this.UpperLimit)
      alert ('Position out of range: ' + absolutePosition.toString());
    else
    {
      // ROTATE ABSOLUTE
      var speedString = speed.toString().padRight (' ', 4);
      var command = 'RA' + speedString + (Math.floor (absolutePosition)).toString();
      this.RootScope.PostMessage (this.MotorIndex + command, true);

      this.Position = '...';
      this.Moving = true;
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- Advance ---------------------------------------------

StepperMotor.prototype.Advance = function (numSteps, speed)
{
  try
  {
    // Check if E-Stopped
    if (this.RootScope.EStopped || !this.Homed) return;

    var finalPosition = this.Position + numSteps;
    if (finalPosition < this.LowerLimit || finalPosition > this.UpperLimit)
      alert ('Final position will be out of range: ' + finalPosition.toString());
    else
    {
      // ROTATE RELATIVE
      var speedString = (speed == undefined ? this.DefaultSpeed : Math.min (Math.max (speed, 1), 9999)).toString ().padRight (' ', 4);
      var command = 'RR' + speedString + (Math.floor (numSteps)).toString();
      this.RootScope.PostMessage (this.MotorIndex + command, true);

      this.Position = '...';
      this.Moving = true;
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- RotateComplete --------------------------------------

StepperMotor.prototype.RotateComplete = function (finalPosition)
{
  try
  {
    // Set motor's final position
    this.Position = finalPosition;
    this.Moving = false;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- EStop -----------------------------------------------

StepperMotor.prototype.EStop = function ()
{
  try
  {
    // E-STOP
    var command = 'ES';
    this.RootScope.PostMessage (this.MotorIndex + command, true);
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- BlinkLED --------------------------------------------

StepperMotor.prototype.BlinkLED = function ()
{
  try
  {
    // Blink the onboard LED of the Arduino NANO
    var command = 'BL';
    this.RootScope.PostMessage (this.MotorIndex + command, true);
  }
  catch (ex)
  {
    ShowException (ex);
  }
};
