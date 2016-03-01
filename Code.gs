var EVENT_SHEET_ID = '13yXpJiwJt_s-MKaYavsh4JJSknKzdOiPQkz4iNIhUsc';
var SIGN_IN_SHEET_ID = '1pRWzQ-AC74skmwqrFeZmtsDGrihrdV5lvWAlC3Z4guA';
var EVENT_SHEET_NAME = 'PHONE BANKS DO NOT MOVE THIS TAB - 1';
var SIGN_IN_SHEET_NAME = 'DO NOT MOVE THIS TAB';

var ROOT_FOLDER_ID = '0Bw9Apc7v0NrZMlhBS0JYZHM5cW8';

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

/**
 * Adds a row to the spreadsheet using the uploaded file URL and the File Name for friendly display
*/
function addRowToSpreadsheet(url, fileName, type, uploadedBy) {
  
  if (type == "ev-i") {
    var sheetID = EVENT_SHEET_ID;
    var sheetName = EVENT_SHEET_NAME;
  } else if(type == "si") {
    var sheetID = SIGN_IN_SHEET_ID;
    var sheetName = SIGN_IN_SHEET_NAME;
  } else {
    return;
  }

  sheet = SpreadsheetApp
        .openById(sheetID)
        .getSheetByName(sheetName);

  var formula = '=HYPERLINK("'+url+'", "'+fileName+'")';
  sheet.appendRow([formula]);

}

/**
 * Sends email confirmation to the data entry team and the uploader with a list of uploaded files.
 */
function sendEmailConfirmation(uploadedBy, fileList) {
    var msgRecipient, msgSubject;
    var msgContent = 'View the files here: ' + fileList.join("\n");
    var msgOptions = {
      name: 'Event Data Uploader',
      replyTo: uploadedBy
    }

    var confirmOptions = {
      name: 'Event Data Uploader',
      replyTo: 'dataentry@berniesanders.com'
    }

    msgRecipient = 'dataentry@berniesanders.com';
    msgSubject = 'New Files Uploaded';

    MailApp.sendEmail(msgRecipient, msgSubject, msgContent, msgOptions);
    MailApp.sendEmail(uploadedBy, msgSubject, msgContent, confirmOptions);
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
      var folderName = 'AUTO Sign In Sheets';
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
    
    // Get public File URL so we can add it to the sheet
    var url = file.getUrl();
    Logger.log("added file " + url);
    
    /**
     * Add row to sheet
     * Currently only adds to sheet if an individual event sheet or sign in sheet upload
     */
    if(form.fileType == "ev-i" || form.fileType == "si") {
      addRowToSpreadsheet(url, fileName, form.fileType, form.email);
    }
    
    return url
  }catch(e){
    Logger.log(e.toString());
    return 'Error: ' + e.toString();
  }
}