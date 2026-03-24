#include <stdio.h>
#include "utils.h"

int optimal(int pages[], int n, int frames) {
    int frame[frames], count = 0;
    for (int i = 0; i < frames; i++) frame[i] = -1;

    printf("\n--- Optimal Simulation ---\n");
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
            int replace_index = -1, farthest = i;
            for (int j = 0; j < frames; j++) {
                if (frame[j] == -1) {
                    replace_index = j;
                    break;
                }
                int k;
                for (k = i + 1; k < n; k++) {
                    if (frame[j] == pages[k]) break;
                }
                if (k == n) {
                    replace_index = j;
                    break;
                }
                if (k > farthest) {
                    farthest = k;
                    replace_index = j;
                }
            }
            frame[replace_index] = pages[i];
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
    printf("Total Page Faults (Optimal): %d\n", count);
    return count;
}
