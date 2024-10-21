async function loadConfig() {
    try {
        const config = await fetchAPI('/config');
        document.getElementById('domain').value = config.DOMAIN;
        document.getElementById('public-html-dir').value = config.PUBLIC_HTML_DIR;
        document.getElementById('backup-dir').value = config.BACKUP_DIR;
        document.getElementById('quarantine-dir').value = config.QUARANTINE_DIR;
        document.getElementById('port').value = config.PORT;
    } catch (error) {
        console.error('Erreur lors du chargement de la configuration:', error);
        showNotification('Erreur lors du chargement de la configuration', 'error');
    }
}

async function updateConfig(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const config = Object.fromEntries(formData);
    try {
        await fetchAPI('/config', 'POST', config);
        showNotification('Configuration mise à jour avec succès', 'success');
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la configuration:', error);
        showNotification('Erreur lors de la mise à jour de la configuration', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    document.getElementById('config-form').addEventListener('submit', updateConfig);
});