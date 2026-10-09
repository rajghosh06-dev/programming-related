// Week-7
// CSMA-CD Client

package personal;

import java.io.*;
import java.net.*;
import java.util.Random;

public class CSMA_CD_Client {
    public static void main(String[] args) throws Exception {
        Random rand = new Random();

        for (int k = 1; k <= 15; k++) {
            System.out.println("\nAttempt " + k + ": Sending frame...");
            try (Socket s = new Socket("localhost", 5000);
                 PrintWriter out = new PrintWriter(s.getOutputStream(), true)) {
                out.println("CNLABS - Frame Data");
                System.out.println("Transmission successful!");
                return;
            } catch (IOException e) {
                System.out.println("Collision! Retrying...");
                int r = rand.nextInt((int) Math.pow(2, Math.min(k, 10)));
                int waitTime = r * 500;
                System.out.println("Collision! Backoff R=" + r + " (Waiting " + waitTime + "ms)");
                Thread.sleep(waitTime);
            }
        }
        System.out.println("Failed after 15 attempts.");
    }
}