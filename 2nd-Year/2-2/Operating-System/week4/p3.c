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
    int i;

    if (*root == NULL) {
        *root = (node *)malloc(sizeof(node));

        printf("\nEnter name of dir/file (under %s): ", parentName);
        scanf("%s", (*root)->name);

        // Input validation for ftype
        do {
            printf("Enter 1 for Directory / 2 for File: ");
            scanf("%d", &(*root)->ftype);
            if ((*root)->ftype != 1 && (*root)->ftype != 2) {
                printf("Invalid choice! Please enter 1 or 2.\n");
            }
        } while ((*root)->ftype != 1 && (*root)->ftype != 2);

        (*root)->level = lev;
        (*root)->nc = 0;

        // If directory, ask for children
        if ((*root)->ftype == 1) {
            printf("Number of subdirectories/files under %s: ", (*root)->name);
            scanf("%d", &(*root)->nc);

            if ((*root)->nc > 5) {
                printf("Maximum 5 children allowed. Setting to 5.\n");
                (*root)->nc = 5;
            }

            for (i = 0; i < (*root)->nc; i++) {
                (*root)->link[i] = NULL;
                create(&((*root)->link[i]), lev + 1, (*root)->name);
            }
        } else {
            // File cannot have children
            (*root)->nc = 0;
            for (i = 0; i < 5; i++) {
                (*root)->link[i] = NULL;
            }
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
            printf("[DIR] %s\n", root->name);
        else
            printf("[FILE] %s\n", root->name);

        // Display children (only if directory)
        for (int i = 0; i < root->nc; i++) {
            display(root->link[i], indent + 1);
        }
    }
}
