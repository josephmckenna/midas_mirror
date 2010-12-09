/********************************************************************\

  Name:         subm_300.c
  Created by:   Stefan Ritt

  Contents:     MSCB program for Cygnal parallel port sub-master
                SUBM300 running on Cygnal C8051F021

  $Id$

\********************************************************************/

#include <stdio.h>
#include <string.h>
#include "mscbemb.h"

/* bit definitions */

#define LPT_DATA         P1     // 8 data bits to LPT

sbit LPT_NSTROBE = P2 ^ 3;      // control/status bits to LPT
sbit LPT_BUSY = P2 ^ 7;
sbit LPT_NDATAREADY = P2 ^ 6;
sbit LPT_NACK = P2 ^ 5;
sbit LPT_BIT9 = P2 ^ 4;

/*------------------------------------------------------------------*/

/* write and read pointers for receive buffer in xdata */
unsigned char xdata *data rbuf_rp;
unsigned char xdata *data rbuf_wp;

bit ti_shadow;


/* dummies needed by mscbutil.c */
MSCB_INFO_VAR code variables[] = {
   0
};

SYS_INFO idata sys_info;

/*------------------------------------------------------------------*/

void setup(void)
{
   watchdog_disable();

   XBR0 = 0x04;                 // Enable RX/TX
   XBR1 = 0x00;

   P2MDOUT = 0x00;              // P2: LPT
   P2MDOUT = 0x00;              // P2: LPT
   P2MDOUT = 0x00;              // P2: LPT
   P2MDOUT = 0x00;              // P2: LPT

   XBR2 = 0x40;                 // Enable crossbar

   /* Port configuration (1 = Push Pull Output) */
   P0MDOUT = 0x01;              // P0.1: TX = Push Pull
   P1MDOUT = 0x00;              // P1: LPT
   P2MDOUT = 0x00;              // P2: LPT
   P3MDOUT = 0xE0;              // P3.5,6,7: Optocouplers

   /* Select external quartz oscillator */
   OSCXCN = 0x66;               // Crystal mode, Power Factor 22E6
   OSCICN = 0x08;               // CLKSL=1 (external)

   /* enable missing clock reset */
   OSCICN |= 0x80;              // MSCLKE = 1

   /* enable reset pin and watchdog reset */
   RSTSRC = 0x09;

   /* start system clock */
   sysclock_init();

   /* initialize UART0 */
   uart_init(0, BD_115200);

   /* clear all dynamic memory */
   rbuf_wp = 0;
   rbuf_rp = 0;

   /* set input ports to one */
   LPT_DATA = 0xFF;
   LPT_NSTROBE = 1;
   LPT_BUSY = 1;
   LPT_NACK = 1;
   LPT_NDATAREADY = 1;
   LPT_BIT9 = 1;

   /* Blink LEDs */
   led_blink(0, 2, 150);
   led_blink(1, 2, 150);

   /* invert second LED */
   led_mode(2, 1);

   watchdog_enable(0);
}

/*------------------------------------------------------------------*/

void serial_int(void) interrupt 4 using 1
{
   if (TI0) {
      /* signal transmitted character */
      ti_shadow = 1;
      TI0 = 0;
   }
   if (RI0) {
      /* check for buffer overflow */
      if (rbuf_wp + 1 == rbuf_rp) {
         RI0 = 0;
         return;
      }

      /* store character in read buffer */
      *rbuf_wp = SBUF0;

      /* increment write pointer with wrap around at 1024 bytes */
      rbuf_wp++;
      if (rbuf_wp == 0x400)
         rbuf_wp = 0;

      RI0 = 0;
   }
}

/*------------------------------------------------------------------*/

void check_lpt()
{
   unsigned char byte;
   bit bit9;
   unsigned long t;

   if (LPT_NSTROBE == 1)
      return;

   led_blink(0, 1, 50);

   /* receive new data */
   byte = LPT_DATA;
   bit9 = LPT_BIT9;

   /* signal busy to PC */
   LPT_BUSY = 1;

   /* send byte to serial port, flash LED */
   RS485_ENABLE = 1;

   TB80 = bit9;
   SBUF0 = byte;

   while (!ti_shadow);          /* wait until interrupt routine acknowledged send */

   RS485_ENABLE = 0;

   ti_shadow = 0;

   t = time();
   while (LPT_NSTROBE == 0) {   /* wait for strobe to be removed */
      watchdog_refresh(1);      /* can take very long (if PC gets context switch) */
      if (time() - t > 100)
         break;
   }

   /* remove busy */
   LPT_BUSY = 0;
}

/*------------------------------------------------------------------*/

void check_rs485()
{
   unsigned char byte;
   unsigned long t;

   /* return if no data in buffer */
   if (rbuf_wp == rbuf_rp)
      return;

   /* abort if PC strobe is active to avoid data collision */
   if (LPT_NSTROBE == 0)
      return;

   led_blink(1, 1, 50);

   /* get received byte */
   byte = *rbuf_rp;

   /* increment read pointer with wrap around at 1024 bytes */
   rbuf_rp = rbuf_rp + 1;
   if (rbuf_rp == 0x400)
      rbuf_rp = 0;

   /* signal new data to PC */
   LPT_NDATAREADY = 0;

   /* wait for PC switched to input with 1s timeout */
   t = time();
   while (LPT_NACK == 1) {
      watchdog_refresh(1);
      if (time() - t > 100)
         break;
   }

   /* switch port to push-pull */
   P1MDOUT = 0xFF;

   /* output data to PC */
   LPT_DATA = byte;

   /* remove data ready */
   LPT_NDATAREADY = 1;

   /* wait until PC has data read with 1s timeout */
   t = time();
   while (LPT_NACK == 0) {
      watchdog_refresh(1);
      if (time() - t > 100)
         break;
   }

   /* switch port to open-drain */
   P1MDOUT = 0x00;

   /* prepare port for input */
   LPT_DATA = 0xFF;

   /* cause PC switch port to output */
   LPT_NDATAREADY = 0;

   /* wait for PC switched to output */
   while (LPT_NACK == 1)
      watchdog_refresh(1);

   /* reset data ready */
   LPT_NDATAREADY = 1;

   /* wait for end of cycle with 1s timeout */
   t = time();
   while (LPT_NACK == 0) {
      watchdog_refresh(1);
      if (time() - t > 100)
         break;
   }
}

/*------------------------------------------------------------------*\

  Main loop

\*------------------------------------------------------------------*/

void main(void)
{
   setup();

   TI0 = 0;
   ti_shadow = 0;
   RS485_ENABLE = 0;

   LPT_BUSY = 0;                /* indicate ready to receive LPT data */

   do {
      watchdog_refresh(0);

      /* check if data from PC */
      check_lpt();

      /* check if data frm RS485 */
      check_rs485();

   } while (1);                 /* repeat forever */

}