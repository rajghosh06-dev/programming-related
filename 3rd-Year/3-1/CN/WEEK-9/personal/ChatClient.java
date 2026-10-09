package personal;

import java.io.*;
import java.net.*;
import java.util.Scanner;

public class ChatClient {
    public static void main(String[] args) throws Exception {
        Socket s = new Socket("127.0.0.1", 2000);

        Scanner in = new Scanner(s.getInputStream());
        PrintWriter out = new PrintWriter(s.getOutputStream(), true);
        Scanner kb = new Scanner(System.in);

        while (true) {
            System.out.print("Client: ");
            String msg = kb.nextLine();
            out.println(msg);
            if (msg.equalsIgnoreCase("BYE")) break;

            if (in.hasNextLine()) {
                System.out.println("Server: " + in.nextLine());
            }
        }
        s.close();
    }
}
