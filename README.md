# deepdetector setup guide

this guide helps you get your deepdetector web app running locally.

---

## prerequisites

make sure you have the following installed:

* node.js (v18 or newer)
* npm (comes with node.js)

---

## installation

### 1. install dependencies

```bash
npm install express multer sqlite3 crypto
```

---

## project structure

```
deepdetector/
│
├── server.js
├── package.json
├── public/
│   ├── index.html
│   ├── scanner.html
│   ├── vault.html
│   ├── style.css
│   └── cache/
└── db/
    └── hashbank.db
```

---

## database setup

the database will automatically initialize the first time you run the server.

if needed manually:

```bash
mkdir db
sqlite3 db/hashbank.db < schema.sql
```

---

## run the app

```bash
node server.js
```

then open your browser and visit:
[http://localhost:3000](http://localhost:3000)

---

## development commands

restart automatically on code changes (optional):

```bash
npm install -g nodemon
nodemon server.js
```

---

## build notes

* uploaded images are stored in `/public/cache/`
* hash data and file paths are stored in `db/hashbank.db`

