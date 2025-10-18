# VoiceAgent Backend - MVC Architecture

## 🚀 Overview

A modern Express.js backend for the VoiceAgent application, built with **MVC (Model-View-Controller)** architecture for better code organization, maintainability, and scalability.

## 📁 Project Structure

```
backendAgent/
├── controllers/         # Request handlers and business logic
│   └── callController.js
├── models/             # Database models and schemas
│   └── Call.js
├── routes/             # API route definitions
│   ├── callRoutes.js
│   └── index.js
├── services/           # Business logic and external API integrations
│   ├── callService.js
│   └── retellService.js
├── config/             # Configuration files
│   └── database.js
├── server.js           # Main application entry point
├── index.js           # Legacy server file (kept for backup)
├── package.json
├── .env.example       # Environment variables template
└── README.md
```

## 🔧 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start the Server**
   ```bash
   npm start    # Production
   npm run dev  # Development
   ```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Call Management
- `POST /api/calls/create-web-call` - Create new web call
- `POST /api/calls/save-transcript` - Save call transcript
- `POST /api/calls/end-call` - End active call
- `GET /api/calls/:id` - Get specific call details
- `GET /api/calls` - Get recent calls (with limit query)
- `GET /api/calls/stats/summary` - Get call statistics

## 🏗️ Architecture Components

### Models
- **Call.js**: MongoDB schema and methods for call data management

### Controllers
- **callController.js**: HTTP request handlers for call-related operations

### Services
- **callService.js**: Business logic for call operations and database interactions
- **retellService.js**: Retell AI API integration and communication

### Routes
- **callRoutes.js**: Call-specific route definitions
- **index.js**: Main API router with consolidated routes

### Configuration
- **database.js**: MongoDB connection management and configuration

## 🔐 Environment Variables

```env
PORT=8080
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/voiceagent
RETELL_API_KEY=your_retell_api_key_here
RETELL_AGENT_ID=your_retell_agent_id_here
```

## 📊 Features

- **MVC Architecture**: Clean separation of concerns
- **MongoDB Integration**: Mongoose ODM with schemas and validation
- **Retell AI Integration**: Voice agent API communication
- **Error Handling**: Comprehensive error management
- **Request Logging**: Detailed request/response logging
- **Graceful Shutdown**: Proper connection cleanup
- **CORS Support**: Frontend integration ready
- **Health Monitoring**: API status endpoints

## 🚀 Usage Examples

### Create Web Call
```javascript
POST /api/calls/create-web-call
{
  "driverName": "John Doe",
  "phoneNumber": "+1234567890",
  "loadNumber": "LOAD123"
}
```

### Save Transcript
```javascript
POST /api/calls/save-transcript
{
  "callSid": "call_id_here",
  "text": "Hello, this is the conversation text",
  "role": "agent"
}
```

### End Call
```javascript
POST /api/calls/end-call
{
  "callSid": "call_id_here"
}
```

## 🔄 Migration from Legacy

The original `index.js` file has been refactored into the MVC structure:

- **Before**: Monolithic server file with all logic mixed
- **After**: Organized MVC architecture with separated concerns

To run the legacy version: `npm run legacy`

## 🛠️ Development

### Adding New Features

1. **Model**: Define data structure in `models/`
2. **Service**: Implement business logic in `services/`
3. **Controller**: Handle HTTP requests in `controllers/`
4. **Routes**: Define API endpoints in `routes/`

### Testing

```bash
# Test server health
curl http://localhost:8080/api/health

# Test call creation
curl -X POST http://localhost:8080/api/calls/create-web-call \
  -H "Content-Type: application/json" \
  -d '{"driverName":"Test","phoneNumber":"123","loadNumber":"LOAD1"}'
```

## 📝 Logging

The server provides detailed logging for:
- Request/Response tracking
- Database operations
- Error handling
- Connection status
- Performance monitoring

## 🎯 Benefits of MVC Architecture

- **Maintainability**: Easier to update and modify code
- **Scalability**: Simple to add new features and endpoints
- **Testability**: Isolated components for better testing
- **Reusability**: Services can be shared across controllers
- **Organization**: Clear structure for team development

## 🤝 Contributing

1. Follow the MVC pattern for new features
2. Add proper error handling
3. Include logging for debugging
4. Update documentation for API changes
5. Test all endpoints before committing

---

**Built with ❤️ using Express.js, MongoDB, and MVC Architecture**