import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new formidable.IncomingForm({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing files' });

    const prompt = fields.prompt || '';
    const model = fields.model || 'gpt-4';
    let combinedPrompt = prompt;

    if (files.files) {
      const fileArray = Array.isArray(files.files) ? files.files : [files.files];
      for (const file of fileArray) {
        const ext = file.originalFilename.split('.').pop().toLowerCase();
        if(['txt','md'].includes(ext)){
          const content = fs.readFileSync(file.filepath, 'utf-8');
          combinedPrompt += `\n\nContent from file ${file.originalFilename}:\n${content}`;
        } else {
          combinedPrompt += `\n\n[File uploaded: ${file.originalFilename}, type: ${ext}]`;
        }
      }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model === 'gpt-4' ? 'gpt-4' : 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: combinedPrompt }],
        }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'No response from AI';
      res.status(200).json({ reply });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'AI request failed' });
    }
  });
}
