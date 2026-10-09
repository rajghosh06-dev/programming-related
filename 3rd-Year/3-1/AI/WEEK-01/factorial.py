# WEEK-1 (C): Factorial of a Number
num = int(input("Enter the number: "))
if num == 0 or num == 1:
    print(f"Factorial of {num} is: {1}")
    exit(0)
if num < 1:
    print(f"Factorial of {num} is not possible")
    exit(0)
fact = 1
for i in range(2,num+1):
    fact *= i
print(f"Factorial of {num} is: {fact}")

'''
# TYPE:2
def factorial(num):
    if num == 1:
        return 1
    else:
        return num*factorial(num-1)
print('Factorial of',num,'is',factorial(num))

# TYPE:3
num = int(input("Enter the number: "))

# Handle 0 and 1
if num == 0 or num == 1:
    print(f"Factorial of {num} is: {1}")
    exit(0)

# Handle negative numbers
if num < 1:
    print(f"Factorial of {num} is not possible")
    exit(0)

fact = 1
i = 2

# While loop replaces the for loop
while i <= num:
    fact *= i
    i += 1

print(f"Factorial of {num} is: {fact}")
'''
