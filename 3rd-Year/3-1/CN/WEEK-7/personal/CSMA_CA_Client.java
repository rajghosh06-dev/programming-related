// Week-7
// CSMA-CA Client
package personal;

import java.io.*;
import java.net.*;
import java.util.Random;

public class CSMA_CA_Client {
    public static void main(String[] args) throws Exception {
        Random rand = new Random();

        for (int k = 1; k <= 15; k++) {
            System.out.println("\nAttempt " + k);

            // 1. Sense Channel
            if (!isIdle()) {
                System.out.println("Channel busy, retrying...");
                continue;
            }

            // 2. Wait IFS
            System.out.println("Channel idle. Waiting IFS (1000ms)...");
            Thread.sleep(1000);

            // 3. Sense Channel again
            if (!isIdle()) {
                System.out.println("Channel busy after IFS!");
                continue;
            }

            // 4. Backoff Time
            int r = rand.nextInt((int) Math.pow(2, Math.min(k, 10)));
            System.out.println("Backoff slot R = " + r + " (Waiting " + (r * 200) + "ms)...");
            Thread.sleep(r * 200);

            // 5. Send Frame & Wait for ACK
            try (Socket s = new Socket("localhost", 5000);
                 PrintWriter out = new PrintWriter(s.getOutputStream(), true);
                 BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()))) {
                
                s.setSoTimeout(3000);
                out.println("Frame " + k);
                System.out.println("Frame sent. Waiting ACK...");

                if ("ACK".equalsIgnoreCase(in.readLine())) {
                    System.out.println("ACK received! Transmission successful.");
                    return;
                }
            } catch (IOException e) {
                System.out.println("ACK not received (Timeout). Retrying...");
            }
        }
    }

    // Helper: checks if channel is clear
    static boolean isIdle() {
        try (Socket s = new Socket("localhost", 5000);
             PrintWriter out = new PrintWriter(s.getOutputStream(), true)) {
            out.println(""); // Empty probe
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}