/********************************************************************\

  Name:         rs232.h
  Created by:   Stefan Ritt

  Contents:     Header file for RS232 communication routines


  Revision history
  ------------------------------------------------------------------
  date         by    modification
  ---------    ---   ------------------------------------------------
  26-MAR-97    SR    created


\********************************************************************/

int  rs232_init(char *port, int baud, char parity,
              int data_bit, int stop_bit, int mode);
void rs232_exit(int hDev);
void rs232_putc(int port, char c);
void rs232_puts(int port, char *str);
int  rs232_gets(int port, char *s, int size, int end_char);
int  rs232_waitfor(int port, char *s, char *retstr, int size, int timeout);
void rs232_debug(BOOL flag);