

# Stonklytics — Dev Setup & Auth

## Prerequisites

* **Python** 3.10+
* **Node** 18+ (or 20+) & **npm**
* **Git**
* (Optional) **Docker**

## Repo Layout

```
stonklytics/
├─ backend/           # Django API (DRF/CORS)
│  ├─ manage.py
│  └─ requirements.txt
└─ frontend/          # Vite + React app
   ├─ src/
   ├─ package.json
   └─ vite.config.js
```


## 1) Clone

```bash
git clone https://github.com/yuktakul04/stonklytics.git
cd stonklytics
```


## 2) Backend (Django)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -U pip
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Backend runs at: **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

> If you change ports, update the frontend API base URL accordingly (see `frontend/src/api.js` if used).


## 3) Frontend (Vite + React)

Open a new terminal:

```bash
cd stonklytics/frontend
npm install
npm run dev
```

Frontend runs at: **[http://localhost:5173](http://localhost:5173)**


## 4) Firebase Auth (already wired)

We use **Firebase Email/Password** for login & signup.

### Configure (only needed the first time)

1. Go to **Firebase Console → Project settings → General → Your apps → Web app**.
2. Copy the Web config and paste into:

   * `frontend/src/firebase.ts`
3. Ensure **Authentication → Sign-in method → Email/Password** is **Enabled**.
4. Restart the frontend dev server after edits.

**firebase.ts (example structure)**

```ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIza...yourkey...",
  authDomain: "yourproject.firebaseapp.com",
  projectId: "yourproject",
  storageBucket: "yourproject.appspot.com", // <- must end with .appspot.com
  messagingSenderId: "###########",
  appId: "1:###########:web:xxxxxxxxxxxx",
  // measurementId optional
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

**Where it’s used**

* `frontend/src/pages/Signup.jsx` → `createUserWithEmailAndPassword`
* `frontend/src/pages/Login.jsx`  → `signInWithEmailAndPassword`


## 5) Typical Dev Flow

* Start **backend**: `cd backend && source .venv/bin/activate && python manage.py runserver`
* Start **frontend**: `cd frontend && npm run dev`
* Open **[http://localhost:5173](http://localhost:5173)** → Sign up → Log in


## 6) Troubleshooting

**npm version issues / clean install**

```bash
cd frontend
rm -rf node_modules
npm install
```

**Firebase “api-key-not-valid”**

* Use the exact Web config for this project.
* In Google Cloud Console → **APIs & Services → Credentials → API key**
  If restricted, add referrers:

  * `http://localhost:5173/*`
  * `http://127.0.0.1:5173/*`
* Ensure **Identity Toolkit API** is enabled.

**CORS between frontend (5173) and backend (8000)**

* If calling Django APIs from the browser, make sure `django-cors-headers` is configured to allow `http://localhost:5173`.


## 7) Branch & PR (team convention)

```bash
# from repo root
git checkout -b feat/<short-name>
# make changes
git add <files>
git commit -m "feat: <what you did>"
git push -u origin feat/<short-name>
# open PR → request review from teammates/TA
```


## 8) Environment / Secrets

* **Python venv** is local-only (`backend/.venv/`) — do **not** commit.
* Do not commit private Firebase keys from service accounts. The **web config** in `firebase.ts` is OK to commit for client auth.


## 9) What’s Done vs Next

* ✅ Login & Signup with Firebase Auth (Email/Password)
* ✅ Local run instructions (this README)
* ⏭️ Next (as needed by team):

  * Protect routes (redirect if not logged in)
  * Connect Django API with Firebase tokens (server-side verify)
  * Data sources / DB pipeline


## 10) Quick Commands (copy/paste)

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

