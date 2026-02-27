#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    long long A, B, C, X;
    scanf("%lld %lld %lld %lld", &A, &B, &C, &X);
    
    int can_buy = 0;
    if (A + B >= X)
        can_buy = 1;
    else if (A + C >= X)
        can_buy = 1;
    else if (B + C >= X)
        can_buy = 1;

    if (can_buy)
        printf("YES");
    else
        printf("NO");
    return 0;
        
}
