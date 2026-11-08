package A;
// WEEK-5(a): Character / Byte Stuffing
import java.util.Scanner;

public class CharStuffing
{
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter number of words: ");
        int n = sc.nextInt();

        String[] in = new String[n];
        System.out.println("Enter the message (space-separated words): ");
        for (int i = 0; i < n; i++) {
            in[i] = sc.next();
        }

        // Byte Stuffing: Replace 'esc' with 'esc esc'
        for (int i = 0; i < n; i++) {
            if (in[i].equalsIgnoreCase("esc")) {
                in[i] = "esc esc";
            }
        }

        // Display transmitted frame
        System.out.println("\nTransmitted message is:");
        System.out.print("esc stx ");
        for (int i = 0; i < n; i++) {
            System.out.print(in[i] + " ");
        }
        System.out.println("esc etx");

        sc.close();
    }
}