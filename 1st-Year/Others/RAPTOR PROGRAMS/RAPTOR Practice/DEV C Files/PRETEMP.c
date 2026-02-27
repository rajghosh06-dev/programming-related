#include<stdio.h>
int main()
{
	int a, b, c, d, T;
	printf("\nEnter the Marks Scored in Subject1:");
	scanf("%d",&a);
	printf("\nEnter the Marks Scored in Subject2:");
	scanf("%d",&b);
	printf("\nEnter the Marks scored in Subject3:");
	scanf("%d",&c);
	d=a+b+c;
	T=d/3;
	printf("\nFINAL%d",T);
	return 0;
}
