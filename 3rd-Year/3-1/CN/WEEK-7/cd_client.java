// Week-7
// CSMA-CD Client
import java.io.*;
import java.net.*;
import java.util.*;

public class cd_client
{
    public static void main(String[] args)
    {
        try
        {
            System.out.println("============ Client 1 ===============");

            cd_client cli = new cd_client();

            int Tp = 2000; // 2000 milliseconds = 2 seconds
            int R;
            int Tb;

            Random rand = new Random();

            for(int i = 1; i <= 15; i++)
            {
                System.out.println("\nAttempt : " + i);

                if(cli.send().equals("sent"))
                {
                    System.out.println("Transmission successful");
                    break;
                }
                else
                {
                    // Binary Exponential Backoff
                    int max = (int)Math.pow(2, i) - 1;

                    R = rand.nextInt(max + 1);

                    System.out.println("Selected Random number : " + R);

                    Tb = R * Tp;

                    System.out.println(
                        "Waiting for next attempt with backoff time: "
                        + (Tb / 1000.0) + " seconds"
                    );

                    Thread.sleep(Tb);
                }
            }
        }
        catch(InterruptedException e)
        {
            System.out.println(e);
        }
    }

    String send()
    {
        String str = null;
        String msg = "CNLABs";

        try
        {
            Socket soc = new Socket("localhost", 5000);

            ObjectOutputStream out =
                new ObjectOutputStream(soc.getOutputStream());

            out.writeObject(msg);
            out.flush();

            System.out.println("Message sent: " + msg);

            str = "sent";

            out.close();
            soc.close();
        }
        catch(Exception e)
        {
            str = "collision occured";
            System.out.println("Message sent : " + msg);
        }

        return str;
    }
}
