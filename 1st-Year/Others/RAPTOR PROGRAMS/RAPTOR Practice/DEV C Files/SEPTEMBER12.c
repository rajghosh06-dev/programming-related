#include<stdio.h>
int main()
{
	int a, b, c, d, T;
	printf("\nEnter the Marks Scored in Subject1:%d");
	scanf("%d",&a);
	printf("\nEnter the Marks Scored in Subject2:%d");
	scanf("%d",&b);
	printf("\nEnter the Marks scored in Subject3:%d");
	scanf("%d",&c);
	d=a+b+c;
	T=d/3;
	if(T<=30)
		printf("FAIL. Scored:%d",T);
	else if(31<T && T<50)
		printf("PASS. GRADE-C. Scored:%d",T);
	else if(51<T && T<60)
		printf("PASS. GRADE-B. Scored:%d",T);
	return 0;
}
