//=============================================================================
//
//     FILE : manualControl.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Manual Control Section:
//            ∙ Provide motion controls for each joint.
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- manualControl Module ------------------------------------------------------------

angular.module ('ManualControlModule', [])

  //-------------------------------------------------------
  //  Controller
  //-------------------------------------------------------
  .controller ('ManualControlController', function ($scope)
  {
    //--- Data --------------------------------------------

    // Valid velocity ramp values are 0-9
    $scope.rampOptions = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9 ];

    // //--- setSpeed ----------------------------------------
    //
    // $scope.setSpeed = function (motor)
    // {
    //   try
    //   {
    //     var speedSpinner = $("#speedSpinner" + motor.MotorIndex);
    //     motor.DefaultSpeed = speedSpinner.val();
    //   }
    //   catch (ex)
    //   {
    //     ShowException (ex);
    //   }
    // }

    //--- goToPosition ------------------------------------

    $scope.goToPosition = function (motor)
    {
      try
      {
        var rangeSlider  = $("#rangeSlider"  + motor.MotorIndex);
        var speedSpinner = $("#speedSpinner" + motor.MotorIndex);
        motor.GoTo (rangeSlider.val(), speedSpinner.val());
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }
  });
