'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShopOrder, ShopOrderItem } from '@/types/shop';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [orderItems, setOrderItems] = useState<ShopOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch order
      const orderResponse = await fetch(`/api/shop/orders/${orderId}`);
      const orderData = await orderResponse.json();
      setOrder(orderData.order);

      // Fetch order items
      const itemsResponse = await fetch(`/api/shop/orders/${orderId}/items`);
      const itemsData = await itemsResponse.json();
      setOrderItems(itemsData.items || []);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Clear cart on successful payment
    if (order?.status === 'paid') {
      localStorage.removeItem('shop_cart');
    }
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Order Not Found</h1>
          <p className="text-slate-600 mb-8">We couldn&apos;t find your order details.</p>
          <Link
            href="/marketing-materials"
            className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          {order.status === 'paid' ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
              <p className="text-slate-600">Thank you for your purchase. Your order has been confirmed.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Processing</h1>
              <p className="text-slate-600">Your payment is being processed. We&apos;ll send you an email confirmation once it&apos;s complete.</p>
            </>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Order Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">Order Information</h3>
              <p className="text-slate-600">Order ID: {order.id}</p>
              <p className="text-slate-600">Date: {new Date(order.created_at).toLocaleDateString()}</p>
              <p className="text-slate-600">Status: <span className={`font-semibold ${
                order.status === 'paid' ? 'text-green-600' :
                order.status === 'shipped' ? 'text-blue-600' :
                order.status === 'delivered' ? 'text-purple-600' :
                'text-yellow-600'
              }`}>{order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></p>
            </div>

            {order.shipping_address && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Shipping Address</h3>
                <div className="text-slate-600">
                  <p>{order.shipping_address.firstName} {order.shipping_address.lastName}</p>
                  <p>{order.shipping_address.address}</p>
                  <p>{order.shipping_address.city}, {order.shipping_address.province}</p>
                  <p>{order.shipping_address.postalCode}, {order.shipping_address.country}</p>
                  <p>{order.shipping_address.email}</p>
                  <p>{order.shipping_address.phone}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="border-t pt-6">
            <h3 className="font-semibold text-slate-900 mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900">{item.product?.name || 'Product'}</h4>
                    <p className="text-slate-600">Quantity: {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-slate-900">
                    R{(item.price_at_time * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total:</span>
                <span>R{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">What&apos;s Next?</h2>

          {order.status === 'paid' && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Order Processing</h3>
                  <p className="text-slate-600">We&apos;ll start preparing your order for shipment within 1-2 business days.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Shipping</h3>
                  <p className="text-slate-600">You&apos;ll receive a shipping confirmation email with tracking information.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Delivery</h3>
                  <p className="text-slate-600">Your order will be delivered to the shipping address provided.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Link
              href="/marketing-materials"
              className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 text-center"
            >
              Continue Shopping
            </Link>
            <Link
              href="/dashboard"
              className="border border-slate-300 text-slate-700 px-6 py-2 rounded-lg hover:bg-slate-50 text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slate-600"></div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
