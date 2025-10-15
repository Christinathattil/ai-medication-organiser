# Groq AI Setup Guide

## What is Groq?

Groq provides ultra-fast AI inference with state-of-the-art language models. The chatbot in this medication manager uses Groq to understand natural language and provide intelligent responses.

## Getting Your Free Groq API Key

1. **Visit Groq Console**
   - Go to: https://console.groq.com
   - Sign up for a free account (no credit card required)

2. **Create an API Key**
   - Once logged in, navigate to "API Keys" section
   - Click "Create API Key"
   - Give it a name (e.g., "Medication Manager")
   - Copy the API key (you won't be able to see it again!)

3. **Add to Your Environment**
   - Open your `.env` file in the project root
   - Add this line:
     ```
     GROQ_API_KEY=your_api_key_here
     ```
   - Replace `your_api_key_here` with your actual API key

4. **Restart the Server**
   ```bash
   npm start
   ```

## Features Enabled with Groq

✅ **Natural Language Understanding**
- "I need to add my blood pressure medication"
- "What's my schedule for today?"
- "Show me my adherence stats"

✅ **Smart Intent Detection**
- Automatically understands what you want to do
- Extracts medication details from conversational text
- Provides contextual responses

✅ **Conversational Memory**
- Remembers conversation context
- Provides personalized responses based on your data

## Example Conversations

**Adding Medication:**
```
You: "I need to add aspirin 500mg tablet for headaches"
AI: "I'll help you add Aspirin 500mg tablet for headaches. Let me open the form for you..."
```

**Checking Schedule:**
```
You: "What do I need to take today?"
AI: "📅 Today's Schedule (3 medications):
⏰ 08:00 - Aspirin (500mg)
⏰ 12:00 - Lisinopril (10mg)
⏰ 20:00 - Metformin (1000mg)"
```

**Getting Stats:**
```
You: "How am I doing with my medications?"
AI: "📊 Your 30-day Adherence:
Aspirin: 95%
  ✅ Taken: 28 | ❌ Missed: 2"
```

## Troubleshooting

**"I'm currently in basic mode"**
- This means the Groq API key is not configured
- Check your `.env` file
- Make sure you've restarted the server

**API Rate Limits**
- Free tier: 30 requests per minute
- More than enough for personal use
- Upgrade available if needed

**Connection Errors**
- Check your internet connection
- Verify API key is correct
- Check Groq status: https://status.groq.com

## Privacy & Security

- Your API key is stored locally in `.env` (never committed to git)
- Conversations are not stored by Groq beyond processing
- Only medication-related context is sent to the AI
- Your personal health data stays on your device/database

## Cost

- **Free Tier**: Generous limits for personal use
- **No Credit Card Required**: Get started immediately
- **Pay-as-you-go**: Only if you need higher limits

## Support

- Groq Documentation: https://console.groq.com/docs
- Groq Discord: https://discord.gg/groq
- GitHub Issues: Report bugs in this project's repository
