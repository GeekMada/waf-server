# Serveur WAF (Web Application Firewall)

Ce projet implémente un serveur WAF (Web Application Firewall) avec des fonctionnalités avancées de sécurité et de gestion pour la protection des sites web.

## Fonctionnalités principales

- Scan antivirus avec ClamAV
- Sauvegardes incrémentielles automatiques
- Vérification des fichiers avec VirusTotal
- Vérification des adresses IP avec AbuseIPDB
- Système de mise en quarantaine des fichiers infectés
- Gestion des IP bloquées
- Journalisation des événements
- API RESTful pour la gestion et le monitoring

## Prérequis

- Node.js
- ClamAV
- SQLite
- Accès aux API VirusTotal et AbuseIPDB

## Installation

1. Clonez ce dépôt
2. Installez les dépendances : `npm install`
3. Configurez les variables d'environnement dans un fichier `.env`
4. Lancez le serveur : `node server.js`

## Configuration

Créez un fichier `.env` à la racine du projet avec les variables suivantes :

```
DOMAIN=votre-domaine.com
PUBLIC_HTML_DIR=/chemin/vers/public_html
BACKUP_DIR=/chemin/vers/backups
QUARANTINE_DIR=/chemin/vers/quarantine
DB_PATH=waf.db
PORT=4989
VIRUSTOTAL_API_KEY=votre_clé_api_virustotal
ABUSEIPDB_API_KEY=votre_clé_api_abuseipdb
```

## API Endpoints

- `POST /scan` : Lance un scan manuel
- `POST /backup` : Lance une sauvegarde manuelle
- `GET /logs` : Obtient les logs récents
- `GET /quarantine` : Liste les fichiers en quarantaine
- `DELETE /quarantine/:filename` : Supprime un fichier de la quarantaine
- `POST /quarantine/:filename/restore` : Restaure un fichier de la quarantaine
- `GET /blocked-ips` : Liste les IP bloquées
- `POST /block-ip` : Bloque manuellement une IP
- `POST /unblock-ip` : Débloque manuellement une IP
- `GET /stats` : Obtient les statistiques du serveur
- `POST /check-ip` : Vérifie manuellement une IP
- `GET /config` : Obtient la configuration actuelle
- `POST /config` : Met à jour la configuration

## Fonctionnement

- Le serveur effectue un scan initial au démarrage
- Des scans quotidiens sont programmés automatiquement
- Les sauvegardes incrémentielles sont effectuées toutes les 6 heures et 24 heures
- Le nettoyage des anciennes sauvegardes est effectué quotidiennement
- Les compteurs d'utilisation des API sont réinitialisés quotidiennement

## Sécurité

- Assurez-vous de sécuriser l'accès à l'API du serveur
- Utilisez HTTPS pour toutes les communications
- Gardez vos clés API confidentielles

## Contribution

Les contributions sont les bienvenues. Veuillez ouvrir une issue pour discuter des changements majeurs avant de soumettre un pull request.

## Licence

[MIT](https://choosealicense.com/licenses/mit/)