// Moderate background animation system
function createAnimatedBackground() {
    // Create animated overlay
    const overlay = document.createElement('div');
    overlay.className = 'animated-overlay';
    document.body.insertBefore(overlay, document.body.firstChild);

    // Create food particles container
    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'food-particles';
    document.body.insertBefore(particlesContainer, document.body.firstChild);

    // Create bubbles container
    const bubblesContainer = document.createElement('div');
    bubblesContainer.className = 'bubbles';
    document.body.insertBefore(bubblesContainer, document.body.firstChild);

    // Create steam container
    const steamContainer = document.createElement('div');
    steamContainer.className = 'steam-container';
    document.body.insertBefore(steamContainer, document.body.firstChild);

    // Create food icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.className = 'food-icons';
    document.body.insertBefore(iconsContainer, document.body.firstChild);

    // Food and drink emojis
    const foodEmojis = [
        '🍕', '🍔', '🍟', '🌮', '🍜', '🍝', '🍗', '🥘', '🍛', '🥗', 
        '🍤', '🍣', '🍱', '🥞', '🧇', '🥖', '🥨', '🥯', '🍞', '🥐'
    ];
    
    const drinkEmojis = [
        '🥤', '☕', '🍺', '🍷', '🍸', '🧋', '🍹', '🥃', '🍾', '🧊', 
        '🥛', '🍵', '🧃'
    ];

    // Generate moderate floating food particles
    function createFoodParticle() {
        const particle = document.createElement('div');
        particle.className = 'food-particle';
        particle.textContent = foodEmojis[Math.floor(Math.random() * foodEmojis.length)];
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 8 + 10) + 's';
        particle.style.animationDelay = Math.random() * 3 + 's';
        particlesContainer.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 15000);
    }

    // Generate moderate bubbles
    function createBubble() {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        const size = Math.random() * 25 + 15;  // Bigger bubbles
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = Math.random() * 100 + '%';
        bubble.style.animationDuration = (Math.random() * 4 + 8) + 's';
        bubble.style.animationDelay = Math.random() * 2 + 's';
        bubblesContainer.appendChild(bubble);

        setTimeout(() => {
            if (bubble.parentNode) {
                bubble.remove();
            }
        }, 12000);
    }

    // Generate moderate steam
    function createSteam() {
        const steam = document.createElement('div');
        steam.className = 'steam';
        const size = Math.random() * 50 + 30;  // Bigger steam
        steam.style.width = size + 'px';
        steam.style.height = size + 'px';
        steam.style.left = Math.random() * 100 + '%';
        steam.style.bottom = Math.random() * 20 + '%';
        steam.style.animationDuration = (Math.random() * 3 + 6) + 's';
        steam.style.animationDelay = Math.random() * 2 + 's';
        steamContainer.appendChild(steam);

        setTimeout(() => {
            if (steam.parentNode) {
                steam.remove();
            }
        }, 10000);
    }

    // Create moderate pulsing food icons
    function createFoodIcons() {
        const allEmojis = [...foodEmojis, ...drinkEmojis];
        for (let i = 0; i < 15; i++) {  // More icons
            const icon = document.createElement('div');
            icon.className = 'food-icon';
            icon.textContent = allEmojis[Math.floor(Math.random() * allEmojis.length)];
            icon.style.top = Math.random() * 80 + 10 + '%';
            icon.style.left = Math.random() * 80 + 10 + '%';
            icon.style.animationDelay = Math.random() * 4 + 's';
            iconsContainer.appendChild(icon);
        }
    }

    // Initialize animations
    createFoodIcons();

    // Moderate intervals for balanced animation
    const particleInterval = setInterval(createFoodParticle, 2500);  // More frequent
    const bubbleInterval = setInterval(createBubble, 2000);  // More frequent
    const steamInterval = setInterval(createSteam, 3500);  // More frequent

    // Enhanced background image
    document.body.style.backgroundImage = 'url(https://source.unsplash.com/1600x900/?food,restaurant,cooking)';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';

    // Store intervals for cleanup
    window.animationIntervals = {
        particles: particleInterval,
        bubbles: bubbleInterval,
        steam: steamInterval
    };
}

// Initialize DOM elements
const searchBtn = document.getElementById('search-btn');
const mealList = document.getElementById('meal');
const mealDetailsContent = document.querySelector('.meal-details-content');
const recipeCloseBtn = document.getElementById('recipe-close-btn');
const searchInput = document.getElementById('search-input');

