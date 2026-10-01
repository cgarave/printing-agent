import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', userApiKey } = body;

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'No Gemini API key found. Please provide an API key in Settings, or use the 100% Non-AI parser.',
        },
        { status: 400 }
      );
    }

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image provided for AI extraction.' },
        { status: 400 }
      );
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are a document and ID scanner assistant for a rush printing shop.
Extract all personal details visible in this ID card, application form, biodata, or resume into a structured JSON object.
Be robust against handwriting, phone photos, tilted angles, and glare.
If a field is not present or cannot be determined, omit it or use an empty string.

Return a JSON object with these exact keys:
{
  "fullName": "Full name in First Middle Last or Last, First Middle",
  "positionOrTitle": "Desired position or job title or profession",
  "birthDate": "YYYY-MM-DD or Month DD, YYYY",
  "birthPlace": "City, Province or Country",
  "gender": "Male or Female",
  "civilStatus": "Single, Married, Widowed, etc.",
  "citizenship": "Nationality/Citizenship",
  "religion": "Religion if present",
  "height": "Height with unit",
  "weight": "Weight with unit",
  "bloodType": "Blood type if present",
  "contactNumber": "Phone or mobile number",
  "email": "Email address",
  "address": "Full home/present address",
  "tinOrIdNumber": "TIN or Government ID number",
  "sssNumber": "SSS number if present",
  "fatherName": "Father's name",
  "motherName": "Mother's name",
  "educationElementary": "Elementary school",
  "educationSecondary": "High school",
  "educationCollege": "College or university",
  "educationCourse": "Degree or course",
  "skills": "Skills list or summary"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = {};
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Gemini extraction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process document with AI.',
      },
      { status: 500 }
    );
  }
}
