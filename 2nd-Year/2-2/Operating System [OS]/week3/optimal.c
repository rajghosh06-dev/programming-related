//WEEK3:: (b) OPTIMAL PAGE REPLACEMENT
#include <stdio.h>

int main() {
    int n, pg[30], fr[10];
    int count[10], i, j, k, fault = 0, f, flag, temp, current, c, dist, max, m, cnt, p, x;

    printf("Enter the total number of pages: ");
    scanf("%d", &n);

    printf("Enter the sequence: ");
    for (i = 0; i < n; i++)
        scanf("%d", &pg[i]);

    printf("Enter frame size: ");
    scanf("%d", &f);

    for (i = 0; i < f; i++) {
        count[i] = 0;
        fr[i] = -1;
    }

    k = 0;
    for (i = 0; i < n; i++) {
        flag = 0;
        temp = pg[i];

        for (j = 0; j < f; j++) {
            if (temp == fr[j]) {
                flag = 1;
                break;
            }
        }

        if ((flag == 0) && (k < f)) {
            fault++;
            fr[k] = temp;
            k++;
        } else if ((flag == 0) && (k == f)) {
            fault++;
            for (cnt = 0; cnt < f; cnt++) {
                current = fr[cnt];
                count[cnt] = 0;
                for (c = i + 1; c < n; c++) {
                    if (current == pg[c]) break;
                    count[cnt]++;
                }
            }

            max = -1;
            for (m = 0; m < f; m++) {
                if (count[m] > max) {
                    max = count[m];
                    p = m;
                }
            }
            fr[p] = temp;
        }

        printf("Page %d -> Frame: ", pg[i]);
        for (x = 0; x < f; x++)
            printf("%d\t", fr[x]);
        printf("\n");
    }

    printf("Total Page Faults = %d\n", fault);
    return 0;
}

