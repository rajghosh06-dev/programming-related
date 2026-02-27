#include<stdio.h>
int main()
{
    int x=1;
    switch(x)
    {
        case x: printf("case 1\n");
                break;
        case x+1;
                printf("Case 2\n");
                break;
        default: printf("Default case\n");
                break;
    }
    return 0;
}