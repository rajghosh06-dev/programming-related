#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    int X, Y, Z;
    scanf("%d %d %d", &X, &Y, &Z);
    int maxMangoes = (Z - Y) / X;
    if (maxMangoes < 0) maxMangoes = 0;

    printf("%d\n", maxMangoes);
    return 0;
}
