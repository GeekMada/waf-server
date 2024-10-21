async function loadAPILimits() {
    try {
        const limits = await fetchAPI('/api-limits');
        document.getElementById('virustotal-daily').textContent = limits.virustotal.daily;
        document.getElementById('virustotal-daily-limit').textContent = limits.virustotal.dailyLimit;
        document.getElementById('abuseipdb-daily').textContent = limits.abuseipdb.daily;
        document.getElementById('abuseipdb-daily-limit').textContent = limits.abuseipdb.dailyLimit;
    } catch (error) {
        console.error('Erreur lors du chargement des limites API:', error);
        showNotification('Erreur lors du chargement des limites API', 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadAPILimits);