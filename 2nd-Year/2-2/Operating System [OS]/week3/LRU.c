//WEEK-3:: Least Recently Used[LRU]
#include <stdio.h>

int main()
{
    int i, j, k, min, r[25], m[10], count[10], flag[25], n, f, p = 0, next = 1;

    printf("Enter the length of reference string: ");
    scanf("%d", &n);

    printf("Enter the reference string: ");
    for (i = 0; i < n; i++) {
        scanf("%d", &r[i]);
        flag[i] = 0;
    }

    printf("Enter the number of frames: ");
    scanf("%d", &f);

    for (i = 0; i < f; i++)
    {
        count[i] = 0;
        m[i] = -1;
    }

    printf("\nThe Page Replacement process is:\n");

    for (i = 0; i < n; i++)
    {
        for (j = 0; j < f; j++)
        {
            if (m[j] == r[i])
            {
                flag[i] = 1;
                count[j] = next++;
            }
        }

        if (flag[i] == 0)
        {
            if (p < f)
            {
                m[p] = r[i];
                count[p] = next++;
                p++;
            }
            else
            {
                min = 0;
                for (k = 1; k < f; k++)
                {
                    if (count[k] < count[min])
                        min = k;
                }
                m[min] = r[i];
                count[min] = next++;
            }
        }

        printf("Page %d -> Frame: ", r[i]);
        for (j = 0; j < f; j++)
            printf("%d\t", m[j]);
        printf("\n");
    }

    return 0;
}

