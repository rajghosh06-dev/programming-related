package graph;

import javax.swing.*;
import java.awt.*;
import java.util.*;

public class Visualizer extends JPanel {
    private Graph graph;
    private Set<Integer> articulationPoints;

    public Visualizer(Graph g, Set<Integer> ap) {
        this.graph = g;
        this.articulationPoints = ap;
    }

    @Override
    protected void paintComponent(Graphics g2) {
        super.paintComponent(g2);
        LinkedList<Integer>[] adj = graph.getAdjacencyList();
        int V = graph.getVertices();

        int radius = 20;
        int centerX = getWidth() / 2;
        int centerY = getHeight() / 2;
        int circleRadius = 150;

        Point[] positions = new Point[V];
        for (int i = 0; i < V; i++) {
            double angle = 2 * Math.PI * i / V;
            positions[i] = new Point(centerX + (int)(circleRadius * Math.cos(angle)),
                                     centerY + (int)(circleRadius * Math.sin(angle)));
        }

        g2.setColor(Color.BLACK);
        for (int u = 0; u < V; u++) {
            for (int v : adj[u]) {
                g2.drawLine(positions[u].x, positions[u].y, positions[v].x, positions[v].y);
            }
        }

        for (int i = 0; i < V; i++) {
            if (articulationPoints.contains(i)) {
                g2.setColor(Color.RED);
            } else {
                g2.setColor(Color.GREEN);
            }
            g2.fillOval(positions[i].x - radius/2, positions[i].y - radius/2, radius, radius);
            g2.setColor(Color.BLACK);
            g2.drawString(String.valueOf(i), positions[i].x, positions[i].y);
        }
    }

    public static void showGraph(Graph g, Set<Integer> ap) {
        JFrame frame = new JFrame("Graph Visualization");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.add(new Visualizer(g, ap));
        frame.setSize(400, 400);
        frame.setVisible(true);
    }
}