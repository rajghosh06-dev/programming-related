// Week-7
// CSMA-CA Server
package personal;

import java.io.*;
import java.net.*;

public class CSMA_CA_Server {
    public static void main(String[] args) {
        int port = 5000;
        System.out.println("=== CSMA/CA Server Started ===");
        try (ServerSocket server = new ServerSocket(port)) {
            while (true) {
                try (Socket socket = server.accept();
                     BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                     PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {
                    
                    String frame = in.readLine();
                    System.out.println("Received: " + frame);
                    // Send ACK back to the client
                    out.println("ACK");
                }
            }
        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
        }
    }
}