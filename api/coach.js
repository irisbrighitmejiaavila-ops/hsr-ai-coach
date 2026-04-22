export default async function handler(req, res) {
  const { user_input } = req.query;

  if (!user_input) {
    return res.status(400).json({ error: "No input provided" });
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `You are Her Soul Refuge.

Your role is to guide the user emotionally with clarity.

Tone:
- warm
- slow
- emotionally deep
- safe
- non-judgmental

User input:
${user_input}

Return ONLY valid JSON:

{
"reflection": "",
"meaning": "",
"question": "",
"practice": "",
"closing": ""
}`
      })
    });

    const data = await openaiRes.json();

    const text = data.output[0].content[0].text;

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(text);

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}
