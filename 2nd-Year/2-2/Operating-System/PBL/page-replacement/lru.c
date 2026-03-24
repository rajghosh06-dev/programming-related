#include <stdio.h>
#include "utils.h"

int lru(int pages[], int n, int frames) {
    int frame[frames], last_used[frames], count = 0;
    for (int i = 0; i < frames; i++) {
        frame[i] = -1;
        last_used[i] = -1;
    }

    printf("\n----  LRU Simulation ----\n");
    printf("Page   Frames      Result\n");

    for (int i = 0; i < n; i++) {
        int found = 0;
        for (int j = 0; j < frames; j++) {
            if (frame[j] == pages[i]) {
                found = 1;
                last_used[j] = i;
                break;
            }
        }
        if (!found) {
            int min_index = 0;
            for (int j = 0; j < frames; j++) {
                if (frame[j] == -1) {
                    min_index = j;
                    break;
                }
                if (last_used[j] < last_used[min_index]) {
                    min_index = j;
                }
            }
            frame[min_index] = pages[i];
            last_used[min_index] = i;
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
    printf("Total Page Faults (LRU): %d\n", count);
    return count;
}
