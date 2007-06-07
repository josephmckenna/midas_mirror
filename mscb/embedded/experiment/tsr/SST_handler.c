/**********************************************************************************\
  Name:         SST_handler.c
  Created by:   Brian Lee						     May/11/2007


  Contents:     SST protocol for temperature sensor array (ADT7486A)

  Version:		Rev 1.1

  Last updated: May/31/2007
  				- Finished Commenting (Rev 1.0 Completed)
				- Got rid of exp function, replaced with different and simpler algorithm
				- Separated some funtions to another file called ADT7486A_tsensor.c and .h
					(Rev 1.1)
\**********************************************************************************/

// --------------------------------------------------------
//  Include files
// --------------------------------------------------------
#include    "../../mscbemb.h"
#include "SST_handler.h"

/* SST related variables */
sbit SST = SST1; //This variable chooses between SST lines (e.g. SST1, SST2, etc)
				 //Default to SST1
				 //SFR definitions of SST1 and SST2 ports are defined in mscbemb.h
sbit SST_ClientResponse = SST1_ClientResponse; //Response read through
											   //comparator output

/* CRC-8 Table for Polynomial x^8 + x^2 + x^1 + 1 (used for FCS in SST Protocol) */
unsigned char code FCS_data[] = {
	0x00, 0x07, 0x0e, 0x09, 0x1c, 0x1b, 0x12, 0x15,
	0x38, 0x3f, 0x36, 0x31, 0x24, 0x23, 0x2a, 0x2d, 
	0x70, 0x77, 0x7e, 0x79, 0x6c, 0x6b, 0x62, 0x65, 
	0x48, 0x4f, 0x46, 0x41, 0x54, 0x53, 0x5a, 0x5d, 
	0xe0, 0xe7, 0xee, 0xe9, 0xfc, 0xfb, 0xf2, 0xf5, 
	0xd8, 0xdf, 0xd6, 0xd1, 0xc4, 0xc3, 0xca, 0xcd, 
	0x90, 0x97, 0x9e, 0x99, 0x8c, 0x8b, 0x82, 0x85, 
	0xa8, 0xaf, 0xa6, 0xa1, 0xb4, 0xb3, 0xba, 0xbd, 
	0xc7, 0xc0, 0xc9, 0xce, 0xdb, 0xdc, 0xd5, 0xd2, 
	0xff, 0xf8, 0xf1, 0xf6, 0xe3, 0xe4, 0xed, 0xea, 
	0xb7, 0xb0, 0xb9, 0xbe, 0xab, 0xac, 0xa5, 0xa2, 
	0x8f, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9d, 0x9a, 
	0x27, 0x20, 0x29, 0x2e, 0x3b, 0x3c, 0x35, 0x32, 
	0x1f, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0d, 0x0a, 
	0x57, 0x50, 0x59, 0x5e, 0x4b, 0x4c, 0x45, 0x42, 
	0x6f, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7d, 0x7a, 
	0x89, 0x8e, 0x87, 0x80, 0x95, 0x92, 0x9b, 0x9c, 
	0xb1, 0xb6, 0xbf, 0xb8, 0xad, 0xaa, 0xa3, 0xa4, 
	0xf9, 0xfe, 0xf7, 0xf0, 0xe5, 0xe2, 0xeb, 0xec, 
	0xc1, 0xc6, 0xcf, 0xc8, 0xdd, 0xda, 0xd3, 0xd4, 
	0x69, 0x6e, 0x67, 0x60, 0x75, 0x72, 0x7b, 0x7c, 
	0x51, 0x56, 0x5f, 0x58, 0x4d, 0x4a, 0x43, 0x44, 
	0x19, 0x1e, 0x17, 0x10, 0x05, 0x02, 0x0b, 0x0c, 
	0x21, 0x26, 0x2f, 0x28, 0x3d, 0x3a, 0x33, 0x34, 
	0x4e, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5c, 0x5b, 
	0x76, 0x71, 0x78, 0x7f, 0x6a, 0x6d, 0x64, 0x63, 
	0x3e, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2c, 0x2b, 
	0x06, 0x01, 0x08, 0x0f, 0x1a, 0x1d, 0x14, 0x13, 
	0xae, 0xa9, 0xa0, 0xa7, 0xb2, 0xb5, 0xbc, 0xbb, 
	0x96, 0x91, 0x98, 0x9f, 0x8a, 0x8d, 0x84, 0x83, 
	0xde, 0xd9, 0xd0, 0xd7, 0xc2, 0xc5, 0xcc, 0xcb, 
	0xe6, 0xe1, 0xe8, 0xef, 0xfa, 0xfd, 0xf4, 0xf3,
};

