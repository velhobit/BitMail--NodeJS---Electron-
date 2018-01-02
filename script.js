'use strict';
const nodemailer = require('nodemailer');
var remote = require('electron').remote; 
var lineByLine = require('n-readlines');
var dialog = remote.dialog; 
var fs = require('fs');

//Select Language
var lang = en_US;

//Send Details Global
var emailsList = [], countLines = 0, csvValidate = false, hasDKIM = false;
var templatePath = false, details, message, connect, logoPath = "", unsentFile = "./files/unsent/emails.csv", sentFile = "./files/sent/emails.csv", configTempFile = "./files/config/config_temp.txt", templatesDir = "./templates/";

//Connect Default
connect = {
    "port" : 465,
    "secure" : true,
    "host" : null
}

//Send a Mail
function sendMail(send_message){
    
    //Generate Send SMTP
    nodemailer.createTestAccount((err, account) => {
        
        let transporter;
        
        if(hasDKIM){
            transporter = nodemailer.createTransport({
                host: connect.host,
                port: connect.port,
                secure: connect.secure, // true for 465, false for other ports
                auth: {
                    user: details.user, // generated ethereal user
                    pass: details.pass  // generated ethereal password
                },
                dkim: {
                    domainName: $("#dkim_domain").val(),
                    keySelector: $("#dkim_key").val(),
                    privateKey: $("#dkim_key").val()
                }
            });
        }else{
            // create reusable transporter object using the default SMTP transport
            transporter = nodemailer.createTransport({
                host: connect.host,
                port: connect.port,
                secure: connect.secure, // true for 465, false for other ports
                auth: {
                    user: details.user, // generated ethereal user
                    pass: details.pass  // generated ethereal password
                }
            });
            
            if($("#host").val() == "outlook"){
                transporter = nodemailer.createTransport({
                    host: connect.host, // hostname
                    secureConnection: false, // TLS requires secureConnection to be false
                    port: connect.port, // port for secure SMTP
                    tls: {
                       ciphers:'SSLv3'
                    },
                    auth: {
                        user: details.user, // generated ethereal user
                        pass: details.pass  // generated ethereal password
                    }
                });
            }
        }
        
        console.log(connect);
        console.log(details);
        
        /**
        * RAW message should help later
        **/
        //BEGIN RAW
        /*var raw_message = "MIME-Version: 1.0\r\n";
        raw_message += "Content-type:text/html;charset=UTF-8\r\n";
        raw_message += "From: " + details.name + " <" + details.user + " >\r\n"
        raw_message += "Reply-To: " + details.user + "\r\n";
        raw_message += "X-Mailer: Nodemailer (0.3.43; +http://www.nodemailer.com/)\r\n";
        raw_message += "\r\n";
        raw_message += message.message;
        */
        // END RAW
        /*
        let mailOptions = {
            envelope: {
                from: details.user,
                to: [message.to]
            },
            raw: raw_message
        };*/
        
        // setup email data with unicode symbols
        let mailOptions = {
            from: '"' + details.name + '" <'+ details.user  +'>', // sender address
            to: send_message.to, // list of receivers
            subject: send_message.subject, // Subject line
            text: $("#message").val(), // plain text body
            html: send_message.message, // html body
            tls: { rejectUnauthorized: false }
        };
        
        console.log(mailOptions);
        console.log(mailOptions);
        
        showStatus(lang.sending_email_to + send_message.to);

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                showStatus(lang.emailSentError + send_message.to);  
                console.log(lang.error + ' %s', error);
                alert(lang.error + ':\n' + lang.please_check_host + '\n\n' + error);
            }else{
                showStatus(lang.success + ": " + send_message.to + " ✅");   
            }
              
            console.log(lang.message_sent + ': %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
            transporter.close();
        });
    });
}

//Send a Mail Test

