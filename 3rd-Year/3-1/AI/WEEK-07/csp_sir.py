# Crypt-Arithmetic Problem
#constraint satisfaction problem (send+more=money)
for S in range(1, 10):
    for E in range(10):
        for N in range(10):
            for D in range(10):
                for M in range(1, 10):
                    for O in range(10):
                        for R in range(10):
                            for Y in range(10):

                                if len({S,E,N,D,M,O,R,Y}) == 8:

                                    SEND = 1000*S + 100*E + 10*N + D
                                    MORE = 1000*M + 100*O + 10*R + E
                                    MONEY = 10000*M + 1000*O + 100*N + 10*E + Y

                                    if SEND + MORE == MONEY:
                                        print("S =", S)
                                        print("E =", E)
                                        print("N =", N)
                                        print("D =", D)
                                        print("M =", M)
                                        print("O =", O)
                                        print("R =", R)
                                        print("Y =", Y)
                                        print(SEND, "+", MORE, "=", MONEY)
