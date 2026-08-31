package B.My_version;

import java.io.*;
import java.net.*;
import java.util.Scanner;

public class StopWaitSender
{
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        System.out.println("Enter no of frames to be sent:");
        int n = sc.nextInt();

        Socket socket = new Socket("localhost", 9999);
        // Timeout after 3 seconds if receiver drops an ACK
        socket.setSoTimeout(3000);

        PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
        BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));

        int i = 0;
        while (i < n) {
            System.out.println("Frame no " + i + " is sent");
            out.println(i);

            try {
                String ack = in.readLine();
                if (ack != null && ack.equals("Received")) {
                    System.out.println("Acknowledgement was Received from receiver");
                    i++;
                    Thread.sleep(1000);
                }
            } catch (SocketTimeoutException e) {
                System.out.println("Timeout! Resending frame " + i);
            }
        }

        out.println("exit");
        sc.close();
        socket.close();
    }
}