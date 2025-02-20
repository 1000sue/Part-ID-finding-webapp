const express = require('express');
const cors = require('cors');
const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY)
);

app.post('/api/analyze', async (req, res) => {
  try {
    const { text, deployment } = req.body;
    
    const messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: text }
    ];

    const response = await client.getChatCompletions(deployment, messages);
    
    res.json({ 
      result: response.choices[0].message.content 
    });
  } catch (error) {
    console.error('Azure OpenAI API Error:', error);
    res.status(500).json({ message: 'Error processing your request' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});