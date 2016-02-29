
var EVENT_SHEET_ID = '1urkztZ0PjBAKF1uUeUPYRp1yg3IlwfFvjeKwOa5-Mrc';
var SIGN_IN_SHEET_ID = '1N_aYGkaO00CJE4hvqDOKpK-1j7DKAvbds1iNTGmDd8A';
var EVENT_SHEET_NAME = 'Sheet1';
var SIGN_IN_SHEET_NAME = 'Sheet1';

var ROOT_FOLDER_ID = '0B9nZMQA6JcG8OGJLaVNMaFdJOUU';

// var SPREADSHEET_ID = '1Io7RR9tqWnYqUHQcOg2IQM5EzZLMKKSGRuSNAmNipv4';
// var SHEET_NAME = 'Data Entry List';
// var ROOT_FOLDER_ID = '0Bw9Apc7v0NrZMlhBS0JYZHM5cW8';

function doGet() {
  var template = HtmlService.createTemplateFromFile('form');

  template.userEmail = Session.getActiveUser().getEmail();
  return template.evaluate()
    .setTitle('Upload Event Data')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
}

function addRowToSpreadsheet(fileName, type, uploadedBy) {
  
  Logger.log(type);

  if (type == "ev-i" || type == "ev-m") {
    var sheetID = EVENT_SHEET_ID;
    var sheetName = EVENT_SHEET_NAME;
  } else {
    var sheetID = SIGN_IN_SHEET_ID;
    var sheetName = SIGN_IN_SHEET_NAME;
  }

  if(type == 'ev-i') {
      var displayType = 'Event Sheets';
    } else if (type == 'ev-m') {
      var displayType = 'Event Sheets (multiple)';
    } else if (type == 'si') {
      var displayType = 'Phone Bank Sign In Sheets';
    }

  sheet = SpreadsheetApp
        .openById(sheetID)
        .getSheetByName(sheetName);

  var formula = '=HYPERLINK("'+fileName+'", "Click Here")';
  sheet.appendRow([formula, uploadedBy, displayType]);

}

function uploadFileToDrive(base64Data, originalFileName, form, index) {
  
  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
  }

  try{
    var splitBase = base64Data.split(','),
        type = splitBase[0].split(';')[0].replace('data:','');

    var byteCharacters = Utilities.base64Decode(splitBase[1]);
    var ss = Utilities.newBlob(byteCharacters, type);

    var firstNameTag = form.state + ' - ' + toTitleCase(form.city);

    if(form.fileType == 'ev-i') {
      var folderName = 'AUTO Event Sheets';
    } else if (form.fileType == 'ev-m') {
      var folderName = 'AUTO Event Sheets (multiple)';
    } else if (form.fileType == 'si') {
      var folderName = 'AUTO Phone Bank Sign In Sheets';
    }

    // Select folder and set file name
    var folder, fileName;

    // Split original file name
    var fileExtensionArray = originalFileName.split(".");
    // Get last item in array which should be the extension
    var originalExtension = fileExtensionArray.pop();

    var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
    var folders = rootFolder.getFoldersByName(folderName);

    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = rootFolder.createFolder(folderName);
    }

    var uniqueID = new Date();
    uniqueID = uniqueID.toISOString() + String(index + 1);
    fileName = firstNameTag + ' ' + form.fileType + ' ' + form.source + ' ' + form.email + ' ' + uniqueID + '.' + originalExtension;
    ss.setName(fileName);

    var file = folder.createFile(ss)
        .setDescription('Original name: ' + originalFileName + '\nSubmitted by: ' + form.email + form.notes)
        .setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

    var url = file.getUrl();

    addRowToSpreadsheet(url, form.fileType, form.email);

    // Send upload email notification
    // var msgRecipient, msgSubject;
    // var msgContent = 'View the file here: ' + file.getUrl();
    // msgContent += '\n\n' + file.getDescription();
    // var msgOptions = {
    //   name: 'Event Data Uploader',
    //   replyTo: form.email
    // }

    // msgRecipient = 'dataentry+' + form.fileType + '@berniesanders.com';
    // msgSubject = 'New File Upload: ' + fileName;

    // MailApp.sendEmail(msgRecipient, msgSubject, msgContent, msgOptions);
    // MailApp.sendEmail(form.email, msgSubject, msgContent, msgOptions);

    return originalFileName
  }catch(e){
    Logger.log(e.toString());
    return 'Error: ' + e.toString();
  }
}