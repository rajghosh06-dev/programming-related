<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ page import="javax.servlet.http.Cookie" %>
<!DOCTYPE html>
<html>
<head>
    <title>List Cookies</title>
</head>
<body>
<%
    String name = request.getParameter("name");
    String age = request.getParameter("age");
    String add = request.getParameter("add");
    String list = request.getParameter("list");

    // If "Add Cookie" button clicked
    if(add != null && name != null && age != null && !name.isEmpty() && !age.isEmpty()) {
        Cookie c1 = new Cookie(name, age);
        c1.setMaxAge(60 * 60); // cookie valid for 1 hour
        response.addCookie(c1);
        out.println("<h3>Cookie Added: " + name + " = " + age + "</h3>");
    }

    // If "List Cookies" button clicked
    if(list != null) {
        Cookie clientCookies[] = request.getCookies();
        if(clientCookies != null) {
            out.println("<h3>Cookies stored in browser:</h3>");
            for(int i = 0; i < clientCookies.length; i++) {
                out.println("<b>" + clientCookies[i].getName() + " : " 
                            + clientCookies[i].getValue() + "</b><br>");
            }
        } else {
            out.println("<h3>No cookies found!</h3>");
        }
    }
%>
</body>
</html>
