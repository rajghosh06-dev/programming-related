import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class Calculator extends HttpServlet
{
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {

        response.setContentType("text/html");
        PrintWriter out = response.getWriter();

        try
        {
            int a1 = Integer.parseInt(request.getParameter("n1"));
            int a2 = Integer.parseInt(request.getParameter("n2"));
            String op = request.getParameter("r1");

            switch (op) {
                case "add" -> out.println("<h2>Addition is " + (a1 + a2) + "</h2>");
                case "sub" -> out.println("<h2>Subtraction is " + (a1 - a2) + "</h2>");
                case "mul" -> out.println("<h2>Multiplication is " + (a1 * a2) + "</h2>");
                case "div" -> {
                    if (a2 != 0) {
                        out.println("<h2>Division is " + (a1 / a2) + "</h2>");
                    } else {
                        out.println("<h2>Cannot divide by zero</h2>");
                    }
                }
                case "mod" -> out.println("<h2>Modulus is " + (a1 % a2) + "</h2>");
                case null, default -> out.println("<h2>Please select a valid operator</h2>");
            }
        }
        catch (Exception e)
        {
            out.println("<h2>Error: " + e.getMessage() + "</h2>");
        }

        out.close();
    }
}
