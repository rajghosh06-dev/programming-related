// WEEK4 :: Simulate Hierarchical Level Directory
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Define tree node structure
typedef struct tree_element {
    char name[20];              // Directory or file name
    int ftype;                  // 1 = Directory, 2 = File
    int nc;                     // Number of children (only for directories)
    int level;                  // Depth level
    struct tree_element *link[5]; // Child pointers (max 5)
} node;

// Function prototypes
void create(node **root, int lev, const char *parentName);
void display(node *root, int indent);

int main() {
    node *root = NULL;

    // Create root directory
    create(&root, 0, "root");

    // Display hierarchical structure
    printf("\n\nHierarchical Directory Structure:\n");
    display(root, 0);

    return 0;
}

// Recursive function to create directory/file
void create(node **root, int lev, const char *parentName) {
    int i, choice;

    if (*root == NULL) {
        *root = (node *)malloc(sizeof(node));

        // Ask Folder/File/Exit
        do {
            printf("\nDo you want to create a Folder (1), File (2), or EXIT (0) under %s? ", parentName);
            if (scanf("%d", &choice) != 1) {
                printf("Invalid input! Please enter 0, 1 or 2.\n");
                while(getchar() != '\n'); // clear buffer
                continue;
            }
            if (choice < 0 || choice > 2) {
                printf("Invalid choice! Please enter 0, 1 or 2.\n");
            }
        } while (choice < 0 || choice > 2);

        switch (choice) {
            case 0: // EXIT
                free(*root);
                *root = NULL;
                return;

            case 1: // Folder
                (*root)->ftype = 1;
                printf("Enter folder name: ");
                scanf("%19s", (*root)->name);

                (*root)->level = lev;

                printf("Number of subdirectories/files inside %s: ", (*root)->name);
                int count;
                while (scanf("%d", &count) != 1 || count < 0) {
                    printf("Invalid input! Please enter a positive integer: ");
                    while(getchar() != '\n'); // clear buffer
                }
                if (count > 5) {
                    printf("Maximum 5 children allowed. Setting to 5.\n");
                    count = 5;
                }
                (*root)->nc = count;

                for (i = 0; i < (*root)->nc; i++) {
                    (*root)->link[i] = NULL;
                    create(&((*root)->link[i]), lev + 1, (*root)->name);
                }
                break;

            case 2: // File
                (*root)->ftype = 2;
                printf("Enter file name: ");
                scanf("%19s", (*root)->name);

                (*root)->level = lev;
                (*root)->nc = 0;
                for (i = 0; i < 5; i++) {
                    (*root)->link[i] = NULL;
                }
                break;
        }
    }
}

// Recursive function to display directory tree
void display(node *root, int indent) {
    if (root != NULL) {
        // Print indentation for hierarchy
        for (int i = 0; i < indent; i++) {
            printf("   ");
        }

        // Print directory/file name
        if (root->ftype == 1)
            printf("[DIR ] %s\n", root->name);
        else
            printf("[FILE] %s\n", root->name);

        // Display children (only if directory)
        for (int i = 0; i < root->nc; i++) {
            display(root->link[i], indent + 1);
        }
    }
}
