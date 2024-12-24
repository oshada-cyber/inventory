document.addEventListener("DOMContentLoaded", function () {
    const stockTable = document.getElementById("stockTable").getElementsByTagName("tbody")[0];
    const billingTable = document.getElementById("billingTable").getElementsByTagName("tbody")[0];
    const totalBillAmountElem = document.getElementById("totalBillAmount");
    const generateBillBtn = document.getElementById("generateBillBtn");
    const clearCartBtn = document.getElementById("clearCartBtn");
    const addItemForm = document.getElementById("addItemForm");
    const searchBar = document.getElementById("searchBar");

    let inventory = [];
    let cart = [];
    let dailyCost = 0;

    // Load data from local storage
    function loadSavedData() {
        inventory = JSON.parse(localStorage.getItem("inventory")) || [];
        cart = JSON.parse(localStorage.getItem("cart")) || [];
        updateInventoryTable();
        updateBillingTable();
        updateDailyCost();
        updateTotalBill();
    }

    // Save data to local storage
    function saveDataToLocalStorage() {
        localStorage.setItem("inventory", JSON.stringify(inventory));
        localStorage.setItem("cart", JSON.stringify(cart));
    }

    // Add a new item to the inventory
    addItemForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const barcode = document.getElementById("barcode").value.trim();
        const itemName = document.getElementById("itemName").value.trim();
        const quantity = parseInt(document.getElementById("quantity").value);
        const price = parseFloat(document.getElementById("price").value);
        const imageFile = document.getElementById("image").files[0];

        if (!barcode || !itemName || quantity <= 0 || price <= 0) {
            alert("Please fill out all fields with valid values.");
            return;
        }

        if (inventory.some(item => item.barcode === barcode)) {
            alert("Item with this barcode already exists.");
            return;
        }

        const newItem = {
            barcode,
            itemName,
            quantity,
            price,
            image: imageFile ? URL.createObjectURL(imageFile) : null
        };

        inventory.push(newItem);
        addItemForm.reset();
        updateInventoryTable();
        updateDailyCost();
        saveDataToLocalStorage();
    });

    // Update the inventory table
    function updateInventoryTable() {
        stockTable.innerHTML = "";
        inventory.forEach(item => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.barcode}</td>
                <td>${item.itemName}</td>
                <td>
                    <button class="minus-btn" data-barcode="${item.barcode}">-</button> ${item.quantity}
                    <button class="plus-btn" data-barcode="${item.barcode}">+</button>
                </td>
                <td>${item.price.toFixed(2)} LKR</td>
                <td><img src="${item.image || ''}" alt="Image" width="50" height="50"></td>
                <td>
                    <button class="edit-btn" data-barcode="${item.barcode}">Edit</button>
                    <button class="delete-btn" data-barcode="${item.barcode}">Delete</button>
                    <button class="add-to-cart-btn" data-barcode="${item.barcode}">Add to Cart</button>
                </td>
            `;
            attachInventoryRowEvents(row, item);
            stockTable.appendChild(row);
        });
    }

    // Attach events to inventory row buttons
    function attachInventoryRowEvents(row, item) {
        row.querySelector(".minus-btn").addEventListener("click", () => changeQuantity(item.barcode, -1));
        row.querySelector(".plus-btn").addEventListener("click", () => changeQuantity(item.barcode, 1));
        row.querySelector(".edit-btn").addEventListener("click", () => editItem(item.barcode));
        row.querySelector(".delete-btn").addEventListener("click", () => deleteItem(item.barcode));
        row.querySelector(".add-to-cart-btn").addEventListener("click", function () {
            addToCart(item);
            this.disabled = true;
            this.textContent = "Added";
        });
    }

    // Update item quantity
    function changeQuantity(barcode, change) {
        const item = inventory.find(item => item.barcode === barcode);
        if (item) {
            item.quantity = Math.max(0, item.quantity + change);
            updateInventoryTable();
            updateDailyCost();
            saveDataToLocalStorage();
        }
    }

    // Edit item details
    function editItem(barcode) {
        const item = inventory.find(item => item.barcode === barcode);
        if (item) {
            document.getElementById("barcode").value = item.barcode;
            document.getElementById("itemName").value = item.itemName;
            document.getElementById("quantity").value = item.quantity;
            document.getElementById("price").value = item.price;
        }
    }

    // Delete an item from inventory
    function deleteItem(barcode) {
        inventory = inventory.filter(item => item.barcode !== barcode);
        updateInventoryTable();
        updateDailyCost();
        saveDataToLocalStorage();
    }

    // Add item to cart
    function addToCart(item) {
        const cartItem = cart.find(cartItem => cartItem.barcode === item.barcode);

        if (cartItem) {
            if (cartItem.quantity < item.quantity) {
                cartItem.quantity++;
                item.quantity--;
            } else {
                alert("Not enough stock to add more.");
            }
        } else if (item.quantity > 0) {
            cart.push({ ...item, quantity: 1 });
            item.quantity--;
        } else {
            alert("Out of stock.");
        }

        updateInventoryTable();
        updateBillingTable();
        updateTotalBill();
        saveDataToLocalStorage();
    }

    // Update the billing table
    function updateBillingTable() {
        billingTable.innerHTML = "";
        cart.forEach(cartItem => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${cartItem.itemName}</td>
                <td>${cartItem.price.toFixed(2)} LKR</td>
                <td>
                    <button class="minus-cart-btn" data-barcode="${cartItem.barcode}">-</button> ${cartItem.quantity}
                    <button class="plus-cart-btn" data-barcode="${cartItem.barcode}">+</button>
                </td>
                <td>${(cartItem.quantity * cartItem.price).toFixed(2)} LKR</td>
                <td><button class="remove-btn" data-barcode="${cartItem.barcode}">Remove</button></td>
            `;
            attachBillingRowEvents(row, cartItem);
            billingTable.appendChild(row);
        });
    }

    // Attach events to billing row buttons
    function attachBillingRowEvents(row, cartItem) {
        row.querySelector(".minus-cart-btn").addEventListener("click", () => updateCartItemQuantity(cartItem.barcode, -1));
        row.querySelector(".plus-cart-btn").addEventListener("click", () => updateCartItemQuantity(cartItem.barcode, 1));
        row.querySelector(".remove-btn").addEventListener("click", () => removeFromCart(cartItem.barcode));
    }

    // Update cart item quantity
    function updateCartItemQuantity(barcode, change) {
        const cartItem = cart.find(cartItem => cartItem.barcode === barcode);
        const inventoryItem = inventory.find(item => item.barcode === barcode);

        if (cartItem && inventoryItem) {
            if (change > 0 && inventoryItem.quantity > 0) {
                cartItem.quantity++;
                inventoryItem.quantity--;
            } else if (change < 0 && cartItem.quantity > 1) {
                cartItem.quantity--;
                inventoryItem.quantity++;
            }
            updateBillingTable();
            updateInventoryTable();
            updateTotalBill();
            saveDataToLocalStorage();
        }
    }

    // Remove an item from the cart
    function removeFromCart(barcode) {
        const cartItemIndex = cart.findIndex(item => item.barcode === barcode);
        const cartItem = cart[cartItemIndex];
        if (cartItem) {
            inventory.find(item => item.barcode === barcode).quantity += cartItem.quantity;
            cart.splice(cartItemIndex, 1);
            updateBillingTable();
            updateInventoryTable();
            updateTotalBill();
            saveDataToLocalStorage();
        }
    }

    // Update the total bill amount
    function updateTotalBill() {
        const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        totalBillAmountElem.textContent = `${total.toFixed(2)} LKR`;
    }

    // Generate the bill
    generateBillBtn.addEventListener("click", function () {
        let billDetails = "Bill Details:\n";
        cart.forEach(item => {
            billDetails += `${item.itemName} x${item.quantity} = ${(item.quantity * item.price).toFixed(2)} LKR\n`;
        });
        billDetails += `\nTotal: ${totalBillAmountElem.textContent}`;
        alert(billDetails);

        cart = [];
        updateBillingTable();
        updateTotalBill();
        saveDataToLocalStorage();
    });

    // Clear the cart
    clearCartBtn.addEventListener("click", function () {
        cart = [];
        updateBillingTable();
        updateTotalBill();
        saveDataToLocalStorage();
    });

    // Update daily cost
    function updateDailyCost() {
        dailyCost = inventory.reduce((sum, item) => sum + item.quantity * item.price, 0);
        const dailyCostTable = document.getElementById("dailyCostTable").getElementsByTagName("tbody")[0];
        dailyCostTable.innerHTML = `
            <tr>
                <td>${new Date().toLocaleDateString()}</td>
                <td>${dailyCost.toFixed(2)} LKR</td>
            </tr>
        `;
    }

    // Search functionality
    searchBar.addEventListener("input", function () {
        const query = searchBar.value.toLowerCase();
        Array.from(stockTable.getElementsByTagName("tr")).forEach(row => {
            const barcode = row.cells[0].textContent.toLowerCase();
            const itemName = row.cells[1].textContent.toLowerCase();
            row.style.display = barcode.includes(query) || itemName.includes(query) ? "" : "none";
        });
    });

    // Load saved data on page load
    loadSavedData();
});
