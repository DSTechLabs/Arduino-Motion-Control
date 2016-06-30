//=============================================================================
//
//     FILE : DSBotServer.js
//
//  PROJECT : DSArm-One NodeBot
//
//  PURPOSE : This Node.JS module is a Stepper Motor Command Server used for
//            robotics.
//
//            - It acts as a small Web Server and "serves" the UI Web
//              Application that controls a robot's motion, called the
//              D+S Motion Controller.
//
//            - This module also acts as a web socket server.  It receives
//              motor commands from the D+S Motion Controller (web app)
//              in near-real-time by web socket.
//
//            - This module uses seven(7) serial ports to communicate with
//              seven(7) Ardunio NANO boards - one for each joint of the
//              DSArm-One robot arm.
//
//            - You must set the environment variable:
//                UV_THREADPOOL_SIZE=32
//
//            - This module is executed by:
//                node DSBotServer.js
//
//   AUTHOR : Bill Daniels
//            Copyright (c) 2014-2016, D+S Tech Labs, Inc.
//            All Rights Reserved
//
//=============================================================================

//--- Globals -----------------------------------------------------------------

const NUM_MOTORS        = 7;  // Must be 7
var   ArmMotors         = [NUM_MOTORS];
var   CurrentMotorIndex = 0;
var   FileSystem        = undefined;
var   WebSocket         = undefined;
var   BotServer         = undefined;

//--- Startup -----------------------------------------------------------------

console.log ();
console.log ('▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀');
console.log ('          B O T  S E R V E R  (2016.06.21)');
console.log ();
console.log ('  Author: Bill Daniels');
console.log ('          Copyright 2014-2016, D+S Tech Labs, Inc.');
console.log ('          All Rights Reserved.');
console.log ();
console.log ('              Press [Ctrl-C] to exit');
console.log ('▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄');
console.log ();

// Initialize all seven Arduino NANO serial ports
InitMotorPorts ();

// Catch the SIGINT interrupt [Ctrl-C] to close gracefully
process.on ('SIGINT', CloseMotorPorts);


//-----------------------------------------------------------------------------
//  InitMotorPorts
//-----------------------------------------------------------------------------

