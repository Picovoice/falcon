cmake_minimum_required(VERSION 3.13)
project(falcon_demo)

set(CMAKE_C_STANDARD 99)
set(CMAKE_BUILD_TYPE Release)

include_directories("${PROJECT_SOURCE_DIR}/../../include")

add_executable(falcon_demo falcon_demo.c)

if (NOT WIN32)
    target_link_libraries(falcon_demo dl)
endif()
