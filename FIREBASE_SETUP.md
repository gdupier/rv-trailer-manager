# Firebase setup for RV Manager cloud sync

This walkthrough creates a Firebase project so your phones and tablets can share encrypted trip data. The app never sends plaintext checklists to Firebase — only an encrypted blob.

**Time:** about 10 minutes  
**Cost:** free (Firebase Spark plan)

---

## Step 1 — Create a Firebase project

1. Open [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with Google.
2. Click **Create a project** (or **Add project**).
3. Name it something like `rv-trailer-manager`.
4. **Google Analytics** — optional; you can turn it off for a personal app.
5. Click **Create project** and wait for it to finish.

---

## Step 2 — Create a Realtime Database

1. In the left sidebar, click **Build → Realtime Database**.
2. Click **Create Database**.
3. Choose a region close to you (e.g. `us-central1`).
4. When asked about security rules, choose **Start in test mode** for now — you will replace the rules in Step 4.
5. Click **Enable**.

You will see a database URL like:

```text
https://rv-trailer-manager-default-rtdb.firebaseio.com
```

Copy that URL — you need it in Step 5.

---

## Step 3 — Allow your app to use the database (no login required)

RV Manager uses a **household passphrase**, not Firebase user accounts. The database is protected by:

- A 256-bit lookup token derived from your passphrase (unguessable)
- AES encryption of all data before upload
- Security rules that only allow access to valid token paths

For the web app to read/write, you need the **database URL** only. No API keys with special restrictions are required for the REST API when rules are set correctly.

> **Note:** Firebase may show a `google-services` config for mobile apps — you can ignore that. This PWA uses the Realtime Database REST API directly.

---

## Step 4 — Paste security rules

1. In **Realtime Database**, open the **Rules** tab.
2. Replace everything with the contents of `firebase-database.rules.json` in this project:

```json
{
  "rules": {
    "sync": {
      "$token": {
        ".read": "$token.matches(/^[a-f0-9]{64}$/)",
        ".write": "$token.matches(/^[a-f0-9]{64}$/)",
        ".validate": "newData.hasChildren(['ciphertext', 'iv', 'revision', 'updatedAt']) && newData.child('ciphertext').isString() && newData.child('iv').isString() && newData.child('revision').isNumber() && newData.child('updatedAt').isNumber()"
      }
    }
  }
}
```

3. Click **Publish**.

These rules mean:
- Data lives only under `/sync/{64-character-hex-token}/`
- Random paths cannot be read or written
- Each record must have encrypted payload fields

---

## Step 5 — Configure the app

1. Open `firebase-config.js` in this project folder.
2. Set your values:

```js
window.RV_FIREBASE = {
  enabled: true,
  databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
};
```

Replace `YOUR_PROJECT_ID` with your actual project ID from the database URL.

3. Save the file.
4. Serve the app over HTTP (not `file://`) and reload:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

If you use GitHub Pages, commit `firebase-config.js` with `enabled: true` and your URL, then push to deploy.

---

## Step 6 — Enable sync on your first device

1. Open the app → **Data** tab.
2. Under **Cloud sync**, enter a **household passphrase** (at least 8 characters).
3. Use something you and your spouse can remember but others cannot guess.
4. Leave **Remember on this device** checked (needed for automatic background sync).
5. Tap **Enable cloud sync**.

The first device uploads your local data (encrypted).

---

## Step 7 — Join sync on your spouse's device (and other devices)

1. Install/open the same app (same URL or home-screen PWA).
2. Make sure `firebase-config.js` is configured the same way (`enabled: true`, same `databaseURL`).
3. Go to **Data → Cloud sync**.
4. Enter the **exact same passphrase**.
5. Tap **Enable cloud sync**.

The second device downloads and merges your household data. From then on, changes sync automatically when online (every few seconds after edits, and when you reopen the app).

---

## How to verify it works

1. On device A, start a trip and check off a few items.
2. Wait a few seconds (or tap **Sync now** on the Data tab).
3. On device B, open the app or tap **Sync now**.
4. The same trip and checkmarks should appear.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Firebase is not configured" | Set `enabled: true` and a real `databaseURL` in `firebase-config.js`, then hard-refresh |
| "Could not reach sync server" | Check internet; confirm database URL is correct |
| "Upload failed (401)" | Republish security rules from Step 4 |
| Devices show different data | Tap **Sync now** on both; confirm **same passphrase** on both |
| Old service worker cache | Hard refresh, or clear site data once after updating |

---

## Security notes

- **Passphrase is the household key.** Anyone with the passphrase can decrypt your data. Choose a strong one.
- **Do not use a weak passphrase** like `password123` — the lookup token could be brute-forced over time.
- **Export backups** occasionally from the Data tab — still a good idea if you change phones.
- Firebase staff cannot read your checklist content (encrypted client-side).

---

## Turning sync off

On any device: **Data → Turn off cloud sync**. That only disables sync on that device; the encrypted cloud copy remains until you delete the Firebase project.

To wipe cloud data: in Firebase Console → Realtime Database → delete the `sync` node.
