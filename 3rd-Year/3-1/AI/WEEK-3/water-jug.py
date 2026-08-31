    # WEEK-3 [Water-Jug Problem]
X = 0  # 4-gallon jug
Y = 0  # 3-gallon jug
MAX_X = 4
MAX_Y = 3

def print_state(action=""):
    print(f"{action:<25} -> Jug X (4L): {X} | Jug Y (3L): {Y}")

def emptyX():
    global X
    X = 0
    print_state("Empty X")
def emptyY():
    global Y
    Y = 0
    print_state("Empty Y")

def fillX():
    global X
    X = MAX_X
    print_state("Fill X")
def fillY():
    global Y
    Y = MAX_Y
    print_state("Fill Y")

def pourXtoY():
    global X, Y
    # Pour maximum available water from X into remaining capacity of Y
    pour_amount = min(X, MAX_Y - Y)
    X -= pour_amount
    Y += pour_amount
    print_state("Pour X into Y")

def pourYtoX():
    global X, Y
    # Pour maximum available water from Y into remaining capacity of X
    pour_amount = min(Y, MAX_X - X)
    Y -= pour_amount
    X += pour_amount
    print_state("Pour Y into X")


