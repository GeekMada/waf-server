# Serveur WAF (Web Application Firewall)

Ce projet implémente un serveur WAF (Web Application Firewall) avec des fonctionnalités avancées de sécurité et de gestion pour la protection des sites web.

## Avis important sur l'utilisation et la licence

**Ce code n'est pas gratuit pour tout usage. Toute utilisation de ce code nécessite une autorisation préalable et est soumise à des frais.**

Pour obtenir l'autorisation d'utiliser ce code ou pour discuter des conditions d'utilisation, veuillez contacter l'auteur :

- Nom: Aheshman Itibar
- Email: contact@iamarketings.fr
- Site web: https://iamarketings.fr
- WhatsApp: +269325193231

Toute utilisation non autorisée de ce code est strictement interdite et peut entraîner des poursuites légales.

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
4. Lancez le serveur : `node app.js`

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

Les contributions sont les bienvenues, mais doivent être approuvées par l'auteur. Veuillez ouvrir une issue pour discuter des changements majeurs avant de soumettre un pull request.

## Licence

Ce projet est sous licence propriétaire. L'utilisation, la modification, la distribution ou la reproduction de ce code, en tout ou en partie, nécessite une autorisation écrite explicite de l'auteur, Aheshman Itibar.

© 2024 Aheshman Itibar. Tous droits réservés.

