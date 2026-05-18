import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GoogleGenAI } from '@google/genai'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { roleDescription?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { roleDescription } = body
  if (!roleDescription) {
    return NextResponse.json({ error: 'Role description is required' }, { status: 400 })
  }

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    // Fallback if no API key is provided
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return NextResponse.json({
      suggestions: [
        {
          title: 'Improve Application Load Time',
          thrustArea: 'Performance',
          uomType: 'NUMERIC_MAX',
          target: 2.5,
          weightage: 25,
          rationale: 'Based on your focus on performance optimization, reducing the load time to under 2.5 seconds directly impacts user retention and SEO.',
        },
        {
          title: 'Achieve 100% WCAG 2.1 AA Compliance',
          thrustArea: 'Accessibility',
          uomType: 'TIMELINE',
          target: '2026-03-31',
          weightage: 30,
          rationale: 'Aligns with your accessibility objective, ensuring all components meet global standards before Q1 ends.',
        },
        {
          title: 'Mentorship: Conduct Weekly Pair Programming',
          thrustArea: 'Team Growth',
          uomType: 'NUMERIC_MIN',
          target: 40,
          weightage: 25,
          rationale: 'Translates your mentoring goal into a measurable metric of 40 sessions across the year for junior devs.',
        },
      ],
    })
  }

  try {
    const ai = new GoogleGenAI({ apiKey })

    const prompt = `
      You are an expert HR and Performance Management AI for GoalSphere.
      Based on the following employee role description, suggest 3 to 4 SMART goals.
      Return exactly a JSON array of objects. Do not include markdown code blocks, just the raw JSON.
      
      Each object must follow this structure exactly:
      {
        "title": "Clear, concise goal title",
        "thrustArea": "Category/Thrust Area (e.g. Performance, Quality, Growth)",
        "uomType": "NUMERIC_MIN" | "NUMERIC_MAX" | "TIMELINE" | "ZERO",
        "target": <number or "YYYY-MM-DD" string for TIMELINE or null for ZERO>,
        "weightage": <number between 10 and 50>,
        "rationale": "1-2 sentence explanation of why this goal fits their role"
      }
      
      Employee Role Description: "${roleDescription}"
    `

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    })

    const text = response.text
    if (!text) {
      throw new Error('Empty response from AI')
    }

    const suggestions = JSON.parse(text)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Failed to generate AI goals:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions. Check server logs.' }, { status: 500 })
  }
}
