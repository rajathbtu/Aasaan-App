import admin from 'firebase-admin';

let initialized = false;

export function getFirebaseAdmin() {
  if (!initialized) {
    // Prefer GOOGLE_APPLICATION_CREDENTIALS on the env, else base64 service account JSON
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (b64) {
      const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
      admin.initializeApp({ credential: admin.credential.cert(json) });
    } else if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
    initialized = true;
  }
  return admin;
}

export default getFirebaseAdmin();
