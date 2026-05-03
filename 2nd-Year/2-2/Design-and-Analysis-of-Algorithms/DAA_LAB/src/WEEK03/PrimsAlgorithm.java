//PRIM's Algorithm
package WEEK03;

import java.util.Scanner;

public class PrimsAlgorithm
{

    public static void prims(int[][] cost, int n, int v)
    {
        int[][] t = new int[n - 1][2];   // to store edges of MST
        int[] near = new int[n + 1];     // nearest vertex array
        int mincost = 0;

        // Initialize near[] with v
        for (int i = 1; i <= n; i++)
        {
            if (i != v)
            {
                near[i] = v;
            }
        }

        // Construct MST with n-1 edges
        for (int i = 1; i <= n - 1; i++)
        {
            int k = 0, min = 999;

            // Find minimum cost edge
            for (int j = 1; j <= n; j++)
            {
                if (near[j] != 0 && cost[j][near[j]] < min)
                {
                    min = cost[j][near[j]];
                    k = j;
                }
            }

            // Store edge in MST
            t[i - 1][0] = k;
            t[i - 1][1] = near[k];
            mincost += cost[k][near[k]];
            near[k] = 0;

            // Update near[] array
            for (int j = 1; j <= n; j++)
            {
                if (near[j] != 0 && cost[j][k] < cost[j][near[j]])
                {
                    near[j] = k;
                }
            }
        }

        // Print MST edges and total cost
        System.out.println("Edges in Minimum Spanning Tree:");
        for (int i = 0; i < n - 1; i++)
        {
            System.out.println(t[i][0] + " - " + t[i][1]);
        }
        System.out.println("Minimum cost = " + mincost);
    }

    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter number of vertices: ");
        int n = sc.nextInt();

        int[][] cost = new int[n + 1][n + 1];
        System.out.println("Enter cost adjacency matrix (use 999 for no edge):");
        for (int i = 1; i <= n; i++)
        {
            for (int j = 1; j <= n; j++)
            {
                cost[i][j] = sc.nextInt();
            }
        }

        System.out.print("Enter starting vertex: ");
        int v = sc.nextInt();

        prims(cost, n, v);
        sc.close();
    }
}
