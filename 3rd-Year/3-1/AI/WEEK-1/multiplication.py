# WEEK-1 (A): Multiplication
num = int(input("Enter the number: "))
instance = int(input("Enter number of instances:"))

for i in range(1,instance+1):
    print(f'{num} × {i} = {i*num}')

## TYPE:2
# for i in range(1,instance+1):
#     print(num*'*',i,'=',num*i)

## TYPE:3
# i=1
# while i<instance+1:
#     print(num,'*',i,'=',num*i)
#     i+=1