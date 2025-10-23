  const handleSaveProduct = async (productData: Omit<MarketingMaterial, 'id' | 'created_at' | 'updated_at'>) => {
     try {
       console.log('Saving product:', productData);

       const { data: { session } } = await supabase.auth.getSession();
       console.log('Session:', session);

       if (!session?.access_token) {
         console.error('No authentication token');
         alert('Authentication failed. Please refresh the page and try again.');
         return;
       }

       const method = editingProduct ? 'PUT' : 'POST';
       const url = editingProduct
         ? `/api/admin/marketing-materials/${editingProduct.id}`
         : '/api/admin/marketing-materials';

       console.log('Making request to:', url, 'with method:', method);

       const response = await fetch(url, {
         method,
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session.access_token}`
         },
         body: JSON.stringify(productData)
       });

       console.log('Response status:', response.status);

       if (response.ok) {
         const result = await response.json();
         console.log('Save successful:', result);
         loadProducts();
         setShowAddProductModal(false);
         setEditingProduct(null);
         alert(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
       } else {
         const error = await response.json();
         console.error('Save failed:', error);
         alert(`Failed to save product: ${error.error || 'Unknown error'}`);
       }
     } catch (error) {
       console.error('Error saving product:', error);
       alert('An error occurred while saving the product. Please try again.');
     }
   };

  const handleEditProduct = (product: MarketingMaterial) => {
     setEditingProduct(product);
     setShowAddProductModal(true);
   };

  const handleDeleteProduct = async (product: MarketingMaterial) => {
    if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No authentication token');
        }

        const response = await fetch(`/api/admin/marketing-materials/${product.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          loadProducts();
        }
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };
      {activeTab === 'products' && (
        <>
          {/* Product Store Management */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Product Store Management</h2>
                <p className="text-slate-600 text-sm">Manage products available for purchase by agents</p>
              </div>
              <button
                onClick={() => {
                  console.log('Add Product button clicked');
                  setEditingProduct(null);
                  setShowAddProductModal(true);
                  console.log('Modal state set to true');
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Product</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {product.image_url && (
                            <img className="h-10 w-10 rounded-lg object-cover mr-3" src={product.image_url} alt={product.name} />
                          )}
                          <div>
                            <div className="text-sm font-medium text-slate-900">{product.name}</div>
                            <div className="text-sm text-slate-500 truncate max-w-xs">{product.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        R{(product.price / 100).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatDate(product.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No products found</h3>
                <p className="text-slate-500">Add your first product to get started.</p>
              </div>
            )}
          </div>
        </>
      )}