package utils;

import graph.Graph;
import java.io.*;
import java.util.*;

public class InputReader {
    public static Graph readGraphFromFile(String filename) throws IOException {
        BufferedReader br = new BufferedReader(new FileReader(filename));
        String[] firstLine = br.readLine().split(" ");
        int V = Integer.parseInt(firstLine[0]);
        int E = Integer.parseInt(firstLine[1]);

        Graph g = new Graph(V);
        for (int i = 0; i < E; i++) {
            String[] edge = br.readLine().split(" ");
            int u = Integer.parseInt(edge[0]);
            int v = Integer.parseInt(edge[1]);
            g.addEdge(u, v);
        }
        br.close();
        return g;
    }
}