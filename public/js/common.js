async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (body) options.body = JSON.stringify(body);
    const response = await fetch(endpoint, options);
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
    return response.json();
}

function showNotification(message, type = 'info') {
    // Implémentation de la notification
}

// Autres fonctions communes