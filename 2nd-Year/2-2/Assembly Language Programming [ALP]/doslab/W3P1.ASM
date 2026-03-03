; PROGRAM TO PRINT NUMBERS FROM 0 TO 9
ASSUME CS:CODE, DS:DATA
DATA SEGMENT
        COU DB 0AH
        ARRNUM DB 10H DUP(0)
DATA ENDS
CODE SEGMENT
        MOV AX, DATA
        MOV DS, AX
        MOV CL, COU
        MOV SI, OFFSET ARRNUM
        MOV AL, 00H

  BACK: MOV [SI], AL
        DEC CL
        JZ GO
        INC AL
        INC SI
        JMP BACK

    GO: HLT
CODE ENDS
END
