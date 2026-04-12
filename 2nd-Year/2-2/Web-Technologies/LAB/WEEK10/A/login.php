<?php
// Get form input
$uname = $_POST["uname"];
$pass = $_POST["pass"];

// Connect to MySQL (adjust password/port if needed)
$con = mysqli_connect("localhost", "root", "Tata@12345", "WT");

// Check connection
if (!$con) {
    die("Could not connect: " . mysqli_connect_error());
}

// Prepare query (basic validation)
$query = "SELECT * FROM users WHERE USERNAME='$uname' AND PASSWORD='$pass'";
$records = mysqli_query($con, $query);

// Check result
if ($records && mysqli_num_rows($records) >= 1) {
    // Redirect to success page
    header("Location: success.html");
    exit();
} else {
    echo "<h3>Wrong username or password!</h3>";
}

// Close connection
mysqli_close($con);
?>
