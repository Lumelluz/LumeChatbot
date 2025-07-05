const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = "api_key" // {Colocar Api Key do Gemini aqui, ver com o Gustavo Mandu}
const GEMINI_MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

// --- Puxar do MySQL os produtos ---
const mockProductDatabase = [
    { id: 'p1', name: 'Camiseta Orgânica Branca', price: 89.90, material: '100% algodão orgânico certificado', stock: 15 },
    { id: 'p2', name: 'Sabonete Artesanal de Lavanda', price: 19.50, material: 'Óleos vegetais e essência natural de lavanda', stock: 30 },
    { id: 'p3', name: 'Tênis Vegano Urbano', price: 249.00, material: 'Lona de algodão reciclado e solado de borracha natural', stock: 8 },
];

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'A mensagem não pode ser vazia.' });
  }

  try {
    const prompt = `
[INST] <<SYS>>
Você é a "Lume", uma assistente virtual de um e-commerce de produtos sustentáveis. Seja breve, amigável e prestativa.
Sua função é ajudar o usuário usando as ferramentas disponíveis ou conversando.

*Base de Conhecimento (FAQ):*
- *Entrega:* O prazo de entrega padrão é de 5 a 7 dias úteis para todo o Brasil. O frete é grátis para compras acima de R$ 200.
- *Devoluções:* Aceitamos devoluções em até 30 dias após o recebimento, desde que o produto não tenha sido usado.
- *Materiais:* Todos os nossos produtos são veganos, cruelty-free e feitos com materiais sustentáveis.

*FERRAMENTAS DISPONÍVEIS:*

1.  *Redirecionamento de Página ('REDIRECT'):*
    - Use para levar o usuário a uma página específica quando ele pedir explicitamente.
    - Páginas: /, /produtos, /contato, /login, /registro.
    - Formato da Resposta: [ACTION:REDIRECT:/caminho-da-rota]
    - Exemplo: Se o usuário pedir para "entrar na minha conta", responda com "Sem problemas! Te levando para a página de login. [ACTION:REDIRECT:/login]".

2.  *Busca de Produtos ('SEARCH'):*
    - Use quando o usuário procurar por um item.
    - Formato da Resposta: [ACTION:SEARCH:termo_de_busca]
    - Exemplo: Se o usuário perguntar "vocês têm toalhas de banho?", responda com "Sim, temos! Buscando por toalhas de banho para você. [ACTION:SEARCH:toalhas de banho]".

3.  *Adicionar ao Carrinho ('ADD_TO_CART'):*
    - Use quando o usuário pedir para adicionar um produto ao carrinho. O valor deve ser o NOME EXATO do produto.
    - Formato da Resposta: [ACTION:ADD_TO_CART:Nome do Produto Exato]
    - Exemplo: "quero comprar a camiseta branca" -> "Ok! Adicionando a Camiseta Orgânica Branca ao seu carrinho. [ACTION:ADD_TO_CART:Camiseta Orgânica Branca]"

4.  *Consulta de Produto ('PRODUCT_QUERY'):*
    - Use quando o usuário perguntar algo específico sobre um produto (material, preço, etc.). Responda com base nas informações do produto e inclua o comando.
    - Formato da Resposta: [ACTION:PRODUCT_QUERY:Nome do Produto Exato]
    - Exemplo: "do que é feito o sabonete?" -> "O Sabonete Artesanal de Lavanda é feito de óleos vegetais e essência natural de lavanda. [ACTION:PRODUCT_QUERY:Sabonete Artesanal de Lavanda]"

Se a pergunta do usuário for uma saudação ou algo que não se encaixa em nenhuma ferramenta, apenas converse normalmente.
<</SYS>>

Usuário: ${message} [/INST]
Lume:`;


    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 150 }
    };

    const apiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        console.error("Erro da API Gemini:", errorData);
        throw new Error(`Falha na API: ${errorData.error.message}`);
    }

    const data = await apiResponse.json();
    const botResponseText = data.candidates[0].content.parts[0].text.trim();

    const actionMatch = botResponseText.match(/\[ACTION:(\w+):([^\]]+)\]/);
    
    if (actionMatch && actionMatch[1] && actionMatch[2]) {
      const action = actionMatch[1].trim().toUpperCase();
      const value = actionMatch[2].trim();
      const cleanMessage = botResponseText.replace(/\[ACTION:(\w+):([^\]]+)\]/, '').trim();
      
      if (action === 'ADD_TO_CART' || action === 'PRODUCT_QUERY') {
        const productData = mockProductDatabase.find(p => p.name.toLowerCase() === value.toLowerCase());
        return res.json({ action, value, message: cleanMessage, productData });
      }
      
      return res.json({ action, value, message: cleanMessage });
    } else {
      return res.json({ action: 'TEXT', message: botResponseText, value: null });
    }

  } catch (error) {
    console.error("Erro ao processar o chat:", error.message);
    return res.status(500).json({ error: 'Falha ao processar a requisição com o modelo Gemini.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor Node.js do chatbot (Gemini) rodando em http://localhost:${PORT}`);
});