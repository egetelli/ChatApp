# 💬 Modern Real-Time Chat Application

This project is a high-performance, scalable **real-time messaging application** built using modern web technologies. It enables users to have private conversations, create groups, share media, make video/audio calls, and receive instant notifications.

---

## 🚀 About the Project

This application is built on the lightweight and high-performance architecture of **.NET Minimal APIs** and **SignalR** on the backend.

On the frontend, it delivers a modern and responsive user interface powered by **Angular**’s robust component structure and **TailwindCSS**’s flexible styling capabilities.

Database operations are managed using **Entity Framework Core** with a Code-First approach.

---

## ✨ Core Features

### 🔌 Real-Time Communication

* **SignalR Integration:** Messages, notifications, and status updates (online/offline) are delivered instantly.
* **Live Status Tracking:** Real-time user presence indicators and “typing...” notifications.

### 👥 Private & Group Chat

* **Private Messaging:** Secure one-to-one conversations between users.
* **Group Management:** Create groups, add/remove members.
* **Role Management:** Assign group administrators (admin privileges).

### 📁 Media & File Sharing

* **Image & File Uploads:** Share images and documents within chats.
* **Image Preview:** Elegant in-chat image rendering.
* **Profile Management:** Upload profile pictures with automatic avatar support (UI Avatars).

### 🛠 UI & User Experience

* **Responsive Design:** Seamless experience across all devices using TailwindCSS.
* **Infinite Scroll:** Efficient message history loading with a “Load More” feature.
* **Modern Components:** Angular Material dialogs, snackbars, icons, and custom Tailwind components.

### 🎥 Video & Voice Calling

* **WebRTC Integration:** Low-latency, high-performance peer-to-peer video and voice communication.
* **SignalR Signaling:** Real-time transmission of Offer, Answer, and ICE Candidate data.
* **Call Management:** Initiate calls, receive incoming call notifications, and end calls.
* **WebSocket-Based Communication:** Ensures uninterrupted real-time connectivity.

---

## 🏗 Technology Stack

The project is built using industry-standard, modern technologies.

### 🔙 Backend (.NET Core)

* **Framework:** .NET 8
* **API Architecture:** Minimal APIs (lightweight and fast endpoint definitions)
* **Real-Time Communication:** SignalR (WebSockets), WebRTC
* **ORM:** Entity Framework Core
* **Database:** SQLite
* **Authentication:** JWT (JSON Web Token) Bearer Authentication
* **File Management:** Static File Hosting

### 🎨 Frontend (Angular)

* **Framework:** Angular 17+ (Standalone Components, Signals, Control Flow `@if`, `@for`)
* **Styling Library:** TailwindCSS
* **HTTP Requests:** Angular `HttpClient` & Interceptors
* **UI Components:** Angular Material (Dialog, Snackbar, Icon)
* **Reactive Programming:** RxJS

---

## 📂 Project Setup

Follow the steps below to run the project locally.

---

### 🔧 Prerequisites

* [.NET 8 SDK](https://dotnet.microsoft.com/download)
* [Node.js](https://nodejs.org/) (LTS version recommended)
* [SQLite](https://sqlite.org/download.html) (or LocalDB)

---

### 1️⃣ Backend Setup

```bash
# Navigate to the Backend folder
cd API

# Restore dependencies
dotnet restore

# Update the ConnectionString in appsettings.json according to your database.

# Create the database (Migration)
dotnet ef database update

# Run the application
dotnet run
# The API will run at http://localhost:5000
```

---

### 2️⃣ Frontend Setup

```bash
# Navigate to the Frontend folder
cd Client

# Install dependencies
npm install

# Start the application
ng serve
# The app will run at http://localhost:4200
```

---

## 📷 Screenshots

| Chat Screen     | Group Management |
| --------------- | ---------------- |
| *(Coming Soon)* | *(Coming Soon)*  |

---

## 🔧 Configuration

### Database Connection

Add the `SQLite` configuration in `API/program.cs`:

```csharp
builder.Services.AddDbContext<AppDbContext>(x => 
    x.UseSqlite("Data Source=chat.db"));
```

### JWT Settings

Ensure that the `TokenKey` value in `appsettings.json` is set to a secure and strong secret key for token generation.

---

## 🤝 Contributing

1. Fork the repository.
2. Create a new feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m 'Add new feature'`).
4. Push your branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License.
