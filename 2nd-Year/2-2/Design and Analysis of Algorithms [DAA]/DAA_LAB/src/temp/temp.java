package temp;
import java.util.*;

public class temp
{
    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);

        int X = sc.nextInt();

        
        int cub = (X,3);
        int sq = X^2;

        System.out.println("Square of "+X+" is "+sq);
        System.out.println("Cube of "+X+" is "+cub);
        sc.close();
    }
}
