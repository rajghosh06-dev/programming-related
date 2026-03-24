#include <stdio.h>
#include "algorithms.h"

int main() {
    int n, frames;

    // Input reference string length
    printf("Enter number of pages in reference string: ");
    scanf("%d", &n);

    int pages[n];
    printf("Enter the reference string (space-separated): ");
    for (int i = 0; i < n; i++) {
        scanf("%d", &pages[i]);
    }

    // Input number of frames
    printf("Enter number of frames: ");
    scanf("%d", &frames);

    // Run simulations (each prints its own trace)
    int fifo_faults = fifo(pages, n, frames);
    int lru_faults = lru(pages, n, frames);
    int optimal_faults = optimal(pages, n, frames);
    int lfu_faults = lfu(pages, n, frames);

    // Print summary
    printf("\n=== Final Page Replacement Analysis ===\n");
    printf("FIFO Page Faults   : %d\n", fifo_faults);
    printf("LRU Page Faults    : %d\n", lru_faults);
    printf("Optimal Page Faults: %d\n", optimal_faults);
    printf("LFU Page Faults    : %d\n", lfu_faults);

    return 0;
}
