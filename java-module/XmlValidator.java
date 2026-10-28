import java.io.File;
import javax.xml.XMLConstants;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import javax.xml.transform.stream.StreamSource;
import org.xml.sax.SAXException;

public class XmlValidator {

    public static void main(String[] args) {
        if (args.length != 2) {
            System.out.println(
                "Usage: java XmlValidator <XML-file> <XSD-file>"
            );
            System.exit(1);
        }

        File xmlFile = new File(args[0]);
        File xsdFile = new File(args[1]);

        try {
            SchemaFactory factory = SchemaFactory.newInstance(
                XMLConstants.W3C_XML_SCHEMA_NS_URI
            );

            factory.setFeature(
                XMLConstants.FEATURE_SECURE_PROCESSING, true
            );

            // Prevent external DTD access during XSD validation.
            factory.setProperty(
                XMLConstants.ACCESS_EXTERNAL_DTD, ""
            );
            factory.setProperty(
                XMLConstants.ACCESS_EXTERNAL_SCHEMA, "file"
            );

            Schema schema = factory.newSchema(xsdFile);
            Validator validator = schema.newValidator();

            validator.setProperty(
                XMLConstants.ACCESS_EXTERNAL_DTD, ""
            );
            validator.setProperty(
                XMLConstants.ACCESS_EXTERNAL_SCHEMA, "file"
            );

            validator.validate(new StreamSource(xmlFile));

            System.out.println(
                "SUCCESS: XML is valid according to the XSD schema."
            );

        } catch (SAXException e) {
            System.out.println("VALIDATION FAILED: " + e.getMessage());
            System.exit(1);
        } catch (Exception e) {
            System.out.println("ERROR: " + e.getMessage());
            System.exit(1);
        }
    }
}
