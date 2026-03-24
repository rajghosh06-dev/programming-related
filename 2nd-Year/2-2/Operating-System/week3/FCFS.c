//WEEK-3:: (a) FCFS [First Come First Serve] / FIFO
#include <stdio.h>

int main() {
    int i, j = 0, n, a[50], frame[10], no, k, avail, count = 0;

    printf("Enter the number of pages: ");
    scanf("%d", &n);

    printf("Enter the page numbers: ");
    for (i = 0; i < n; i++)
        scanf("%d", &a[i]);

    printf("Enter the number of frames: ");
    scanf("%d", &no);

    for (i = 0; i < no; i++)
        frame[i] = -1;

    printf("\nRef string\tPage frames\n");

    for (i = 0; i < n; i++) {
        avail = 0;
        for (k = 0; k < no; k++) {
            if (frame[k] == a[i]) {
                avail = 1;
                break;
            }
        }

        if (avail == 0) {
            frame[j] = a[i];
            j = (j + 1) % no;   // circular replacement
            count++;
        }

        printf("%d\t\t", a[i]);
        for (k = 0; k < no; k++)
            printf("%d\t", frame[k]);
        printf("\n");
    }

    printf("Total Page Faults = %d\n", count);
    return 0;
}

