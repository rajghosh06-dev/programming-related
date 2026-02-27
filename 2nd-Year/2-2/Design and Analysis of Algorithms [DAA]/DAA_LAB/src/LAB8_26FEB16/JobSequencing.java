//JOB Sequencing
package LAB8_26FEB16;

import java.util.*;

class Job
{
    int id, deadline, profit;
    Job(int id, int deadline, int profit)
    {
        this.id = id;
        this.deadline = deadline;
        this.profit = profit;
    }
}

public class JobSequencing
{
    
    // Standard Job Sequencing with Deadlines
    public static void jobSequencing(List<Job> jobs, int n)
    {
        // Sort jobs by profit (descending)
        jobs.sort((a, b) -> b.profit - a.profit);

        int[] result = new int[n]; // store job sequence
        boolean[] slot = new boolean[n]; // track filled slots

        Arrays.fill(slot, false);

        int totalProfit = 0;

        for (Job job : jobs)
        {
            // Find a free slot before deadline
            for (int j = Math.min(n, job.deadline) - 1; j >= 0; j--)
            {
                if (!slot[j])
                {
                    slot[j] = true;
                    result[j] = job.id;
                    totalProfit += job.profit;
                    break;
                }
            }
        }

        System.out.println("\nJob Sequence (Standard):");
        for (int i = 0; i < n; i++)
        {
            if (slot[i]) System.out.print("J" + result[i] + " ");
        }
        System.out.println("\nTotal Profit: " + totalProfit);
    }

    // Fast Job Sequencing with Deadlines (Union-Find style)
    static int[] parent;

    public static int find(int s)
    {
        if (s == parent[s]) return s;
        return parent[s] = find(parent[s]);
    }

    public static void fastJobSequencing(List<Job> jobs, int n)
    {
        jobs.sort((a, b) -> b.profit - a.profit);

        parent = new int[n+1];
        for (int i = 0; i <= n; i++) parent[i] = i;

        int totalProfit = 0;
        List<Integer> sequence = new ArrayList<>();

        for (Job job : jobs)
        {
            int availableSlot = find(Math.min(n, job.deadline));
            if (availableSlot > 0)
            {
                parent[availableSlot] = find(availableSlot - 1);
                sequence.add(job.id);
                totalProfit += job.profit;
            }
        }

        System.out.println("\nJob Sequence (Fast):");
        for (int id : sequence) System.out.print("J" + id + " ");
        System.out.println("\nTotal Profit: " + totalProfit);
    }

    public static void main(String[] args)
    {
        Scanner sc = new Scanner(System.in);

        System.out.print("Enter number of jobs: ");
        int n = sc.nextInt();

        List<Job> jobs = new ArrayList<>();
        for (int i = 1; i <= n; i++)
        {
            System.out.print("Enter deadline and profit for Job " + i + ": ");
            int d = sc.nextInt();
            int p = sc.nextInt();
            jobs.add(new Job(i, d, p));
        }

        jobSequencing(jobs, n);
        fastJobSequencing(jobs, n);

        sc.close();
    }
}
