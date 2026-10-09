// Week-7
// CSMA-CD Server
import java.io.*;
import java.net.*;

public class cd_server
{
    public static void main(String[] args)
    {
        try
        {
            System.out.println("============ Server ===============");

            ServerSocket ss = new ServerSocket(5000);

            System.out.println("Waiting for connection...");

            Socket con = ss.accept();

            System.out.println("Connected");

            ObjectInputStream in =
                new ObjectInputStream(con.getInputStream());

            String msg = (String) in.readObject();

            System.out.println("Received message: " + msg);

            in.close();
            con.close();
            ss.close();
        }
        catch(Exception e)
        {
            System.out.println(e);
        }
    }
}
