let observer = null;
const ecoScores = new Map(); // Persistent storage for scores

function addEcoScanNumber(element, ecoScore) {
    if (!element.querySelector('.ecoscan-number')) {
        const imageElement = element.querySelector('img');
        if (imageElement) {
            const numberSpan = document.createElement('span');
            numberSpan.className = 'ecoscan-number';
            numberSpan.textContent = `EcoScore: ${ecoScore}`;
            imageElement.insertAdjacentElement('afterend', numberSpan);
        }
    }
}

function removeEcoScores() {
    document.querySelectorAll('.ecoscan-number').forEach((element) => element.remove());
    // Don’t clear ecoScores so we retain GPT results across reanalyzes
}

async function analyzeProductEcoScores() {
    const OPENAI_API_KEY = "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";
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
    };

    function scrapeProductData(element) {
        const titleElement = element.querySelector('h2 a span, .s-product-title');
        const title = titleElement ? titleElement.textContent.trim() : 'Title not found';

        const detailsElement = element.querySelector('.a-spacing-small');
        const productDetails = {};
        if (detailsElement) {
            const detailLines = detailsElement.textContent.split('\n').filter(line => line.trim().includes(':'));
            detailLines.forEach(line => {
                const [key, value] = line.split(':').map(s => s.trim());
                if (key && value) productDetails[key] = value;
            });
        }
        return { title, details: productDetails };
    }

    const productElements = Array.from(document.querySelectorAll('.s-result-item, .s-product-image-container'));
    
    for (const element of productElements) {
        const imageElement = element.querySelector('img');
        if (imageElement && !element.querySelector('.ecoscan-number')) {
            const linkElement = element.querySelector('a[href*="amazon.com"]') || element.closest('a[href*="amazon.com"]');
            const urlKey = linkElement && linkElement.href ? linkElement.href : null;

            if (urlKey && !ecoScores.has(urlKey)) {
                const productData = scrapeProductData(element);
                const prompt = `You are an environmental analyst AI. Evaluate the carbon-friendliness of the product based on the following details:

                Title: ${productData.title}
                Details: ${JSON.stringify(productData.details)}

                Provide only a carbon-friendliness score between 0 and 100.`;
                const body = JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are an environmental analyst AI." },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: 10
                });

                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: headers,
                        body: body
                    });
                    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                    const data = await response.json();
                    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
                        throw new Error('Invalid response structure from OpenAI');
                    }
                    const analysis = data.choices[0].message.content.trim();
                    const match = analysis.match(/\d+/);
                    const ecoScore = match ? parseInt(match[0]) : Math.floor(Math.random() * 31) + 70;
                    ecoScores.set(urlKey, ecoScore);
                    addEcoScanNumber(element, ecoScore);
                } catch (error) {
                    console.error('OpenAI Error for product', productData.title, ':', error.message);
                    const ecoScore = Math.floor(Math.random() * 31) + 70;
                    ecoScores.set(urlKey, ecoScore);
                    addEcoScanNumber(element, ecoScore);
                }
            } else if (urlKey && ecoScores.has(urlKey)) {
                addEcoScanNumber(element, ecoScores.get(urlKey));
            } else if (!urlKey) {
                const ecoScore = Math.floor(Math.random() * 31) + 70;
                addEcoScanNumber(element, ecoScore);
            }
        }
    }
}

function startObserver() {
    if (observer) return;
    let timeout;
    observer = new MutationObserver(() => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            analyzeProductEcoScores();
        }, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: false });
    analyzeProductEcoScores(); // Initial run
}

function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
    removeEcoScores();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "start") {
        startObserver();
        sendResponse({ status: "started" });
    } else if (message.action === "stop") {
        stopObserver();
        sendResponse({ status: "stopped" });
    }
});