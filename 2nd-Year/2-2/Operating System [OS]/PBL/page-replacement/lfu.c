#include <stdio.h>
#include "utils.h"

int lfu(int pages[], int n, int frames) {
    int frame[frames], freq[frames], count = 0;
    for (int i = 0; i < frames; i++) {
        frame[i] = -1;
        freq[i] = 0;
    }

    printf("\n----  LFU Simulation ----\n");
    printf("Page   Frames      Result\n");

    for (int i = 0; i < n; i++) {
        int found = 0;
        for (int j = 0; j < frames; j++) {
            if (frame[j] == pages[i]) {
                found = 1;
                freq[j]++;
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
                if (freq[j] < freq[min_index]) {
                    min_index = j;
                }
            }
            frame[min_index] = pages[i];
            freq[min_index] = 1;
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
    printf("Total Page Faults (LFU): %d\n", count);
    return count;
}