function InitMotorPorts ()
{
  try
  {
    // Load required modules for file system and serial port
    // (Thanks to voodootikigod/node-serialport on github)
    // The default number of serial ports that can be opened is 4,
    // so you must set the environment variable: UV_THREADPOOL_SIZE=32
    FileSystem        = require ("fs");
    var SerialPortLib = require ("serialport");
    var SerialPort    = SerialPortLib.SerialPort;
    var dataCallbacks = [NUM_MOTORS];

    // Load motor configurations from [motorConfigs.json]
    var motorConfigs = FileSystem.readFileSync ('motorConfigs.json')
    if (motorConfigs == undefined)
      PostMessage ('Unable to load motor configs:  Check [motorConfigs.json] file.', false);
    else
    {
      // Load the ArmMotors array
      ArmMotors = JSON.parse (motorConfigs.toString());

      if (ArmMotors.length != NUM_MOTORS)
        PostMessage ('Invalid motor configs:  Must have seven(7) motors defined.  Check [motorConfigs.json] file.', false);
      else
      {
        // Define the callback functions for incoming data from the firmware
        // This cannot be done in a loop since the loop index will not be valid at time of call
        dataCallbacks[0] = function (firmwareMessage) { PostMessage ('0' + firmwareMessage, true); };
        dataCallbacks[1] = function (firmwareMessage) { PostMessage ('1' + firmwareMessage, true); };
        dataCallbacks[2] = function (firmwareMessage) { PostMessage ('2' + firmwareMessage, true); };
        dataCallbacks[3] = function (firmwareMessage) { PostMessage ('3' + firmwareMessage, true); };
        dataCallbacks[4] = function (firmwareMessage) { PostMessage ('4' + firmwareMessage, true); };
        dataCallbacks[5] = function (firmwareMessage) { PostMessage ('5' + firmwareMessage, true); };
        dataCallbacks[6] = function (firmwareMessage) { PostMessage ('6' + firmwareMessage, true); };

        // Instantiate serial ports
        for (var i=0; i<NUM_MOTORS; i++)
          ArmMotors[i].serialPort = new SerialPort (ArmMotors[i].portName,
                                                    {
                                                      baudRate     : 57600,
                                                      dataBits     : 8,
                                                      stopBits     : 1,
                                                      parity       : 'none',
                                                      parser       : SerialPortLib.parsers.readline('\n'),
                                                      dataCallback : dataCallbacks[i]
                                                    },
                                                    false);  // do not open serial port yet

        // Open the first motor port
        // Other ports will open recursively
        CurrentMotorIndex = 0;
        OpenNextMotorPort ();
      }
    }
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}

//--- OpenNextMotorPort -------------------------------------------------------

function OpenNextMotorPort ()
{
  try
  {
    if (CurrentMotorIndex >= NUM_MOTORS)
      return;

    ArmMotors[CurrentMotorIndex].serialPort.open (function (error)
    {
      if (error)
        PostMessage ('Unable to open serial port ' + ArmMotors[CurrentMotorIndex].portName, false);
      else
        PostMessage (ArmMotors[CurrentMotorIndex].portName + ' opened for ' + ArmMotors[CurrentMotorIndex].motorName, false);

      // Recursively open the next motor's serial port
      if (++CurrentMotorIndex < NUM_MOTORS)
        setTimeout (OpenNextMotorPort, 100);  // delay between opening serial ports
      else
        // All motor serial ports are open ...
        // Initialize web server and web socket messaging
        InitServers (2016);
    });
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}

//--- CloseMotorPorts -------------------------------------

function CloseMotorPorts ()
{
  try
  {
    // Close all serial ports
    ArmMotors.forEach (function (motor)
    {
      if (motor.serialPort != undefined)
      {
        if (motor.serialPort.isOpen ())
        {
          motor.serialPort.close ();
          PostMessage (motor.portName + ' closed', false);
        }
      }
    });
  }
  catch (ex)
  {
    ShowException (ex);
  }

  process.exit ();
}


//-----------------------------------------------------------------------------
//  InitServers
//-----------------------------------------------------------------------------

function InitServers (port)
{
  try
  {
    // Load required modules for web and socket servers
    var express = require ('express');
    BotServer   = express ();
    var http    = require ('http').Server (BotServer);
    var io      = require ('socket.io')(http);

    // Set location of website files:
    //
    //  parent directory
    //    ├── BotClient (the D+S Motion Control Web App)
    //    └── BotServer (this code)
    //
    BotServer.use (express.static ('../BotClient/'));  // __dirname +

    // Socket Event handling
    io.on ('connection', function (webSocket)
    {
      // Save global reference to websocket and indicate connection
      WebSocket = webSocket;

      // Process Motion Controller messages
      WebSocket.on ('message', ProcessClientMessage);
    });

    // Start the web server
    http.listen (port, function ()  // NOT botServer.listen () !!!
    {
      PostMessage ('The D+S BotServer is listening on port [' + port.toString() + ']', true);
    });
  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}

//--- ProcessClientMessage ------------------------------------

function ProcessClientMessage (clientMessage)
{
  try
  {
    var i, motorLimitString;

    PostMessage (clientMessage, false);

    // Parse message:

    //---------------------------------
    // ESTOP
    // Handle this message first for immediate response.
    //---------------------------------
    if (clientMessage == 'ESTOP')
    {
      // Immediately stop all motors
      for (i=0; i<NUM_MOTORS; i++)
        ArmMotors[i].serialPort.write ('ES\n');

      PostMessage ('E-Stopped', true);
      return;
    }

    //---------------------------------
    // Handle Motor Firmware Messages next for speed:
    // MCU Motor Firmware messages begin with a single digit 0-6
    // to indicate which motor port to direct the message.
    //---------------------------------
    var motorIndex = clientMessage.charCodeAt(0) - 48;
    if (motorIndex >= 0 && motorIndex <= 6)
      ArmMotors[motorIndex].serialPort.write (clientMessage.substring (1) + '\n');

    //---------------------------------
    // ERESUME
    //---------------------------------
    else if (clientMessage == 'ERESUME')
    {
      // Resume all motors
      for (i=0; i<NUM_MOTORS; i++)
        ArmMotors[i].serialPort.write ('RE\n');

      PostMessage ('E-Resumed', true);
    }

    //---------------------------------
    // Get Motor Limits
    //---------------------------------
    else if (clientMessage == 'GetMotorLimits')
    {
      // Send the current motor limit values to the client:

      // Motor Limit String Format:
      //
      //     ML:ll,ul,ll,ul,ll,ul,ll,ul,ll,ul,ll,ul,ll,ul
      //        └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘
      //  Motor:  0     1     2     3     4     5     6
      //
      // where ll = lower limit (positive or negative integer)
      //       ul = upper limit (positive or negative integer)
      //

      motorLimitString = 'ML:';
      for (i=0; i<NUM_MOTORS; i++)
        motorLimitString += ArmMotors[i].lowerLimit + ',' + ArmMotors[i].upperLimit + ',';

      // Remove last comma
      motorLimitString = motorLimitString.substring (0, motorLimitString.length - 1);
      PostMessage (motorLimitString, true);
    }

    ////---------------------------------
    //// Set Motor Limits
    ////---------------------------------
    //else if (clientMessage.startsWith ('ML:'))
    //{
    //  // Save the specified motor limits in <motorConfigs.json>
    //
    //
    //
    //}

    //---------------------------------
    // Get Script File List
    //---------------------------------
    else if (clientMessage == 'GetScriptFileList')
    {
      FileSystem.readdir ('MotionScripts', function (error, files)
      {
        if (error)
          PostMessage ('SFL:No files', true);
        else
        {
          var sflString = 'SFL:';

          // Send array of SMO filenames as a comma delimited string
          files.forEach (function (name)
          {
            if (name.endsWith ('.smo'))
              sflString += name + ',';
          });
          
          // Remove last comma if any
          if (sflString.endsWith (','))
            sflString = sflString.substring (0, sflString.length - 1);

          PostMessage (sflString, true);
        }
      });
    }

    //---------------------------------
    // Get Script File Data
    //---------------------------------
    else if (clientMessage.startsWith ('GetScriptFileData:'))
    {
      if (clientMessage.length > 22 && clientMessage.endsWith ('.smo'))
      {
        var scriptFilename = clientMessage.substring (18);
        FileSystem.readFile ('MotionScripts/' + scriptFilename, function (error, data)
        {
          if (error)
            PostMessage (error, true);
          else
            PostMessage ('SFD:' + data, true);
        });
      }
      else
        PostMessage ('Bad script filename: ' + clientMessage.substring (18), true);
    }

    //---------------------------------
    // Save Script File Data
    //---------------------------------
    else if (clientMessage.startsWith ('SFD:'))
    {
      if (clientMessage.length > 32 && clientMessage.contains ('.smo') && clientMessage.contains ('|'))
      {
        var scriptFilename = clientMessage.substring (4, clientMessage.indexOf ('|'));
        var data           = clientMessage.substring (clientMessage.indexOf ('|') + 1);

        FileSystem.writeFile ('MotionScripts/' + scriptFilename, data, function (error)
        {
          if (error)
            PostMessage ('Error saving script file: ' + error);
        });
      }
      else
        PostMessage ('Bad script file data: ' + clientMessage);
    }








    //---------------------------------
    // Autonomous File Handling ...
    //   GetAutoFileList
    //   GetAutoFileData:
    //   Save (AFD:)
    //---------------------------------







  }
  catch (ex)
  {
    ShowException (ex, WebSocket);
  }
}

//--- PostMessage -----------------------------------------

function PostMessage (message, sendToClient)
{
  try
  {
    // Send to client app by WebSocket, if specified
    if (sendToClient && (WebSocket != undefined))
      WebSocket.send (message);

    // Strip trailing <CR><LF>
    message = message.replace ('\r', '').replace ('\n', '');

    // Get current timestamp
    var newDate   = new Date ();
    var timestamp = newDate.getHours        ().toString().padLeft  ('0', 2) + ':' +
                    newDate.getMinutes      ().toString().padLeft  ('0', 2) + ':' +
                    newDate.getSeconds      ().toString().padLeft  ('0', 2) + '.' +
                    newDate.getMilliseconds ().toString().padRight ('0', 3);

    // Echo message to console
    console.log (timestamp + ': ' + message);
  }
  catch (ex)
  {
    console.log (ex.message);
  }
}


//=============================================================================
//  Utility Functions
//=============================================================================

//---------------------------------------------------------
//  String Functions
//---------------------------------------------------------

if (typeof String.prototype.startsWith != 'function')
{
  String.prototype.startsWith = function (string)
  {
    return this.slice (0, string.length) == string;
  };
}

if (typeof String.prototype.endsWith != 'function')
{
  String.prototype.endsWith = function (string)
  {
    return this.slice (-string.length) == string;
  };
}

if (typeof String.prototype.padLeft != 'function')
{
  String.prototype.padLeft = function (padChar, totalLength)
  {
    var paddedString = this;

    while (paddedString.length < totalLength)
      paddedString = padChar + paddedString;

    return paddedString;
  };
}

if (typeof String.prototype.padRight != 'function')
{
  String.prototype.padRight = function (padChar, totalLength)
  {
    var paddedString = this;

    while (paddedString.length < totalLength)
      paddedString += padChar;

    return paddedString;
  };
}

if (typeof String.prototype.replaceAll != 'function')
{
  String.prototype.replaceAll = function (search, replace)
  {
    if (replace === undefined)
      return this.toString();

    return this.split (search).join (replace);
  }
}

if (typeof String.prototype.contains != 'function')
{
  String.prototype.contains = function (search)
  {
    return (this.indexOf (search) >= 0);
  }
}

//--- GetTimestamp ----------------------------------------

function GetTimestamp ()
{
  try
  {
    // Return a current timestamp
    var newDate   = new Date ();
    var timestamp = newDate.getHours        ().toString().padLeft  ('0', 2) + ':' +
                    newDate.getMinutes      ().toString().padLeft  ('0', 2) + ':' +
                    newDate.getSeconds      ().toString().padLeft  ('0', 2) + '.' +
                    newDate.getMilliseconds ().toString().padRight ('0', 3);

    return timestamp;
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//--- GetMicros -------------------------------------------

function GetMicros ()
{
  try
  {
    // Get current number of microseconds from Node's HR Timer
    // - I've discovered that calling process.hrtime() takes a variable amount of time,
    //   sometimes 8us, sometimes 12us.
    var hrTime = process.hrtime ();
    return (hrTime[0] * 1000000 + hrTime[1] / 1000);
  }
  catch (ex)
  {
    ShowException (ex);
  }
}

//---------------------------------------------------------
//  Exception Handling
//---------------------------------------------------------

function ShowException (ex)
{
  // Show exception details
  try
  {
    var msg = '███ Exception ███ ';
    if (ex.message == undefined)
      msg += ex;
    else
      msg += ex.message + '\n' + ex.filename + ' (line ' + ex.lineNumber + ')';

    console.log ('\n' + msg + '\n');
  }
  catch (exSE)
  {
    console.log ('Exception in ShowException():\n' + exSE.message);
  }
}
