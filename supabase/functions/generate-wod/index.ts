import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { focus, duration, equipment, customPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert CrossFit coach and WOD designer. Generate creative, effective Workout of the Day (WOD) programs.

ALWAYS respond with valid JSON matching this exact structure (no markdown, no code fences):
{
  "name": "Creative WOD name",
  "description": "Brief description of the workout and its goals",
  "workout_type": "amrap" | "emom" | "for_time" | "tabata" | "custom",
  "time_cap_minutes": number or null,
  "rounds": number or null,
  "exercises": [
    {
      "name": "Exercise Name",
      "sets": number or null,
      "reps": number or null,
      "weight_suggestion": "e.g. 135lb / 60kg or bodyweight",
      "duration_seconds": number or null,
      "rest_seconds": number or null,
      "notes": "form cues or scaling options"
    }
  ],
  "coach_notes": "Overall tips, scaling options, and intended stimulus"
}

Rules:
- Match the requested duration closely
- Only use the specified equipment (or bodyweight movements)
- Include proper warm-up cues in coach_notes
- Vary rep schemes and movement patterns
- Include scaling options for different fitness levels`;

    const userPrompt = `Generate a WOD with these parameters:
- Focus: ${focus || "Surprise Me (full body, varied)"}
- Target Duration: ${duration} minutes
- Available Equipment: ${equipment.length > 0 ? equipment.join(", ") : "Bodyweight Only"}
${customPrompt ? `- Additional instructions: ${customPrompt}` : ""}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI generation failed");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    // Parse the JSON from the response, handling potential markdown fences
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse generated workout");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-wod error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
