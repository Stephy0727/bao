// =================================================================
// shopping.js - 仿微信购物App独立JS整合文件
// =================================================================
// 作者: 专业AI编程大师
// 描述: 本文件遵循 pp.js 模式，将购物功能完全封装。
//       只需在主HTML中引入本文件，即可实现即插即用的购物中心功能。
// =================================================================

(function(window) {
    "use strict";

    // -------------------------------------------------
    // [第一部分] 动态注入 CSS 样式
    // -------------------------------------------------
    function injectShoppingStyles() {
        const styleId = 'maomao-shopping-styles';
        if (document.getElementById(styleId)) return;

        const css = `
            /* --------------------------------------------------- */
            /* --- 购物模块专属样式 (已通过 #shopping-module 隔离) --- */
            /* --------------------------------------------------- */
            
            #shopping-module .screen {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.3s, visibility 0.3s;
                background-color: #f0f2f5; /* 基础背景色 */
            }

            #shopping-module .screen.active {
                opacity: 1;
                visibility: visible;
                z-index: 50; /* 确保购物模块在主应用之上 */
            }

            #shopping-module .header {
                position: relative;
                z-index: 15;
                flex-shrink: 0;
                padding: 15px 20px;
                padding-top: calc(15px + env(safe-area-inset-top));
                background-color: rgba(247, 247, 247, 0.8);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 18px;
                font-weight: 600;
                box-sizing: border-box;
            }
            #shopping-module .header .header-actions { display: flex; align-items: center; gap: 15px; }
            #shopping-module .header .back-btn, #shopping-module .header .action-btn { font-size: 24px; cursor: pointer; width: 30px; text-align: center; color: #1f1f1f; display: flex; align-items: center; justify-content: center; }

            /* 商品网格 */
            #shopping-module #product-grid {
                flex-grow: 1;
                overflow-y: auto;
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
                padding: 10px;
                padding-bottom: 80px;
            }

            #shopping-module .product-item {
                background-color: white;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                display: flex;
                flex-direction: column;
                cursor: pointer;
                position: relative;
            }

            #shopping-module .product-image {
                width: 100%;
                aspect-ratio: 1 / 1;
                object-fit: cover;
                border-radius: 8px 8px 0 0;
            }

            #shopping-module .product-info {
                padding: 12px 10px;
                flex-grow: 1;
                display: flex;
                flex-direction: column;
            }

            #shopping-module .product-name {
                font-size: 13px;
                color: #333;
                line-height: 1.4;
                min-height: 36px;
            }

            #shopping-module .product-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 8px;
            }

            #shopping-module .product-price {
                font-size: 16px;
                font-weight: 700;
                color: #ff5722;
            }
            #shopping-module .product-price::before { content: '¥'; font-size: 12px; }

            #shopping-module .add-to-cart-btn {
                padding: 6px 12px;
                border: none;
                border-radius: 15px;
                background: linear-gradient(90deg, #ff9800, #ff5722);
                color: white;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
            }

            /* 管理模式 */
            #shopping-module .product-management-overlay {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.5);
                display: none;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 15px;
                z-index: 5;
                border-radius: 8px;
            }
            #shopping-module #shopping-screen.management-mode .product-management-overlay {
                display: flex;
            }
            #shopping-module .product-management-overlay button {
                padding: 8px 20px;
                border: 1px solid white;
                background-color: rgba(255,255,255,0.2);
                color: white;
                border-radius: 15px;
                cursor: pointer;
            }
            #shopping-module #shopping-screen.management-mode .product-footer {
                display: none;
            }
            
            #shopping-module .go-to-cart-btn {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            /* 购物车页面 */
            #shopping-module #cart-items-list { 
                padding: 10px; 
                display: flex; 
                flex-direction: column; 
                gap: 10px; 
                flex-grow: 1; 
                overflow-y: auto;
            }
            #shopping-module .cart-item {
                display: flex; align-items: flex-start; gap: 12px; background-color: white;
                padding: 12px; border-radius: 12px;
            }
            #shopping-module .cart-item-image { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0; }
            #shopping-module .cart-item-info { flex-grow: 1; }
            #shopping-module .cart-item-name { font-weight: 500; font-size: 14px; }
            #shopping-module .cart-item-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px;}
            #shopping-module .cart-item-price { color: #ff5722; font-weight: bold; font-size: 16px; }
            #shopping-module .quantity-control { display: flex; align-items: center; gap: 4px; }
            #shopping-module .quantity-btn {
                width: 26px; height: 26px; border: none; background-color: #f7f8fa;
                border-radius: 4px; font-weight: 500; cursor: pointer; color: #666;
            }
            #shopping-module .quantity-display { font-weight: 500; min-width: 30px; text-align: center; }

            #shopping-module #cart-footer {
                position: absolute; bottom: 0; left: 0; width: 100%; display: flex;
                justify-content: space-between; align-items: center; padding: 10px 15px;
                padding-bottom: calc(10px + env(safe-area-inset-bottom));
                background-color: white; border-top: 1px solid #e0e0e0; box-sizing: border-box;
            }
            #shopping-module #checkout-btn {
                padding: 10px 25px; border: none; border-radius: 20px;
                background: linear-gradient(90deg, #ff9800, #ff5722);
                color: white; font-size: 15px;
            }
            
            /* 弹窗样式 (通用) */
            #shopping-module .modal {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.4);
                display: none; justify-content: center; align-items: center;
                z-index: 100;
            }
            #shopping-module .modal.visible { display: flex; }
            #shopping-module .modal-content {
                width: 90%; max-height: 90%; background-color: white; border-radius: 15px;
                display: flex; flex-direction: column;
            }
            #shopping-module .modal-header { padding: 15px; font-weight: 600; border-bottom: 1px solid #e0e0e0; text-align: center; }
            #shopping-module .modal-body { padding: 15px; overflow-y: auto; }
            #shopping-module .modal-footer { padding: 15px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-around; }
            #shopping-module .modal-footer button { width: 45%; padding: 12px; border-radius: 8px; border: 1px solid #333; cursor: pointer; font-size: 16px; }
            #shopping-module .modal-footer .save { background-color: #333; color: white; }
            #shopping-module .modal-footer .cancel { background-color: white; color: #333; }
            #shopping-module .form-group { margin-bottom: 20px; }
            #shopping-module .form-group label { display: block; margin-bottom: 8px; font-weight: 500; color: #8a8a8a; }
            #shopping-module .form-group input, #shopping-module .form-group textarea { width: 100%; padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
            #shopping-module .avatar-upload { display: flex; align-items: center; gap: 15px; }
            #shopping-module .avatar-upload img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = css;
        document.head.appendChild(style);
    }

    // -------------------------------------------------
    // [第二部分] 动态注入 HTML 结构
    // -------------------------------------------------
    function injectShoppingHTML() {
        const moduleId = 'shopping-module';
        if (document.getElementById(moduleId)) return;

        const html = `
            <!-- 购物中心主页 -->
            <div id="shopping-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="module-shopping-back-btn">‹</span>
                    <span>购物中心</span>
                    <div class="header-actions">
                        <span class="action-btn" id="module-manage-products-btn" title="管理商品">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                        </span>
                        <span class="action-btn" id="module-add-new-product-btn" title="添加新商品">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        </span>
                        <span class="action-btn go-to-cart-btn" id="module-go-to-cart-btn" title="查看购物车">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            <span id="module-cart-count">0</span>
                        </span>
                    </div>
                </div>
                <div id="product-grid"></div>
            </div>

            <!-- 购物车页面 -->
            <div id="cart-screen" class="screen">
                <div class="header">
                    <span class="back-btn" id="module-cart-back-btn">‹</span>
                    <span id="module-cart-title">购物车(0)</span>
                    <span class="action-btn" id="module-clear-cart-btn" style="font-size: 16px;">清空</span>
                </div>
                <div id="cart-items-list"></div>
                <div id="cart-footer">
                    <label><input type="checkbox" id="module-select-all-cart-items"> 全选</label>
                    <div class="cart-summary">
                        <div id="module-cart-total">合计: ¥0.00</div>
                    </div>
                    <button id="module-checkout-btn">结算(0)</button>
                </div>
            </div>

            <!-- 商品编辑器弹窗 -->
            <div id="product-editor-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header"><span id="module-product-editor-title">添加商品</span></div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>商品图片</label>
                            <div class="avatar-upload">
                                <img id="module-product-image-preview" src="https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1756206115802_qdqqd_0c99bh.jpeg">
                                <button onclick="document.getElementById('module-product-image-input').click()">上传</button>
                                <input type="file" id="module-product-image-input" accept="image/*" hidden>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="module-product-name-input">商品名称</label>
                            <input type="text" id="module-product-name-input">
                        </div>
                        <div class="form-group">
                            <label for="module-product-price-input">价格 (元)</label>
                            <input type="number" id="module-product-price-input" min="0" step="0.01">
                        </div>
                        <div class="form-group">
                            <label for="module-product-description-input">商品描述</label>
                            <textarea id="module-product-description-input" rows="4"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="cancel" id="module-cancel-product-editor-btn">取消</button>
                        <button class="save" id="module-save-product-btn">保存</button>
                    </div>
                </div>
            </div>
        `;
        const container = document.createElement('div');
        container.id = moduleId;
        container.innerHTML = html;
        document.body.appendChild(container);
    }


    // -------------------------------------------------
    // [第三部分] JavaScript 核心逻辑
    // -------------------------------------------------

    // 数据库实例 (独立于主应用)
    const db = new Dexie('ShoppingModuleDB');
    db.version(1).stores({
        shoppingProducts: '++id, name, description',
    });

    // 模块内部状态变量
    let shoppingCart = [];
    let editingProductId = null;
    let isProductManagementMode = false;
    
    // --- 核心功能函数 ---
    
    function showShoppingScreen(screenId) {
        const moduleContainer = document.getElementById('shopping-module');
        if (!moduleContainer) return;
        moduleContainer.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screenToShow = moduleContainer.querySelector(`#${screenId}`);
        if (screenToShow) screenToShow.classList.add('active');
    }

    async function renderShoppingProducts() {
        const gridEl = document.getElementById('product-grid');
        const shoppingScreen = document.getElementById('shopping-screen');
        gridEl.innerHTML = '';
        const products = await db.shoppingProducts.toArray();

        shoppingScreen.classList.toggle('management-mode', isProductManagementMode);

        if (products.length === 0) {
            gridEl.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #8a8a8a; margin-top: 50px;">商店空空如也, 点击管理添加商品吧！</p>`;
            return;
        }

        products.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.dataset.id = product.id;
            
            const managementControls = isProductManagementMode ? `
                <div class="product-management-overlay">
                    <button class="edit-product-btn">编辑</button>
                    <button class="delete-product-btn">删除</button>
                </div>
            ` : '';

            item.innerHTML = `
                ${managementControls}
                <img src="${product.imageUrl}" class="product-image">
                <div class="product-info">
                    <div class="product-name">${product.name}</div>
                    <div class="product-footer">
                        <div class="product-price">${product.price.toFixed(2)}</div>
                        <button class="add-to-cart-btn">加入购物车</button>
                    </div>
                </div>
            `;
            gridEl.appendChild(item);
        });
    }

    async function addToCart(productId, quantity = 1) {
        const existingItem = shoppingCart.find(item => item.productId === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            const product = await db.shoppingProducts.get(productId);
            if (product) {
                shoppingCart.push({ productId: product.id, quantity: quantity });
            }
        }
        updateCartCount();
    }

    function updateCartItemQuantity(productId, change) {
        const itemIndex = shoppingCart.findIndex(item => item.productId === productId);
        if (itemIndex > -1) {
            shoppingCart[itemIndex].quantity += change;
            if (shoppingCart[itemIndex].quantity <= 0) {
                shoppingCart.splice(itemIndex, 1);
            }
            updateCartCount();
            renderCartItems();
        }
    }
    
    function updateCartCount() {
        const totalItems = shoppingCart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('module-cart-count').textContent = totalItems;
        document.getElementById('module-cart-title').textContent = `购物车(${totalItems})`;
        document.getElementById('module-checkout-btn').textContent = `结算(${totalItems})`;
    }

    async function renderCartItems() {
        const listEl = document.getElementById('cart-items-list');
        listEl.innerHTML = '';

        if (shoppingCart.length === 0) {
            listEl.innerHTML = '<p style="text-align:center; color: #8a8a8a; margin-top: 50px;">购物车是空的哦~</p>';
            updateCartTotal();
            return;
        }
        
        const productIds = shoppingCart.map(item => item.productId);
        const products = await db.shoppingProducts.where('id').anyOf(productIds).toArray();
        const productMap = new Map(products.map(p => [p.id, p]));

        shoppingCart.forEach(item => {
            const product = productMap.get(item.productId);
            if (product) {
                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <input type="checkbox" class="cart-item-checkbox" data-id="${product.id}" checked>
                    <img src="${product.imageUrl}" class="cart-item-image">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${product.name}</div>
                        <div class="cart-item-footer">
                            <div class="cart-item-price">¥${product.price.toFixed(2)}</div>
                            <div class="quantity-control">
                                <button class="quantity-btn decrease-qty-btn" data-id="${product.id}">-</button>
                                <span class="quantity-display">${item.quantity}</span>
                                <button class="quantity-btn increase-qty-btn" data-id="${product.id}">+</button>
                            </div>
                        </div>
                    </div>
                `;
                listEl.appendChild(itemEl);
            }
        });
        updateCartTotal();
    }

    async function updateCartTotal() {
        let total = 0;
        const selectedCheckboxes = document.querySelectorAll('#cart-items-list .cart-item-checkbox:checked');
        const selectedProductIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.id));

        if (selectedProductIds.length > 0) {
            const products = await db.shoppingProducts.where('id').anyOf(selectedProductIds).toArray();
            const productMap = new Map(products.map(p => [p.id, p]));
            
            shoppingCart.forEach(cartItem => {
                if (selectedProductIds.includes(cartItem.productId)) {
                    const product = productMap.get(cartItem.productId);
                    if (product) {
                        total += product.price * cartItem.quantity;
                    }
                }
            });
        }
        document.getElementById('module-cart-total').textContent = `合计: ¥${total.toFixed(2)}`;
    }

    async function handleCheckout() {
        // 在独立的模块中，"结算"通常意味着将数据传递回主应用
        // 这里我们模拟这个过程，并清空购物车
        const selectedItems = shoppingCart.filter(item => 
            document.querySelector(`#cart-items-list .cart-item-checkbox[data-id="${item.productId}"]:checked`)
        );
        if (selectedItems.length === 0) {
            alert("请选择要结算的商品。");
            return;
        }

        // 调用主应用提供的回调函数（如果存在）
        if (window.onShoppingCheckout) {
            const productDetails = await Promise.all(selectedItems.map(async item => {
                const product = await db.shoppingProducts.get(item.productId);
                return { ...product, quantity: item.quantity };
            }));
            window.onShoppingCheckout(productDetails);
        } else {
            alert(`模拟结算成功！共 ${selectedItems.length} 种商品。`);
        }

        // 从购物车中移除已结算的商品
        shoppingCart = shoppingCart.filter(item => !selectedItems.includes(item));
        updateCartCount();
        showShoppingScreen('shopping-screen'); // 返回购物主页
        renderShoppingProducts();
    }

    async function openProductEditor(productId = null) {
        editingProductId = productId;
        const modal = document.getElementById('product-editor-modal');
        const nameInput = document.getElementById('module-product-name-input');
        const priceInput = document.getElementById('module-product-price-input');
        const descInput = document.getElementById('module-product-description-input');
        const imagePreview = document.getElementById('module-product-image-preview');

        if (productId) {
            document.getElementById('module-product-editor-title').textContent = '编辑商品';
            const product = await db.shoppingProducts.get(productId);
            nameInput.value = product.name;
            priceInput.value = product.price;
            descInput.value = product.description || '';
            imagePreview.src = product.imageUrl;
        } else {
            document.getElementById('module-product-editor-title').textContent = '添加商品';
            nameInput.value = '';
            priceInput.value = '';
            descInput.value = '';
            imagePreview.src = 'https://s3plus.meituan.net/opapisdk/op_ticket_885190757_1756206115802_qdqqd_0c99bh.jpeg';
        }
        modal.classList.add('visible');
    }

    async function saveProduct() {
        const name = document.getElementById('module-product-name-input').value.trim();
        const price = parseFloat(document.getElementById('module-product-price-input').value);
        const description = document.getElementById('module-product-description-input').value.trim();
        const imageUrl = document.getElementById('module-product-image-preview').src;

        if (!name || isNaN(price) || price < 0) {
            alert('请输入有效的商品名称和价格！');
            return;
        }
        
        const productData = { name, price, description, imageUrl };
        if (editingProductId) {
            await db.shoppingProducts.update(editingProductId, productData);
        } else {
            await db.shoppingProducts.add(productData);
        }
        document.getElementById('product-editor-modal').classList.remove('visible');
        await renderShoppingProducts();
    }
    
    async function deleteProduct(productId) {
        if (confirm('确定要删除这个商品吗？')) {
            await db.shoppingProducts.delete(productId);
            await renderShoppingProducts();
        }
    }


    // --- 事件监听器绑定 ---
    function bindEvents() {
        const moduleContainer = document.getElementById('shopping-module');
        if (!moduleContainer) return;

        // 返回主应用
        moduleContainer.querySelector('#module-shopping-back-btn').addEventListener('click', () => {
            showShoppingScreen('none'); // 隐藏所有购物模块屏幕
            // 主应用可以通过 `window.showScreen('chat-interface-screen')` 来切换回主界面
        });

        // 导航
        moduleContainer.querySelector('#module-go-to-cart-btn').addEventListener('click', () => {
            renderCartItems();
            showShoppingScreen('cart-screen');
        });
        moduleContainer.querySelector('#module-cart-back-btn').addEventListener('click', () => showShoppingScreen('shopping-screen'));
        
        // 核心操作
        moduleContainer.querySelector('#module-checkout-btn').addEventListener('click', handleCheckout);
        
        // 商品管理
        moduleContainer.querySelector('#module-manage-products-btn').addEventListener('click', () => {
            isProductManagementMode = !isProductManagementMode;
            renderShoppingProducts();
        });
        moduleContainer.querySelector('#module-add-new-product-btn').addEventListener('click', () => openProductEditor(null));

        // 商品列表事件委托
        moduleContainer.querySelector('#product-grid').addEventListener('click', async e => {
            const productItem = e.target.closest('.product-item');
            if (!productItem) return;
            const productId = parseInt(productItem.dataset.id);
            if (e.target.classList.contains('edit-product-btn')) {
                openProductEditor(productId);
            } else if (e.target.classList.contains('delete-product-btn')) {
                deleteProduct(productId);
            } else if (e.target.classList.contains('add-to-cart-btn')) {
                await addToCart(productId);
                alert('已加入购物车');
            }
        });

        // 购物车事件委托
        moduleContainer.querySelector('#cart-items-list').addEventListener('click', e => {
            const target = e.target;
            const productId = parseInt(target.dataset.id);
            if (target.classList.contains('decrease-qty-btn')) {
                updateCartItemQuantity(productId, -1);
            } else if (target.classList.contains('increase-qty-btn')) {
                updateCartItemQuantity(productId, 1);
            } else if (target.classList.contains('cart-item-checkbox')) {
                updateCartTotal();
            }
        });
        
        moduleContainer.querySelector('#module-clear-cart-btn').addEventListener('click', async () => {
            if (shoppingCart.length > 0 && confirm('确定清空购物车吗？')) {
                shoppingCart = [];
                updateCartCount();
                renderCartItems();
            }
        });
        
        moduleContainer.querySelector('#module-select-all-cart-items').addEventListener('change', e => {
            moduleContainer.querySelectorAll('#cart-items-list .cart-item-checkbox').forEach(cb => {
                cb.checked = e.target.checked;
            });
            updateCartTotal();
        });

        // 编辑器弹窗
        moduleContainer.querySelector('#module-cancel-product-editor-btn').addEventListener('click', () => {
            document.getElementById('product-editor-modal').classList.remove('visible');
        });
        moduleContainer.querySelector('#module-save-product-btn').addEventListener('click', saveProduct);
        moduleContainer.querySelector('#module-product-image-input').addEventListener('change', e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => { document.getElementById('module-product-image-preview').src = re.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }

    // -------------------------------------------------
    // [第四部分] 全局入口点与初始化
    // -------------------------------------------------
    
    /**
     * 主应用的入口函数，用于启动购物模块
     */
    async function openShoppingModule() {
        await renderShoppingProducts();
        showShoppingScreen('shopping-screen');
    }

    /**
     * 模块初始化函数
     */
    function init() {
        injectShoppingStyles();
        injectShoppingHTML();
        bindEvents();
    }
    
    // 将入口函数暴露到全局 window 对象
    window.openShoppingModule = openShoppingModule;

    // 立即执行初始化
    init();

})(window);