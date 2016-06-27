//=============================================================================
//
//     FILE : setup.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Setup Section:
//            ∙ Set all motor home positions and range limits
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Setup Module ------------------------------------------------------------

var setupModule = angular.module ('SetupModule', []);

//---------------------------------------------------------
//  Controller
//---------------------------------------------------------
setupModule.controller ('SetupController', function ($scope)
{
  //--- Data ----------------------------------------------

  $scope.class_UnHomed =
  {
    'height'     : '38px',
    'color'      : '#FFFFFF',
    'background' : '#C00000'
  };

  $scope.class_Homed =
  {
    'height'     : '38px',
    'color'      : '#C0C0C0',
    'background' : '#008000'
  };

});

