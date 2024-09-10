        AOS.init({
            duration: 900,
        });
        async function displayProducts(category) {
            const productList = document.getElementById('product-list');
            const sectionTitle = document.querySelector('#products-section h2');
            sectionTitle.textContent = category === 'all' ? 'All Products' : `${category} Products`;

            try {
                const response = await fetch(`/products?category=${category}`);
                const products = await response.json();

                if (products.length === 0) {
                    productList.innerHTML = '<p>No products available in this category.</p>';
                    return;
                }

                let productCards = '';
                products.forEach(product => {
                    const thumbnail = product.thumbnail || 'https://via.placeholder.com/150';
                    const price = product.price || 'Contact for price';
                    const description = product.description.length > 20
                        ? product.description.slice(0, 20) + '... <span class="read-more" onclick="showMore(this, \'' + product.description + '\')">Read More</span>'
                        : product.description;

                    productCards += `
                        <div class="col-md-6 mb-4" data-aos="fade-up">
                            <div class="card product-card">
                                <img src="${thumbnail}" class="card-img-top" alt="${product.name}">
                                <div class="card-body">
                                    <h5 class="card-title">${product.name}</h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text"><strong>Rp.${price}</strong></p>
                                    <a href="/detail/${product.name}" class="btn btn-detail">Order Now</a>
                                </div>
                            </div>
                        </div>`;
                });

                productList.innerHTML = productCards;
            } catch (error) {
                productList.innerHTML = '<p>Failed to load products. Please try again later.</p>';
            }
        }
        function showMore(element, fullText) {
            element.parentElement.innerHTML = fullText;
        }
        async function searchProducts(query) {
            const productList = document.getElementById('product-list');
            const sectionTitle = document.querySelector('#products-section h2');
            const closeSearch = document.getElementById('closeSearch');

            sectionTitle.textContent = `Search Results for "${query}"`;
            closeSearch.classList.remove('d-none');

            try {
                const response = await fetch(`/products/search?query=${encodeURIComponent(query)}`);
                const results = await response.json();

                if (results.length === 0) {
                    productList.innerHTML = `<p>No results found for "${query}".</p>`;
                    return;
                }

                let productCards = '';
                results.forEach(product => {
                    const thumbnail = product.thumbnail || 'https://via.placeholder.com/150';
                    const price = product
                    price || 'Contact for price';
                    const description = product.description.length > 30
                        ? product.description.slice(0, 20) + '... <span class="read-more" onclick="showMore(this, \'' + product.description + '\')">Read More</span>'
                        : product.description;

                    productCards += `
                        <div class="col-md-6 mb-4" data-aos="fade-up">
                            <div class="card product-card">
                                <img src="${thumbnail}" class="card-img-top" alt="${product.name}">
                                <div class="card-body">
                                    <h5 class="card-title">${product.name}</h5>
                                    <p class="card-text">${description}</p>
                                    <p class="card-text"><strong>Rp.${product.price}</strong></p>
                                    <a href="/detail/${product.name}" class="btn btn-detail">Order Now</a>
                                </div>
                            </div>
                        </div>`;
                });

                productList.innerHTML = productCards;
            } catch (error) {
                productList.innerHTML = `<p>Failed to load search results for "${query}". Please try again later.</p>`;
            }
        }
        function resetSections() {
            const productList = document.getElementById('product-list');
            const sectionTitle = document.querySelector('#products-section h2');
            const closeSearch = document.getElementById('closeSearch');
            closeSearch.classList.add('d-none');
            sectionTitle.textContent = 'All Products';
            displayProducts('all');
        }
        displayProducts('all');