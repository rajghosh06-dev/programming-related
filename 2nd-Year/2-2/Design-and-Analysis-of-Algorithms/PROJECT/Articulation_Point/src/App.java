import graph.Graph;
import graph.ArticulationPoint;
import graph.Visualizer;
import utils.InputReader;

import java.io.IOException;
import java.util.*;

public class App {
    public static void main(String[] args) throws IOException {
        // Choose which dataset to run
        String filename = "data/powergrid.txt"; // change to powergrid.txt or socialnetwork.txt

        // Read graph from file
        Graph g = InputReader.readGraphFromFile(filename);

        // Run articulation point detection
        ArticulationPoint apFinder = new ArticulationPoint();
        Set<Integer> articulationPoints = apFinder.findArticulationPoints(g);

        // Print results
        System.out.println("Articulation Points in " + filename + ":");
        for (int ap : articulationPoints) {
            System.out.println("Node " + ap);
        }

        // Optional: visualize
        Visualizer.showGraph(g, articulationPoints);
    }
}