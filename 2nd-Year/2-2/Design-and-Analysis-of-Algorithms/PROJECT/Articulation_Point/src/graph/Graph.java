package graph;

import java.util.*;

public class Graph {
    private int V; // number of vertices
    private LinkedList<Integer>[] adj;

    @SuppressWarnings("unchecked")
    public Graph(int v) {
        V = v;
        // Create array of LinkedLists safely
        adj = (LinkedList<Integer>[]) new LinkedList[v];
        for (int i = 0; i < v; i++) {
            adj[i] = new LinkedList<>();
        }
    }

    // Add an undirected edge
    public void addEdge(int u, int v) {
        adj[u].add(v);
        adj[v].add(u);
    }

    // Return number of vertices
    public int getVertices() {
        return V;
    }

    // Return adjacency list
    public LinkedList<Integer>[] getAdjacencyList() {
        return adj;
    }
}