# Virtual Agents Company (Agent Company)

[![React 19](https://img.shields.io/badge/React-19.0.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg)](https://tailwindcss.com/)
[![Anthropic Claude](https://img.shields.io/badge/Anthropic_Claude-3.5_Sonnet-orange.svg)](https://www.anthropic.com/)
[![Skills Catalog](https://img.shields.io/badge/Claude_Skills-388_Integrated-purple.svg)](https://github.com/alirezarezvani/claude-skills)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

An enterprise-grade autonomous AI organization platform operating specialized, human-like virtual coworkers. Powered by **4-layer memory scopes**, **hierarchical multi-agent delegation**, **391 business & engineering skills with Python CLI execution**, **stock-photo agent portraits**, and a **hybrid Cloud / Local LLM inference engine** (Anthropic Claude, OpenAI, Ollama, Hugging Face, OmniRoute).

---

## Table of Contents

- [Overview](#overview)
- [Core Features & Capabilities](#core-features--capabilities)
  - [1. Hierarchical Multi-Agent Orchestration](#1-hierarchical-multi-agent-orchestration)
  - [2. 4-Layer Memory Architecture](#2-4-layer-memory-architecture)
  - [3. 391 Integrated Enterprise Skills & CLI Execution Engine](#3-391-integrated-enterprise-skills--cli-execution-engine)
  - [4. Stock Portrait Picker](#4-stock-portrait-picker)
  - [5. Hybrid Cloud & Local LLM Provider Support](#5-hybrid-cloud--local-llm-provider-support)
  - [6. Workstreams, Kanban & Artifact Production](#6-workstreams-kanban--artifact-production)
- [Default Virtual Executive Team](#default-virtual-executive-team)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started & Local Deployment](#getting-started--local-deployment)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start Development Server](#4-start-development-server)
  - [5. Production Build & Run](#5-production-build--run)
- [Environment Configuration Reference](#environment-configuration-reference)
- [Connecting Local LLMs (Ollama / OmniRoute / Hugging Face)](#connecting-local-llms-ollama--omniroute--hugging-face)
- [API Endpoints Reference](#api-endpoints-reference)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [License](#license)

---

## Overview

Traditional AI chats are single-turn, stateless, and disconnected from team workflows. **Virtual Agents Company** models an entire digital enterprise where autonomous agents have defined executive roles, reporting lines, distinct personalities, specialized skills, persistent memory, and real tools to execute tasks autonomously.

Whether you need a CTO to design microservice architectures, a CFO to model SaaS unit economics and runway, a VP of Operations to delegate cross-functional Kanban workflows, or a Security Architect to run automated vulnerability audits, each agent operates with context-aware intelligence.

---

## Core Features & Capabilities

### 1. Hierarchical Multi-Agent Orchestration
- **Organizational Chart & Reporting Lines**: Direct reports, managers, and leadership structures. Agents know their role, autonomy level (1–5), and who to escalate or delegate tasks to.
- **Autonomous Delegation**: When given complex tasks, leadership agents (e.g., Sarah, Chief of Staff) automatically decompose requests and route sub-tasks to specialized domain agents (e.g., Marcus for architecture, Daniel for finance, Emma for market analysis).
- **Agent Creation Wizard**: Step-by-step onboarding for new virtual coworkers—configure role, department, seniority, autonomy clearance, 9-dimensional personality sliders, portrait selection, and initial tool sets.
- **Agent Management & Deletion**: Update LLM parameters, reassign reporting lines, equip/unequip skills, or delete custom agents with persistent disk synchronization.

### 2. 4-Layer Memory Architecture
Each agent retains context across conversations using a 4-tier cognitive memory model:
1. **Episodic Memory**: Specific conversation transcripts, meeting summaries, task timelines, and recent multi-agent interactions.
2. **Semantic Memory**: Domain knowledge, technical documentation, company guidelines, and shared factual knowledge bases.
3. **Procedural Memory**: Standard Operating Procedures (SOPs), workflows, frameworks, and step-by-step methodologies.
4. **Core / Identity Memory**: Personality traits, behavioral boundaries, clearance levels, and demographic grounding.

### 3. 391 Integrated Enterprise Skills & CLI Execution Engine
Fully integrated catalog of **388 skills** from [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) alongside **3 core system tools**:
- **8 Business Domains + Core Tools**:
  - **Engineering & Architecture (146 tools)**: CI/CD automation, API design, Dockerization, security auditing, refactoring, TypeScript/Python tooling.
  - **Executive & Strategy (68 tools)**: CEO/CTO/CFO/COO advisors, corporate strategy, executive memos, runway modeling, board reporting.
  - **Marketing & Growth (61 tools)**: SEO audits, demand generation, copywriting, sales engineering, positioning frameworks.
  - **Operations & Productivity (40 tools)**: Project management, sprint planning, meeting synthesizers, markdown translators.
  - **Regulatory & Compliance (28 tools)**: ISO 27001, SOC2, GDPR, medical device regulations (MDR), risk registers.
  - **Product & Design (17 tools)**: RICE prioritization, PRD generation, UX research, landing page scaffolding.
  - **Research & Intelligence (15 tools)**: Deep paper review, patent analysis, competitor benchmarking.
  - **Finance & Commercial (13 tools)**: SaaS unit metrics, Quick Ratio calculators, cash flow forecasting, stock valuation.
  - **Core Built-in Tools (3 tools)**: Live Web Search (Google Search integration), Artifact & Document Generator, Multi-Agent Delegation Orchestrator.
- **Real Python CLI Script Execution**: Includes **254 zero-dependency Python scripts** executed directly on the host machine via `python3` stdlib with structured JSON outputs.
- **Interactive UI Filtering**: Quick-filter pills by domain, real-time keyword search, and equipped quick-strips with `⚡ CLI Script` indicators.

### 4. Stock Portrait Picker
- **40 Stock Photos**: Choose from 20 female and 20 male portrait options in the creation wizard and existing agent profiles. The non-binary selection offers all 40 photos without assigning gender identities to their subjects.
- **Simple Identity Form**: Enter an agent name, select gender, and choose a portrait. Age, nationality/heritage, archetypes, and synthesis prompts are no longer required or collected by the wizard.
- **Custom Image URL**: Use your own HTTP(S) image URL instead of a stock photo.
- **No Image Generation**: Portraits do not call AI providers. Image-generation controls, routes, and image-model settings have been removed. OmniRoute remains available for agent chat.
- **Image Availability**: Stock photos load from Unsplash and require internet access. Unavailable gallery photos are disabled rather than silently replaced with duplicates.
- **Photo Rights**: Stock photos remain subject to the [Unsplash License](https://unsplash.com/license) and applicable third-party rights. Depicted people are not employees and do not endorse the agents.

### 5. Hybrid Cloud & Local LLM Provider Support
- **Cloud Models**: Native Anthropic Claude (`claude-3-5-sonnet`, `claude-3-7-sonnet`, `claude-3-5-haiku`) and OpenAI (`gpt-4o`, `gpt-4o-mini`) integration.
- **Local & Self-Hosted Providers**:
  - **Ollama**: Connect directly to `http://localhost:11434` to run Llama 3, Mistral, Qwen, DeepSeek, or CodeLlama locally with zero cloud API costs.
  - **OmniRoute / OpenAI-Compatible**: Route to local or remote multi-provider gateways (`http://localhost:20128/v1`).
  - **Hugging Face / vLLM / LocalAI**: Custom endpoint configuration in Admin Settings.
- **Per-Agent Model Assignment**: Different agents can run on different models (e.g. lightweight models for triage, reasoning models for architecture and financial analysis).

### 6. Workstreams, Kanban & Artifact Production
- **Kanban Board (Project Phoenix)**: Manage active deliverables with swimlanes for Backlog, In Progress, Review, and Done.
- **Interactive Artifacts Viewer**: Generates and renders rich artifacts inline and in full-page modals—including Product Requirement Documents (PRDs), TypeScript/Python code blocks, architecture diagrams, and financial spreadsheets.
- **Persistent Disk Storage**: Workspace state (agents, work items, projects, chat histories, artifacts, memories) auto-persists to `/data/` on disk and reloads on startup.

---

## Default Virtual Executive Team

| Agent | Role | Department | Default Skills |
| :--- | :--- | :--- | :--- |
| **Sarah** | Chief of Staff & VP Operations | Executive Leadership | CEO Advisor, COO Advisor, Delegation Orchestrator |
| **Marcus** | Principal Systems Architect | Engineering | Senior Architect, Security Auditor, CI/CD Pipeline Builder |
| **Emma** | VP Market Intelligence | Research & Intelligence | Web Search, Market Research, Stock Analysis, DeepRead |
| **Daniel** | Head of Financial Strategy | Finance & Commercial | SaaS Metrics Coach, Financial Analyst, CFO Advisor |
| **Ava** | Lead Experience Architect | Product & Design | Product Manager Toolkit, UX Researcher, Landing Page Generator |
| **James** | Principal Solutions Architect | Marketing & Growth | Sales Engineer, Technical Positioning, Enterprise Solutioning |

---

## Tech Stack

- **Frontend**:
  - [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
  - [Vite 6](https://vitejs.dev/)
  - [Tailwind CSS v4](https://tailwindcss.com/)
  - [Motion (Framer Motion)](https://motion.dev/)
  - [Lucide Icons](https://lucide.dev/)
- **Backend**:
  - [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
  - [tsx](https://github.com/privatenumber/tsx) (TypeScript execution)
  - [esbuild](https://esbuild.github.io/) (High-speed server bundling)
  - Anthropic & OpenAI API integrations
  - Native Node `child_process` for secure Python CLI execution
- **Execution & Storage**:
  - Python 3 (standard library CLI execution for 254 tools)
  - JSON flat-file storage engine located in `/data/`

---

## Project Structure

```text
Virtual-Agents-Company/
├── claude-skills/               # 388 Ingested Claude skills with docs and Python scripts
│   ├── engineering/             # Systems, cloud, DevOps, backend, security skills
│   ├── executive/               # C-suite leadership and strategic advisory skills
│   ├── finance/                 # SaaS metrics, valuation, cash flow models
│   ├── marketing/               # Growth, copywriting, SEO, demand gen skills
│   ├── operations/              # Agile, project tracking, synthesis tools
│   ├── product/                 # PRDs, UX research, wireframing tools
│   ├── regulatory/              # ISO, SOC2, GDPR, compliance audit tools
│   └── research/                # Deep reading, literature review, patent search
├── data/                        # Persistent server state (auto-created on startup)
│   ├── agents.json              # Active agent definitions & custom configurations
│   ├── projects.json            # Projects and Kanban work items
│   ├── memory.json              # 4-layer agent memories
│   └── artifacts.json           # Generated documents, PRDs, and code artifacts
├── public/                      # Static assets & icons
├── src/
│   ├── components/
│   │   ├── AdminSettingsView.tsx   # LLM provider settings (Anthropic, OpenAI, Ollama, OmniRoute)
│   │   ├── AgentDirectoryView.tsx  # Agent cards, status filters, and search
│   │   ├── AgentProfileModal.tsx   # Agent fine-tuning, Avatar Studio, Tool equipping
│   │   ├── AgentWizardModal.tsx    # Step-by-step new agent onboarding wizard
│   │   ├── ChatPanel.tsx           # Multi-agent chat interface & tool invocation
│   │   ├── OrgChartView.tsx        # Visual hierarchy & reporting structure tree
│   │   ├── TasksView.tsx           # Project Phoenix Kanban board
│   │   └── ArtifactsView.tsx       # Document and code artifact viewer
│   ├── data/
│   │   ├── claudeSkills.json       # Indexed 388 Claude skills catalog metadata
│   │   ├── initialData.ts          # Core agents, default tools, and initial state
│   │   └── initialWorkItems.ts     # Initial Kanban work items
│   ├── lib/
│   │   ├── avatarCatalog.ts        # 40 stock portraits and shared display fallbacks
│   │   └── models.ts               # Model registry (Anthropic, OpenAI, Ollama, Hugging Face)
│   ├── types.ts                    # TypeScript definitions for agents, tools, memory
│   ├── App.tsx                     # Main layout & navigation container
│   └── main.tsx                    # React application entry point
├── .env.example                 # Example environment variables template
├── index.html                   # HTML entry point
├── package.json                 # Project dependencies and npm scripts
├── server.ts                    # Express API server, orchestrator, and tool runner
├── tsconfig.json                # TypeScript compiler configuration
└── vite.config.ts               # Vite bundler and Tailwind configuration
```

---

## Getting Started & Local Deployment

### Prerequisites
Make sure the following tools are installed on your machine:
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm** (comes with Node) or **bun**
- **Python 3**: Python 3.8+ (required for executing the 254 CLI skill scripts)
- *(Optional)* **Ollama**: If you wish to run open-source LLMs 100% locally.

### 1. Clone Repository
```bash
git clone https://github.com/theochan/Virtual-Agents-Company.git
cd Virtual-Agents-Company
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

Open `.env` and configure your keys:
```env
# Required for Anthropic Claude models:
ANTHROPIC_API_KEY="your_anthropic_api_key_here"

# Optional for OpenAI models:
OPENAI_API_KEY="your_openai_api_key_here"

# Application URL (default for local development):
APP_URL="http://localhost:3001"

# Optional: Local / Multi-Provider AI Gateway (e.g., OmniRoute / vLLM):
OMNIROUTE_ENDPOINT="http://localhost:20128/v1"
OMNIROUTE_API_KEY="your_omniroute_key"
```

> **Note**: You can get an API key from [Anthropic Console](https://console.anthropic.com/) or [OpenAI Platform](https://platform.openai.com/). If you run only local models via Ollama, you can leave API keys blank and configure Ollama in the Admin Settings UI.

### 4. Start Development Server
```bash
npm run dev
```
The server will start at:
```text
http://localhost:3001
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

### 5. Production Build & Run
To test or deploy the optimized production bundle:
```bash
# Build frontend with Vite and server with esbuild
npm run build

# Start the compiled production server
npm run start
```

---

## Environment Configuration Reference

| Variable | Required | Description | Default |
| :--- | :---: | :--- | :--- |
| `ANTHROPIC_API_KEY` | Optional* | API key for Anthropic Claude models (`claude-3-5-sonnet`, `claude-3-7-sonnet`, `claude-3-5-haiku`) | None |
| `OPENAI_API_KEY` | Optional* | API key for OpenAI models (`gpt-4o`, `gpt-4o-mini`) | None |
| `APP_URL` | Yes | Host URL for API endpoints and asset resolution | `http://localhost:3001` |
| `PORT` | Optional | Port on which the Express server listens | `3001` |
| `OMNIROUTE_ENDPOINT`| Optional | Base URL for OpenAI-compatible gateway | `http://localhost:20128/v1`|
| `OMNIROUTE_API_KEY` | Optional | Bearer authentication token for gateway | None |

*\*Required if you plan to use Anthropic Claude or OpenAI cloud models. Not required if running strictly with local Ollama models.*

---

## Connecting Local LLMs (Ollama / OmniRoute / Hugging Face)

To run agents entirely on local hardware without sending data to external APIs:

1. **Install and Run Ollama**:
   ```bash
   ollama run llama3.2
   ```
   Ensure Ollama is running at `http://localhost:11434`.
2. **Open Admin Settings**:
   - In the Virtual Agents Company UI, click the **Settings / LLM Config** tab in the sidebar navigation.
   - Under **Local & Self-Hosted Providers**, select **Ollama**.
   - Confirm the endpoint URL (`http://localhost:11434`).
   - Click **Test Connection & Discover Models**—the UI will scan your local Ollama library and populate available models (`llama3.2`, `mistral`, `deepseek-r1`, etc.).
3. **Assign to Agents**:
   - Open any agent's profile (e.g., Marcus).
   - Go to the **LLM & Model Parameters** tab.
   - Switch the provider to **Ollama** and select your desired local model.

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/agents` | List all active agents, configurations, and equipped skills |
| `POST` | `/api/agents` | Create a new agent |
| `DELETE`| `/api/agents/:id` | Delete an agent and reassign reporting lines |
| `PATCH`| `/api/agents/:id/llm` | Update agent LLM parameters (model, temperature, tokens) |
| `PATCH`| `/api/agents/:id/tools` | Update equipped tools and skills for an agent |
| `PATCH`| `/api/agents/:id/avatar`| Save new avatar URL to agent profile |
| `GET` | `/api/tools` | Fetch all 391 available tools & Claude skills catalog |
| `POST` | `/api/tools/execute` | Execute an equipped Python CLI skill script |
| `GET` | `/api/projects` | List projects and active Kanban work items |
| `POST` | `/api/projects` | Create a new project or work item |
| `DELETE`| `/api/projects/:id` | Delete a project or task |
| `POST` | `/api/chat` | Send a message to an agent or orchestrator |
| `GET` | `/api/artifacts` | List all generated documents, PRDs, and code artifacts |
| `GET` | `/api/memory` | Query 4-layer cognitive memory stores |

---

## Troubleshooting & FAQ

#### 1. How do I choose an agent portrait?
Select a stock photo in the creation wizard or the agent profile. Female and male selections each have 20 choices; non-binary agents can use any of the 40. You can also enter a custom image URL. No AI provider, age, nationality, or synthesis prompt is needed. Existing agents retain their saved portraits and legacy identity data until explicitly changed.

If a stock photo cannot load, check internet access to `images.unsplash.com` or choose another photo. The image-generation endpoints and `OMNIROUTE_IMAGE_MODEL` setting are no longer used; old `data/portrait-settings.json` files can be discarded.

#### 2. How do Python CLI tools run?
- The backend uses Node.js `child_process.execFile` calling `python3`. Make sure `python3` is available on your system `PATH`.
- The CLI scripts located under `claude-skills/**/scripts/*.py` use standard library modules only (`sys`, `json`, `math`, `re`, `datetime`), meaning no additional `pip install` packages are required.

#### 3. Where is application state stored?
- All state is persisted to the local `/data/` directory (`/data/agents.json`, `/data/projects.json`, `/data/memory.json`, `/data/artifacts.json`).
- If you wish to reset the application to its default initial state, you can delete the `/data/` directory and restart the server (`npm run dev`).

#### 4. Can I add my own custom skills?
- Yes! You can either:
  1. Click **+ Add Custom Tool** in the Tools tab of any agent profile modal.
  2. Add a new skill folder with a `SKILL.md` and optional `scripts/*.py` inside `claude-skills/`.

---

## License

The original project code in this version is proprietary. See [LICENSE](LICENSE) for the reservation of rights and the requirement for separate written permission to use, modify, redistribute, host, or sell it. This repository is not offered under an open-source license.

This notice applies only to code owned by the project copyright holder. It does not revoke rights validly granted for earlier versions or override third-party licenses. The bundled `claude-skills/` materials retain their own licenses and copyright notices, including the [upstream MIT notice](claude-skills/LICENSE); dependencies and stock photos retain their respective terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
