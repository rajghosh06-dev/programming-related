package B.My_version;

import java.io.*;
import java.net.*;
import java.util.Random;

public class GoBackN_ServerV
{
    public static void main(String[] args) throws Exception
    {
        ServerSocket server = new ServerSocket(6262);
        System.out.println("Server established.");

        Socket client = server.accept();
        System.out.println("Client is now connected.");

        DataInputStream in = new DataInputStream(client.getInputStream());
        DataOutputStream out = new DataOutputStream(client.getOutputStream());

        int x = in.readInt();
        int expectedFrame = 0;

        Random rand = new Random();
        int errorMod = 2 + rand.nextInt(3); // Drops every 2nd or 3rd frame

        while (true)
        {
            int frameId = in.readInt();
            if (frameId == -1) break;

            int payload = in.readInt();

            // Display current buffer sequence
            int c = frameId % x;
            for (int h = 0; h <= x; h++) {
                System.out.print("|" + c + "|");
                c = (c + 1) % x;
            }
            System.out.println("\n");

            if (frameId == expectedFrame) {
                System.out.println("Frame " + (frameId % x) + " recieved\nData:" + payload + "\n");

                // Simulate periodic ACK loss
                if (expectedFrame > 0 && expectedFrame % errorMod == 0) {
                    System.out.println("Error found. Acknowledgement not sent.\n");
                    errorMod = 2 + rand.nextInt(3); // Reset error pattern
                } else {
                    out.writeInt(frameId);
                    System.out.println("Acknowledgement sent\n");
                    expectedFrame++;
                }
            } else {
                System.out.println("Frames recieved not in correct order\nExpected farme:"
                        + (expectedFrame % x) + "\nRecieved frame no : " + (frameId % x) + "\n");
            }
        }

        System.out.println("Client finished sending data. Exiting");
        server.close();
    }
}