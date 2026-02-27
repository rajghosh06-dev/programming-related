#include<stdio.h>
#include<string.h>
#include<math.h>

int main()
{
    int X, Y, Z;
    scanf("%d %d %d", &X, &Y, &Z);
    if(X <= Z && Y <= Z)
    {
        if(Z >= (X+Y))
        {
            printf("2\n");
            return 0;
        }
        if(Z > X && Z < (X+Y))
        {
            printf("1\n");
            return 0;
        }
    }
    else
    {
        printf("0\n");
        return 0;
    }
}