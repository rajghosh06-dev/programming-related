package personal;

import java.io.*;
import java.net.*;
import java.util.Scanner;

public class ChatServer {
    public static void main(String[] args) throws Exception {
        ServerSocket ss = new ServerSocket(2000);
        System.out.println("Waiting for client...");
        Socket s = ss.accept();

        Scanner in = new Scanner(s.getInputStream());
        PrintWriter out = new PrintWriter(s.getOutputStream(), true);
        Scanner kb = new Scanner(System.in);

        while (in.hasNextLine()) {
            String msg = in.nextLine();
            System.out.println("Client: " + msg);
            if (msg.equalsIgnoreCase("BYE")) break;

            System.out.print("Server: ");
            out.println(kb.nextLine());
        }
        ss.close();
    }
}
