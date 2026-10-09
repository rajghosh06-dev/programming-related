# WEEK-1 (B): Prime Number
num = int(input("Enter the number: "))
flag = 1
for i in range(2,num):
    if flag !=0:
        if num%i == 0:
            flag = 0
            print(f'{num} is not a Prime number')
            exit(0)
if flag == 1:
    print(f'{num} is a Prime number')

## TYPE:2
# prime = 1
# for i in range(2,num):
#     if num%i == 0:
#         prime = 0
#         break
# if prime == 1:
#     print(num,'is PRIME')
# else:
#     print(num,'is not PRIME')

## TYPE:3
# prime = 1
# i=2
# while i<num:
#     if num%i == 0:
#         prime = 0
#         break
#     i+=1
# if prime == 1:
#     print(num,'is PRIME')
# else:
#     print(num,'is not PRIME')