; hello.asm - Simple ALP Program
.MODEL SMALL
.STACK 100H
.DATA
msg DB 'HELLO WORLD$'

.CODE
MAIN PROC
    MOV AX, @DATA   ; initialize data segment
    MOV DS, AX

    LEA DX, msg     ; load address of string
    MOV AH, 9       ; DOS function: print string
    INT 21H         ; call DOS interrupt

    MOV AH, 4CH     ; DOS function: exit program
    INT 21H
MAIN ENDP
END MAIN
