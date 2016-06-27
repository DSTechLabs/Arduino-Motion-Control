//=============================================================================
//
//     FILE : diagnostics.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Diagnostics Section:
//            ∙ Test individual Arduino NANO board pins
//            ∙ Show all SMC communications
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Diagnostics Module ------------------------------------------------------

angular.module ('DiagnosticsModule', [])

  //-------------------------------------------------------
  //  Controller
  //-------------------------------------------------------
  .controller ('DiagnosticsController', function ($scope, $rootScope)
  {
    //--- Data --------------------------------------------

    $scope.selectedMotor   = $rootScope.DSArm.Motors[0];
    $scope.userCommand     = '';
    $scope.userCommandList = [];

    //--- setSelectedMotor --------------------------------

    $scope.setSelectedMotor = function (index)
    {
      try
      {
        $scope.selectedMotor = $rootScope.DSArm.Motors[index];
      }
      catch (ex)
      {
        ShowException (ex);
      }
    };

    //    //--- togglePin ---------------------------------------
    //
    //    $scope.togglePin = function (pinName, event)
    //    {
    //      try
    //      {
    //        if (pinName == 'LED')
    //          $scope.PostMessage ('BlinkLED');
    //        else
    //        {
    //          $scope.PostMessage (pinName);
    //
    //          var pinButton = event.target;
    //          if (pinButton.style.backgroundColor == 'black')
    //            pinButton.style.backgroundColor = 'green';
    //          else
    //            pinButton.style.backgroundColor = 'black';
    //        }
    //      }
    //      catch (ex)
    //      {
    //        ShowException (ex);
    //      }
    //    }

    //--- customFunction ----------------------------------

    $scope.customFunction = function ()
    {
      try
      {
        var motorIndex = 0;

        function blinkNextMotor ()
        {
          $rootScope.DSArm.Motors[motorIndex].BlinkLED();

          if (++motorIndex > 6)
            clearInterval (starter);
        }

        var starter = setInterval (blinkNextMotor, 30);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- userCommandBox_keyup ----------------------------

    $scope.userCommandBox_keyup = function (keyEvent)
    {
      try
      {
             if (keyEvent.which === 13) $scope.sendCommand ($scope.userCommand);  // [Enter]
        else if (keyEvent.which === 27) $scope.userCommand = '';                  // [Esc]
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }

    //--- sendCommand -------------------------------------

    $scope.sendCommand = function (command)
    {
      try
      {
        // Check if command needs to be added to the select list
        var found = false;
        for (var i=0; i<$scope.userCommandList.length; i++)
        {
          if (command == $scope.userCommandList[i])
          {
            found = true;
            break;
          }
        }
        if (!found)
          $scope.userCommandList.push (command);

        // Prepend the motor index and send command to BotServer
        $rootScope.PostMessage ($scope.selectedMotor.MotorIndex + command, true);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }
  });

