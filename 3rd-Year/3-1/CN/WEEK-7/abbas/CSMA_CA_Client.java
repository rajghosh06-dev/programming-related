package abbas;

import java.io.*;
import java.net.*;
import java.util.Random;

class CSMA_CA_Client {

    static boolean isIdle() {
        try (Socket socket = new Socket("localhost", 5000);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true)) {
            out.println(""); // Probe connection
            return true;
        } catch (Exception e) {
            return false; // Channel is unreachable/busy
        }
    }

    public static void main(String[] args) throws Exception {
        Random rand = new Random();

        for (int k = 1; k <= 15; k++) {
            System.out.println("Attempt: " + k);

            // 1. Initial channel sensing
            if (!isIdle()) {
                System.out.println("Channel busy");
                continue;
            }
            System.out.println("Channel idle");

            // 2. Wait IFS
            Thread.sleep(1000);

            // 3. Sense channel again
            if (!isIdle()) {
                System.out.println("Channel busy after IFS");
                continue;
            }

            // 4. Random backoff R in [0, 2^k - 1]
            int maxSlot = (int) Math.pow(2, Math.min(k, 10)) - 1;
            int R = rand.nextInt(maxSlot + 1);
            System.out.println("Backoff slots: " + R);
            Thread.sleep(R * 200L);

            // 5. Send actual frame and receive ACK
            try (Socket s = new Socket("localhost", 5000);
                 PrintWriter out = new PrintWriter(s.getOutputStream(), true);
                 BufferedReader in = new BufferedReader(new InputStreamReader(s.getInputStream()))) {

                s.setSoTimeout(3000);
                out.println("Frame Data - Attempt " + k);
                System.out.println("Message sent");

                String ack = in.readLine();
                if ("ACK".equalsIgnoreCase(ack)) {
                    System.out.println("ACK received");
                    break;
                }
            } catch (Exception e) {
                System.out.println("ACK not received (timeout/error)");
            }
        }
    }
}