// Create loading icon
const loadingIcon = document.createElement('div');
loadingIcon.className = 'loading-icon';
loadingIcon.innerHTML = '🔍 Searching for delicious meals...';
mealList.insertAdjacentElement('beforebegin', loadingIcon);

// Event listeners
searchBtn.addEventListener('click', getMealList);
mealList.addEventListener('click', getMealRecipe);
recipeCloseBtn.addEventListener('click', () => {
    mealDetailsContent.parentElement.classList.remove('showRecipe');
});
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        getMealList();
    }
});

// Input effects
searchInput.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value.length > 0) {
        searchBtn.style.transform = 'scale(1.05)';
    } else {
        searchBtn.style.transform = 'scale(1)';
    }
});

// FIXED RANDOM MEAL FUNCTION - NO MORE ERRORS
async function showRandomMeal() {
    loadingIcon.style.display = 'block';
    loadingIcon.innerHTML = '🎲 Getting random delicious meal...';
    mealList.innerHTML = '';
    
    try {
        const response = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.meals && data.meals.length > 0) {
            // Display the random meal
            displayMeals(data.meals, 'random meal');
        } else {
            throw new Error('No random meal found in response');
        }
        
    } catch (error) {
        console.error('Random meal fetch error:', error);
        mealList.innerHTML = `
            <div class="notFound">
                <p>🚫 Couldn't fetch a random meal right now.</p>
                <p>Please check your internet connection and try again!</p>
                <button onclick="showRandomMeal()" class="recipe-btn" style="margin-top: 1rem;">
                    🔄 Try Again
                </button>
            </div>
        `;
        mealList.classList.add('notFound');
    } finally {
        loadingIcon.style.display = 'none';
    }
}

// Enhanced meal search function
async function getMealList() {
    let searchInputTxt = searchInput.value.trim();
    
    if (!searchInputTxt) {
        alert('Please enter a search term!');
        return;
    }
    
    loadingIcon.style.display = 'block';
    loadingIcon.innerHTML = '🔍 Searching for amazing recipes...';
    mealList.innerHTML = '';
    
    try {
        // Multiple API calls for better results
        const searchPromises = [
            fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${searchInputTxt}`),
            fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?i=${searchInputTxt}`),
            fetch(`https://www.themealdb.com/api/json/v1/1/search.php?f=${searchInputTxt.charAt(0)}`)
        ];

        const responses = await Promise.all(searchPromises);
        const dataPromises = responses.map(response => response.json());
        const results = await Promise.all(dataPromises);
        
        // Combine and deduplicate results
        let allMeals = [];
        results.forEach(data => {
            if (data.meals) {
                allMeals = allMeals.concat(data.meals);
            }
        });
        
        // Remove duplicates based on meal ID
        const uniqueMeals = allMeals.filter((meal, index, self) => 
            index === self.findIndex(m => m.idMeal === meal.idMeal)
        );
        
        displayMeals(uniqueMeals, searchInputTxt);
        
    } catch (error) {
        console.error('Search error:', error);
        mealList.innerHTML = `
            <div class="notFound">
                <p>🚫 Network error! Please check your connection and try again.</p>
            </div>
        `;
        mealList.classList.add('notFound');
    } finally {
        loadingIcon.style.display = 'none';
    }
}

// Display meals function
function displayMeals(meals, searchTerm) {
    let html = "";
    
    if (meals && meals.length > 0) {
        // Sort meals by relevance
        meals.sort((a, b) => {
            const aNameMatch = a.strMeal.toLowerCase().includes(searchTerm.toLowerCase());
            const bNameMatch = b.strMeal.toLowerCase().includes(searchTerm.toLowerCase());
            if (aNameMatch && !bNameMatch) return -1;
            if (!aNameMatch && bNameMatch) return 1;
            return 0;
        });
        
        meals.forEach((meal, index) => {
            html += `
                <div class="meal-item" data-id="${meal.idMeal}" style="animation-delay: ${index * 0.1}s">
                    <div class="meal-img">
                        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy">
                    </div>
                    <div class="meal-name">
                        <h3>${meal.strMeal}</h3>
                        <a href="#" class="recipe-btn">Get Recipe</a>
                    </div>
                </div>
            `;
        });
        mealList.classList.remove('notFound');
        
    } else {
        html = `
            <div class="notFound">
                <p>🍽️ No meals found for "${searchTerm}"!</p>
                <p>Try different ingredients like "chicken", "beef", or "pasta"</p>
                <button onclick="showRandomMeal()" class="recipe-btn" style="margin-top: 1rem;">
                    🎲 Try Random Meal Instead
                </button>
            </div>
        `;
        mealList.classList.add('notFound');
    }
    
    mealList.innerHTML = html;
}

