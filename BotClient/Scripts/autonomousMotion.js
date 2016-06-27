//=============================================================================
//
//     FILE : autonomousMotion.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Autonomous Motion Section:
//            ∙ Provide "task" based motion
//            ∙ Attempts to carry out a "task" relying on sensor input
//              and an executing "Rule System"
//            ∙ Provides a means for linking tasks together
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Autonomous Motion Module ------------------------------------------------

angular.module ('AutonomousMotionModule', [])

  //-------------------------
  //  Controller
  //-------------------------
  .controller ('AutonomousMotionController', function ($scope)
  {
    $scope.myFunction = function ()
    {
      try
      {
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }
  });
