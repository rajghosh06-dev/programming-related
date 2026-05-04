// WEEK4 :: Simulate TWO LEVEL DIRECTORY (Simplified)
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

// Structure for directory
struct {
    char dname[20];       // Directory name
    char fname[20][20];   // File names inside directory
    int fcnt;             // File count
} dir[10];                // Array of directories (max 10)

int main()
{
    int i, k, ch, dcnt = 0;   // dcnt = number of directories created
    char d[20], f[20];
    
    printf("\n\nMenu:");
    printf("\n1. Create Directory");
    printf("\n2. Create File");
    printf("\n3. Display");
    printf("\n4. Exit");
    while (1)
    {
        printf("\nEnter your choice: ");
        scanf("%d", &ch);

        switch (ch)
        {
            case 1: // Create Directory
                if (dcnt >= 10)
                {
                    printf("Maximum directory limit reached!\n");
                    break;
                }
                printf("Enter name of directory: ");
                scanf("%s", d);

                // Check for duplicate directory
                for (i = 0; i < dcnt; i++)
                {
                    if (strcmp(d, dir[i].dname) == 0)
                    {
                        printf("Directory %s already exists!\n", d);
                        break;
                    }
                }
                if (i == dcnt)
                { // only create if not duplicate
                    strcpy(dir[dcnt].dname, d);
                    dir[dcnt].fcnt = 0;
                    dcnt++;
                    printf("Directory %s created successfully.\n", d);
                }
                break;

            case 2: // Create File
                printf("Enter name of the directory: ");
                scanf("%s", d);
                for (i = 0; i < dcnt; i++)
                {
                    if (strcmp(d, dir[i].dname) == 0)
                    {
                        printf("Enter name of the file: ");
                        scanf("%s", f);

                        // Check duplicate file
                        for (k = 0; k < dir[i].fcnt; k++)
                        {
                            if (strcmp(f, dir[i].fname[k]) == 0)
                            {
                                printf("File %s already exists in directory %s.\n", f, d);
                                break;
                            }
                        }
                        if (k == dir[i].fcnt)
                        { // only add if not duplicate
                            strcpy(dir[i].fname[dir[i].fcnt], f);
                            dir[i].fcnt++;
                            printf("File %s created successfully in directory %s.\n", f, d);
                        }
                        break;
                    }
                }
                if (i == dcnt)
                {
                    printf("Directory %s not found.\n", d);
                }
                break;

            case 3: // Display
                if (dcnt == 0)
                {
                    printf("No directories created yet.\n");
                }
                else
                {
                    printf("\nDirectory\tFiles");
                    for (i = 0; i < dcnt; i++) {
                        printf("\n%s\t\t", dir[i].dname);
                        for (k = 0; k < dir[i].fcnt; k++) {
                            printf("%s ", dir[i].fname[k]);
                        }
                    }
                    printf("\n");
                }
                break;

            case 4: // Exit
                exit(0);

            default:
                printf("Invalid choice! Try again.\n");
        }
    }

    return 0;
}
