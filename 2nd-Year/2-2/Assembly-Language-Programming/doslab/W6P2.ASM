ASSUME CS: CODE, DS: DATA, ES: DATA
DATA SEGMENT
        STR1 DB "OSALPLAB$"
        COUNT EQU ($-STR1)
        STR2 DB 9 DUP(0)
DATA ENDS

CODE SEGMENT
        MOV AX, DATA
        MOV DS, AX
        MOV ES, AX
        MOV CX, COUNT-1
        LEA SI, STR1
        LEA DI, STR2
        ADD SI, COUNT-2
    L1: STD
        LODSB
        CLD
        STOSB
        LOOP L1
        MOV AL, 24H
        STOSB
        MOV AH, 09H
        LEA DX, STR2
        INT 21H
        INT 3H
CODE ENDS

END
