
# ⚙️ JSON Editor & Viewer

A powerful and user-friendly web application to **view, edit, and manage JSON data dynamically**.  
Built using **React (Frontend)** and **Node.js (Backend)**.

---

## 🚀 Features

* Load and view JSON from the backend  
* Edit, add, or delete test sets, test cases, and steps  
* Save updated JSON directly to the backend (`data.json`)  
* Reset or clear data easily  
* Download the updated JSON file  
* Dark/Light theme toggle  
* Application Settings dialog for configuration  
* Clean and modern UI with responsive design  

---

## 🧱 Folder Structure

```

JSON-Editor/
│
├── Backend/
│   ├── server.js
│   ├── data.json
│   ├── package.json
│   ├── package-lock.json
│   └── node_modules/
│
├── Frontend/convert/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── ThemeToggle.js
│   │   ├── theme.css
│   │   └── components/
│   │       └── SettingsDialog.js
│   ├── package.json
│   ├── package-lock.json
│   ├── .gitignore
│   └── README.md
│
└── README.md  (this file)

````

---

## ⚙️ How to Run the Project

### 🖥️ Backend Setup

```bash
cd Backend
npm install
node server.js
````

### 💻 Frontend Setup

```bash
cd Frontend/convert
npm install
npm start
```

The frontend will run on **[http://localhost:3000](http://localhost:3000)**
The backend will run on **[http://localhost:5000](http://localhost:5000)**

---

## 🔗 API Endpoints

| Endpoint     | Method | Description                  |
| ------------ | ------ | ---------------------------- |
| `/api/data`  | GET    | Fetch JSON data from backend |
| `/api/data`  | POST   | Save updated JSON data       |
| `/api/reset` | POST   | Reset backend JSON to empty  |


---

## 🛠️ Tech Stack

**Frontend:** React.js, HTML, CSS, JavaScript
**Backend:** Node.js, Express.js
**Data Storage:** JSON (Local File)
**Other Tools:** CORS, FS, React Hooks

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

### 👨‍💻 Author

**Chirag Pandhare**
[GitHub Profile](https://github.com/chiragp2004)



