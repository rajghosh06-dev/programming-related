#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdlib.h>

int main() {
    char v, c;
    scanf(" %c %c", &v, &c);

    if (v == c)
    {
        printf("NULL");
    }
    else if ((v == 'R' && c == 'S') || (v == 'P' && c == 'R') || (v == 'S' && c == 'P'))
    {
        printf("Vignesh");
    }
    else {
        printf("Charan");
    }

    return 0;
}
