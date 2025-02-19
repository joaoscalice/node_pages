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

// Página inicial do site
app.get('/', (req, res) => {
  fs.readdir(path.join(__dirname, 'pages'), (err, files) => {
    if (err) {
      return res.status(500).send('Sem páginas para carregar!');
    }

    const pages = files.map(file => {
      const name = path.basename(file, '.txt');
      return { url: `/page/${name}`, name };
    });

    res.render('index', { pages });
  });
});

// Visualizador das páginas criadas
app.get('/page/:name', (req, res) => {
  const pagePath = path.join(__dirname, 'pages', `${req.params.name}.txt`);
  fs.readFile(pagePath, 'utf8', (err, content) => {
    if (err) {
      return res.status(404).send('Página não foi encontrada');
    }
    res.render('page', { content });
  });
});

// Rota para criar uma nova página
app.get('/admin/create', checkAuth, (req, res) => {
  res.render('create');
});

app.post('/admin/create', checkAuth, [
  check('url').notEmpty().withMessage('É necessário preencher o campo de URL'),
  check('content').notEmpty().withMessage('É necessário preencher o campo de Conteúdo')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('create', { errors: errors.array() });
  }

  const { url, content } = req.body;
  const pagePath = path.join(__dirname, 'pages', `${url}.txt`);
  
  fs.writeFile(pagePath, content, err => {
    if (err) {
      return res.status(500).send('Erro na criação da página');
    }
    res.redirect('/admin');
  });
});

// Rota para editar uma página
app.get('/admin/edit/:name', checkAuth, (req, res) => {
  const pagePath = path.join(__dirname, 'pages', `${req.params.name}.txt`);
  fs.readFile(pagePath, 'utf8', (err, content) => {
    if (err) {
      return res.status(404).send('Página não foi encontrada');
    }
    res.render('edit', { url: req.params.name, content });
  });
});

app.post('/admin/edit/:name', checkAuth, [
  check('content').notEmpty().withMessage('É necesssário possuir um Conteúdo')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).render('edit', { errors: errors.array(), url: req.params.name, content: req.body.content });
  }

  const { content } = req.body;
  const pagePath = path.join(__dirname, 'pages', `${req.params.name}.txt`);
  
  fs.writeFile(pagePath, content, err => {
    if (err) {
      return res.status(500).send('Erro ao editar a página');
    }
    res.redirect('/admin');
  });
});

// Rota para excluir uma página
app.get('/admin/delete/:name', checkAuth, (req, res) => {
  const pagePath = path.join(__dirname, 'pages', `${req.params.name}.txt`);
  fs.unlink(pagePath, err => {
    if (err) {
      return res.status(500).send('Erro ao deletar a página');
    }
    res.redirect('/admin');
  });
});

// Rota para a página de informações
app.get('/info', (req, res) => {
  res.render('info');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}`);
});