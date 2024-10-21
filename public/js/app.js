// Fonction pour effectuer des requêtes API
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

// Fonction pour mettre à jour les statistiques
async function updateStats() {
    try {
        const stats = await fetchAPI('/stats');
        document.getElementById('total-scans').textContent = stats.totalScans;
        document.getElementById('infected-files').textContent = stats.totalInfectedFiles;
        document.getElementById('blocked-ips-count').textContent = stats.totalBlockedIPs;
        document.getElementById('system-status').textContent = stats.totalInfectedFiles > 0 ? 'Menaces détectées' : 'Sécurisé';
        document.getElementById('system-status').className = `status-text ${stats.totalInfectedFiles > 0 ? 'danger' : 'safe'}`;
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

// Fonction pour charger les logs
async function loadLogs() {
    try {
        const logs = await fetchAPI('/logs');
        const logList = document.getElementById('log-list');
        logList.innerHTML = '';
        logs.forEach(log => {
            const li = document.createElement('li');
            li.textContent = `${log.timestamp}: ${log.event_type} - ${log.details}`;
            logList.appendChild(li);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des logs:', error);
    }
}

// Fonction pour charger les fichiers en quarantaine
async function loadQuarantine() {
    try {
        const files = await fetchAPI('/quarantine');
        const quarantineList = document.getElementById('quarantine-list');
        quarantineList.innerHTML = '';
        files.forEach(file => {
            const li = document.createElement('li');
            li.textContent = file;
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Supprimer';
            deleteButton.onclick = () => deleteQuarantineFile(file);
            const restoreButton = document.createElement('button');
            restoreButton.textContent = 'Restaurer';
            restoreButton.onclick = () => restoreQuarantineFile(file);
            li.appendChild(deleteButton);
            li.appendChild(restoreButton);
            quarantineList.appendChild(li);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des fichiers en quarantaine:', error);
    }
}

// Fonction pour supprimer un fichier de la quarantaine
async function deleteQuarantineFile(filename) {
    try {
        await fetchAPI(`/quarantine/${filename}`, 'DELETE');
        loadQuarantine();
    } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
    }
}

// Fonction pour restaurer un fichier de la quarantaine
async function restoreQuarantineFile(filename) {
    try {
        await fetchAPI(`/quarantine/${filename}/restore`, 'POST');
        loadQuarantine();
    } catch (error) {
        console.error('Erreur lors de la restauration du fichier:', error);
    }
}

// Fonction pour charger les IP bloquées
async function loadBlockedIPs() {
    try {
        const ips = await fetchAPI('/blocked-ips');
        const ipList = document.getElementById('blocked-ips-list');
        ipList.innerHTML = '';
        ips.forEach(ip => {
            const li = document.createElement('li');
            li.textContent = ip;
            const unblockButton = document.createElement('button');
            unblockButton.textContent = 'Débloquer';
            unblockButton.onclick = () => unblockIP(ip);
            li.appendChild(unblockButton);
            ipList.appendChild(li);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des IP bloquées:', error);
    }
}

// Fonction pour bloquer une IP
async function blockIP(ip) {
    try {
        await fetchAPI('/block-ip', 'POST', { ip });
        loadBlockedIPs();
    } catch (error) {
        console.error('Erreur lors du blocage de l\'IP:', error);
    }
}

// Fonction pour débloquer une IP
async function unblockIP(ip) {
    try {
        await fetchAPI('/unblock-ip', 'POST', { ip });
        loadBlockedIPs();
    } catch (error) {
        console.error('Erreur lors du déblocage de l\'IP:', error);
    }
}

// Fonction pour vérifier une IP
async function checkIP(ip) {
    try {
        const result = await fetchAPI('/check-ip', 'POST', { ip });
        const resultDiv = document.getElementById('ip-check-result');
        resultDiv.textContent = `Résultat pour ${ip}: ${JSON.stringify(result)}`;
    } catch (error) {
        console.error('Erreur lors de la vérification de l\'IP:', error);
    }
}

// Fonction pour lancer une sauvegarde
async function runBackup(interval) {
    try {
        const result = await fetchAPI('/backup', 'POST', { interval });
        const statusDiv = document.getElementById('backup-status');
        statusDiv.textContent = `Sauvegarde ${interval} effectuée: ${result.backupPath}`;
    } catch (error) {
        console.error('Erreur lors de la sauvegarde:', error);
    }
}

// Fonction pour charger la configuration
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
    }
}

// Fonction pour mettre à jour la configuration
async function updateConfig(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const config = Object.fromEntries(formData);
    try {
        await fetchAPI('/config', 'POST', config);
        alert('Configuration mise à jour avec succès');
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la configuration:', error);
        alert('Erreur lors de la mise à jour de la configuration');
    }
}

// Fonction pour initialiser le graphique
function initChart() {
    const ctx = document.getElementById('threatChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
            datasets: [{
                label: 'Menaces détectées',
                data: [2, 1, 3, 0, 2, 1, 3],
                borderColor: '#e74c3c',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Gestion de la navigation
function showSection(sectionId) {
    document.querySelectorAll('main > section').forEach(section => {
        section.style.display = section.id === sectionId ? 'block' : 'none';
    });
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
    });
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    initChart();
    loadConfig();

    document.getElementById('scan-button').addEventListener('click', async () => {
        try {
            await fetchAPI('/scan', 'POST');
            alert('Scan lancé avec succès');
            updateStats();
        } catch (error) {
            console.error('Erreur lors du lancement du scan:', error);
            alert('Erreur lors du lancement du scan');
        }
    });

    document.getElementById('config-form').addEventListener('submit', updateConfig);

    document.getElementById('block-ip-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const ip = document.getElementById('ip-to-block').value;
        blockIP(ip);
    });

    document.getElementById('check-ip-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const ip = document.getElementById('ip-to-check').value;
        checkIP(ip);
    });

    document.getElementById('backup-6h').addEventListener('click', () => runBackup('6h'));
    document.getElementById('backup-24h').addEventListener('click', () => runBackup('24h'));

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const sectionId = event.target.getAttribute('href').substring(1);
            showSection(sectionId);
            if (sectionId === 'logs') loadLogs();
            if (sectionId === 'quarantine') loadQuarantine();
            if (sectionId === 'blocked-ips') loadBlockedIPs();
            if (sectionId === 'config') loadConfig();
        });
    });

    // Mettre à jour les stats toutes les 30 secondes
    setInterval(updateStats, 30000);
});