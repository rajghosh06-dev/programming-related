# WEEK-6 Crypto - Arithmetic Problem
for O in range(1,10):
    for N in range(10):
        for E in range(10):
            for T in range(1,10):
                for W in range(10):

                    if len({O,N,E,T,W}) == 5:
                        ONE = 100*O + 10*N + 1*E
                        ONE = 100*O + 10*N + 1*E
                        TWO = 100*T + 10*W + 1*O

                        if ONE + ONE == TWO:
                            print("O =", O)
                            print("N =", N)
                            print("E =", E)
                            print("T =", T)
                            print("W =", W)
                            print(ONE, "+", ONE, "=", TWO)