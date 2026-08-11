/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import { Product, Shop } from '../types';

// Initialize Gemini Client safely
const getApiKey = () => {
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv.VITE_GEMINI_API_KEY) {
      return metaEnv.VITE_GEMINI_API_KEY;
    }
  } catch (e) {
    // Ignore
  }
  if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  return '';
};

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Generate a custom recipe based on products currently in the customer's cart.
 */
export async function generateRecipeFromCart(
  cartItems: Array<{ name: string; quantity: number }>
): Promise<{ title: string; recipeText: string; cookingTime: string; difficulty: string }> {
  const itemNames = cartItems.map(i => `${i.quantity}x ${i.name}`).join(', ');

  if (!cartItems.length) {
    return {
      title: 'Hyperlocal Artisan Basket Recipe',
      recipeText: 'Add some fresh ingredients like Sourdough, Artisan Cheese, or Fresh Produce to your basket to get a custom chef recipe!',
      cookingTime: '15 mins',
      difficulty: 'Easy',
    };
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a delicious, gourmet recipe using these fresh local marketplace ingredients: ${itemNames}. Provide a recipe title, prep time, difficulty level, step-by-step instructions, and a chef recommendation tip. Keep formatting clean with markdown bullet points.`,
      });

      const text = response.text || '';
      return {
        title: `Chef's Special: ${cartItems[0].name} Fusion`,
        recipeText: text,
        cookingTime: '20 mins',
        difficulty: 'Easy / Moderate',
      };
    } catch (err) {
      console.warn('Gemini API call fallback:', err);
    }
  }

  // High quality curated intelligent fallback when API key is pending
  const mainIngredient = cartItems[0]?.name || 'Local Artisan Ingredient';
  return {
    title: `Artisan ${mainIngredient} Gourmet Pairing`,
    recipeText: `### 👨‍🍳 Chef's Recipe with Basket Items (${itemNames})\n\n` +
      `**Ingredients Used:** ${itemNames}\n\n` +
      `#### Step-by-Step Instructions:\n` +
      `1. **Prep**: Gently warm your ${mainIngredient} in a skillet with olive oil or butter for 2 minutes.\n` +
      `2. **Assemble**: Layer with your basket's fresh produce and condiments.\n` +
      `3. **Garnish**: Season with a pinch of sea salt, cracked black pepper, and fresh herbs.\n` +
      `4. **Serve**: Pair fresh alongside iced cold-brew coffee or organic fresh juice.\n\n` +
      `*💡 Chef Tip: Supporting local neighborhood growers ensures peak freshness and maximum flavor!*`,
    cookingTime: '15 mins',
    difficulty: 'Easy',
  };
}

/**
 * Generate engaging product descriptions and marketing copy for Merchants in 1-click.
 */
