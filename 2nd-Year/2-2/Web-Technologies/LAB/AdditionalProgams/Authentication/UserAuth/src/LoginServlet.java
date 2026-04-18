import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class LoginServlet extends HttpServlet {
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        response.setContentType("text/html");
        PrintWriter out = response.getWriter();

        String user = request.getParameter("username");
        String pass = request.getParameter("password");

        if(user.equals("student") && pass.equals("password123")) {
            Cookie ck = new Cookie("username", user);
            ck.setMaxAge(4 * 365 * 24 * 60 * 60); // 4 years
            response.addCookie(ck);
            out.println("<h2>Welcome " + user + "!</h2>");
        } else {
            out.println("<h2>Invalid Login</h2>");
        }
    }
}
