var SPREADSHEET_ID = '1Io7RR9tqWnYqUHQcOg2IQM5EzZLMKKSGRuSNAmNipv4';
var SHEET_NAME = 'Data Entry List';
var ROOT_FOLDER_ID = '0Bw9Apc7v0NrZMlhBS0JYZHM5cW8';
var PHOTOS_FOLDER_ID = '0Bw9Apc7v0NrZMXl2XzdWbUpWdHc';

function doGet() {
  var template = HtmlService.createTemplateFromFile('form');
  var barnstormOptions = SpreadsheetApp
        .openById(SPREADSHEET_ID)
        .getSheetByName(SHEET_NAME)
        .getDataRange()
        .getValues();

  var barnstorms = [];
  for (var i = 0; i < barnstormOptions.length; i++) {
    if (barnstormOptions[i][0]){
      barnstorms.push(barnstormOptions[i][0]);
    }
  }

  template.userEmail = Session.getActiveUser().getEmail();
  template.barnstorms = barnstorms.sort();
  return template.evaluate()
    // .setFaviconUrl('https://s.bsd.net/bernie16/main/page/-/favicon.ico')
    .setTitle('Upload Event Data')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function include(fileName) {
  return HtmlService.createHtmlOutputFromFile(fileName).getContent();
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

    if (form.source == 'barnstorm'){
      var firstNameTag = form.barnstorm;
    }
    else {
      var firstNameTag = form.state + ' - ' + toTitleCase(form.city);
    }

    if (form.fileType == 'pb-c' || form.fileType == 'pb-r'){
      var folderName = 'Phone Banks';
    }
    else if (form.fileType == 'pb-i'){
      var folderName = 'Incomplete Phone Banks';
    }
    else if (form.fileType == 'pb-multi'){
      var folderName = 'Phone Banks (multiple)';
    }
    else if (form.fileType == 'pb-si'){
      var folderName = 'Phone Bank Sign In Sheets';
    }
    else if (form.fileType == 'pb-photos'){
      var folderName = 'Phone Bank Photo Submissions';
    }
    if (form.fileType == 'cv-c' || form.fileType == 'cv-r'){
      var folderName = 'Canvass Events';
    }
    else if (form.fileType == 'cv-i'){
      var folderName = 'Incomplete Canvass Events';
    }
    else if (form.fileType == 'cv-multi'){
      var folderName = 'Canvass Events (multiple)';
    }
    else if (form.fileType == 'cv-si'){
      var folderName = 'Canvass Sign In Sheets';
    }
    else if (form.fileType == 'cv-photos'){
      var folderName = 'Canvass Photo Submissions';
    }
    else {
      var folderName = 'Mixed Files';
    }

    // Select folder and set file name
    var folder, fileName;
    if (folderName === 'Phone Bank Photo Submissions' || folderName === 'Canvass Photo Submissions'){
      folder = DriveApp.getFolderById(PHOTOS_FOLDER_ID);

      fileName = firstNameTag + ' ' + form.fileType + ' ' + originalFileName;
      ss.setName(fileName);
    }
    else {
      var rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);
      var folders = rootFolder.getFoldersByName(folderName);

      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = rootFolder.createFolder(folderName);
      }

      var uniqueID = new Date();
      uniqueID = uniqueID.toISOString() + String(index + 1);
      fileName = firstNameTag + ' ' + form.fileType + ' ' + form.source + ' ' + form.email + ' ' + uniqueID;
      ss.setName(fileName);
    }

    if (form.notes){
      form.notes = '\n\n' + form.notes;
    };
    var file = folder.createFile(ss)
        .setDescription('Original name: ' + originalFileName + '\nSubmitted by: ' + form.email + form.notes);

    if (form.fileType == 'pb-r'){
      file.setStarred(true)
        .setName('[RUSH] ' + fileName);
    };

    // Send upload email notification
    var msgRecipient, msgSubject;
    var msgContent = 'View the file here: ' + file.getUrl();
    msgContent += '\n\n' + file.getDescription();
    var msgOptions = {
      name: 'Event Data Uploader',
      replyTo: form.email
    }
    if (folderName === 'Phone Bank Photo Submissions' || folderName === 'Canvass Photo Submissions'){
      msgRecipient = 'corbin+eventphotos@berniesanders.com';
      msgSubject = 'New Photo Upload: ' + fileName;
      msgOptions.htmlBody = msgContent.replace(/(?:\r\n|\r|\n)/g, '<br />') + '<br /><br /><img src="cid:image" />';
      msgOptions.inlineImages = {'image': file.getBlob()};
    }
    else {
      msgRecipient = 'dataentry+' + form.fileType + '@berniesanders.com';
      msgSubject = 'New File Upload: ' + fileName;
    }

    MailApp.sendEmail(msgRecipient, msgSubject, msgContent, msgOptions);

    return originalFileName
  }catch(e){
    Logger.log(e.toString());
    return 'Error: ' + e.toString();
  }
}