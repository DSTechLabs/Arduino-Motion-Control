# Arduino-Motion-Control
Operate any stepper motor robot or CNC machine using simple Arduino Nano boards.

This repository shows a method for operating complex stepper motor machinery, such as an industrial robot arm or CNC machine.  There are three layers of code involved:

The bottom layer is the Arduino firmware that runs a single stepper motor using simple serial commands.  This firmware runs on each of the Arduino boards so they do not interfere with each other. (see the StepperMotorController folder)

The middle layer is the BotServer or CNCServer.  It is a Node.JS application that serves two roles.  1) It uses node-serialport to connect with and process messages to/from the Arduino Nanos.  2) It uses Express and Socket.io to "serve" a website to the end user with Web-Socket messaging. (see the BotServer folder)

The top layer is the website served by the BotServer or CNCServer node app.  It is the complete Motion Control application and interface to the end user.  It communicates with the BotServer by web-socket, so the user actually has a "chat session" with his robot or CNC machine.  Think of the popular CNC software MACH 3/4 as being a web app, so the user can operate the machinery remotely, if need be. (see the BotClient folder)
