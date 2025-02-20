const express = require('express');
const { AzureOpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(express.json());

const client = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: "2024-02-01",
  azure_endpoint: process.env.AZURE_OPENAI_ENDPOINT
});

const deployment_name = 'gpt-4o-mini-s';

app.post('/api/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    const response = await client.chat.completions.create({
      model: deployment_name,
      messages: [
        {
          role: "system",
          content: `Your task is to extract clear, self-explanatory problem and solution pairs from a discussion thread. These pairs should effectively summarize the issues discussed, ensuring that both the problems and solutions can stand alone without requiring additional context.
                
          Problem-solution pairs should address specific technical issues, rather than describing a general problem scenario. The problem should clearly describe the issue, while the solution should address the specific problem.`
        },
        {
          role: "user",
          content: `Identify the problems and solutions from the below conversation:
          ${text}
          
          Return the result in list format and do not include anything other than the following structure: 
          [{"problem": "problem", "date_of_problem": "YYYY-MM-DD", "solution": "solution", "date_of_solution": "YYYY-MM-DD"}].`
        }
      ],
      max_tokens: 1000,
      temperature: 0.5
    });

    res.json({ result: response.choices[0].message.content });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});