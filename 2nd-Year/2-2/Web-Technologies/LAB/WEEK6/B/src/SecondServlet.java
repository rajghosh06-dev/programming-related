import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class SecondServlet extends HttpServlet
{
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("text/html");
        PrintWriter out = response.getWriter();

        String n = request.getParameter("username");
        String p = request.getParameter("userpass");

        ServletConfig config = getServletConfig();
        String name = config.getInitParameter("username");
        String pass = config.getInitParameter("password");

        if (n != null && p != null && n.equals(name) && p.equals(pass)) {
            out.println("<h2>Welcome " + n + "</h2>");
        } else {
            out.println("<h2>Sorry username or password error</h2>");
            RequestDispatcher rd = request.getRequestDispatcher("/index.html");
            rd.include(request, response);
        }

        out.close();
    }
}
