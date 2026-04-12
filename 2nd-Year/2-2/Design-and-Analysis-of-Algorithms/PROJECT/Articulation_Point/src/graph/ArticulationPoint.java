package graph;

import java.util.*;

public class ArticulationPoint {
    private int time;

    public Set<Integer> findArticulationPoints(Graph g) {
        int V = g.getVertices();
        LinkedList<Integer>[] adj = g.getAdjacencyList();

        boolean[] visited = new boolean[V];
        int[] disc = new int[V];
        int[] low = new int[V];
        int[] parent = new int[V];
        boolean[] ap = new boolean[V];

        Arrays.fill(parent, -1);
        time = 0;

        for (int i = 0; i < V; i++) {
            if (!visited[i]) {
                APUtil(i, visited, disc, low, parent, ap, adj);
            }
        }

        // Collect articulation points into a Set
        Set<Integer> articulationPoints = new HashSet<>();
        for (int i = 0; i < V; i++) {
            if (ap[i]) {
                articulationPoints.add(i);
            }
        }

        return articulationPoints;
    }

    private void APUtil(int u, boolean[] visited, int[] disc, int[] low,
                        int[] parent, boolean[] ap, LinkedList<Integer>[] adj) {
        int children = 0;
        visited[u] = true;
        disc[u] = low[u] = ++time;

        for (int v : adj[u]) {
            if (!visited[v]) {
                children++;
                parent[v] = u;
                APUtil(v, visited, disc, low, parent, ap, adj);

                low[u] = Math.min(low[u], low[v]);

                if (parent[u] == -1 && children > 1)
                    ap[u] = true;

                if (parent[u] != -1 && low[v] >= disc[u])
                    ap[u] = true;
            } else if (v != parent[u]) {
                low[u] = Math.min(low[u], disc[v]);
            }
        }
    }
}