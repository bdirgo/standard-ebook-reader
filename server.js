const express = require('express');
const request = require('request');

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.use(express.static('public'))

app.get('/g/cache/epub/:id/:file', (req, res) => {
    var id = req.params.id;
    var file = req.params.file;
    request(
        { url: `https://www.gutenberg.org/cache/epub/${id}/${file}` },
        (error, response, body) => {
        if (error || response.statusCode !== 200) {
            return res.status(500).json({ type: 'error', message: err.message });
        }
        console.log(response)
        console.log(response.caseless.dict['content-type'])
        res.header('Content-Type', 'application/epub+zip')
        res.send(body);
        }
    )
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));