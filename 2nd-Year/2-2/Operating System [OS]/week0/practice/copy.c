#include<stdio.h>
#include<stdlib.h>

int main()
{
    FILE *fptr1, *fptr2;
    char filename[100];
    char c;
    printf("Enter the filename to open for reading: ");
    scanf("%s", filename);
    fptr1 = fopen(filename, "r");
    printf("Enter the filename to open for writing: ");
    scanf("%s", filename);
    fptr2 = fopen(filename, "w");
    while ((c = fgetc(fptr1)) != EOF)
        fputc(c, fptr2);
    printf("Contents copied to %s\n", filename);
    fclose(fptr1);
    fclose(fptr2);
    return 0;
}
