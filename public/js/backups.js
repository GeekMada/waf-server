async function runBackup(interval) {
    try {
        document.getElementById('backup-status').textContent = 'Sauvegarde en cours...';
        const result = await fetchAPI('/backup', 'POST', { interval });
        document.getElementById('backup-status').textContent = `Sauvegarde ${interval} terminée`;
        showNotification(`Sauvegarde ${interval} effectuée avec succès`, 'success');
        loadBackupHistory();
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
        document.getElementById('backup-status').textContent = 'Erreur lors de la sauvegarde';
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}

async function loadBackupHistory() {
    try {
        const history = await fetchAPI('/backup-history');
        const list = document.getElementById('backup-list');
        list.innerHTML = '';
        history.forEach(backup => {
            const li = document.createElement('li');
            li.textContent = `${backup.date} - ${backup.type} - ${backup.status}`;
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique des sauvegardes:', error);
        showNotification('Erreur lors du chargement de l\'historique des sauvegardes', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('backup-6h').addEventListener('click', () => runBackup('6h'));
    document.getElementById('backup-24h').addEventListener('click', () => runBackup('24h'));
    loadBackupHistory();
});