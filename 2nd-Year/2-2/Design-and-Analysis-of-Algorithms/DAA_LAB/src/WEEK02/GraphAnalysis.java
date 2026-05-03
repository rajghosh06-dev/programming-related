//LAB6_26FEB09
// Combined Program: Articulation Points and Biconnected Components
package WEEK02;

import java.util.*;

public class GraphAnalysis
{
    private int V;
    private int[][] adj;
    private boolean[] visited;
    private int[] dfn, low, parent;
    private boolean[] ap;
    private int timeDFS;
    private Stack<int[]> stack;

    public GraphAnalysis(int V)
    {
        this.V = V;
        adj = new int[V][V];
        visited = new boolean[V];
        dfn = new int[V];
        low = new int[V];
        parent = new int[V];
        ap = new boolean[V];
        timeDFS = 0;
        Arrays.fill(parent, -1);
        stack = new Stack<>();
    }

    // DFS for articulation points + biconnected components
    private void DFS(int u)
    {
        visited[u] = true;
        dfn[u] = low[u] = ++timeDFS;
        int children = 0;

        for (int v = 0; v < V; v++)
        {
            if (adj[u][v] == 1)
            {
                if (!visited[v])
                {
                    children++;
                    parent[v] = u;
                    stack.push(new int[]{u, v}); // push tree edge
                    DFS(v);
                    low[u] = Math.min(low[u], low[v]);

                    // Articulation point conditions
                    if (parent[u] == -1 && children > 1)
                        ap[u] = true;
                    if (parent[u] != -1 && low[v] >= dfn[u])
                        ap[u] = true;

                    // Biconnected component condition
                    if (low[v] >= dfn[u])
                    {
                        System.out.print("Biconnected Component: ");
                        int[] edge;
                        do
                        {
                            edge = stack.pop();
                            System.out.print("(" + (edge[0] + 1) + "," + (edge[1] + 1) + ") ");
                        } while (!(edge[0] == u && edge[1] == v));
                        System.out.println();
                    }
                }
                else if (v != parent[u] && dfn[v] < dfn[u])
                {
                    // Back edge
                    stack.push(new int[]{u, v});
                    low[u] = Math.min(low[u], dfn[v]);
                }
            }
        }
    }

    public void analyzeGraph()
    {
        // Run DFS from all unvisited nodes (for disconnected graphs)
        for (int i = 0; i < V; i++)
        {
            if (!visited[i])
            {
                DFS(i);
            }
        }

        System.out.println("\nVertex  DFN  LOW");
        for (int i = 0; i < V; i++)
        {
            System.out.printf("%6d %5d %5d\n", i, dfn[i], low[i]);
        }

        System.out.println("\nArticulation Points:");
        for (int i = 0; i < V; i++)
        {
            if (ap[i])
            {
                System.out.print((i + 1) + " ");
            }
        }
        System.out.println();
    }

    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter number of vertices: ");
        int V = sc.nextInt();
        GraphAnalysis g = new GraphAnalysis(V);

        System.out.println("Enter adjacency matrix (0/1):");
        for (int i = 0; i < V; i++)
        {
            for (int j = 0; j < V; j++)
            {
                g.adj[i][j] = sc.nextInt();
            }
        }

        g.analyzeGraph();
        sc.close();
    }
}
