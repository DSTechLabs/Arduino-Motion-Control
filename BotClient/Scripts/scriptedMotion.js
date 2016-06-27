//=============================================================================
//
//     FILE : scriptedMotion.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Scripted Motion Section:
//            ∙ Provides an editor for defining a set (script) of target
//              positions and timings.
//            ∙ Provides script storage and execution.
//
//    NOTES : An SMO (Script File) contains a single string of text data with
//            Each line holds eleven(11) strings that define an arm position name,
//            absolute positions of all joints, speed, hold time and a skip flag.
//
//            The eleven(11) strings are delimited by commas:
//
//            - Position Name
//            - Base Rotation -----.
//            - Shoulder           |
//            - Elbow              | Absolute
//            - Forearm Rotation   | Position
//            - Wrist Tilt         | Values
//            - Gripper Rotation   |
//            - Gripper -----------*           
//            - % Max Speed
//            - Hold Time (ms)
//            - Skip line (true/false)
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Scripted Motion Module --------------------------------------------------

angular.module ('ScriptedMotionModule', [])

  //-------------------------
  //  Controller
  //-------------------------
  .controller ('ScriptedMotionController', function ($scope, $rootScope, $interval, $timeout)
  {
    //--- Data --------------------------------------------

    $scope.scriptFileList = [];         // list of script files on the BotServer
    $scope.scriptFile     = undefined;  // selected script file
    $scope.positionRows   = [];         // array of position objects
    $scope.executeIndex   = 0;          // current row index while executing script
    $scope.waitForArm     = undefined;  // $interval to check if arm is still moving

    //--- newScript ---------------------------------------

    $scope.newScript = function ()
    {
      try
      {
        //if (!saved)
        // *** Changes not saved ***
        //else
        //{
          // Clear all position data
          $scope.positionRows.length = 0;

          // Add "starter" row
          var position =
          {
            positionName    : '',
            baseRot         : 0,
            shoulder        : 0,
            elbow           : 0,
            forearmRot      : 0,
            wristTilt       : 0,
            gripperRot      : 0,
            gripper         : 0,
            percentMaxSpeed : 50,
            holdTime        : 100,
            skip            : false
          };
        
          $scope.positionRows.push (position);
        //}
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- getScriptFile -----------------------------------

    $scope.getScriptFileData = function ()
    {
      try
      {
        if ($scope.scriptFile != undefined)
          $rootScope.PostMessage ('GetScriptFileData:' + $scope.scriptFile, true);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- processScriptFileList ---------------------------

    $scope.processScriptFileList = function (event, data)
    {
      try
      {
        $scope.scriptFileList = data.split (',');
        //$scope.$apply ();
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- processScriptFileData ---------------------------

    $scope.processScriptFileData = function (event, data)
    {
      try
      {
        // Split data into separate lines
        var scriptFileLines = data.split ('|');
        var i, lineValues, percentMaxSpeed, speed, position;

        // Clear all position data
        $scope.positionRows.length = 0;

        scriptFileLines.forEach (function (lineData)
        {
          // Split line into separate position values
          lineValues = lineData.split (',');
          if (lineValues.length < 11)
          {
            alert ('Bad script file: Each line must have 11 elements');
            return;
          }
                
          // Build position object from script line values
          // <positionRows> is an array of these position objects
          position =
          {
            positionName    : lineValues[0],
            baseRot         : parseInt (lineValues[1]),
            shoulder        : parseInt (lineValues[2]),
            elbow           : parseInt (lineValues[3]),
            forearmRot      : parseInt (lineValues[4]),
            wristTilt       : parseInt (lineValues[5]),
            gripperRot      : parseInt (lineValues[6]),
            gripper         : parseInt (lineValues[7]),
            percentMaxSpeed : parseInt (lineValues[8]),
            holdTime        : parseInt (lineValues[9]),
            skip            : lineValues[10] == 'true'
          };
        
          $scope.positionRows.push (position);
        });

        $scope.$apply ();
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- goToPosition ------------------------------------

    $scope.goToPosition = function (index)
    {
      try
      {
        // Move all joints of the arm to their specified positions
        var positionArray = [];

        positionArray.push ($scope.positionRows[index].baseRot   );
        positionArray.push ($scope.positionRows[index].shoulder  );
        positionArray.push ($scope.positionRows[index].elbow     );
        positionArray.push ($scope.positionRows[index].forearmRot);
        positionArray.push ($scope.positionRows[index].wristTilt );
        positionArray.push ($scope.positionRows[index].gripperRot);
        positionArray.push ($scope.positionRows[index].gripper   );

        $rootScope.DSArm.SyncGoTo (positionArray, $scope.positionRows[index].percentMaxSpeed);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- deletePosition ----------------------------------

    $scope.deletePosition = function (index)
    {
      try
      {
        if (index > -1 && confirm ("Delete position " + (index + 1).toString() + "?\nAre you sure?"))
        {
          // Remove position row
          $scope.positionRows.splice (index, 1);
        }
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- addNewPosition ----------------------------------

    $scope.addNewPosition = function ()
    {
      try
      {
        // Add new position
        var newPosition =
        {
          positionName    : '',
          baseRot         : 0,
          shoulder        : 0,
          elbow           : 0,
          forearmRot      : 0,
          wristTilt       : 0,
          gripperRot      : 0,
          gripper         : 0,
          percentMaxSpeed : 50,
          holdTime        : 1000,
          skip            : false
        };

        $scope.positionRows.push (newPosition);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- saveScript --------------------------------------

    $scope.saveScript = function ()
    {
      try
      {
        // Send script data to BotServer to save in file
        var scriptFileData = 'SFD:' + $scope.scriptFile + '|';

        $scope.positionRows.forEach (function (row)
        {
          scriptFileData += row.positionName + ',';

          row.baseRot         = Math.floor (row.baseRot        ); scriptFileData += row.baseRot        .toString() + ',';
          row.shoulder        = Math.floor (row.shoulder       ); scriptFileData += row.shoulder       .toString() + ',';
          row.elbow           = Math.floor (row.elbow          ); scriptFileData += row.elbow          .toString() + ',';
          row.forearmRot      = Math.floor (row.forearmRot     ); scriptFileData += row.forearmRot     .toString() + ',';
          row.wristTilt       = Math.floor (row.wristTilt      ); scriptFileData += row.wristTilt      .toString() + ',';
          row.gripperRot      = Math.floor (row.gripperRot     ); scriptFileData += row.gripperRot     .toString() + ',';
          row.gripper         = Math.floor (row.gripper        ); scriptFileData += row.gripper        .toString() + ',';
          row.percentMaxSpeed = Math.floor (row.percentMaxSpeed); scriptFileData += row.percentMaxSpeed.toString() + ',';
          row.holdTime        = Math.floor (row.holdTime       ); scriptFileData += row.holdTime       .toString() + ',';
          row.skip            = Math.floor (row.skip           ); scriptFileData += (row.skip ? 'true':'false')    + '|';
        });

        // Remove last '|'
        scriptFileData = scriptFileData.substring (0, scriptFileData.length - 1);

        $rootScope.PostMessage (scriptFileData, true);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- allHome -----------------------------------------

    $scope.allHome = function ()
    {
      try
      {
        // Send all motors to their HOME position
        $rootScope.DSArm.AllHome ();
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- startExecute ------------------------------------

    $scope.startExecute = function ()
    {
      try
      {
        // Reset position index
        $scope.executeIndex = -1;

        // Move the arm through each position pausing their respective Hold Time's
        $scope.continueExecute1 ();
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- continueExecute1 --------------------------------

    $scope.continueExecute1 = function ()
    {
      try
      {
        do
        {
          // Check if done
          if (++$scope.executeIndex >= $scope.positionRows.length)
            return;
        }
        while ($scope.positionRows[$scope.executeIndex].skip)  // Check if skipping this position

        // Highlight active row
        $("#positionRow" + $scope.executeIndex).css ('background-color', '#E07038');

        // Move arm to next position
        $scope.goToPosition ($scope.executeIndex);

        // Wait until Arm is no longer moving
        // (all joints have reached their target position)
        $scope.waitForArm = $interval (function ()
        {
          if (!($rootScope.DSArm.IsMoving ()))
          {
            // Stop and cancel the interval
            $interval.cancel ($scope.waitForArm);
            $scope.waitForArm = undefined;

            // Pause the Hold Time
            $timeout ($scope.continueExecute2, $scope.positionRows[$scope.executeIndex].holdTime);
          }
        }, 100);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- continueExecute2 --------------------------------

    $scope.continueExecute2 = function ()
    {
      try
      {
        // Un-Highlight active row
        $("#positionRow" + $scope.executeIndex).css ('background-color', '#FFFFFF');

        // Continue motion
        $scope.continueExecute1 ();
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }


    //-----------------------------------------------------
    //  Constructor
    //-----------------------------------------------------

    // Register the process method when a script file list is received from the BotServer
    $scope.$on ('ScriptFileList', $scope.processScriptFileList);

    // Register the process method when script file data is received from the BotServer
    $scope.$on ('ScriptFileData', $scope.processScriptFileData);

    // Get list of script files from server
    $rootScope.PostMessage ('GetScriptFileList', true);
  });
