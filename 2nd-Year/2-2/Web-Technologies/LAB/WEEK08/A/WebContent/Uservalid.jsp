<%@ page import="java.sql.*" %>
<%@ page import="java.io.*" %>
<html>
<body>
<%
    String n = request.getParameter("username");
    String p = request.getParameter("userpass");

    Connection conn = null;
    try {
        String URL = "jdbc:mysql://localhost:3306/mydb";
        String USER = "root";
        String PASSWORD = "Tata@12345";

        Class.forName("com.mysql.cj.jdbc.Driver"); // updated driver class
        conn = DriverManager.getConnection(URL, USER, PASSWORD);

        PreparedStatement ps = conn.prepareStatement(
            "SELECT * FROM user WHERE name=? AND pass=?"
        );
        ps.setString(1, n);
        ps.setString(2, p);

        ResultSet rs = ps.executeQuery();

        if (rs.next()) {
            out.println("<h2>Welcome " + n + "!</h2>");
        } else {
            out.println("<h2>Sorry, username or password error.</h2>");
        }

        rs.close();
        ps.close();
        conn.close();
    } catch (Exception ex) {
        out.println("Unable to connect to database: " + ex.getMessage());
    }
%>
</body>
</html>
