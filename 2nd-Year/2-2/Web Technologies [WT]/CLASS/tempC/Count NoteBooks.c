#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    long long N;
    if (scanf("%lld", &N) != 1) return 0;

    long long notebooks = N * 10;
    printf("%lld\n", notebooks);

    return 0;
}
