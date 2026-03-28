import logging

from google import genai

from app.core.config import settings

# Module-level client removed to allow dynamic env refresh


def get_system_prompt(language: str) -> str:
    return f"""You are BranchIQ, an intelligent AI banking assistant deployed at bank branches and contact centers. You help customers with:
- Account balance inquiries
- Fund transfer assistance  
- Loan status and EMI details
- Credit/Debit card blocking and issues
- Complaint registration
- Fixed deposit information
- Branch locator and timings
- KYC update guidance
- Net banking support
- Cheque book requests

CRITICAL INSTRUCTION:
The user interface is currently set to the language code '{language}'. 
You MUST respond entirely and fluently in this targeted language ONLY. 
Even if the user types in English or another language, your final response must be generated strictly in the language for code '{language}'!

Rules:
1. Always be polite, concise, and professional
2. If query is too complex or sensitive, say exactly the equivalent of: "I'll connect you to a human agent right away" in the target language.
3. Never share sensitive data — ask for verification first
4. Keep responses under 3 sentences for simple queries
5. Always end with the equivalent of: "Is there anything else I can help you with?" in the target language."""


ERROR_MESSAGES = {
    "en": "I am currently facing a technical issue. I'll connect you to a human agent right away.",
    "hi": "मुझे वर्तमान में तकनीकी समस्या का सामना करना पड़ रहा है। मैं आपको तुरंत एक मानव एजेंट से जोडूंगा।",
    "gu": "હું હાલમાં તકનીકી સમસ્યાનો સામનો કરી રહ્યો છું. હું તમને તરત જ માનવ એજન્ટ સાથે જોડીશ.",
    "ta": "நான் தற்போது ஒரு தொழில்நுட்ப சிக்கலை எதிர்கொள்கிறேன். ஒரு மனித முகவருடன் உங்களை உடனடியாக இணைக்கிறேன்.",
    "te": "నేను ప్రస్తుతం ఒక సాంకేతిక సమస్యను ఎదుర్కొంటున్నాను. నేను మిమ్మల్ని వెంటనే ఒక మానవ ప్రతినిధికి కనెక్ట్ చేస్తాను.",
    "mr": "मला सध्या एका तांत्रिक समस्येचा सामना करावा लागत आहे. मी तुम्हाला त्वरित मानवी एजंटशी जोडतो.",
    "bn": "আমি বর্তমানে একটি প্রযুক্তিগত সমস্যার সম্মুখীন হচ্ছি। আমি আপনাকে অবিলম্বে একজন মানব এজেন্টের সাথে যুক্ত করব।",
    "kn": "ನಾನು ಪ್ರಸ್ತುತ ತಾಂತ್ರಿಕ ಸಮಸ್ಯೆಯನ್ನು ಎದುರಿಸುತ್ತಿದ್ದೇನೆ. ನಾನು ನಿಮ್ಮನ್ನು ತಕ್ಷಣವೇ ಮಾನವ ಏಜೆಂಟ್‌ಗೆ ಸಂಪರ್ಕಿಸುತ್ತೇನೆ.",
    "pa": "ਮੈਂ ਵਰਤਮਾਨ ਵਿੱਚ ਇੱਕ ਤਕਨੀਕੀ ਸਮੱਸਿਆ ਦਾ ਸਾਹਮਣਾ ਕਰ ਰਿਹਾ ਹਾਂ। ਮੈਂ ਤੁਹਾਨੂੰ ਤੁਰੰਤ ਇੱਕ ਮਨੁੱਖੀ ਏਜੰਟ ਨਾਲ ਜੋੜਾਂਗਾ।",
    "or": "ମୁଁ ବର୍ତ୍ତମାନ ଏକ ବୈଷୟିକ ସମସ୍ୟାର ସମ୍ମୁଖୀନ ହେଉଛି। ମୁଁ ଆପଣଙ୍କୁ ତୁରନ୍ତ ଏକ ମାନବ ଏଜେଣ୍ଟ ସହିତ ଯୋଡିବି।",
}


async def generate_chat_reply(message: str, history: list, language: str = "en") -> str:
    """
    Generates a reply from Google Gemini 2.5 Flash based on the message and history.
    """
    # Dynamically grab the key in case of hot reload
    import os

    from app.core.config import settings

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY")

    if not api_key:
        return ERROR_MESSAGES.get(language, ERROR_MESSAGES["en"])

    client = genai.Client(api_key=api_key)

    # Convert history payload to Gemini format
    gemini_history = []
    for msg in history:
        role = "user" if msg.get("role") in ["user", "system"] else "model"
        gemini_history.append(
            {"role": role, "parts": [{"text": msg.get("content", "")}]}
        )

    gemini_history.append({"role": "user", "parts": [{"text": message}]})

    try:
        response = await client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents=gemini_history,
            config=genai.types.GenerateContentConfig(
                system_instruction=get_system_prompt(language),
                max_output_tokens=1000,
            ),
        )
        return response.text
    except Exception as e:
        import traceback

        with open("gemini_error.txt", "a") as f:
            f.write(str(e) + "\n" + traceback.format_exc() + "\n")
        logging.error(f"Error calling Gemini API: {e}")
        # Gracefully handle validation/authentication errors by auto-escalating
        return ERROR_MESSAGES.get(language, ERROR_MESSAGES["en"])
