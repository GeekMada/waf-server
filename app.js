require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeClam = require('clamscan');
const fs = require('fs').promises;
const fsExtra = require('fs-extra');
const crypto = require('crypto');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bodyParser = require('body-parser');

const execPromise = util.promisify(exec);

const app = express();
const port = process.env.PORT || 4989;
app.use(express.static(PUBLIC_HTML_DIR));

app.use(bodyParser.json());

// Endpoint à la racine pour rediriger vers index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_HTML_DIR, 'index.html'));
});

// Configuration spécifique
const DOMAIN = process.env.DOMAIN;
const PUBLIC_HTML_DIR = process.env.PUBLIC_HTML_DIR;
const BACKUP_DIR = process.env.BACKUP_DIR;
const DB_PATH = path.join(__dirname, process.env.DB_PATH);
const QUARANTINE_DIR = process.env.QUARANTINE_DIR;

// Configuration des API
const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const VIRUSTOTAL_API = 'https://www.virustotal.com/vtapi/v2/file/report';
const ABUSEIPDB_API_KEY = process.env.ABUSEIPDB_API_KEY;
const ABUSEIPDB_API = 'https://api.abuseipdb.com/api/v2/check';

// Gestion des limites des API
const API_LIMITS = {
  virustotal: { daily: 500, perDay: 100, count: 0 },
  abuseipdb: { daily: 500, perDay: 100, count: 0 }
};

const resetTime = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

// Système de blocage d'IP
const blockedIPs = new Set();

// Middleware pour bloquer les IP
function ipBlockMiddleware(req, res, next) {
  const clientIP = req.ip;
  if (blockedIPs.has(clientIP)) {
    res.status(403).send('Accès refusé : Votre IP est bloquée.');
  } else {
    next();
  }
}

// Appliquer le middleware de blocage d'IP à toutes les routes
app.use(ipBlockMiddleware);

// Initialisation de la base de données
let db;

