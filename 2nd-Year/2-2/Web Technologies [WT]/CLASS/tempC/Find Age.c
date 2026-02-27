#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    int Cage;
    scanf("%d", &Cage);

    if (Cage >= 15)
    {
        printf("%d\n", Cage - 15);
    }
    else
    {
        printf("0\n");
    }

    return 0;
}