unsigned char FCS_Step(unsigned int msg, unsigned char fcs)
/**********************************************************************************\

  Routine: FCS_step

  Purpose: Single calculation for 8-bit cyclic redundancy checksum
  		   usually used in FORWARD recursive format (to save code-space)

  Input:
    unsigned char msg       new msg
    unsigned char fcs       running fcs

  Function value:
    unsighend char          FCS (CRC-8) code

\**********************************************************************************/
{
   return FCS_data[(msg ^ fcs)];
}

void SST_Init(void)
/**********************************************************************************\

  Routine: init_ADT7486A

  Purpose: ADT7486A temperature sensor array initialization

  Input:
    void

  Function value:
    void

\**********************************************************************************/
{	
	SWITCH_TO_SST1; //default the SST line to SST1
	
	//Set the SST1 and SST2 pin output mode to be push-pull
	//and put the voltage divider controlling pin to push-pull mode
	P2MDOUT = 0x13;	

	//Set P1 ^ 1 to low so that it accepts the ~650mV set by voltage divider
	P1_1 = 0;
	P1_0 = 0;
	
	//Clear the SST signals (drive to Low for 2 * T_BIT)
	SST_Clear();

	yield(); //keep refreshing watchdog
}

void SST_Clear(void)
/**********************************************************************************\

  Routine: SST_Clear

  Purpose: To drive SST line to low for a reasonably long time
  		   which gives enough time for the next temperature conversion
		   and get SST ready for the next message transaction

  Input:
    void

  Function value:
    void

\**********************************************************************************/
{
	// Test this, high low high low
	SST = 0;
	delay_ms(100); //clear to 0's
}

void SST_DrvHigh(void)
/**********************************************************************************\

  Routine: SST_DrvHigh

  Purpose: To drive SST line to a logic "high" or "1", which is 
  		   defined as driving SST high 3/4 cycle of t_Bit and the 
		   rest of it low

  Input:
    void

  Function value:
    void

\**********************************************************************************/
{
	// Drive high for 0.75 * T_BIT
	SST = 1;
	delay_us(T_H1);
	SST = 0; //drive the rest of T_BIT low
	delay_us(T_BIT - T_H1);
}

void SST_DrvLow(void)
/**********************************************************************************\

  Routine: SST_DrvLow

  Purpose: To drive SST line to a logic "low" or "0", which is 
  		   defined as driving SST high for 1/4 cycle of t_Bit and the 
		   rest of it low

  Input:
    void

  Function value:
    void

\**********************************************************************************/
{
	// Drive high for 0.25 * T_BIT
	SST = 1;
	delay_us(T_H0);
	SST = 0; //drive the rest of T_BIT low
	delay_us(T_BIT - T_H0);
}

unsigned char SST_DrvClientResponse(void)
/**********************************************************************************\

  Routine: SST_DrvClientResponse

  Purpose: To drive SST line to a logic "low" or "0", which is 
  		   defined as driving SST high for 1/4 cycle of t_Bit and the 
		   rest of it low

  Input:
    void

  Function value:
    unsigned char			Value of Read Bits from Client's Response
							Only 1 or 0 (gone through comparator)

\**********************************************************************************/
{
	// Drive SST to logic "0" (high 1/4, low 3/4) to let Client
	// drive SST to its desired state
	P2MDOUT = 0x13; //put SST line to push-pull mode
	SST = 1; //Drv high (originator drives SST bus high to toggle client's response

	P2MDOUT = 0x12; //put back to open-drain to listen to client's response
	
	delay_us(T_BIT / 2); //delay for half of T_BIT time

	if(SST_ClientResponse == 1)
	//if the comparator output is high, then return 1
	{
		delay_us(2 * T_H0);
		return 1;
	}
	else
	//if the comparator output is low, then return 0
	{
		delay_us(2 * T_H0);
		return 0;
	}
}

void SST_DrvByte(unsigned char datByte)
/**********************************************************************************\

  Routine: SST_DrvByte

  Purpose: To decode the input Byte and drive SST Low or High according
  		   to the binary data bits defined in datByte

  Input:
    unsigned char datByte		a Byte (8 bits) that the originator
								wants to drive SST to
								e.g.) 0100 1100 (0x4C, one of addresses)

  Function value:
    void

\**********************************************************************************/
{
	//declare local variables
	unsigned char toBeDrv = 0;
	int i = 0;

	for(i = 7; i >= 0; i--) //8bits in 1 byte
	{
		toBeDrv = (datByte >> i) & 0x1;
		if(toBeDrv == 0) //if the bit to be driven is logic 0
		{
			SST_DrvLow();
		}
		else if(toBeDrv == 1) //if the bit to be driven is logic 1
		{
			SST_DrvHigh();
		}
		else //if the bit to be driven is neither 0 nor 1
		{
			return; //error
		}
	}	
}

