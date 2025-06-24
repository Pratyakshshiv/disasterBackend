import genAI from './geminiClient.js';
import axios from 'axios';

export async function verifyImage(imageUrl) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

  // Fetch image and convert to base64
  const imageBuffer = (await axios.get(imageUrl, { responseType: 'arraybuffer' })).data;
  const base64Image = Buffer.from(imageBuffer).toString('base64');

  // Prompt Gemini
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    },
    "Analyze this image and determine if it shows a real disaster event or if it's AI-generated or manipulated. Reply in under 2 sentences."
  ]);

  const response = await result.response;
  return response.text();
}
