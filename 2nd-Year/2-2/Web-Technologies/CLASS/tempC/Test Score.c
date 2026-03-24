#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    long long N, X, Y;
    scanf("%lld %lld %lld", &N, &X, &Y);

    if ((Y % X) == 0 && Y <= (N * X))
    {
        printf("YES");
    }
    else
    {
        printf("NO");
    }

    return 0;
}
