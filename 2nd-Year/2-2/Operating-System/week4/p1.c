//WEEK4:: Simulate SINGLE LEVEL DIRECTORY
#include <stdio.h>
#include <string.h>

int main() {
    int nf, i, j = 0, ch;
    char mdname[20], fname[50][20], name[20];

    printf("Enter the directory name: ");
    scanf("%s", mdname);

    printf("Enter the number of files: ");
    scanf("%d", &nf);

    // Input initial files
    for (i = 0; i < nf; i++) {
        printf("Enter file %d name: ", i + 1);
        scanf("%s", fname[j++]);
    }

    do {
        printf("Enter file name to be created: ");
        scanf("%s", name);

        // Check for duplicates
        for (i = 0; i < j; i++) {
            if (strcmp(name, fname[i]) == 0) {
                break;
            }
        }

        if (i == j) { // Not found, so add
            strcpy(fname[j++], name);
            printf("File %s created successfully.\n", name);
        } else {
            printf("There is already a file named %s\n", name);
        }

        printf("Do you want to enter another file (yes - 1 / no - 0): ");
        scanf("%d", &ch);

    } while (ch == 1);

    printf("\nDirectory name is: %s\n", mdname);
    printf("Files names are:\n");
    for (i = 0; i < j; i++) {
        printf("%s\n", fname[i]);
    }

    return 0;
}