function sendTestEmail(){
    
    //Loading
    $("#modal").addClass("show");
    $("#modal").addClass("loading");
    showStatus(lang.test_mail_to + ": " + mailTo + lang.is_sending_now );
    
    var mailTo = $("#mailTest").val();
    var bodyMessage = createBody();
    
    //Fill Details
    details = {
        "name": $("#name").val(),
        "user": $("#email").val(),
        "pass": $("#pass").val()
    };

    var sendMessage = bodyMessage.replaceAll("{message}",$("#message").val());
        sendMessage = sendMessage.replaceAll("{logo}",logoPath);
        sendMessage = sendMessage.replaceAll("{name}", "John Doe (test name)");

    //Fill Message
    var message = {
        "subject": $("#subject").val(),
        "message": sendMessage,
        "to": mailTo
    };
    
    var mailResult = sendMail(message);

    var choice = dialog.showMessageBox(
        remote.getCurrentWindow(),
        {
            type: 'question',
            buttons: [lang.yes, lang.no],
            title: lang.test_email_title,
            message: lang.test_email_alert
        });
    if(choice === 0){
        $("#submitButton").attr("disabled",false);
    }else{
        //Do?
    }
    
    showStatus(lang.test_mail_to + ": " + mailTo + lang.please_check_inbox );
    
    //Remove Loading
    $("#modal").removeClass("show");
    $("#modal").removeClass("loading");
}


/**
Open emails CSV files and copy to unsent folder
**/
function openFile() {
    dialog.showOpenDialog({ filters: [
        { name: 'text', extensions: ['csv','txt'] }
    ]},
    function (fileNames) {
        if (fileNames === undefined) return;
            var fileName = fileNames[0];
        
            //Subscribe unsent emails file
            fs.readFile(fileName, 'utf-8', function (err, data) {
                 fs.writeFile(unsentFile, data, function (err) {
                     if(err){
                        alert(err,lang.cant_create_unsend);
                     }
                     
                    //Validate
                    var q = validateCSV();
                    if(q > 0){
                        $("#uploadDetails").html(lang.you_will_send + q + " e-mails.");
                    }
                });
            });
    });
}

/**
Get emails
@return array
**/
async function sendEmails(){
    
    showStatus(lang.starting_send_emails);
    
    //LOADING
    $("#modal").addClass("show");
    $("#modal").addClass("loading");
    
    var sent = [];
    var unsent =[];
    
    forceStorage(); //Save Configurationo
    /*
    This is the default way to read lines.
    Despite existsSync is a sync way to read a file,
    readLines is async.
    So to read aproprietaly a file, its needs to create
    Promises, but it should be not so elegant to compare files.
    
    Maybe this gonna change on future, but now, we prefer
    to use node-readlines by nacholibre, to make it simple
    and short.
    
    //Read All Emails
    if (fs.existsSync(unsentFile)) {
        var inputUnsent = fs.createReadStream(unsentFile);
        readLines(inputUnsent, function(data){
            if(data.trim() != ""){
                var line = data.split(";");
                if(line.length == 2){
                    unsent.push({name: line[0], email: line[1]});
                }
            }
        });
    }

    //Check all Emails Already Sent

    if (fs.existsSync(sentFile)) {
        var inputSent = fs.createReadStream(sentFile);
        readLines(inputSent, function(data){
            //var line = data.split(";");
            //sent.push({name: line[0], email: line[1]});
            if(data.trim() != ""){
                countLines++;
            }
        });
    }
    */
    
    
    
    var inputUnsent = new lineByLine(unsentFile);
    var line;
    while (line = inputUnsent.next()) {
        if(line.toString().trim() != ""){
            var rline = line.toString().split(";");
            if(rline.length == 2){
                unsent.push({name: rline[0], email: rline[1]});
            }
        }
        
        showStatus(lang.reading);
    }
    
    if (fs.existsSync(sentFile)){
        var inputSent = new lineByLine(sentFile);
        var line;
        while (line = inputSent.next()) {
            if(line.toString().trim() != ""){
                countLines++;
            }

            showStatus(lang.reading);
        }
    }
    
    if(countLines > 0){
        emailsList = unsent.splice((countLines - 1), (unsent.length-1));
    }else{
        emailsList = unsent;
    }
    
    //Calc emails per hour to miliseconds
    var stepTime = (60/($("#byHour").val()/60))*1000;
    
    //Create Config Temp File    
    if (!fs.existsSync(configTempFile)){
        var configTxt  = "host:"+$("#host").val()+"\n";
            configTxt += "email:"+$("#email").val()+"\n";
            configTxt += "password:"+$("#pass").val()+"\n";
            configTxt += "template:"+$("#template").val()+"\n";
            configTxt += "subject:"+$("#subject").val()+"\n";
            configTxt += "message:"+$("#message").val()+"\n";
            configTxt += "interval:"+stepTime;
        
            fs.writeFile(configTempFile, configTxt, function (err) {
                 if(err){
                    alert(err,lang.cant_create_config);
                 }
            });
    }
    
    //Get or Create Message By Template
    var bodyMessage = createBody();
    
    //Loop to Start Send Emails
    for(var i=0; i < emailsList.length; i++){    

        await sleep(stepTime);
        
        //Fill Details
        details = {
            "name": $("#name").val(),
            "user": $("#email").val(),
            "pass": $("#pass").val()
        };

        var sendMessage = bodyMessage.replaceAll("{message}",$("#message").val());
            sendMessage = sendMessage.replaceAll("{logo}",logoPath);
            sendMessage = sendMessage.replaceAll("{name}",emailsList[i].name);

        //Fill Message
        var message = {
            "subject": $("#subject").val(),
            "message": sendMessage,
            "to": emailsList[i].email
        };
        //Send Email
        var mailResult = sendMail(message);
        
        var sentEmail = emailsList[i].name + ";" + emailsList[i].email + "\n";
        
        //Add to Sent File
        if (!fs.existsSync(sentFile)){
            fs.appendFileSync(sentFile, sentEmail);
        }else{
            //Create Sent File
            fs.writeFile(sentFile, sentEmail, function (err) {
                 if(err){
                    alert(err, lang.cant_create_send);
                 }
            });
        }
        
        if(i == emailsList.length -1){
            clearEmails();
        }
    }
    //REMOVE LOADING
    $("#modal").removeClass("show");
    $("#modal").removeClass("loading");
}

