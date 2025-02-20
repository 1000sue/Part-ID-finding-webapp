import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TextAnalyzer() {
  // Add PIM data state
  const [pimData, setPimData] = useState([]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [tableResult, setTableResult] = useState('');  // Add this line
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Constants for Azure OpenAI
  const AZURE_ENDPOINT = "";
  const DEPLOYMENT_NAME = "gpt-4o-mini-s";
  const API_VERSION = "2024-02-01";
  const API_KEY = "";

  // Move useEffect to component body level
  // In the useEffect where CSV is loaded
  useEffect(() => {
    const loadPimData = async () => {
      try {
        const response = await fetch('/PIM_product_name_id.csv');
        const text = await response.text();
        const rows = text.split('\n').slice(1); // Skip header row
        const data = rows.map(row => {
          const [part_name, part_id] = row.split(',');
          return { 
            part_name: part_name?.trim(), 
            part_id: part_id?.replace(/[\r\n]/g, '').trim() 
          };
        });
  
        
        setPimData(data);
      } catch (err) {
        console.error('Error loading PIM data:', err);
      }
    };
    loadPimData();
  }, []);

  const analyzeText = async () => {
    if (!input.trim()) {
      setError('Please enter some text to analyze');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}/chat/completions?api-version=${API_VERSION}`;
      
      const response = await axios({
        method: 'post',
        url: url,
        headers: {
          'Content-Type': 'application/json',
          'api-key': API_KEY
        },
        data: {
          messages: [
            {
              role: "system",
              content: `Extract the following information from the input text and return it in JSON format:
              {
                "customer_name": "",
                "company_name": "",
                "company_address": "",
                "products": [
                  {
                    "part_name": "",
                    "part_id": "",
                    "quantity": ""
                  }
                ],
                "competitor_name": "",
                "discount_mentioned": false
              }
              
              Guidelines:
              - Create a new product object in the products array for each product/part mentioned
              - Fill in all fields that can be found in the text
              - Leave fields empty ("") if information is not present
              - For quantity, include units if specified
              - Set discount_mentioned to true if any discount is mentioned in the text
              - Ensure exact matches for part IDs
              - Return only the JSON object, no additional text like json`
            },
            {
              role: "user",
              content: input
            }
          ],
          max_tokens: 800,
          temperature: 0.3, // Lower temperature for more precise extraction
          frequency_penalty: 0,
          presence_penalty: 0,
          top_p: 0.95
        }
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        const resultText = response.data.choices[0].message.content;
        setResult(resultText);
        
        try {
          const parsedData = JSON.parse(resultText);
          if (parsedData.products && Array.isArray(parsedData.products)) {
            const tableHeader = 'Match Type    Product Name   Product ID   Quantity\n----------------------------------------------------------\n';
            const tableRows = parsedData.products.map(product => {
              let matches = [];
              
              // Try exact ID match first
              if (product.part_id) {
                const searchId = String(product.part_id).trim();
                const exactIdMatch = pimData.find(item => String(item.part_id).trim() === searchId);
                if (exactIdMatch) {
                  matches.push({ ...exactIdMatch, matchType: 'Exact' });
                }
              }
              
              // Try exact name match
              if (product.part_name && matches.length === 0) {
                const searchName = product.part_name.toLowerCase().trim();
                const exactNameMatch = pimData.find(item => 
                  item.part_name?.toLowerCase().trim() === searchName
                );
                if (exactNameMatch) {
                  matches.push({ ...exactNameMatch, matchType: 'Exact' });
                }
              }
              
              // Try partial matches
              if (matches.length === 0) {
                const partialMatches = pimData.filter(item => {
                  const nameMatch = item.part_name && product.part_name &&
                    item.part_name.toLowerCase().includes(product.part_name.toLowerCase());
                  const idMatch = item.part_id && product.part_id &&
                    item.part_id.includes(product.part_id);
                  return nameMatch || idMatch;
                });
                matches.push(...partialMatches.map(match => ({ ...match, matchType: 'Possible' })));
              }
              
              // Generate table rows for all matches
              if (matches.length === 0) {
                return `No Match     ${(product.part_name || '-').padEnd(14)} ${(product.part_id || '-').padEnd(12)} ${product.quantity || '-'}`;
              }
              
              return matches.map(match => 
                `${match.matchType.padEnd(12)} ${(match.part_name || '-').padEnd(14)} ${(match.part_id || '-').padEnd(12)} ${product.quantity || '-'}`
              ).join('\n');
            }).join('\n');
            
            setTableResult(tableHeader + tableRows);
          }
        } catch (parseError) {
          setTableResult('Error parsing product data');
          console.error('Parse error:', parseError);
        }
      }
    } catch (err) {
      console.error('API Error:', err);
      setError(
        err.response?.data?.error?.message || 
        err.message || 
        'Failed to analyze text'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Input Text:
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter your text here..."
          style={{ 
            width: '100%', 
            height: '200px', 
            padding: '10px', 
            marginBottom: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc'
          }}
        />
      </div>

      {error && (
        <div style={{ 
          color: 'red', 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#fff3f3',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      <button 
        onClick={analyzeText}
        disabled={isLoading}
        style={{ 
          width: '100%', 
          padding: '12px', 
          backgroundColor: isLoading ? '#cccccc' : '#0066cc', 
          color: 'white', 
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginBottom: '20px'
        }}
      >
        {isLoading ? 'Analyzing...' : 'Analyze Text'}
      </button>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Extracted Information:
          </label>
          <textarea
            value={result}
            readOnly
            placeholder="Extracted information will appear here..."
            style={{ 
              width: '100%', 
              height: '200px', 
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              border: '1px solid #ccc'
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            Product Table:
          </label>
          <textarea
            value={tableResult}
            readOnly
            placeholder="Product table will appear here..."
            style={{ 
              width: '100%', 
              height: '200px', 
              padding: '10px',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontFamily: 'monospace'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default TextAnalyzer;