float SST_Read(unsigned char writeFCS_Originator, unsigned char cmdFlag)
/**********************************************************************************\

  Routine: SST_Read

  Purpose: Read only needs to be working for reading 2 bytes of info
		   Which are Internal Temp, External Temp1, and External Temp2
		   Others should be verified on oscilloscope since mscb returns a data at maximum
		   4bytes, (allTemp and GetDIB commands take 6 bytes and 16 bytes, which is impossible anyway)

  Input:
    unsigned char writeFCS_Originator	Originator's writeFCS 
	unsigned char cmdFlag				a Flag used to distinguish
										if the command is a Ping/Reset
										or not

  Function value:
    float								value of Data given by 
										the Client in response to
										Originator's commands
										(converted Temperature value)

\**********************************************************************************/
{	
	//declare local variables
	unsigned char din = 0;
	unsigned char LSB_Received = 0x00; //Max 2bytes of info from 3 different possible commands
	unsigned char MSB_Received = 0x00; //for reading, GetIntTemp, GetExtTemp1, GetExtTemp2
	unsigned char writeFCS_Client = 0x00;
	unsigned char readFCS_Client = 0x00; //used for both writeFCS and readFCS
	signed char j = 0;
	float convertedTemp = 0.0;

	for(j = 7; j >= 0; j--) //writeFCS, 1byte
	{
		//Send logic 0's to let client drive SST for Read Bits
		din = SST_DrvClientResponse();
		writeFCS_Client |= (din << j);
	}
	
	//writeFCS check
	if(writeFCS_Originator != writeFCS_Client)
	{
		return ((float) -300.0); //if the FCS's don't match up, then return -300
	}

	if(cmdFlag == 0x00) //If it's not the Ping Command or SetOffSet command
	{
		//Take the data in to a variable called datareceived
		for(j = 7; j >= 0; j--) //LSB
		{
			//Send logic 0's to let client drive SST for Read Bits
			din = SST_DrvClientResponse();
			LSB_Received |= (din << j);
		}
		for(j = 7; j >= 0; j--) //MSB
		{
			//Send logic 0's to let client drive SST for Read Bits
			din = SST_DrvClientResponse();
			MSB_Received |= (din << j);
		}
		for(j = 7; j >= 0; j--) //readFCS, 1byte
		{
			//Send logic 0's to let client drive SST for Read Bits
			din = SST_DrvClientResponse();
			readFCS_Client |= (din << j);
		}

		//Here, reading data is finished, now analyze the received data

		//Check FCS
		//returns -300 because absolute low temperature is -273 degree Celsius, so this value
		//suitable for error reporting value
		//test = FCS(cmdData, 6); //then check for 5 bytes	
		if(FCS_Step(MSB_Received, FCS_Step(LSB_Received, 0x00)) != readFCS_Client) //readFCS check
		{
			return ((float) -300.0); //if the FCS's don't match up, then return -300
		}		
	
		//Conver the Temperature according to the structure of bits defined by
		//ADT7486A manual
		//Convert 2bytes of temperature from 
		//GetExt1OffSet/GetExt2OffSet/GetIntTemp()/GetExt1Temp()/GetExt2Temp() commands
		//Mask out the first bit (sign bit)
		//and if the sign bit is 1, then do two's complement
		if((MSB_Received & 0x80) == 0x80) 
		{
			MSB_Received = ~MSB_Received;
			LSB_Received = ~LSB_Received + 0x01;
		}
		
		//Calculate the converted Temperature
		convertedTemp = ((float) (MSB_Received * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 2 * 0.015625)) + ((float) (LSB_Received * 0.015625));
	}
	else //If it is the Ping Command or SetOffSet command
	{
		return -500;
	}

	//return the converted temperature value
	return convertedTemp;
}

void SST_SwitchLine(unsigned char lineNum)
{
	if(lineNum == 1) 
	{
		SWITCH_TO_SST1; //Switch to SST1 line
	}
	if(lineNum == 2)
	{
		SWITCH_TO_SST2; //Switch to SST2 line
	}
}


