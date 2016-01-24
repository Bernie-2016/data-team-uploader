var SPREADSHEET_ID = '1Io7RR9tqWnYqUHQcOg2IQM5EzZLMKKSGRuSNAmNipv4';
var SHEET_NAME = 'Data Entry List';
var FOLDER_ID = '0Bw9Apc7v0NrZMlhBS0JYZHM5cW8';

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

function uploadFileToDrive(base64Data, originalFileName, form) {
  
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
    var fileName = firstNameTag + ' ' + form.fileType + ' ' + form.source;
    ss.setName(fileName);

    if (form.fileType == 'pb'){
      var folderName = 'Phone Banks';
    }
    else if (form.fileType == 'si'){
      var folderName = 'Sign In Sheets';
    }
    else {
      var folderName = 'Mixed Files';
    }

    var rootFolder = DriveApp.getFolderById(FOLDER_ID);
    var folders = rootFolder.getFoldersByName(folderName);

    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = rootFolder.createFolder(folderName);
    }

    if (form.notes){
      form.notes = '\n\n' + form.notes;
    };
    var file = folder.createFile(ss)
        .setDescription('Original Name: ' + originalFileName + form.notes);

    if (Session.getActiveUser().getEmail()){
      file.setStarred(true)
    };

    return file.getName();
  }catch(e){
    Logger.log(e.toString());
    return 'Error: ' + e.toString();
  }
}