#include<stdio.h>
int main()
{
	int n;
	printf("\nEnter the Number(n):");
	scanf("%d",&n);
	if (n%2==0)
	{
		if (n%4==0)
		{
			if (n%8==0)
			{
				printf("\nIt is a Multiple of 2, 4, 8.");
			}
			else
				printf("\nIt is a Multiple of 2, 4. But not a multiple of 8.");
		}
		else
			printf("\nIt is divisible by 2. But not a Multiple of 4, 8.");
	}
	else
		printf("\nIt is NOT a Multiple of 2, 4, 8");
	return 0;
}
