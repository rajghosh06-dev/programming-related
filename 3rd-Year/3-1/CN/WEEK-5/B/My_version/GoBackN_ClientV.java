package B.My_version;

import java.io.*;
import java.net.*;
import java.util.Scanner;

public class GoBackN_ClientV {
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter the value of m : ");
        int m = sc.nextInt();
        int x = (int) Math.pow(2, m) - 1; // Window/Sequence limit

        System.out.print("Enter no. of frames to be sent:");
        int count = sc.nextInt();

        int[] data = new int[count];
        for (int i = 0; i < count; i++) {
            System.out.print("Enter data for frame no " + (i % x) + " => ");
            data[i] = sc.nextInt();
        }

        Socket socket = new Socket("localhost", 6262);
        socket.setSoTimeout(3500); // 3.5-second ACK timeout
        System.out.println("Connected with server.");

        DataOutputStream out = new DataOutputStream(socket.getOutputStream());
        DataInputStream in = new DataInputStream(socket.getInputStream());

        out.writeInt(x);

        int base = 0;
        while (base < count) {
            // Display sliding window
            for (int i = base; i < count; i++) {
                System.out.print("|" + (i % x) + "|");
            }
            System.out.println("\n");

            // Send window batch
            for (int i = base; i < count; i++) {
                System.out.println("Sending frame:" + (i % x) + "\n");
                out.writeInt(i);        // Absolute ID
                out.writeInt(data[i]);   // Payload
                Thread.sleep(100);
            }

            // Wait for ACKs
            try {
                while (base < count) {
                    int ack = in.readInt();
                    System.out.println("Acknowledgement of frame no " + (ack % x) + " recieved.\n");
                    base = ack + 1; // Slide base forward
                }
            } catch (SocketTimeoutException e) {
                System.out.println("No reply from server in 3.5 seconds. Resending data from frame no " + (base % x) + "\n");
            }
        }

        out.writeInt(-1); // Signal exit
        System.out.println("All elements sent successfully. Exiting");
        socket.close();
        sc.close();
    }
}