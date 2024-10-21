async function startScan() {
    try {
        document.getElementById('scan-status').textContent = 'Scan en cours...';
        const result = await fetchAPI('/scan', 'POST');
        document.getElementById('scan-status').textContent = 'Scan terminé';
        displayScanResults(result);
    } catch (error) {
        console.error('Erreur lors du lancement du scan:', error);
        document.getElementById('scan-status').textContent = 'Erreur lors du scan';
        showNotification('Erreur lors du lancement du scan', 'error');
    }
}

function displayScanResults(result) {
    const resultsDiv = document.getElementById('scan-results');
    resultsDiv.innerHTML = `
        <h3>Résultats du scan</h3>
        <p>Fichiers analysés: ${result.filesScanned}</p>
        <p>Menaces détectées: ${result.threatsDetected}</p>
        <p>Fichiers mis en quarantaine: ${result.filesQuarantined}</p>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('start-scan').addEventListener('click', startScan);
});