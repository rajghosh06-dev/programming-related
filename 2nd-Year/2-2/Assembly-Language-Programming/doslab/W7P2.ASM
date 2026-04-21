ASSUME CS:CODE, DS:DATA

DATA SEGMENT
    V DB 9, 6, 7, 8
DATA ENDS

CODE SEGMENT
    MOV AX, DATA
    MOV DS, AX

    MOV CH, 4          ; Number of passes for bubble sort
    MOV AL, 0

ITER:
    MOV BX, 0          ; Start index

NEXT:
    MOV AL, V[BX]      ; Load current element
    CMP AL, V[BX+1]    ; Compare with next element
    JNL SWAP           ; If AL >= next, swap
    JL CON             ; Else continue

SWAP:
    MOV DL, V[BX]      ; Save current element
    MOV AL, V[BX+1]    ; Load next element
    MOV V[BX+1], DL    ; Swap
    MOV V[BX], AL

CON:
    INC BX             ; Move to next index
    CMP BX, 3          ; End of array?
    JNZ NEXT           ; If not, repeat
    DEC CH             ; One pass done
    CMP CH, 0
    JNZ ITER           ; If passes remain, repeat

    ; Display sorted array
    MOV CL, 04H        ; Number of elements
    MOV BL, 0H

DISP:
    MOV DL, V[BX]      ; Load element
    ADD DL, 30H        ; Convert to ASCII
    INC BX
    MOV AH, 02H
    INT 21H
    LOOP DISP

    ; Exit program
    MOV AH, 4CH
    INT 21H
CODE ENDS
END
