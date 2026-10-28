<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LifeAssist | Share Your Feedback</title>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 24px;
            font-family: "Segoe UI", Arial, sans-serif;
            background: linear-gradient(135deg, #e8edff, #f6eaff, #e4f5ff);
            color: #303454;
        }

        .feedback-card {
            width: 100%;
            max-width: 540px;
            padding: 38px;
            background: rgba(255, 255, 255, 0.96);
            border: 1px solid #e8e5f5;
            border-radius: 24px;
            box-shadow: 0 18px 55px rgba(92, 76, 150, 0.15);
            animation: appear 0.6s ease;
        }

        .brand {
            text-align: center;
            color: #7765df;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 2px;
            margin-bottom: 22px;
        }

        .icon {
            width: 66px;
            height: 66px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0 auto 18px;
            border-radius: 20px;
            background: linear-gradient(135deg, #e8e6ff, #f6e7ff);
            font-size: 32px;
        }

        h1 {
            text-align: center;
            color: #352b65;
            font-size: 29px;
            margin-bottom: 12px;
        }

        .intro {
            text-align: center;
            color: #777c94;
            line-height: 1.7;
            font-size: 15px;
            margin-bottom: 28px;
        }

        .form-group {
            margin-bottom: 19px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #424766;
        }

        input, textarea, select {
            display: block;
            width: 100%;
            padding: 13px 15px;
            border: 1px solid #dedff0;
            border-radius: 11px;
            background: #fbfbff;
            color: #303454;
            font: inherit;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }

        input:focus, textarea:focus, select:focus {
            border-color: #8b78ee;
            box-shadow: 0 0 0 4px rgba(139, 120, 238, 0.12);
        }

        textarea {
            min-height: 120px;
            resize: vertical;
        }

        .submit-button {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 12px;
            background: linear-gradient(135deg, #7465e8, #9872ed);
            color: white;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(116, 101, 232, 0.25);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .submit-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 26px rgba(116, 101, 232, 0.32);
        }

        .footer {
            margin-top: 23px;
            text-align: center;
            color: #9295a8;
            font-size: 12px;
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

        @media (max-width: 520px) {
            .feedback-card {
                padding: 28px 22px;
            }

            h1 {
                font-size: 25px;
            }
        }
    </style>
</head>

<body>
    <main class="feedback-card">
        <div class="brand">LIFEASSIST</div>
        <div class="icon">💬</div>

        <h1>We Value Your Feedback</h1>

        <p class="intro">
            Your thoughts help us make LifeAssist better.
            Share your experience with us!
        </p>

        <form action="processFeedback.jsp" method="post">
            <div class="form-group">
                <label for="name">Your Name</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    maxlength="100"
                    required>
            </div>

            <div class="form-group">
                <label for="email">Email Address</label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    maxlength="150"
                    required>
            </div>

            <div class="form-group">
                <label for="feedback">Your Feedback</label>
                <textarea
                    id="feedback"
                    name="feedback"
                    placeholder="Tell us what you think..."
                    maxlength="1000"
                    required></textarea>
            </div>

            <button type="submit" class="submit-button">
                Submit Feedback &rarr;
            </button>
        </form>

        <div class="footer">
            Thank you for helping us improve LifeAssist.
        </div>
    </main>
</body>
</html>