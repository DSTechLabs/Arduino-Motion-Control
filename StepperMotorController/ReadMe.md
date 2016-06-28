This Arduino firmware is intended for the Nano board, but any board can be used by changing the pins used for Enable, Direction and Pulse.

I first started running multiple stepper motors on one Arduino Mega 2560 board.  The firmware could run up to eight(8) motors but noticed it got bogged down if more than three motors where asked to run at 1000 steps per second at the same time.

So then I switched to the Beaglebone Black board.  Although it runs 60 times faster than Arduino, it has a full Linux OS to also run, which interrupted the stepper motor code.  So the PRU processors had to be used instead of the main ARM processor.  This lead to Device Tree Overlay complications and more complexity.  Plus the Beaglebone Black GPIO pins only output 3.3-volts, not 5-volts which most stepper driver boards required.

So why not just use multiple Arduino Nano boards?  You get separate independent processors and 5-volt GPIO without the hassle of Linux or the PRU processors or Device Tree Overlays!  And an Arduino Nano clone is less than $3.50 each.

The set of Nano's can be plugged into a USB Hub, and with a USB-Serial device driver all the boards show up as separate serial ports.

Alternatively, a Bluetooth board, like the HC-05, can be used with each Nano board for wireless communication.
