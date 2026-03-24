#include <stdio.h>
#include "utils.h"

int fifo(int pages[], int n, int frames) {
    int frame[frames], count = 0, index = 0;
    for (int i = 0; i < frames; i++) frame[i] = -1;

    printf("\n---- FIFO Simulation ----\n");
    printf("Page   Frames      Result\n");

    for (int i = 0; i < n; i++) {
        int found = 0;
        for (int j = 0; j < frames; j++) {
            if (frame[j] == pages[i]) {
                found = 1;
                break;
            }
        }
        if (!found) {
            frame[index] = pages[i];
            index = (index + 1) % frames;
            count++;
            printf("%-7d", pages[i]);
            printFrames(frame, frames);
            printf("%-8s\n", "FAULT");
        } else {
            printf("%-7d", pages[i]);
            printFrames(frame, frames);
            printf("%-8s\n", "HIT");
        }
    }
    printf("Total Page Faults (FIFO): %d\n", count);
    return count;
}
