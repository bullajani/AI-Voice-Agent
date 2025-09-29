# VoiceAgent - AI-Powered Dispatcher Call System

A full-stack web application that enables dispatchers to make AI-powered voice calls to drivers with real-time transcription and data management.

## 🚀 Features

- **AI Voice Calls**: Integration with Retell AI for natural voice conversations
- **Real-time Transcription**: Live transcript display during calls
- **Custom Driver Data**: Input driver names, load numbers, and phone numbers
- **Database Storage**: MongoDB integration for call records and transcripts
- **Responsive UI**: Modern React frontend with clean design
- **Call Management**: Start/end calls with proper state management

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Retell AI API** for voice calling
- **CORS** enabled for cross-origin requests

### Frontend
- **React.js** with modern hooks
- **Retell WebClient SDK** for browser calls
- **CSS3** with responsive design
- **Real-time updates** with WebSocket-like functionality

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB
- Retell AI API key and Agent ID

### Backend Setup
```bash
cd backendAgent
npm install
```

Create `.env` file in `backendAgent` folder:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
RETELL_API_KEY=your_retell_api_key
RETELL_AGENT_ID=your_agent_id
```

### Frontend Setup
```bash
cd webcall
npm install
```

## 🚀 Usage

1. **Start Backend**:
   ```bash
   cd backendAgent
   node index.js
   ```

2. **Start Frontend**:
   ```bash
   cd webcall
   npm start
   ```

3. **Open Browser**: Navigate to `http://localhost:3000` (or the port shown)

4. **Make Calls**:
   - Enter driver name, load number, and phone number
   - Click "Start Call" to begin AI conversation
   - View real-time transcript
   - Click "End Call" to finish and save data

## 📁 Project Structure

```
VoiceAgent/
├── backendAgent/          # Express.js backend
│   ├── index.js          # Main server file
│   ├── package.json      # Backend dependencies
│   └── .env             # Environment variables (not in repo)
├── webcall/              # React frontend
│   ├── src/
│   │   ├── call.jsx     # Main call component
│   │   └── call.css     # Styling
│   └── package.json     # Frontend dependencies
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables
- `MONGODB_URI`: MongoDB connection string
- `RETELL_API_KEY`: Your Retell AI API key
- `RETELL_AGENT_ID`: Your Retell AI agent ID
- `PORT`: Backend server port (default: 3000)

### Retell AI Setup
1. Sign up at [Retell AI](https://retellai.com)
2. Create an agent and get the Agent ID
3. Get your API key from the dashboard
4. Configure your agent with dispatcher prompts

## 🎯 API Endpoints

- `POST /api/create-web-call` - Create and start a new call
- `POST /api/save-transcript` - Save transcript during call
- `POST /api/end-call` - End call and save final data
- `GET /api/get-transcript/:id` - Retrieve call transcript

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact [your-email@example.com] or create an issue in this repository.