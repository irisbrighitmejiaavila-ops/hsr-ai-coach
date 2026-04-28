import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);
let memoryStore = {};

export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
  return res.status(200).end();
}
  const user_input = req.query.user_input || req.body?.user_input || "";
  const user_id = req.query.user_id || req.body?.user_id || "";

  if (!user_input) {
    return res.status(400).json({ error: "No input provided" });
  }

  const safeUserId = user_id || "anonymous_user";

  if (!memoryStore[safeUserId]) {
    memoryStore[safeUserId] = [];
  }

  const currentEntry = {
    text: user_input,
    date: new Date().toISOString()
  };

  memoryStore[safeUserId].push(currentEntry);

  if (memoryStore[safeUserId].length > 6) {
    memoryStore[safeUserId].shift();
  }

 const memoryContext = memoryStore[safeUserId]
  .slice(-5)
  .map(entry => entry.text)
  .join("\n");
  
  // 1) Leer historial desde Supabase
const { data: history } = await supabase
  .from("emotional_memory")
  .select("pattern, summary, created_at")
  .eq("user_id", safeUserId)
  .order("created_at", { ascending: false })
  .limit(10);

// 2) Convertir a texto para el prompt
const historyContext = history
  ?.map(h => `${h.pattern}: ${h.summary}`)
  .join("\n") || "";

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
        
Your role is to guide the user through Course 1, Module 1:
"When You Start to Imagine Who They Could Be."

${isClosingPhase ? `
The session is approaching a natural emotional closing.
Shift into softer presence.
Do not deepen further.
Focus on integration and gentle closure.
` : ""}

Previous emotional context:
${memoryContext}

...
User message:
${user_input}`
})

You are guiding an ongoing emotional process.

This is not a first interaction.
You have previous emotional context from the same user.

Previous emotional context:
${memoryContext}

User emotional history:
${historyContext}

Instructions:
- respond with emotional depth
- notice repetition and patterns
- make the user feel accompanied, not analyzed
- be warm, slow, grounding, and clear
- do not sound clinical
- return ONLY valid JSON
- detect ONE main emotional pattern
- pattern must be one of: idealization, attachment, abandonment, confusion, self-abandonment, validation-seeking, ignoring-signs, emotional-dependency
- always include "pattern" in the JSON

Required JSON format:
{
  "pattern": "",
  "reflection": "",
  "meaning": "",
  "question": "",
  "practice": "",
  "closing": ""
}

User message:
${user_input}`
      })
    });

    const data = await openaiRes.json();

    const text = data.output?.[0]?.content?.[0]?.text || data.output_text || "";
    let parsed;

try {
  parsed = JSON.parse(text);
} catch {
  parsed = {};
}

const { error: insertError } = await supabase.from("emotional_memory").insert([
  {
    user_id: safeUserId,
    message: user_input,
    pattern: parsed.pattern || null,
    summary: parsed.meaning || null,
    stage: "session",
    intensity: 3
  }
]);

if (insertError) {
  console.error("SUPABASE INSERT ERROR:", insertError);
}

    res.setHeader("Content-Type", "application/json");
    res.status(200).send(text);

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}
