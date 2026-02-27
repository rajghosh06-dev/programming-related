#include<stdio.h>
int main()
{
	int i;
	for(i=1;i<=15;i++)
	{
		if(i==2)
			goto ERROR;
		printf("\n%d",i);
	}
	ERROR:
		printf("You have got an Error!");
	return 0;
}
