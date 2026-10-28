
import java.io.File;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.DefaultHandler;

public class DtdValidator {
    public static void main(String[] args) {
        try {
            DocumentBuilderFactory factory =
                DocumentBuilderFactory.newInstance();

            factory.setValidating(true);
            factory.setFeature(
                "http://xml.org/sax/features/validation", true
            );
            factory.setAttribute(
                XMLConstants.ACCESS_EXTERNAL_DTD, "file"
            );

            var builder = factory.newDocumentBuilder();

            builder.setErrorHandler(new DefaultHandler() {
                @Override
                public void error(SAXParseException e)
                        throws SAXParseException {
                    throw e;
                }

                @Override
                public void fatalError(SAXParseException e)
                        throws SAXParseException {
                    throw e;
                }
            });

            builder.parse(new File(args[0]));
            System.out.println(
                "SUCCESS: XML is valid according to the DTD."
            );
        } catch (Exception e) {
            System.out.println(
                "DTD VALIDATION FAILED: " + e.getMessage()
            );
        }
    }
}
