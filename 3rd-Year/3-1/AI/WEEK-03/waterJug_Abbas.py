# WEEK-3 [WATER-JUG]
max_j1 = 4
max_j2 = 3
j1 = 0
j2 = 0

def j1_fill():
    global j1
    j1 = max_j1

def j2_fill():
    global j2
    j2 = max_j2

def j1_empty():
    global j1
    j1 = 0

def j2_empty():
    global j2
    j2 = 0

def j1j2_pour():
    global j1, j2
    if j1 + j2 <= max_j2:
        j2 = j1 + j2
        j1 = 0
    else:
        j1 = j1 - (max_j2 - j2)
        j2 = max_j2

def j2j1_pour():
    global j1, j2
    if j1 + j2 <= max_j1:
        j1 = j1 + j2
        j2 = 0
    else:
        j2 = j2 - (max_j1 - j1)
        j1 = max_j1

# Driver Execution
print("\t\t\tj1\tj2")
print(f"Original:\t{j1}\t{j2}")

j2_fill()
print(f"Fill J2:\t{j1}\t{j2}")

j2j1_pour()
print(f"Pour J2J1:\t{j1}\t{j2}")

j2_fill()
print(f"Fill J2:\t{j1}\t{j2}")

j2j1_pour()
print(f"Pour J2J1:\t{j1}\t{j2}")

j1_empty()
print(f"Empty J1:\t{j1}\t{j2}")

j2j1_pour()
print(f"Pour J2J1:\t{j1}\t{j2}")

print(f"Final:\t\t{j1}\t{j2}")