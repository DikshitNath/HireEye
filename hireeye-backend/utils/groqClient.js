const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateJson = async (systemPrompt, userPrompt) => {
  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    // ✨ The Magic: This guarantees perfect JSON, allowing you to delete your old Regex cleanup scripts
    response_format: { type: "json_object" } 
  });

  return JSON.parse(completion.choices[0].message.content);
};

module.exports = { generateJson };