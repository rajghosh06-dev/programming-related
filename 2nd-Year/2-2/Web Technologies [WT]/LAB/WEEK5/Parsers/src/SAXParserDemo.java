import java.io.File;
import java.util.Scanner;
import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;

public class SAXParserDemo {
    public static void main(String[] args) {
        try {
            Scanner sc = new Scanner(System.in);
            System.out.println("Enter User Id:");
            String uid = sc.next();

            File inputFile = new File("input.xml");
            SAXParserFactory factory = SAXParserFactory.newInstance();
            SAXParser saxParser = factory.newSAXParser();

            UserHandler handler = new UserHandler(uid);
            saxParser.parse(inputFile, handler); // corrected

            if (!handler.isFound()) {
                System.out.println("User Id: " + uid + " not found.");
            }
            sc.close();
        } catch (Exception e) {
            e.printStackTrace(); // corrected spelling
        }
    }
}