/**
Return Unsent emails by comparison
**/
function getUnsent(unsent, sent) {
    var a = [];
    for (var i = 0; i < unsent.length; i++) {
        if(!sent.contains(unsent[i])){
            a.push(unsent[i]);
        }
    }

    return a;
}

/**
Create Mail Body
**/
function createBody(){
    var templateMessage = "";
    var line;
    if(templatePath == false){
        templateMessage = $("#message").val();   
    }else{
        if (fs.existsSync(templatePath)){
            var inputTemplate = new lineByLine(templatePath);
            while (line = inputTemplate.next()) {
                templateMessage += line.toString();
                showStatus(lang.readingTemplateFile);
            }
        }else{
            templateMessage = $("#message").val();  
        }
    }
    
    return templateMessage;
}

/**
Export Email Configuration
**/
function exportConf(){
    
}

/**
Import Email Configuration
**/
function importConf(){
    
}

/**
Read Configuration File
**/
function readConf(){
    
}

/**
Read line per line
**/
function readLines(input, func) {
  var remaining = '';

  input.on('data', function(data) {
    remaining += data;
    var index = remaining.indexOf('\n');
    while (index > -1) {
      var line = remaining.substring(0, index);
      remaining = remaining.substring(index + 1);
      func(line);
      index = remaining.indexOf('\n');
    }
  });

  input.on('end', function() {
    if (remaining.length > 0) {
      func(remaining);
    }
  });
}

/**
Show Status
**/
var statusTime;
function showStatus(message){
    $("#status").addClass("on");
    $("#status").html(message);
    if(statusTime != undefined){
        clearTimeout(statusTime);
        statusTime = undefined;
    }
    
    statusTime = setTimeout(function(){
        $("#status").removeClass("on");
    },10000);
}

/**
Delete e-mails files
**/
function clearEmails(){
    if (fs.existsSync(unsentFile)) {
        fs.unlink(unsentFile, (err) => {
            if (err) {
                showStatus(lang.error_update_file + err.message);
                return;
            }else{
                showStatus(pt_BR.clear_temp_files );
            }
        });
    }
    if (fs.existsSync(sentFile)) {
        fs.unlink(sentFile, (err) => {
            if (err) {
                showStatus(lang.error_update_file + err.message);
                return;
            }else{
                showStatus(pt_BR.clear_temp_files );
            }
        });
    }
    if (fs.existsSync(configTempFile)) {
        fs.unlink(configTempFile, (err) => {
            if (err) {
                showStatus(lang.error_update_file + err.message);
                return;
            }else{
                showStatus(pt_BR.clear_temp_files );
            }
        });
    }
    
    $("#uploadDetails").html(lang.send_csv_file);
}

