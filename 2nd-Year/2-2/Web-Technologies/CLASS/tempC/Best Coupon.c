#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main()
{
    int x;
    int Fc1, Fc2;
    scanf("%d", &x);

    if (x > 0)
    {
        Fc1 = x - (x * 10 / 100);
        Fc2 = x - 100;
        
        if (Fc1 < Fc2)
            printf("%d", Fc1);
        else
            printf("%d", Fc2);
    }
    else
        return 0;
}
