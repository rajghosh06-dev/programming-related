# [WEEK-11] Tic-Tac-Toe Game
board = [" "] * 9
player = 'X'

def printBoard(board):
    print()
    print(f"\t  {board[0]} | {board[1]} | {board[2]}")
    print("\t --- | --- | ---")
    print(f"\t  {board[3]} | {board[4]} | {board[5]}")
    print("\t --- | --- | ---")
    print(f"\t  {board[6]} | {board[7]} | {board[8]}\n")

def tictac(board, player):
    for turn in range(9):
        printBoard(board)
        
        # Keep asking until valid input
        while True:
            try:
                pos = int(input(f"Player {player}, enter position (1-9): "))
                if 1 <= pos <= 9 and board[pos - 1] == " ":
                    board[pos - 1] = player
                    break
                print("Invalid move or position occupied! Try again.")
            except ValueError:
                print("Please enter a valid number (1-9).")

        win = (
            (board[0] == board[1] == board[2] != " ") or
            (board[3] == board[4] == board[5] != " ") or
            (board[6] == board[7] == board[8] != " ") or
            (board[0] == board[3] == board[6] != " ") or
            (board[1] == board[4] == board[7] != " ") or
            (board[2] == board[5] == board[8] != " ") or
            (board[0] == board[4] == board[8] != " ") or
            (board[2] == board[4] == board[6] != " ")
        )

        if win:
            printBoard(board)
            print(f"Player {player} wins!")
            return

        player = "O" if player == "X" else "X"
        
    printBoard(board)
    print("Match Draw!")

tictac(board, player)