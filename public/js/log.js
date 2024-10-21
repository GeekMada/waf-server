async function loadLogs() {
    try {
        const logs = await fetchAPI('/logs');
        const tbody = document.querySelector('#logs-table tbody');
        tbody.innerHTML = '';
        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.event_type}</td>
                <td>${log.details}</td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des logs:', error);
        showNotification('Erreur lors du chargement des logs', 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadLogs);