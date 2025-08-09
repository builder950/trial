const SHEET_ID = '<<SHEET_ID>>';
const SECRET_KEY = '<<SECRET>>';

function doGet(e) {
  if (e.parameter.key !== SECRET_KEY) {
    return ContentService.createTextOutput('Unauthorized')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  // …rest of doGet from AI output…
}

function doPost(e) {
  if (e.parameter.key !== SECRET_KEY) {
    return ContentService.createTextOutput('Unauthorized')
      .setMimeType(ContentService.MimeType.TEXT);
  }
  // …rest of doPost from AI output…
}
