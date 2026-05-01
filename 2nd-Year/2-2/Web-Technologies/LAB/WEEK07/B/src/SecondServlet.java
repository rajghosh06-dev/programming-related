import java.io.*;
import javax.servlet.*;
import javax.servlet.http.*;

public class SecondServlet extends HttpServlet
{
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException
    {
        try
        {
            response.setContentType("text/html");
            PrintWriter out = response.getWriter();

            Cookie ck[] = request.getCookies();

            if (ck != null)
            {
                out.print("<h2>Cookies stored:</h2>");
                for (Cookie c : ck)
                {
                    if ("uname".equals(c.getName()))
                    {
                        out.print("<h2>Hello " + c.getValue() + "</h2>");
                    }
                }
            }
            else
            {
                out.print("<h2>No cookies found</h2>");
            }

            out.close();
        }
        catch (Exception e)
        {
            System.out.println(e);
        }
    }
}
