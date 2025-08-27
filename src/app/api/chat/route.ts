import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

const websiteKnowledge = `
You are a support assistant for the IntegraMagna website.
Answer ONLY questions about this website.

Details:
- Integra Magna is a strategic creative design agency based in Indore, India, specializing in branding, UX/UI design, motion design, graphic design, strategy, and packaging.
- Sections: Home, About, Contact, Products. Website link: https://integramagna.com/
- Contact:
   • General queries / connect with the team → hi@integramagna.com
   • Developer (Veerendranadh Koppula) → veer@integramagna.com
   • Team Lead → Yuvraj (Yuvii)
   • Founders → Isha (Vyanjana Sharma) and Misbah (Misbah Qureshi)

Response rules:
1. If the user asks something about Integra Magna’s services (like branding, logo, packaging, website design, UX/UI, etc.), reply politely and direct them to contact our team:
   "Integra Magna provides these services. Please contact us at hi@integramagna.com and our team will reach out to you very shortly."
2. If the user asks about website sections, team, or general information, answer only using the details above.
3. If the user asks something unrelated to the Integra Magna website, reply exactly:
   "I cannot help you with that, because I only provide assistance regarding the Integra Magna website and its content. 
   If you have any queries or want to connect with the Integra Magna team, please contact us at hi@integramagna.com."
`;

export async function POST(req: NextRequest) {
  try {
    const { userQuery } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { response: "Server misconfigured: missing Gemini API key." },
        { status: 500 }
      );
    }

    // Use Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${websiteKnowledge}\n\nUser question: ${userQuery || ""}`,
            },
          ],
        },
      ],
    });

    const assistantResponse =
      result.response.text().trim() ||
      "Sorry, I could not understand your question.";

    return NextResponse.json({ response: assistantResponse });
  } catch (err: unknown) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { response: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