// FIXED Recipe fetching function - No more false errors
async function getMealRecipe(e) {
    e.preventDefault();
    if (e.target.classList.contains('recipe-btn')) {
        let mealItem = e.target.parentElement.parentElement;
        
        // Only proceed if we have a meal ID
        if (!mealItem.dataset.id) {
            console.log('No meal ID found, this might be a button click from notFound section');
            return; // Don't show error for random meal button clicks
        }
        
        // Add loading state to button
        const originalText = e.target.textContent;
        e.target.textContent = 'Loading...';
        e.target.style.pointerEvents = 'none';
        
        try {
            const response = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealItem.dataset.id}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.meals && data.meals.length > 0) {
                mealRecipeModal(data.meals[0]);
            } else {
                alert('Recipe not found!');
            }
        } catch (error) {
            console.error('Recipe fetch error:', error);
            alert('Error loading recipe. Please try again!');
        } finally {
            // Restore button
            e.target.textContent = originalText;
            e.target.style.pointerEvents = 'auto';
        }
    }
}

// Enhanced modal creation function
function mealRecipeModal(meal) {
    console.log('Displaying recipe for:', meal.strMeal);
    
    // Get ingredients list
    let ingredients = '';
    for (let i = 1; i <= 20; i++) {
        const ingredient = meal[`strIngredient${i}`];
        const measure = meal[`strMeasure${i}`];
        
        if (ingredient && ingredient.trim()) {
            ingredients += `<li>🥄 ${measure ? measure.trim() : ''} ${ingredient.trim()}</li>`;
        }
    }
    
    // Get nutrition info
    const nutritionInfo = meal.strTags ? 
        `<p><strong>Tags:</strong> ${meal.strTags.split(',').map(tag => `<span class="recipe-category">${tag.trim()}</span>`).join(' ')}</p>` : '';
    
    let html = `
        <h2 class="recipe-title">🍽️ ${meal.strMeal}</h2>
        <p class="recipe-category">${meal.strCategory}</p>
        ${meal.strArea ? `<p class="recipe-category">${meal.strArea} Cuisine</p>` : ''}
        
        <div class="recipe-meal-img">
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}">
        </div>
        
        <div class="recipe-ingredients">
            <h3>🛒 Ingredients:</h3>
            <ul style="text-align: left; padding-left: 2rem;">
                ${ingredients}
            </ul>
        </div>
        
        <div class="recipe-instruct">
            <h3>👨‍🍳 Instructions:</h3>
            <p style="text-align: left; line-height: 1.8;">${meal.strInstructions}</p>
        </div>
        
        ${nutritionInfo}
        
        ${meal.strYoutube ? `
            <div class="recipe-link">
                <a href="${meal.strYoutube}" target="_blank">🎥 Watch Video Tutorial</a>
            </div>
        ` : ''}
        
        ${meal.strSource ? `
            <div class="recipe-link">
                <a href="${meal.strSource}" target="_blank">📖 Original Recipe Source</a>
            </div>
        ` : ''}
    `;
    
    mealDetailsContent.innerHTML = html;
    mealDetailsContent.parentElement.classList.add('showRecipe');
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close modal
    if (e.key === 'Escape') {
        const modal = document.querySelector('.meal-details.showRecipe');
        if (modal) {
            modal.classList.remove('showRecipe');
        }
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
    }
    
    // R key for random meal
    if (e.key === 'r' || e.key === 'R') {
        if (!document.querySelector('.meal-details.showRecipe')) {
            showRandomMeal();
        }
    }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize animated background
    createAnimatedBackground();
    
    // REMOVED WELCOME MESSAGE - Just show the random meal button
    setTimeout(() => {
        if (!mealList.innerHTML.trim()) {
            mealList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--tenne-tawny);">
                    <button onclick="showRandomMeal()" class="recipe-btn" style="margin-top: 1rem;">
                        🎲 Show Random Meal
                    </button>
                    <p style="font-size: 0.9rem; margin-top: 1rem; opacity: 0.8;">Press 'R' for random meal • Ctrl+K to focus search</p>
                </div>
            `;
        }
    }, 1000);
    
    // Add focus to search input
    searchInput.focus();
});

// Make showRandomMeal globally available
window.showRandomMeal = showRandomMeal;

// Cleanup function
function cleanupAnimations() {
    if (window.animationIntervals) {
        Object.values(window.animationIntervals).forEach(interval => {
            clearInterval(interval);
        });
    }
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanupAnimations);
