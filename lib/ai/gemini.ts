/**
 * Gemini AI Utility
 * A reusable client for interacting with Google Gemini API.
 */

export type GeminiOptions = {
	model?: string;
	temperature?: number;
	maxOutputTokens?: number;
};

const DEFAULT_MODEL = "gemini-2.5-flash";
const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/**
 * Generate a text response from Gemini.
 */
export async function generateText(
	prompt: string,
	options: GeminiOptions = {},
): Promise<string | null> {
	if (!API_KEY) {
		console.warn("[Gemini AI] Missing GOOGLE_GENERATIVE_AI_API_KEY");
		return null;
	}

	const model = options.model || DEFAULT_MODEL;
	const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
			}),
		});

		if (!res.ok) {
			const err = await res.text();
			console.error(`[Gemini AI] API Error (${res.status}):`, err);
			return null;
		}

		const data = await res.json();
		const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

		return text || null;
	} catch (error) {
		console.error("[Gemini AI] Fetch error:", error);
		return null;
	}
}

/**
 * Generate a structured JSON response from Gemini.
 * It automatically cleans up markdown formatting if present.
 */
export async function generateJSON<T>(
	prompt: string,
	options: GeminiOptions = {},
): Promise<T | null> {
	const rawText = await generateText(prompt, options);
	if (!rawText) return null;

	let text = rawText.trim();

	// Clean up markdown backticks if present
	if (text.includes("```")) {
		text = text.replace(/```json\s?/, "").replace(/```\s?/, "").trim();
	}

	try {
		return JSON.parse(text) as T;
	} catch (parseError) {
		console.error("[Gemini AI] JSON Parse Error:", parseError, "Original text:", text);
		return null;
	}
}
