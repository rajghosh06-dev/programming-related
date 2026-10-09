package abbas;

import java.io.*;
import java.net.*;

class CSMA_CA_Server {
    public static void main(String[] args) throws Exception {
        ServerSocket ss = new ServerSocket(5000);
        System.out.println("Server listening on port 5000...");

        while (true) {
            Socket s = ss.accept();
            BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()));
            PrintWriter out = new PrintWriter(s.getOutputStream(), true);

            String message = in.readLine();
            if (message != null && !message.isEmpty()) {
                System.out.println("Received: " + message);
                out.println("ACK"); // Send ACK back to the client
            }
            s.close();
        }
    }
}