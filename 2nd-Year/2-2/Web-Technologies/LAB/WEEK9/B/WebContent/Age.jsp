<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <title>Age Authorization Result</title>
</head>
<body>
<%
    try {
        String name = request.getParameter("username");
        int age = Integer.parseInt(request.getParameter("age"));

        if(age < 18) {
            out.println("<h2>Hello " + name + ", you are not authorized to visit this site.</h2>");
        } else {
            out.println("<h2>Welcome " + name + " to this site!</h2>");
        }
    } catch(Exception e) {
        out.println("<h2>Error: Please enter a valid age.</h2>");
    }
%>
</body>
</html>
