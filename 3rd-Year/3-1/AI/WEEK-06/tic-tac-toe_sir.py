# [WEEK-11] Tic-Tac-Toe Game
board = [" ", " ", " ",
         " ", " ", " ",
         " ", " ", " ",]

player = 'X'

def printBoard(board):
    print()
    print("\t ",board[0]," | ",board[1]," | ",board[2])
    print("\t","--- | --- | ---")
    print("\t ",board[3]," | ",board[4]," | ",board[5])
    print("\t","--- | --- | ---")
    print("\t ",board[6]," | ",board[7]," | ",board[8])

def tictac(board, player):
    for turn in range(9):
        printBoard(board)
        position = int(input("Player "+player+", Enter position (1-9): "))
        if board[position-1] == " ":
            board[position-1] = player
        else:
            print("Position already occupied!")
            continue

        win = (
            (board[0]==board[1]==board[2] != " ") or
            (board[3]==board[4]==board[5] != " ") or
            (board[6]==board[7]==board[8] != " ") or
            (board[0]==board[3]==board[6] != " ") or
            (board[1]==board[4]==board[7] != " ") or
            (board[2]==board[5]==board[8] != " ") or
            (board[0]==board[4]==board[8] != " ") or
            (board[2]==board[4]==board[6] != " ")
        )

        if win:
            print("Player", player,"wins!")
            exit(0)

        if player == "X":
            player = "O"
        else:
            player = "X"
    print('Match Draw')

tictac(board, player)