export async function generateMerchantProductContent(
  productName: string,
  category: string
): Promise<{ description: string; tags: string[]; suggestedPrice: number }> {
  if (!productName.trim()) {
    return {
      description: 'Handcrafted with premium local ingredients by neighborhood artisans.',
      tags: ['Artisan', category, 'Fresh'],
      suggestedPrice: 7.50,
    };
  }

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert copywriter for a neighborhood express marketplace. Write a mouth-watering 2-sentence description and 3 marketing tags for a product named "${productName}" in category "${category}". Format as JSON: {"description": "...", "tags": ["...", "..."], "suggestedPrice": 8.50}`,
      });

      const text = response.text || '';
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const parsed = JSON.parse(cleanJson);
      return {
        description: parsed.description || `Freshly prepared ${productName} made with organic local ingredients.`,
        tags: parsed.tags || ['Artisan', category, 'Neighborhood Fresh'],
        suggestedPrice: typeof parsed.suggestedPrice === 'number' ? parsed.suggestedPrice : 8.50,
      };
    } catch (err) {
      console.warn('Gemini API content generation fallback:', err);
    }
  }

  // Fallback intelligent content generator
  return {
    description: `Handcrafted ${productName} prepared fresh daily by local ${category} specialists. Made with sustainably sourced, organic neighborhood ingredients for uncompromised flavor.`,
    tags: ['Fresh Daily', category, 'Artisan Quality', 'Local Favorite'],
    suggestedPrice: category === 'Bakery' ? 6.50 : category === 'Coffee' ? 4.95 : 9.50,
  };
}

/**
 * AI Shopping Assistant Chatbot logic for Customer View.
 */
export async function answerShoppingAssistant(
  userQuery: string,
  cartItems: Array<{ name: string; quantity: number }>,
  shops: Shop[],
  products: Product[]
): Promise<string> {
  const queryLower = userQuery.toLowerCase();

  if (ai) {
    try {
      const shopSummary = shops.map(s => `${s.name} (${s.category}, Rating ${s.rating}, Distance: ${s.distance})`).join('; ');
      const productSummary = products.map(p => `${p.name} ($${p.price}, ${p.category})`).join('; ');

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are NearMart's AI Shopping Assistant & Recipe Concierge. Help the user with their request: "${userQuery}".
Available Stores: ${shopSummary}.
Featured Products: ${productSummary}.
Current Basket: ${cartItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}.
Give a friendly, helpful 2-4 sentence recommendation with emoji highlights.`,
      });

      return response.text || 'I am happy to help you discover the finest local products and bakeries in your neighborhood!';
    } catch (err) {
      console.warn('Gemini chatbot fallback:', err);
    }
  }

  // Smart Query Router Fallback
  if (queryLower.includes('gluten') || queryLower.includes('celiac') || queryLower.includes('diet')) {
    const glutenFreeShops = shops.filter(s => s.category.toLowerCase().includes('bakery') || s.name.toLowerCase().includes('sourdough'));
    return `🥖 **Gluten-Free & Special Dietary Recommendations:**\n\n` +
      `Check out **${glutenFreeShops[0]?.name || 'Sourdough & Co.'}** and **Greenpoint Organic Produce**! They feature certified gluten-free sourdough loaves, almond flour pastries, and fresh organic greens delivered in 20-35 mins.`;
  }

  if (queryLower.includes('recipe') || queryLower.includes('cook') || queryLower.includes('dinner') || queryLower.includes('make')) {
    const mainItem = cartItems[0]?.name || 'Sourdough Batard';
    return `🍳 **AI Chef Cooking Suggestion:**\n\n` +
      `With **${mainItem}** in your basket, I recommend making a **Warm Artisan Garlic Crostini with Fresh Basil**! Toast slices in olive oil for 3 minutes, top with diced local vine tomatoes and fresh mozzarella. Perfect 10-minute gourmet snack!`;
  }

  if (queryLower.includes('cheap') || queryLower.includes('under') || queryLower.includes('budget') || queryLower.includes('deal')) {
    const deals = products.filter(p => p.price < 10).slice(0, 3);
    return `🏷️ **Best Value Neighborhood Deals:**\n\n` +
      deals.map(p => `• **${p.name}** - $${p.price.toFixed(2)} at *${p.shopName}*`).join('\n') +
      `\n\nUse promo voucher **NEIGHBOR10** at checkout for an extra 10% OFF!`;
  }

  return `✨ **NearMart Assistant:** I'm here to help! You can ask me for recipe ideas using items in your cart, find dietary stores (e.g. *gluten-free, organic*), or search for deals under $15. What are you craving today?`;
}

/**
 * Natural language intent parser for smart search filtering.
 */
export function filterProductsByNaturalLanguage(
  query: string,
  products: Product[]
): { filtered: Product[]; explanation: string } {
  if (!query.trim()) {
    return { filtered: products, explanation: '' };
  }

  const q = query.toLowerCase();

  // Price intent (e.g. "under $15", "under 10 dollars")
  const priceMatch = q.match(/under\s*\$?(\d+)/i) || q.match(/below\s*\$?(\d+)/i) || q.match(/less than\s*\$?(\d+)/i);
  let maxPrice = priceMatch ? parseFloat(priceMatch[1]) : null;

  // Filter products
  let matched = products.filter(p => {
    let matchesPrice = maxPrice !== null ? p.price <= maxPrice : true;

    if (q.includes('breakfast') || q.includes('morning')) {
      const isBreakfast = p.category === 'Bakery' || p.category === 'Coffee' || p.name.toLowerCase().includes('croissant') || p.name.toLowerCase().includes('coffee') || p.name.toLowerCase().includes('bread');
      return matchesPrice && isBreakfast;
    }

    if (q.includes('gluten') || q.includes('organic')) {
      const isDietary = p.name.toLowerCase().includes('organic') || p.name.toLowerCase().includes('sourdough') || p.tags.some(t => t.toLowerCase().includes('organic') || t.toLowerCase().includes('fresh'));
      return matchesPrice && isDietary;
    }

    // General text match
    const textMatch = p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.shopName.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q));

    return matchesPrice && textMatch;
  });

  // If no match found, fallback to price-only filter if present
  if (matched.length === 0 && maxPrice !== null) {
    matched = products.filter(p => p.price <= maxPrice);
  }

  let explanation = '';
  if (maxPrice !== null) {
    explanation = `AI Smart Filter: Showing items priced under $${maxPrice.toFixed(2)}`;
  } else if (q.includes('breakfast')) {
    explanation = `AI Smart Filter: Matching morning & breakfast bakery offerings`;
  }

  return {
    filtered: matched.length > 0 ? matched : products,
    explanation,
  };
}
