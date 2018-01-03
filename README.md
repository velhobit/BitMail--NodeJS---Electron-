# BitMail - Bulk Mailmarketing Electron Aplication

[![N|Solid](https://velhobit.com.br/wp-content/themes/vale/images/logo-velho-bit.jpg)](https://nodesource.com/products/nsolid)

BitMail is a project made on NodeJS/Electron to send bulk mailmarketing. Its was created by my desire to learn NodeJS.

Read a little bit about on my Linkedin:
https://www.linkedin.com/in/rodrigoportillo/
MyPortfolio:
https://portillodesign.myportfolio.com/
or contact me: rodrigo@portillodesign.com.br

# Building
Some of requiriments are needed to build this application:

  - NodeJS (of course)
  - Electron
  - Nodemailer
  - N-readlines

```sh
npm install electron --save-dev --save-exact
```
```sh
npm install nodemailer
```
```sh
npm install n-readlines
```

To build project, run:
```sh
npx electron .
```
ALL PROJECT AND COMMENTS ARE AVAILABLE IN ENGLISH

Caso você saiba ler em Português, acesse para informações mais completas: https://velhobit.com.br/desenvolvimento/bitmail-projeto-de-envio-de-mailmarketing-em-lote.html


# How to use

To send mails, just configure your mail as you wish. You can use HTML tags on Message Field (program are available in Portuguese and English):

![N|Solid](https://velhobit.com.br/wp-content/uploads/2018/01/tela-inicial-bulk-bit-mail.jpg)

You set your host as CUSTOM, please use ADVANCED PANEL area to configure your Host Addres, Port, Secure and how much e-mails you will send per hour.

## Template
If you want to create your own template, just create a folder in default template folder inside project.
This folder must have two files: index.html and thumb.png

![N|Solid](https://velhobit.com.br/wp-content/uploads/2018/01/exemplo_template.jpg)

Once you created your own template folder and files, just rebuild (or reopen) project and you can use them.

> You can use {name} and {message} tags if you want it to be replaced by current datas.

### Tech
* [node.js] - evented I/O for the backend
* [jQuery] - duh

### FAQ

**I having problems with GMAIL / G SUIT. What should I do?**
> Just set your Gmail to allow unsafe applications login (on Security Settings)

**My own host not working. Just send but I cant receive mail. Whats the problem?**
> I don't know what exactly causing it with some servers. I think it's a problem when you try to send e-mails on random IP. Try to use no-ip service or similar. Maybe if you disable SPF you should be allow to send mails. I'm still solving this.



License
----

MIT


**Free Software, Hell Yeah!**