async function initDatabase() {
  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_type TEXT,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS blocked_ips (
      ip TEXT PRIMARY KEY,
      blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Charger les IP bloquées depuis la base de données
  const blockedIPsFromDB = await db.all('SELECT ip FROM blocked_ips');
  blockedIPsFromDB.forEach(row => blockedIPs.add(row.ip));
}

// Fonction pour ajouter un log
async function addLog(eventType, details) {
  await db.run('INSERT INTO logs (event_type, details) VALUES (?, ?)', [eventType, JSON.stringify(details)]);
}

// Fonction pour bloquer une IP
async function blockIP(ip) {
  if (!blockedIPs.has(ip)) {
    blockedIPs.add(ip);
    await db.run('INSERT OR IGNORE INTO blocked_ips (ip) VALUES (?)', [ip]);
    await addLog('IP_BLOCKED', { ip });
  }
}

// Fonction pour débloquer une IP
async function unblockIP(ip) {
  if (blockedIPs.has(ip)) {
    blockedIPs.delete(ip);
    await db.run('DELETE FROM blocked_ips WHERE ip = ?', [ip]);
    await addLog('IP_UNBLOCKED', { ip });
  }
}

// Fonction pour vérifier un fichier avec VirusTotal
async function checkFileWithVirusTotal(fileHash) {
  if (API_LIMITS.virustotal.count >= API_LIMITS.virustotal.perDay) {
    await addLog('API_LIMIT_REACHED', { api: 'VirusTotal' });
    return null;
  }

  try {
    API_LIMITS.virustotal.count++;
    const response = await axios.get(VIRUSTOTAL_API, {
      params: {
        apikey: VIRUSTOTAL_API_KEY,
        resource: fileHash
      }
    });
    await addLog('VIRUSTOTAL_CHECK', { fileHash, result: response.data });
    return response.data;
  } catch (error) {
    await addLog('VIRUSTOTAL_ERROR', { fileHash, error: error.message });
    return null;
  }
}

// Fonction pour vérifier une IP avec AbuseIPDB
async function checkIPWithAbuseIPDB(ip) {
  if (API_LIMITS.abuseipdb.count >= API_LIMITS.abuseipdb.perDay) {
    await addLog('API_LIMIT_REACHED', { api: 'AbuseIPDB' });
    return null;
  }

  try {
    API_LIMITS.abuseipdb.count++;
    const response = await axios.get(ABUSEIPDB_API, {
      params: { ipAddress: ip },
      headers: { 'Key': ABUSEIPDB_API_KEY }
    });
    await addLog('ABUSEIPDB_CHECK', { ip, result: response.data });
    
    if (response.data.data.abuseConfidenceScore > 80) {
      await blockIP(ip);
    }
    
    return response.data;
  } catch (error) {
    await addLog('ABUSEIPDB_ERROR', { ip, error: error.message });
    return null;
  }
}

// Fonction pour calculer le hash SHA-256 d'un fichier
async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Initialisation de ClamAV
let clamscan;
(async () => {
  try {
    clamscan = await new NodeClam().init({
      clamdscan: {
        path: '/usr/bin/clamdscan',
        configFile: '/etc/clamav/clamd.conf',
        multiscan: true,
        reloadDb: false,
      },
      preference: 'clamdscan',
    });
    await addLog('CLAMAV_INIT', { status: 'success' });
  } catch (error) {
    await addLog('CLAMAV_INIT_ERROR', { error: error.message });
  }
})();

// Fonction pour scanner récursivement un répertoire
async function scanDirectory(directory) {
  try {
    const { isInfected, file, viruses } = await clamscan.scanDir(directory);
    if (isInfected) {
      for (const infectedFile of file) {
        await handleInfectedFile(infectedFile, viruses[infectedFile]);
      }
    }
    await addLog('DIRECTORY_SCAN_COMPLETE', { directory, isInfected });
    return { isInfected, infectedFiles: file, viruses };
  } catch (error) {
    await addLog('DIRECTORY_SCAN_ERROR', { directory, error: error.message });
    throw error;
  }
}

// Fonction pour gérer un fichier infecté
async function handleInfectedFile(filePath, virusName) {
  try {
    const quarantineFilePath = path.join(QUARANTINE_DIR, path.basename(filePath));
    await fsExtra.move(filePath, quarantineFilePath);
    await addLog('FILE_QUARANTINED', { filePath, quarantineFilePath, virusName });
  } catch (error) {
    await addLog('FILE_QUARANTINE_ERROR', { filePath, error: error.message });
    throw error;
  }
}

// Fonction pour effectuer une sauvegarde incrémentielle
async function incrementalBackup(sourceDir, backupDir, interval) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup_${interval}_${timestamp}`);

  try {
    await fsExtra.ensureDir(backupPath);
    const latestBackup = await getLatestBackup(backupDir, interval);
    const linkDest = latestBackup ? `--link-dest=${latestBackup}` : '';
    
    const command = `rsync -av --delete ${linkDest} ${sourceDir}/ ${backupPath}/`;
    await execPromise(command);

    await addLog('BACKUP_COMPLETE', { interval, backupPath });
    return { success: true, backupPath };
  } catch (error) {
    await addLog('BACKUP_ERROR', { interval, error: error.message });
    throw error;
  }
}

// Fonction pour obtenir le chemin de la dernière sauvegarde
async function getLatestBackup(backupDir, interval) {
  try {
    const files = await fs.readdir(backupDir);
    const backups = files.filter(file => file.startsWith(`backup_${interval}_`));
    if (backups.length === 0) return null;
    
    backups.sort().reverse();
    return path.join(backupDir, backups[0]);
  } catch (error) {
    await addLog('GET_LATEST_BACKUP_ERROR', { interval, error: error.message });
    return null;
  }
}

// Fonction pour nettoyer périodiquement les anciennes sauvegardes
async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const now = new Date();
    for (const file of files) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60 * 24); // âge en jours

      if (file.startsWith('backup_6h_') && fileAge > 7) {
        await fs.unlink(filePath);
        await addLog('OLD_BACKUP_DELETED', { filePath });
      } else if (file.startsWith('backup_24h_') && fileAge > 30) {
        await fs.unlink(filePath);
        await addLog('OLD_BACKUP_DELETED', { filePath });
      }
    }
  } catch (error) {
    await addLog('BACKUP_CLEANUP_ERROR', { error: error.message });
  }
}

// Endpoints

// Lancer un scan manuel
app.post('/scan', async (req, res) => {
  try {
    const result = await scanDirectory(PUBLIC_HTML_DIR);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lancer une sauvegarde manuelle
app.post('/backup', async (req, res) => {
  const { interval } = req.body;
  if (interval !== '6h' && interval !== '24h') {
    return res.status(400).json({ error: 'Intervalle invalide. Utilisez "6h" ou "24h".' });
  }
  try {
    const result = await incrementalBackup(PUBLIC_HTML_DIR, BACKUP_DIR, interval);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les logs
app.get('/logs', async (req, res) => {
  try {
    const logs = await db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir la liste des fichiers en quarantaine
app.get('/quarantine', async (req, res) => {
  try {
    const files = await fs.readdir(QUARANTINE_DIR);
    res.json(files);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supprimer un fichier de la quarantaine
app.delete('/quarantine/:filename', async (req, res) => {
  const filePath = path.join(QUARANTINE_DIR, req.params.filename);
  try {
    await fs.unlink(filePath);
    await addLog('FILE_DELETED_FROM_QUARANTINE', { filePath });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restaurer un fichier de la quarantaine
app.post('/quarantine/:filename/restore', async (req, res) => {
  const quarantineFilePath = path.join(QUARANTINE_DIR, req.params.filename);
  const restoreFilePath = path.join(PUBLIC_HTML_DIR, req.params.filename);
  try {
    await fsExtra.move(quarantineFilePath, restoreFilePath);
    await addLog('FILE_RESTORED_FROM_QUARANTINE', { quarantineFilePath, restoreFilePath });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir la liste des IP bloquées
app.get('/blocked-ips', async (req, res) => {
  try {
    const blockedIPsList = Array.from(blockedIPs);
    res.json(blockedIPsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bloquer manuellement une IP
app.post('/block-ip', async (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'Adresse IP manquante' });
  }
  try {
    await blockIP(ip);
    res.json({ success: true, message: `IP ${ip} bloquée` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Débloquer manuellement une IP
app.post('/unblock-ip', async (req, res) => {
  const { ip } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'Adresse IP manquante' });
  }
  try {
    await unblockIP(ip);
    res.json({ success: true, message: `IP ${ip} débloquée` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les statistiques
app.get('/stats', async (req, res) => {
    try {
      const totalScans = await db.get('SELECT COUNT(*) as count FROM logs WHERE event_type = "DIRECTORY_SCAN_COMPLETE"');
      const totalInfectedFiles = await db.get('SELECT COUNT(*) as count FROM logs WHERE event_type = "FILE_QUARANTINED"');
      const totalBlockedIPs = blockedIPs.size;
      const lastScanLog = await db.get('SELECT timestamp FROM logs WHERE event_type = "DIRECTORY_SCAN_COMPLETE" ORDER BY timestamp DESC LIMIT 1');
  
      res.json({
        totalScans: totalScans.count,
        totalInfectedFiles: totalInfectedFiles.count,
        totalBlockedIPs,
        lastScan: lastScanLog ? lastScanLog.timestamp : null
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Endpoint pour vérifier manuellement une IP
  app.post('/check-ip', async (req, res) => {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ error: 'Adresse IP manquante' });
    }
    try {
      const result = await checkIPWithAbuseIPDB(ip);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Endpoint pour obtenir la configuration
  app.get('/config', (req, res) => {
    res.json({
      DOMAIN,
      PUBLIC_HTML_DIR,
      BACKUP_DIR,
      QUARANTINE_DIR,
      PORT: port
    });
  });
  
  // Endpoint pour mettre à jour la configuration
  app.post('/config', async (req, res) => {
    const { DOMAIN, PUBLIC_HTML_DIR, BACKUP_DIR, QUARANTINE_DIR, PORT } = req.body;
    
    // Vérification des permissions (à implémenter selon vos besoins de sécurité)
    // if (!userHasAdminPermissions(req)) {
    //   return res.status(403).json({ error: 'Permission denied' });
    // }
  
    try {
      // Mise à jour du fichier .env
      let envContent = await fs.readFile('.env', 'utf8');
      envContent = envContent.replace(/^DOMAIN=.*$/m, `DOMAIN=${DOMAIN}`);
      envContent = envContent.replace(/^PUBLIC_HTML_DIR=.*$/m, `PUBLIC_HTML_DIR=${PUBLIC_HTML_DIR}`);
      envContent = envContent.replace(/^BACKUP_DIR=.*$/m, `BACKUP_DIR=${BACKUP_DIR}`);
      envContent = envContent.replace(/^QUARANTINE_DIR=.*$/m, `QUARANTINE_DIR=${QUARANTINE_DIR}`);
      envContent = envContent.replace(/^PORT=.*$/m, `PORT=${PORT}`);
  
      await fs.writeFile('.env', envContent);
  
      // Recharger les variables d'environnement
      require('dotenv').config();
  
      res.json({ message: 'Configuration mise à jour avec succès. Redémarrez le serveur pour appliquer les changements.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Gestion des erreurs globales
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Une erreur est survenue !');
  });
  
  // Initialisation et démarrage du serveur
  (async () => {
    await initDatabase();
    await fsExtra.ensureDir(QUARANTINE_DIR);
  
    // Scan initial
    await scanDirectory(PUBLIC_HTML_DIR);
    await addLog('INITIAL_SCAN_COMPLETE', {});
  
    // Planifier un scan quotidien
    setInterval(async () => {
      await scanDirectory(PUBLIC_HTML_DIR);
      await addLog('DAILY_SCAN_COMPLETE', {});
    }, 24 * 60 * 60 * 1000);
  
    // Planifier les sauvegardes incrémentielles
    setInterval(async () => {
      await incrementalBackup(PUBLIC_HTML_DIR, BACKUP_DIR, '6h');
    }, 6 * 60 * 60 * 1000);
  
    setInterval(async () => {
      await incrementalBackup(PUBLIC_HTML_DIR, BACKUP_DIR, '24h');
    }, 24 * 60 * 60 * 1000);
  
    // Planifier le nettoyage des anciennes sauvegardes
    setInterval(cleanupOldBackups, 24 * 60 * 60 * 1000); // Une fois par jour
  
    // Réinitialiser les compteurs d'API quotidiennement
    setInterval(() => {
      API_LIMITS.virustotal.count = 0;
      API_LIMITS.abuseipdb.count = 0;
    }, resetTime);
  
    app.listen(port, () => {
      console.log(`WAF en écoute sur le port ${port} pour ${DOMAIN}`);
    });
  })();
  
  // Gestion de l'arrêt gracieux du serveur
  process.on('SIGTERM', async () => {
    console.log('SIGTERM reçu. Arrêt gracieux du serveur...');
    await db.close();
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('SIGINT reçu. Arrêt gracieux du serveur...');
    await db.close();
    process.exit(0);
  });