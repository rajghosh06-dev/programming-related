// LABx_30MAR2026
// WEEK-7 :: KNAPSACK PROBLEM using TABULAR Method
package WEEK7;

import java.util.*;

public class KnapSack01_tabulation
{
    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);
        System.out.println("Enter Number of Weight and Profit (Columns): ");
        int n = sc.nextInt();
        System.out.println("Enter Capacity of KnapSack (Rows): ");
        int m = sc.nextInt();

        int[] wt = new int[n];
        int[] pt = new int[n];
        System.out.println("Enter " + n + " Weights: ");
        for (int i = 0; i < n; i++)
        {
            wt[i] = sc.nextInt();
        }
        System.out.println("Enter " + n + " Profits: ");
        for (int i = 0; i < n; i++)
        {
            pt[i] = sc.nextInt();
        }

        int[][] knapMat = new int[n + 1][m + 1];

        // Fill DP table
        for (int i = 1; i <= n; i++)
        {
            for (int j = 1; j <= m; j++)
            {
                if (wt[i - 1] <= j)
                {
                    knapMat[i][j] = Math.max(knapMat[i - 1][j], pt[i - 1] + knapMat[i - 1][j - wt[i - 1]]);
                }
                else
                {
                    knapMat[i][j] = knapMat[i - 1][j];
                }
            }
        }

        System.out.println("Maximum Profit = " + knapMat[n][m]);

        System.out.println("\nKnapsack DynamicProgramming Matrix:");
        for (int i = 0; i <= n; i++)
        {
            for (int j = 0; j <= m; j++)
            {
                System.out.print(knapMat[i][j] + "\t");
            }
            System.out.println();
        }

        // Backtracking to find selected items (binary vector)
        int res = knapMat[n][m];
        int w = m;
        int[] selected = new int[n]; // 0/1 vector

        for (int i = n; i > 0 && res > 0; i--)
        {
            if (res != knapMat[i - 1][w])
            {
                selected[i - 1] = 1;   // item taken
                res -= pt[i - 1];
                w -= wt[i - 1];
            }
            else
            {
                selected[i - 1] = 0;   // not taken
            }
        }


        System.out.println("\nSelection Vector (1 = selected, 0 = not selected):");
        for (int i = 0; i < n; i++)
        {
            System.out.print(selected[i] + " ");
        }

        sc.close();
    }
}
