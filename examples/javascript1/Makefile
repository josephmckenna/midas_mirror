# Makefile

MIDAS_OS=linux

ifndef MIDASSYS
MIDASSYS=$(HOME)/packages/midas
MIDAS_OS=linux
endif

#ifndef MIDASSYS
#MIDASSYS=$(HOME)/daq/midas
#MIDAS_OS=darwin
#endif

OSFLAGS  = -DOS_LINUX -Dextname
CFLAGS   = -g -O2 -Wall -Wuninitialized -I$(MIDASSYS)/include -I$(DRV_DIR) -I$(HOME)/daq/rootana
CXXFLAGS = $(CFLAGS)

#OSFLAGS += -m32

LIBS = -lm -lutil -lpthread

ifeq ($(MIDAS_OS),linux)
LIBS += -lrt
endif

# MIDAS library
MIDASLIBS = $(MIDASSYS)/$(MIDAS_OS)/lib/libmidas.a
MFE       = $(MIDASSYS)/$(MIDAS_OS)/lib/mfe.o

all:: fejrpc.exe
all:: fesimdaq.exe

%.exe: %.o $(MIDASLIBS) $(MFE)
	$(CXX) -o $@ $(CXXFLAGS) $(OSFLAGS) $^ $(MIDASLIBS) $(LIBS)

%.o: %.c
	$(CC) $(CFLAGS) $(OSFLAGS) -c $<

%.o: %.cxx
	$(CXX) $(CXXFLAGS) $(OSFLAGS) -c $<

clean::
	-rm -f *.o *.exe

# end
