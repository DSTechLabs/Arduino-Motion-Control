//=============================================================================
//
//     FILE : app.js
//
//  PROJECT : DSArm Motion Controller
//
//  PURPOSE : Global (root scope) javascript for the
//            DSArm Motion Controller web application.
//
//   AUTHOR : Bill Daniels
//            Copyright 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Application (root) Module ---------------------------

var app = angular.module ('DSMotionController',
                           [
                             'NavBarModule',
                             'IntroModule',
                             'SetupModule',
                             'ManualControlModule',
                             'ScriptedMotionModule',
                             'AutonomousMotionModule',
                             'DiagnosticsModule',
                             'LiveViewModule'
                           ]
                         );

//---------------------------------------------------------
//  $rootScope Globals
//---------------------------------------------------------

app.run (function ($rootScope, $window, $timeout)
{
  //--- Global Data ---------------------------------------

  $rootScope.ConnectionStatus = 'Not Connected';
  $rootScope.MonitorList      = '';
  $rootScope.ScriptFileList   = '';
  $rootScope.ScriptFileData   = '';
  $rootScope.DSArm            = new DSRobotArm ($rootScope);
  $rootScope.AppStatus        = {
                                  condition : 'ERROR',
                                  text      : 'Home positions must be set for all arm joints.'
                                };

  //--- Initialize Web Socket Communication ---------------

  InitWebSocket ();

  //--- Auto-Adjust height of tab content -----------------

  function resizeApp ()
  {
    $(".tabPageContent").height (GetBrowserHeight() - 218);
  }

  angular.element ($window).bind ('resize', resizeApp);

  angular.element(document).ready (function ()
  {
    $timeout (function () { resizeApp(); }, 100);
  });

  //--- IsNavSelected -------------------------------------

  $rootScope.IsNavSelected = function (navButton)
  {
    try
    {
      return $('#' + navButton).prop ('checked');
    }
    catch (ex)
    {
      ShowException (ex);
    }

    return false;
  };

  //--- PostMessage ---------------------------------------

  $rootScope.PostMessage = function (message, sendToBotServer)
  {
    try
    {
      // Send message to the BotServer?
      if (sendToBotServer)
        $rootScope.WebSocket.send (message);

      // Log message to monitor
      $rootScope.MonitorList += GetTimestamp() + ' --> ' + message + '\n';
      $("#monitorBox").scrollTop (9e9);
    }
    catch (ex)
    {
      ShowException (ex);
    }
  };


  //=======================================================
  //  Non-AngularJS Functions
  //=======================================================

  //--- InitWebSocket -------------------------------------

  function InitWebSocket ()
  {
    try
    {
      $rootScope.WebSocket = io ();

      //-------------------------------
      //  Connect
      //-------------------------------
      $rootScope.WebSocket.on ('connect', function ()
      {
        $rootScope.ConnectionStatus = '√ Connected';

        // Request motor limits
        $rootScope.PostMessage ('GetMotorLimits', true);
      });

      //-------------------------------
      //  Disconnect
      //-------------------------------
      $rootScope.WebSocket.on ('disconnect', function ()
      {
        $rootScope.ConnectionStatus = 'Not Connected';
      });

      //-------------------------------
      //  BotServer Messages
      //-------------------------------
      $rootScope.WebSocket.on ('message', function (botServerMessage)
      {
        // Strip trailing <CR><LF>
        botServerMessage = botServerMessage.replace ('\r', '').replace ('\n', '');

        // Log incoming message
        $rootScope.MonitorList += GetTimestamp() + ' <-- ' + botServerMessage + '\n';
        $("#monitorBox").scrollTop (9e9);

        // Parse messages from the Bot Server:

        //--- Motor Limit String ------
        if (botServerMessage.startsWith ('ML:'))
          $rootScope.DSArm.ParseMotorLimits (botServerMessage);

        //--- Script File List --------
        else if (botServerMessage.startsWith ('SFL:') && botServerMessage.length > 4)
          $rootScope.$broadcast ('ScriptFileList', botServerMessage.substring (4));

        //--- Script File Data --------
        else if (botServerMessage.startsWith ('SFD:') && botServerMessage.length > 4)
          $rootScope.$broadcast ('ScriptFileData', botServerMessage.substring (4));

        //--- Autonomous File List ----
        else if (botServerMessage.startsWith ('AUTOL:') && botServerMessage.length > 6)
          $rootScope.$broadcast ('AutoFileList', botServerMessage.substring (6));

        //--- Autonomous File Data ----
        else if (botServerMessage.startsWith ('AUTOD:') && botServerMessage.length > 6)
          $rootScope.$broadcast ('AutoFileData', botServerMessage.substring (6));

        //--- All Other Messages ------
        else
        {
          // All other messages from the BotServer begin with a single digit 0-6
          // to indicate which motor port it came from.
          var motorIndex = botServerMessage.charCodeAt(0) - 48;
          botServerMessage = botServerMessage.substring (1);

          // Handle ROTATE COMPLETE message
          if (botServerMessage.startsWith ('RC'))
          {
            $rootScope.DSArm.Motors[motorIndex].RotateComplete (parseInt (botServerMessage.substring (2)));
            $rootScope.$apply ();
          }
        }
      });
    }
    catch (ex)
    {
      ShowException (ex);
    }
  }

});  // End of app.run()
