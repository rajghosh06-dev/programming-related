// Week-7
// CSMA-CD Server
package personal;

import java.io.*;
import java.net.*;

public class CSMA_CD_Server {
    public static void main(String[] args) {
        int port = 5000;
        System.out.println("=== CSMA/CD Server Started ===");
        try (ServerSocket server = new ServerSocket(port)) {
            System.out.println("Listening on port " + port + "...");
            while (true) {
                try (Socket socket = server.accept();
                     BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {
                    String msg = reader.readLine();
                    System.out.println("Received: " + msg);
                }
            }
        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
        }
    }
}