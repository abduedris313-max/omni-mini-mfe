import React, { useState } from 'react';
import { MiniAppBridgeSDK } from '../types/miniapp';
import {
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  CheckCircle,
  Leaf,
  Clock,
} from 'lucide-react';

interface FoodBiteProps {
  sdk: MiniAppBridgeSDK;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  dietary: 'vegan' | 'gluten_free' | 'keto' | 'all';
  image: string;
  description: string;
}

export const FoodBiteApp: React.FC<FoodBiteProps> = ({ sdk }) => {
  const settings = sdk.settings.getSettings();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const menu: MenuItem[] = [
    {
      id: 'item-1',
      name: 'Wild Salmon Truffle Poke Bowl',
      price: 18.5,
      dietary: 'keto',
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=80',
      description: 'Sashimi-grade salmon, avocado, edamame, and black sesame ginger drizzle.',
    },
    {
      id: 'item-2',
      name: 'Organic Avocado & Quinoa Bowl',
      price: 15.0,
      dietary: 'vegan',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&auto=format&fit=crop&q=80',
      description: 'Heirloom greens, marinated tempeh, pomegranate seeds, and tahini.',
    },
    {
      id: 'item-3',
      name: 'Cold-Pressed Green Glow Elixir',
      price: 8.5,
      dietary: 'vegan',
      image: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=300&auto=format&fit=crop&q=80',
      description: 'Kale, green apple, ginger, lemon, and spirulina booster.',
    },
    {
      id: 'item-4',
      name: 'Grass-Fed Wagyu Smashburger',
      price: 17.0,
      dietary: 'keto',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&auto=format&fit=crop&q=80',
      description: 'Double smash patty, aged cheddar, caramelized shallots, brioche bun.',
    },
  ];

  const filteredMenu = menu.filter((item) => {
    if (!settings.dietaryFilter || settings.dietaryFilter === 'none') return true;
    if (settings.dietaryFilter === 'vegetarian' && item.dietary === 'vegan') return true;
    return item.dietary === settings.dietaryFilter;
  });

  const cartItemCount = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, count]) => {
    const item = menu.find((m) => m.id === id);
    return sum + (item ? item.price * count : 0);
  }, 0);

  const updateQuantity = (id: string, delta: number) => {
    sdk.ui.hapticFeedback('light');
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleCheckout = async () => {
    if (cartTotal <= 0) return;

    setIsOrdering(true);
    sdk.ui.hapticFeedback('medium');

    const payment = await sdk.payment.pay(
      cartTotal,
      `FoodBite: ${cartItemCount} items (${settings.ecoPackagingOnly ? 'Eco-Pack' : 'Standard'})`
    );

    setIsOrdering(false);

    if (payment.success) {
      setOrderComplete(true);
      setCart({});
      sdk.ui.showToast(`Order confirmed! Paid $${cartTotal.toFixed(2)} with Super App balance`, 'success');
      sdk.ui.hapticFeedback('success');
    } else {
      sdk.ui.showToast('Checkout failed: ' + (payment.error || 'Check balance'), 'error');
    }
  };

  return (
    <div className="p-4 space-y-4 text-slate-100 pb-24">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-orange-500 to-amber-600 p-5 text-white shadow-lg shadow-orange-500/20">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded-full">
              Express 20-min
            </span>
            <h2 className="text-xl font-black mt-2">FoodBite Kitchens</h2>
            <p className="text-xs text-orange-100 mt-0.5">Chef-crafted plates delivered to your doorstep</p>
          </div>
          <div className="p-2 rounded-2xl bg-white/15 backdrop-blur-md">
            <Clock className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Dynamic Pluggable settings info badge */}
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between text-[11px] text-orange-100">
          <div className="flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-300" />
            <span>{settings.ecoPackagingOnly ? 'Eco-friendly biodegradable pack' : 'Standard packaging'}</span>
          </div>
          {settings.contactlessDropoff && (
            <span className="bg-black/20 px-2 py-0.5 rounded-md">Contactless</span>
          )}
        </div>
      </div>

      {orderComplete ? (
        <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Order Sent to Kitchen!</h3>
            <p className="text-xs text-slate-400">
              Courier will drop off at your door ({settings.contactlessDropoff ? 'Contactless drop' : 'Direct handoff'}).
            </p>
          </div>
          <button
            onClick={() => setOrderComplete(false)}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition"
          >
            Order More Dishes
          </button>
        </div>
      ) : (
        <>
          {/* Menu Items */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Featured Menu</span>
              {settings.dietaryFilter && settings.dietaryFilter !== 'none' && (
                <span className="text-[10px] text-amber-400 font-mono">Filtered by: {settings.dietaryFilter}</span>
              )}
            </div>

            {filteredMenu.map((item) => {
              const qty = cart[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3.5 flex gap-3.5 items-center backdrop-blur-md"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-18 h-18 rounded-xl object-cover shrink-0 border border-slate-700/60"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">{item.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-extrabold text-orange-400">${item.price.toFixed(2)}</span>
                      {qty === 0 ? (
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-bold text-white transition flex items-center gap-1 shadow-sm ios-active"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-800 rounded-xl px-2 py-1 border border-slate-700">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-0.5 text-slate-300 hover:text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-white font-mono">{qty}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-0.5 text-slate-300 hover:text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Bar if Cart has items */}
          {cartTotal > 0 && (
            <div className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-30">
              <button
                onClick={handleCheckout}
                disabled={isOrdering}
                className="w-full p-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-xl shadow-orange-600/30 flex items-center justify-between transition ios-active"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>{cartItemCount} items</span>
                </div>
                <span>Checkout ${cartTotal.toFixed(2)}</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
