import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const token = req.query.token;

  if (!token) {
    return res.status(200).json({ valid: false });
  }

  const { data, error } = await supabase
    .from("access_tokens")
    .select("token")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return res.status(200).json({ valid: false });
  }

  return res.status(200).json({ valid: true });
}
