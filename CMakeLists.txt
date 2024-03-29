#
# CMakeLists.txt for midas
#
# S.R. 28 May 2019
#

project(midas)
cmake_minimum_required(VERSION 3.1)

#
# Directories
#

# do not install under /usr/local, but under current directory
set(CMAKE_INSTALL_PREFIX ${CMAKE_SOURCE_DIR})
set(SYSLIB_DIR ${CMAKE_SOURCE_DIR}/lib)
set(SYSINC_DIR ${CMAKE_SOURCE_DIR}/include)
set(MXML_DIR ${CMAKE_SOURCE_DIR}/../mxml)
set(MSCB_DIR ${CMAKE_SOURCE_DIR}/../mscb)

#####################################################################
# Nothing needs to be modified after this line
#####################################################################

#
# Configurable options. Use "ccmake .." to change them.
#
option(USE_MYSQL   "mlogger begin/end of run info and history" OFF)
option(USE_ODBC    "history ODBC logging" OFF)
option(USE_SQLITE  "history sqlite logging" OFF)
option(USE_MSCB    "mhttpd mscb support" OFF)

#
# Check for MIDASSYS environment variable
#
if (EXISTS $ENV{MIDASSYS})
   set(MIDASSYS $ENV{MIDASSYS})
else()
   message(FATAL_ERROR "\nMissing definition of environment variable 'MIDASSYS'!")
endif()

#
# Optional ROOT support
#
execute_process(COMMAND root-config --version OUTPUT_VARIABLE HAVE_ROOT)
if (HAVE_ROOT)
   string(REGEX REPLACE "\n" "" HAVE_ROOT ${HAVE_ROOT})
   message("Found ROOT version " ${HAVE_ROOT})
   execute_process(COMMAND root-config --incdir OUTPUT_VARIABLE ROOT_INC)
   execute_process(COMMAND root-config --libs OUTPUT_VARIABLE ROOT_LIBS)
   string(STRIP ${ROOT_LIBS} ROOT_LIBS)
   add_definitions(-DHAVE_ROOT)
endif(HAVE_ROOT)

#
# Optional SSL support for mhttpd
#
find_package(OpenSSL)
if (OPENSSL_FOUND)
   message("Found OpenSSL version" ${OPENSSL_VERSION})
endif()

#
# Optional MYSQL library for mlogger and for the history
#
if (USE_MYSQL)
   execute_process(COMMAND mysql_config --version OUTPUT_VARIABLE HAVE_MYSQL)
endif(USE_MYSQL)

#
# Optional ODBC history support
#
if (USE_ODBC)
   if (EXISTS /usr/include/sql.h)
      set(HAVE_ODBC 1)
   endif()
endif(USE_ODBC)

#
# Optional SQLITE history support
#
if (USE_SQLITE)
   if (EXISTS /usr/include/sqlite3.h)
      set(HAVE_SQLITE 1)
   endif()
endif(USE_SQLITE)

#
# Indicator that MSCB is available
#
if (USE_MSCB)
   if (EXISTS ${MSCB_DIR})
      set(HAVE_MSCB 1)
      add_definitions(-DHAVE_MSCB)
   endif()
endif(USE_MSCB)

#-----------------------
# Common flags
#
add_compile_options(-Wall -Wno-strict-aliasing -Wuninitialized -Wno-unused-function)
set(CMAKE_CXX_STANDARD 11)

#-----------------------
# Include directories
#
include_directories(${SYSINC_DIR} ${DRV_DIR} ${MXML_DIR} ${MSCB_DIR}/include)
include_directories(${CMAKE_SOURCE_DIR}/drivers)
include_directories(${OPENSSL_INCLUDE_DIR})

#-----------------------
# Mongoose server
#
add_definitions(-DHAVE_MONGOOSE6 -DMG_ENABLE_THREADS -DMG_DISABLE_CGI)
if (OPENSSL_FOUND)
   add_definitions(-DMG_ENABLE_SSL)
endif(OPENSSL_FOUND)

#####################################################################
# Conditional code for various OS'es
#####################################################################

#-----------------------
# MacOSC/Darwin
#
if (${CMAKE_SYSTEM_NAME} MATCHES Darwin)
endif()

#-----------------------
# This is for Linux
#
if (${CMAKE_SYSTEM_NAME} MATCHES Linux)
   # >2GB file support
   add_definitions(-D_LARGEFILE64_SOURCE)
   set(LIBS -lpthread -lutil -lrt)
endif()

#####################################################################
# end of conditional code
#####################################################################

#
# Midas Library
#
add_library(midas STATIC 
   src/midas.c
   src/midas_cxx.cxx
   src/odb.c
   src/device_driver.c
   src/system.c
   src/alarm.c
   src/elog.c
   src/mrpc.c
   src/mjson.cxx
   src/json_paste.cxx
   src/mjsonrpc.cxx
   src/mjsonrpc_user.cxx
   src/history.c
   src/history_common.cxx
   src/history_midas.cxx
   src/history_odbc.cxx
   src/history_schema.cxx
   src/lz4.c
   src/lz4frame.c
   src/lz4hc.c
   src/xxhash.c
   src/crc32c.c
   src/sha256.c
   src/sha512.c
   src/ftplib.c
   progs/mdsupport.cxx
   ${MXML_DIR}/mxml.c
   ${MXML_DIR}/strlcpy.c
   ${GIT_REVISION}
   )

install(TARGETS midas
        LIBRARY DESTINATION lib
        ARCHIVE DESTINATION lib)

#####################################################################
# generate git revision file
#####################################################################

find_package(Git)
set(GIT_REVISION ${CMAKE_SOURCE_DIR}/include/git-revision.h)
set(GIT_REVISION_TMP ${GIT_REVISION}.tmp)

add_custom_target(git_revision_h
   COMMAND ${CMAKE_COMMAND} -E echo_append "\\#define GIT_REVISION \\\"" > ${GIT_REVISION_TMP}
   COMMAND ${GIT_EXECUTABLE} log -n 1 --pretty=format:"%ad" >> ${GIT_REVISION_TMP}
   COMMAND ${CMAKE_COMMAND} -E echo_append " - " >> ${GIT_REVISION_TMP}
   COMMAND ${GIT_EXECUTABLE} log -n 1 --pretty=format:"%h" >> ${GIT_REVISION_TMP}
   COMMAND ${CMAKE_COMMAND} -E echo \\\" >> ${GIT_REVISION_TMP}
   COMMAND ${CMAKE_COMMAND} -E copy_if_different ${GIT_REVISION_TMP} ${GIT_REVISION}
   COMMAND ${CMAKE_COMMAND} -E remove ${GIT_REVISION_TMP}
   WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}/include/
)

add_dependencies(midas git_revision_h)

#####################################################################
# sub-projects
#####################################################################
add_subdirectory(progs)
add_subdirectory(examples)
