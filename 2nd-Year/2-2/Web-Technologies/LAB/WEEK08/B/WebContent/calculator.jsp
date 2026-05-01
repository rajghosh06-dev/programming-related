<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <title>Calculator Result</title>
</head>
<body>
<%
    try {
        int n1 = Integer.parseInt(request.getParameter("num1"));
        int n2 = Integer.parseInt(request.getParameter("num2"));
        String op = request.getParameter("r1");

        if(op == null) {
            out.println("<h2>Please select an operator!</h2>");
        } else if(op.equals("add")) {
            out.println("<h2>Addition: " + (n1 + n2) + "</h2>");
        } else if(op.equals("sub")) {
            out.println("<h2>Subtraction: " + (n1 - n2) + "</h2>");
        } else if(op.equals("mul")) {
            out.println("<h2>Multiplication: " + (n1 * n2) + "</h2>");
        } else if(op.equals("div")) {
            if(n2 != 0) {
                out.println("<h2>Division: " + (n1 / n2) + "</h2>");
            } else {
                out.println("<h2>Error: Division by zero!</h2>");
            }
        } else if(op.equals("mod")) {
            if(n2 != 0) {
                out.println("<h2>Modulus: " + (n1 % n2) + "</h2>");
            } else {
                out.println("<h2>Error: Modulus by zero!</h2>");
            }
        } else {
            out.println("<h2>Invalid operator selected!</h2>");
        }
    } catch(Exception e) {
        out.println("<h2>Error: Please enter valid numbers!</h2>");
    }
%>
</body>
</html>
