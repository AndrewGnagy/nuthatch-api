const nodemailer = require('nodemailer');
require('dotenv').config();

function sendKeyEmail(apiKey, email) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'lastelmsoft@gmail.com',
      pass: process.env.APP_PW,
    },
  });

  transporter.sendMail({
    from: '"LastElm Admin" <lastelmsoft@gmail.com>', // sender address
    to: email, // list of receivers
    subject: "Your Nuthatch API Key", // Subject line
    text: "API Key: " + apiKey, // plain text body
    html: "<h2>API Key below</h2><h3>" + apiKey + "</h3><p>Place this in the API-Key header for your http request</p><h3>Let us know what you build!</h3><p>We'd love to feature some fun projects on our home page. Send us a link!</p><h3>Having trouble?</h3><p> Feel free to reach out with questions by replying to this email.</p>", // html body
  }).then(info => {
    console.log({info});
  }).catch(console.error);
}

module.exports = { sendKeyEmail };