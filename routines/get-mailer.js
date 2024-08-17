const nodemailer = require('nodemailer');
module.exports = {
    getMailer() {
        const cfg = {
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT || 587,
            // secure: true,
            tls: {
                rejectUnauthorized: false,
                servername: 'mta.lou.network'
            },
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            } 
        };
        const mailer = nodemailer.createTransport(cfg);
        return mailer;
    } 
}