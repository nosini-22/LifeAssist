<%@ page import="java.sql.*" %>
<%@ page contentType="text/html; charset=UTF-8" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LifeAssist | Feedback Result</title>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: "Segoe UI", Arial, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            background: linear-gradient(135deg, #eef2ff, #f5eaff, #e6f4ff);
            color: #26304a;
        }

        .result-card {
            width: 100%;
            max-width: 480px;
            padding: 42px 32px;
            text-align: center;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid #e7e5f5;
            border-radius: 24px;
            box-shadow: 0 18px 50px rgba(91, 75, 150, 0.14);
            animation: appear 0.6s ease;
        }

        .icon {
            width: 76px;
            height: 76px;
            margin: 0 auto 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #e8f9ef;
            color: #159957;
            font-size: 38px;
        }

        h1 {
            margin-bottom: 14px;
            font-size: 28px;
            color: #342b63;
        }

        .message {
            margin-bottom: 28px;
            color: #667085;
            font-size: 16px;
            line-height: 1.7;
            overflow-wrap: anywhere;
        }

        .back-button {
            display: inline-block;
            padding: 14px 26px;
            border-radius: 12px;
            background: linear-gradient(135deg, #7567e8, #9274ef);
            color: white;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 7px 18px rgba(117, 103, 232, 0.25);
        }

        .back-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(117, 103, 232, 0.32);
        }

        .brand {
            margin-top: 28px;
            color: #8a8da3;
            font-size: 13px;
            letter-spacing: 1px;
        }

        @keyframes appear {
            from {
                opacity: 0;
                transform: translateY(15px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @media (max-width: 480px) {
            .result-card {
                padding: 32px 22px;
            }

            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>

<body>
    <main class="result-card">
        <%
            request.setCharacterEncoding("UTF-8");

            String name = request.getParameter("name");
            String email = request.getParameter("email");
            String feedback = request.getParameter("feedback");

            boolean success = false;
            boolean invalid = false;

            if (name == null || email == null || feedback == null ||
                name.trim().isEmpty() || email.trim().isEmpty() ||
                feedback.trim().isEmpty()) {

                invalid = true;

            } else {
                String url = "jdbc:mysql://localhost:3306/lifeassist";
                String dbUser = "root";
                String dbPassword = "Nosini@2026";

                String sql = "INSERT INTO feedback (name, email, feedback) VALUES (?, ?, ?)";

                try {
                    Class.forName("com.mysql.cj.jdbc.Driver");

                    try (Connection con =
                             DriverManager.getConnection(url, dbUser, dbPassword);
                         PreparedStatement ps = con.prepareStatement(sql)) {

                        ps.setString(1, name.trim());
                        ps.setString(2, email.trim());
                        ps.setString(3, feedback.trim());

                        ps.executeUpdate();
                        success = true;
                    }
                } catch (Exception e) {
                    application.log("LifeAssist feedback database error", e);
                }
            }
        %>

        <% if (success) { %>
            <div class="icon">&#10003;</div>
            <h1>Thank You!</h1>
            <p class="message">
                Your feedback has been submitted successfully.
                We appreciate you taking the time to help us improve LifeAssist.
            </p>

        <% } else if (invalid) { %>
            <div class="icon" style="background:#fff2d9;color:#b7791f;">!</div>
            <h1>Missing Information</h1>
            <p class="message">
                Please complete all the required fields before submitting your feedback.
            </p>

        <% } else { %>
            <div class="icon" style="background:#ffe8e8;color:#d64545;">!</div>
            <h1>Submission Unsuccessful</h1>
            <p class="message">
                We couldn't save your feedback. Please check the database configuration and try again.
            </p>
        <% } %>

        <a class="back-button" href="index.jsp">← Back to Feedback Form</a>

        <div class="brand">LIFEASSIST · YOUR FEEDBACK MATTERS</div>
    </main>
</body>
</html>