// LABx_13APR2026
// WEEK-11 :: HAMILTONIAN CYCLE PROBLEM
package WEEK11;

import java.util.Scanner;
public class HamiltonianCycle
{
    static final int MAX = 25; // Maximum number of vertices allowed
    static int[] x = new int[MAX]; // x[i] = i-th vertex in the current path

    // Function to try the next valid vertex at position k in the path
    static void nextVertex(int[][] G, int n, int k)
    {
        while (true)
        {
            // Move to the next candidate vertex (cyclically from 1 to n)
            x[k] = (x[k] + 1) % (n + 1);
            if (x[k] == 0)
                return; // No more vertices to try at this position

            // Check if there is an edge between the previous vertex and current candidate
            if (G[x[k - 1]][x[k]] == 1)
            {
                int j;
                // Ensure the candidate vertex has not already been used in the path
                for (j = 1; j < k; j++)
                {
                    if (x[j] == x[k]) // Vertex repetition found
                        break;
                }
                // If no repetition
                if (j == k)
                {
                    // If not at the last vertex OR if at the last vertex and it connects back to the start
                    if (k < n || (k == n && G[x[n]][x[1]] == 1))
                        return; // Valid choice
                }
            }
        }
    }

    // Recursive function to generate Hamiltonian cycles
    static void hamiltonianCycle(int[][] G, int n, int k) {
        while (true)
        {
            // Try to assign a valid vertex at position k
            nextVertex(G, n, k);
            if (x[k] == 0)
                return; // No more options at position k

            if (k == n)
            {
                // Found one Hamiltonian cycle
                System.out.print("Cycle: ");
                for (int i = 1; i <= n; i++)
                {
                    System.out.print(x[i] + " ");
                }
                System.out.println(x[1]); // Print starting vertex again to complete the cycle
            }
            else
            {
                // Recurse to the next position
                hamiltonianCycle(G, n, k + 1);
            }
        }
    }

    public static void main(String[] args)
    {
        int[][] G = new int[MAX][MAX]; // Adjacency matrix representation of the graph
        Scanner sc = new Scanner(System.in);

        System.out.println("\n--- Hamiltonian Cycle Finder ---");
        System.out.print("Enter number of vertices: ");
        int n = sc.nextInt();
        System.out.print("Enter number of edges: ");
        int e = sc.nextInt();

        // Initialize graph with 0s (no edges)
        for (int i = 1; i <= n; i++)
        {
            x[i] = 0; // Reset path array
            for (int j = 1; j <= n; j++)
            {
                G[i][j] = 0;
            }
        }

        // Input edges from user
        for (int i = 0; i < e; i++)
        {
            System.out.print("Enter edge " + (i + 1) + " (v1 v2): ");
            int v1 = sc.nextInt();
            int v2 = sc.nextInt();
            G[v1][v2] = 1; // Undirected graph: mark both directions
            G[v2][v1] = 1;
        }

        // Start path from vertex 1
        x[1] = 1;
        System.out.println("\nHamiltonian cycle(s):");
        hamiltonianCycle(G, n, 2); // Begin recursive search from position 2

        sc.close();
    }
}