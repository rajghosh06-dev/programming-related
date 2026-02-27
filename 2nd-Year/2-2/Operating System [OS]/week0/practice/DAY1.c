#include<stdio.h>
int main()
{
	int a;
	printf("\nHello World! This is Rishit!\n");
	printf("Welcome to INDIA!\nEnter TICKETS: ");
	scanf("%d",&a);
	if(a == 0)
	{
		printf("NO Tickets!\n");
		return 0;
	}
	for(int i = 0; i < a; i++)
	{
		printf("\nTicket %d allowed! Go in!",i);
	}
	printf("\nSystem Shutting Down...\n");
	return 0;
}