/**
Check if still have emails to send
**/
function checkFiles(){
    var choice = false;
    if (fs.existsSync(sentFile)) {
        var choice = dialog.showMessageBox(
            remote.getCurrentWindow(),
            {
                type: 'question',
                buttons: [lang.yes, lang.no],
                title: lang.alert_unsent_title,
                message: lang.alert_unsent_message
            });
    }
    
    console.log(choice);
    
    if(choice === 0){
        choice = true;
    }else{
        clearEmails();
        choice = false;
    }
    
    return choice;
}


//Contains Array
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

//Replace All
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

//Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Storage
function forceStorage(){
    localStorage.name = $("#name").val();
    localStorage.email = $("#email").val();
    localStorage.password = $("#pass").val();
    
    localStorage.subject = $("#subject").val();
    localStorage.message = $("#message").val();
    
    localStorage.host = $("#host").val();
    
    localStorage.smtp = $("#smtp").val();
    localStorage.port = $("#port").val();
    localStorage.secure = $("#secure").val();
    
    localStorage.templatePath = $("#templatePath").val();
}

function loadStorage(){
    $("#name").val(localStorage.name);
    $("#email").val(localStorage.email);
    $("#pass").val(localStorage.password);
    
    $("#subject").val(localStorage.subject);
    $("#message").val(localStorage.message);
    
    $("#host").val(localStorage.host);
    
    $("#smtp").val(localStorage.smtp);
    $("#port").val(localStorage.port);
    $("#secure").val(localStorage.secure);
    
    $("#templatePath").val(localStorage.templatePath);
    
    if(localStorage.templatePath != false && localStorage.templatePath != undefined){
        $("#"+localStorage.templatePath).addClass("selected");
    }else{
        $("#noTemplate").addClass("selected");
    }
    
    templatePath = "./templates/" + localStorage.templatePath + "/index.html";
    
    $("#host").trigger("focusout");
}

/**
Load Templates and Thumbnails
**/
function loadTemplates(){
    $("#templates").append("<div id='noTemplate' onclick='removeTemplate()' class='no_template'><div>");
    //Check Templates Folder
    fs.readdir(templatesDir, (err, dir) => {
        for (var i = 0, path; path = dir[i]; i++) {
            $("#templates").append("<div id='" + path + "' onclick='selectTemplate(event)'><img src='templates/" + path + "/thumb.png'/><div>");
        }
    });
}

//Select template
function selectTemplate(event){
    $("#templatePath").val($(event.target).attr("id"));
    $("#templates div").removeClass("selected");
    $(event.target).addClass("selected");
    
    templatePath = "./templates/" + localStorage.templatePath + "/index.html";
    forceStorage();
}
function removeTemplate(){
    $("#templates div").removeClass("selected");
    $("#noTemplate").addClass("selected");
    
    templatePath = false;
    forceStorage();
}

//Validate fields
function isReady(){
    var result = true;
    var message = "";
    
    if($("#name").val() == ""){
        message += lang.val_name + "\n";
        result = false;   
    }
    if($("#email").val() == ""){
        message += lang.val_email + "\n";
        result = false;   
    }
    if($("#password").val() == ""){
        message += lang.val_pass + "\n";
        result = false;   
    }
    if($("#subject").val() == ""){
        message += lang.val_subject + "\n";
        result = false;   
    }
    if($("#host").val() == "other"){
         message += lang.val_other_host;
        if($("#smtp").val() == ""){
            message += lang.val_smtp + "\n";
            result = false;
        }
        if($("#port").val() == ""){
            message += lang.val_port + "\n";
            result = false;
        }
    }
    if(!csvValidate){
        message += lang.val_CSV + "\n";
        result = false;
    }
    
    if(!result){
        alert(message);
    }
    
    return result;
}

function setLanguage(language){
    lang = window[language];
    
    for(var k in lang){
        $("*[rel=" + k + "]").html(lang[k]);
    }
}

//Validate CSV File
function validateCSV(){
    showStatus(lang.validating_CSV);
    
    var returnValue = 0;
    
    var inputUnsent = new lineByLine(unsentFile);
    var line;
    while (line = inputUnsent.next()) {
        if(line.toString().trim() != ""){
            var rline = line.toString().split(";");
            if(rline.length != 2){
                returnValue = 0;
                break;
            }else{
                returnValue++;
            }
        }    
        showStatus(lang.reading);
    }
    
    if(returnValue == 0){
        csvValidate = false;
        alert(lang.val_CSV_error);
        clearEmails();
    }else{
        csvValidate = true;
    }
    
    showStatus(lang.ready);
    
    return returnValue;
}



