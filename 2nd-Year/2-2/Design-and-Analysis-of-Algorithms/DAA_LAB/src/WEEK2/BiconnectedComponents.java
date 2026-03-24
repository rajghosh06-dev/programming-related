//LAB6_26FEB09
//BiconnectedComponents
package WEEK2;

import java.util.*;

public class BiconnectedComponents
{
    static int V;
    static int[][] adj;
    static int[] dfn, low;
    static int time;
    static Stack<int[]> stack;

    static void biconnectedComponents(int u, int parent)
    {
        dfn[u] = low[u] = ++time;

        for (int w = 0; w < V; w++)
        {
            if (adj[u][w] == 1)
            {
                if (dfn[w] == 0) { // Tree edge
                    stack.push(new int[]{u, w});
                    biconnectedComponents(w, u);
                    low[u] = Math.min(low[u], low[w]);

                    if (low[w] >= dfn[u])
                    {
                        System.out.print("Biconnected Component: ");
                        int[] edge;
                        do
                        {
                            edge = stack.pop();
                            System.out.print("(" + (edge[0] + 1) + "," + (edge[1] + 1) + ") ");
                        } while (!(edge[0] == u && edge[1] == w));
                        System.out.println();
                    }
                }
                else if (w != parent && dfn[w] < dfn[u])
                { // Back edge
                    stack.push(new int[]{u, w});
                    low[u] = Math.min(low[u], dfn[w]);
                }
            }
        }
    }

    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter number of vertices: ");
        V = sc.nextInt();
        adj = new int[V][V];
        dfn = new int[V];
        low = new int[V];
        stack = new Stack<>();
        time = 0;

        System.out.println("Enter adjacency matrix:");
        for (int i = 0; i < V; i++)
        {
            for (int j = 0; j < V; j++)
            {
                adj[i][j] = sc.nextInt();
            }
        }

        biconnectedComponents(0, -1);
        sc.close();
    }
}
