<!DOCTYPE html>
<html>
<head>
    <title>Validation Form</title>
</head>
<body>
<center>
    <h2>Validation Form</h2>
    <form method="post">
        Name: <input type="text" name="uname"><br><br>
        Password: <input type="password" name="pass"><br><br>
        Email ID: <input type="text" name="email"><br><br>
        Phone Number: <input type="text" name="phone"><br><br>
        <input type="submit" name="submit" value="Validate">
    </form>

<?php
if (isset($_POST['submit'])) {
    $uname = $_POST['uname'];
    $pass = $_POST['pass'];
    $email = $_POST['email'];
    $phone = $_POST['phone'];
    $flag = 1;

    // Name validation
    if (!$uname) {
        echo "Name not entered!<br>";
        $flag = 0;
    } else {
        // Allow alphabets and spaces
        if (!preg_match("/^[a-zA-Z ]+$/", $uname)) {
            echo "Name must contain only alphabets and spaces<br>";
            $flag = 0;
        } else if (strlen($uname) < 6) {
            echo "Name must be at least 6 characters long<br>";
            $flag = 0;
        }
    }

    // Password validation
    if (!$pass) {
        echo "Password not entered!<br>";
        $flag = 0;
    } else {
        if (strlen($pass) < 6) {
            echo "Password must be at least 6 characters long<br>";
            $flag = 0;
        }
    }

    // Email validation
    if (!$email) {
        echo "Email not entered!<br>";
        $flag = 0;
    } else {
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo "Email address is incorrect<br>";
            $flag = 0;
        }
    }

    // Phone validation
    if (!$phone) {
        echo "Phone number not entered!<br>";
        $flag = 0;
    } else {
        if (!ctype_digit($phone)) {
            echo "Phone number must contain only digits<br>";
            $flag = 0;
        } else if (strlen($phone) != 10) {
            echo "Phone number must be exactly 10 digits long<br>";
            $flag = 0;
        }
    }

    // Final result
    if ($flag) {
        echo "<h3>All fields are validated successfully!</h3>";
    }
}
?>
</center>
</body>
</html>
