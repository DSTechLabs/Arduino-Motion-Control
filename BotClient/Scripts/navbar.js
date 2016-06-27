//=============================================================================
//
//     FILE : navbar.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Navigation bar and buttons
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Navigation Module -------------------------------------------------------

angular.module ('NavBarModule', [])

  //-------------------------
  //  Controller
  //-------------------------
  .controller ('NavBarController', function ($scope)
  {
    //--- navButton_mousedown -----------------------------
    $scope.navButton_mousedown = function (radioButton)
    {
      try
      {
        $('#' + radioButton).prop ('checked', true);
      }
      catch (ex)
      {
        ShowException (ex);
      }
    }
  });
