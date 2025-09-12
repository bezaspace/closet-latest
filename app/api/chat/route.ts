/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

async function callScraperApi(query: string, limit = 20, page = 1) {
  const key = process.env.SCRAPERAPI_KEY || '';
  const base = 'https://api.scraperapi.com/structured/amazon/search';
  const url = `${base}?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&country=us&tld=com&limit=${limit}&page=${page}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ScraperAPI error: ${res.status}`);
  }
  const data = await res.json();
  // Normalize product list (ScraperAPI uses `results` in examples)
  const items = data.results || data.products || [];
  const products = items.slice(0, limit).map((p: any, i: number) => ({
    id: p.asin || p.position || `p_${i}`,
    name: p.name || p.title || p.product_title || '',
    image: p.image || p.images?.[0] || null,
    price: p.price || p.price_string || p.list_price || null,
    url: p.url || p.product_url || null,
    raw: p,
  }));
  return products;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body?.message ?? '';
    const conversationHistory: any[] = body?.history || [];

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

    const amazonSearchDecl = {
      name: 'amazon_search',
      description: 'Search Amazon for products matching a query and return structured results (name,image,price,url). Use higher limit for more results.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Search query, e.g., "mens black shirt party"' },
          category: { type: Type.STRING, description: 'Optional category like shirts, pants, accessories' },
          limit: { type: Type.NUMBER, description: 'Number of products to fetch, default 20' },
          page: { type: Type.NUMBER, description: 'Page number for pagination, default 1' },
        },
        required: ['query'],
      },
    };

    // Create chat instance with conversation history
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: conversationHistory,
      config: {
        tools: [{ functionDeclarations: [amazonSearchDecl] }],
        systemInstruction: 'You are a helpful shopping assistant for an e-commerce platform. Your role is to help users find products on Amazon. When a user request is ambiguous or lacks key preferences (brand, price range, style, color, size, fit, or occasion), ask one concise clarifying question before searching. If the user has already provided clear preferences or explicitly asks to see results now, it is acceptable to perform a search immediately. Remember and respect preferences expressed earlier in the conversation and update them if the user changes them. When calling the search tool, include any known preferences in the call. Provide friendly, concise responses and present product results when appropriate.'
      },
    });

    // Send message using chat SDK
    const result = await chat.sendMessage({ message });

    // If model requested a function call
    const fnCall = result.functionCalls && result.functionCalls.length > 0 ? result.functionCalls[0] : null;
    if (!fnCall) {
      // Model didn't request the amazon_search tool. Do not perform any
      // autonomous searches on the server side — return the model text only.
      return NextResponse.json({
        modelText: result.text || '',
        products: [],
        history: conversationHistory
      });
    }

    // parse args (might be object or string)
    let args: any = fnCall.args || {};
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch (_) {
        args = {};
      }
    }

    const query = String(args.query || args.q || message || '');
    const limit = Number(args.limit || 20) || 20;
    const page = Number(args.page || 1) || 1;

    // call ScraperAPI
    let products = [];
    try {
      products = await callScraperApi(query, limit, page);
    } catch (err) {
      console.error('ScraperAPI error', err);
      // tell model we failed
      const errorText = `Tool failure: ${err instanceof Error ? err.message : 'unknown'}`;
      return NextResponse.json({ modelText: errorText, products: [] }, { status: 502 });
    }

    // Send tool response back to model for final user-facing text.
    // With chat SDK, we need to send the function response as a new message
    const functionResponse = await chat.sendMessage({
      message: {
        functionResponse: {
          name: fnCall.name,
          response: { result: products }
        }
      }
    });

    // Avoid returning the raw, verbose tool/model echo that may contain URLs/large JSON.
    // Instead provide a short, friendly summary when we have structured products.
    let displayText = functionResponse.text || '';
    if (products && products.length > 0) {
      const q = query || (typeof args === 'string' ? args : 'your query');
      displayText = `Found ${products.length} items for "${q}" — see the product cards below and add any to your basket.`;
    }

    return NextResponse.json({
      modelText: displayText,
      products,
      history: conversationHistory
    });
  } catch (error) {
    console.error('chat error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
