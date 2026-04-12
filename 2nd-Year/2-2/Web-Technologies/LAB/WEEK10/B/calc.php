<?php
if (isset($_POST["submit"])) {
    $op1 = (int)$_POST["op1"];
    $op2 = (int)$_POST["op2"];
    $operator = $_POST["operator"];

    switch ($operator) {
        case "+":
            echo "Addition of $op1 and $op2 is " . ($op1 + $op2);
            break;
        case "-":
            echo "Subtraction of $op1 and $op2 is " . ($op1 - $op2);
            break;
        case "*":
            echo "Multiplication of $op1 and $op2 is " . ($op1 * $op2);
            break;
        case "/":
            if ($op2 != 0) {
                echo "Division of $op1 and $op2 is " . ($op1 / $op2);
            } else {
                echo "Error: Division by zero is not allowed.";
            }
            break;
        case "%":
            echo "Remainder of $op1 divided by $op2 is " . ($op1 % $op2);
            break;
        default:
            echo "Invalid operator. Please use +, -, *, /, or %.";
    }
}
?>
