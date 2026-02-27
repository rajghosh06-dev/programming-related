#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    long long X, Y, Z;
    scanf("%lld %lld %lld", &X, &Y, &Z);
    
    long long total_time = X * Y;
    long long available_time = Z * 24 * 60;

    if (total_time <= available_time)
    {
        printf("YES");
    }
    else
    {
        printf("NO");
    }

    return 0;
}