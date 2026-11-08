package B.My_version;

import java.io.*;
import java.net.*;

public class StopWaitReceiver {
    public static void main(String[] args) throws Exception {
        ServerSocket serverSocket = new ServerSocket(9999);
        Socket socket = serverSocket.accept();

        BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);

        String line;
        while ((line = in.readLine()) != null) {
            if (line.equalsIgnoreCase("exit")) {
                break;
            }

            System.out.println("Frame " + line + " was received");
            Thread.sleep(500);
            out.println("Received");
        }

        System.out.println("ALL FRAMES WERE RECEIVED SUCCESSFULLY");
        serverSocket.close();
    }
}