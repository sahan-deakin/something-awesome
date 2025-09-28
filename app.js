const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize SQLite Database
const db = new sqlite3.Database('users.db');

// Create users table
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Simple session management
const sessions = new Map();

// Simple chatbot responses
const chatbotResponses = {
  'hello': 'Hello! How can I help you today?',
  'hi': 'Hi there! What can I do for you?',
  'location': 'We are located at 123 Main St, Anytown, Melborne.',
  'business time': 'Our business hours are Monday to Friday, 9 AM to 5 PM.',
  'help': 'I can help you with basic information. Try asking me about what I can do, or say hello!',
  'contact': 'You can contact us at 0123-456-789 or email us at abc@gmail.com.',
  'bye': 'Goodbye! Feel free to chat again if you need help.',
  'thank you': 'You\'re welcome! Is there anything else I can help with?',
  'default': 'I\'m not sure I understand. Can you try asking differently? I can help with basic questions and conversations.'
};

// Function to get chatbot response
function getChatbotResponse(message) {
  const lowerMessage = message.toLowerCase().trim();
  
  for (const [key, response] of Object.entries(chatbotResponses)) {
    if (lowerMessage.includes(key)) {
      return response;
    }
  }
  
  return chatbotResponses.default;
}

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  
  if (sessionId && sessions.has(sessionId)) {
    req.user = sessions.get(sessionId);
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
app.get('/', (req, res) => {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  const user = sessionId ? sessions.get(sessionId) : null;

  res.render('index', { 
    title: 'Hello World',
    message: 'Welcome to Express with EJS!',
    user: user
  });
});

// Login routes
app.get('/login', (req, res) => {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  const user = sessionId ? sessions.get(sessionId) : null;
  
  if (user) {
    return res.redirect('/');
  }
  
  res.render('login', { 
    title: 'Login',
    user: null,
    error: null 
  });
});

app.get('/register', (req, res) => {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  const user = sessionId ? sessions.get(sessionId) : null;
  
  if (user) {
    return res.redirect('/');
  }
  
  res.render('register', { 
    title: 'Register',
    user: null,
    error: null 
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) {
      return res.render('login', { 
        title: 'Login',
        user: null,
        error: 'Database error occurred' 
      });
    }
    
    if (!user) {
      return res.render('login', { 
        title: 'Login',
        user: null,
        error: 'Invalid username or password' 
      });
    }
    
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.render('login', { 
          title: 'Login',
          user: null,
          error: 'Invalid username or password' 
        });
      }
      
      // Create session
      const sessionId = Math.random().toString(36).substring(2);
      sessions.set(sessionId, { id: user.id, username: user.username, email: user.email });
      
      res.cookie('sessionId', sessionId, { httpOnly: true });
      res.redirect('/');
    });
  });
});

app.post('/register', (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  // Basic validation
  if (password !== confirmPassword) {
    return res.render('register', { 
      title: 'Register',
      user: null,
      error: 'Passwords do not match' 
    });
  }
  
  if (password.length < 6) {
    return res.render('register', { 
      title: 'Register',
      user: null,
      error: 'Password must be at least 6 characters long' 
    });
  }
  
  // Check if user already exists
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
    if (err) {
      return res.render('register', { 
        title: 'Register',
        user: null,
        error: 'Database error occurred' 
      });
    }
    
    if (existingUser) {
      return res.render('register', { 
        title: 'Register',
        user: null,
        error: 'Username or email already exists' 
      });
    }
    
    // Hash password and create user
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        return res.render('register', { 
          title: 'Register',
          user: null,
          error: 'Error creating user' 
        });
      }
      
      db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
        [username, email, hashedPassword], 
        function(err) {
          if (err) {
            return res.render('register', { 
              title: 'Register',
              user: null,
              error: 'Error creating user' 
            });
          }
          
          res.redirect('/login');
        });
    });
  });
});

app.post('/logout', (req, res) => {
  const sessionId = req.headers.cookie?.split('sessionId=')[1]?.split(';')[0];
  
  if (sessionId) {
    sessions.delete(sessionId);
  }
  
  res.clearCookie('sessionId');
  res.redirect('/');
});

// Chatbot API endpoint
app.post('/chat', (req, res) => {
  const userMessage = req.body.message;
  const botResponse = getChatbotResponse(userMessage);
  
  res.json({ response: botResponse });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});