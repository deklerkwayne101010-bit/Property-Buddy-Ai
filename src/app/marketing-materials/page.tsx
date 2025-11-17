'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShopProduct, CartItem } from '@/types/shop';
import { fadeInUp, staggerContainer, staggerItem } from '@/components/animations';

export default function MarketingMaterialsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/shop/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem('shop_cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const saveCart = (newCart: CartItem[]) => {
    localStorage.setItem('shop_cart', JSON.stringify(newCart));
    setCart(newCart);
  };

  const addToCart = (product: ShopProduct) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    if (existingItem) {
      const newCart = cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      saveCart(newCart);
    } else {
      saveCart([...cart, { product, quantity: 1 }]);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-r from-slate-600 to-blue-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-6xl font-bold mb-6">
              Marketing Materials
            </h1>
            <p className="text-xl text-slate-100 max-w-2xl mx-auto">
              Professional marketing materials to elevate your real estate business
            </p>
          </motion.div>
        </div>
      </section>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="bg-white shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold">
                  Cart: {getCartItemCount()} items
                </span>
                <span className="text-slate-600">
                  Total: R{getCartTotal().toFixed(2)}
                </span>
              </div>
              <Link
                href="/marketing-materials/checkout"
                className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
              >
                View Cart & Checkout
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-xl text-slate-600">No products available at the moment.</p>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {products.map((product) => (
                <motion.div
                  key={product.id}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300 border border-slate-100 overflow-hidden"
                  variants={staggerItem}
                >
                  {product.image_url && (
                    <div className="aspect-video bg-slate-100">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-slate-600 mb-4 line-clamp-3">
                        {product.description}
                      </p>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-slate-900">
                        R{product.price.toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500">
                        {product.stock_quantity} in stock
                      </span>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stock_quantity === 0}
                      className="w-full bg-slate-600 text-white py-3 px-4 rounded-lg hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>
    </motion.div>
  );
}
