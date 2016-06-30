//=============================================================================
//
//     FILE : class_DSRobotArm.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Javascript "class" for the D+S Robot Arm
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Constructor -----------------------------------------

function DSRobotArm (rootScope)
{
  try
  {
    this.RootScope = rootScope;
    this.EStopped  = false;

    //--- Motor Array -------------------------------------

    this.Motors = //                            ┌─ default speeds
    [             //                            │
      new StepperMotor (0, 'Base Pivot'      , 500, rootScope),
      new StepperMotor (1, 'Shoulder'        , 500, rootScope),
      new StepperMotor (2, 'Elbow'           , 500, rootScope),
      new StepperMotor (3, 'Forearm Rotation', 500, rootScope),
      new StepperMotor (4, 'Wrist Tilt'      , 500, rootScope),
      new StepperMotor (5, 'Gripper Rotation', 500, rootScope),
      new StepperMotor (6, 'Gripper'         , 500, rootScope)
    ];
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- ParseMotorLimits ----------------------------------

DSRobotArm.prototype.ParseMotorLimits = function (limitString)
{
  try
  {
    // Motor Limit String Format:
    //
    //     ML:ll,ul,ll,ul,ll,ul,ll,ul,ll,ul,ll,ul,ll,ul
    //        └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
    //  Motor:  0     1     2     3     4     5     6
    //
    // where ll = lower limit (positive or negative integer)
    //       ul = upper limit (positive or negative integer)
    //

    // Motor limit string must be at least 30 chars long
    if (limitString.length < 30)
      throw new Error ('Motor limit string must be at least 30 chars');

    // Motor limit string must have 14 limit values
    var limitValues = limitString.substring(3).split (',');
    if (limitValues.length < 14)
      throw new Error ('Motor limit string must have 14 limit values');

    // Set limit values for each motor
    for (var i=0; i<this.Motors.length; i++)
    {
      this.Motors[i].LowerLimit = parseInt (limitValues[2*i  ]);
      this.Motors[i].UpperLimit = parseInt (limitValues[2*i+1]);
    }

    this.RootScope.$apply ();
    this.RootScope.PostMessage ('Motor limits received and set');
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- IsHomed ---------------------------------------------

DSRobotArm.prototype.IsHomed = function ()
{
  try
  {
    // Return true if all motors have been homed
    for (var i=0; i<this.Motors.length; i++)
      if (!(this.Motors[i].Homed))
        return false;

    return true;
  }
  catch (ex)
  {
    ShowException (ex);
  }

  return false;
};

//--- IsMoving --------------------------------------------

DSRobotArm.prototype.IsMoving = function ()
{
  try
  {
    // Return true if any motor is still moving
    for (var i=0; i<this.Motors.length; i++)
      if (this.Motors[i].Moving)
        return true;
  }
  catch (ex)
  {
    ShowException (ex);
  }

  return false;
};

//--- AllEStop --------------------------------------------

DSRobotArm.prototype.AllEStop = function ()
{
  try
  {
    // E-Stop All Motors
    this.RootScope.PostMessage ('ESTOP', true);
    this.EStopped = true;
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- AllEResume ------------------------------------------

DSRobotArm.prototype.AllEResume = function ()
{
  try
  {
    if (this.EStopped)
    {
      // Reset E-Stop Condition
      this.RootScope.PostMessage ('ERESUME', true);
      this.EStopped = false;
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- AllHome ---------------------------------------------

DSRobotArm.prototype.AllHome = function ()
{
  try
  {
    // Send all motors HOME
    for (var i=0; i<this.Motors.length; i++)
      this.Motors[i].GoHome ();
  }
  catch (ex)
  {
    ShowException (ex);
  }
};

//--- SyncGoTo --------------------------------------------

DSRobotArm.prototype.SyncGoTo = function (positionArray, percentMaxSpeed)
{
  try
  {
    // === SYNCHRONIZED MOTION ===
    //
    // The specified position array contains the
    // absolute positions for all motors (0-6).
    // The percent max speed is used to determine
    // the individual speeds for each motor such that
    // all joints reach their target position
    // at the same time.
    //

    var i;
    var numSteps = [this.Motors.length];
    var maxSteps = 0;
    var maxSpeed = StepperMotor.MaxSpeed * percentMaxSpeed / 100;
    var speed;
    
    // Find longest joint movement (max steps)
    for (i=0; i<this.Motors.length; i++)
    {
      numSteps[i] = Math.abs (positionArray[i] - this.Motors[i].Position);
      if (numSteps[i] > maxSteps) maxSteps = numSteps[i];
    }
    
    // Move all motors calculating speeds proportional to max speed (synchronized motion)
    for (i=0; i<this.Motors.length; i++)
    {
      if (numSteps[i] > 0)
      {
        speed = Math.floor (maxSpeed * numSteps[i] / maxSteps);
        if (speed < 1) speed = 100;  // speed can't be zero
        this.Motors[i].GoTo (positionArray[i], speed);
      }
    }
  }
  catch (ex)
  {
    ShowException (ex);
  }
};
