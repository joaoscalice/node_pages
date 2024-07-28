const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { check, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
const PORT = 3000;

// Configurar o mecanismo de template Handlebars
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 60000 }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Middleware para verificar se o usuário está logado
function checkAuth(req, res, next) {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Rota para login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login',
  [
    check('username').notEmpty().withMessage('É necessário preencher um usuário'),
    check('password').notEmpty().withMessage('É necessário preencher uma senha')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('login', { errors: errors.array() });
    }

    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
      req.session.loggedIn = true;
      res.redirect('/admin');
    } else {
      res.render('login', { errors: [{ msg: 'Credenciais inválidas!' }] });
    }
  }
);  

// Rota para logout
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.redirect('/admin');
    }
    res.redirect('/login');
  });
});

// Rota para a página de administração
app.get('/admin', checkAuth, (req, res) => {
  res.render('admin');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}`);
});