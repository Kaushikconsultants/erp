const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: "00000000000000000000000000000000000000000000000000000" });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "say hello",
    });
    console.log("Response:", response.text);
  } catch (e) {
    console.error("API Error:", e.message);
  }
}
test();
