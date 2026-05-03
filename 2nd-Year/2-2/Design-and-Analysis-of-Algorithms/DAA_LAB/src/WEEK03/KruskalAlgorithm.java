//Krushkal's Algorithm
package WEEK03;

import java.util.*;

class Edge implements Comparable<Edge>
{
    int u, v, weight;

    Edge(int u, int v, int weight)
    {
        this.u = u;
        this.v = v;
        this.weight = weight;
    }

    @Override
    public int compareTo(Edge other)
    {
        return this.weight - other.weight;
    }
}

public class KruskalAlgorithm
{
    static int[] parent;

    // Find with path compression
    static int find(int i)
    {
        if (parent[i] == i) return i;
        parent[i] = find(parent[i]);
        return parent[i];
    }

    // Union operation
    static void union(int x, int y)
    {
        int rootX = find(x);
        int rootY = find(y);
        parent[rootX] = rootY;
    }

    public static void kruskal(List<Edge> edges, int n)
    {
        Collections.sort(edges); // sort edges by weight
        parent = new int[n + 1];
        for (int i = 1; i <= n; i++)
        {
            parent[i] = i;
        }

        int mincost = 0;
        List<Edge> mst = new ArrayList<>();

        for (Edge e : edges)
        {
            int x = find(e.u);
            int y = find(e.v);

            if (x != y)
            {
                mst.add(e);
                mincost += e.weight;
                union(x, y);
            }
        }

        // Print MST edges and cost
        System.out.println("Edges in Minimum Spanning Tree:");
        for (Edge e : mst)
        {
            System.out.println(e.u + " - " + e.v + " : " + e.weight);
        }
        System.out.println("Minimum cost = " + mincost);
    }

    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter number of vertices: ");
        int n = sc.nextInt();

        System.out.print("Enter number of edges: ");
        int m = sc.nextInt();

        List<Edge> edges = new ArrayList<>();
        System.out.println("Enter edges (u v weight):");
        for (int i = 0; i < m; i++)
        {
            int u = sc.nextInt();
            int v = sc.nextInt();
            int w = sc.nextInt();
            edges.add(new Edge(u, v, w));
        }

        kruskal(edges, n);
        sc.close();
    }
}