//init
$("body").ready(function(){
    //Load Templates
    loadTemplates();
    
    //Send Test Mail
    $("#sendTest").click(function(){
        $("#host").trigger("focusout");
        sendTestEmail();
    });
    
    //Send Mail
    $("#submitButton").click(function(){
        if(csvValidate){
            $("#host").trigger("focusout");
            sendEmails();
        }else{
            alert(lang.val_CSV);
        }
    });
    
    //Advanced
    $("#advButton").click(function(){
        $("#advancedPanel,#modal").addClass("show");
    });
    $("#advancedPanel #submitButton").click(function(){
        $("#host").trigger("focusout");
        $("#advancedPanel,#modal").removeClass("show");
    });
    
    //Automato
    $("#email").focusout(function(){
        var host = $("#email").val().split("@")[1];
        switch(host){
            case "gmail.com":
                $("#host").val("gmail");
                break;
            case "yahoo.com":
                $("#host").val("yahoo");
                break;
            case "yahoo.com.br":
                $("#host").val("yahoo");
                break;
            case "outlook.com":
                $("#host").val("outlook");
                break;
            case "hotmail.com":
                $("#host").val("outlook");
                break;
            case "bol.com.br":
                break;
            case "uolhost.com.br":
                $("#host").val("uolhost");
                break;
            case "uol.com.br":
                $("#host").val("uol");
                break;
            case "uol.com":
                $("#host").val("uol");
                break;
            default:
                $("#host").val("other");
        }
    });
    
    $("#host").focusout(function(){
        var host = $(this).val();
        switch(host){
            case "gmail":
                connect = {
                    "port" : 465,
                    "secure" : true,
                    "host" : "smtp.gmail.com"
                }
                break;
            case "outlook":
                connect = {
                    "port" : 587,
                    "secure" : true,
                    "host" : "smtp-mail.outlook.com"
                }
                break;
            case "yahoo":
                connect = {
                    "port" : 465,
                    "secure" : true,
                    "host" : "smtp.mail.yahoo.com"
                }
                break;
            case "uolhost":
                connect = {
                    "port" : 587,
                    "secure" : true,
                    "host" : "smtp." + $("#email").val().split("@")[1]
                }
                break;
            case "locaweb":
                connect = {
                    "port" : 587,
                    "secure" : true,
                    "host" : "smtplw.com.br"
                }
                break;
            case "kinghost":
                connect = {
                    "port" : 587,
                    "secure" : true,
                    "host" : "smtp.kinghost.net"
                }
                break;
            case "hostgator":
                connect = {
                    "port" : 25,
                    "secure" : false,
                    "host" : "mail." + $("#email").val().split("@")[1]
                }
                break;
            case "other":
                
                if($("#secure").val() == "ssl"){   
                    connect = {
                        "port" : parseInt($("#port").val()),
                        "secure" : true,
                        "host" : $("#smtp").val()
                    }
                }else if($("#secure").val() == "start"){
                    connect = {
                        "port" : parseInt($("#port").val()),
                        "secure" : true,
                        "host" : $("#smtp").val()
                    }
                } else{
                    connect = {
                        "port" : parseInt($("#port").val()),
                        "secure" : false,
                        "host" : $("#smtp").val()
                    }
                }
                
                break;
        }
    });
    
    //Check if Theres Unsent Emails
    if(checkFiles()){
        sendEmails();
    }
    
    //Open CSV File
    $("button#send").click(function(){
       openFile();
    });
    
    //POG
    $("form").each(function(){
       $(this).submit(function(){return false;}); 
    });
    
    //Force Storage
    $("input,select").focusout(function(){
        forceStorage();
    });
    
    //Lang Buttons
    $("#langPT_BR").click(function(){
        setLanguage("pt_BR");
        showStatus("Idioma mudado para Português do Brasil");
        $(".language button").removeClass("select");
        $(this).addClass("select");
    });
    $("#langEN_US").click(function(){
        setLanguage("en_US");
        showStatus("Language changed to US sEnglish");
        $(".language button").removeClass("select");
        $(this).addClass("select");
    });
    
    $("#langPT_BR").trigger("click");
    
    //Load LocalStorage
    loadStorage();
});