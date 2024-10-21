async function checkIP(ip) {
    try {
        const result = await fetchAPI('/check-ip', 'POST', { ip });
        displayIPCheckResult(result);
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'IP:', error);
        showNotification('Erreur lors de la vérification de l\'IP', 'error');
    }
}

function displayIPCheckResult(result) {
    const resultDiv = document.getElementById('ip-check-result');
    resultDiv.innerHTML = `
        <h3>Résultat pour ${result.ip}</h3>
        <p>Score de confiance d'abus: ${result.abuseConfidenceScore}</p>
        <p>Pays: ${result.countryCode}</p>
        <p>Domaine: ${result.domain}</p>
        <p>Rapports totaux: ${result.totalReports}</p>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('ip-check-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const ip = document.getElementById('ip-to-check').value;
        checkIP(ip);
    });
});