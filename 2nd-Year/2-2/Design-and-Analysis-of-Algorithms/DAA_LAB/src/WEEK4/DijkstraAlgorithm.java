//LAB8_26FEB16
//Dijkstra Algorithm
package WEEK4;

import java.util.*;

public class DijkstraAlgorithm
{
    static final int INF = Integer.MAX_VALUE;

    public static void dijkstra(int[][] graph, int source)
    {
        int n = graph.length;
        int[] dist = new int[n];
        boolean[] visited = new boolean[n];

        Arrays.fill(dist, INF);
        dist[source] = 0;

        for (int count = 0; count < n - 1; count++)
        {
            int u = minDistance(dist, visited);
            visited[u] = true;

            for (int v = 0; v < n; v++)
            {
                if (!visited[v] && graph[u][v] != 0 && dist[u] != INF
                        && dist[u] + graph[u][v] < dist[v])
                {
                    dist[v] = dist[u] + graph[u][v];
                }
            }
        }

        printSolution(dist, source);
    }

    private static int minDistance(int[] dist, boolean[] visited)
    {
        int min = INF, minIndex = -1;
        for (int v = 0; v < dist.length; v++)
        {
            if (!visited[v] && dist[v] <= min)
            {
                min = dist[v];
                minIndex = v;
            }
        }
        return minIndex;
    }

    private static void printSolution(int[] dist, int source)
    {
        System.out.println("Shortest paths from vertex " + source + ":");
        for (int i = 0; i < dist.length; i++)
        {
            if (dist[i] == INF)
                System.out.println("To vertex " + i + " : No path");
            else
                System.out.println("To vertex " + i + " : " + dist[i]);
        }
    }

    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter number of vertices: ");
        int n = sc.nextInt();

        int[][] graph = new int[n][n];
        System.out.println("Enter adjacency matrix (use 0 if no edge):");
        for (int i = 0; i < n; i++)
        {
            for (int j = 0; j < n; j++)
            {
                graph[i][j] = sc.nextInt();
            }
        }

        System.out.print("Enter source vertex (0 to " + (n-1) + "): ");
        int source = sc.nextInt();

        dijkstra(graph, source);
        sc.close();
    }
}
