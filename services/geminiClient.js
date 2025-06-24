import { GoogleGenerativeAI } from '@google/generative-ai';
import mime from 'mime-types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function verifyImage(imageBuffer, prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });


  // Detect MIME type from buffer (optional but recommended)
  const mimeType = mime.lookup('jpg') || 'image/jpeg'; // or use actual detection if you have file name or headers

  const base64Image = imageBuffer.toString('base64');

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
  ]);

  const text = await result.response.text();
  return { result: text };
}

export default { verifyImage };
