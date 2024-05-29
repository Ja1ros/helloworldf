// routes/facturaRoutes.js
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const uuidv4 = require('uuid').v4;
//const json_books = fs.readFileSync('facturas.json', 'utf-8');
//let fac = JSON.parse(json_facturas);
const router = express.Router();

// Configuración de multer para guardar archivos temporalmente en el servidor
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nombre único basado en la fecha actual
  }
});

const upload = multer({ storage: storage });

// Leer facturas desde el archivo JSON
const getFacturas = () => {
  const data = fs.readFileSync('facturas.json', 'utf-8');
  return JSON.parse(data);
};

// Guardar facturas en el archivo JSON
const saveFacturas = (facturas) => {
  const data = JSON.stringify(facturas, null, 2);
  fs.writeFileSync('facturas.json', data, 'utf-8');
};

// let facturas = [];

// Ruta para la página principal
router.get('/', (req, res) => {
  const facturas = getFacturas();
  res.render('index', { facturas });
});

// Ruta para la página de nueva factura
router.get('/new-factura', (req, res) => {
  res.render('new-factura');
});

// Ruta para agregar una nueva factura
router.post('/new-factura', upload.single('file'), (req, res) => {
  const { title, date, category } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const formData = new FormData();
  formData.append('image', fs.createReadStream(req.file.path));

  axios.post(`https://api.imgbb.com/1/upload?key=9103cd401262a525c6357ce8d96bd838`, formData, {
    headers: {
      ...formData.getHeaders()
    }
  })
    .then(response => {
      // Borra el archivo del servidor después de subirlo a Imgbb
      fs.unlinkSync(req.file.path);

      const newFactura = {
        id: uuidv4(),
        title,
        date,
        category,
        imageUrl: response.data.data.url
      };
      const facturas = getFacturas();
      facturas.push(newFactura);
      saveFacturas(facturas);

      res.redirect('/');
    })
    .catch(error => {
      console.error('Error uploading to Imgbb', error);

      // Borra el archivo del servidor si falla la subida a Imgbb
      fs.unlinkSync(req.file.path);

      res.status(500).json({ message: 'Error uploading to Imgbb' });
    });
});

// Ruta para buscar facturas
router.get('/search', (req, res) => {
  const query = req.query.q;
  const facturas = getFacturas();
  const filteredFacturas = facturas.filter(factura => factura.title.includes(query));
  res.render('index', { facturas: filteredFacturas });
});

module.exports = router;
