<?php
$servername = "localhost";
$username = "root";
$password = "Tata@12345";
$dbname = "WT";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

$sql = "SELECT id, title, author, price FROM books";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
  echo "<table border='1'><tr><th>ID</th><th>Title</th><th>Author</th><th>Price</th></tr>";
  while($row = $result->fetch_assoc()) {
    echo "<tr><td>".$row["id"]."</td><td>".$row["title"]."</td><td>".$row["author"]."</td><td>".$row["price"]."</td></tr>";
  }
  echo "</table>";
} else {
  echo "0 results";
}
$conn->close();
?>
