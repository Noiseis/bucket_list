// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyC1v5nJeGu-22Je0GPDkfqDsZzM831XV3A",
    authDomain: "bucketList-abcb3.firebaseapp.com",
    projectId: "bucketlist-abcb3",
    storageBucket: "bucketList-abcb3.firebasestorage.app",
    messagingSenderId: "285455575218",
    appId: "1:285455575218:web:9847eeff45ebbf09d8a1ab"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Collections
const categoriesRef = db.collection("categories");
const itemsRef = db.collection("items");

// DOM Elements
const categoriesContainer = document.getElementById("categories-container");
const categorySelect = document.getElementById("category-select");
const newCategoryInput = document.getElementById("new-category");
const addCategoryBtn = document.getElementById("add-category-btn");
const newItemInput = document.getElementById("new-item");
const addItemBtn = document.getElementById("add-item-btn");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const progressTooltip = document.getElementById("progress-tooltip");
const itemControls = document.getElementById("item-controls");
const progressContainer = document.getElementById("progress-container");

// State
let categories = [];
let items = [];
// Add this to your existing script.js

// Theme Management
const themeSwitch = document.createElement('button');
themeSwitch.className = 'theme-switch';
themeSwitch.innerHTML = '🌙';
document.body.appendChild(themeSwitch);

// Initialize theme
let currentTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', currentTheme);
updateThemeButton();

// Theme switch handler
themeSwitch.addEventListener('click', () => {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeButton();
});

function updateThemeButton() {
    themeSwitch.innerHTML = currentTheme === 'light' ? '🌙' : '💖';
    themeSwitch.style.background = currentTheme === 'light' 
        ? 'var(--primary)' 
        : 'var(--primary-light)';
    
    // Update theme-color meta tag
    const themeColor = currentTheme === 'light' ? '#ff6b9d' : '#5c33f6';
    document.querySelector('meta[name="theme-color"]').content = themeColor;
}
// Load all data
function loadData() {
    // Load categories
    categoriesRef.orderBy("name").onSnapshot(snapshot => {
        categories = [];
        categorySelect.innerHTML = '<option value="">Select category</option>';
        
        snapshot.forEach(doc => {
            const category = { id: doc.id, ...doc.data() };
            categories.push(category);
            
            // Add to dropdown
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        // Show/hide item controls based on categories
        if (categories.length > 0) {
            itemControls.classList.add("visible");
        } else {
            itemControls.classList.remove("visible");
        }
        
        loadItems();
    });
}

// Load items
function loadItems() {
    itemsRef.orderBy("createdAt").onSnapshot(snapshot => {
        items = [];
        snapshot.forEach(doc => {
            items.push({ id: doc.id, ...doc.data() });
        });
        
        renderCategories();
        updateProgress();
    });
}

// Render categories with their items
function renderCategories() {
    categoriesContainer.innerHTML = "";
    
    // First render standalone items
    const standaloneItems = items.filter(item => !item.categoryId);
    if (standaloneItems.length > 0) {
        const standaloneCategory = document.createElement("div");
        standaloneCategory.className = "category";
        standaloneCategory.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">Standalone Items</h3>
            </div>
            <ul class="items-list" id="standalone-items"></ul>
        `;
        
        const standaloneList = standaloneCategory.querySelector("#standalone-items");
        standaloneItems.forEach(item => {
            renderItem(item, standaloneList);
        });
        
        categoriesContainer.appendChild(standaloneCategory);
    }
    
    // Then render categorized items
    categories.forEach((category, index) => {
        const categoryItems = items.filter(item => item.categoryId === category.id);
        
        const categoryEl = document.createElement("div");
        categoryEl.className = "category";
        categoryEl.style.animationDelay = `${index * 0.1}s`;
        categoryEl.innerHTML = `
            <div class="category-header">
                <h3 class="category-title">${category.name}</h3>
                <button class="delete-category" data-id="${category.id}">×</button>
            </div>
            <ul class="items-list" id="items-${category.id}"></ul>
        `;
        
        const itemsList = categoryEl.querySelector(`#items-${category.id}`);
        
        if (categoryItems.length === 0) {
            itemsList.innerHTML = "<li style='opacity:0.5'>No items in this category</li>";
        } else {
            categoryItems.forEach((item, itemIndex) => {
                renderItem(item, itemsList, itemIndex);
            });
        }
        
        // Delete category
        const deleteCategoryBtn = categoryEl.querySelector(".delete-category");
        deleteCategoryBtn.addEventListener("click", (e) => {
            if (confirm(`Delete "${category.name}" category? Items will become standalone.`)) {
                // Convert categorized items to standalone
                const batch = db.batch();
                categoryItems.forEach(item => {
                    batch.update(itemsRef.doc(item.id), { categoryId: null });
                });
                batch.commit().then(() => {
                    categoriesRef.doc(category.id).delete();
                });
            }
        });
        
        categoriesContainer.appendChild(categoryEl);
    });
}

// Render single item
function renderItem(item, container, index = 0) {
    const li = document.createElement("li");
    li.className = `item ${item.completed ? "completed" : ""}`;
    li.style.animationDelay = `${index * 0.05}s`;
    li.innerHTML = `
        <input type="checkbox" id="item-${item.id}" ${item.completed ? "checked" : ""}>
        <label for="item-${item.id}">${item.text}</label>
        <button class="delete-item" data-id="${item.id}">×</button>
    `;
    
    // Toggle completion
    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", () => {
        itemsRef.doc(item.id).update({
            completed: checkbox.checked
        });
    });
    
    // Delete item
    const deleteBtn = li.querySelector(".delete-item");
    deleteBtn.addEventListener("click", () => {
        itemsRef.doc(item.id).delete();
    });
    
    container.appendChild(li);
}

// Update progress bar
function updateProgress() {
    const totalItems = items.length;
    const completedItems = items.filter(item => item.completed).length;
    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // Update progress bar color based on percentage
    if (percent === 100) {
        progressFill.style.background = "var(--success)";
    } else if (percent >= 80) {
        progressFill.style.background = "var(--info)";
    } else if (percent >= 50) {
        progressFill.style.background = "var(--warning)";
    } else {
        progressFill.style.background = "var(--danger)";
    }
    
    progressFill.style.width = `${percent}%`;
    progressText.textContent = `${percent}% Complete`;
    progressTooltip.textContent = `${completedItems}/${totalItems} items`;
}

// Add new category
addCategoryBtn.addEventListener("click", () => {
    const name = newCategoryInput.value.trim();
    if (name) {
        categoriesRef.add({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newCategoryInput.value = "";
        newCategoryInput.focus();
    }
});

// Add new item
addItemBtn.addEventListener("click", () => {
    const text = newItemInput.value.trim();
    const categoryId = categorySelect.value;
    
    if (text && categoryId) {
        itemsRef.add({
            text: text,
            categoryId: categoryId,
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        newItemInput.value = "";
        newItemInput.focus();
    }
});

// Keyboard support
newItemInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addItemBtn.click();
});

newCategoryInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addCategoryBtn.click();
});

// Initialize
loadData();