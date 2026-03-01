//LAB3_26JAN12/DFS.java :: DFS using Stack [non-recurrsive]

package additionalPrograms;

import java.util.Scanner;
import java.util.Stack;

public class DFS_Stack
{
    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter number of vertices: ");
        int n = sc.nextInt();

        int[][] adj = new int[n][n];
        boolean[] visited = new boolean[n];

        System.out.print("Enter number of edges: ");
        int edges = sc.nextInt();

        System.out.println("Enter edges (u v):");
        for (int i = 0; i < edges; i++)
        {
            int u = sc.nextInt();
            int v = sc.nextInt();
            adj[u][v] = adj[v][u] = 1; // undirected graph
        }

        System.out.print("Enter starting vertex: ");
        int start = sc.nextInt();

        System.out.println("DFS traversal:");
        dfsUsingStack(start, adj, visited, n);

        sc.close();
    }

    // Non-recursive DFS using stack
    static void dfsUsingStack(int start, int[][] adj, boolean[] visited, int n)
    {
        Stack<Integer> stack = new Stack<>();
        stack.push(start);
        visited[start] = true;

        while (!stack.isEmpty())
        {
            int v = stack.pop();
            System.out.print(v + " ");

            // Push all unvisited neighbors
            for (int i = n - 1; i >= 0; i--)
            {
                // reverse order for natural DFS
                if (adj[v][i] == 1 && !visited[i])
                {
                    stack.push(i);
                    visited[i] = true;
                }
            }
        }
    }
}
