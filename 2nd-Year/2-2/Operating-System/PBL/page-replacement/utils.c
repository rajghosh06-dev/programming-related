#include <stdio.h>
#include "utils.h"

void printFrames(int frame[], int frames) {
    for (int i = 0; i < frames; i++) {
        if (frame[i] == -1)
            printf("%-3s", "-");   // dash with width 3
        else
            printf("%-3d", frame[i]); // number with width 3
    }
    printf("   "); // spacing before result column
}
