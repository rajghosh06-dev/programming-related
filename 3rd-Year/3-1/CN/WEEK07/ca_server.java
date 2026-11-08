// Week-7
// CSMA-CA Server
import java.io.*;
import java.net.*;
public class ca_server
{
public static void main(String[] args)
{
try
{
System.out.println("============ Client 2 ===============");
ServerSocket ss = new ServerSocket(5000);
System.out.println("Waiting for connection");
Socket con = ss.accept();
System.out.println("Connected");
ObjectInputStream in = new ObjectInputStream(con.getInputStream());
System.out.println((String)in.readObject());
in.close();
ss.close();
 }
catch(Exception e)
{
System.out.println(e);
}
}
}
