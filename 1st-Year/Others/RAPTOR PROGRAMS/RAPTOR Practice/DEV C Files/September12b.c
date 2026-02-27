#include<stdio.h>
#include<math.h>
int main()
{
	int a, b, c, d, r1, r2;
	printf("Enter the value of a:");
	scanf("%d",&a);
	printf("Enter the value of b:");
	scanf("%d",&b);
	printf("Enter the value of c:");
	scanf("%d",&c);
	d=((b^2)-(4*a*c));
	if(d==0)
	{
		r1=((-b)/(2*a));
		r2=((-b)/(2*a));
		printf("\nThe Roots are Real and Equal. Discriminant:%d	r1:%d	r2:%d",d,r1,r2);
	}	
	else if(d>0)
	{
		r1 = ((-b)+(sqrt(d))/(2*a));
		r2 = ((-b)-(sqrt(d))/(2*a));
		printf("\nThe Roots are Real and Distinct. Distriminant:%d	r1=%d	r2%d",d,r1,r2);
	}
	else
		printf("The Roots are Imaginary.%d",d);
	return 0;
}
