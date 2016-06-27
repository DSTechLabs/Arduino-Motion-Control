//=============================================================================
//
//     FILE : intro.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Intro and Overview
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Intro Module ------------------------------------------------------------

angular.module ('IntroModule', [])

  //-------------------------
  //  Controller
  //-------------------------
  .controller ('IntroController', function ($scope)
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
