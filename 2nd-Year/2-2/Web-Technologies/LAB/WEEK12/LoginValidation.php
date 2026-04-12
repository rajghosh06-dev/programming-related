<?php
session_start();

// Connect to MySQL
$con = mysqli_connect("localhost", "root", "Tata@12345", "test");
if (!$con) {
    die("Connection failed: " . mysqli_connect_error());
}

// LOGIN PROCESS
if (isset($_POST['submit'])) {
    $uname = $_POST['user'];
    $pwd   = $_POST['pass'];

    if ($uname && $pwd) {
        // Check if username + password match
        $res = mysqli_query($con, "SELECT * FROM users WHERE username='$uname' AND password='$pwd'");
        if ($res && mysqli_num_rows($res) > 0) {
            $row = mysqli_fetch_assoc($res);
            echo "<h1>Welcome " . $row['name'] . "</h1>";
            exit;
        }

        // Check if username exists but password mismatch
        $res = mysqli_query($con, "SELECT * FROM users WHERE username='$uname'");
        if ($res && mysqli_num_rows($res) > 0) {
            echo "<center><h3>Password Mismatch!</h3></center>";
            exit;
        }

        // If username not found → show registration form
        echo '<center>
                <h3>User not available.</h3>
                <h2>Registration Form</h2>
                <form method="post">
                    Full Name: <input type="text" name="name"><br>
                    Username: <input type="text" name="user"><br>
                    Password: <input type="password" name="pass"><br>
                    Retype Password: <input type="password" name="pass1"><br>
                    <input type="submit" name="register" value="Register">
                </form>
              </center>';
        exit;
    }
}

// REGISTRATION PROCESS
if (isset($_POST['register'])) {
    $uname = $_POST['user'];
    $name  = $_POST['name'];
    $pwd   = $_POST['pass'];
    $pwd1  = $_POST['pass1'];

    if ($uname && $name && $pwd && $pwd1) {
        if (strcmp($pwd, $pwd1) != 0) {
            echo "Passwords do not match!";
        } else {
            $res = mysqli_query($con, "INSERT INTO users (username, password, name) VALUES ('$uname','$pwd','$name')");
            if ($res) {
                echo "Inserted Successfully. You can now login.";
            } else {
                echo "Error: " . mysqli_error($con);
            }
        }
    }
}
?>

<!-- LOGIN FORM -->
<center>
    <h2>Sign In</h2>
    <form method="post">
        Username: <input type="text" name="user"><br>
        Password: <input type="password" name="pass"><br>
        <input type="submit" name="submit" value="Login">
    </form>
</center>
