//CONSTRUCTOR OVERLOADING

package week3;
//import java.io.*;

public class ConOverloading
{
    public ConOverloading()
    {
        System.out.println("Default Constructor");
    }
    public ConOverloading(int i)
    {
        System.out.println("Single Parameter Constructor with int value");
    }
    public ConOverloading(String str)
    {
        System.out.println("Single Parameter Constructor with String Object");
    }
    public ConOverloading(int i, int j)
    {
        System.out.println("Double Parameter Constructor");
    }
    public static void main(String [] args)
    {
        ConOverloading c1 = new ConOverloading();
        ConOverloading c2 = new ConOverloading(10);
        ConOverloading c3 = new ConOverloading(10, 20);
    }
    
}
