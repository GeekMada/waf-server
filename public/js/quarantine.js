async function loadQuarantineFiles() {
    try {
        const files = await fetchAPI('/quarantine');
        const list = document.getElementById('quarantine-list');
        list.innerHTML = '';
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
            list.appendChild(li);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des fichiers en quarantaine:', error);
        showNotification('Erreur lors du chargement des fichiers en quarantaine', 'error');
    }
}

async function deleteQuarantineFile(filename) {
    try {
        await fetchAPI(`/quarantine/${filename}`, 'DELETE');
        showNotification(`Fichier ${filename} supprimé de la quarantaine`, 'success');
        loadQuarantineFiles();
    } catch (error) {
        console.error('Erreur lors de la suppression du fichier:', error);
        showNotification('Erreur lors de la suppression du fichier', 'error');
    }
}

async function restoreQuarantineFile(filename) {
    try {
        await fetchAPI(`/quarantine/${filename}/restore`, 'POST');
        showNotification(`Fichier ${filename} restauré`, 'success');
        loadQuarantineFiles();
    } catch (error) {
        console.error('Erreur lors de la restauration du fichier:', error);
        showNotification('Erreur lors de la restauration du fichier', 'error');
    }
}

document.addEventListener('DOMContentLoaded', loadQuarantineFiles);