/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI, Type } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

async function callScraperApi(query: string, limit = 6) {
  const key = process.env.SCRAPERAPI_KEY || '';
  const base = 'https://api.scraperapi.com/structured/amazon/search';
  const url = `${base}?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}&country=us&tld=com&limit=${limit}`;

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

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

    const amazonSearchDecl = {
      name: 'amazon_search',
      description: 'Search Amazon for products matching a query and return structured results (name,image,price,url).',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Search query, e.g., "mens black shirt party"' },
          category: { type: Type.STRING, description: 'Optional category like shirts, pants, accessories' },
          limit: { type: Type.NUMBER, description: 'Number of products to fetch' },
        },
        required: ['query'],
      },
    };

    // Initial call to model with function declaration
    // use a loose any[] for contents to avoid strict typing issues with SDK parts
    const contents: any[] = [
      {
        role: 'user',
        parts: [{ text: message }],
      },
    ];

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: { tools: [{ functionDeclarations: [amazonSearchDecl] }] },
    });

    // If model requested a function call
    const fnCall = result.functionCalls && result.functionCalls.length > 0 ? result.functionCalls[0] : null;
    if (!fnCall) {
      // Model didn't request the amazon_search tool.
      // As a pragmatic fallback, attempt to run the ScraperAPI search directly
      // using the user's message so the UI can render product cards.
      try {
        const autoQuery = String(message || '').trim();
        let autoProducts: any[] = [];
        if (autoQuery) {
          autoProducts = await callScraperApi(autoQuery, 6);
        }

        const displayText = (autoProducts && autoProducts.length > 0)
          ? `Found ${autoProducts.length} items for "${autoQuery}" — see the product cards below and add any to your basket.`
          : (result.text || '');

        return NextResponse.json({ modelText: displayText, products: autoProducts });
      } catch (err) {
        console.error('auto ScraperAPI error', err);
        return NextResponse.json({ modelText: result.text || '', products: [] });
      }
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
    const limit = Number(args.limit || 6) || 6;

    // call ScraperAPI
    let products = [];
    try {
      products = await callScraperApi(query, limit);
    } catch (err) {
      console.error('ScraperAPI error', err);
      // tell model we failed
      const errorText = `Tool failure: ${err instanceof Error ? err.message : 'unknown'}`;
      return NextResponse.json({ modelText: errorText, products: [] }, { status: 502 });
    }

    // Send tool response back to model for final user-facing text.
    // Build a minimal conversation containing the original user message, the model's function call, and the functionResponse.
    const finalContents: any[] = [];
    finalContents.push(contents[0]);
    finalContents.push({ role: 'model', parts: [{ functionCall: { name: fnCall.name, args: fnCall.args } }] });
    // functionResponse is a non-standard part key so cast to any to avoid type errors
    finalContents.push({ role: 'user', parts: [{ functionResponse: { name: fnCall.name, response: { result: products } } }] } as any);

    const finalResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalContents,
      config: { tools: [{ functionDeclarations: [amazonSearchDecl] }] },
    });

    // Avoid returning the raw, verbose tool/model echo that may contain URLs/large JSON.
    // Instead provide a short, friendly summary when we have structured products.
    let displayText = finalResponse.text || '';
    if (products && products.length > 0) {
      const q = query || (typeof args === 'string' ? args : 'your query');
      displayText = `Found ${products.length} items for "${q}" — see the product cards below and add any to your basket.`;
    }

    return NextResponse.json({ modelText: displayText, products });
  } catch (error) {
    console.error('chat error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
