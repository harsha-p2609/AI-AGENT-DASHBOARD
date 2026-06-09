# APEX Dashboard: AI Productivity Engine

APEX Dashboard is an interactive developer workspace and productivity portal. It integrates live weather tracking, technology news search, GitHub profile feeds, and a database-backed task manager, all supported by an autonomous **APEX Assistant AI Engine**.

---

## LIVE

https://ai-agent-dashboard-ruby.vercel.app/

> **Note:** The hosted version may take some time to respond on the first request because the backend is deployed on a free-tier Render instance, which can go into sleep mode after inactivity. For faster and more reliable testing, please run the application locally.


## 🛠️ Technology Stack

* **Frontend:** React (Vite), Tailwind CSS (Vanilla styling overrides), Lucide React (Icons)
* **Backend:** Spring Boot 3.4.2 (Java 21), Hibernate JPA, Server-Sent Events (SSE) Emitter
* **Database:** PostgreSQL (Relation schema with automatic schema updates)
* **AI Engine:** OpenAI Chat Completions API with Function Calling & custom fallback simulated mock engine

---

## 🌟 Key Features

1. **APEX Assistant AI Engine:**
   * Interactive floating chat panel supporting real-time streaming answers.
   * Autonomous tool execution: the agent can look up the weather, search tech news, list commits, or create/update/delete your checklist tasks.
   * **Reasoning Console:** Displays live execution steps, showing parameters and returns of executed APIs.
2. **Weather Widget:** Live conditions, humidity, and wind tracking with in-widget location updates.
3. **GitHub Widget:** Tabbed interface displaying repositories (main language, star counts) and recent event feeds (commits, PRs).
4. **Tech News Feed:** Responsive keyword search to fetch and display thumbnail-curated tech articles.
5. **Task Manager:** Persisted checklists with status categories (ALL, PENDING, COMPLETED) and priority indicators (LOW, MEDIUM, HIGH).

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Java Development Kit (JDK) 21** or higher.
* **Node.js** (v18+ recommended) and **npm**.
* **PostgreSQL** running locally on port `5432`.

---

### 🗄️ Database Setup
1. Open PostgreSQL and create a database named `productivity_dashboard`:
   ```sql
   CREATE DATABASE productivity_dashboard;
   ```
2. By default, the backend connects using:
   * **URL:** `jdbc:postgresql://localhost:5432/productivity_dashboard`
   * **Username:** `postgres`
   * **Password:** `saiharsha12`
   
   If you need to change these values, modify them in [application.properties](file:///d:/assingnment/backend/src/main/resources/application.properties).

---

### 🏁 Starting the Services

#### 1. Backend Server
Navigate to the `backend` folder and run the Gradle boot run task:
```powershell
cd backend
.\gradlew.bat bootRun
```
*The Spring Boot server will boot up on **http://localhost:8080**.*

#### 2. Frontend Development Server
Navigate to the `frontend` folder and start the Vite server. 
*Note: If PowerShell blocks execution policies, launch via npm.cmd:*
```powershell
cd frontend
npm.cmd run dev
```
*The React interface will start on **http://localhost:5173**.*

---

## ⚙️ Environment Configurations

The application supports additional external capabilities through environment variables defined in [application.properties](file:///d:/assingnment/backend/src/main/resources/application.properties):

* `OPENAI_API_KEY`: API key for real OpenAI chat completions. If empty, the dashboard defaults to the local simulated mock agent.
* `OPENWEATHER_API_KEY`: API key for actual weather fetches.
* `NEWS_API_KEY`: API key for real GNews/NewsAPI searches.
